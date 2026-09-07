import assert from "node:assert/strict";
import test from "node:test";

import type { PresentationSnapshotReceiptVerificationInput } from "./presentation-core";
import {
  ANIMATION_CAPABILITIES,
  confirmPresentationPublished,
  confirmPresentationSaved,
  bringForward as coreBringForward,
  configureAnimation as coreConfigureAnimation,
  configureTransition as coreConfigureTransition,
  createElement as coreCreateElement,
  createSlide as coreCreateSlide,
  deleteElement as coreDeleteElement,
  deleteSlide as coreDeleteSlide,
  duplicateElement as coreDuplicateElement,
  duplicateSlide as coreDuplicateSlide,
  editElement as coreEditElement,
  editSlide as coreEditSlide,
  moveElement as coreMoveElement,
  renamePresentation as coreRenamePresentation,
  reorderElement as coreReorderElement,
  reorderSlide as coreReorderSlide,
  replaceAsset as coreReplaceAsset,
  resizeElement as coreResizeElement,
  sendBackward as coreSendBackward,
  createPresentation,
  createPresentationDeletionIntent,
  deserializePresentationState,
  PRESENTATION_CANVAS,
  redo,
  serializePresentationState,
  TRANSITION_CAPABILITIES,
  undo,
} from "./presentation-core";

const PRESENTATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const PUBLIC_ID = "Ab3xYz";
const CREATED_AT = "2026-09-07T12:00:00.000Z";
const UPDATED_AT = "2026-09-07T12:01:00.000Z";

type SerializedHistoryPayload = {
  undoStack: Array<{
    before: { operationSequence: number };
    after: {
      status: string;
      lastSavedAt: string | null;
      lastPublishedAt: string | null;
      createdAt: string;
      updatedAt: string;
      operationSequence: number;
    };
    operation: { sequence: number };
  }>;
};

type SnapshotReceipt = { readonly serializedState: string };

function verifySnapshotReceipt(
  input: PresentationSnapshotReceiptVerificationInput<SnapshotReceipt>,
): boolean {
  return input.integrityReceipt.serializedState === input.serializedState;
}

function withUpdatedAt<Input extends { readonly updatedAt: string }, Result>(
  operation: (
    state: Parameters<typeof coreCreateSlide>[0],
    input: Input,
  ) => Result,
) {
  return (
    state: Parameters<typeof coreCreateSlide>[0],
    input: Omit<Input, "updatedAt">,
  ) =>
    operation(state, {
      ...input,
      updatedAt: `2026-09-07T12:${String(state.operationSequence + 1).padStart(
        2,
        "0",
      )}:00.000Z`,
    } as Input);
}

const create_slide = withUpdatedAt(coreCreateSlide);
const rename_presentation = withUpdatedAt(coreRenamePresentation);
const edit_slide = withUpdatedAt(coreEditSlide);
const delete_slide = withUpdatedAt(coreDeleteSlide);
const duplicate_slide = withUpdatedAt(coreDuplicateSlide);
const reorder_slide = withUpdatedAt(coreReorderSlide);
const create_element = withUpdatedAt(coreCreateElement);
const edit_element = withUpdatedAt(coreEditElement);
const delete_element = withUpdatedAt(coreDeleteElement);
const duplicate_element = withUpdatedAt(coreDuplicateElement);
const reorder_element = withUpdatedAt(coreReorderElement);
const bring_forward = withUpdatedAt(coreBringForward);
const send_backward = withUpdatedAt(coreSendBackward);
const move_element = withUpdatedAt(coreMoveElement);
const resize_element = withUpdatedAt(coreResizeElement);
const replace_asset = withUpdatedAt(coreReplaceAsset);
const configure_animation = withUpdatedAt(coreConfigureAnimation);
const configure_transition = withUpdatedAt(coreConfigureTransition);

function createState() {
  const result = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Product overview",
    createdAt: CREATED_AT,
  });

  assert.equal(result.success, true);
  return result.state;
}

function createStateWithSlide() {
  const result = create_slide(createState(), { id: "slide_1" });

  assert.equal(result.success, true);
  return result.state;
}

test("creates presentation state with stable initial revisions", () => {
  const result = createPresentation({
    id: PRESENTATION_ID,
    publicId: PUBLIC_ID,
    title: "Product overview",
    createdAt: CREATED_AT,
  });

  assert.deepEqual(result, {
    success: true,
    state: {
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "Product overview",
      revision: 1,
      canvas: { width: 1920, height: 1080 },
      slides: [],
      operationSequence: 0,
      status: "draft",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      lastSavedAt: null,
      lastPublishedAt: null,
      undoStack: [],
      redoStack: [],
    },
  });
});

test("requires UUID and six-character Base62 public identifiers with explicit UTC creation time", () => {
  for (const input of [
    { id: "presentation_1", publicId: PUBLIC_ID, createdAt: CREATED_AT },
    { id: PRESENTATION_ID, publicId: "not-base62!", createdAt: CREATED_AT },
    { id: PRESENTATION_ID, publicId: "Ab3xY", createdAt: CREATED_AT },
    { id: PRESENTATION_ID, publicId: "Ab3xYz0", createdAt: CREATED_AT },
    { id: PRESENTATION_ID, publicId: PUBLIC_ID, createdAt: "2026-09-07" },
  ]) {
    const result = createPresentation({ ...input, title: "Product overview" });
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
  }
});

