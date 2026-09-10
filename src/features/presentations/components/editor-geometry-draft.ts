import {
  type ElementPatch,
  PRESENTATION_CANVAS,
  type PresentationElement,
} from "@/features/presentations/core/presentation-core";

export function hasGeometryPatch(patch: ElementPatch): boolean {
  return patch.position !== undefined || patch.size !== undefined;
}

/**
 * Keeps ephemeral inspector geometry within the same controlled-overflow
 * envelope that the Core validates for the final command.
 */
export function normalizeGeometryDraftPatch(
  element: PresentationElement,
  patch: ElementPatch,
): ElementPatch {
  if (!hasGeometryPatch(patch)) return patch;

  const size = patch.size ?? element.size;
  const position = patch.position ?? element.position;

  return {
    ...patch,
    position: {
      x: clamp(
        position.x,
        -size.width / 2,
        PRESENTATION_CANVAS.width - size.width / 2,
      ),
      y: clamp(
        position.y,
        -size.height / 2,
        PRESENTATION_CANVAS.height - size.height / 2,
      ),
    },
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
