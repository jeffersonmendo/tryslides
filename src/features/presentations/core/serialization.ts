import { getAnimationCapability } from "./capabilities/animation";
import { getTransitionCapability } from "./capabilities/transition";
import { snapshotState } from "./state";
import type {
  DeserializePresentationStateOptions,
  DeserializePresentationStateResult,
  EntityRevisionTransition,
  OperationHistoryEntry,
  PresentationDocumentState,
  PresentationElement,
  PresentationOperation,
  PresentationState,
  SerializePresentationStateResult,
  Slide,
} from "./types";
import {
  isElementWithinCanvas,
  isValidIdentifier,
  isValidPosition,
  isValidPresentationCanvas,
  isValidPresentationId,
  isValidPublicId,
  isValidSize,
  isValidSlideBackground,
  isValidTimestamp,
  isValidTitle,
} from "./validation";

const OPERATION_TYPES = new Set([
  "create-slide",
  "edit-slide",
  "rename-presentation",
  "delete-slide",
  "duplicate-slide",
  "reorder-slide",
  "create-element",
  "create-elements",
  "edit-element",
  "edit-elements",
  "delete-element",
  "duplicate-element",
  "reorder-element",
  "bring-forward",
  "send-backward",
  "bring-to-front",
  "send-to-back",
  "move-element",
  "resize-element",
  "replace-asset",
  "configure-animation",
  "configure-transition",
  "undo",
  "redo",
]);

/**
 * Produces a JSON-safe Core snapshot only when the document and its logical
 * history are internally coherent. It does not persist the presentation.
 */
export function serializePresentationState(
  state: PresentationState,
): SerializePresentationStateResult {
  try {
    if (!isValidPresentationState(state)) return serializationFailure();
    return Object.freeze({
      success: true,
      serializedState: JSON.stringify(state),
    });
  } catch {
    return serializationFailure();
  }
}

/**
 * Validates an untrusted JSON snapshot before restoring it as immutable Core
 * state, including the fixed canvas and coherent undo/redo history.
 */
export function deserializePresentationState<Receipt>(
  serialized_state: string,
  options?: DeserializePresentationStateOptions<Receipt>,
): DeserializePresentationStateResult {
  try {
    const parsed_state: unknown = JSON.parse(serialized_state);
    if (!isValidPresentationState(parsed_state)) return serializationFailure();
    const integrity_status =
      options === undefined
        ? "unverified"
        : options.verifyIntegrityReceipt({
              serializedState: serialized_state,
              integrityReceipt: options.integrityReceipt,
            })
          ? "receipt-verified"
          : undefined;
    if (integrity_status === undefined) return serializationFailure();
    return Object.freeze({
      success: true,
      state: snapshotState(parsed_state),
      integrityStatus: integrity_status,
    });
  } catch {
    return serializationFailure();
  }
}

/**
 * Checks an explicitly associated persistence operation against a valid Core
 * snapshot. It never chooses that operation from the snapshot history.
 */
export function isPresentationOperationCompatibleWithState(
  state: PresentationState,
  operation: unknown,
): boolean {
  if (operation === null)
    return (
      state.revision === 1 &&
      state.operationSequence === 0 &&
      state.undoStack.length === 0 &&
      state.redoStack.length === 0
    );
  if (
    !isValidOperation(operation) ||
    operation.sequence !== state.operationSequence
  )
    return false;
  if (operation.type === "undo")
    return state.redoStack.some(
      (entry) =>
        hasSameDocumentContent(state, entry.before) &&
        hasSameOperationChanges(operation, {
          ...entry.operation,
          changes: entry.operation.changes.map(reverseRevisionTransition),
        }),
    );
  if (operation.type === "redo")
    return state.undoStack.some(
      (entry) =>
        hasSameDocumentContent(state, entry.after) &&
        hasSameOperationChanges(operation, entry.operation),
    );
  return state.undoStack.some(
    (entry) =>
      hasSameDocumentContent(state, entry.after) &&
      JSON.stringify(operation) === JSON.stringify(entry.operation),
  );
}

function isValidPresentationState(value: unknown): value is PresentationState {
  if (
    !isRecordWithKeys(value, [
      "id",
      "publicId",
      "title",
      "revision",
      "canvas",
      "slides",
      "operationSequence",
      "undoStack",
      "redoStack",
      "status",
      "createdAt",
      "updatedAt",
      "lastSavedAt",
      "lastPublishedAt",
    ])
  )
    return false;
  const undo_stack = value.undoStack;
  const redo_stack = value.redoStack;
  if (
    !hasValidDocumentValues(value) ||
    !isValidHistoryStack(undo_stack) ||
    !isValidHistoryStack(redo_stack)
  )
    return false;
  return hasCoherentHistory({
    ...value,
    undoStack: undo_stack,
    redoStack: redo_stack,
  });
}

function hasCoherentHistory(state: PresentationState): boolean {
  let current_document: PresentationDocumentState = state;

  // Adjacent snapshots must form a continuous chain; individually valid
  // entries are not enough to safely resume undo or redo after deserialization.
  for (let index = state.undoStack.length - 1; index >= 0; index -= 1) {
    const entry = state.undoStack[index];
    if (!hasSameDocumentContent(current_document, entry.after)) return false;
    current_document = entry.before;
  }

  current_document = state;
  for (let index = state.redoStack.length - 1; index >= 0; index -= 1) {
    const entry = state.redoStack[index];
    if (!hasSameDocumentContent(current_document, entry.before)) return false;
    current_document = entry.after;
  }

  return (
    hasOrderedOperationSequences(state.undoStack, "ascending") &&
    hasOrderedOperationSequences(state.redoStack, "descending") &&
    [...state.undoStack, ...state.redoStack].every(
      (entry) => entry.after.operationSequence <= state.operationSequence,
    )
  );
}