test("updates content time and records save and publish only after confirmation", () => {
  const renamed = rename_presentation(createState(), {
    title: "Updated overview",
  });
  assert.equal(renamed.success, true);
  assert.equal(renamed.state.updatedAt, UPDATED_AT);
  assert.equal(renamed.state.lastSavedAt, null);
  assert.equal(renamed.state.lastPublishedAt, null);

  const saved = confirmPresentationSaved(renamed.state, {
    revision: renamed.state.revision,
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);
  assert.equal(saved.state.lastSavedAt, "2026-09-07T12:02:00.000Z");
  assert.equal(saved.state.status, "draft");

  const published = confirmPresentationPublished(saved.state, {
    revision: saved.state.revision,
    publishedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(published.success, true);
  assert.equal(published.state.status, "published");
  assert.equal(published.state.lastPublishedAt, "2026-09-07T12:03:00.000Z");
  const serialized = serializePresentationState(published.state);
  assert.equal(serialized.success, true);
  if (!serialized.success) return;
  assert.deepEqual(JSON.parse(serialized.serializedState), published.state);

  const conflict = confirmPresentationSaved(published.state, {
    revision: 1,
    savedAt: "2026-09-07T12:04:00.000Z",
  });
  assert.equal(conflict.success, false);
  assert.equal(conflict.error.code, "CONFLICT");
});

test("rejects content mutations whose updatedAt is not strictly later", () => {
  const state = createStateWithSlide();

  for (const updated_at of [CREATED_AT, UPDATED_AT]) {
    const result = coreRenamePresentation(state, {
      title: "Updated overview",
      updatedAt: updated_at,
    });

    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.deepEqual(result.state, state);
  }
});

test("preserves acknowledgements through undo and redo after a later edit", () => {
  const first_edit = coreRenamePresentation(createState(), {
    title: "First title",
    updatedAt: "2026-09-07T12:01:00.000Z",
  });
  assert.equal(first_edit.success, true);
  const saved = confirmPresentationSaved(first_edit.state, {
    revision: first_edit.state.revision,
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);
  const published = confirmPresentationPublished(saved.state, {
    revision: saved.state.revision,
    publishedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(published.success, true);
  const second_edit = coreRenamePresentation(published.state, {
    title: "Second title",
    updatedAt: "2026-09-07T12:04:00.000Z",
  });
  assert.equal(second_edit.success, true);

  const undone = undo(second_edit.state);
  assert.equal(undone.success, true);
  assert.equal(undone.state.title, "First title");
  assert.equal(undone.state.status, "published");
  assert.equal(undone.state.lastSavedAt, "2026-09-07T12:02:00.000Z");
  assert.equal(undone.state.lastPublishedAt, "2026-09-07T12:03:00.000Z");

  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.equal(redone.state.title, "Second title");
  assert.equal(redone.state.status, "published");
  assert.equal(redone.state.lastSavedAt, "2026-09-07T12:02:00.000Z");
  assert.equal(redone.state.lastPublishedAt, "2026-09-07T12:03:00.000Z");
});

test("creates an immutable JSON-safe deletion intent without deleting Core state", () => {
  const state = createStateWithSlide();
  const result = createPresentationDeletionIntent(state);

  assert.deepEqual(result, {
    success: true,
    intent: { presentationId: PRESENTATION_ID, revision: 2 },
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.intent), true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.intent)), result.intent);
  assert.deepEqual(
    state.slides.map((slide) => slide.id),
    ["slide_1"],
  );
  assert.equal(state.undoStack.length, 1);
  assert.equal(state.operationSequence, 1);
});

test("rejects malformed presentation identifiers and revisions for deletion intents", () => {
  const state = createState();
  const malformed_states = [
    { ...state, id: " " },
    { ...state, revision: 0 },
    { ...state, revision: Number.NaN },
    { ...state, revision: 1.5 },
  ];

  for (const malformed_state of malformed_states) {
    const result = createPresentationDeletionIntent(malformed_state);
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.equal("state" in result, false);
  }
});

test("rejects null and non-record state inputs for deletion intents", () => {
  const malformed_states = [null, [], "presentation_1"] as const;

  for (const malformed_state of malformed_states) {
    const result = createPresentationDeletionIntent(malformed_state as never);
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.equal("state" in result, false);
  }
});

test("defines one fixed presentation canvas for every new presentation", () => {
  const state = createState();

  assert.deepEqual(state.canvas, { width: 1920, height: 1080 });
  assert.deepEqual(state.canvas, PRESENTATION_CANVAS);
  assert.equal(Object.isFrozen(state.canvas), true);
});

test("accepts elements at the controlled overflow boundary on every canvas edge", () => {
  const edge_positions = [
    { id: "left", position: { x: -100, y: 100 } },
    { id: "right", position: { x: 1820, y: 100 } },
    { id: "top", position: { x: 100, y: -50 } },
    { id: "bottom", position: { x: 100, y: 1030 } },
  ];

  const result = edge_positions.reduce((state, { id, position }) => {
    const next = create_element(state, {
      slideId: "slide_1",
      element: {
        id,
        type: "text",
        content: id,
        position,
        size: { width: 200, height: 100 },
        rotation: 45,
        opacity: 1,
      },
    });
    assert.equal(next.success, true);
    return next.state;
  }, createStateWithSlide());

  assert.equal(result.slides[0].elements.length, 4);
});

test("rejects elements just beyond the controlled overflow boundary on every canvas edge", () => {
  const edge_positions = [
    { id: "left", position: { x: -100.001, y: 100 } },
    { id: "right", position: { x: 1820.001, y: 100 } },
    { id: "top", position: { x: 100, y: -50.001 } },
    { id: "bottom", position: { x: 100, y: 1030.001 } },
  ];
  const state = createStateWithSlide();

  for (const { id, position } of edge_positions) {
    const result = create_element(state, {
      slideId: "slide_1",
      element: {
        id,
        type: "text",
        content: id,
        position,
        size: { width: 200, height: 100 },
        rotation: 45,
        opacity: 1,
      },
    });
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.deepEqual(result.state, state);
  }
});

test("rejects overflowing element commands without changing state or history", () => {
  const created = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Title",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created.success, true);

  const attempts = [
    create_element(created.state, {
      slideId: "slide_1",
      element: {
        id: "outside",
        type: "text",
        content: "Outside",
        position: { x: 2021, y: 0 },
        size: { width: 200, height: 1 },
        rotation: 0,
        opacity: 1,
      },
    }),
    edit_element(created.state, {
      slideId: "slide_1",
      elementId: "title_1",
      patch: { size: { width: 3841, height: 80 } },
    }),
    move_element(created.state, {
      slideId: "slide_1",
      elementId: "title_1",
      position: { x: 2121, y: 0 },
    }),
    resize_element(created.state, {
      slideId: "slide_1",
      elementId: "title_1",
      size: { width: 400, height: 2161 },
    }),
  ];

  for (const result of attempts) {
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.deepEqual(result.state, created.state);
  }
});

test("creates, reorders, and deletes slides by stable identifiers", () => {
  const first_result = create_slide(createState(), { id: "slide_1" });
  assert.equal(first_result.success, true);

  const second_result = create_slide(first_result.state, {
    id: "slide_2",
    source: "system",
  });
  assert.equal(second_result.success, true);

  const reordered_result = reorder_slide(second_result.state, {
    slideId: "slide_2",
    afterSlideId: null,
  });
  assert.equal(reordered_result.success, true);
  assert.deepEqual(
    reordered_result.state.slides.map((slide) => slide.id),
    ["slide_2", "slide_1"],
  );
  assert.equal(reordered_result.state.revision, 4);
  assert.equal(reordered_result.state.slides[0].revision, 2);
  assert.deepEqual(reordered_result.operation, {
    id: "operation_3",
    sequence: 3,
    type: "reorder-slide",
    source: "user",
    changes: [
      {
        entityType: "presentation",
        entityId: PRESENTATION_ID,
        fromRevision: 3,
        toRevision: 4,
      },
      {
        entityType: "slide",
        entityId: "slide_2",
        fromRevision: 1,
        toRevision: 2,
      },
    ],
  });

  const deleted_result = delete_slide(reordered_result.state, {
    slideId: "slide_1",
  });
  assert.equal(deleted_result.success, true);
  assert.deepEqual(
    deleted_result.state.slides.map((slide) => slide.id),
    ["slide_2"],
  );
});

test("changes only the addressed element revision for edits, moves, and resizes", () => {
  const element_result = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(element_result.success, true);

  const edited_result = edit_element(element_result.state, {
    slideId: "slide_1",
    elementId: "title_1",
    patch: { content: "After" },
  });
  assert.equal(edited_result.success, true);

  const moved_result = move_element(edited_result.state, {
    slideId: "slide_1",
    elementId: "title_1",
    position: { x: 80, y: 120 },
  });
  assert.equal(moved_result.success, true);

  const resized_result = resize_element(moved_result.state, {
    slideId: "slide_1",
    elementId: "title_1",
    size: { width: 600, height: 100 },
  });
  assert.equal(resized_result.success, true);

  const slide = resized_result.state.slides[0];
  const element = slide.elements[0];
  assert.equal(element.type, "text");
  assert.equal(resized_result.state.revision, 2);
  assert.equal(slide.revision, 2);
  assert.equal(element.revision, 4);
  assert.equal(element.content, "After");
  assert.deepEqual(element.position, { x: 80, y: 120 });
  assert.deepEqual(element.size, { width: 600, height: 100 });

  const deleted_result = delete_element(resized_result.state, {
    slideId: "slide_1",
    elementId: "title_1",
  });
  assert.equal(deleted_result.success, true);
  assert.equal(deleted_result.state.slides[0].elements.length, 0);
  assert.equal(deleted_result.state.slides[0].revision, 3);
});

test("rejects invalid commands without changing the input state", () => {
  const state = createStateWithSlide();

  const duplicate_slide = create_slide(state, { id: "slide_1" });
  assert.equal(duplicate_slide.success, false);
  assert.equal(duplicate_slide.error.code, "CONFLICT");
  assert.deepEqual(duplicate_slide.state, state);

  const missing_slide = delete_slide(state, { slideId: "missing" });
  assert.equal(missing_slide.success, false);
  assert.equal(missing_slide.error.code, "SLIDE_NOT_FOUND");
  assert.deepEqual(missing_slide.state, state);

  const missing_element = move_element(state, {
    slideId: "slide_1",
    elementId: "missing",
    position: { x: 10, y: 10 },
  });
  assert.equal(missing_element.success, false);
  assert.equal(missing_element.error.code, "ELEMENT_NOT_FOUND");
  assert.deepEqual(missing_element.state, state);

  const invalid_reorder = reorder_slide(state, {
    slideId: "slide_1",
    afterSlideId: "slide_1",
  });
  assert.equal(invalid_reorder.success, false);
  assert.equal(invalid_reorder.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid_reorder.state, state);
});

test("rejects invalid element mutations without changing the input state", () => {
  const state = createStateWithSlide();
  const invalid_element = create_element(state, {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "",
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
    },
  });

  assert.equal(invalid_element.success, false);
  assert.equal(invalid_element.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid_element.state, state);
});

test("returns frozen snapshots without retaining nested command-input references", () => {
  const position = { x: 0, y: 0 };
  const size = { width: 400, height: 80 };
  const element_result = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position,
      size,
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(element_result.success, true);

  position.x = 300;
  size.width = 900;

  const element = element_result.state.slides[0].elements[0];
  assert.deepEqual(element.position, { x: 0, y: 0 });
  assert.deepEqual(element.size, { width: 400, height: 80 });
  assert.equal(Object.isFrozen(element_result), true);
  assert.equal(Object.isFrozen(element_result.state), true);
  assert.equal(Object.isFrozen(element_result.state.slides), true);
  assert.equal(Object.isFrozen(element_result.state.slides[0]), true);
  assert.equal(Object.isFrozen(element), true);
  assert.equal(Object.isFrozen(element.position), true);
  assert.equal(Object.isFrozen(element_result.operation), true);
  assert.equal(Object.isFrozen(element_result.operation.changes), true);
  assert.equal(Object.isFrozen(element_result.operation.changes[0]), true);
  assert.throws(() => {
    (element.position as { x: number }).x = 300;
  });
});

test("rejects explicitly undefined element patch values", () => {
  const element_result = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(element_result.success, true);

  const result = edit_element(element_result.state, {
    slideId: "slide_1",
    elementId: "title_1",
    patch: { content: undefined },
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.equal(result.state.slides[0].elements[0].type, "text");
  assert.equal(result.state.slides[0].elements[0].content, "Before");
});

test("associates each operation with affected entity revision transitions", () => {
  const created_slide = create_slide(createState(), { id: "slide_1" });
  assert.equal(created_slide.success, true);
  assert.deepEqual(created_slide.operation.changes, [
    {
      entityType: "presentation",
      entityId: PRESENTATION_ID,
      fromRevision: 1,
      toRevision: 2,
    },
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: null,
      toRevision: 1,
    },
  ]);

  const created_element = create_element(created_slide.state, {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);
  assert.deepEqual(created_element.operation.changes, [
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: 1,
      toRevision: 2,
    },
    {
      entityType: "element",
      entityId: "title_1",
      fromRevision: null,
      toRevision: 1,
    },
  ]);

  const moved_element = move_element(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    position: { x: 20, y: 40 },
  });
  assert.equal(moved_element.success, true);
  assert.deepEqual(moved_element.operation.changes, [
    {
      entityType: "element",
      entityId: "title_1",
      fromRevision: 1,
      toRevision: 2,
    },
  ]);

  const deleted_element = delete_element(moved_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
  });
  assert.equal(deleted_element.success, true);
  assert.deepEqual(deleted_element.operation.changes, [
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: 2,
      toRevision: 3,
    },
    {
      entityType: "element",
      entityId: "title_1",
      fromRevision: 2,
      toRevision: null,
    },
  ]);

  const deleted_slide = delete_slide(deleted_element.state, {
    slideId: "slide_1",
  });
  assert.equal(deleted_slide.success, true);
  assert.deepEqual(deleted_slide.operation.changes, [
    {
      entityType: "presentation",
      entityId: PRESENTATION_ID,
      fromRevision: 2,
      toRevision: 3,
    },
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: 3,
      toRevision: null,
    },
  ]);
});

