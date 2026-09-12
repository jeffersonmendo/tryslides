import { getAnimationCapability } from "./capabilities/animation";
import { getTransitionCapability } from "./capabilities/transition";
import {
  addInitialRevision,
  findElementIndex,
  findSlideIndex,
  presentationRevisionChange,
  replaceAnimationForCategory,
  replaceSlide,
  reverseRevisionChange,
  slideRevisionChange,
  snapshotDocument,
  snapshotOperation,
  snapshotState,
} from "./state";
import type {
  AlignElementsToCanvasInput,
  AlignElementsToReferenceInput,
  BringForwardInput,
  BringToFrontInput,
  CommandFailure,
  CommandResult,
  ConfigureAnimationInput,
  ConfigureTransitionInput,
  ConfirmPresentationPublishedInput,
  ConfirmPresentationSavedInput,
  CreateElementInput,
  CreateElementsInput,
  CreatePresentationDeletionIntentResult,
  CreatePresentationInput,
  CreatePresentationResult,
  CreateSlideInput,
  DeleteElementInput,
  DeleteElementsInput,
  DeleteSlideInput,
  DistributeElementsInput,
  DuplicateElementInput,
  DuplicateSlideInput,
  EditElementInput,
  EditElementsInput,
  EditSlideInput,
  EntityRevisionTransition,
  HistoryCommandInput,
  MoveElementInput,
  MoveElementsInput,
  OperationHistoryEntry,
  OperationSource,
  PresentationCoreErrorCode,
  PresentationElement,
  PresentationOperation,
  PresentationState,
  RenamePresentationInput,
  ReorderElementInput,
  ReorderSlideInput,
  ReplaceAssetInput,
  ResizeElementInput,
  RotateElementsInput,
  SendBackwardInput,
  SendToBackInput,
  SetElementsOpacityInput,
} from "./types";
import { PRESENTATION_CANVAS } from "./types";
import {
  createAnimationConfiguration,
  createTransition,
  isElementWithinCanvas,
  isValidElementIdMap,
  isValidIdentifier,
  isValidNewElement,
  isValidOperationSource,
  isValidPatch,
  isValidPosition,
  isValidPresentationId,
  isValidPresentationRevision,
  isValidPublicId,
  isValidSize,
  isValidSlidePatch,
  isValidTimestamp,
  isValidTitle,
} from "./validation";

export function createPresentation(
  input: CreatePresentationInput,
): CreatePresentationResult {
  if (
    !isValidPresentationId(input.id) ||
    !isValidPublicId(input.publicId) ||
    !isValidTitle(input.title) ||
    !isValidTimestamp(input.createdAt)
  )
    return failureWithoutState("VALIDATION_ERROR");
  return Object.freeze({
    success: true,
    state: snapshotState({
      id: input.id,
      publicId: input.publicId,
      title: input.title,
      revision: 1,
      canvas: PRESENTATION_CANVAS,
      slides: [],
      operationSequence: 0,
      status: "draft",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      lastSavedAt: null,
      lastPublishedAt: null,
      undoStack: [],
      redoStack: [],
      slideHistories: {},
      presentationHistory: { undoStack: [], redoStack: [] },
    }),
  });
}
/**
 * Produces the exact revisioned target for a repository-owned deletion. This
 * pure operation neither changes Core state nor claims durable deletion.
 */
