import type {
  DeserializePresentationStateOptions,
  PresentationCoreErrorCode,
  PresentationOperation,
  PresentationState,
} from "@/features/presentations/core/presentation-core";
import {
  confirmPresentationSaved,
  deserializePresentationState,
  isPresentationOperationCompatibleWithState,
  serializePresentationState,
} from "@/features/presentations/core/presentation-core";

import type {
  LocalAsset,
  LocalPresentationOperation,
  PersistedPresentation,
  PresentationAssetsTransactionRepository,
  PresentationAssetTransactionRepository,
  PresentationProjection,
  PresentationRepository,
  PresentationSnapshotOrigin,
  PresentationSyncMetadata,
} from "./presentation-repository";
import { PresentationPersistenceError } from "./presentation-repository";

export type CreatePresentationIntegrityReceipt = (
  serialized_state: string,
) => unknown;

type SavePresentationInputBase = {
  readonly state: PresentationState;
  /** Creates a receipt for the exact serialized snapshot it receives. */
  readonly createIntegrityReceipt?: CreatePresentationIntegrityReceipt;
  readonly syncMetadata: PresentationSyncMetadata;
  readonly savedAt: string;
};

export type SavePresentationInput =
  | (SavePresentationInputBase & {
      readonly snapshotOrigin: { readonly kind: "initial" };
    })
  | (SavePresentationInputBase & {
      readonly snapshotOrigin: {
        readonly kind: "operation";
        readonly localOperationId: string;
      };
      readonly operation: PresentationOperation;
    });

export type SavePresentationResult =
  | { readonly success: true; readonly state: PresentationState }
  | {
      readonly success: false;
      readonly code: PresentationCoreErrorCode;
    };

export type LoadPresentationResult =
  | { readonly success: true; readonly state: PresentationState }
  | {
      readonly success: false;
      readonly code:
        | "INVALID_PERSISTED_PRESENTATION"
        | PresentationCoreErrorCode;
    }
  | { readonly success: false; readonly code: "PRESENTATION_NOT_FOUND" };

export async function savePresentation(
  repository: PresentationRepository,
  input: SavePresentationInput,
): Promise<SavePresentationResult> {
  return persistPresentation(repository, input, (presentation) =>
    repository.save(presentation),
  );
}

/** Persists a binary with the Core change that references it in one local transaction. */
export async function savePresentationWithLocalAsset(
  repository: PresentationAssetTransactionRepository,
  asset: LocalAsset,
  input: SavePresentationInput,
): Promise<SavePresentationResult> {
  if (
    !asset.metadata.presentationIds.includes(input.state.id) ||
    !hasAssetReference(input.state, asset.metadata.id)
  )
    return { success: false, code: "INVALID_SERIALIZED_STATE" };
  return persistPresentation(repository, input, (presentation) =>
    repository.saveWithAsset(presentation, asset),
  );
}

/** Persists binaries with the Core operation that references all of them. */
export async function savePresentationWithLocalAssets(
  repository: PresentationAssetsTransactionRepository,
  assets: readonly LocalAsset[],
  input: SavePresentationInput,
): Promise<SavePresentationResult> {
  if (
    assets.length === 0 ||
    new Set(assets.map((asset) => asset.metadata.id)).size !== assets.length ||
    assets.some(
      (asset) =>
        !asset.metadata.presentationIds.includes(input.state.id) ||
        !hasAssetReference(input.state, asset.metadata.id),
    )
  )
    return { success: false, code: "INVALID_SERIALIZED_STATE" };
  return persistPresentation(repository, input, (presentation) =>
    repository.saveWithAssets(presentation, assets),
  );
}