test("undo restores the complete prior logical operation", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const edited_element = edit_element(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    patch: { content: "After" },
  });
  assert.equal(edited_element.success, true);

  const result = undo(edited_element.state);
  assert.equal(result.success, true);
  assert.equal(result.operation.type, "undo");
  assert.equal(result.state.operationSequence, 4);
  assert.equal(result.state.slides[0].elements[0].type, "text");
  assert.equal(result.state.slides[0].elements[0].content, "Before");
  assert.deepEqual(result.operation.changes, [
    {
      entityType: "element",
      entityId: "title_1",
      fromRevision: 2,
      toRevision: 1,
    },
  ]);
});

test("redo restores the undone logical operation", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const moved_element = move_element(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    position: { x: 20, y: 40 },
  });
  assert.equal(moved_element.success, true);

  const undone = undo(moved_element.state);
  assert.equal(undone.success, true);
  assert.deepEqual(undone.state.canvas, PRESENTATION_CANVAS);

  const result = redo(undone.state);
  assert.equal(result.success, true);
  assert.equal(result.operation.type, "redo");
  assert.equal(result.state.operationSequence, 5);
  assert.deepEqual(result.state.slides[0].elements[0].position, {
    x: 20,
    y: 40,
  });
  assert.deepEqual(result.state.canvas, PRESENTATION_CANVAS);
  assert.deepEqual(result.operation.changes, [
    {
      entityType: "element",
      entityId: "title_1",
      fromRevision: 1,
      toRevision: 2,
    },
  ]);
});

