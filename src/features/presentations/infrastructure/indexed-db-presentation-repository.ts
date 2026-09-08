import type {
  AcknowledgePresentationSaveInput,
  LocalAsset,
  LocalAssetMetadata,
  LocalAssetRepository,
  PersistedPresentation,
  PresentationCard,
  PresentationPersistenceErrorCode,
  PresentationRepository,
} from "@/features/presentations/application/presentation-repository";
import { PresentationPersistenceError } from "@/features/presentations/application/presentation-repository";
import {
  deserializePresentationState,
  isPresentationOperationCompatibleWithState,
  isValidPresentationId,
  isValidPresentationRevision,
  isValidPublicId,
  isValidSlideBackground,
  isValidTimestamp,
  isValidTitle,
} from "@/features/presentations/core/presentation-core";

const DATABASE_VERSION = 2;
const PROJECTIONS_STORE = "presentation-projections";
const SNAPSHOTS_STORE = "presentation-snapshots";
const OPERATIONS_STORE = "presentation-operations";
const OUTBOX_STORE = "presentation-outbox";
const SYNC_METADATA_STORE = "presentation-sync-metadata";
const ASSETS_STORE = "presentation-assets";
const STORE_NAMES = [
  PROJECTIONS_STORE,
  SNAPSHOTS_STORE,
  OPERATIONS_STORE,
  OUTBOX_STORE,
  SYNC_METADATA_STORE,
  ASSETS_STORE,
] as const;

type StoredAsset = LocalAssetMetadata & { readonly binary: Blob };

type StoredProjection = PersistedPresentation["projection"];
type StoredSnapshot = {
  readonly presentationId: string;
  readonly revision: number;
  readonly snapshotOrigin: PersistedPresentation["snapshotOrigin"];
  readonly serializedState: string;
  readonly integrityReceipt: unknown | null;
};

type StoredPersistedPresentation = {
  readonly projection: StoredProjection;
  readonly snapshot: StoredSnapshot;
  readonly syncMetadata: PersistedPresentation["syncMetadata"];
} & (
  | {
      readonly operation: null;
      readonly outboxEntry: null;
    }
  | {
      readonly operation: NonNullable<PersistedPresentation["operation"]>;
      readonly outboxEntry: NonNullable<PersistedPresentation["outboxEntry"]>;
    }
);

