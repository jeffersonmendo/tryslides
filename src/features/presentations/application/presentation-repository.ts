import type {
  PresentationDocumentState,
  PresentationOperation,
  PresentationStatus,
  SlideBackground,
} from "@/features/presentations/core/presentation-core";

export type PresentationSyncStatus = "idle" | "pending" | "syncing" | "blocked";

export type PendingLocalSaveAcknowledgement = {
  readonly revision: number;
  readonly localOperationId: string;
  readonly savedAt: string;
};

export type PresentationProjection = {
  readonly id: string;
  readonly publicId: string;
  readonly revision: number;
  readonly document: PresentationDocumentState;
};

/**
 * The serializable local read model for a presentation card. It deliberately
 * excludes Core snapshots, operations, receipts, and binary asset data.
 */
export type PresentationCard = {
  readonly id: string;
  readonly publicId: string;
  readonly title: string;
  readonly status: PresentationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastSavedAt: string | null;
  readonly lastPublishedAt: string | null;
  readonly coverBackground: SlideBackground | null;
};

/**
 * This identifier is unique only within one local database. It is deliberately
 * not a remote idempotency key or a multi-device operation identity.
 */
export type LocalPresentationOperation = {
  /**
   * A caller-provided key whose uniqueness is scoped to one local IndexedDB
   * database. It is not a remote operation identity or idempotency key.
   */
  readonly localOperationId: string;
  readonly presentationId: string;
  readonly operation: PresentationOperation;
};

export type InitialPresentationSnapshotOrigin = {
  readonly kind: "initial";
};

export type OperationPresentationSnapshotOrigin = {
  readonly kind: "operation";
  readonly localOperationId: string;
};

/**
 * Explicitly identifies whether a snapshot was created with the presentation
 * or by the exact local operation persisted beside it.
 */
export type PresentationSnapshotOrigin =
  | InitialPresentationSnapshotOrigin
  | OperationPresentationSnapshotOrigin;

export type PresentationOutboxEntry = {
  readonly localOperationId: string;
  readonly presentationId: string;
  readonly operation: PresentationOperation;
  readonly status: "pending";
};

export type PresentationSyncMetadata = {
  readonly presentationId: string;
  readonly nextLocalSequence: number;
  readonly lastSyncedAt: string | null;
  readonly remoteCursor: string | null;
  readonly syncStatus: PresentationSyncStatus;
  readonly lastSyncError: string | null;
  readonly pendingSaveAcknowledgement: PendingLocalSaveAcknowledgement | null;
};

type PersistedPresentationBase = {
  readonly projection: PresentationProjection;
  readonly serializedState: string;
  /** Opaque external evidence. Persistence preserves it without trusting it. */
  readonly integrityReceipt: unknown | null;
  readonly syncMetadata: PresentationSyncMetadata;
};

export type PersistedPresentation =
  | (PersistedPresentationBase & {
      readonly snapshotOrigin: InitialPresentationSnapshotOrigin;
      readonly operation: null;
      readonly outboxEntry: null;
    })
  | (PersistedPresentationBase & {
      readonly snapshotOrigin: OperationPresentationSnapshotOrigin;
      readonly operation: LocalPresentationOperation;
      readonly outboxEntry: PresentationOutboxEntry;
    });

export type AcknowledgePresentationSaveInput = {
  readonly presentationId: string;
  readonly revision: number;
  readonly snapshotOrigin: PresentationSnapshotOrigin;
  readonly projection: PresentationProjection;
  readonly serializedState: string;
  readonly integrityReceipt: unknown | null;
  readonly savedAt: string;
};

export type PresentationPersistenceErrorCode =
  | "ASSET_NOT_FOUND"
  | "INVALID_ASSET"
  | "INVALID_PERSISTED_PRESENTATION"
  | "LOCAL_OPERATION_ID_CONFLICT"
  | "PERSISTENCE_READ_FAILED"
  | "PERSISTENCE_UNAVAILABLE"
  | "PERSISTENCE_WRITE_FAILED";

export class PresentationPersistenceError extends Error {
  readonly code: PresentationPersistenceErrorCode;

  constructor(code: PresentationPersistenceErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "PresentationPersistenceError";
    this.code = code;
  }
}

export interface PresentationRepository {
  save(presentation: PersistedPresentation): Promise<void>;
  acknowledgeLocalSave(input: AcknowledgePresentationSaveInput): Promise<void>;
  load(presentation_id: string): Promise<PersistedPresentation | null>;
  list(): Promise<readonly PresentationCard[]>;
  delete(intent: {
    readonly presentationId: string;
    readonly revision: number;
  }): Promise<"deleted" | "not-found" | "conflict">;
}

/** Metadata is separate from the binary and is safe to expose to callers. */
export type LocalAssetMetadata = {
  readonly id: string;
  readonly contentType: string;
  readonly size: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Current presentation projections that intentionally retain this binary. */
  readonly presentationIds: readonly string[];
};

export type LocalAsset = {
  readonly metadata: LocalAssetMetadata;
  readonly binary: Blob;
};

export interface LocalAssetRepository {
  saveAsset(asset: LocalAsset): Promise<void>;
  loadAsset(asset_id: string): Promise<LocalAsset | null>;
  deleteAsset(asset_id: string): Promise<"deleted" | "not-found" | "retained">;
}

/** Local atomic durability boundary; it does not imply remote upload behavior. */
export interface PresentationAssetTransactionRepository
  extends PresentationRepository {
  saveWithAsset(
    presentation: PersistedPresentation,
    asset: LocalAsset,
  ): Promise<void>;
}

/** Extends the single-asset transaction without changing its public contract. */
export interface PresentationAssetsTransactionRepository
  extends PresentationAssetTransactionRepository {
  saveWithAssets(
    presentation: PersistedPresentation,
    assets: readonly LocalAsset[],
  ): Promise<void>;
}