test("invalidates redo after a new successful mutation", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const moved_element = move_element(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    position: { x: 20, y: 40 },
  });
  assert.equal(moved_element.success, true);

  const undone = undo(moved_element.state);
  assert.equal(undone.success, true);

  const resized_element = resize_element(undone.state, {
    slideId: "slide_1",
    elementId: "title_1",
    size: { width: 600, height: 100 },
  });
  assert.equal(resized_element.success, true);
  assert.equal(resized_element.state.redoStack.length, 0);

  const result = redo(resized_element.state);
  assert.equal(result.success, false);
  assert.equal(result.error.code, "REDO_NOT_AVAILABLE");
  assert.deepEqual(result.state, resized_element.state);
});

test("rejects unavailable history and failed mutations without changing state", () => {
  const initial_state = createState();
  const unavailable_undo = undo(initial_state);
  assert.equal(unavailable_undo.success, false);
  assert.equal(unavailable_undo.error.code, "UNDO_NOT_AVAILABLE");
  assert.deepEqual(unavailable_undo.state, initial_state);

  const unavailable_redo = redo(initial_state);
  assert.equal(unavailable_redo.success, false);
  assert.equal(unavailable_redo.error.code, "REDO_NOT_AVAILABLE");
  assert.deepEqual(unavailable_redo.state, initial_state);

  const created_slide = createStateWithSlide();
  const undone = undo(created_slide);
  assert.equal(undone.success, true);

  const failed_mutation = move_element(undone.state, {
    slideId: "missing",
    elementId: "title_1",
    position: { x: 20, y: 40 },
  });
  assert.equal(failed_mutation.success, false);
  assert.equal(failed_mutation.error.code, "SLIDE_NOT_FOUND");
  assert.deepEqual(failed_mutation.state, undone.state);

  const redone = redo(failed_mutation.state);
  assert.equal(redone.success, true);
  assert.equal(redone.state.slides[0].id, "slide_1");
});

test("exposes all initial animation and transition capabilities from registries", () => {
  assert.deepEqual(
    ANIMATION_CAPABILITIES.map((capability) => capability.id),
    [
      "fade-in",
      "slide-in",
      "scale-in",
      "typewriter",
      "fade-out",
      "slide-out",
      "scale-out",
      "float",
      "pulse",
      "rotate",
    ],
  );
  assert.deepEqual(
    TRANSITION_CAPABILITIES.map((capability) => capability.id),
    ["none", "fade", "slide", "scale"],
  );
});

test("configures animation defaults and replaces the animation in its category", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const configured = configure_animation(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    type: "fade-in",
  });
  assert.equal(configured.success, true);
  assert.deepEqual(configured.state.slides[0].elements[0].animations, [
    { type: "fade-in", duration: 500, delay: 0, easing: "ease-out" },
  ]);
  assert.equal(configured.operation.type, "configure-animation");
  assert.equal(configured.state.slides[0].elements[0].revision, 2);

  const replaced = configure_animation(configured.state, {
    slideId: "slide_1",
    elementId: "title_1",
    type: "slide-in",
    configuration: { duration: 250, delay: 50, easing: "linear" },
  });
  assert.equal(replaced.success, true);
  assert.deepEqual(replaced.state.slides[0].elements[0].animations, [
    { type: "slide-in", duration: 250, delay: 50, easing: "linear" },
  ]);
});

