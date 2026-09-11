import { getAnimationCapability } from "./capabilities/animation";
import type {
  AnimationCategory,
  AnimationConfiguration,
  EntityRevisionTransition,
  NewPresentationElement,
  OperationHistoryEntry,
  PresentationDocumentState,
  PresentationElement,
  PresentationOperation,
  PresentationState,
  Slide,
} from "./types";

export function findSlideIndex(
  state: PresentationState,
  slide_id: string,
): number {
  return state.slides.findIndex((slide) => slide.id === slide_id);
}
export function findElementIndex(slide: Slide, element_id: string): number {
  return slide.elements.findIndex((element) => element.id === element_id);
}
export function replaceSlide(
  slides: readonly Slide[],
  slide_index: number,
  slide: Slide,
): Slide[] {
  return slides.map((current_slide, index) =>
    index === slide_index ? slide : current_slide,
  );
}
export function addInitialRevision(
  element: NewPresentationElement,
): PresentationElement {
  if (element.type === "text") {
    return {
      ...element,
      revision: 1,
      animations: [],
      style: {
        role: "Paragraph",
        font: "Arial",
        fontSize: 16,
        fontWeight: 400,
        color: "#000000",
        alignment: "left",
        ...element.style,
      },
    };
  }

  if (element.type === "image") {
    return {
      ...element,
      revision: 1,
      animations: [],
      style: { objectFit: "cover", borderRadius: 0, ...element.style },
    };
  }

  return {
    ...element,
    revision: 1,
    animations: [],
    style: {
      fill: "#000000",
      border: "transparent",
      borderWidth: 0,
      radius: 0,
      ...element.style,
    },
  };
}
export function replaceAnimationForCategory(
  animations: readonly AnimationConfiguration[],
  category: AnimationCategory,
  configuration: AnimationConfiguration,
): AnimationConfiguration[] {
  // An element has one declarative animation per category; a new configuration
  // replaces that category without affecting entrance, exit, or continuous peers.
  return [
    ...animations.filter(
      (animation) =>
        getAnimationCapability(animation.type)?.category !== category,
    ),
    configuration,
  ];
}
export function presentationRevisionChange(
  state: PresentationState,
): EntityRevisionTransition {
  return {
    entityType: "presentation",
    entityId: state.id,
    fromRevision: state.revision,
    toRevision: state.revision + 1,
  };
}
export function slideRevisionChange(slide: Slide): EntityRevisionTransition {
  return {
    entityType: "slide",
    entityId: slide.id,
    fromRevision: slide.revision,
    toRevision: slide.revision + 1,
  };
}
export function reverseRevisionChange(
  change: EntityRevisionTransition,
): EntityRevisionTransition {
  return {
    entityType: change.entityType,
    entityId: change.entityId,
    fromRevision: change.toRevision,
    toRevision: change.fromRevision,
  };
}
export function snapshotState(state: PresentationState): PresentationState {
  // Returned Core state is a deep immutable boundary, including retained
  // history, so external consumers cannot mutate current or recoverable state.
  return Object.freeze({
    ...snapshotDocument(state),
    undoStack: Object.freeze(state.undoStack.map(snapshotHistoryEntry)),
    redoStack: Object.freeze(state.redoStack.map(snapshotHistoryEntry)),
    slideHistories: snapshotSlideHistories(state.slideHistories),
    presentationHistory: snapshotScopedHistory(state.presentationHistory),
  });
}
function snapshotSlideHistories(
  histories: Readonly<Record<string, import("./types").ScopedHistory>>,
): Readonly<Record<string, import("./types").ScopedHistory>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(histories).map(([slide_id, history]) => [
        slide_id,
        snapshotScopedHistory(history),
      ]),
    ),
  );
}
function snapshotScopedHistory(
  history: import("./types").ScopedHistory,
): import("./types").ScopedHistory {
  return Object.freeze({
    undoStack: Object.freeze(history.undoStack.map(snapshotHistoryEntry)),
    redoStack: Object.freeze(history.redoStack.map(snapshotHistoryEntry)),
  });
}
export function snapshotDocument(
  state: PresentationDocumentState,
): PresentationDocumentState {
  return Object.freeze({
    id: state.id,
    publicId: state.publicId,
    title: state.title,
    revision: state.revision,
    canvas: Object.freeze({ ...state.canvas }),
    slides: Object.freeze(state.slides.map(snapshotSlide)),
    operationSequence: state.operationSequence,
    status: state.status,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    lastSavedAt: state.lastSavedAt,
    lastPublishedAt: state.lastPublishedAt,
  });
}
export function snapshotOperation(
  operation: PresentationOperation,
): PresentationOperation {
  return Object.freeze({
    ...operation,
    changes: Object.freeze(
      operation.changes.map((change) => Object.freeze({ ...change })),
    ),
  });
}
function snapshotHistoryEntry(
  entry: OperationHistoryEntry,
): OperationHistoryEntry {
  return Object.freeze({
    before: snapshotDocument(entry.before),
    after: snapshotDocument(entry.after),
    operation: snapshotOperation(entry.operation),
  });
}
function snapshotSlide(slide: Slide): Slide {
  return Object.freeze({
    id: slide.id,
    revision: slide.revision,
    background: snapshotBackground(slide.background),
    transition: Object.freeze({ ...slide.transition }),
    elements: Object.freeze(slide.elements.map(snapshotElement)),
  });
}
function snapshotElement(element: PresentationElement): PresentationElement {
  const base = {
    id: element.id,
    revision: element.revision,
    position: Object.freeze({ ...element.position }),
    size: Object.freeze({ ...element.size }),
    rotation: element.rotation,
    opacity: element.opacity,
    animations: Object.freeze(
      element.animations.map((animation) => Object.freeze({ ...animation })),
    ),
  };
  if (element.type === "text")
    return Object.freeze({
      ...base,
      type: "text" as const,
      content: element.content,
      style: snapshotTextStyle(element.style),
    });
  if (element.type === "image")
    return Object.freeze({
      ...base,
      type: "image" as const,
      assetId: element.assetId,
      style: snapshotImageStyle(element.style),
    });
  return Object.freeze({
    ...base,
    type: "shape" as const,
    shapeType: element.shapeType,
    style: snapshotShapeStyle(element.style),
  });
}
function snapshotBackground(slide_background: Slide["background"]) {
  return Object.freeze({ ...slide_background });
}
function snapshotTextStyle(
  style: Extract<PresentationElement, { type: "text" }>["style"],
) {
  return Object.freeze({ ...style });
}
function snapshotImageStyle(
  style: Extract<PresentationElement, { type: "image" }>["style"],
) {
  return Object.freeze({ ...style });
}
function snapshotShapeStyle(
  style: Extract<PresentationElement, { type: "shape" }>["style"],
) {
  return Object.freeze({ ...style });
}