/** Browser-only adapter. It resolves IndexedDB only when a method is invoked. */
export class IndexedDbPresentationRepository
  implements PresentationRepository, LocalAssetRepository
{
  readonly databaseName: string;
  readonly databaseFactory: IDBFactory | undefined;

  constructor(
    input: {
      readonly databaseName?: string;
      readonly databaseFactory?: IDBFactory;
    } = {},
  ) {
    this.databaseName = input.databaseName ?? "tryslides-presentations";
    this.databaseFactory = input.databaseFactory;
  }

  async save(presentation: PersistedPresentation): Promise<void> {
    await this.writePresentation(presentation);
  }

  async saveWithAsset(
    presentation: PersistedPresentation,
    asset: LocalAsset,
  ): Promise<void> {
    if (!isLocalAsset(asset))
      throw new PresentationPersistenceError("INVALID_ASSET");
    await this.writePresentation(presentation, asset);
  }

  private async writePresentation(
    presentation: PersistedPresentation,
    asset?: LocalAsset,
  ): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAMES, "readwrite");
      try {
        if (presentation.operation !== null) {
          const [operation, outbox_entry] = await Promise.all([
            requestValue(
              transaction
                .objectStore(OPERATIONS_STORE)
                .get(presentation.operation.localOperationId),
            ),
            requestValue(
              transaction
                .objectStore(OUTBOX_STORE)
                .get(presentation.operation.localOperationId),
            ),
          ]);
          if (operation !== undefined || outbox_entry !== undefined) {
            throw new PresentationPersistenceError(
              "LOCAL_OPERATION_ID_CONFLICT",
            );
          }
        }
        const snapshot: StoredSnapshot = {
          presentationId: presentation.projection.id,
          revision: presentation.projection.revision,
          snapshotOrigin: presentation.snapshotOrigin,
          serializedState: presentation.serializedState,
          integrityReceipt: presentation.integrityReceipt,
        };
        transaction.objectStore(PROJECTIONS_STORE).put(presentation.projection);
        transaction.objectStore(SNAPSHOTS_STORE).put(snapshot);
        if (presentation.operation !== null)
          transaction.objectStore(OPERATIONS_STORE).add(presentation.operation);
        if (presentation.outboxEntry !== null)
          transaction.objectStore(OUTBOX_STORE).add(presentation.outboxEntry);
        if (asset !== undefined)
          transaction.objectStore(ASSETS_STORE).put({
            ...asset.metadata,
            presentationIds: [...asset.metadata.presentationIds],
            binary: asset.binary,
          } satisfies StoredAsset);
        transaction
          .objectStore(SYNC_METADATA_STORE)
          .put(presentation.syncMetadata);
      } catch (error) {
        transaction.abort();
        throw error instanceof PresentationPersistenceError
          ? error
          : new PresentationPersistenceError("PERSISTENCE_WRITE_FAILED", {
              cause: error,
            });
      }
      await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
    } finally {
      database.close();
    }
  }

  async acknowledgeLocalSave(
    input: AcknowledgePresentationSaveInput,
  ): Promise<void> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(
        [PROJECTIONS_STORE, SNAPSHOTS_STORE, SYNC_METADATA_STORE],
        "readwrite",
      );
      const [snapshot, sync_metadata] = await Promise.all([
        requestValue(
          transaction.objectStore(SNAPSHOTS_STORE).get(input.presentationId),
        ),
        requestValue(
          transaction
            .objectStore(SYNC_METADATA_STORE)
            .get(input.presentationId),
        ),
      ]);
      if (!canAcknowledgeLocalSave(snapshot, sync_metadata, input)) {
        await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
        return;
      }
      try {
        transaction.objectStore(PROJECTIONS_STORE).put(input.projection);
        transaction.objectStore(SNAPSHOTS_STORE).put({
          presentationId: input.presentationId,
          revision: input.revision,
          snapshotOrigin: input.snapshotOrigin,
          serializedState: input.serializedState,
          integrityReceipt: input.integrityReceipt,
        } satisfies StoredSnapshot);
        transaction
          .objectStore(SYNC_METADATA_STORE)
          .put(clearPendingSaveAcknowledgement(sync_metadata));
      } catch (error) {
        transaction.abort();
        throw new PresentationPersistenceError("PERSISTENCE_WRITE_FAILED", {
          cause: error,
        });
      }
      await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
    } finally {
      database.close();
    }
  }

  async load(presentation_id: string): Promise<PersistedPresentation | null> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAMES, "readonly");
      const snapshot = await requestValue(
        transaction.objectStore(SNAPSHOTS_STORE).get(presentation_id),
      );
      const snapshot_origin = getSnapshotOrigin(snapshot);
      const [projection, operation, outbox_entry, sync_metadata] =
        await Promise.all([
          requestValue(
            transaction.objectStore(PROJECTIONS_STORE).get(presentation_id),
          ),
          snapshot_origin?.kind === "operation"
            ? requestValue(
                transaction
                  .objectStore(OPERATIONS_STORE)
                  .get(snapshot_origin.localOperationId),
              )
            : Promise.resolve(undefined),
          snapshot_origin?.kind === "operation"
            ? requestValue(
                transaction
                  .objectStore(OUTBOX_STORE)
                  .get(snapshot_origin.localOperationId),
              )
            : Promise.resolve(undefined),
          requestValue(
            transaction.objectStore(SYNC_METADATA_STORE).get(presentation_id),
          ),
        ]);
      await waitForTransaction(transaction, "PERSISTENCE_READ_FAILED");
      if (
        projection === undefined &&
        snapshot === undefined &&
        operation === undefined &&
        outbox_entry === undefined &&
        sync_metadata === undefined
      )
        return null;
      const records = {
        projection,
        snapshot,
        operation,
        outboxEntry: outbox_entry,
        syncMetadata: sync_metadata,
      };
      if (!isPersistedPresentation(records, presentation_id))
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      if (records.snapshot.snapshotOrigin.kind === "initial")
        return freezePersistedPresentation({
          projection: records.projection,
          serializedState: records.snapshot.serializedState,
          integrityReceipt: records.snapshot.integrityReceipt,
          snapshotOrigin: records.snapshot.snapshotOrigin,
          operation: null,
          outboxEntry: null,
          syncMetadata: records.syncMetadata,
        });
      if (records.operation === null || records.outboxEntry === null)
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      return freezePersistedPresentation({
        projection: records.projection,
        serializedState: records.snapshot.serializedState,
        integrityReceipt: records.snapshot.integrityReceipt,
        snapshotOrigin: records.snapshot.snapshotOrigin,
        operation: records.operation,
        outboxEntry: records.outboxEntry,
        syncMetadata: records.syncMetadata,
      });
    } catch (error) {
      throw translateReadError(error);
    } finally {
      database.close();
    }
  }

  async list(): Promise<readonly PresentationCard[]> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(PROJECTIONS_STORE, "readonly");
      const projections = await requestValue(
        transaction.objectStore(PROJECTIONS_STORE).getAll(),
      );
      await waitForTransaction(transaction, "PERSISTENCE_READ_FAILED");
      if (!Array.isArray(projections))
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      const cards = projections.map(toPresentationCard);
      return Object.freeze(cards.sort(comparePresentationCards));
    } catch (error) {
      throw translateReadError(error);
    } finally {
      database.close();
    }
  }

  async saveAsset(asset: LocalAsset): Promise<void> {
    if (!isLocalAsset(asset))
      throw new PresentationPersistenceError("INVALID_ASSET");
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(ASSETS_STORE, "readwrite");
      try {
        transaction.objectStore(ASSETS_STORE).put({
          ...asset.metadata,
          presentationIds: [...asset.metadata.presentationIds],
          binary: asset.binary,
        } satisfies StoredAsset);
      } catch (error) {
        transaction.abort();
        throw new PresentationPersistenceError("PERSISTENCE_WRITE_FAILED", {
          cause: error,
        });
      }
      await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
    } finally {
      database.close();
    }
  }

  async loadAsset(asset_id: string): Promise<LocalAsset | null> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(ASSETS_STORE, "readonly");
      const stored = await requestValue(
        transaction.objectStore(ASSETS_STORE).get(asset_id),
      );
      await waitForTransaction(transaction, "PERSISTENCE_READ_FAILED");
      if (stored === undefined) return null;
      if (!isStoredAsset(stored))
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      return Object.freeze({
        metadata: Object.freeze({
          id: stored.id,
          contentType: stored.contentType,
          size: stored.size,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
          presentationIds: Object.freeze([...stored.presentationIds]),
        }),
        binary: stored.binary,
      });
    } catch (error) {
      throw translateReadError(error);
    } finally {
      database.close();
    }
  }

  async deleteAsset(
    asset_id: string,
  ): Promise<"deleted" | "not-found" | "retained"> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(
        [ASSETS_STORE, PROJECTIONS_STORE],
        "readwrite",
      );
      const [stored, projections] = await Promise.all([
        requestValue(transaction.objectStore(ASSETS_STORE).get(asset_id)),
        requestValue(transaction.objectStore(PROJECTIONS_STORE).getAll()),
      ]);
      if (stored === undefined) {
        await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
        return "not-found";
      }
      if (!Array.isArray(projections))
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      if (
        projections.some((projection) =>
          getReferencedAssetIds(
            isRecord(projection) ? projection.document : undefined,
          ).includes(asset_id),
        )
      ) {
        await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
        return "retained";
      }
      transaction.objectStore(ASSETS_STORE).delete(asset_id);
      await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
      return "deleted";
    } finally {
      database.close();
    }
  }

  async delete(intent: {
    readonly presentationId: string;
    readonly revision: number;
  }): Promise<"deleted" | "not-found" | "conflict"> {
    const database = await this.openDatabase();
    try {
      const transaction = database.transaction(STORE_NAMES, "readwrite");
      const projection = await requestValue(
        transaction.objectStore(PROJECTIONS_STORE).get(intent.presentationId),
      );
      if (projection === undefined) {
        await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
        return "not-found";
      }
      if (!isRecord(projection) || projection.revision !== intent.revision) {
        await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
        return "conflict";
      }
      const [operation_keys, outbox_keys, projections, assets] =
        await Promise.all([
          requestValue(
            transaction
              .objectStore(OPERATIONS_STORE)
              .index("by-presentation")
              .getAllKeys(intent.presentationId),
          ),
          requestValue(
            transaction
              .objectStore(OUTBOX_STORE)
              .index("by-presentation")
              .getAllKeys(intent.presentationId),
          ),
          requestValue(transaction.objectStore(PROJECTIONS_STORE).getAll()),
          requestValue(transaction.objectStore(ASSETS_STORE).getAll()),
        ]);
      if (
        !Array.isArray(operation_keys) ||
        !Array.isArray(outbox_keys) ||
        !Array.isArray(projections) ||
        !Array.isArray(assets)
      )
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      if (!assets.every(isStoredAsset))
        throw new PresentationPersistenceError(
          "INVALID_PERSISTED_PRESENTATION",
        );
      const remaining_asset_ids = new Set(
        projections
          .filter(
            (value) => isRecord(value) && value.id !== intent.presentationId,
          )
          .flatMap((value) => getReferencedAssetIds(value.document)),
      );
      const deleted_asset_ids = assets.flatMap((asset) =>
        isStoredAsset(asset) && !remaining_asset_ids.has(asset.id)
          ? [asset.id]
          : [],
      );
      transaction.objectStore(PROJECTIONS_STORE).delete(intent.presentationId);
      transaction.objectStore(SNAPSHOTS_STORE).delete(intent.presentationId);
      transaction
        .objectStore(SYNC_METADATA_STORE)
        .delete(intent.presentationId);
      for (const key of operation_keys)
        transaction.objectStore(OPERATIONS_STORE).delete(key);
      for (const key of outbox_keys)
        transaction.objectStore(OUTBOX_STORE).delete(key);
      for (const asset_id of deleted_asset_ids)
        transaction.objectStore(ASSETS_STORE).delete(asset_id);
      await waitForTransaction(transaction, "PERSISTENCE_WRITE_FAILED");
      return "deleted";
    } finally {
      database.close();
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    const database_factory =
      this.databaseFactory ?? getBrowserIndexedDbFactory();
    return new Promise((resolve, reject) => {
      try {
        const request = database_factory.open(
          this.databaseName,
          DATABASE_VERSION,
        );
        request.onupgradeneeded = () => createSchema(request.result);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            new PresentationPersistenceError("PERSISTENCE_UNAVAILABLE", {
              cause: request.error,
            }),
          );
        request.onblocked = () =>
          reject(new PresentationPersistenceError("PERSISTENCE_UNAVAILABLE"));
      } catch (error) {
        reject(
          new PresentationPersistenceError("PERSISTENCE_UNAVAILABLE", {
            cause: error,
          }),
        );
      }
    });
  }
}

