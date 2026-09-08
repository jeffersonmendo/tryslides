import assert from "node:assert/strict";
import test from "node:test";

import { IDBFactory } from "fake-indexeddb";

import {
  loadLocalAsset,
  saveLocalAsset,
} from "@/features/presentations/application/local-assets";
import { PresentationCommands } from "@/features/presentations/application/presentation-commands";
import { PresentationPersistenceError } from "@/features/presentations/application/presentation-repository";
import {
  createPresentationProjection,
  loadPresentation,
  savePresentation,
  savePresentationWithLocalAsset,
} from "@/features/presentations/application/save-presentation";
import {
  createElement,
  createPresentation,
  createSlide,
  redo,
  renamePresentation,
  serializePresentationState,
  undo,
} from "@/features/presentations/core/presentation-core";

import { IndexedDbPresentationRepository } from "./indexed-db-presentation-repository";

const PRESENTATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const PUBLIC_ID = "Ab3xYz";
const CREATED_AT = "2026-09-07T12:00:00.000Z";
const UPDATED_AT = "2026-09-07T12:01:00.000Z";

function createRepository() {
  return new IndexedDbPresentationRepository({
    databaseFactory: new IDBFactory(),
    databaseName: `presentation-test-${crypto.randomUUID()}`,
  });
}

function createStateWithOperation() {
  const initial = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Product overview",
    createdAt: CREATED_AT,
  });
  assert.equal(initial.success, true);
  const changed = createSlide(initial.state, {
    id: "slide_1",
    updatedAt: UPDATED_AT,
  });
  assert.equal(changed.success, true);
  return changed;
}

function createSyncMetadata() {
  return {
    presentationId: PRESENTATION_ID,
    nextLocalSequence: 2,
    lastSyncedAt: null,
    remoteCursor: null,
    syncStatus: "pending" as const,
    lastSyncError: null,
    pendingSaveAcknowledgement: null,
  };
}

function createOperationSnapshotOrigin(local_operation_id: string) {
  return { kind: "operation" as const, localOperationId: local_operation_id };
}

function isTestReceipt(
  value: unknown,
): value is { readonly source: string; readonly serializedState: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "source" in value &&
    value.source === "test-receipt"
  );
}

test("saves and restores a presentation with all local persistence records", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  const receipt = Object.freeze({ source: "test-receipt" });
  const saved = await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: changed.operation,
    createIntegrityReceipt: (serialized_state) =>
      Object.freeze({ ...receipt, serializedState: serialized_state }),
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });

  assert.equal(saved.success, true);
  if (!saved.success) return;
  assert.equal(saved.state.lastSavedAt, "2026-09-07T12:02:00.000Z");
  const stored = await repository.load(PRESENTATION_ID);
  assert.notEqual(stored, null);
  if (stored === null) return;
  assert.equal(stored.snapshotOrigin.kind, "operation");
  if (stored.snapshotOrigin.kind !== "operation") return;
  if (stored.operation === null || stored.outboxEntry === null) return;
  assert.deepEqual(stored.integrityReceipt, {
    ...receipt,
    serializedState: stored.serializedState,
  });
  assert.equal(stored.operation.localOperationId, "local-operation-1");
  assert.equal(
    stored.outboxEntry.localOperationId,
    stored.operation.localOperationId,
  );
  assert.equal(stored.syncMetadata.syncStatus, "pending");
  assert.equal(Object.isFrozen(stored.operation), true);

  const loaded = await loadPresentation(repository, PRESENTATION_ID, {
    verifyIntegrityReceipt: (input) =>
      isTestReceipt(input.integrityReceipt) &&
      input.integrityReceipt.serializedState === input.serializedState,
  });
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.deepEqual(loaded.state, saved.state);
});

test("persists and loads an initially created presentation", async () => {
  const repository = createRepository();
  const created = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Untitled presentation",
    createdAt: CREATED_AT,
  });
  assert.equal(created.success, true);
  if (!created.success) return;

  const saved = await savePresentation(repository, {
    state: created.state,
    snapshotOrigin: { kind: "initial" },
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);

  const loaded = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.equal(loaded.state.title, "Untitled presentation");
  assert.deepEqual(loaded.state.slides, []);
  assert.equal(loaded.state.lastSavedAt, "2026-09-07T12:02:00.000Z");
});

test("lists no cards when the local projection store is empty", async () => {
  const repository = createRepository();

  assert.deepEqual(await repository.list(), []);
});

