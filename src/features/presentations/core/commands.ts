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
  BringForwardInput,
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
  DeleteSlideInput,
  DuplicateElementInput,
  DuplicateSlideInput,
  EditElementInput,
  EditElementsInput,
  EditSlideInput,
  EntityRevisionTransition,
  HistoryCommandInput,
  MoveElementInput,
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
  SendBackwardInput,
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
        !isValidIdentifier(replacement_id),
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
        ...state.slides,
        {
          id: input.id,
          revision: 1,
          background: slide.background,
          transition: slide.transition,
          elements,
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
    state: snapshotState({
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