function getBrowserIndexedDbFactory(): IDBFactory {
  if (typeof indexedDB === "undefined")
    throw new PresentationPersistenceError("PERSISTENCE_UNAVAILABLE");
  return indexedDB;
}

function createSchema(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(PROJECTIONS_STORE)) {
    const store = database.createObjectStore(PROJECTIONS_STORE, {
      keyPath: "id",
    });
    store.createIndex("by-public-id", "publicId", { unique: true });
  }
  if (!database.objectStoreNames.contains(SNAPSHOTS_STORE))
    database.createObjectStore(SNAPSHOTS_STORE, { keyPath: "presentationId" });
  if (!database.objectStoreNames.contains(OPERATIONS_STORE)) {
    const store = database.createObjectStore(OPERATIONS_STORE, {
      keyPath: "localOperationId",
    });
    store.createIndex("by-presentation", "presentationId", { unique: false });
  }
  if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
    const store = database.createObjectStore(OUTBOX_STORE, {
      keyPath: "localOperationId",
    });
    store.createIndex("by-presentation", "presentationId", { unique: false });
  }
  if (!database.objectStoreNames.contains(SYNC_METADATA_STORE))
    database.createObjectStore(SYNC_METADATA_STORE, {
      keyPath: "presentationId",
    });
  if (!database.objectStoreNames.contains(ASSETS_STORE))
    database.createObjectStore(ASSETS_STORE, { keyPath: "id" });
}