test("lists card-safe presentation data without reading snapshots", async () => {
  const repository = createRepository();
  await saveInitialPresentation(repository, {
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "First",
    createdAt: CREATED_AT,
  });
  await saveInitialPresentation(repository, {
    id: "550e8400-e29b-41d4-a716-446655440001",
    publicId: "Cd4yZa",
    title: "Second",
    createdAt: "2026-09-07T12:02:00.000Z",
  });
  await replaceSnapshot(
    repository.databaseFactory as IDBFactory,
    repository.databaseName,
    "{",
  );

  const cards = await repository.list();

  assert.deepEqual(cards, [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      publicId: "Cd4yZa",
      title: "Second",
      status: "draft",
      createdAt: "2026-09-07T12:02:00.000Z",
      updatedAt: "2026-09-07T12:02:00.000Z",
      lastSavedAt: "2026-09-07T12:02:00.000Z",
      lastPublishedAt: null,
      coverBackground: null,
    },
    {
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "First",
      status: "draft",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      lastSavedAt: CREATED_AT,
      lastPublishedAt: null,
      coverBackground: null,
    },
  ]);
});

test("lists cards despite unavailable or corrupt unrelated persistence records", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("list-unrelated-records"),
    operation: changed.operation,
    createIntegrityReceipt: () => ({ source: "receipt" }),
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  await corruptUnrelatedListingRecords(
    repository.databaseFactory as IDBFactory,
    repository.databaseName,
    "list-unrelated-records",
  );

  const cards = await repository.list();

  assert.deepEqual(
    cards.map((card) => card.id),
    [PRESENTATION_ID],
  );
});

test("includes the first slide background as minimal visual card data", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("card-cover"),
    operation: changed.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });

  const [card] = await repository.list();

  assert.deepEqual(card?.coverBackground, { type: "solid", color: "#FFFFFF" });
});

test("orders cards by newest update and then internal identity", async () => {
  const repository = createRepository();
  await saveInitialPresentation(repository, {
    id: "550e8400-e29b-41d4-a716-446655440002",
    publicId: "Ef6wVu",
    title: "Later",
    createdAt: "2026-09-07T12:02:00.000Z",
  });
  await saveInitialPresentation(repository, {
    id: "550e8400-e29b-41d4-a716-446655440000",
    publicId: PUBLIC_ID,
    title: "First tie",
    createdAt: CREATED_AT,
  });
  await saveInitialPresentation(repository, {
    id: "550e8400-e29b-41d4-a716-446655440001",
    publicId: "Cd4yZa",
    title: "Second tie",
    createdAt: CREATED_AT,
  });

  const cards = await repository.list();

  assert.deepEqual(
    cards.map((card) => card.id),
    [
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001",
    ],
  );
});

test("orders equal timestamps with a locale-independent UUID comparison", async () => {
  const repository = createRepository();
  const uppercase_id = "550E8400-E29B-41D4-A716-446655440000";
  const lowercase_id = "550e8400-e29b-41d4-a716-446655440000";
  await saveInitialPresentation(repository, {
    id: lowercase_id,
    publicId: "Cd4yZa",
    title: "Lowercase",
    createdAt: CREATED_AT,
  });
  await saveInitialPresentation(repository, {
    id: uppercase_id,
    publicId: PUBLIC_ID,
    title: "Uppercase",
    createdAt: CREATED_AT,
  });

  const cards = await repository.list();

  assert.deepEqual(
    cards.map((card) => card.id),
    [uppercase_id, lowercase_id],
  );
});

test("rejects invalid persisted projections during card listing", async () => {
  const factory = new IDBFactory();
  const database_name = `presentation-test-${crypto.randomUUID()}`;
  const repository = new IndexedDbPresentationRepository({
    databaseFactory: factory,
    databaseName: database_name,
  });
  await saveInitialPresentation(repository, {
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Valid",
    createdAt: CREATED_AT,
  });
  await replaceProjection(factory, database_name, {
    id: "invalid",
    publicId: "Gh7tSr",
    revision: 1,
    document: {},
  });

  await assert.rejects(() => repository.list(), {
    code: "INVALID_PERSISTED_PRESENTATION",
  });
});

