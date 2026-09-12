import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { EditorElement, EditorTextElement } from "./editor-model";
import { ElementInspector } from "./element-inspector";
import { GroupInspector } from "./group-inspector";
import { TextInspector } from "./text-inspector";

const labels = {
  alignment: "Alignment",
  alignmentCenter: "Center",
  alignmentLeft: "Left",
  alignmentRight: "Right",
  layoutAlign: "Layout",
  color: "Color",
  content: "Content",
  fontSize: "Font size",
  fontWeight: "Font weight",
  fontWeightBold: "Bold",
  fontWeightRegular: "Regular",
  role: "Role",
  textRoleH1: "H1",
  textRoleH2: "H2",
  textRoleH3: "H3",
  textRoleParagraph: "Paragraph",
  position: "Position",
  x: "X",
  y: "Y",
  centerHorizontally: "Center horizontally",
  centerVertically: "Center vertically",
  alignLeft: "Align left",
  alignRight: "Align right",
  alignTop: "Align top",
  alignBottom: "Align bottom",
  size: "Size",
  width: "Width",
  height: "Height",
  properties: "Properties",
  appearance: "Appearance",
  layers: "Layers",
  transform: "Transform",
  moveForward: "Move forward",
  moveBackward: "Move backward",
  bringToFront: "Bring to front",
  sendToBack: "Send to back",
  rotation: "Rotation",
  opacity: "Opacity",
  shapeType: "Shape type",
  shapeRectangle: "Rectangle",
  shapeCircle: "Circle",
  shapeTriangle: "Triangle",
  shapeDiamond: "Diamond",
  shapeStar: "Star",
  shapeHeart: "Heart",
  shapeLine: "Line",
  shapeArrow: "Arrow",
  shapeDoubleArrow: "Double arrow",
  shapeSpeechBubble: "Speech bubble",
  shapeRoundBubble: "Round bubble",
  shapePlus: "Plus",
  shapeMinus: "Minus",
  shapeMultiply: "Multiply",
  shapeDivide: "Divide",
  shapeEqual: "Equal",
  shapeNotEqual: "Not equal",
  fill: "Fill",
  border: "Border",
  borderWidth: "Border width",
  radius: "Radius",
  fit: "Fit",
  fitContain: "Contain",
  fitCover: "Cover",
  alignToCanvas: "Align to canvas",
  alignToReference: "Align to reference",
  referenceAlignmentInstruction: "Choose a reference",
  referenceAlignmentSelected: "Reference selected",
  distribution: "Distribution",
  distributeHorizontally: "Distribute horizontally",
  distributeVertically: "Distribute vertically",
  gap: "Gap",
  referenceAlignmentInstructionPrefix: "Use",
  referenceAlignmentHint: "to set or replace the alignment reference.",
  referenceAlignmentStatusNone: "No alignment reference is set.",
  referenceAlignmentStatusSet: "An alignment reference is set.",
  referenceAlignmentShortcut: "Shift-click",
  shiftKey: "Shift",
  clickLabel: "Click",
} as const;

const text: EditorTextElement = {
  id: "text",
  type: "text",
  content: "Text",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 40 },
  opacity: 1,
  rotation: 0,
  style: {
    role: "Paragraph",
    fontSize: 16,
    fontWeight: 400,
    color: "#000000",
    alignment: "left",
  },
};
const image: Extract<EditorElement, { readonly type: "image" }> = {
  id: "image",
  type: "image",
  assetId: "asset",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 40 },
  opacity: 1,
  rotation: 0,
  style: { objectFit: "cover", borderRadius: 0 },
  animations: [],
};
const rectangle: Extract<EditorElement, { readonly type: "shape" }> = {
  id: "rectangle",
  type: "shape",
  shapeType: "rectangle",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 40 },
  opacity: 1,
  rotation: 0,
  style: { fill: "#000000", border: "#000000", borderWidth: 1, radius: 0 },
  animations: [],
};
const line: Extract<EditorElement, { readonly type: "shape" }> = {
  ...rectangle,
  id: "line",
  shapeType: "line",
};

function sectionNames(container: HTMLElement): string[] {
  return [...container.querySelectorAll("fieldset > legend")].map(
    (legend) => legend.textContent ?? "",
  );
}

function sectionContaining(container: HTMLElement, text: string): HTMLElement {
  const section = [...container.querySelectorAll<HTMLElement>("fieldset")].find(
    (field_set) => field_set.textContent?.includes(text),
  );
  if (section === undefined)
    throw new Error(`Missing section containing ${text}`);
  return section;
}