function hasSameDocumentContent(
  left: PresentationDocumentState,
  right: PresentationDocumentState,
): boolean {
  return (
    left.id === right.id &&
    left.publicId === right.publicId &&
    left.title === right.title &&
    left.revision === right.revision &&
    JSON.stringify(left.canvas) === JSON.stringify(right.canvas) &&
    JSON.stringify(left.slides) === JSON.stringify(right.slides) &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function hasSameOperationChanges(
  operation: PresentationOperation,
  source_operation: PresentationOperation,
): boolean {
  return (
    operation.source === source_operation.source &&
    JSON.stringify(operation.changes) ===
      JSON.stringify(source_operation.changes)
  );
}

function reverseRevisionTransition(
  change: EntityRevisionTransition,
): EntityRevisionTransition {
  return {
    entityType: change.entityType,
    entityId: change.entityId,
    fromRevision: change.toRevision,
    toRevision: change.fromRevision,
  };
}

function isValidHistoryEntry(value: unknown): boolean {
  if (!isRecordWithKeys(value, ["before", "after", "operation"])) return false;
  const before = value.before;
  const after = value.after;
  const operation = value.operation;
  return (
    isValidDocument(before) &&
    isValidDocument(after) &&
    isValidOperation(operation) &&
    before.operationSequence + 1 === after.operationSequence &&
    operation.sequence === after.operationSequence &&
    hasValidContentLifecycleTransition(before, after) &&
    hasCoherentOperationMetadata(before, after, operation) &&
    hasOperationTypeCompatibleWithSnapshots(before, after, operation)
  );
}

function hasValidContentLifecycleTransition(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): boolean {
  return (
    before.id === after.id &&
    before.publicId === after.publicId &&
    before.createdAt === after.createdAt &&
    before.status === after.status &&
    before.lastSavedAt === after.lastSavedAt &&
    before.lastPublishedAt === after.lastPublishedAt &&
    after.updatedAt > before.updatedAt
  );
}

function hasOrderedOperationSequences(
  entries: readonly OperationHistoryEntry[],
  direction: "ascending" | "descending",
): boolean {
  return entries.every((entry, index) => {
    if (index === 0) return true;
    const previous = entries[index - 1];
    return direction === "ascending"
      ? previous.after.operationSequence < entry.after.operationSequence
      : previous.after.operationSequence > entry.after.operationSequence;
  });
}

function hasOperationTypeCompatibleWithSnapshots(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  if (!hasForwardRevisionTransitions(operation.changes)) return false;

  // Snapshots retain outcomes, not command inputs. Accept every command type
  // that could have produced an outcome rather than rejecting indistinguishable
  // histories such as creating versus duplicating an empty default slide.
  switch (operation.type) {
    case "create-slide":
      return isCreatedSlide(before, after, operation, false);
    case "duplicate-slide":
      return isCreatedSlide(before, after, operation, true);
    case "delete-slide":
      return isDeletedSlide(before, after, operation);
    case "reorder-slide":
      return isReorderedSlide(before, after, operation);
    case "rename-presentation":
      return isRenamedPresentation(before, after, operation);
    case "edit-slide":
      return isUpdatedSlide(before, after, operation, "background");
    case "configure-transition":
      return isUpdatedSlide(before, after, operation, "transition");
    case "create-element":
      return isCreatedElement(before, after, operation, false);
    case "create-elements":
      return isCreatedElements(before, after, operation);
    case "duplicate-element":
      return isCreatedElement(before, after, operation, true);
    case "delete-element":
      return isDeletedElement(before, after, operation);
    case "reorder-element":
      return isReorderedElement(before, after, operation);
    case "bring-forward":
      return isLayerMove(before, after, operation, 1);
    case "send-backward":
      return isLayerMove(before, after, operation, -1);
    case "bring-to-front":
      return isLayerMoveToExtreme(before, after, operation, "front");
    case "send-to-back":
      return isLayerMoveToExtreme(before, after, operation, "back");
    case "edit-element":
      return isUpdatedElement(before, after, operation, "other");
    case "edit-elements":
      return isUpdatedElements(before, after, operation);
    case "move-element":
      return isUpdatedElement(before, after, operation, "position");
    case "resize-element":
      return isUpdatedElement(before, after, operation, "size");
    case "replace-asset":
      return isUpdatedElement(before, after, operation, "asset");
    case "configure-animation":
      return isUpdatedElement(before, after, operation, "animations");
    case "undo":
    case "redo":
      return false;
  }
}

function isCreatedElements(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const before_ids = new Set(
    before.slides.flatMap((slide) =>
      slide.elements.map((element) => element.id),
    ),
  );
  const added = after.slides.flatMap((slide) =>
    slide.elements.filter((element) => !before_ids.has(element.id)),
  );
  const changed_slide = getSingleChangedSlide(before, after, operation);
  return (
    added.length > 0 &&
    changed_slide !== undefined &&
    hasChanges(operation, ["slide", ...added.map(() => "element" as const)]) &&
    hasSameDocumentExceptSlides(before, after) &&
    hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      changed_slide.after.id,
    ) &&
    hasSameSlideNonElementValues(changed_slide.before, changed_slide.after) &&
    added.every(
      (element) =>
        getElementSlideId(after, element.id) === changed_slide.after.id,
    ) &&
    changed_slide.after.elements.length ===
      changed_slide.before.elements.length + added.length &&
    changed_slide.before.elements.every(
      (element, index) =>
        JSON.stringify(element) ===
        JSON.stringify(changed_slide.after.elements[index]),
    )
  );
}

function hasForwardRevisionTransitions(
  changes: readonly EntityRevisionTransition[],
): boolean {
  return changes.every(
    (change) =>
      (change.fromRevision === null && change.toRevision === 1) ||
      (change.fromRevision !== null &&
        change.toRevision !== null &&
        change.toRevision === change.fromRevision + 1) ||
      (change.fromRevision !== null && change.toRevision === null),
  );
}

function isRenamedPresentation(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  return (
    hasChanges(operation, ["presentation"]) &&
    hasSameCanvas(before, after) &&
    hasSameSlides(before.slides, after.slides)
  );
}

function isCreatedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  is_duplicate: boolean,
): boolean {
  const added_slide = getSingleAddedSlide(before, after);
  if (
    added_slide === undefined ||
    !hasChanges(operation, [
      "presentation",
      "slide",
      ...added_slide.elements.map(() => "element" as const),
    ]) ||
    !hasSameDocumentExceptSlides(before, after)
  )
    return false;
  if (!is_duplicate)
    return (
      added_slide.elements.length === 0 &&
      hasDefaultSlideValues(added_slide) &&
      hasAddedAtEnd(before.slides, after.slides, added_slide.id)
    );
  return hasAddedAdjacentDuplicate(before.slides, after.slides, added_slide);
}

function isDeletedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const deleted_slide = getSingleDeletedSlide(before, after);
  return (
    deleted_slide !== undefined &&
    hasChanges(operation, [
      "presentation",
      "slide",
      ...deleted_slide.elements.map(() => "element" as const),
    ]) &&
    hasSameDocumentExceptSlides(before, after) &&
    hasRemovedItem(before.slides, after.slides, deleted_slide.id)
  );
}

function isReorderedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const changed_slide = getSingleChangedSlide(before, after, operation);
  return (
    changed_slide !== undefined &&
    hasChanges(operation, ["presentation", "slide"]) &&
    hasSameDocumentExceptSlides(before, after) &&
    hasSameSlideValuesExceptRevision(
      changed_slide.before,
      changed_slide.after,
    ) &&
    hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      changed_slide.after.id,
    )
  );
}

function isUpdatedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  update: "background" | "transition",
): boolean {
  const changed_slide = getSingleChangedSlide(before, after, operation);
  if (
    changed_slide === undefined ||
    !hasChanges(operation, ["slide"]) ||
    !hasSameDocumentExceptSlides(before, after) ||
    !hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      changed_slide.after.id,
    ) ||
    !hasSameElements(
      changed_slide.before.elements,
      changed_slide.after.elements,
    )
  )
    return false;
  return update === "background"
    ? hasSameTransition(changed_slide.before, changed_slide.after)
    : hasSameBackground(changed_slide.before, changed_slide.after);
}

function isCreatedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  is_duplicate: boolean,
): boolean {
  const added_element = getSingleAddedElement(before, after);
  const changed_slide = getSingleChangedSlide(before, after, operation);
  if (
    added_element === undefined ||
    changed_slide === undefined ||
    !hasChanges(operation, ["slide", "element"]) ||
    !hasSameDocumentExceptSlides(before, after) ||
    !hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      changed_slide.after.id,
    ) ||
    !hasSameSlideNonElementValues(changed_slide.before, changed_slide.after) ||
    getElementSlideId(after, added_element.id) !== changed_slide.after.id ||
    !hasAddedAtEnd(
      changed_slide.before.elements,
      changed_slide.after.elements,
      added_element.id,
    )
  )
    return false;
  return (
    !is_duplicate ||
    changed_slide.before.elements.some((element) =>
      hasDuplicatedElementContent(element, added_element),
    )
  );
}

function isDeletedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const deleted_element = getSingleDeletedElement(before, after);
  const changed_slide = getSingleChangedSlide(before, after, operation);
  return (
    deleted_element !== undefined &&
    changed_slide !== undefined &&
    hasChanges(operation, ["slide", "element"]) &&
    hasSameDocumentExceptSlides(before, after) &&
    hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      changed_slide.after.id,
    ) &&
    hasSameSlideNonElementValues(changed_slide.before, changed_slide.after) &&
    getElementSlideId(before, deleted_element.id) === changed_slide.before.id &&
    hasRemovedItem(
      changed_slide.before.elements,
      changed_slide.after.elements,
      deleted_element.id,
    )
  );
}

function isReorderedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  return isElementReordering(before, after, operation, () => true);
}

function isLayerMove(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  direction: -1 | 1,
): boolean {
  return isElementReordering(
    before,
    after,
    operation,
    (before_index, after_index) => after_index === before_index + direction,
  );
}

function isLayerMoveToExtreme(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  target_layer: "back" | "front",
): boolean {
  return isElementReordering(
    before,
    after,
    operation,
    (before_index, after_index, element_count) =>
      before_index !== after_index &&
      after_index === (target_layer === "back" ? 0 : element_count - 1),
  );
}

