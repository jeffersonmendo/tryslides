import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cleanup,
  fireEvent,
  render as renderComponent,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import {
  getPresentationFontStack,
  TEXT_FONT_FAMILIES,
} from "@/features/presentations/core/presentation-core";
import { ElementInspector } from "../element-inspector";
import { FontFamilyCombobox } from "../font-family-combobox";
import { GroupInspector } from "../group-inspector";
import type { EditorElement, EditorTextElement } from "../lib/editor-model";
import { TextInspector } from "../text-inspector";
import { TextRenderer } from "../text-renderer";

const EDITOR_NAMESPACE = "Editor";
const messages = {
  [EDITOR_NAMESPACE]: {
    alignment: "Alignment",
    alignmentCenter: "Center",
    alignmentLeft: "Left",
    alignmentRight: "Right",
    alignmentJustify: "Justify",
    layoutAlign: "Layout",
    color: "Color",
    content: "Content",
    fontSize: "Font size",
    fontFamily: "Font family",
    fontGeist: "Geist",
    fontGeistMono: "Geist Mono",
    fontGeistPixel: "Geist Pixel",
    fontInter: "Inter",
    fontMontserrat: "Montserrat",
    fontPlayfairDisplay: "Playfair Display",
    fontLora: "Lora",
    fontWeight: "Font weight",
    lineHeight: "Line height",
    letterSpacing: "Letter spacing",
    searchFontFamily: "Search font families",
    noFontFamiliesFound: "No font families found.",
    mixedValue: "Mixed",
    fontWeightThin: "Thin",
    fontWeightExtraLight: "Extra Light",
    fontWeightLight: "Light",
    fontWeightMedium: "Medium",
    fontWeightSemiBold: "Semi Bold",
    fontWeightExtraBold: "Extra Bold",
    fontWeightBlack: "Black",
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
    stroke: "Stroke",
    border: "Border",
    borderWidth: "Border width",
    strokeWidth: "Stroke width",
    radius: "Radius",
    fit: "Fit",
    fitContain: "Contain",
    fitCover: "Cover",
    alignToCanvas: "Align to canvas",
    alignToReference: "Align to reference",
    referenceAlignmentInstruction:
      "Use <shortcut>Shift+Click</shortcut> to set or replace the alignment reference.",
    referenceAlignmentStatusNone: "No alignment reference is set.",
    referenceAlignmentStatusSet: "An alignment reference is set.",
    referenceAlignmentShortcut: "Shift-click",
    shiftKey: "Shift",
    clickLabel: "Click",
    distributeHorizontally: "Distribute horizontally",
    distributeVertically: "Distribute vertically",
    distribution: "Distribution",
    gap: "Gap",
  },
} as const;

function render(ui: React.ReactNode) {
  const wrap = (content: React.ReactNode) => (
    <NextIntlClientProvider locale="en" messages={messages}>
      {content}
    </NextIntlClientProvider>
  );
  const result = renderComponent(wrap(ui));

  return {
    ...result,
    rerender: (next_ui: React.ReactNode) => result.rerender(wrap(next_ui)),
  };
}

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
    fontFamily: "Geist",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#000000",
    alignment: "left",
  },
  animations: [],
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

function assertDecorativeSectionIcons(container: HTMLElement) {
  for (const legend of container.querySelectorAll("fieldset > legend")) {
    const composition = legend.querySelector("span.flex.items-center.gap-2");
    const icon = composition?.querySelector("svg[aria-hidden='true']");

    assert.ok(composition, "Each section legend has inline flex composition");
    assert.ok(icon, "Each section legend has a decorative icon");
    assert.equal(icon.classList.contains("size-3!"), true);
    assert.equal(icon.getAttribute("stroke-width"), "2");
  }
}

const noop = () => undefined;
const text_props = {
  acceptedColor: "#000000",
  elementCount: 2,
  elementIndex: 0,
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
  onAlign: noop,
  onBringForward: noop,
  onBringToFront: noop,
  onPatch: noop,
  onPatchCommit: noop,
  onSendBackward: noop,
  onSendToBack: noop,
};
const group_props = {
  referenceElementId: null,
  onAlignToCanvas: noop,
  onAlignToReference: noop,
  onDistribute: noop,
  onPatch: noop,
  onPatchCommit: noop,
  onOpacityChange: noop,
  onOpacityCommit: noop,
  onRotateChange: noop,
  onRotateCommit: noop,
};