const noop = () => undefined;
const text_props = {
  acceptedColor: "#000000",
  elementCount: 2,
  elementIndex: 0,
  labels,
  onBringForward: noop,
  onBringToFront: noop,
  onAlign: noop,
  onContentChange: noop,
  onContentCommit: noop,
  onPatch: noop,
  onPatchCommit: noop,
  onPositionChange: noop,
  onSendBackward: noop,
  onSendToBack: noop,
  onSizeChange: noop,
  onStyleApply: noop,
  onStyleChange: noop,
  onStyleCommit: noop,
};
const element_props = {
  acceptedElement: null,
  elementCount: 2,
  elementIndex: 0,
  labels,
  onAlign: noop,
  onBringForward: noop,
  onBringToFront: noop,
  onPatch: noop,
  onPatchCommit: noop,
  onSendBackward: noop,
  onSendToBack: noop,
};
const group_props = {
  labels,
  referenceElementId: null,
  onAlignToCanvas: noop,
  onAlignToReference: noop,
  onDistribute: noop,
  onOpacity: noop,
  onPatchCommit: noop,
  onRotate: noop,
};

test.afterEach(() => cleanup());

test("places text content, transform, and appearance in semantic order", () => {
  const { container } = render(<TextInspector {...text_props} text={text} />);
  assert.deepEqual(sectionNames(container), [
    "Content",
    "Transform",
    "Appearance",
  ]);
  assert.match(
    sectionContaining(container, "Content").textContent ?? "",
    /Role/,
  );
  assert.match(
    sectionContaining(container, "Appearance").textContent ?? "",
    /Opacity[\s\S]*Font size/,
  );
  const transform = sectionContaining(container, "Transform");
  assert.match(
    transform.textContent ?? "",
    /Position[\s\S]*Size[\s\S]*Layout[\s\S]*Layers[\s\S]*Rotation/,
  );
  assert.ok(transform.querySelector('[aria-label="Align left"]'));
  assert.ok(transform.querySelector('[aria-label="Move forward"]'));
  assert.deepEqual(sectionNames(container), [
    "Content",
    "Transform",
    "Appearance",
  ]);
});

test("keeps image and shape type content separate from appearance and preserves shape restrictions", () => {
  const image_result = render(
    <ElementInspector {...element_props} element={image} />,
  );
  assert.deepEqual(sectionNames(image_result.container), [
    "Transform",
    "Appearance",
  ]);
  assert.match(
    sectionContaining(image_result.container, "Transform").textContent ?? "",
    /Layout[\s\S]*Layers/,
  );
  assert.match(
    sectionContaining(image_result.container, "Appearance").textContent ?? "",
    /Opacity[\s\S]*Fit[\s\S]*Radius/,
  );
  cleanup();

  const rectangle_result = render(
    <ElementInspector {...element_props} element={rectangle} />,
  );
  assert.deepEqual(sectionNames(rectangle_result.container), [
    "Content",
    "Transform",
    "Appearance",
  ]);
  assert.match(
    sectionContaining(rectangle_result.container, "Content").textContent ?? "",
    /Shape type/,
  );
  assert.doesNotMatch(
    sectionContaining(rectangle_result.container, "Appearance").textContent ??
      "",
    /Shape type/,
  );
  assert.match(
    sectionContaining(rectangle_result.container, "Appearance").textContent ??
      "",
    /Fill[\s\S]*Border[\s\S]*Border width[\s\S]*Radius/,
  );
  cleanup();

  const line_result = render(
    <ElementInspector {...element_props} element={line} />,
  );
  assert.doesNotMatch(
    sectionContaining(line_result.container, "Appearance").textContent ?? "",
    /Border(?! width)|Radius/,
  );
});

