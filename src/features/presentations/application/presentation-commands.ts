import type {
  CommandResult,
  CreatePresentationInput,
  PresentationCoreErrorCode,
  PresentationOperation,
  PresentationState,
} from "@/features/presentations/core/presentation-core";
import {
  createPresentation,
  createPresentationDeletionIntent,
  redo,
  undo,
} from "@/features/presentations/core/presentation-core";

import type {
  LocalAsset,
  PresentationAssetTransactionRepository,
  PresentationPersistenceErrorCode,
  PresentationRepository,
  PresentationSyncMetadata,
} from "./presentation-repository";
import { PresentationPersistenceError } from "./presentation-repository";
import {
  savePresentation,
  savePresentationWithLocalAsset,
} from "./save-presentation";

export interface PresentationIdGenerator {
  createPresentationId(): string;
  createPublicId(): string;
  createLocalOperationId(): string;
}

export interface PresentationClock {
  now(): string;
}

export type PresentationCommandErrorCode =
  | PresentationCoreErrorCode
  | PresentationPersistenceErrorCode;

export type PresentationCommandResult =
  | {
      readonly success: true;
      readonly state: PresentationState;
      readonly operation: PresentationOperation | null;
    }
  | { readonly success: false; readonly code: PresentationCommandErrorCode };

export type CorePresentationCommand = (
  state: PresentationState,
  input: { readonly updatedAt: string; readonly source: "user" | "system" },
) => CommandResult;

/**
 * Coordinates deterministic application dependencies around a Core command.
 * The supplied command remains the only authority over presentation mutations.
 */
export class PresentationCommands {
  private readonly usedLocalOperationIds = new Set<string>();

  constructor(
    private readonly repository: PresentationRepository,
    private readonly ids: PresentationIdGenerator,
    private readonly clock: PresentationClock,
  ) {}

  async create(input: {
    readonly title: string;
  }): Promise<PresentationCommandResult> {
    const created_at = this.clock.now();
    const created = createPresentation({
      id: this.ids.createPresentationId(),
      publicId: this.ids.createPublicId(),
      title: input.title,
      createdAt: created_at,
    } satisfies CreatePresentationInput);
    if (!created.success) return { success: false, code: created.error.code };
    return this.persist(created.state, null, { kind: "initial" }, created_at);
  }

  async execute(
    state: PresentationState,
    command: CorePresentationCommand,
    source: "user" | "system" = "user",
  ): Promise<PresentationCommandResult> {
    const result = command(state, { updatedAt: this.clock.now(), source });
    if (!result.success) return { success: false, code: result.error.code };
    return this.persist(
      result.state,
      result.operation,
      {
        kind: "operation",
        localOperationId: this.createUniqueLocalOperationId(),
      },
      this.clock.now(),
    );
  }

  async executeWithLocalAsset(
    state: PresentationState,
    asset: LocalAsset,
    command: CorePresentationCommand,
    source: "user" | "system" = "user",
  ): Promise<PresentationCommandResult> {
    const result = command(state, { updatedAt: this.clock.now(), source });
    if (!result.success) return { success: false, code: result.error.code };
    const operation = result.operation;
    if (!isPresentationAssetTransactionRepository(this.repository))
      return { success: false, code: "PERSISTENCE_WRITE_FAILED" };
    try {
      const saved = await savePresentationWithLocalAsset(
        this.repository,
        asset,
        {
          state: result.state,
          snapshotOrigin: {
            kind: "operation",
            localOperationId: this.createUniqueLocalOperationId(),
          },
          operation,
          syncMetadata: this.createSyncMetadata(result.state, operation),
          savedAt: this.clock.now(),
        },
      );
      return saved.success
        ? { success: true, state: saved.state, operation }
        : { success: false, code: saved.code };
    } catch (error) {
      return { success: false, code: getErrorCode(error) };
    }
  }

  async undo(
    state: PresentationState,
    source: "user" | "system" = "user",
  ): Promise<PresentationCommandResult> {
    return this.persistHistoryResult(undo(state, { source }));
  }