async function persistPresentation(
  repository: PresentationRepository,
  input: SavePresentationInput,
  persist: (presentation: PersistedPresentation) => Promise<void>,
): Promise<SavePresentationResult> {
  const saved_at = getLocalSaveTime(input.savedAt, input.state);
  const serialized = serializePresentationState(input.state);
  if (!serialized.success)
    return { success: false, code: serialized.error.code };

  const operation = "operation" in input ? input.operation : null;
  if (!isPresentationOperationCompatibleWithState(input.state, operation))
    return { success: false, code: "INVALID_SERIALIZED_STATE" };

  const projection = createPresentationProjection(input.state);
  const presentation = createPersistedPresentation({
    projection,
    serializedState: serialized.serializedState,
    integrityReceipt: createIntegrityReceipt(
      input.createIntegrityReceipt,
      serialized.serializedState,
    ),
    snapshotOrigin: input.snapshotOrigin,
    operation,
    syncMetadata: createPendingSaveAcknowledgement(input, saved_at),
  });
  try {
    await persist(presentation);
  } catch (error) {
    if (!(await canResumeCommittedPrimarySave(repository, presentation, error)))
      throw error;
  }

  const acknowledged = confirmPresentationSaved(input.state, {
    revision: input.state.revision,
    savedAt: saved_at,
  });
  if (!acknowledged.success)
    return { success: false, code: acknowledged.error.code };

  const acknowledged_serialized = serializePresentationState(
    acknowledged.state,
  );
  if (!acknowledged_serialized.success)
    return { success: false, code: acknowledged_serialized.error.code };
  await repository.acknowledgeLocalSave({
    presentationId: acknowledged.state.id,
    revision: acknowledged.state.revision,
    snapshotOrigin: input.snapshotOrigin,
    projection: createPresentationProjection(acknowledged.state),
    serializedState: acknowledged_serialized.serializedState,
    integrityReceipt: createIntegrityReceipt(
      input.createIntegrityReceipt,
      acknowledged_serialized.serializedState,
    ),
    savedAt: saved_at,
  });
  return { success: true, state: acknowledged.state };
}

async function canResumeCommittedPrimarySave(
  repository: PresentationRepository,
  presentation: PersistedPresentation,
  error: unknown,
): Promise<boolean> {
  if (
    !(error instanceof PresentationPersistenceError) ||
    error.code !== "LOCAL_OPERATION_ID_CONFLICT" ||
    presentation.snapshotOrigin.kind !== "operation"
  )
    return false;
  const stored = await repository.load(presentation.projection.id);
  return (
    stored !== null &&
    stored.snapshotOrigin.kind === "operation" &&
    stored.snapshotOrigin.localOperationId ===
      presentation.snapshotOrigin.localOperationId &&
    stored.projection.revision === presentation.projection.revision &&
    hasSamePrimaryDocument(stored, presentation) &&
    JSON.stringify(stored.operation) === JSON.stringify(presentation.operation)
  );
}

function hasSamePrimaryDocument(
  stored: PersistedPresentation,
  expected: PersistedPresentation,
): boolean {
  return (
    JSON.stringify({
      ...stored.projection.document,
      lastSavedAt: expected.projection.document.lastSavedAt,
    }) === JSON.stringify(expected.projection.document)
  );
}

export async function loadPresentation(
  repository: PresentationRepository,
  presentation_id: string,
  options?: Omit<DeserializePresentationStateOptions, "integrityReceipt">,
): Promise<LoadPresentationResult> {
  const persisted = await repository.load(presentation_id);
  if (persisted === null)
    return { success: false, code: "PRESENTATION_NOT_FOUND" };

  const deserialized = deserializePresentationState(
    persisted.serializedState,
    options === undefined || persisted.integrityReceipt === null
      ? undefined
      : {
          integrityReceipt: persisted.integrityReceipt,
          verifyIntegrityReceipt: options.verifyIntegrityReceipt,
        },
  );
  if (!deserialized.success)
    return { success: false, code: deserialized.error.code };
  if (!hasMatchingProjection(persisted.projection, deserialized.state))
    return { success: false, code: "INVALID_PERSISTED_PRESENTATION" };
  return recoverPendingSaveAcknowledgement(
    repository,
    persisted,
    deserialized.state,
  );
}

export function createPresentationProjection(
  state: PresentationState,
): PresentationProjection {
  const { undoStack: _undo_stack, redoStack: _redo_stack, ...document } = state;
  return Object.freeze({
    id: state.id,
    publicId: state.publicId,
    revision: state.revision,
    document: Object.freeze(document),
  });
}