test("rejects typewriter for non-text elements without changing state", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const result = configure_animation(created_element.state, {
    slideId: "slide_1",
    elementId: "image_1",
    type: "typewriter",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "ANIMATION_NOT_SUPPORTED");
  assert.deepEqual(result.state, created_element.state);
});

test("rejects invalid animation types and configurations without changing state", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);

  const invalid_type = configure_animation(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    type: "bounce",
  });
  assert.equal(invalid_type.success, false);
  assert.equal(invalid_type.error.code, "INVALID_ANIMATION_TYPE");
  assert.deepEqual(invalid_type.state, created_element.state);

  const invalid_duration = configure_animation(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    type: "fade-in",
    configuration: { duration: 0 },
  });
  assert.equal(invalid_duration.success, false);
  assert.equal(invalid_duration.error.code, "INVALID_DURATION");
  assert.deepEqual(invalid_duration.state, created_element.state);

  const invalid_configuration = configure_animation(created_element.state, {
    slideId: "slide_1",
    elementId: "title_1",
    type: "fade-in",
    configuration: { repeat: 2 },
  });
  assert.equal(invalid_configuration.success, false);
  assert.equal(invalid_configuration.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid_configuration.state, created_element.state);
});

test("configures and validates slide transitions", () => {
  const configured = configure_transition(createStateWithSlide(), {
    slideId: "slide_1",
    type: "fade",
    configuration: { duration: 300 },
  });
  assert.equal(configured.success, true);
  assert.deepEqual(configured.state.slides[0].transition, {
    type: "fade",
    duration: 300,
  });
  assert.equal(configured.operation.type, "configure-transition");
  assert.equal(configured.state.slides[0].revision, 2);

  const invalid_type = configure_transition(configured.state, {
    slideId: "slide_1",
    type: "wipe",
  });
  assert.equal(invalid_type.success, false);
  assert.equal(invalid_type.error.code, "INVALID_TRANSITION_TYPE");
  assert.deepEqual(invalid_type.state, configured.state);

  const invalid_duration = configure_transition(configured.state, {
    slideId: "slide_1",
    type: "slide",
    configuration: { duration: 0 },
  });
  assert.equal(invalid_duration.success, false);
  assert.equal(invalid_duration.error.code, "INVALID_DURATION");
  assert.deepEqual(invalid_duration.state, configured.state);
});

test("undo and redo restore declarative animation and transition configuration", () => {
  const configured_animation = configure_animation(
    create_element(createStateWithSlide(), {
      slideId: "slide_1",
      element: {
        id: "title_1",
        type: "text",
        content: "Before",
        position: { x: 0, y: 0 },
        size: { width: 400, height: 80 },
        rotation: 0,
        opacity: 1,
      },
    }).state,
    { slideId: "slide_1", elementId: "title_1", type: "pulse" },
  );
  assert.equal(configured_animation.success, true);

  const configured_transition = configure_transition(
    configured_animation.state,
    {
      slideId: "slide_1",
      type: "scale",
    },
  );
  assert.equal(configured_transition.success, true);

  const undone = undo(configured_transition.state);
  assert.equal(undone.success, true);
  assert.deepEqual(undone.state.slides[0].transition, {
    type: "none",
    duration: 0,
  });
  assert.deepEqual(undone.state.slides[0].elements[0].animations, [
    {
      type: "pulse",
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    },
  ]);

  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.deepEqual(redone.state.slides[0].transition, {
    type: "scale",
    duration: 500,
  });
});

test("duplicates slides with caller-provided stable identifiers and fresh revisions", () => {
  const created_element = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 10, y: 20 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created_element.success, true);
  const element_ids: Record<string, string> = {};
  const source_element_id = "image_1";
  element_ids[source_element_id] = "image_2";

  const result = duplicate_slide(created_element.state, {
    slideId: "slide_1",
    id: "slide_2",
    elementIds: element_ids,
  });
  assert.equal(result.success, true);
  assert.deepEqual(
    result.state.slides.map((slide) => slide.id),
    ["slide_1", "slide_2"],
  );
  assert.equal(result.state.slides[1].revision, 1);
  assert.equal(result.state.slides[1].elements[0].id, "image_2");
  assert.equal(result.state.slides[1].elements[0].revision, 1);
  assert.equal(result.operation.type, "duplicate-slide");
  assert.deepEqual(result.operation.changes, [
    {
      entityType: "presentation",
      entityId: PRESENTATION_ID,
      fromRevision: 2,
      toRevision: 3,
    },
    {
      entityType: "slide",
      entityId: "slide_2",
      fromRevision: null,
      toRevision: 1,
    },
    {
      entityType: "element",
      entityId: "image_2",
      fromRevision: null,
      toRevision: 1,
    },
  ]);

  const invalid = duplicate_slide(created_element.state, {
    slideId: "slide_1",
    id: "slide_2",
    elementIds: {},
  });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid.state, created_element.state);
});

