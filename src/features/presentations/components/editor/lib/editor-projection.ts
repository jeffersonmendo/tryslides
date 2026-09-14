import type {
  AnimationConfiguration,
  Slide,
  TextElement,
} from "@/features/presentations/core/presentation-core";
import type {
  EditorAnimation,
  EditorSlide,
  EditorTextElement,
} from "./editor-model";

export function toEditorSlide(slide: Slide, index: number): EditorSlide {
  return {
    id: slide.id,
    number: index + 1,
    backgroundStyle:
      slide.background.type === "solid"
        ? slide.background.color
        : slide.background.gradient,
    background: slide.background,
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
          animations: element.animations.map(toEditorAnimation),
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
        animations: element.animations.map(toEditorAnimation),
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
      fontFamily: element.style.fontFamily,
      fontSize: element.style.fontSize,
      fontWeight: element.style.fontWeight,
      lineHeight: element.style.lineHeight,
      letterSpacing: element.style.letterSpacing,
      color: element.style.color,
      alignment: element.style.alignment,
    },
    animations: element.animations.map(toEditorAnimation),
  };
}

export function toEditorAnimation(
  animation: AnimationConfiguration,
): EditorAnimation {
  return {
    type: animation.type,
    duration: animation.duration,
    delay: animation.delay,
    easing: animation.easing,
    ...(animation.repeat === undefined ? {} : { repeat: animation.repeat }),
    ...(animation.interval === undefined
      ? {}
      : { interval: animation.interval }),
  };
}