test("rejects card projections with lifecycle states invalid in the Core", async () => {
  const cases = [
    { status: "draft", lastPublishedAt: UPDATED_AT },
    { status: "published", lastPublishedAt: null },
  ] as const;

  for (const lifecycle of cases) {
    const factory = new IDBFactory();
    const database_name = `presentation-test-${crypto.randomUUID()}`;
    const repository = new IndexedDbPresentationRepository({
      databaseFactory: factory,
      databaseName: database_name,
    });
    const created = createPresentation({
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "Invalid lifecycle",
      createdAt: CREATED_AT,
    });
    assert.equal(created.success, true);
    if (!created.success) return;
    await saveInitialPresentation(repository, {
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "Invalid lifecycle",
      createdAt: CREATED_AT,
    });
    await replaceProjection(factory, database_name, {
      ...createPresentationProjection(created.state),
      document: { ...created.state, ...lifecycle },
    });

    await assert.rejects(() => repository.list(), {
      code: "INVALID_PERSISTED_PRESENTATION",
    });
  }
});

test("translates projection read failures during card listing", async () => {
  const cause = new Error("Projection read failed");
  const database_factory = createFailingReadDatabaseFactory(cause);
  const repository = new IndexedDbPresentationRepository({
    databaseFactory: database_factory,
  });

  await assert.rejects(
    () => repository.list(),
    (error) => {
      assert.equal(error instanceof PresentationPersistenceError, true);
      if (!(error instanceof PresentationPersistenceError)) return false;
      assert.equal(error.code, "PERSISTENCE_READ_FAILED");
      assert.equal(error.cause, cause);
      return true;
    },
  );
});

test("persists and loads the observable document restored by undo", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  const undone = undo(changed.state);
  assert.equal(undone.success, true);
  if (!undone.success) return;

  const saved = await savePresentation(repository, {
    state: undone.state,
    snapshotOrigin: { kind: "operation", localOperationId: "local-undo-1" },
    operation: undone.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);

  const loaded = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.deepEqual(loaded.state.slides, []);
  assert.equal(loaded.state.title, "Product overview");
});

test("persists and loads the observable document reapplied by redo", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  const undone = undo(changed.state);
  assert.equal(undone.success, true);
  if (!undone.success) return;
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  if (!redone.success) return;

  const saved = await savePresentation(repository, {
    state: redone.state,
    snapshotOrigin: { kind: "operation", localOperationId: "local-redo-1" },
    operation: redone.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);

  const loaded = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.equal(loaded.state.slides.length, 1);
  assert.equal(loaded.state.slides[0]?.id, "slide_1");
});

test("rejects non-initial snapshots marked as initial without persistence", async () => {
  const command = createStateWithOperation();
  const undone = undo(command.state);
  assert.equal(undone.success, true);
  if (!undone.success) return;
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  if (!redone.success) return;

  for (const state of [command.state, undone.state, redone.state]) {
    const repository = createRepository();
    const saved = await savePresentation(repository, {
      state,
      snapshotOrigin: { kind: "initial" },
      syncMetadata: createSyncMetadata(),
      savedAt: "2026-09-07T12:02:00.000Z",
    });

    assert.deepEqual(saved, {
      success: false,
      code: "INVALID_SERIALIZED_STATE",
    });
    assert.equal(await repository.load(PRESENTATION_ID), null);
  }
});

test("rejects an operation incompatible with the snapshot without persistence", async () => {
  const repository = createRepository();
  const command = createStateWithOperation();
  const next_command = createSlide(command.state, {
    id: "slide_2",
    updatedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(next_command.success, true);
  if (!next_command.success) return;

  const saved = await savePresentation(repository, {
    state: command.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-2"),
    operation: next_command.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });

  assert.deepEqual(saved, {
    success: false,
    code: "INVALID_SERIALIZED_STATE",
  });
  assert.equal(await repository.load(PRESENTATION_ID), null);
});

test("rolls back every store when a record cannot be cloned", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();

  await assert.rejects(
    () =>
      savePresentation(repository, {
        state: changed.state,
        snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
        operation: changed.operation,
        createIntegrityReceipt: () => () => undefined,
        syncMetadata: createSyncMetadata(),
        savedAt: "2026-09-07T12:02:00.000Z",
      }),
    { code: "PERSISTENCE_WRITE_FAILED" },
  );
  assert.equal(await repository.load(PRESENTATION_ID), null);
  assert.equal(changed.state.lastSavedAt, null);
});

test("rejects an invalid integrity receipt during restoration", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: changed.operation,
    createIntegrityReceipt: () => ({ receipt: "expected" }),
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });

  const loaded = await loadPresentation(repository, PRESENTATION_ID, {
    verifyIntegrityReceipt: () => false,
  });
  assert.deepEqual(loaded, {
    success: false,
    code: "INVALID_SERIALIZED_STATE",
  });
});