export function createPresentationDeletionIntent(
  state: PresentationState,
): CreatePresentationDeletionIntentResult {
  if (
    typeof state !== "object" ||
    state === null ||
    Array.isArray(state) ||
    !isValidPresentationId(state.id) ||
    !isValidPresentationRevision(state.revision)
  )
    return failureWithoutIntent("VALIDATION_ERROR");
  return Object.freeze({
    success: true,
    intent: Object.freeze({
      presentationId: state.id,
      revision: state.revision,
    }),
  });
}
/** Records repository success for the current revision; it never performs I/O. */
export function confirmPresentationSaved(
  state: PresentationState,
  input: ConfirmPresentationSavedInput,
):
  | CommandFailure
  | { readonly success: true; readonly state: PresentationState } {
  if (
    !isValidPresentationRevision(input.revision) ||
    input.revision !== state.revision ||
    !isValidTimestamp(input.savedAt) ||
    input.savedAt < state.updatedAt ||
    (state.lastSavedAt !== null && input.savedAt < state.lastSavedAt)
  )
    return failure(
      state,
      input.revision !== state.revision ? "CONFLICT" : "VALIDATION_ERROR",
    );
  return Object.freeze({
    success: true,
    state: snapshotState({ ...state, lastSavedAt: input.savedAt }),
  });
}
/** Records successful external publication for the current revision; it never publishes. */
export function confirmPresentationPublished(
  state: PresentationState,
  input: ConfirmPresentationPublishedInput,
):
  | CommandFailure
  | { readonly success: true; readonly state: PresentationState } {
  if (
    !isValidPresentationRevision(input.revision) ||
    input.revision !== state.revision ||
    !isValidTimestamp(input.publishedAt) ||
    input.publishedAt < state.updatedAt ||
    (state.lastPublishedAt !== null &&
      input.publishedAt < state.lastPublishedAt)
  )
    return failure(
      state,
      input.revision !== state.revision ? "CONFLICT" : "VALIDATION_ERROR",
    );
  return Object.freeze({
    success: true,
    state: snapshotState({
      ...state,
      status: "published",
      lastPublishedAt: input.publishedAt,
    }),
  });
}
export function createSlide(
  state: PresentationState,
  input: CreateSlideInput,
): CommandResult {
  if (!isValidIdentifier(input.id)) return failure(state, "VALIDATION_ERROR");
  if (state.slides.some((slide) => slide.id === input.id))
    return failure(state, "CONFLICT");
  return succeed(
    state,
    "create-slide",
    input,
    {
      ...state,
      revision: state.revision + 1,
      slides: [
        ...state.slides,
        {
          id: input.id,
          revision: 1,
          background: { type: "solid", color: "#FFFFFF" },
          transition: { type: "none", duration: 0 },
          elements: [],
        },
      ],
    },
    [
      presentationRevisionChange(state),
      {
        entityType: "slide",
        entityId: input.id,
        fromRevision: null,
        toRevision: 1,
      },
    ],
  );
}
export function renamePresentation(
  state: PresentationState,
  input: RenamePresentationInput,
): CommandResult {
  if (!isValidTitle(input.title)) return failure(state, "VALIDATION_ERROR");
  return succeed(
    state,
    "rename-presentation",
    input,
    { ...state, title: input.title, revision: state.revision + 1 },
    [presentationRevisionChange(state)],
  );
}
export function editSlide(
  state: PresentationState,
  input: EditSlideInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (!isValidSlidePatch(input.patch))
    return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  const updated_slide = {
    ...slide,
    ...input.patch,
    revision: slide.revision + 1,
  };
  return succeed(
    state,
    "edit-slide",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, updated_slide),
    },
    [slideRevisionChange(slide)],
  );
}
export function deleteSlide(
  state: PresentationState,
  input: DeleteSlideInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  return succeed(
    state,
    "delete-slide",
    input,
    {
      ...state,
      revision: state.revision + 1,
      slides: state.slides.filter((_, index) => index !== slide_index),
    },
    [
      presentationRevisionChange(state),
      {
        entityType: "slide",
        entityId: slide.id,
        fromRevision: slide.revision,
        toRevision: null,
      },
      ...slide.elements.map((element) => ({
        entityType: "element" as const,
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: null,
      })),
    ],
  );
}
export function duplicateSlide(
  state: PresentationState,
  input: DuplicateSlideInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (!isValidIdentifier(input.id)) return failure(state, "VALIDATION_ERROR");
  if (state.slides.some((slide) => slide.id === input.id))
    return failure(state, "CONFLICT");
  if (!isValidElementIdMap(input.elementIds))
    return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  const source_element_ids = new Set(
    slide.elements.map((element) => element.id),
  );
  const replacement_ids = Object.entries(input.elementIds);
  if (
    replacement_ids.length !== source_element_ids.size ||
    replacement_ids.some(
      ([source_id, replacement_id]) =>
        !source_element_ids.has(source_id) ||
        !isValidIdentifier(replacement_id) ||
        replacement_id === source_id,
    ) ||
    new Set(replacement_ids.map(([, replacement_id]) => replacement_id))
      .size !== replacement_ids.length
  )
    return failure(state, "VALIDATION_ERROR");
  const elements = slide.elements.map((element) => ({
    ...element,
    id: input.elementIds[element.id],
    revision: 1,
  }));
  return succeed(
    state,
    "duplicate-slide",
    input,
    {
      ...state,
      revision: state.revision + 1,
      slides: [
        ...state.slides.slice(0, slide_index + 1),
        {
          id: input.id,
          revision: 1,
          background: slide.background,
          transition: slide.transition,
          elements,
        },
        ...state.slides.slice(slide_index + 1),
      ],
    },
    [
      presentationRevisionChange(state),
      {
        entityType: "slide",
        entityId: input.id,
        fromRevision: null,
        toRevision: 1,
      },
      ...elements.map((element) => ({
        entityType: "element" as const,
        entityId: element.id,
        fromRevision: null,
        toRevision: 1,
      })),
    ],
  );
}
export function reorderSlide(
  state: PresentationState,
  input: ReorderSlideInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (
    input.afterSlideId !== null &&
    (input.afterSlideId === input.slideId ||
      findSlideIndex(state, input.afterSlideId) === -1)
  )
    return failure(state, "VALIDATION_ERROR");
  const moved_slide = state.slides[slide_index];
  const remaining_slides = state.slides.filter(
    (_, index) => index !== slide_index,
  );
  const target_index =
    input.afterSlideId === null
      ? 0
      : remaining_slides.findIndex((slide) => slide.id === input.afterSlideId) +
        1;
  const moved_slide_with_revision = {
    ...moved_slide,
    revision: moved_slide.revision + 1,
  };
  const slides = [
    ...remaining_slides.slice(0, target_index),
    moved_slide_with_revision,
    ...remaining_slides.slice(target_index),
  ];
  return succeed(
    state,
    "reorder-slide",
    input,
    { ...state, revision: state.revision + 1, slides },
    [
      presentationRevisionChange(state),
      {
        entityType: "slide",
        entityId: moved_slide.id,
        fromRevision: moved_slide.revision,
        toRevision: moved_slide_with_revision.revision,
      },
    ],
  );
}
export function createElement(
  state: PresentationState,
  input: CreateElementInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (
    !isValidNewElement(input.element) ||
    !isElementWithinCanvas(
      input.element.position,
      input.element.size,
      state.canvas,
    )
  )
    return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  if (slide.elements.some((element) => element.id === input.element.id))
    return failure(state, "CONFLICT");
  const element = addInitialRevision(input.element);
  return succeed(
    state,
    "create-element",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements: [...slide.elements, element],
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: null,
        toRevision: 1,
      },
    ],
  );
}
/** Creates all elements together, or leaves the state entirely unchanged. */
export function createElements(
  state: PresentationState,
  input: CreateElementsInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (input.elements.length === 0) return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  const existing_ids = new Set(slide.elements.map((element) => element.id));
  if (
    input.elements.some(
      (element) =>
        !isValidNewElement(element) ||
        !isElementWithinCanvas(element.position, element.size, state.canvas) ||
        existing_ids.has(element.id),
    ) ||
    new Set(input.elements.map((element) => element.id)).size !==
      input.elements.length
  )
    return failure(state, "VALIDATION_ERROR");
  const elements = input.elements.map(addInitialRevision);
  return succeed(
    state,
    "create-elements",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements: [...slide.elements, ...elements],
      }),
    },
    [
      slideRevisionChange(slide),
      ...elements.map((element) => ({
        entityType: "element" as const,
        entityId: element.id,
        fromRevision: null,
        toRevision: 1,
      })),
    ],
  );
}
export function editElement(
  state: PresentationState,
  input: EditElementInput,
): CommandResult {
  return updateElement(state, input, "edit-element", (element) =>
    isValidPatch(element, input.patch) &&
    isElementWithinCanvas(
      input.patch.position ?? element.position,
      input.patch.size ?? element.size,
      state.canvas,
    )
      ? ({
          ...element,
          ...input.patch,
          style:
            input.patch.style === undefined
              ? element.style
              : { ...element.style, ...input.patch.style },
          revision: element.revision + 1,
        } as PresentationElement)
      : null,
  );
}
/** Updates every requested element atomically, or leaves the document unchanged. */
export function editElements(
  state: PresentationState,
  input: EditElementsInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  if (
    input.elementIds.length === 0 ||
    new Set(input.elementIds).size !== input.elementIds.length
  )
    return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  const selected_ids = new Set(input.elementIds);
  const selected = slide.elements.filter((element) =>
    selected_ids.has(element.id),
  );
  if (selected.length !== input.elementIds.length)
    return failure(state, "ELEMENT_NOT_FOUND");
  const updated = new Map<string, PresentationElement>();
  for (const element of selected) {
    if (
      !isValidPatch(element, input.patch) ||
      !isElementWithinCanvas(
        input.patch.position ?? element.position,
        input.patch.size ?? element.size,
        state.canvas,
      )
    )
      return failure(state, "VALIDATION_ERROR");
    updated.set(element.id, {
      ...element,
      ...input.patch,
      style:
        input.patch.style === undefined
          ? element.style
          : { ...element.style, ...input.patch.style },
      revision: element.revision + 1,
    } as PresentationElement);
  }
  return succeed(
    state,
    "edit-elements",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements: slide.elements.map(
          (element) => updated.get(element.id) ?? element,
        ),
      }),
    },
    [
      slideRevisionChange(slide),
      ...selected.map((element) => ({
        entityType: "element" as const,
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: element.revision + 1,
      })),
    ],
  );
}
/** Moves every selected element by one shared, canvas-clamped delta. */
export function moveElements(
  state: PresentationState,
  input: MoveElementsInput,
): CommandResult {
  if (!isValidPosition(input.delta)) return failure(state, "VALIDATION_ERROR");
  return updateElements(state, input, "move-elements", (elements) => {
    const delta = getClampedMovementDelta(elements, input.delta, state.canvas);
    return elements.map((element) => ({
      ...element,
      position: {
        x: element.position.x + delta.x,
        y: element.position.y + delta.y,
      },
      revision: element.revision + 1,
    }));
  });
}
/** Removes all requested elements as one atomic, undoable operation. */
export function deleteElements(
  state: PresentationState,
  input: DeleteElementsInput,
): CommandResult {
  const selected = getSelectedElements(state, input);
  if (!selected.success) return selected.result;
  const { slideIndex, slide, elements, elementIds } = selected;
  return succeed(
    state,
    "delete-elements",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slideIndex, {
        ...slide,
        revision: slide.revision + 1,
        elements: slide.elements.filter(
          (element) => !elementIds.has(element.id),
        ),
      }),
    },
    [
      slideRevisionChange(slide),
      ...elements.map((element) => ({
        entityType: "element" as const,
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: null,
      })),
    ],
  );
}
/** Applies one absolute opacity to every selected element atomically. */
export function setElementsOpacity(
  state: PresentationState,
  input: SetElementsOpacityInput,
): CommandResult {
  if (!Number.isFinite(input.opacity) || input.opacity < 0 || input.opacity > 1)
    return failure(state, "VALIDATION_ERROR");
  return updateElements(state, input, "set-elements-opacity", (elements) =>
    elements.map((element) => ({
      ...element,
      opacity: input.opacity,
      revision: element.revision + 1,
    })),
  );
}
/** Adds one rotation delta to every selected element, preserving differences. */
export function rotateElements(
  state: PresentationState,
  input: RotateElementsInput,
): CommandResult {
  if (!Number.isFinite(input.delta)) return failure(state, "VALIDATION_ERROR");
  return updateElements(state, input, "rotate-elements", (elements) =>
    elements.map((element) => ({
      ...element,
      rotation: element.rotation + input.delta,
      revision: element.revision + 1,
    })),
  );
}
export function alignElementsToCanvas(
  state: PresentationState,
  input: AlignElementsToCanvasInput,
): CommandResult {
  if (!isValidAlignment(input.alignment))
    return failure(state, "VALIDATION_ERROR");
  return updateElements(state, input, "align-elements-to-canvas", (elements) =>
    elements.map((element) => ({
      ...element,
      position: getAlignedPosition(element, state.canvas, input.alignment),
      revision: element.revision + 1,
    })),
  );
}
export function alignElementsToReference(
  state: PresentationState,
  input: AlignElementsToReferenceInput,
): CommandResult {
  if (!isValidAlignment(input.alignment))
    return failure(state, "VALIDATION_ERROR");
  return updateElements(
    state,
    input,
    "align-elements-to-reference",
    (elements) => {
      const reference = elements.find(
        (element) => element.id === input.referenceElementId,
      );
      if (reference === undefined) return null;
      return elements.map((element) =>
        element.id === reference.id
          ? element
          : {
              ...element,
              position: getReferenceAlignedPosition(
                element,
                reference,
                input.alignment,
              ),
              revision: element.revision + 1,
            },
      );
    },
  );
}
export function distributeElements(
  state: PresentationState,
  input: DistributeElementsInput,
): CommandResult {
  if (
    (input.axis !== "horizontal" && input.axis !== "vertical") ||
    !Number.isFinite(input.gap) ||
    input.gap < 0
  )
    return failure(state, "VALIDATION_ERROR");
  return updateElements(state, input, "distribute-elements", (elements) => {
    if (elements.length < 2) return null;
    const ordered = [...elements].sort((left, right) =>
      input.axis === "horizontal"
        ? left.position.x - right.position.x
        : left.position.y - right.position.y,
    );
    let cursor =
      input.axis === "horizontal"
        ? ordered[0].position.x + ordered[0].size.width
        : ordered[0].position.y + ordered[0].size.height;
    const positions = new Map<string, import("./types").ElementPosition>();
    for (const element of ordered.slice(1)) {
      cursor += input.gap;
      positions.set(
        element.id,
        input.axis === "horizontal"
          ? { x: cursor, y: element.position.y }
          : { x: element.position.x, y: cursor },
      );
      cursor +=
        input.axis === "horizontal" ? element.size.width : element.size.height;
    }
    return elements.map((element) => {
      const position = positions.get(element.id);
      return position === undefined
        ? element
        : { ...element, position, revision: element.revision + 1 };
    });
  });
}
export function deleteElement(
  state: PresentationState,
  input: DeleteElementInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  const element = slide.elements[element_index];
  return succeed(
    state,
    "delete-element",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements: slide.elements.filter((_, index) => index !== element_index),
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: null,
      },
    ],
  );
}
export function duplicateElement(
  state: PresentationState,
  input: DuplicateElementInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  if (!isValidIdentifier(input.id)) return failure(state, "VALIDATION_ERROR");
  if (slide.elements.some((element) => element.id === input.id))
    return failure(state, "CONFLICT");
  const element = slide.elements[element_index];
  const duplicated_element = { ...element, id: input.id, revision: 1 };
  return succeed(
    state,
    "duplicate-element",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements: [...slide.elements, duplicated_element],
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: input.id,
        fromRevision: null,
        toRevision: 1,
      },
    ],
  );
}
export function reorderElement(
  state: PresentationState,
  input: ReorderElementInput,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  if (
    input.afterElementId !== null &&
    (input.afterElementId === input.elementId ||
      findElementIndex(slide, input.afterElementId) === -1)
  )
    return failure(state, "VALIDATION_ERROR");
  const element = slide.elements[element_index];
  const remaining_elements = slide.elements.filter(
    (_, index) => index !== element_index,
  );
  const target_index =
    input.afterElementId === null
      ? 0
      : remaining_elements.findIndex(
          (current_element) => current_element.id === input.afterElementId,
        ) + 1;
  const reordered_element = { ...element, revision: element.revision + 1 };
  const elements = [
    ...remaining_elements.slice(0, target_index),
    reordered_element,
    ...remaining_elements.slice(target_index),
  ];
  return succeed(
    state,
    "reorder-element",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements,
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: reordered_element.revision,
      },
    ],
  );
}
/** Moves an element one layer toward the front; topmost elements are unchanged. */
export function bringForward(
  state: PresentationState,
  input: BringForwardInput,
): CommandResult {
  return moveElementByLayer(state, input, 1, "bring-forward");
}
/** Moves an element one layer toward the back; bottommost elements are unchanged. */
export function sendBackward(
  state: PresentationState,
  input: SendBackwardInput,
): CommandResult {
  return moveElementByLayer(state, input, -1, "send-backward");
}
/** Moves an element to the topmost layer on its own slide. */
export function bringToFront(
  state: PresentationState,
  input: BringToFrontInput,
): CommandResult {
  return moveElementToLayer(state, input, "front", "bring-to-front");
}
/** Moves an element to the bottommost layer on its own slide. */
export function sendToBack(
  state: PresentationState,
  input: SendToBackInput,
): CommandResult {
  return moveElementToLayer(state, input, "back", "send-to-back");
}
export function moveElement(
  state: PresentationState,
  input: MoveElementInput,
): CommandResult {
  return updateElement(state, input, "move-element", (element) =>
    isValidPosition(input.position) &&
    isElementWithinCanvas(input.position, element.size, state.canvas)
      ? { ...element, position: input.position, revision: element.revision + 1 }
      : null,
  );
}
export function resizeElement(
  state: PresentationState,
  input: ResizeElementInput,
): CommandResult {
  return updateElement(state, input, "resize-element", (element) =>
    isValidSize(input.size) &&
    isElementWithinCanvas(element.position, input.size, state.canvas)
      ? { ...element, size: input.size, revision: element.revision + 1 }
      : null,
  );
}
export function replaceAsset(
  state: PresentationState,
  input: ReplaceAssetInput,
): CommandResult {
  return updateElement(state, input, "replace-asset", (element) =>
    element.type === "image" && isValidIdentifier(input.assetId)
      ? { ...element, assetId: input.assetId, revision: element.revision + 1 }
      : null,
  );
}
/**
 * Replaces the element's existing animation in the selected capability
 * category, preserving animations in its other categories.
 */