test.afterEach(() => cleanup());

test("assigns the intended icon to each static inspector section", () => {
  const expected_icons = {
    "text-inspector.tsx": ["IconFileText", "IconTransform", "IconPalette"],
    "element-inspector.tsx": ["IconBox", "IconTransform", "IconPalette"],
    "group-inspector.tsx": ["IconBox", "IconTransform", "IconPalette"],
  } as const;

  for (const [file, icons] of Object.entries(expected_icons)) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

    for (const icon of icons) {
      assert.match(
        source,
        new RegExp(
          `<${icon} aria-hidden className="size-3!" stroke=\\{2\\} />`,
        ),
      );
    }
  }
});

test("keeps inspector copy local instead of accepting propagated labels", () => {
  for (const file of [
    "text-inspector.tsx",
    "element-inspector.tsx",
    "group-inspector.tsx",
    "slide-inspector.tsx",
  ]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /useTranslations\("Editor"\)/);
    const public_props = source.match(
      /type \w+InspectorProps = \{[\s\S]*?\n\};/,
    )?.[0];
    assert.ok(public_props, `Missing public props for ${file}`);
    assert.doesNotMatch(public_props, /\blabels\b/);
  }
});

test("labels the controlled font-family combobox and emits only a domain value", () => {
  const selected: string[] = [];
  const result = render(
    <FontFamilyCombobox
      value="Geist"
      onValueChange={(value) => selected.push(value)}
    />,
  );
  const input = result.getByLabelText("Font family");

  assert.equal(input.getAttribute("placeholder"), "Search font families");
  const trigger = result.container.querySelector(
    "[data-slot=input-group-button]",
  );
  assert.ok(trigger);
  fireEvent.click(trigger);
  assert.deepEqual(TEXT_FONT_FAMILIES, [
    "Geist",
    "Geist Mono",
    "Geist Pixel",
    "Inter",
    "Montserrat",
    "Playfair Display",
    "Lora",
  ]);
  for (const font_family of TEXT_FONT_FAMILIES) {
    assert.equal(
      result.getByText(font_family).style.fontFamily,
      font_family.includes(" ")
        ? getPresentationFontStack(font_family)
        : getPresentationFontStack(font_family).replaceAll('"', ""),
    );
  }
  const playfair_display = result.getByText("Playfair Display");
  assert.equal(playfair_display.style.fontFamily, '"Playfair Display", serif');
  fireEvent.click(playfair_display);

  assert.deepEqual(selected, ["Playfair Display"]);
});

test("uses the mixed-value placeholder until a text-only group chooses a family", () => {
  const selected: string[] = [];
  const result = render(
    <FontFamilyCombobox
      value={null}
      onValueChange={(value) => selected.push(value)}
    />,
  );
  const input = result.getByLabelText("Font family");

  assert.equal(input.getAttribute("placeholder"), "Mixed");
  const trigger = result.container.querySelector(
    "[data-slot=input-group-button]",
  );
  assert.ok(trigger);
  fireEvent.click(trigger);
  fireEvent.click(result.getByText("Montserrat"));

  assert.deepEqual(selected, ["Montserrat"]);
});