test("duplicates and reorders elements by stable identifiers with undo and redo", () => {
  const first = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Title",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(first.success, true);
  const second = create_element(first.state, {
    slideId: "slide_1",
    element: {
      id: "title_2",
      type: "text",
      content: "Subtitle",
      position: { x: 0, y: 100 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(second.success, true);
  const duplicated = duplicate_element(second.state, {
    slideId: "slide_1",
    elementId: "title_1",
    id: "title_3",
  });
  assert.equal(duplicated.success, true);
  assert.equal(duplicated.operation.type, "duplicate-element");
  assert.equal(duplicated.state.slides[0].elements[2].revision, 1);

  const reordered = reorder_element(duplicated.state, {
    slideId: "slide_1",
    elementId: "title_3",
    afterElementId: null,
  });
  assert.equal(reordered.success, true);
  assert.deepEqual(
    reordered.state.slides[0].elements.map((element) => element.id),
    ["title_3", "title_1", "title_2"],
  );
  assert.equal(reordered.operation.type, "reorder-element");
  assert.deepEqual(reordered.operation.changes, [
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: 4,
      toRevision: 5,
    },
    {
      entityType: "element",
      entityId: "title_3",
      fromRevision: 1,
      toRevision: 2,
    },
  ]);

  const undone = undo(reordered.state);
  assert.equal(undone.success, true);
  assert.deepEqual(
    undone.state.slides[0].elements.map((element) => element.id),
    ["title_1", "title_2", "title_3"],
  );
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.deepEqual(
    redone.state.slides[0].elements.map((element) => element.id),
    ["title_3", "title_1", "title_2"],
  );
});

test("replaces image assets as a distinct domain intent and rejects non-images", () => {
  const image = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(image.success, true);
  const replaced = replace_asset(image.state, {
    slideId: "slide_1",
    elementId: "image_1",
    assetId: "asset_2",
  });
  assert.equal(replaced.success, true);
  assert.equal(replaced.operation.type, "replace-asset");
  assert.equal(replaced.state.slides[0].elements[0].type, "image");
  assert.equal(replaced.state.slides[0].elements[0].assetId, "asset_2");

  const undone = undo(replaced.state);
  assert.equal(undone.success, true);
  assert.equal(undone.state.slides[0].elements[0].type, "image");
  assert.equal(undone.state.slides[0].elements[0].assetId, "asset_1");
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.equal(redone.state.slides[0].elements[0].type, "image");
  assert.equal(redone.state.slides[0].elements[0].assetId, "asset_2");

  const text = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "title_1",
      type: "text",
      content: "Title",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(text.success, true);
  const invalid = replace_asset(text.state, {
    slideId: "slide_1",
    elementId: "title_1",
    assetId: "asset_2",
  });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid.state, text.state);
});

test("serializes complete state including logical operation history", () => {
  const moved = move_element(
    create_element(createStateWithSlide(), {
      slideId: "slide_1",
      element: {
        id: "title_1",
        type: "text",
        content: "Title",
        position: { x: 0, y: 0 },
        size: { width: 400, height: 80 },
        rotation: 0,
        opacity: 1,
      },
    }).state,
    { slideId: "slide_1", elementId: "title_1", position: { x: 20, y: 40 } },
  );
  assert.equal(moved.success, true);
  const serialized = serializePresentationState(moved.state);
  assert.equal(serialized.success, true);
  const deserialized = deserializePresentationState(serialized.serializedState);
  assert.equal(deserialized.success, true);
  assert.deepEqual(deserialized.state, moved.state);
  assert.equal(Object.isFrozen(deserialized.state), true);

  const undone = undo(deserialized.state);
  assert.equal(undone.success, true);
  assert.deepEqual(undone.state.slides[0].elements[0].position, { x: 0, y: 0 });
});

test("marks a structurally valid import without a receipt as unverified", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  if (!serialized.success) return;

  const restored = deserializePresentationState(serialized.serializedState);

  assert.equal(restored.success, true);
  if (!restored.success) return;
  assert.equal(restored.integrityStatus, "unverified");
});

test("restores a snapshot when its external receipt verifies the exact payload", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  if (!serialized.success) return;
  const receipt = Object.freeze({
    serializedState: serialized.serializedState,
  });

  const restored = deserializePresentationState(serialized.serializedState, {
    integrityReceipt: receipt,
    verifyIntegrityReceipt: verifySnapshotReceipt,
  });

  assert.equal(restored.success, true);
  if (!restored.success) return;
  assert.equal(restored.integrityStatus, "receipt-verified");
});

test("rejects a coordinated lifecycle acknowledgement rewrite against an external receipt", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  if (!serialized.success) return;
  const receipt = Object.freeze({
    serializedState: serialized.serializedState,
  });
  const payload = JSON.parse(serialized.serializedState);
  const published_at = "2026-09-07T12:05:00.000Z";

  payload.status = "published";
  payload.lastPublishedAt = published_at;
  for (const entry of payload.undoStack) {
    entry.before.status = "published";
    entry.before.lastPublishedAt = published_at;
    entry.after.status = "published";
    entry.after.lastPublishedAt = published_at;
  }

  const restored = deserializePresentationState(JSON.stringify(payload), {
    integrityReceipt: receipt,
    verifyIntegrityReceipt: verifySnapshotReceipt,
  });

  assert.equal(restored.success, false);
  assert.equal(restored.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects a coordinated operation-sequence renumbering against an external receipt", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  if (!serialized.success) return;
  const receipt = Object.freeze({
    serializedState: serialized.serializedState,
  });
  const payload = JSON.parse(serialized.serializedState);
  const sequence_offset = 100;

  payload.operationSequence += sequence_offset;
  for (const entry of payload.undoStack) {
    entry.before.operationSequence += sequence_offset;
    entry.after.operationSequence += sequence_offset;
    entry.operation.sequence += sequence_offset;
    entry.operation.id = `operation_${entry.operation.sequence}`;
  }

  const restored = deserializePresentationState(JSON.stringify(payload), {
    integrityReceipt: receipt,
    verifyIntegrityReceipt: verifySnapshotReceipt,
  });

  assert.equal(restored.success, false);
  assert.equal(restored.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects malformed and invalid serialized state payloads", () => {
  const malformed = deserializePresentationState("{");
  assert.equal(malformed.success, false);
  assert.equal(malformed.error.code, "INVALID_SERIALIZED_STATE");

  const invalid = deserializePresentationState(
    JSON.stringify({
      id: "presentation_1",
      title: "Product overview",
      revision: 1,
      canvas: { width: 1920, height: 1080 },
      slides: [],
      operationSequence: 0,
      undoStack: [],
      redoStack: [],
      unexpected: true,
    }),
  );
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized state with a canvas other than the fixed contract", () => {
  const serialized = serializePresentationState(createState());
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.canvas.width = 1280;

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized state with undo history incoherent with the root state", () => {
  const created_slide = createStateWithSlide();
  const serialized = serializePresentationState(created_slide);
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.undoStack[0].after.id = "tampered_presentation";

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized state with redo history incoherent with the root state", () => {
  const created_slide = createStateWithSlide();
  const undone = undo(created_slide);
  assert.equal(undone.success, true);
  const serialized = serializePresentationState(undone.state);
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.redoStack[0].before.id = "tampered_presentation";

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized animations unsupported by their element type", () => {
  const created = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created.success, true);
  const serialized = serializePresentationState(created.state);
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  const animation = {
    type: "typewriter",
    duration: 500,
    delay: 0,
    easing: "ease-out",
  };
  payload.slides[0].elements[0].animations = [animation];
  payload.undoStack[1].after.slides[0].elements[0].animations = [animation];

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized history with revision metadata inconsistent with snapshots", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.undoStack[0].operation.changes[0].toRevision = 99;

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects serialized history with an operation type incompatible with snapshots", () => {
  const serialized = serializePresentationState(createStateWithSlide());
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.undoStack[0].operation.type = "rename-presentation";

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("rejects lifecycle and operation-sequence tampering in undo snapshots", () => {
  const first_edit = coreRenamePresentation(createState(), {
    title: "First title",
    updatedAt: "2026-09-07T12:01:00.000Z",
  });
  assert.equal(first_edit.success, true);
  const saved = confirmPresentationSaved(first_edit.state, {
    revision: first_edit.state.revision,
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);
  const published = confirmPresentationPublished(saved.state, {
    revision: saved.state.revision,
    publishedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(published.success, true);
  const state = coreRenamePresentation(published.state, {
    title: "Second title",
    updatedAt: "2026-09-07T12:04:00.000Z",
  });
  assert.equal(state.success, true);
  const serialized = serializePresentationState(state.state);
  assert.equal(serialized.success, true);

  const mutations = [
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].after.status = "draft";
    },
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].after.lastSavedAt =
        "2026-09-07T12:05:00.000Z";
    },
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].after.lastPublishedAt =
        "2026-09-07T12:05:00.000Z";
    },
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].after.createdAt =
        "2026-09-07T11:59:00.000Z";
    },
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].after.updatedAt =
        "2026-09-07T12:01:00.000Z";
    },
    (payload: SerializedHistoryPayload) => {
      payload.undoStack[payload.undoStack.length - 1].before.operationSequence =
        2;
      payload.undoStack[payload.undoStack.length - 1].after.operationSequence =
        3;
      payload.undoStack[payload.undoStack.length - 1].operation.sequence = 3;
    },
  ];

  for (const mutate of mutations) {
    const payload = JSON.parse(serialized.serializedState);
    mutate(payload);
    const result = deserializePresentationState(JSON.stringify(payload));
    assert.equal(result.success, false);
    assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
  }
});