  async redo(
    state: PresentationState,
    source: "user" | "system" = "user",
  ): Promise<PresentationCommandResult> {
    return this.persistHistoryResult(redo(state, { source }));
  }

  async delete(
    state: PresentationState,
  ): Promise<
    | { readonly success: true; readonly outcome: "deleted" | "not-found" }
    | { readonly success: false; readonly code: PresentationCommandErrorCode }
  > {
    const intent = createPresentationDeletionIntent(state);
    if (!intent.success) return { success: false, code: intent.error.code };
    try {
      const outcome = await this.repository.delete(intent.intent);
      return outcome === "conflict"
        ? { success: false, code: "CONFLICT" }
        : { success: true, outcome };
    } catch (error) {
      return { success: false, code: getErrorCode(error) };
    }
  }

  private async persist(
    state: PresentationState,
    operation: PresentationOperation | null,
    snapshot_origin:
      | { readonly kind: "initial" }
      | {
          readonly kind: "operation";
          readonly localOperationId: string;
        },
    saved_at: string,
  ): Promise<PresentationCommandResult> {
    const sync_metadata: PresentationSyncMetadata = {
      presentationId: state.id,
      nextLocalSequence: state.operationSequence + 1,
      lastSyncedAt: null,
      remoteCursor: null,
      syncStatus: operation === null ? "idle" : "pending",
      lastSyncError: null,
      pendingSaveAcknowledgement: null,
    };
    try {
      if (snapshot_origin.kind === "initial") {
        if (operation !== null)
          return { success: false, code: "VALIDATION_ERROR" };
        const saved = await savePresentation(this.repository, {
          state,
          snapshotOrigin: snapshot_origin,
          syncMetadata: sync_metadata,
          savedAt: saved_at,
        });
        return saved.success
          ? { success: true, state: saved.state, operation }
          : { success: false, code: saved.code };
      }
      if (operation === null)
        return { success: false, code: "VALIDATION_ERROR" };
      const saved = await savePresentation(this.repository, {
        state,
        snapshotOrigin: snapshot_origin,
        operation,
        syncMetadata: sync_metadata,
        savedAt: saved_at,
      });
      return saved.success
        ? { success: true, state: saved.state, operation }
        : { success: false, code: saved.code };
    } catch (error) {
      return { success: false, code: getErrorCode(error) };
    }
  }

  private async persistHistoryResult(
    result: CommandResult,
  ): Promise<PresentationCommandResult> {
    if (!result.success) return { success: false, code: result.error.code };
    return this.persist(
      result.state,
      result.operation,
      {
        kind: "operation",
        localOperationId: this.createUniqueLocalOperationId(),
      },
      this.clock.now(),
    );
  }

  private createSyncMetadata(
    state: PresentationState,
    operation: PresentationOperation | null,
  ): PresentationSyncMetadata {
    return {
      presentationId: state.id,
      nextLocalSequence: state.operationSequence + 1,
      lastSyncedAt: null,
      remoteCursor: null,
      syncStatus: operation === null ? "idle" : "pending",
      lastSyncError: null,
      pendingSaveAcknowledgement: null,
    };
  }

  private createUniqueLocalOperationId(): string {
    const generated = this.ids.createLocalOperationId();
    let candidate = generated;
    let suffix = 1;
    while (this.usedLocalOperationIds.has(candidate)) {
      candidate = `${generated}-${suffix}`;
      suffix += 1;
    }
    this.usedLocalOperationIds.add(candidate);
    return candidate;
  }
}

function getErrorCode(error: unknown): PresentationPersistenceErrorCode {
  return error instanceof PresentationPersistenceError
    ? error.code
    : "PERSISTENCE_WRITE_FAILED";
}

function isPresentationAssetTransactionRepository(
  repository: PresentationRepository,
): repository is PresentationAssetTransactionRepository {
  return (
    "saveWithAsset" in repository &&
    typeof repository.saveWithAsset === "function"
  );
}
