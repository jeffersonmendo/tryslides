import type {
  OperationHistoryEntry,
  PresentationDocumentState,
  PresentationOperation,
} from "./types";

/**
 * Returns whether a logical history entry affects exactly the requested slide.
 * Presentation-only, multi-slide, and unrecognized operations stay global.
 */
export function isHistoryEntryApplicableToSlide(
  entry: OperationHistoryEntry,
  slide_id: string,
): boolean {
  if (!isSlideScopedOperation(entry.operation)) return false;

  const snapshot_slide_ids = getChangedSlideIds(entry.before, entry.after);
  const operation_slide_ids = getOperationSlideIds(entry);

  return (
    snapshot_slide_ids.size === 1 &&
    operation_slide_ids?.size === 1 &&
    snapshot_slide_ids.has(slide_id) &&
    operation_slide_ids.has(slide_id)
  );
}

function isSlideScopedOperation(
  operation: PresentationOperation | null | undefined,
): boolean {
  if (operation === null || operation === undefined) return false;

  switch (operation.type) {
    case "create-slide":
    case "edit-slide":
    case "delete-slide":
    case "duplicate-slide":
    case "reorder-slide":
    case "create-element":
    case "create-elements":
    case "edit-element":
    case "edit-elements":
    case "delete-element":
    case "duplicate-element":
    case "reorder-element":
    case "bring-forward":
    case "send-backward":
    case "move-element":
    case "resize-element":
    case "replace-asset":
    case "configure-animation":
    case "configure-transition":
      return true;
    case "rename-presentation":
    case "undo":
    case "redo":
      return false;
    default:
      return false;
  }
}

function getChangedSlideIds(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
): ReadonlySet<string> {
  const before_slides = new Map(
    before.slides.map((slide) => [slide.id, slide]),
  );
  const after_slides = new Map(after.slides.map((slide) => [slide.id, slide]));
  const slide_ids = new Set([...before_slides.keys(), ...after_slides.keys()]);
  const changed_slide_ids = new Set<string>();

  for (const id of slide_ids) {
    const before_slide = before_slides.get(id);
    const after_slide = after_slides.get(id);
    if (
      before_slide === undefined ||
      after_slide === undefined ||
      JSON.stringify(before_slide) !== JSON.stringify(after_slide)
    )
      changed_slide_ids.add(id);
  }

  for (
    let index = 0;
    index < Math.max(before.slides.length, after.slides.length);
    index++
  ) {
    if (before.slides[index]?.id !== after.slides[index]?.id) {
      const before_id = before.slides[index]?.id;
      const after_id = after.slides[index]?.id;
      if (before_id !== undefined) changed_slide_ids.add(before_id);
      if (after_id !== undefined) changed_slide_ids.add(after_id);
    }
  }

  return changed_slide_ids;
}

function getOperationSlideIds(
  entry: OperationHistoryEntry,
): ReadonlySet<string> | null {
  if (!Array.isArray(entry.operation.changes)) return null;

  const slide_ids = new Set<string>();

  for (const change of entry.operation.changes) {
    if (change.entityType === "presentation") continue;
    if (change.entityType === "slide") {
      if (
        !hasSlide(entry.before, change.entityId) &&
        !hasSlide(entry.after, change.entityId)
      )
        return null;
      slide_ids.add(change.entityId);
      continue;
    }
    if (change.entityType === "element") {
      const owners = getElementOwnerSlideIds(
        entry.before,
        entry.after,
        change.entityId,
      );
      if (owners.size !== 1) return null;
      for (const owner of owners) slide_ids.add(owner);
      continue;
    }
    return null;
  }

  return slide_ids;
}

function hasSlide(state: PresentationDocumentState, slide_id: string): boolean {
  return state.slides.some((slide) => slide.id === slide_id);
}

function getElementOwnerSlideIds(
  before: PresentationDocumentState,
  after: PresentationDocumentState,
  element_id: string,
): ReadonlySet<string> {
  const slide_ids = new Set<string>();
  for (const state of [before, after]) {
    for (const slide of state.slides) {
      if (slide.elements.some((element) => element.id === element_id))
        slide_ids.add(slide.id);
    }
  }
  return slide_ids;
}