test("rejects lifecycle tampering in redo snapshots", () => {
  const first_edit = coreRenamePresentation(createState(), {
    title: "First title",
    updatedAt: "2026-09-07T12:01:00.000Z",
  });
  assert.equal(first_edit.success, true);
  const saved = confirmPresentationSaved(first_edit.state, {
    revision: first_edit.state.revision,
    savedAt: "2026-09-07T12:02:00.000Z",
  });
  assert.equal(saved.success, true);
  const published = confirmPresentationPublished(saved.state, {
    revision: saved.state.revision,
    publishedAt: "2026-09-07T12:03:00.000Z",
  });
  assert.equal(published.success, true);
  const state = coreRenamePresentation(published.state, {
    title: "Second title",
    updatedAt: "2026-09-07T12:04:00.000Z",
  });
  assert.equal(state.success, true);
  const undone = undo(state.state);
  assert.equal(undone.success, true);
  const serialized = serializePresentationState(undone.state);
  assert.equal(serialized.success, true);
  const payload = JSON.parse(serialized.serializedState);
  payload.redoStack[payload.redoStack.length - 1].after.lastPublishedAt =
    "2026-09-07T12:05:00.000Z";

  const result = deserializePresentationState(JSON.stringify(payload));

  assert.equal(result.success, false);
  assert.equal(result.error.code, "INVALID_SERIALIZED_STATE");
});

test("renames presentations through a revisioned command with undo, redo, and serialization", () => {
  const renamed = rename_presentation(createState(), {
    title: "Updated overview",
    source: "system",
  });
  assert.equal(renamed.success, true);
  assert.equal(renamed.state.title, "Updated overview");
  assert.equal(renamed.state.revision, 2);
  assert.deepEqual(renamed.operation, {
    id: "operation_1",
    sequence: 1,
    type: "rename-presentation",
    source: "system",
    changes: [
      {
        entityType: "presentation",
        entityId: PRESENTATION_ID,
        fromRevision: 1,
        toRevision: 2,
      },
    ],
  });

  const serialized = serializePresentationState(renamed.state);
  assert.equal(serialized.success, true);
  const deserialized = deserializePresentationState(serialized.serializedState);
  assert.equal(deserialized.success, true);
  const undone = undo(deserialized.state);
  assert.equal(undone.success, true);
  assert.equal(undone.state.title, "Product overview");
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.equal(redone.state.title, "Updated overview");
});

test("rejects invalid presentation renames without changing state", () => {
  const state = createState();
  const result = rename_presentation(state, { title: " " });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.deepEqual(result.state, state);
});

test("configures and restores validated slide backgrounds", () => {
  const initial = createStateWithSlide();
  assert.deepEqual(initial.slides[0].background, {
    type: "solid",
    color: "#FFFFFF",
  });
  const configured = edit_slide(initial, {
    slideId: "slide_1",
    patch: {
      background: { type: "gradient", gradient: "linear-gradient(red, blue)" },
    },
  });
  assert.equal(configured.success, true);
  assert.equal(configured.operation.type, "edit-slide");
  assert.equal(configured.state.slides[0].revision, 2);
  assert.deepEqual(configured.state.slides[0].background, {
    type: "gradient",
    gradient: "linear-gradient(red, blue)",
  });

  const undone = undo(configured.state);
  assert.equal(undone.success, true);
  assert.deepEqual(
    undone.state.slides[0].background,
    initial.slides[0].background,
  );
  const serialized = serializePresentationState(configured.state);
  assert.equal(serialized.success, true);
  const restored = deserializePresentationState(serialized.serializedState);
  assert.equal(restored.success, true);
  assert.deepEqual(restored.state, configured.state);
});

test("rejects missing slides and invalid backgrounds without changing state", () => {
  const state = createStateWithSlide();
  const missing = edit_slide(state, {
    slideId: "missing",
    patch: { background: { type: "solid", color: "#000000" } },
  });
  assert.equal(missing.success, false);
  assert.equal(missing.error.code, "SLIDE_NOT_FOUND");
  assert.deepEqual(missing.state, state);

  const invalid = edit_slide(state, {
    slideId: "slide_1",
    patch: { background: { type: "gradient", gradient: "" } },
  });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.code, "VALIDATION_ERROR");
  assert.deepEqual(invalid.state, state);
});