function isElementReordering(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  is_valid_move: (
    before_index: number,
    after_index: number,
    element_count: number,
  ) => boolean,
): boolean {
  const changed_element = getSingleChangedElement(before, after, operation);
  const changed_slide = getSingleChangedSlide(before, after, operation);
  if (
    changed_element === undefined ||
    changed_slide === undefined ||
    !hasChanges(operation, ["slide", "element"]) ||
    !hasSameDocumentExceptSlides(before, after) ||
    getElementSlideId(before, changed_element.before.id) !==
      changed_slide.before.id ||
    getElementSlideId(after, changed_element.after.id) !==
      changed_slide.after.id ||
    !hasSameSlideNonElementValues(changed_slide.before, changed_slide.after) ||
    !hasSameItemsExceptRevision(
      changed_slide.before.elements,
      changed_slide.after.elements,
      changed_element.after.id,
    ) ||
    !hasSameElementValuesExceptRevision(
      changed_element.before,
      changed_element.after,
    )
  )
    return false;
  return is_valid_move(
    changed_slide.before.elements.findIndex(
      (element) => element.id === changed_element.before.id,
    ),
    changed_slide.after.elements.findIndex(
      (element) => element.id === changed_element.after.id,
    ),
    changed_slide.before.elements.length,
  );
}

function isUpdatedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
  update: "other" | "position" | "size" | "asset" | "animations",
): boolean {
  const changed_element = getSingleChangedElement(before, after, operation);
  if (
    changed_element === undefined ||
    !hasChanges(operation, ["element"]) ||
    !hasSameDocumentExceptSlides(before, after) ||
    getElementSlideId(before, changed_element.before.id) !==
      getElementSlideId(after, changed_element.after.id) ||
    !hasSameItemsExceptRevision(
      before.slides,
      after.slides,
      getElementSlideId(after, changed_element.after.id),
    ) ||
    !hasSameElementParentSlide(before, after, changed_element.after.id)
  )
    return false;
  const before_element = changed_element.before;
  const after_element = changed_element.after;
  if (update === "position")
    return hasOnlyChangedElementProperty(
      before_element,
      after_element,
      "position",
    );
  if (update === "size")
    return hasOnlyChangedElementProperty(before_element, after_element, "size");
  if (update === "asset")
    return (
      before_element.type === "image" &&
      after_element.type === "image" &&
      hasOnlyChangedElementProperty(before_element, after_element, "assetId")
    );
  if (update === "animations")
    return hasReplacedAnimation(before_element, after_element);
  return (
    before_element.type === after_element.type &&
    JSON.stringify(before_element.animations) ===
      JSON.stringify(after_element.animations)
  );
}

function isUpdatedElements(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const changed_slide = getSingleChangedSlide(before, after, operation);
  if (
    changed_slide === undefined ||
    !hasSameDocumentExceptSlides(before, after) ||
    !hasSameSlideNonElementValues(changed_slide.before, changed_slide.after) ||
    changed_slide.before.elements.length !== changed_slide.after.elements.length
  )
    return false;

  const changed_elements = changed_slide.before.elements.flatMap(
    (before_element, index) => {
      const after_element = changed_slide.after.elements[index];
      if (after_element === undefined || before_element.id !== after_element.id)
        return [];
      return before_element.revision === after_element.revision &&
        JSON.stringify(before_element) === JSON.stringify(after_element)
        ? []
        : [{ before: before_element, after: after_element }];
    },
  );
  if (changed_elements.length === 0) return false;
  if (
    !hasChanges(operation, [
      "slide",
      ...changed_elements.map(() => "element" as const),
    ])
  )
    return false;

  return changed_elements.every(
    ({ before: before_element, after: after_element }) =>
      before_element.type === after_element.type &&
      after_element.revision === before_element.revision + 1 &&
      JSON.stringify(before_element.animations) ===
        JSON.stringify(after_element.animations),
  );
}

function hasChanges(
  operation: PresentationOperation,
  entity_types: readonly EntityRevisionTransition["entityType"][],
): boolean {
  const unmatched_entity_types = [...entity_types];
  return (
    operation.changes.length === unmatched_entity_types.length &&
    operation.changes.every((change) => {
      const index = unmatched_entity_types.indexOf(change.entityType);
      if (index === -1) return false;
      unmatched_entity_types.splice(index, 1);
      return true;
    }) &&
    unmatched_entity_types.length === 0
  );
}

function getSingleAddedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): Slide | undefined {
  const before_ids = new Set(before.slides.map((slide) => slide.id));
  const added = after.slides.filter((slide) => !before_ids.has(slide.id));
  return added.length === 1 ? added[0] : undefined;
}

function getSingleDeletedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): Slide | undefined {
  const after_ids = new Set(after.slides.map((slide) => slide.id));
  const deleted = before.slides.filter((slide) => !after_ids.has(slide.id));
  return deleted.length === 1 ? deleted[0] : undefined;
}

function getSingleAddedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): PresentationElement | undefined {
  const before_ids = new Set(
    before.slides.flatMap((slide) =>
      slide.elements.map((element) => element.id),
    ),
  );
  const added = after.slides.flatMap((slide) =>
    slide.elements.filter((element) => !before_ids.has(element.id)),
  );
  return added.length === 1 ? added[0] : undefined;
}

function getSingleDeletedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): PresentationElement | undefined {
  const after_ids = new Set(
    after.slides.flatMap((slide) =>
      slide.elements.map((element) => element.id),
    ),
  );
  const deleted = before.slides.flatMap((slide) =>
    slide.elements.filter((element) => !after_ids.has(element.id)),
  );
  return deleted.length === 1 ? deleted[0] : undefined;
}

function getSingleChangedSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): { readonly before: Slide; readonly after: Slide } | undefined {
  const change = operation.changes.find(
    (current_change) =>
      current_change.entityType === "slide" &&
      current_change.fromRevision !== null &&
      current_change.toRevision !== null,
  );
  if (change === undefined) return undefined;
  const before_slide = before.slides.find(
    (slide) => slide.id === change.entityId,
  );
  const after_slide = after.slides.find(
    (slide) => slide.id === change.entityId,
  );
  return before_slide === undefined || after_slide === undefined
    ? undefined
    : { before: before_slide, after: after_slide };
}

function getSingleChangedElement(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
):
  | {
      readonly before: PresentationElement;
      readonly after: PresentationElement;
    }
  | undefined {
  const change = operation.changes.find(
    (current_change) =>
      current_change.entityType === "element" &&
      current_change.fromRevision !== null &&
      current_change.toRevision !== null,
  );
  if (change === undefined) return undefined;
  const before_element = findElement(before, change.entityId);
  const after_element = findElement(after, change.entityId);
  return before_element === undefined || after_element === undefined
    ? undefined
    : { before: before_element, after: after_element };
}

function findElement(
  document: PresentationDocumentState,
  element_id: string,
): PresentationElement | undefined {
  return document.slides
    .flatMap((slide) => slide.elements)
    .find((element) => element.id === element_id);
}

function getElementSlideId(
  document: PresentationDocumentState,
  element_id: string,
): string | undefined {
  return document.slides.find((slide) =>
    slide.elements.some((element) => element.id === element_id),
  )?.id;
}

function hasSameDocumentExceptSlides(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): boolean {
  return (
    before.id === after.id &&
    before.publicId === after.publicId &&
    before.title === after.title &&
    before.status === after.status &&
    before.createdAt === after.createdAt &&
    before.lastSavedAt === after.lastSavedAt &&
    before.lastPublishedAt === after.lastPublishedAt &&
    hasSameCanvas(before, after)
  );
}

function hasSameCanvas(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): boolean {
  return JSON.stringify(before.canvas) === JSON.stringify(after.canvas);
}

