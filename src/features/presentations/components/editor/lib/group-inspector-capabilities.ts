import type { EditorElement } from "./editor-model";

export type GroupInspectorCapabilities = {
  readonly text: boolean;
  readonly image: boolean;
  readonly shape: boolean;
  readonly shapeBorder: boolean;
  readonly shapeRadius: boolean;
};

const LINE_SHAPE_TYPES = new Set([
  "line",
  "arrow",
  "double-arrow",
  "plus",
  "minus",
  "multiply",
  "divide",
  "equal",
  "not-equal",
]);

/** Returns only properties that are meaningful for every selected element. */
export function getGroupInspectorCapabilities(
  elements: readonly EditorElement[],
): GroupInspectorCapabilities {
  const text =
    elements.length > 0 && elements.every((element) => element.type === "text");
  const image =
    elements.length > 0 &&
    elements.every((element) => element.type === "image");
  const shape_elements = elements.filter(
    (element): element is Extract<EditorElement, { readonly type: "shape" }> =>
      element.type === "shape",
  );
  const shape =
    shape_elements.length === elements.length && elements.length > 0;

  return {
    text,
    image,
    shape,
    shapeBorder:
      shape &&
      shape_elements.every(
        (element) => !LINE_SHAPE_TYPES.has(element.shapeType),
      ),
    shapeRadius:
      shape &&
      shape_elements.every((element) => element.shapeType === "rectangle"),
  };
}