test("configures documented text, image, and shape visual styles", () => {
  const text = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "text_1",
      type: "text",
      content: "Title",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(text.success, true);
  assert.deepEqual(text.state.slides[0].elements[0].style, {
    role: "Paragraph",
    font: "Arial",
    fontSize: 16,
    fontWeight: 400,
    color: "#000000",
    alignment: "left",
  });
  const styled_text = edit_element(text.state, {
    slideId: "slide_1",
    elementId: "text_1",
    patch: {
      style: {
        role: "H1",
        font: "Inter",
        fontSize: 64,
        fontWeight: 700,
        color: "#FF0000",
        gradient: "linear-gradient(red, blue)",
        alignment: "center",
      },
    },
  });
  assert.equal(styled_text.success, true);
  assert.equal(styled_text.state.slides[0].elements[0].revision, 2);

  const image = create_element(styled_text.state, {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 100 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
      style: { objectFit: "contain", borderRadius: 24 },
    },
  });
  assert.equal(image.success, true);
  const shape = create_element(image.state, {
    slideId: "slide_1",
    element: {
      id: "shape_1",
      type: "shape",
      shapeType: "rectangle",
      position: { x: 400, y: 100 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
      style: { fill: "#FFFFFF", border: "#000000", borderWidth: 2, radius: 12 },
    },
  });
  assert.equal(shape.success, true);
  assert.deepEqual(
    shape.state.slides[0].elements.map((element) => element.style),
    [
      {
        role: "H1",
        font: "Inter",
        fontSize: 64,
        fontWeight: 700,
        color: "#FF0000",
        gradient: "linear-gradient(red, blue)",
        alignment: "center",
      },
      { objectFit: "contain", borderRadius: 24 },
      { fill: "#FFFFFF", border: "#000000", borderWidth: 2, radius: 12 },
    ],
  );

  const serialized = serializePresentationState(shape.state);
  assert.equal(serialized.success, true);
  const restored = deserializePresentationState(serialized.serializedState);
  assert.equal(restored.success, true);
  assert.deepEqual(restored.state, shape.state);
});

test("rejects invalid visual-style patches without changing state", () => {
  const created = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "image_1",
      type: "image",
      assetId: "asset_1",
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created.success, true);
  const result = edit_element(created.state, {
    slideId: "slide_1",
    elementId: "image_1",
    patch: { style: { borderRadius: -1 } },
  });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.deepEqual(result.state, created.state);
});

test("moves elements exactly one layer and restores layer commands through history", () => {
  let state = createStateWithSlide();
  for (const id of ["back", "middle", "front"]) {
    const created = create_element(state, {
      slideId: "slide_1",
      element: {
        id,
        type: "text",
        content: id,
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        rotation: 0,
        opacity: 1,
      },
    });
    assert.equal(created.success, true);
    state = created.state;
  }
  const forward = bring_forward(state, {
    slideId: "slide_1",
    elementId: "back",
  });
  assert.equal(forward.success, true);
  assert.deepEqual(
    forward.state.slides[0].elements.map((element) => element.id),
    ["middle", "back", "front"],
  );
  assert.deepEqual(forward.operation.changes, [
    {
      entityType: "slide",
      entityId: "slide_1",
      fromRevision: 4,
      toRevision: 5,
    },
    { entityType: "element", entityId: "back", fromRevision: 1, toRevision: 2 },
  ]);

  const backward = send_backward(forward.state, {
    slideId: "slide_1",
    elementId: "front",
  });
  assert.equal(backward.success, true);
  assert.deepEqual(
    backward.state.slides[0].elements.map((element) => element.id),
    ["middle", "front", "back"],
  );
  const undone = undo(backward.state);
  assert.equal(undone.success, true);
  assert.deepEqual(
    undone.state.slides[0].elements.map((element) => element.id),
    ["middle", "back", "front"],
  );
  const redone = redo(undone.state);
  assert.equal(redone.success, true);
  assert.deepEqual(
    redone.state.slides[0].elements.map((element) => element.id),
    ["middle", "front", "back"],
  );

  const serialized = serializePresentationState(redone.state);
  assert.equal(serialized.success, true);
  const restored = deserializePresentationState(serialized.serializedState);
  assert.equal(restored.success, true);
  assert.deepEqual(restored.state, redone.state);
});

test("keeps state and history unchanged at layer boundaries and for missing elements", () => {
  const created = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "only",
      type: "text",
      content: "Only",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created.success, true);
  for (const result of [
    bring_forward(created.state, { slideId: "slide_1", elementId: "only" }),
    send_backward(created.state, { slideId: "slide_1", elementId: "only" }),
  ]) {
    assert.equal(result.success, false);
    assert.equal(result.error.code, "LAYER_BOUNDARY");
    assert.deepEqual(result.state, created.state);
  }
  const missing = bring_forward(created.state, {
    slideId: "slide_1",
    elementId: "missing",
  });
  assert.equal(missing.success, false);
  assert.equal(missing.error.code, "ELEMENT_NOT_FOUND");
  assert.deepEqual(missing.state, created.state);
});

test("rejects serialized visual state that violates background or style contracts", () => {
  const created = create_element(createStateWithSlide(), {
    slideId: "slide_1",
    element: {
      id: "text_1",
      type: "text",
      content: "Title",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(created.success, true);
  const serialized = serializePresentationState(created.state);
  assert.equal(serialized.success, true);

  const invalid_background = JSON.parse(serialized.serializedState);
  invalid_background.slides[0].background = { type: "solid", color: "" };
  const background_result = deserializePresentationState(
    JSON.stringify(invalid_background),
  );
  assert.equal(background_result.success, false);
  assert.equal(background_result.error.code, "INVALID_SERIALIZED_STATE");

  const invalid_style = JSON.parse(serialized.serializedState);
  invalid_style.slides[0].elements[0].style.fontSize = 0;
  const style_result = deserializePresentationState(
    JSON.stringify(invalid_style),
  );
  assert.equal(style_result.success, false);
  assert.equal(style_result.error.code, "INVALID_SERIALIZED_STATE");
});