export function configureAnimation(
  state: PresentationState,
  input: ConfigureAnimationInput,
): CommandResult {
  const capability = getAnimationCapability(input.type);
  if (capability === undefined) return failure(state, "INVALID_ANIMATION_TYPE");
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  const element = slide.elements[element_index];
  if (!capability.supportedElementTypes.includes(element.type))
    return failure(state, "ANIMATION_NOT_SUPPORTED");
  const configuration = createAnimationConfiguration(
    capability,
    input.configuration,
  );
  if (configuration === "INVALID_DURATION")
    return failure(state, "INVALID_DURATION");
  if (configuration === null) return failure(state, "VALIDATION_ERROR");
  const updated_element = {
    ...element,
    revision: element.revision + 1,
    animations: replaceAnimationForCategory(
      element.animations,
      capability.category,
      configuration,
    ),
  };
  return succeed(
    state,
    "configure-animation",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        elements: slide.elements.map((current_element, index) =>
          index === element_index ? updated_element : current_element,
        ),
      }),
    },
    [
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: updated_element.revision,
      },
    ],
  );
}
/**
 * Replaces the slide's declarative transition after validating it against the
 * transition registry; the Core does not execute the visual effect.
 */
export function configureTransition(
  state: PresentationState,
  input: ConfigureTransitionInput,
): CommandResult {
  const capability = getTransitionCapability(input.type);
  if (capability === undefined)
    return failure(state, "INVALID_TRANSITION_TYPE");
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const transition = createTransition(capability, input.configuration);
  if (transition === "INVALID_DURATION")
    return failure(state, "INVALID_DURATION");
  if (transition === null) return failure(state, "VALIDATION_ERROR");
  const slide = state.slides[slide_index];
  const updated_slide = { ...slide, revision: slide.revision + 1, transition };
  return succeed(
    state,
    "configure-transition",
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, updated_slide),
    },
    [
      {
        entityType: "slide",
        entityId: slide.id,
        fromRevision: slide.revision,
        toRevision: updated_slide.revision,
      },
    ],
  );
}
/** Restores the exact document snapshot before the latest logical command. */
export function undo(
  state: PresentationState,
  input: HistoryCommandInput = {},
): CommandResult {
  const entry = state.undoStack.at(-1);
  return entry === undefined
    ? failure(state, "UNDO_NOT_AVAILABLE")
    : restoreHistoryEntry(state, input, entry, "undo");
}
/** Reapplies the exact document snapshot restored by the latest undo. */
export function redo(
  state: PresentationState,
  input: HistoryCommandInput = {},
): CommandResult {
  const entry = state.redoStack.at(-1);
  return entry === undefined
    ? failure(state, "REDO_NOT_AVAILABLE")
    : restoreHistoryEntry(state, input, entry, "redo");
}
/** Restores only the active slide's latest content or property operation. */
export function undoSlide(
  state: PresentationState,
  slide_id: string,
  input: HistoryCommandInput = {},
): CommandResult {
  return restoreScopedHistoryEntry(state, slide_id, "undo", input);
}
/** Reapplies only the active slide's latest content or property operation. */
export function redoSlide(
  state: PresentationState,
  slide_id: string,
  input: HistoryCommandInput = {},
): CommandResult {
  return restoreScopedHistoryEntry(state, slide_id, "redo", input);
}
/** Restores only presentation metadata and slide-structure operations. */
export function undoPresentation(
  state: PresentationState,
  input: HistoryCommandInput = {},
): CommandResult {
  return restorePresentationHistoryEntry(state, "undo", input);
}
/** Reapplies only presentation metadata and slide-structure operations. */
export function redoPresentation(
  state: PresentationState,
  input: HistoryCommandInput = {},
): CommandResult {
  return restorePresentationHistoryEntry(state, "redo", input);
}
function updateElement(
  state: PresentationState,
  input:
    | EditElementInput
    | MoveElementInput
    | ResizeElementInput
    | ReplaceAssetInput,
  operation_type: PresentationOperation["type"],
  update: (element: PresentationElement) => PresentationElement | null,
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  const element = update(slide.elements[element_index]);
  if (element === null) return failure(state, "VALIDATION_ERROR");
  return succeed(
    state,
    operation_type,
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        elements: slide.elements.map((current_element, index) =>
          index === element_index ? element : current_element,
        ),
      }),
    },
    [
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: slide.elements[element_index].revision,
        toRevision: element.revision,
      },
    ],
  );
}
function updateElements(
  state: PresentationState,
  input:
    | MoveElementsInput
    | SetElementsOpacityInput
    | RotateElementsInput
    | AlignElementsToCanvasInput
    | AlignElementsToReferenceInput
    | DistributeElementsInput,
  operation_type: PresentationOperation["type"],
  update: (
    elements: readonly PresentationElement[],
  ) => readonly PresentationElement[] | null,
): CommandResult {
  const selected = getSelectedElements(state, input);
  if (!selected.success) return selected.result;
  const updated_elements = update(selected.elements);
  if (
    updated_elements === null ||
    updated_elements.length !== selected.elements.length ||
    updated_elements.some(
      (element) =>
        !isElementWithinCanvas(element.position, element.size, state.canvas),
    )
  )
    return failure(state, "VALIDATION_ERROR");
  const updated = new Map(
    updated_elements
      .filter((element, index) => element !== selected.elements[index])
      .map((element) => [element.id, element]),
  );
  if (updated.size === 0) return failure(state, "VALIDATION_ERROR");
  return succeed(
    state,
    operation_type,
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, selected.slideIndex, {
        ...selected.slide,
        revision: selected.slide.revision + 1,
        elements: selected.slide.elements.map(
          (element) => updated.get(element.id) ?? element,
        ),
      }),
    },
    [
      slideRevisionChange(selected.slide),
      ...[...updated.values()].map((element) => {
        const previous = selected.elements.find(
          (current) => current.id === element.id,
        );
        return {
          entityType: "element" as const,
          entityId: element.id,
          fromRevision: previous?.revision ?? null,
          toRevision: element.revision,
        };
      }),
    ],
  );
}
function getSelectedElements(
  state: PresentationState,
  input: { readonly slideId: string; readonly elementIds: readonly string[] },
):
  | {
      readonly success: true;
      readonly slideIndex: number;
      readonly slide: PresentationState["slides"][number];
      readonly elements: readonly PresentationElement[];
      readonly elementIds: ReadonlySet<string>;
    }
  | { readonly success: false; readonly result: CommandFailure } {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1)
    return { success: false, result: failure(state, "SLIDE_NOT_FOUND") };
  if (
    input.elementIds.length === 0 ||
    new Set(input.elementIds).size !== input.elementIds.length
  )
    return { success: false, result: failure(state, "VALIDATION_ERROR") };
  const slide = state.slides[slide_index];
  const element_ids = new Set(input.elementIds);
  const elements = slide.elements.filter((element) =>
    element_ids.has(element.id),
  );
  if (elements.length !== input.elementIds.length)
    return { success: false, result: failure(state, "ELEMENT_NOT_FOUND") };
  return {
    success: true,
    slideIndex: slide_index,
    slide,
    elements,
    elementIds: element_ids,
  };
}
function getClampedMovementDelta(
  elements: readonly PresentationElement[],
  requested: import("./types").ElementPosition,
  canvas: PresentationState["canvas"],
): import("./types").ElementPosition {
  let minimum_x = -Infinity;
  let maximum_x = Infinity;
  let minimum_y = -Infinity;
  let maximum_y = Infinity;
  for (const element of elements) {
    minimum_x = Math.max(
      minimum_x,
      -element.size.width / 2 - element.position.x,
    );
    maximum_x = Math.min(
      maximum_x,
      canvas.width +
        element.size.width / 2 -
        element.position.x -
        element.size.width,
    );
    minimum_y = Math.max(
      minimum_y,
      -element.size.height / 2 - element.position.y,
    );
    maximum_y = Math.min(
      maximum_y,
      canvas.height +
        element.size.height / 2 -
        element.position.y -
        element.size.height,
    );
  }
  return {
    x: Math.min(maximum_x, Math.max(minimum_x, requested.x)),
    y: Math.min(maximum_y, Math.max(minimum_y, requested.y)),
  };
}
function isValidAlignment(
  value: unknown,
): value is AlignElementsToCanvasInput["alignment"] {
  return ["left", "center", "right", "top", "middle", "bottom"].includes(
    value as string,
  );
}
function getAlignedPosition(
  element: PresentationElement,
  canvas: PresentationState["canvas"],
  alignment: AlignElementsToCanvasInput["alignment"],
): import("./types").ElementPosition {
  if (alignment === "left") return { x: 0, y: element.position.y };
  if (alignment === "center")
    return {
      x: (canvas.width - element.size.width) / 2,
      y: element.position.y,
    };
  if (alignment === "right")
    return { x: canvas.width - element.size.width, y: element.position.y };
  if (alignment === "top") return { x: element.position.x, y: 0 };
  if (alignment === "middle")
    return {
      x: element.position.x,
      y: (canvas.height - element.size.height) / 2,
    };
  return { x: element.position.x, y: canvas.height - element.size.height };
}
function getReferenceAlignedPosition(
  element: PresentationElement,
  reference: PresentationElement,
  alignment: AlignElementsToCanvasInput["alignment"],
): import("./types").ElementPosition {
  if (alignment === "left")
    return { x: reference.position.x, y: element.position.y };
  if (alignment === "center")
    return {
      x: reference.position.x + (reference.size.width - element.size.width) / 2,
      y: element.position.y,
    };
  if (alignment === "right")
    return {
      x: reference.position.x + reference.size.width - element.size.width,
      y: element.position.y,
    };
  if (alignment === "top")
    return { x: element.position.x, y: reference.position.y };
  if (alignment === "middle")
    return {
      x: element.position.x,
      y:
        reference.position.y +
        (reference.size.height - element.size.height) / 2,
    };
  return {
    x: element.position.x,
    y: reference.position.y + reference.size.height - element.size.height,
  };
}
function moveElementByLayer(
  state: PresentationState,
  input: BringForwardInput | SendBackwardInput,
  direction: -1 | 1,
  operation_type: "bring-forward" | "send-backward",
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  const target_index = element_index + direction;
  if (target_index < 0 || target_index >= slide.elements.length)
    return failure(state, "LAYER_BOUNDARY");
  const element = slide.elements[element_index];
  const moved_element = { ...element, revision: element.revision + 1 };
  const elements = [...slide.elements];
  elements[element_index] = elements[target_index];
  elements[target_index] = moved_element;
  return succeed(
    state,
    operation_type,
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements,
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: moved_element.revision,
      },
    ],
  );
}
function moveElementToLayer(
  state: PresentationState,
  input: BringToFrontInput | SendToBackInput,
  target_layer: "back" | "front",
  operation_type: "bring-to-front" | "send-to-back",
): CommandResult {
  const slide_index = findSlideIndex(state, input.slideId);
  if (slide_index === -1) return failure(state, "SLIDE_NOT_FOUND");
  const slide = state.slides[slide_index];
  const element_index = findElementIndex(slide, input.elementId);
  if (element_index === -1) return failure(state, "ELEMENT_NOT_FOUND");
  const target_index = target_layer === "back" ? 0 : slide.elements.length - 1;
  if (element_index === target_index) return failure(state, "LAYER_BOUNDARY");
  const element = slide.elements[element_index];
  const moved_element = { ...element, revision: element.revision + 1 };
  const remaining_elements = slide.elements.filter(
    (_, index) => index !== element_index,
  );
  const elements =
    target_layer === "back"
      ? [moved_element, ...remaining_elements]
      : [...remaining_elements, moved_element];
  return succeed(
    state,
    operation_type,
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, slide_index, {
        ...slide,
        revision: slide.revision + 1,
        elements,
      }),
    },
    [
      slideRevisionChange(slide),
      {
        entityType: "element",
        entityId: element.id,
        fromRevision: element.revision,
        toRevision: moved_element.revision,
      },
    ],
  );
}
function succeed(
  previous_state: PresentationState,
  operation_type: PresentationOperation["type"],
  metadata: { readonly source?: OperationSource; readonly updatedAt: string },
  state: Omit<
    PresentationState,
    "operationSequence" | "undoStack" | "redoStack"
  >,
  changes: readonly EntityRevisionTransition[],
): CommandResult {
  if (
    (metadata.source !== undefined &&
      !isValidOperationSource(metadata.source)) ||
    !isValidTimestamp(metadata.updatedAt) ||
    metadata.updatedAt <= previous_state.updatedAt
  )
    return failure(previous_state, "VALIDATION_ERROR");
  const sequence = previous_state.operationSequence + 1;
  const operation = snapshotOperation({
    id: `operation_${sequence}`,
    sequence,
    type: operation_type,
    source: metadata.source ?? "user",
    changes,
  });
  const next_document = snapshotDocument({
    ...state,
    updatedAt: metadata.updatedAt,
    operationSequence: sequence,
  });
  // Commands are the only mutation authority: each success records immutable
  // before/after documents, so history never depends on caller-owned objects.
  return Object.freeze({
    success: true,
    state: snapshotState(
      addScopedHistory(
        {
          ...next_document,
          undoStack: [
            ...previous_state.undoStack,
            {
              before: snapshotDocument(previous_state),
              after: next_document,
              operation,
            },
          ],
          redoStack: [],
          slideHistories: previous_state.slideHistories,
          presentationHistory: previous_state.presentationHistory,
        },
        previous_state,
        operation,
        next_document,
      ),
    ),
    operation,
  });
}
function addScopedHistory(
  state: PresentationState,
  previous_state: PresentationState,
  operation: PresentationOperation,
  next_document: import("./types").PresentationDocumentState,
): PresentationState {
  const entry: OperationHistoryEntry = {
    before: snapshotDocument(previous_state),
    after: next_document,
    operation,
  };
  if (isPresentationScopedOperation(operation.type))
    return {
      ...state,
      presentationHistory: {
        undoStack: [...previous_state.presentationHistory.undoStack, entry],
        redoStack: [],
      },
    };
  const slide_id = getOperationSlideId(entry);
  if (slide_id === null) return state;
  const history = previous_state.slideHistories[slide_id] ?? {
    undoStack: [],
    redoStack: [],
  };
  return {
    ...state,
    slideHistories: {
      ...previous_state.slideHistories,
      [slide_id]: { undoStack: [...history.undoStack, entry], redoStack: [] },
    },
  };
}
function isPresentationScopedOperation(
  type: PresentationOperation["type"],
): boolean {
  return [
    "create-slide",
    "delete-slide",
    "duplicate-slide",
    "reorder-slide",
    "rename-presentation",
  ].includes(type);
}
function getOperationSlideId(entry: OperationHistoryEntry): string | null {
  const ids = new Set<string>();
  for (const change of entry.operation.changes) {
    if (change.entityType === "slide") ids.add(change.entityId);
    if (change.entityType === "element") {
      const owner = [entry.before, entry.after]
        .flatMap((document) => document.slides)
        .find((slide) =>
          slide.elements.some((element) => element.id === change.entityId),
        );
      if (owner !== undefined) ids.add(owner.id);
    }
  }
  return ids.size === 1 ? (ids.values().next().value ?? null) : null;
}
function restoreScopedHistoryEntry(
  state: PresentationState,
  slide_id: string,
  operation_type: "undo" | "redo",
  input: HistoryCommandInput,
): CommandResult {
  const history = state.slideHistories[slide_id];
  const entry =
    history?.[operation_type === "undo" ? "undoStack" : "redoStack"].at(-1);
  if (entry === undefined)
    return failure(
      state,
      operation_type === "undo" ? "UNDO_NOT_AVAILABLE" : "REDO_NOT_AVAILABLE",
    );
  const snapshot = operation_type === "undo" ? entry.before : entry.after;
  const slide = snapshot.slides.find((current) => current.id === slide_id);
  const index = findSlideIndex(state, slide_id);
  if (slide === undefined || index === -1)
    return failure(
      state,
      operation_type === "undo" ? "UNDO_NOT_AVAILABLE" : "REDO_NOT_AVAILABLE",
    );
  return restoreScopedState(
    state,
    entry,
    operation_type,
    input,
    {
      ...state,
      slides: replaceSlide(state.slides, index, slide),
    },
    {
      ...state.slideHistories,
      [slide_id]: {
        undoStack:
          operation_type === "undo"
            ? history.undoStack.slice(0, -1)
            : [...history.undoStack, entry],
        redoStack:
          operation_type === "undo"
            ? [...history.redoStack, entry]
            : history.redoStack.slice(0, -1),
      },
    },
    state.presentationHistory,
  );
}
function restorePresentationHistoryEntry(
  state: PresentationState,
  operation_type: "undo" | "redo",
  input: HistoryCommandInput,
): CommandResult {
  const history = state.presentationHistory;
  const entry =
    history[operation_type === "undo" ? "undoStack" : "redoStack"].at(-1);
  if (entry === undefined)
    return failure(
      state,
      operation_type === "undo" ? "UNDO_NOT_AVAILABLE" : "REDO_NOT_AVAILABLE",
    );
  const target = operation_type === "undo" ? entry.before : entry.after;
  const existing = new Map(state.slides.map((slide) => [slide.id, slide]));
  const slides = target.slides.map((slide) => existing.get(slide.id) ?? slide);
  return restoreScopedState(
    state,
    entry,
    operation_type,
    input,
    {
      ...state,
      title: target.title,
      slides,
    },
    state.slideHistories,
    {
      undoStack:
        operation_type === "undo"
          ? history.undoStack.slice(0, -1)
          : [...history.undoStack, entry],
      redoStack:
        operation_type === "undo"
          ? [...history.redoStack, entry]
          : history.redoStack.slice(0, -1),
    },
  );
}
function restoreScopedState(
  state: PresentationState,
  entry: OperationHistoryEntry,
  operation_type: "undo" | "redo",
  input: HistoryCommandInput,
  document: PresentationState,
  slide_histories: PresentationState["slideHistories"],
  presentation_history: PresentationState["presentationHistory"],
): CommandResult {
  if (input.source !== undefined && !isValidOperationSource(input.source))
    return failure(state, "VALIDATION_ERROR");
  const sequence = state.operationSequence + 1;
  const operation = snapshotOperation({
    id: `operation_${sequence}`,
    sequence,
    type: operation_type,
    source: input.source ?? "user",
    changes:
      operation_type === "undo"
        ? entry.operation.changes.map(reverseRevisionChange)
        : entry.operation.changes,
  });
  return Object.freeze({
    success: true,
    state: snapshotState({
      ...document,
      operationSequence: sequence,
      // Legacy complete-document history cannot remain coherent after a scoped
      // restoration. Scoped stacks preserve the actionable history instead.
      undoStack: [],
      redoStack: [],
      slideHistories: slide_histories,
      presentationHistory: presentation_history,
    }),
    operation,
  });
}
function restoreHistoryEntry(
  state: PresentationState,
  input: HistoryCommandInput,
  entry: OperationHistoryEntry,
  operation_type: "undo" | "redo",
): CommandResult {
  if (input.source !== undefined && !isValidOperationSource(input.source))
    return failure(state, "VALIDATION_ERROR");
  const sequence = state.operationSequence + 1;
  const operation = snapshotOperation({
    id: `operation_${sequence}`,
    sequence,
    type: operation_type,
    source: input.source ?? "user",
    changes:
      operation_type === "undo"
        ? entry.operation.changes.map(reverseRevisionChange)
        : entry.operation.changes,
  });
  const restored_document = snapshotDocument({
    // Undo/redo restore complete logical snapshots rather than replaying a
    // command, preserving the exact state that was originally validated.
    ...(operation_type === "undo" ? entry.before : entry.after),
    operationSequence: sequence,
  });
  return Object.freeze({
    success: true,
    state: snapshotState({
      ...restored_document,
      undoStack:
        operation_type === "undo"
          ? state.undoStack.slice(0, -1)
          : [...state.undoStack, entry],
      redoStack:
        operation_type === "undo"
          ? [...state.redoStack, entry]
          : state.redoStack.slice(0, -1),
      slideHistories: state.slideHistories,
      presentationHistory: state.presentationHistory,
    }),
    operation,
  });
}
function failure(
  state: PresentationState,
  code: PresentationCoreErrorCode,
): CommandFailure {
  return Object.freeze({
    success: false,
    state: snapshotState(state),
    error: Object.freeze({ code }),
  });
}
function failureWithoutState(
  code: PresentationCoreErrorCode,
): CreatePresentationResult {
  return Object.freeze({ success: false, error: Object.freeze({ code }) });
}
function failureWithoutIntent(
  code: PresentationCoreErrorCode,
): CreatePresentationDeletionIntentResult {
  return Object.freeze({ success: false, error: Object.freeze({ code }) });
}