function waitForTransaction(
  transaction: IDBTransaction,
  error_code: PresentationPersistenceErrorCode,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        new PresentationPersistenceError(error_code, {
          cause: transaction.error,
        }),
      );
    transaction.onerror = () => undefined;
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isPersistedPresentation(
  value: {
    readonly projection: unknown;
    readonly snapshot: unknown;
    readonly operation: unknown;
    readonly outboxEntry: unknown;
    readonly syncMetadata: unknown;
  },
  presentation_id: string,
): value is StoredPersistedPresentation {
  const { projection, snapshot, operation, outboxEntry, syncMetadata } = value;
  const has_valid_common_records =
    isRecord(projection) &&
    projection.id === presentation_id &&
    typeof projection.publicId === "string" &&
    typeof projection.revision === "number" &&
    isRecord(projection.document) &&
    isStoredSnapshot(snapshot) &&
    snapshot.presentationId === presentation_id &&
    projection.revision === snapshot.revision &&
    isRecord(syncMetadata) &&
    syncMetadata.presentationId === presentation_id &&
    typeof syncMetadata.nextLocalSequence === "number" &&
    Number.isInteger(syncMetadata.nextLocalSequence) &&
    syncMetadata.nextLocalSequence >= 0 &&
    isNullableString(syncMetadata.lastSyncedAt) &&
    isNullableString(syncMetadata.remoteCursor) &&
    isValidSyncStatus(syncMetadata.syncStatus) &&
    isNullableString(syncMetadata.lastSyncError) &&
    isPendingSaveAcknowledgement(syncMetadata.pendingSaveAcknowledgement) &&
    hasMatchingPendingAcknowledgement(snapshot, syncMetadata);
  if (!has_valid_common_records) return false;
  if (snapshot.snapshotOrigin.kind === "initial")
    return (
      operation === undefined &&
      outboxEntry === undefined &&
      hasMatchingSnapshotState(snapshot, projection, null, null)
    );
  return (
    isRecord(operation) &&
    operation.presentationId === presentation_id &&
    operation.localOperationId === snapshot.snapshotOrigin.localOperationId &&
    isRecord(operation.operation) &&
    isRecord(outboxEntry) &&
    outboxEntry.presentationId === presentation_id &&
    outboxEntry.localOperationId === operation.localOperationId &&
    outboxEntry.status === "pending" &&
    isRecord(outboxEntry.operation) &&
    hasMatchingSnapshotState(snapshot, projection, operation, outboxEntry)
  );
}