test("keeps group transform controls together while capability intersections control type-specific fields", () => {
  const heterogeneous = render(
    <GroupInspector {...group_props} elements={[text, image]} />,
  );
  assert.deepEqual(sectionNames(heterogeneous.container), [
    "Transform",
    "Appearance",
  ]);
  assert.match(
    sectionContaining(heterogeneous.container, "Appearance").textContent ?? "",
    /Opacity/,
  );
  const heterogeneous_transform = sectionContaining(
    heterogeneous.container,
    "Transform",
  );
  assert.match(
    heterogeneous_transform.textContent ?? "",
    /Rotation[\s\S]*Align to canvas[\s\S]*Distribution[\s\S]*Align to reference/,
  );
  assert.doesNotMatch(
    heterogeneous.container.textContent ?? "",
    /Layout|Layers/,
  );
  cleanup();

  const text_group = render(
    <GroupInspector
      {...group_props}
      elements={[text, { ...text, id: "text-2" }]}
    />,
  );
  assert.deepEqual(sectionNames(text_group.container), [
    "Content",
    "Transform",
    "Appearance",
  ]);
  assert.match(
    sectionContaining(text_group.container, "Content").textContent ?? "",
    /Role/,
  );
  assert.match(
    sectionContaining(text_group.container, "Appearance").textContent ?? "",
    /Opacity[\s\S]*Font size/,
  );
  cleanup();

  const image_group = render(
    <GroupInspector
      {...group_props}
      elements={[image, { ...image, id: "image-2" }]}
    />,
  );
  assert.match(
    sectionContaining(image_group.container, "Appearance").textContent ?? "",
    /Opacity[\s\S]*Fit[\s\S]*Radius/,
  );
  cleanup();

  const shape_group = render(
    <GroupInspector
      {...group_props}
      elements={[rectangle, { ...rectangle, id: "rectangle-2" }]}
    />,
  );
  assert.match(
    sectionContaining(shape_group.container, "Content").textContent ?? "",
    /Shape type/,
  );
  assert.doesNotMatch(
    sectionContaining(shape_group.container, "Appearance").textContent ?? "",
    /Shape type/,
  );
  assert.match(
    sectionContaining(shape_group.container, "Appearance").textContent ?? "",
    /Opacity[\s\S]*Fill[\s\S]*Border[\s\S]*Radius/,
  );
  assert.doesNotMatch(shape_group.container.textContent ?? "", /Layout|Layers/);
});

test("enables distribution controls for exactly two selected elements", () => {
  const result = render(
    <GroupInspector {...group_props} elements={[text, image]} />,
  );
  const horizontal_control = result.container.querySelector<HTMLButtonElement>(
    '[aria-label="Distribute horizontally"]',
  );
  const vertical_control = result.container.querySelector<HTMLButtonElement>(
    '[aria-label="Distribute vertically"]',
  );

  assert.equal(horizontal_control?.disabled, false);
  assert.equal(vertical_control?.disabled, false);
  assert.equal(
    result.container.querySelector<HTMLInputElement>('[aria-label="Gap"]')
      ?.disabled,
    false,
  );
});

test("disables distribution controls for fewer than two selected elements", () => {
  const result = render(<GroupInspector {...group_props} elements={[text]} />);

  for (const label of [
    "Distribute horizontally",
    "Distribute vertically",
    "Gap",
  ])
    assert.equal(
      result.container.querySelector<HTMLInputElement>(
        `[aria-label="${label}"]`,
      )?.disabled,
      true,
    );
});

test("keeps one distribution direction active and reapplies its current gap", () => {
  const distributions: [string, number][] = [];
  const result = render(
    <GroupInspector
      {...group_props}
      elements={[text, image]}
      onDistribute={(axis, gap) => distributions.push([axis, gap])}
    />,
  );
  const horizontal = result.container.querySelector<HTMLButtonElement>(
    '[aria-label="Distribute horizontally"]',
  );
  const vertical = result.container.querySelector<HTMLButtonElement>(
    '[aria-label="Distribute vertically"]',
  );
  const gap =
    result.container.querySelector<HTMLInputElement>('[aria-label="Gap"]');

  assert.ok(horizontal);
  assert.ok(vertical);
  assert.ok(gap);
  fireEvent.change(gap, { target: { value: "24" } });
  assert.deepEqual(distributions, []);
  fireEvent.click(horizontal);
  assert.deepEqual(distributions, [["horizontal", 24]]);
  assert.equal(horizontal.getAttribute("aria-pressed"), "true");
  fireEvent.change(gap, { target: { value: "32" } });
  assert.deepEqual(distributions, [
    ["horizontal", 24],
    ["horizontal", 32],
  ]);
  assert.equal(horizontal.getAttribute("aria-pressed"), "true");
  fireEvent.click(vertical);
  assert.deepEqual(distributions, [
    ["horizontal", 24],
    ["horizontal", 32],
    ["vertical", 32],
  ]);
  assert.equal(horizontal.getAttribute("aria-pressed"), "false");
  assert.equal(vertical.getAttribute("aria-pressed"), "true");
});