function createPersistedPresentation(input: {
  readonly projection: PresentationProjection;
  readonly serializedState: string;
  readonly integrityReceipt: unknown | null;
  readonly snapshotOrigin: SavePresentationInput["snapshotOrigin"];
  readonly operation: PresentationOperation | null;
  readonly syncMetadata: PresentationSyncMetadata;
}): PersistedPresentation {
  if (input.snapshotOrigin.kind === "initial")
    return Object.freeze({
      projection: input.projection,
      serializedState: input.serializedState,
      integrityReceipt: input.integrityReceipt,
      snapshotOrigin: input.snapshotOrigin,
      operation: null,
      outboxEntry: null,
      syncMetadata: input.syncMetadata,
    });
  if (input.operation === null) throw new Error("Missing snapshot operation");
  const operation: LocalPresentationOperation = Object.freeze({
    localOperationId: input.snapshotOrigin.localOperationId,
    presentationId: input.projection.id,
    operation: input.operation,
  });
  return Object.freeze({
    projection: input.projection,
    serializedState: input.serializedState,
    integrityReceipt: input.integrityReceipt,
    snapshotOrigin: input.snapshotOrigin,
    operation,
    outboxEntry: Object.freeze({
      localOperationId: input.snapshotOrigin.localOperationId,
      presentationId: input.projection.id,
      operation: input.operation,
      status: "pending",
    }),
    syncMetadata: input.syncMetadata,
  });
}

function createIntegrityReceipt(
  factory: CreatePresentationIntegrityReceipt | undefined,
  serialized_state: string,
): unknown | null {
  return factory === undefined ? null : factory(serialized_state);
}

function createPendingSaveAcknowledgement(
  input: SavePresentationInput,
  saved_at: string,
): PresentationSyncMetadata {
  return Object.freeze({
    ...input.syncMetadata,
    pendingSaveAcknowledgement: Object.freeze({
      revision: input.state.revision,
      localOperationId:
        input.snapshotOrigin.kind === "operation"
          ? input.snapshotOrigin.localOperationId
          : "",
      savedAt: saved_at,
    }),
  });
}

async function recoverPendingSaveAcknowledgement(
  repository: PresentationRepository,
  persisted: PersistedPresentation,
  state: PresentationState,
): Promise<LoadPresentationResult> {
  const pending = persisted.syncMetadata.pendingSaveAcknowledgement;
  if (pending === null) return { success: true, state };
  if (
    pending.revision !== state.revision ||
    !hasMatchingSnapshotOrigin(pending, persisted.snapshotOrigin)
  )
    return { success: false, code: "INVALID_PERSISTED_PRESENTATION" };

  const saved_at = getLocalSaveTime(pending.savedAt, state);
  const acknowledged = confirmPresentationSaved(state, {
    revision: pending.revision,
    savedAt: saved_at,
  });
  if (!acknowledged.success)
    return { success: false, code: acknowledged.error.code };
  const serialized = serializePresentationState(acknowledged.state);
  if (!serialized.success)
    return { success: false, code: serialized.error.code };

  // No receipt factory survives an interruption, so recovery never carries a
  // receipt that authenticated the pre-acknowledgement snapshot.
  await repository.acknowledgeLocalSave({
    presentationId: state.id,
    revision: state.revision,
    snapshotOrigin: persisted.snapshotOrigin,
    projection: createPresentationProjection(acknowledged.state),
    serializedState: serialized.serializedState,
    integrityReceipt: null,
    savedAt: saved_at,
  });
  return { success: true, state: acknowledged.state };
}

function hasMatchingSnapshotOrigin(
  pending: { readonly localOperationId: string },
  snapshot_origin: PresentationSnapshotOrigin,
): boolean {
  return (
    (snapshot_origin.kind === "initial" && pending.localOperationId === "") ||
    (snapshot_origin.kind === "operation" &&
      pending.localOperationId === snapshot_origin.localOperationId)
  );
}

function hasMatchingProjection(
  projection: PresentationProjection,
  state: PresentationState,
): boolean {
  return (
    projection.id === state.id &&
    projection.publicId === state.publicId &&
    projection.revision === state.revision &&
    JSON.stringify(projection.document) ===
      JSON.stringify(createPresentationProjection(state).document)
  );
}

/** A local acknowledgement cannot predate the Core state it confirms. */
function getLocalSaveTime(saved_at: string, state: PresentationState): string {
  return [saved_at, state.updatedAt, state.lastSavedAt]
    .filter((value): value is string => value !== null)
    .reduce((latest, value) => (value > latest ? value : latest));
}

function hasAssetReference(
  state: PresentationState,
  asset_id: string,
): boolean {
  return state.slides.some((slide) =>
    slide.elements.some(
      (element) => element.type === "image" && element.assetId === asset_id,
    ),
  );
}