function toPresentationCard(projection: unknown): PresentationCard {
  if (!isStoredProjectionForCard(projection))
    throw new PresentationPersistenceError("INVALID_PERSISTED_PRESENTATION");
  const cover_background = projection.document.slides[0]?.background ?? null;
  return Object.freeze({
    id: projection.id,
    publicId: projection.publicId,
    title: projection.document.title,
    status: projection.document.status,
    createdAt: projection.document.createdAt,
    updatedAt: projection.document.updatedAt,
    lastSavedAt: projection.document.lastSavedAt,
    lastPublishedAt: projection.document.lastPublishedAt,
    coverBackground:
      cover_background === null ? null : Object.freeze({ ...cover_background }),
  });
}

function isStoredProjectionForCard(
  value: unknown,
): value is StoredProjection & {
  readonly document: {
    readonly id: string;
    readonly publicId: string;
    readonly title: string;
    readonly status: "draft" | "published";
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly lastSavedAt: string | null;
    readonly lastPublishedAt: string | null;
    readonly slides: readonly { readonly background: unknown }[];
  };
} {
  if (!isRecord(value) || !isRecord(value.document)) return false;
  const document = value.document;
  return (
    isValidPresentationId(value.id) &&
    isValidPublicId(value.publicId) &&
    isValidPresentationRevision(value.revision) &&
    document.id === value.id &&
    document.publicId === value.publicId &&
    isValidTitle(document.title) &&
    (document.status === "draft" || document.status === "published") &&
    isValidTimestamp(document.createdAt) &&
    isValidTimestamp(document.updatedAt) &&
    document.updatedAt >= document.createdAt &&
    isNullableTimestamp(document.lastSavedAt) &&
    isNullableTimestamp(document.lastPublishedAt) &&
    (document.status !== "draft" || document.lastPublishedAt === null) &&
    (document.status !== "published" || document.lastPublishedAt !== null) &&
    Array.isArray(document.slides) &&
    document.slides.every(
      (slide) => isRecord(slide) && isValidSlideBackground(slide.background),
    )
  );
}