test("rejects an invalid persisted Core snapshot", async () => {
  const factory = new IDBFactory();
  const database_name = `presentation-test-${crypto.randomUUID()}`;
  const repository = new IndexedDbPresentationRepository({
    databaseFactory: factory,
    databaseName: database_name,
  });
  const changed = createStateWithOperation();
  await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: changed.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  await replaceSnapshot(factory, database_name, "{");

  await assert.rejects(() => repository.load(PRESENTATION_ID), {
    code: "INVALID_PERSISTED_PRESENTATION",
  });
});

test("does not let an older acknowledgement overwrite a newer snapshot", async () => {
  const repository = createRepository();
  const first = createStateWithOperation();
  await savePresentation(repository, {
    state: first.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: first.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  const second = createSlide(first.state, {
    id: "slide_2",
    updatedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(second.success, true);
  if (!second.success) return;
  const second_serialized = serializePresentationState(second.state);
  assert.equal(second_serialized.success, true);
  if (!second_serialized.success) return;
  await savePresentation(repository, {
    state: second.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-2"),
    operation: second.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:04:00.000Z",
  });

  await repository.acknowledgeLocalSave({
    presentationId: PRESENTATION_ID,
    revision: first.state.revision,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    projection: createPresentationProjection(first.state),
    serializedState: second_serialized.serializedState,
    integrityReceipt: null,
    savedAt: "2026-09-07T12:02:00.000Z",
  });

  const stored = await repository.load(PRESENTATION_ID);
  assert.notEqual(stored, null);
  if (stored === null) return;
  assert.equal(stored.snapshotOrigin.kind, "operation");
  if (stored.snapshotOrigin.kind !== "operation") return;
  if (stored.operation === null) return;
  assert.equal(stored.projection.revision, second.state.revision);
  assert.equal(stored.operation.localOperationId, "local-operation-2");
});

test("recovers a durable save acknowledgement after interruption", async () => {
  const repository = createRepository();
  const changed = createStateWithOperation();
  const serialized = serializePresentationState(changed.state);
  assert.equal(serialized.success, true);
  if (!serialized.success) return;
  await repository.save({
    projection: createPresentationProjection(changed.state),
    serializedState: serialized.serializedState,
    integrityReceipt: null,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: {
      localOperationId: "local-operation-1",
      presentationId: PRESENTATION_ID,
      operation: changed.operation,
    },
    outboxEntry: {
      localOperationId: "local-operation-1",
      presentationId: PRESENTATION_ID,
      operation: changed.operation,
      status: "pending",
    },
    syncMetadata: {
      ...createSyncMetadata(),
      pendingSaveAcknowledgement: {
        revision: changed.state.revision,
        localOperationId: "local-operation-1",
        savedAt: "2026-09-07T12:00:00.000Z",
      },
    },
  });

  const recovered = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(recovered.success, true);
  if (!recovered.success) return;
  assert.equal(recovered.state.lastSavedAt, UPDATED_AT);
  const stored = await repository.load(PRESENTATION_ID);
  assert.notEqual(stored, null);
  if (stored === null) return;
  assert.equal(stored.syncMetadata.pendingSaveAcknowledgement, null);
});

test("rejects an outbox entry that does not match the persisted operation", async () => {
  const factory = new IDBFactory();
  const database_name = `presentation-test-${crypto.randomUUID()}`;
  const repository = new IndexedDbPresentationRepository({
    databaseFactory: factory,
    databaseName: database_name,
  });
  const changed = createStateWithOperation();
  await savePresentation(repository, {
    state: changed.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-operation-1"),
    operation: changed.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  await replaceOutboxOperation(factory, database_name);

  await assert.rejects(() => repository.load(PRESENTATION_ID), {
    code: "INVALID_PERSISTED_PRESENTATION",
  });
});

test("translates IndexedDB read availability failures and preserves their cause", async () => {
  const cause = new Error("IndexedDB unavailable");
  const database_factory = new IDBFactory();
  database_factory.open = () => {
    throw cause;
  };
  const repository = new IndexedDbPresentationRepository({
    databaseFactory: database_factory,
  });

  await assert.rejects(
    () => repository.load(PRESENTATION_ID),
    (error) => {
      assert.equal(error instanceof PresentationPersistenceError, true);
      if (!(error instanceof PresentationPersistenceError)) return false;
      assert.equal(error.code, "PERSISTENCE_UNAVAILABLE");
      assert.equal(error.cause, cause);
      return true;
    },
  );
});

test("coordinates deterministic creation, Core commands, undo, and persistence", async () => {
  const repository = createRepository();
  const clock_values = [
    "2026-09-07T12:00:00.000Z",
    "2026-09-07T12:01:00.000Z",
    "2026-09-07T12:02:00.000Z",
    "2026-09-07T12:03:00.000Z",
  ];
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => PRESENTATION_ID,
      createPublicId: () => PUBLIC_ID,
      createSlideId: () => "slide_1",
      createLocalOperationId: () => "local-operation-1",
    },
    { now: () => clock_values.shift() ?? "2026-09-07T12:04:00.000Z" },
  );

  const created = await commands.create({ title: "Product overview" });
  assert.equal(created.success, true);
  if (!created.success) return;
  const renamed = await commands.execute(created.state, (state, input) =>
    renamePresentation(state, { title: "Renamed", ...input }),
  );
  assert.equal(renamed.success, true);
  if (!renamed.success) return;
  assert.equal(renamed.operation?.type, "rename-presentation");
  const undone = await commands.undo(renamed.state);
  assert.equal(undone.success, true);
  if (!undone.success) return;
  assert.equal(undone.state.title, "Product overview");
  const loaded = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.equal(loaded.state.title, "Product overview");
});

test("creates a persisted presentation with its first empty slide", async () => {
  const repository = createRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => PRESENTATION_ID,
      createPublicId: () => PUBLIC_ID,
      createSlideId: () => "slide_1",
      createLocalOperationId: () => "initial-slide-operation",
    },
    {
      now: (() => {
        const values = [CREATED_AT, UPDATED_AT, UPDATED_AT];
        return () => values.shift() ?? UPDATED_AT;
      })(),
    },
  );

  const created = await commands.createWithInitialSlide({
    title: "First presentation",
  });

  assert.equal(created.success, true);
  if (!created.success) return;
  assert.equal(created.state.slides.length, 1);
  assert.equal(created.state.slides[0]?.id, "slide_1");
  assert.deepEqual(await repository.list(), [
    {
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "First presentation",
      status: "draft",
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
      lastSavedAt: UPDATED_AT,
      lastPublishedAt: null,
      coverBackground: { type: "solid", color: "#FFFFFF" },
    },
  ]);
});

test("allocates distinct local operation IDs for repeated injected values", async () => {
  const repository = createRepository();
  const clock_values = [
    "2026-09-07T12:00:00.000Z",
    "2026-09-07T12:01:00.000Z",
    "2026-09-07T12:02:00.000Z",
    "2026-09-07T12:03:00.000Z",
    "2026-09-07T12:04:00.000Z",
  ];
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => PRESENTATION_ID,
      createPublicId: () => PUBLIC_ID,
      createSlideId: () => "slide_1",
      createLocalOperationId: () => "repeated-operation",
    },
    { now: () => clock_values.shift() ?? "2026-09-07T12:05:00.000Z" },
  );
  const created = await commands.create({ title: "Initial" });
  assert.equal(created.success, true);
  if (!created.success) return;
  const first = await commands.execute(created.state, (state, input) =>
    renamePresentation(state, { title: "First", ...input }),
  );
  assert.equal(first.success, true);
  if (!first.success) return;
  const second = await commands.execute(first.state, (state, input) =>
    renamePresentation(state, { title: "Second", ...input }),
  );
  assert.equal(second.success, true);
  if (!second.success) return;
  assert.notEqual(first.operation?.id, second.operation?.id);

  const expected_ids = ["repeated-operation", "repeated-operation-1"];
  for (const store_name of ["presentation-operations", "presentation-outbox"]) {
    const operation_ids = await getAllKeys(
      repository.databaseFactory as IDBFactory,
      repository.databaseName,
      store_name,
    );
    assert.deepEqual(operation_ids.sort(), expected_ids);
  }
});