function hasSameSlides(
  left: readonly Slide[],
  right: readonly Slide[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasSameElements(
  left: readonly PresentationElement[],
  right: readonly PresentationElement[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasSameItemsExceptRevision<
  T extends { readonly id: string; readonly revision: number },
>(
  left: readonly T[],
  right: readonly T[],
  changed_id: string | undefined,
): boolean {
  if (left.length !== right.length) return false;
  return left.every((item) => {
    if (item.id === changed_id) return true;
    const other = right.find((current_item) => current_item.id === item.id);
    return (
      other !== undefined && JSON.stringify(item) === JSON.stringify(other)
    );
  });
}

function hasAddedAtEnd<T extends { readonly id: string }>(
  before: readonly T[],
  after: readonly T[],
  added_id: string,
): boolean {
  return (
    after.length === before.length + 1 &&
    after.at(-1)?.id === added_id &&
    before.every(
      (item, index) => JSON.stringify(item) === JSON.stringify(after[index]),
    )
  );
}

function hasAddedAdjacentDuplicate(
  before: readonly Slide[],
  after: readonly Slide[],
  added_slide: Slide,
): boolean {
  const added_index = after.findIndex((slide) => slide.id === added_slide.id);
  const source_slide = after[added_index - 1];
  if (
    added_index <= 0 ||
    source_slide === undefined ||
    after.length !== before.length + 1 ||
    !before.every(
      (slide, index) =>
        JSON.stringify(slide) ===
        JSON.stringify(after[index < added_index ? index : index + 1]),
    )
  )
    return false;
  return hasDuplicatedSlideContent(source_slide, added_slide);
}

function hasRemovedItem<T extends { readonly id: string }>(
  before: readonly T[],
  after: readonly T[],
  removed_id: string,
): boolean {
  return (
    before.length === after.length + 1 &&
    JSON.stringify(before.filter((item) => item.id !== removed_id)) ===
      JSON.stringify(after)
  );
}

function hasDefaultSlideValues(slide: Slide): boolean {
  return (
    slide.revision === 1 &&
    JSON.stringify(slide.background) ===
      JSON.stringify({ type: "solid", color: "#FFFFFF" }) &&
    JSON.stringify(slide.transition) ===
      JSON.stringify({ type: "none", duration: 0 })
  );
}

function hasDuplicatedSlideContent(before: Slide, after: Slide): boolean {
  return (
    after.revision === 1 &&
    hasSameBackground(before, after) &&
    hasSameTransition(before, after) &&
    before.elements.length === after.elements.length &&
    before.elements.every((element, index) =>
      hasDuplicatedElementContent(element, after.elements[index]),
    )
  );
}

function hasDuplicatedElementContent(
  before: PresentationElement,
  after: PresentationElement,
): boolean {
  const {
    id: _before_id,
    revision: _before_revision,
    ...before_content
  } = before;
  const { id: _after_id, revision: after_revision, ...after_content } = after;
  return (
    after_revision === 1 &&
    JSON.stringify(before_content) === JSON.stringify(after_content)
  );
}

function hasSameSlideValuesExceptRevision(
  before: Slide,
  after: Slide,
): boolean {
  const { revision: _before_revision, ...before_content } = before;
  const { revision: _after_revision, ...after_content } = after;
  return JSON.stringify(before_content) === JSON.stringify(after_content);
}

function hasSameSlideNonElementValues(before: Slide, after: Slide): boolean {
  return hasSameBackground(before, after) && hasSameTransition(before, after);
}

function hasSameElementValuesExceptRevision(
  before: PresentationElement,
  after: PresentationElement,
): boolean {
  const { revision: _before_revision, ...before_content } = before;
  const { revision: _after_revision, ...after_content } = after;
  return JSON.stringify(before_content) === JSON.stringify(after_content);
}

function hasSameElementParentSlide(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  element_id: string,
): boolean {
  const before_slide = before.slides.find((slide) =>
    slide.elements.some((element) => element.id === element_id),
  );
  const after_slide = after.slides.find((slide) =>
    slide.elements.some((element) => element.id === element_id),
  );
  return (
    before_slide !== undefined &&
    after_slide !== undefined &&
    before_slide.revision === after_slide.revision &&
    hasSameSlideNonElementValues(before_slide, after_slide) &&
    hasSameItemsExceptRevision(
      before_slide.elements,
      after_slide.elements,
      element_id,
    )
  );
}

function hasSameBackground(before: Slide, after: Slide): boolean {
  return JSON.stringify(before.background) === JSON.stringify(after.background);
}

function hasSameTransition(before: Slide, after: Slide): boolean {
  return JSON.stringify(before.transition) === JSON.stringify(after.transition);
}

function hasOnlyChangedElementProperty(
  before: PresentationElement,
  after: PresentationElement,
  property: "position" | "size" | "assetId",
): boolean {
  return hasSameElementProperty(before, after, property);
}

function hasSameElementProperty(
  before: PresentationElement,
  after: PresentationElement,
  property: "position" | "size" | "assetId" | "animations",
): boolean {
  const before_content = {
    ...before,
    revision: undefined,
    [property]: undefined,
  };
  const after_content = {
    ...after,
    revision: undefined,
    [property]: undefined,
  };
  return JSON.stringify(before_content) === JSON.stringify(after_content);
}

function hasReplacedAnimation(
  before: PresentationElement,
  after: PresentationElement,
): boolean {
  if (!hasSameElementProperty(before, after, "animations")) return false;
  return after.animations.some((animation) => {
    const category = getAnimationCapability(animation.type)?.category;
    return (
      category !== undefined &&
      JSON.stringify(after.animations) ===
        JSON.stringify([
          ...before.animations.filter(
            (current_animation) =>
              getAnimationCapability(current_animation.type)?.category !==
              category,
          ),
          animation,
        ])
    );
  });
}

function hasCoherentOperationMetadata(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  operation: PresentationOperation,
): boolean {
  const expected_changes = getRevisionTransitions(before, after);
  if (
    operation.changes.length !== expected_changes.length ||
    expected_changes.some(
      (change) =>
        change.fromRevision !== null &&
        change.fromRevision === change.toRevision,
    )
  )
    return false;

  const unmatched_changes = [...expected_changes];
  for (const change of operation.changes) {
    const index = unmatched_changes.findIndex((expected_change) =>
      hasSameRevisionTransition(change, expected_change),
    );
    if (index === -1) return false;
    unmatched_changes.splice(index, 1);
  }

  return unmatched_changes.length === 0;
}

function getRevisionTransitions(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): EntityRevisionTransition[] {
  const before_entities = getDocumentEntities(before);
  const after_entities = getDocumentEntities(after);
  const entity_keys = new Set([
    ...before_entities.keys(),
    ...after_entities.keys(),
  ]);

  return [...entity_keys].flatMap<EntityRevisionTransition>((entity_key) => {
    const before_entity = before_entities.get(entity_key);
    const after_entity = after_entities.get(entity_key);
    if (before_entity === undefined && after_entity !== undefined)
      return [
        {
          entityType: after_entity.entityType,
          entityId: after_entity.entityId,
          fromRevision: null,
          toRevision: after_entity.revision,
        },
      ];
    if (before_entity !== undefined && after_entity === undefined)
      return [
        {
          entityType: before_entity.entityType,
          entityId: before_entity.entityId,
          fromRevision: before_entity.revision,
          toRevision: null,
        },
      ];
    if (
      before_entity !== undefined &&
      after_entity !== undefined &&
      (before_entity.revision !== after_entity.revision ||
        JSON.stringify(before_entity.content) !==
          JSON.stringify(after_entity.content))
    )
      return [
        {
          entityType: before_entity.entityType,
          entityId: before_entity.entityId,
          fromRevision: before_entity.revision,
          toRevision: after_entity.revision,
        },
      ];
    return [];
  });
}

function getDocumentEntities(
  document: PresentationDocumentState,
): Map<string, DocumentEntity> {
  const entities = new Map<string, DocumentEntity>();
  const add_entity = (entity: DocumentEntity) => {
    entities.set(`${entity.entityType}:${entity.entityId}`, entity);
  };

  add_entity({
    entityType: "presentation",
    entityId: document.id,
    revision: document.revision,
    content: {
      title: document.title,
      canvas: document.canvas,
      slideIds: document.slides.map((slide) => slide.id),
    },
  });
  for (const slide of document.slides) {
    add_entity({
      entityType: "slide",
      entityId: slide.id,
      revision: slide.revision,
      content: {
        background: slide.background,
        transition: slide.transition,
        elementIds: slide.elements.map((element) => element.id),
      },
    });
    for (const element of slide.elements) {
      const { revision, ...content } = element;
      add_entity({
        entityType: "element",
        entityId: element.id,
        revision,
        content,
      });
    }
  }
  return entities;
}

function hasSameRevisionTransition(
  left: EntityRevisionTransition,
  right: EntityRevisionTransition,
): boolean {
  return (
    left.entityType === right.entityType &&
    left.entityId === right.entityId &&
    left.fromRevision === right.fromRevision &&
    left.toRevision === right.toRevision
  );
}

function isValidHistoryStack(
  value: unknown,
): value is readonly OperationHistoryEntry[] {
  return Array.isArray(value) && value.every(isValidHistoryEntry);
}

function isValidDocument(value: unknown): value is PresentationDocumentState {
  return (
    isRecordWithKeys(value, [
      "id",
      "publicId",
      "title",
      "revision",
      "canvas",
      "slides",
      "operationSequence",
      "status",
      "createdAt",
      "updatedAt",
      "lastSavedAt",
      "lastPublishedAt",
    ]) && hasValidDocumentValues(value)
  );
}

function hasValidDocumentValues(
  value: Record<string, unknown>,
): value is PresentationDocumentState {
  if (
    !isValidPresentationId(value.id) ||
    !isValidPublicId(value.publicId) ||
    !isValidTitle(value.title) ||
    !isPositiveInteger(value.revision) ||
    !isNonNegativeInteger(value.operationSequence) ||
    !isValidPresentationCanvas(value.canvas) ||
    !Array.isArray(value.slides) ||
    (value.status !== "draft" && value.status !== "published") ||
    !isValidTimestamp(value.createdAt) ||
    !isValidTimestamp(value.updatedAt) ||
    value.updatedAt < value.createdAt ||
    (value.lastSavedAt !== null && !isValidTimestamp(value.lastSavedAt)) ||
    (value.lastPublishedAt !== null &&
      !isValidTimestamp(value.lastPublishedAt)) ||
    (value.status === "draft" && value.lastPublishedAt !== null) ||
    (value.status === "published" && value.lastPublishedAt === null)
  )
    return false;
  const canvas = value.canvas;
  return (
    value.slides.every((slide) => isValidSlide(slide, canvas)) &&
    hasUniqueIds(value.slides)
  );
}

function isValidSlide(
  value: unknown,
  canvas: PresentationDocumentState["canvas"],
): boolean {
  return (
    isRecordWithKeys(value, [
      "id",
      "revision",
      "background",
      "transition",
      "elements",
    ]) &&
    isValidIdentifier(value.id) &&
    isPositiveInteger(value.revision) &&
    isValidSlideBackground(value.background) &&
    isValidTransition(value.transition) &&
    Array.isArray(value.elements) &&
    value.elements.every((element) => isValidElement(element, canvas)) &&
    hasUniqueIds(value.elements)
  );
}

function isValidTransition(value: unknown): boolean {
  if (
    !isRecordWithKeys(value, ["type", "duration"]) ||
    typeof value.type !== "string"
  )
    return false;
  const capability = getTransitionCapability(value.type);
  if (capability === undefined || !isFiniteNumber(value.duration)) return false;
  return capability.id === "none"
    ? value.duration === 0 ||
        value.duration >= capability.configurationSchema.duration.minimum
    : value.duration >= capability.configurationSchema.duration.minimum;
}

function isValidElement(
  value: unknown,
  canvas: PresentationDocumentState["canvas"],
): boolean {
  if (
    !isRecord(value) ||
    !isValidIdentifier(value.id) ||
    !isPositiveInteger(value.revision) ||
    !isValidPosition(value.position) ||
    !isValidSize(value.size) ||
    !isFiniteNumber(value.rotation) ||
    !isValidOpacity(value.opacity) ||
    !isElementType(value.type) ||
    !Array.isArray(value.animations)
  )
    return false;
  const element_type = value.type;
  if (
    !value.animations.every((animation) =>
      isValidAnimation(animation, element_type),
    ) ||
    !hasUniqueAnimationCategories(value.animations)
  )
    return false;
  if (!isElementWithinCanvas(value.position, value.size, canvas)) return false;
  if (value.type === "text")
    return (
      isRecordWithKeys(value, [
        "id",
        "revision",
        "type",
        "content",
        "style",
        "position",
        "size",
        "rotation",
        "opacity",
        "animations",
      ]) &&
      typeof value.content === "string" &&
      isValidTextStyle(value.style)
    );
  if (value.type === "image")
    return (
      isRecordWithKeys(value, [
        "id",
        "revision",
        "type",
        "assetId",
        "style",
        "position",
        "size",
        "rotation",
        "opacity",
        "animations",
      ]) &&
      isValidIdentifier(value.assetId) &&
      isValidImageStyle(value.style)
    );
  return (
    value.type === "shape" &&
    isRecordWithKeys(value, [
      "id",
      "revision",
      "type",
      "shapeType",
      "style",
      "position",
      "size",
      "rotation",
      "opacity",
      "animations",
    ]) &&
    (value.shapeType === "rectangle" ||
      value.shapeType === "circle" ||
      value.shapeType === "line") &&
    isValidShapeStyle(value.style)
  );
}

function isValidAnimation(
  value: unknown,
  element_type: "text" | "image" | "shape",
): boolean {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  const capability = getAnimationCapability(value.type);
  if (
    capability === undefined ||
    !capability.supportedElementTypes.includes(element_type)
  )
    return false;
  const has_continuous_options = capability.category === "continuous";
  const keys = has_continuous_options
    ? ["type", "duration", "delay", "easing", "repeat", "interval"]
    : ["type", "duration", "delay", "easing"];
  if (
    !isRecordWithKeys(value, keys) ||
    !isFiniteNumber(value.duration) ||
    value.duration < capability.configurationSchema.duration.minimum ||
    !isFiniteNumber(value.delay) ||
    value.delay < capability.configurationSchema.delay.minimum ||
    typeof value.easing !== "string" ||
    value.easing.trim().length <
      capability.configurationSchema.easing.minimumLength
  )
    return false;
  if (!has_continuous_options) return true;
  const repeat_schema = capability.configurationSchema.repeat;
  const interval_schema = capability.configurationSchema.interval;
  if (repeat_schema === undefined || interval_schema === undefined)
    return false;
  return (
    (value.repeat === "infinite" ||
      (isPositiveInteger(value.repeat) &&
        value.repeat >= repeat_schema.minimum)) &&
    isFiniteNumber(value.interval) &&
    value.interval >= interval_schema.minimum
  );
}

function isValidOperation(value: unknown): value is PresentationOperation {
  return (
    isRecordWithKeys(value, ["id", "sequence", "type", "source", "changes"]) &&
    isNonNegativeInteger(value.sequence) &&
    value.sequence > 0 &&
    value.id === `operation_${value.sequence}` &&
    typeof value.type === "string" &&
    OPERATION_TYPES.has(value.type) &&
    (value.source === "user" ||
      value.source === "system" ||
      value.source === "ai" ||
      value.source === "mcp") &&
    Array.isArray(value.changes) &&
    value.changes.every(isValidRevisionTransition)
  );
}

function isValidRevisionTransition(value: unknown): boolean {
  return (
    isRecordWithKeys(value, [
      "entityType",
      "entityId",
      "fromRevision",
      "toRevision",
    ]) &&
    (value.entityType === "presentation" ||
      value.entityType === "slide" ||
      value.entityType === "element") &&
    isValidIdentifier(value.entityId) &&
    isValidRevision(value.fromRevision) &&
    isValidRevision(value.toRevision)
  );
}

function isValidOpacity(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}
function isValidTextStyle(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const expected_keys = [
    "role",
    "font",
    "fontSize",
    "fontWeight",
    "color",
    "alignment",
  ];
  const keys = Object.keys(value);
  return (
    keys.length >= expected_keys.length &&
    keys.length <= expected_keys.length + 1 &&
    expected_keys.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => expected_keys.includes(key) || key === "gradient") &&
    (value.role === "H1" ||
      value.role === "H2" ||
      value.role === "H3" ||
      value.role === "Paragraph") &&
    isNonBlankString(value.font) &&
    isPositiveNumber(value.fontSize) &&
    isPositiveNumber(value.fontWeight) &&
    isNonBlankString(value.color) &&
    (value.gradient === undefined || isNonBlankString(value.gradient)) &&
    isNonBlankString(value.alignment)
  );
}
function isValidImageStyle(value: unknown): boolean {
  return (
    isRecordWithKeys(value, ["objectFit", "borderRadius"]) &&
    isNonBlankString(value.objectFit) &&
    isNonNegativeNumber(value.borderRadius)
  );
}
function isValidShapeStyle(value: unknown): boolean {
  return (
    isRecordWithKeys(value, ["fill", "border", "borderWidth", "radius"]) &&
    isNonBlankString(value.fill) &&
    isNonBlankString(value.border) &&
    isNonNegativeNumber(value.borderWidth) &&
    isNonNegativeNumber(value.radius)
  );
}
function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}
function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function hasUniqueIds(values: readonly unknown[]): boolean {
  const ids = values.map((value) => (isRecord(value) ? value.id : undefined));
  return new Set(ids).size === ids.length;
}

function hasUniqueAnimationCategories(values: readonly unknown[]): boolean {
  const categories = values.map((value) =>
    isRecord(value) && typeof value.type === "string"
      ? getAnimationCapability(value.type)?.category
      : undefined,
  );
  return new Set(categories).size === categories.length;
}

function isValidRevision(value: unknown): boolean {
  return value === null || isPositiveInteger(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isElementType(value: unknown): value is "text" | "image" | "shape" {
  return value === "text" || value === "image" || value === "shape";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecordWithKeys(
  value: unknown,
  expected_keys: readonly string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Object.keys(value).length === expected_keys.length &&
    expected_keys.every((key) => Object.hasOwn(value, key))
  );
}

function serializationFailure():
  | Extract<SerializePresentationStateResult, { success: false }>
  | Extract<DeserializePresentationStateResult, { success: false }> {
  return Object.freeze({
    success: false,
    error: Object.freeze({ code: "INVALID_SERIALIZED_STATE" as const }),
  });
}

type DocumentEntity = {
  readonly entityType: EntityRevisionTransition["entityType"];
  readonly entityId: string;
  readonly revision: number;
  readonly content: unknown;
};