function comparePresentationCards(
  left: PresentationCard,
  right: PresentationCard,
): number {
  const updated_at_comparison = right.updatedAt.localeCompare(left.updatedAt);
  return updated_at_comparison === 0
    ? comparePresentationIds(left.id, right.id)
    : updated_at_comparison;
}

function comparePresentationIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function hasMatchingPendingAcknowledgement(
  snapshot: unknown,
  sync_metadata: unknown,
): boolean {
  if (!isStoredSnapshot(snapshot) || !isRecord(sync_metadata)) return false;
  const pending = sync_metadata.pendingSaveAcknowledgement;
  if (!isPendingSaveAcknowledgement(pending)) return false;
  return (
    pending === null ||
    (pending.revision === snapshot.revision &&
      (snapshot.snapshotOrigin.kind === "initial"
        ? pending.localOperationId === ""
        : pending.localOperationId ===
          snapshot.snapshotOrigin.localOperationId))
  );
}

function canAcknowledgeLocalSave(
  snapshot: unknown,
  sync_metadata: unknown,
  input: AcknowledgePresentationSaveInput,
): boolean {
  return (
    isStoredSnapshot(snapshot) &&
    snapshot.presentationId === input.presentationId &&
    snapshot.revision === input.revision &&
    hasSameSnapshotOrigin(snapshot.snapshotOrigin, input.snapshotOrigin) &&
    isRecord(sync_metadata) &&
    isPendingSaveAcknowledgement(sync_metadata.pendingSaveAcknowledgement) &&
    sync_metadata.pendingSaveAcknowledgement !== null &&
    sync_metadata.pendingSaveAcknowledgement.revision === input.revision &&
    hasMatchingAcknowledgementOrigin(
      sync_metadata.pendingSaveAcknowledgement.localOperationId,
      input.snapshotOrigin,
    ) &&
    input.savedAt >= sync_metadata.pendingSaveAcknowledgement.savedAt
  );
}

function clearPendingSaveAcknowledgement(
  value: unknown,
): Record<string, unknown> {
  if (!isRecord(value))
    throw new PresentationPersistenceError("PERSISTENCE_WRITE_FAILED");
  return { ...value, pendingSaveAcknowledgement: null };
}

function isStoredSnapshot(value: unknown): value is StoredSnapshot {
  return (
    isRecord(value) &&
    typeof value.presentationId === "string" &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    isSnapshotOrigin(value.snapshotOrigin) &&
    typeof value.serializedState === "string" &&
    "integrityReceipt" in value
  );
}

function hasMatchingSnapshotState(
  snapshot: unknown,
  projection: unknown,
  operation: unknown,
  outbox_entry: unknown,
): boolean {
  if (!isStoredSnapshot(snapshot) || !isRecord(projection)) return false;
  const deserialized = deserializePresentationState(snapshot.serializedState);
  if (!deserialized.success) return false;
  const {
    undoStack: _undo_stack,
    redoStack: _redo_stack,
    ...document
  } = deserialized.state;
  return (
    JSON.stringify(projection.document) === JSON.stringify(document) &&
    isPresentationOperationCompatibleWithState(
      deserialized.state,
      operation === null || operation === undefined || !isRecord(operation)
        ? null
        : operation.operation,
    ) &&
    (snapshot.snapshotOrigin.kind === "initial"
      ? (operation === null || operation === undefined) &&
        (outbox_entry === null || outbox_entry === undefined)
      : isRecord(operation) &&
        isRecord(outbox_entry) &&
        JSON.stringify(outbox_entry.operation) ===
          JSON.stringify(operation.operation))
  );
}

function getSnapshotOrigin(
  value: unknown,
): PersistedPresentation["snapshotOrigin"] | undefined {
  return isRecord(value) && isSnapshotOrigin(value.snapshotOrigin)
    ? value.snapshotOrigin
    : undefined;
}