test("rejects a colliding local operation ID without overwriting immutable records", async () => {
  const repository = createRepository();
  const first = createStateWithOperation();
  await savePresentation(repository, {
    state: first.state,
    snapshotOrigin: createOperationSnapshotOrigin("collision"),
    operation: first.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  const original_operation = await getRecord(
    repository.databaseFactory as IDBFactory,
    repository.databaseName,
    "presentation-operations",
    "collision",
  );
  const original_outbox = await getRecord(
    repository.databaseFactory as IDBFactory,
    repository.databaseName,
    "presentation-outbox",
    "collision",
  );
  const second = createSlide(first.state, {
    id: "slide_2",
    updatedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(second.success, true);
  if (!second.success) return;

  await assert.rejects(
    () =>
      savePresentation(repository, {
        state: second.state,
        snapshotOrigin: createOperationSnapshotOrigin("collision"),
        operation: second.operation,
        syncMetadata: createSyncMetadata(),
        savedAt: "2026-09-07T12:04:00.000Z",
      }),
    { code: "LOCAL_OPERATION_ID_CONFLICT" },
  );
  const stored = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(stored.success, true);
  if (!stored.success) return;
  assert.equal(stored.state.slides.length, 1);
  assert.deepEqual(
    await getRecord(
      repository.databaseFactory as IDBFactory,
      repository.databaseName,
      "presentation-operations",
      "collision",
    ),
    original_operation,
  );
  assert.deepEqual(
    await getRecord(
      repository.databaseFactory as IDBFactory,
      repository.databaseName,
      "presentation-outbox",
      "collision",
    ),
    original_outbox,
  );
});

test("normalizes repeated or regressive local clock values without changing Core operation time", async () => {
  const repository = createRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => PRESENTATION_ID,
      createPublicId: () => PUBLIC_ID,
      createSlideId: () => "slide_1",
      createLocalOperationId: () => "operation",
    },
    {
      now: (() => {
        const values = [
          "2026-09-07T12:00:00.000Z",
          "2026-09-07T12:01:00.000Z",
          "2026-09-07T12:01:00.000Z",
          "2026-09-07T12:00:00.000Z",
        ];
        return () => values.shift() ?? "2026-09-07T11:00:00.000Z";
      })(),
    },
  );
  const created = await commands.create({ title: "Initial" });
  assert.equal(created.success, true);
  if (!created.success) return;
  const changed = await commands.execute(created.state, (state, input) =>
    renamePresentation(state, { title: "Changed", ...input }),
  );
  assert.equal(changed.success, true);
  if (!changed.success) return;
  assert.equal(changed.state.updatedAt, "2026-09-07T12:01:00.000Z");
  assert.equal(changed.state.lastSavedAt, "2026-09-07T12:01:00.000Z");

  const recovered = await loadPresentation(repository, PRESENTATION_ID);
  assert.equal(recovered.success, true);
  if (!recovered.success) return;
  assert.notEqual(recovered.state.lastSavedAt, null);
  if (recovered.state.lastSavedAt === null) return;
  assert.ok(recovered.state.lastSavedAt >= recovered.state.updatedAt);
});

test("stores binary assets outside snapshots and rejects invalid asset metadata", async () => {
  const repository = createRepository();
  const binary = new Blob(["binary"], { type: "image/png" });
  const asset = {
    metadata: {
      id: "asset_1",
      contentType: "image/png",
      size: binary.size,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      presentationIds: [PRESENTATION_ID],
    },
    binary,
  } as const;
  assert.equal((await saveLocalAsset(repository, asset)).success, true);
  const loaded = await loadLocalAsset(repository, "asset_1");
  assert.equal(loaded.success, true);
  if (!loaded.success) return;
  assert.equal(await loaded.asset.binary.text(), "binary");
  const invalid = await saveLocalAsset(repository, {
    ...asset,
    metadata: { ...asset.metadata, size: asset.metadata.size + 1 },
  });
  assert.deepEqual(invalid, { success: false, code: "INVALID_ASSET" });
  assert.equal((await loadLocalAsset(repository, "missing")).success, false);
});

test("atomically persists an asset with its referencing Core operation and rolls both back", async () => {
  const repository = createRepository();
  const created = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Assets",
    createdAt: CREATED_AT,
  });
  assert.equal(created.success, true);
  if (!created.success) return;
  const slide = createSlide(created.state, {
    id: "slide_1",
    updatedAt: UPDATED_AT,
  });
  assert.equal(slide.success, true);
  if (!slide.success) return;
  const image = createElement(slide.state, {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 0 },
      size: { width: 10, height: 10 },
      rotation: 0,
      opacity: 1,
    },
    updatedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(image.success, true);
  if (!image.success) return;
  const binary = new Blob(["asset"], { type: "image/png" });
  const asset = {
    metadata: {
      id: "asset_1",
      contentType: "image/png",
      size: binary.size,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      presentationIds: [PRESENTATION_ID],
    },
    binary,
  } as const;
  const saved = await savePresentationWithLocalAsset(repository, asset, {
    state: image.state,
    snapshotOrigin: createOperationSnapshotOrigin("asset-operation"),
    operation: image.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(saved.success, true);
  assert.notEqual(await repository.loadAsset("asset_1"), null);
  assert.equal(
    (await loadPresentation(repository, PRESENTATION_ID)).success,
    true,
  );

  const rollback_repository = createRepository();
  await assert.rejects(
    () =>
      savePresentationWithLocalAsset(rollback_repository, asset, {
        state: image.state,
        snapshotOrigin: createOperationSnapshotOrigin("asset-operation"),
        operation: image.operation,
        createIntegrityReceipt: () => () => undefined,
        syncMetadata: createSyncMetadata(),
        savedAt: "2026-09-07T12:03:00.000Z",
      }),
    { code: "PERSISTENCE_WRITE_FAILED" },
  );
  assert.equal(await rollback_repository.load(PRESENTATION_ID), null);
  assert.equal(await rollback_repository.loadAsset("asset_1"), null);
});

test("retains a referenced shared asset and cleans up orphaned assets after presentation deletion", async () => {
  const repository = createRepository();
  const other_id = "550e8400-e29b-41d4-a716-446655440001";
  const first = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "First",
    createdAt: CREATED_AT,
  });
  const second = createPresentation({
    id: other_id,
    publicId: "Cd4yZa",
    title: "Second",
    createdAt: CREATED_AT,
  });
  assert.equal(first.success, true);
  assert.equal(second.success, true);
  if (!first.success || !second.success) return;
  const first_slide = createSlide(first.state, {
    id: "slide_1",
    updatedAt: UPDATED_AT,
  });
  const second_slide = createSlide(second.state, {
    id: "slide_2",
    updatedAt: UPDATED_AT,
  });
  assert.equal(first_slide.success, true);
  assert.equal(second_slide.success, true);
  if (!first_slide.success || !second_slide.success) return;
  const image = {
    id: "image_1",
    type: "image" as const,
    assetId: "asset_1",
    position: { x: 0, y: 0 },
    size: { width: 10, height: 10 },
    rotation: 0,
    opacity: 1,
  };
  const first_image = createElement(first_slide.state, {
    slideId: "slide_1",
    element: image,
    updatedAt: "2026-09-07T12:02:00.000Z",
  });
  const second_image = createElement(second_slide.state, {
    slideId: "slide_2",
    element: { ...image, id: "image_2" },
    updatedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(first_image.success, true);
  assert.equal(second_image.success, true);
  if (!first_image.success || !second_image.success) return;
  const exclusive_image = createElement(first_image.state, {
    slideId: "slide_1",
    element: { ...image, id: "image_3", assetId: "asset_2" },
    updatedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(exclusive_image.success, true);
  if (!exclusive_image.success) return;
  await savePresentation(repository, {
    state: exclusive_image.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-first"),
    operation: exclusive_image.operation,
    syncMetadata: createSyncMetadata(),
    savedAt: "2026-09-07T12:03:00.000Z",
  });
  await savePresentation(repository, {
    state: second_image.state,
    snapshotOrigin: createOperationSnapshotOrigin("local-second"),
    operation: second_image.operation,
    syncMetadata: { ...createSyncMetadata(), presentationId: other_id },
    savedAt: "2026-09-07T12:03:00.000Z",
  });
  const binary = new Blob(["asset"], { type: "image/png" });
  await repository.saveAsset({
    metadata: {
      id: "asset_1",
      contentType: "image/png",
      size: binary.size,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      presentationIds: [PRESENTATION_ID, other_id],
    },
    binary,
  });
  await repository.saveAsset({
    metadata: {
      id: "asset_2",
      contentType: "image/png",
      size: binary.size,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      presentationIds: [other_id],
    },
    binary,
  });
  assert.equal(await repository.deleteAsset("asset_1"), "retained");
  assert.notEqual(await repository.loadAsset("asset_1"), null);
  assert.equal(
    await repository.delete({
      presentationId: PRESENTATION_ID,
      revision: exclusive_image.state.revision,
    }),
    "deleted",
  );
  assert.equal(await repository.load(PRESENTATION_ID), null);
  assert.notEqual(await repository.load(other_id), null);
  assert.notEqual(await repository.loadAsset("asset_1"), null);
  assert.equal(await repository.loadAsset("asset_2"), null);
  assert.equal(
    await repository.delete({
      presentationId: PRESENTATION_ID,
      revision: exclusive_image.state.revision,
    }),
    "not-found",
  );
});

test("deletes an orphaned asset idempotently", async () => {
  const repository = createRepository();
  const binary = new Blob(["orphan"], { type: "image/png" });
  await repository.saveAsset({
    metadata: {
      id: "orphaned_asset",
      contentType: "image/png",
      size: binary.size,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      presentationIds: [PRESENTATION_ID],
    },
    binary,
  });

  assert.equal(await repository.deleteAsset("orphaned_asset"), "deleted");
  assert.equal(await repository.loadAsset("orphaned_asset"), null);
  assert.equal(await repository.deleteAsset("orphaned_asset"), "not-found");
});

test("fails predictably during SSR without evaluating IndexedDB at import time", async () => {
  const repository = new IndexedDbPresentationRepository();
  await assert.rejects(() => repository.load("missing"), {
    code: "PERSISTENCE_UNAVAILABLE",
  });
  await assert.rejects(() => repository.list(), {
    code: "PERSISTENCE_UNAVAILABLE",
  });
});

async function saveInitialPresentation(
  repository: IndexedDbPresentationRepository,
  input: {
    readonly id: string;
    readonly publicId: string;
    readonly title: string;
    readonly createdAt: string;
  },
): Promise<void> {
  const created = createPresentation(input);
  assert.equal(created.success, true);
  if (!created.success) return;
  const saved = await savePresentation(repository, {
    state: created.state,
    snapshotOrigin: { kind: "initial" },
    syncMetadata: {
      ...createSyncMetadata(),
      presentationId: input.id,
    },
    savedAt: input.createdAt,
  });
  assert.equal(saved.success, true);
}

async function replaceSnapshot(
  factory: IDBFactory,
  database_name: string,
  serialized_state: string,
): Promise<void> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction(
    "presentation-snapshots",
    "readwrite",
  );
  const store = transaction.objectStore("presentation-snapshots");
  const snapshot = await requestValue(store.get(PRESENTATION_ID));
  store.put({ ...snapshot, serializedState: serialized_state });
  await waitForTransaction(transaction);
  database.close();
}

async function replaceProjection(
  factory: IDBFactory,
  database_name: string,
  projection: unknown,
): Promise<void> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction(
    "presentation-projections",
    "readwrite",
  );
  transaction.objectStore("presentation-projections").put(projection);
  await waitForTransaction(transaction);
  database.close();
}

async function corruptUnrelatedListingRecords(
  factory: IDBFactory,
  database_name: string,
  local_operation_id: string,
): Promise<void> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction(
    [
      "presentation-snapshots",
      "presentation-operations",
      "presentation-outbox",
      "presentation-assets",
    ],
    "readwrite",
  );
  const snapshots = transaction.objectStore("presentation-snapshots");
  const snapshot = await requestValue(snapshots.get(PRESENTATION_ID));
  const { integrityReceipt: _integrity_receipt, ...snapshot_without_receipt } =
    snapshot;
  snapshots.put(snapshot_without_receipt);
  transaction.objectStore("presentation-operations").put({
    localOperationId: local_operation_id,
    corrupt: true,
  });
  transaction.objectStore("presentation-outbox").put({
    localOperationId: local_operation_id,
    corrupt: true,
  });
  transaction.objectStore("presentation-assets").put({ id: "corrupt-asset" });
  await waitForTransaction(transaction);
  database.close();
}

function createFailingReadDatabaseFactory(cause: Error): IDBFactory {
  const database = {
    transaction: () => {
      throw cause;
    },
    close: () => undefined,
  } as unknown as IDBDatabase;
  return {
    open: () => {
      const request = { result: database } as IDBOpenDBRequest;
      queueMicrotask(() =>
        request.onsuccess?.call(request, new Event("success")),
      );
      return request;
    },
  } as unknown as IDBFactory;
}

async function getAllKeys(
  factory: IDBFactory,
  database_name: string,
  store_name: string,
): Promise<string[]> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction(store_name, "readonly");
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const request = transaction.objectStore(store_name).getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await waitForTransaction(transaction);
  database.close();
  return keys.filter((key): key is string => typeof key === "string");
}

async function getRecord(
  factory: IDBFactory,
  database_name: string,
  store_name: string,
  key: string,
): Promise<Record<string, unknown> | undefined> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction(store_name, "readonly");
  const record = await new Promise<Record<string, unknown> | undefined>(
    (resolve, reject) => {
      const request = transaction.objectStore(store_name).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    },
  );
  await waitForTransaction(transaction);
  database.close();
  return record;
}

async function replaceOutboxOperation(
  factory: IDBFactory,
  database_name: string,
): Promise<void> {
  const database = await openDatabase(factory, database_name);
  const transaction = database.transaction("presentation-outbox", "readwrite");
  const store = transaction.objectStore("presentation-outbox");
  const entry = await requestValue(store.get("local-operation-1"));
  store.put({ ...entry, operation: { id: "invalid" } });
  await waitForTransaction(transaction);
  database.close();
}

function openDatabase(
  factory: IDBFactory,
  database_name: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(database_name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestValue(
  request: IDBRequest<unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () =>
      resolve(request.result as Record<string, unknown>);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => undefined;
  });
}
