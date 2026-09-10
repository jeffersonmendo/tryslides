import type {
  Slide,
  TextElement,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import type { EditorSlide, EditorTextElement } from "./editor-model";

export function toEditorSlide(
  slide: Slide,
  index: number,
  aria_label: string,
  transition_labels: Readonly<Record<TransitionType, string>>,
): EditorSlide {
  return {
    id: slide.id,
    number: index + 1,
    ariaLabel: aria_label,
    backgroundStyle:
      slide.background.type === "solid"
        ? slide.background.color
        : slide.background.gradient,
    background: slide.background,
    transitionLabel: transition_labels[slide.transition.type],
    transitionType: slide.transition.type,
    transitionDuration: slide.transition.duration,
    elements: slide.elements.map((element) => {
      if (element.type === "text") return toEditorTextElement(element);
      if (element.type === "image")
        return {
          id: element.id,
          type: "image" as const,
          assetId: element.assetId,
          position: element.position,
          size: element.size,
          opacity: element.opacity,
          rotation: element.rotation,
          style: element.style,
          animations: element.animations.map((animation) => ({
            type: animation.type,
            duration: animation.duration,
          })),
        };
      return {
        id: element.id,
        type: "shape" as const,
        shapeType: element.shapeType,
        position: element.position,
        size: element.size,
        opacity: element.opacity,
        rotation: element.rotation,
        style: element.style,
        animations: element.animations.map((animation) => ({
          type: animation.type,
          duration: animation.duration,
        })),
      };
    }),
  };
}

function toEditorTextElement(element: TextElement): EditorTextElement {
  return {
    id: element.id,
    type: "text",
    content: element.content,
    position: element.position,
    size: element.size,
    opacity: element.opacity,
    rotation: element.rotation,
    style: {
      role: element.style.role,
      fontSize: element.style.fontSize,
      fontWeight: element.style.fontWeight,
      color: element.style.color,
      alignment: element.style.alignment,
    },
  };
}