function isSnapshotOrigin(
  value: unknown,
): value is PersistedPresentation["snapshotOrigin"] {
  return (
    isRecord(value) &&
    (value.kind === "initial" ||
      (value.kind === "operation" &&
        typeof value.localOperationId === "string"))
  );
}

function hasSameSnapshotOrigin(
  left: PersistedPresentation["snapshotOrigin"],
  right: PersistedPresentation["snapshotOrigin"],
): boolean {
  return (
    left.kind === right.kind &&
    (left.kind === "initial" ||
      (right.kind === "operation" &&
        left.localOperationId === right.localOperationId))
  );
}

function hasMatchingAcknowledgementOrigin(
  local_operation_id: unknown,
  snapshot_origin: PersistedPresentation["snapshotOrigin"],
): boolean {
  return (
    typeof local_operation_id === "string" &&
    (snapshot_origin.kind === "initial"
      ? local_operation_id === ""
      : local_operation_id === snapshot_origin.localOperationId)
  );
}

function isValidSyncStatus(value: unknown): boolean {
  return (
    value === "idle" ||
    value === "pending" ||
    value === "syncing" ||
    value === "blocked"
  );
}

function isPendingSaveAcknowledgement(value: unknown): value is {
  readonly revision: number;
  readonly localOperationId: string;
  readonly savedAt: string;
} | null {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.revision === "number" &&
      Number.isInteger(value.revision) &&
      value.revision >= 0 &&
      typeof value.localOperationId === "string" &&
      typeof value.savedAt === "string")
  );
}

function translateReadError(error: unknown): PresentationPersistenceError {
  if (error instanceof PresentationPersistenceError) return error;
  return new PresentationPersistenceError("PERSISTENCE_READ_FAILED", {
    cause: error,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isValidTimestamp(value);
}

function getReferencedAssetIds(document: unknown): string[] {
  if (!isRecord(document) || !Array.isArray(document.slides)) return [];
  return document.slides.flatMap((slide) =>
    isRecord(slide) && Array.isArray(slide.elements)
      ? slide.elements.flatMap((element) =>
          isRecord(element) &&
          element.type === "image" &&
          typeof element.assetId === "string"
            ? [element.assetId]
            : [],
        )
      : [],
  );
}

function isLocalAsset(value: LocalAsset): boolean {
  return (
    isLocalAssetMetadata(value.metadata) &&
    value.binary instanceof Blob &&
    value.binary.size === value.metadata.size &&
    value.binary.type === value.metadata.contentType
  );
}

function isStoredAsset(value: unknown): value is StoredAsset {
  return (
    isRecord(value) &&
    isLocalAssetMetadata(value) &&
    "binary" in value &&
    value.binary instanceof Blob &&
    value.binary.size === value.size &&
    value.binary.type === value.contentType
  );
}

function isLocalAssetMetadata(value: unknown): value is LocalAssetMetadata {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.contentType === "string" &&
    /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(value.contentType) &&
    typeof value.size === "number" &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0 &&
    isCanonicalTimestamp(value.createdAt) &&
    isCanonicalTimestamp(value.updatedAt) &&
    value.updatedAt >= value.createdAt &&
    Array.isArray(value.presentationIds) &&
    value.presentationIds.every(
      (presentation_id) =>
        typeof presentation_id === "string" &&
        presentation_id.trim().length > 0,
    ) &&
    new Set(value.presentationIds).size === value.presentationIds.length
  );
}

function isCanonicalTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  );
}

function freezePersistedPresentation(
  presentation: PersistedPresentation,
): PersistedPresentation {
  if (presentation.operation === null)
    return Object.freeze({
      ...presentation,
      operation: null,
      outboxEntry: null,
      projection: freezeValue(presentation.projection),
      syncMetadata: freezeValue(presentation.syncMetadata),
    });
  if (presentation.outboxEntry === null)
    throw new PresentationPersistenceError("INVALID_PERSISTED_PRESENTATION");
  return Object.freeze({
    ...presentation,
    projection: freezeValue(presentation.projection),
    operation: freezeValue(presentation.operation),
    outboxEntry: freezeValue(presentation.outboxEntry),
    syncMetadata: freezeValue(presentation.syncMetadata),
  });
}

function freezeValue<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value)) freezeValue(child);
  return Object.freeze(value);
}