test("places text content, transform, and appearance in semantic order", () => {
  const { container } = render(<TextInspector {...text_props} text={text} />);
  assert.deepEqual(sectionNames(container), [
    "Content",
    "Transform",
    "Appearance",
  ]);
  assertDecorativeSectionIcons(container);
  assert.match(
    sectionContaining(container, "Content").textContent ?? "",
    /Role/,
  );
  assert.match(
    sectionContaining(container, "Appearance").textContent ?? "",
    /Alignment[\s\S]*Opacity[\s\S]*Font family[\s\S]*Font size[\s\S]*Line height[\s\S]*Letter spacing/,
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

test("supports justified text alignment and keeps typography labels explicit", () => {
  const single_styles: unknown[] = [];
  const single = render(
    <TextInspector
      {...text_props}
      text={text}
      onStyleApply={(style) => single_styles.push(style)}
    />,
  );
  fireEvent.click(single.getByRole("button", { name: "Justify" }));
  assert.deepEqual(single_styles, [{ alignment: "justify" }]);

  const line_height = single.getByLabelText("Line height");
  const letter_spacing = single.getByLabelText("Letter spacing");
  for (const input of [line_height, letter_spacing]) {
    const group = input.closest('[data-slot="input-group"]');
    assert.ok(group?.querySelector('[data-slot="input-group-addon"] svg'));
  }
  assert.doesNotMatch(
    single.container.textContent ?? "",
    /×|unitless multiplier/i,
  );
  cleanup();

  const group_patches: unknown[] = [];
  const text_group = render(
    <GroupInspector
      {...group_props}
      elements={[text, { ...text, id: "text-2" }]}
      onPatchCommit={(patch) => group_patches.push(patch)}
    />,
  );
  fireEvent.click(text_group.getByRole("button", { name: "Justify" }));
  assert.deepEqual(group_patches, [{ style: { alignment: "justify" } }]);
  assert.ok(text_group.getByLabelText("Line height"));
  assert.ok(text_group.getByLabelText("Letter spacing"));
  cleanup();

  const rendered = render(
    <TextRenderer
      canvas={{ width: 1920, height: 1080 }}
      isSelected={false}
      text={{ ...text, style: { ...text.style, alignment: "justify" } }}
      onSelect={noop}
    />,
  );
  assert.equal(rendered.getByRole("button").style.textAlign, "justify");
  assert.equal(
    rendered.getByRole("button").style.fontFamily,
    "Geist, sans-serif",
  );
});

test("keeps image and shape type content separate from appearance and preserves shape restrictions", () => {
  const image_result = render(
    <ElementInspector {...element_props} element={image} />,
  );
  assert.deepEqual(sectionNames(image_result.container), [
    "Transform",
    "Appearance",
  ]);
  assertDecorativeSectionIcons(image_result.container);
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
  assertDecorativeSectionIcons(rectangle_result.container);
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
  assertDecorativeSectionIcons(heterogeneous.container);
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
  assertDecorativeSectionIcons(text_group.container);
  assert.match(
    sectionContaining(text_group.container, "Content").textContent ?? "",
    /Role/,
  );
  assert.match(
    sectionContaining(text_group.container, "Appearance").textContent ?? "",
    /Alignment[\s\S]*Opacity[\s\S]*Font family[\s\S]*Font size[\s\S]*Line height[\s\S]*Letter spacing/,
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

test("publishes multi-selection numeric and color drafts immediately", () => {
  const patches: unknown[] = [];
  const result = render(
    <GroupInspector
      {...group_props}
      elements={[text, { ...text, id: "text-2" }]}
      onPatch={(patch) => patches.push(patch)}
    />,
  );

  const font_size =
    result.container.querySelector<HTMLInputElement>('[value="16"]');
  const color =
    result.container.querySelector<HTMLInputElement>("#group-text-color");
  assert.ok(font_size);
  assert.ok(color);

  fireEvent.change(font_size, { target: { value: "24" } });
  fireEvent.change(color, { target: { value: "#123456" } });

  assert.deepEqual(patches, [
    { style: { fontSize: 24 } },
    { style: { color: "#123456" } },
  ]);
});

test("renders opacity as a formatted one-thumb slider for each inspector", () => {
  const ninety_percent_text = { ...text, opacity: 0.9 };
  const ninety_percent_image = { ...image, opacity: 0.9 };
  const text_result = render(
    <TextInspector {...text_props} text={ninety_percent_text} />,
  );
  assert.match(text_result.container.textContent ?? "", /Opacity\s*90%/);
  assert.equal(
    text_result.container.querySelectorAll('input[type="range"]').length,
    1,
  );
  cleanup();

  const element_result = render(
    <ElementInspector {...element_props} element={ninety_percent_image} />,
  );
  assert.match(element_result.container.textContent ?? "", /Opacity\s*90%/);
  assert.equal(
    element_result.container.querySelectorAll('input[type="range"]').length,
    1,
  );
  cleanup();

  const group_result = render(
    <GroupInspector
      {...group_props}
      elements={[ninety_percent_text, { ...ninety_percent_text, id: "text-2" }]}
    />,
  );
  assert.match(group_result.container.textContent ?? "", /Opacity\s*90%/);
  assert.equal(
    group_result.container.querySelectorAll('input[type="range"]').length,
    1,
  );
  const group_opacity_slider =
    group_result.container.querySelector<HTMLInputElement>(
      'input[type="range"]',
    );
  assert.equal(
    group_opacity_slider?.getAttribute("aria-labelledby"),
    "group-opacity-label",
  );
});

test("enables distribution controls for exactly two selected elements", () => {
  const result = render(
    <GroupInspector {...group_props} elements={[text, image]} />,
  );
  const horizontal_control = result.getByRole("button", {
    name: "Distribute horizontally",
  });
  const vertical_control = result.getByRole("button", {
    name: "Distribute vertically",
  });

  assert.ok(horizontal_control instanceof HTMLButtonElement);
  assert.ok(vertical_control instanceof HTMLButtonElement);
  assert.equal(horizontal_control.disabled, false);
  assert.equal(vertical_control.disabled, false);
  assert.equal(
    result.container.querySelector<HTMLInputElement>('[aria-label="Gap"]')
      ?.disabled,
    false,
  );
});

test("disables distribution controls for fewer than two selected elements", () => {
  const result = render(<GroupInspector {...group_props} elements={[text]} />);

  for (const label of ["Distribute horizontally", "Distribute vertically"]) {
    const control = result.getByRole("button", { name: label });
    assert.ok(control instanceof HTMLButtonElement);
    assert.equal(control.disabled, true);
  }
  assert.equal(
    result.container.querySelector<HTMLInputElement>('[aria-label="Gap"]')
      ?.disabled,
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
  const horizontal = result.getByRole("button", {
    name: "Distribute horizontally",
  });
  const vertical = result.getByRole("button", {
    name: "Distribute vertically",
  });
  const gap =
    result.container.querySelector<HTMLInputElement>('[aria-label="Gap"]');

  assert.ok(gap);
  fireEvent.change(gap, { target: { value: "24" } });
  assert.deepEqual(distributions, []);
  fireEvent.click(horizontal);
  assert.deepEqual(distributions, [["horizontal", 24]]);
  assert.equal(horizontal.hasAttribute("data-pressed"), true);
  fireEvent.change(gap, { target: { value: "32" } });
  assert.deepEqual(distributions, [
    ["horizontal", 24],
    ["horizontal", 32],
  ]);
  assert.equal(horizontal.hasAttribute("data-pressed"), true);
  fireEvent.click(vertical);
  assert.deepEqual(distributions, [
    ["horizontal", 24],
    ["horizontal", 32],
    ["vertical", 32],
  ]);
  assert.equal(horizontal.hasAttribute("data-pressed"), false);
  assert.equal(vertical.hasAttribute("data-pressed"), true);
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
  const horizontal_control = result.getByRole("button", {
    name: "Distribute horizontally",
  });
  const gap_input = result.container.querySelector('[aria-label="Gap"]');
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
    result
      .getByRole("button", { name: "Distribute horizontally" })
      .hasAttribute("data-pressed"),
    false,
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
      new URL("../../../../../../messages/en.json", import.meta.url),
      "utf8",
    ),
  ).Editor;
  const spanish = JSON.parse(
    readFileSync(
      new URL("../../../../../../messages/es.json", import.meta.url),
      "utf8",
    ),
  ).Editor;

  assert.deepEqual(
    [
      english.referenceAlignmentShortcut,
      english.referenceAlignmentInstruction,
      english.referenceAlignmentStatusNone,
      english.referenceAlignmentStatusSet,
    ],
    [
      "Shift-click",
      "Use <shortcut>Shift+Click</shortcut> to set or replace the alignment reference.",
      "No alignment reference is set.",
      "An alignment reference is set.",
    ],
  );
  assert.deepEqual(
    [
      spanish.referenceAlignmentShortcut,
      spanish.referenceAlignmentInstruction,
      spanish.referenceAlignmentStatusNone,
      spanish.referenceAlignmentStatusSet,
    ],
    [
      "Mayús-clic",
      "Usa <shortcut>Mayús+Clic</shortcut> para establecer o reemplazar la referencia de alineación.",
      "No hay una referencia de alineación establecida.",
      "Hay una referencia de alineación establecida.",
    ],
  );
});
