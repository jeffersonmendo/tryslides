import type {
  ElementPatch,
  PresentationElement,
  PresentationState,
  SlideBackground,
  SlideTransition,
} from "@/features/presentations/core/presentation-core";

export type EditorIntentDraft =
  | {
      readonly kind: "text";
      readonly slideId: string;
      readonly elementId: string;
      readonly content: string;
    }
  | {
      readonly kind: "element";
      readonly slideId: string;
      readonly elementIds: readonly string[];
      readonly patch: ElementPatch;
    }
  | {
      readonly kind: "slide";
      readonly slideId: string;
      readonly patch: {
        readonly background?: SlideBackground;
        readonly transition?: SlideTransition;
      };
    };

/** Returns a rendered working copy without changing the authoritative Core state. */
export function getEffectivePresentationState(
  state: PresentationState | null,
  drafts: ReadonlyMap<string, EditorIntentDraft>,
): PresentationState | null {
  if (state === null || drafts.size === 0) return state;
  const drafts_by_slide = new Map<string, EditorIntentDraft[]>();
  for (const draft of drafts.values()) {
    const current = drafts_by_slide.get(draft.slideId) ?? [];
    current.push(draft);
    drafts_by_slide.set(draft.slideId, current);
  }
  return {
    ...state,
    slides: state.slides.map((slide) => {
      const slide_drafts = drafts_by_slide.get(slide.id);
      if (slide_drafts === undefined) return slide;
      const drafted_slide = slide_drafts.reduce(applyDraftToSlide, slide);
      return {
        ...drafted_slide,
        elements: drafted_slide.elements.map((element) =>
          slide_drafts.reduce(applyDraftToElement, element),
        ),
      };
    }),
  };
}

function applyDraftToSlide(
  slide: PresentationState["slides"][number],
  draft: EditorIntentDraft,
): PresentationState["slides"][number] {
  if (draft.kind !== "slide") return slide;
  return { ...slide, ...draft.patch };
}

function applyDraftToElement(
  element: PresentationElement,
  draft: EditorIntentDraft,
): PresentationElement {
  if (draft.kind === "text")
    return element.type === "text" && element.id === draft.elementId
      ? { ...element, content: draft.content }
      : element;
  if (draft.kind === "slide") return element;
  if (!draft.elementIds.includes(element.id)) return element;
  return {
    ...element,
    ...draft.patch,
    style:
      draft.patch.style === undefined
        ? element.style
        : { ...element.style, ...draft.patch.style },
  } as PresentationElement;
}