test("resets distribution interaction state for a different selected group", () => {
  const distributions: [string, number][] = [];
  const result = render(
    <GroupInspector
      {...group_props}
      elements={[text, image]}
      onDistribute={(axis, gap) => distributions.push([axis, gap])}
    />,
  );
  const horizontal_control = result.container.querySelector(
    '[aria-label="Distribute horizontally"]',
  );
  const gap_input = result.container.querySelector('[aria-label="Gap"]');
  assert.ok(horizontal_control);
  assert.ok(gap_input);
  fireEvent.click(horizontal_control);
  fireEvent.change(gap_input, {
    target: { value: "24" },
  });
  result.rerender(
    <GroupInspector
      {...group_props}
      elements={[rectangle, line]}
      onDistribute={(axis, gap) => distributions.push([axis, gap])}
    />,
  );
  const reset_gap_input = result.container.querySelector('[aria-label="Gap"]');
  assert.ok(reset_gap_input);
  fireEvent.change(reset_gap_input, {
    target: { value: "12" },
  });

  assert.deepEqual(distributions, [
    ["horizontal", 0],
    ["horizontal", 24],
  ]);
  assert.equal(
    result.container
      .querySelector('[aria-label="Distribute horizontally"]')
      ?.getAttribute("aria-pressed"),
    "false",
  );
});

test("renders the Shift-click shortcut inside an inline alignment-reference instruction", () => {
  const without_reference = render(
    <GroupInspector {...group_props} elements={[text, image]} />,
  );
  const instruction = without_reference.container.querySelector(
    "#reference-alignment-instruction",
  );
  assert.equal(instruction?.tagName, "P");
  assert.equal(
    instruction?.textContent,
    "Use Shift+Click to set or replace the alignment reference.",
  );
  assert.ok(instruction?.querySelector('[data-slot="kbd-group"]'));
  assert.match(
    without_reference.container.textContent ?? "",
    /No alignment reference is set/,
  );
  assert.equal(
    without_reference.container.querySelectorAll('[data-slot="kbd"]').length,
    2,
  );
  assert.equal(
    without_reference.container.querySelectorAll('[data-slot="kbd-group"]')
      .length,
    1,
  );
  assert.ok(
    sectionContaining(without_reference.container, "Transform").querySelector(
      '[data-slot="kbd-group"]',
    ),
  );
  cleanup();

  const with_reference = render(
    <GroupInspector
      {...group_props}
      elements={[text, image]}
      referenceElementId={text.id}
    />,
  );
  assert.equal(
    with_reference.container.querySelector("#reference-alignment-instruction")
      ?.textContent,
    "Use Shift+Click to set or replace the alignment reference.",
  );
  assert.match(
    with_reference.container.textContent ?? "",
    /An alignment reference is set/,
  );
  const reference_controls =
    with_reference.container.querySelectorAll<HTMLButtonElement>(
      '[aria-describedby~="reference-alignment-status"] button',
    );
  assert.equal(reference_controls.length, 6);
  for (const control of reference_controls)
    assert.equal(control.disabled, false);
});

test("localizes the reference shortcut, replacement hint, and status for English and Spanish", () => {
  const english = JSON.parse(
    readFileSync(
      new URL("../../../../messages/en.json", import.meta.url),
      "utf8",
    ),
  ).Editor;
  const spanish = JSON.parse(
    readFileSync(
      new URL("../../../../messages/es.json", import.meta.url),
      "utf8",
    ),
  ).Editor;

  assert.deepEqual(
    [
      english.referenceAlignmentShortcut,
      english.referenceAlignmentInstructionPrefix,
      english.referenceAlignmentHint,
      english.referenceAlignmentStatusNone,
      english.referenceAlignmentStatusSet,
    ],
    [
      "Shift-click",
      "Use",
      "to set or replace the alignment reference.",
      "No alignment reference is set.",
      "An alignment reference is set.",
    ],
  );
  assert.deepEqual(
    [
      spanish.referenceAlignmentShortcut,
      spanish.referenceAlignmentInstructionPrefix,
      spanish.referenceAlignmentHint,
      spanish.referenceAlignmentStatusNone,
      spanish.referenceAlignmentStatusSet,
    ],
    [
      "Mayús-clic",
      "Usa",
      "para establecer o reemplazar la referencia de alineación.",
      "No hay una referencia de alineación establecida.",
      "Hay una referencia de alineación establecida.",
    ],
  );
});
