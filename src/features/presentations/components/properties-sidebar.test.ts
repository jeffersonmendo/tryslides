import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("renders destructive deletion actions after the applicable inspector", () => {
  const sidebar_source = readFileSync(
    new URL("./properties-sidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sidebar_source, /variant="destructive"/);
  assert.match(
    sidebar_source,
    /onClick=\{\(\) => onDeleteElement\(selectedElement\.id\)\}/,
  );
  assert.ok(
    sidebar_source.lastIndexOf("onDeleteElement") >
      sidebar_source.indexOf("<ElementInspector"),
  );
  assert.match(
    sidebar_source,
    /selection\.kind === "multiple" \? \([\s\S]*variant="destructive"[\s\S]*onClick=\{\(\) => onDeleteElements\(selection\.elementIds\)\}/,
  );
  assert.ok(
    sidebar_source.indexOf("onDeleteElements(selection.elementIds)") >
      sidebar_source.indexOf("<GroupInspector"),
  );
});

test("renders slide controls without a selected element and omits repeated summaries", () => {
  const sidebar_source = readFileSync(
    new URL("./properties-sidebar.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    sidebar_source,
    /selection\.kind === "none" && activeSlide !== null/,
  );
  assert.match(sidebar_source, /<SlideInspector/);
  assert.match(sidebar_source, /onBackgroundChange=\{onBackgroundChange\}/);
  assert.match(sidebar_source, /onTransitionChange=\{onTransitionChange\}/);
  assert.match(sidebar_source, /onDuplicateSlide=\{on_duplicate_slide\}/);
  assert.match(sidebar_source, /onDeleteSlide=\{on_delete_slide\}/);
  assert.doesNotMatch(sidebar_source, /labels\.noSelection/);
  assert.doesNotMatch(sidebar_source, /\{labels\.slideBackground\}: \{/);
  assert.doesNotMatch(sidebar_source, /\{labels\.slideTransition\}: \{/);
});

test("keeps duplicate and delete slide controls in the slide inspector", () => {
  const inspector_source = readFileSync(
    new URL("./slide-inspector.tsx", import.meta.url),
    "utf8",
  );
  assert.match(inspector_source, /onClick=\{on_duplicate_slide\}/);
  assert.match(inspector_source, /onClick=\{on_delete_slide\}/);
  assert.match(
    inspector_source,
    /variant="secondary"[\s\S]*onClick=\{on_delete_slide\}/,
  );
});

test("configures the active slide through draft inputs and Select primitives", () => {
  const inspector_source = readFileSync(
    new URL("./slide-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(inspector_source, /<InspectorDraftInput/);
  assert.match(inspector_source, /<ColorControl/);
  assert.match(inspector_source, /onBackgroundChange\(\{ type: "solid"/);
  assert.match(inspector_source, /<Select/);
  assert.match(inspector_source, /<SelectGroup>/);
  assert.doesNotMatch(inspector_source, /<select/);
  assert.doesNotMatch(inspector_source, /type="color"/);
  assert.match(inspector_source, /onTransitionCommit\(value\)/);
  assert.match(
    inspector_source,
    /onTransitionCommit\(slide\.transitionType, Number\(value\)\)/,
  );
});

test("uses draft inputs, selects, and immediate discrete actions", () => {
  const element_inspector_source = readFileSync(
    new URL("./element-inspector.tsx", import.meta.url),
    "utf8",
  );
  const text_inspector_source = readFileSync(
    new URL("./text-inspector.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(element_inspector_source, /<select/);
  assert.match(element_inspector_source, /<InspectorDraftInput/);
  assert.match(text_inspector_source, /<InspectorDraftInput/);
  assert.match(
    text_inspector_source,
    /import \{ ColorControl \} from "@\/components\/ui\/color"/,
  );
  assert.match(text_inspector_source, /<ColorControl/);
  assert.match(element_inspector_source, /<ColorControl/);
  assert.match(element_inspector_source, /<SelectGroup>/);
  assert.match(element_inspector_source, /disabled=\{elementIndex === 0\}/);
  assert.match(
    element_inspector_source,
    /disabled=\{elementIndex === elementCount - 1\}/,
  );
  assert.match(text_inspector_source, /<AlignmentToggleItem/);
  assert.equal(
    element_inspector_source.match(/<Tooltip disableHoverablePopup>/g)?.length,
    1,
  );
  assert.equal(
    text_inspector_source.match(/<Tooltip disableHoverablePopup>/g)?.length,
    2,
  );
  assert.doesNotMatch(element_inspector_source, /pointer-events-none/);
  assert.doesNotMatch(text_inspector_source, /pointer-events-none/);
  assert.doesNotMatch(element_inspector_source, /InspectorColorField/);
  assert.doesNotMatch(text_inspector_source, /InspectorColorField/);
});

test("renders translated labels for selected raw values without changing stored values", () => {
  const element_inspector_source = readFileSync(
    new URL("./element-inspector.tsx", import.meta.url),
    "utf8",
  );
  const text_inspector_source = readFileSync(
    new URL("./text-inspector.tsx", import.meta.url),
    "utf8",
  );
  const slide_inspector_source = readFileSync(
    new URL("./slide-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(element_inspector_source, /<SelectValue>\s*\{getShapeTypeLabel/);
  assert.match(element_inspector_source, /<SelectValue>\s*\{getImageFitLabel/);
  assert.match(
    slide_inspector_source,
    /<SelectValue>[\s\S]*getTransitionLabel/,
  );
  assert.match(text_inspector_source, /<SelectValue>\s*\{getTextRoleLabel/);
  assert.match(text_inspector_source, /<SelectValue>\s*\{getFontWeightLabel/);
  assert.match(
    text_inspector_source,
    /<SelectItem key=\{role\} value=\{role\}>/,
  );
  assert.match(text_inspector_source, /<SelectItem value="400">/);
  assert.match(text_inspector_source, /<SelectItem value="700">/);
});

test("uses pixel unit controls for dimensional style values and correct layer icons", () => {
  const element_inspector_source = readFileSync(
    new URL("./element-inspector.tsx", import.meta.url),
    "utf8",
  );
  const text_inspector_source = readFileSync(
    new URL("./text-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(element_inspector_source.match(/<UnitStyleField/g)?.length, 3);
  assert.doesNotMatch(element_inspector_source, /NumberStyleField/);
  assert.match(
    element_inspector_source,
    /icon=\{<IconChevronDown stroke=\{2\} \/>\}[\s\S]*label=\{labels\.moveBackward\}[\s\S]*onClick=\{onSendBackward\}/,
  );
  assert.match(
    element_inspector_source,
    /icon=\{<IconChevronUp stroke=\{2\} \/>\}[\s\S]*label=\{labels\.moveForward\}[\s\S]*onClick=\{onBringForward\}/,
  );
  assert.match(
    text_inspector_source,
    /icon=\{<IconChevronDown stroke=\{2\} \/>\}[\s\S]*label=\{labels\.moveBackward\}[\s\S]*onClick=\{onSendBackward\}/,
  );
  assert.match(
    text_inspector_source,
    /icon=\{<IconChevronUp stroke=\{2\} \/>\}[\s\S]*label=\{labels\.moveForward\}[\s\S]*onClick=\{onBringForward\}/,
  );
  for (const inspector_source of [
    element_inspector_source,
    text_inspector_source,
  ]) {
    for (const icon of [
      "IconLayoutAlignLeftFilled",
      "IconLayoutAlignCenterFilled",
      "IconLayoutAlignRightFilled",
      "IconLayoutAlignTopFilled",
      "IconLayoutAlignMiddleFilled",
      "IconLayoutAlignBottomFilled",
    ])
      assert.match(inspector_source, new RegExp(`<${icon} stroke=\\{2\\} />`));
    assert.match(
      inspector_source,
      /<FieldLabel>\{labels\.layers\}<\/FieldLabel>/,
    );
    assert.doesNotMatch(
      inspector_source,
      /<FieldLegend[^>]*>\s*\{labels\.layers\}/,
    );
    assert.match(
      inspector_source,
      /icon=\{<IconChevronsDown stroke=\{2\} \/>\}[\s\S]*label=\{labels\.sendToBack\}[\s\S]*onClick=\{onSendToBack\}/,
    );
    assert.match(
      inspector_source,
      /icon=\{<IconChevronsUp stroke=\{2\} \/>\}[\s\S]*label=\{labels\.bringToFront\}[\s\S]*onClick=\{onBringToFront\}/,
    );
  }
});

test("uses compact distribution controls and the sidebar deletion convention for group editing", () => {
  const sidebar_source = readFileSync(
    new URL("./properties-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const group_inspector_source = readFileSync(
    new URL("./group-inspector.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    group_inspector_source,
    /<FieldLegend className="text-muted-foreground">\s*\{labels\.content\}/,
  );
  assert.match(group_inspector_source, /\{labels\.transform\}/);
  assert.match(group_inspector_source, /\{labels\.appearance\}/);
  assert.match(group_inspector_source, /\{labels\.alignToCanvas\}/);
  assert.match(group_inspector_source, /IconLayoutAlignLeftFilled/);
  assert.match(group_inspector_source, /IconAlignBoxLeftMiddleFilled/);
  assert.match(group_inspector_source, /IconSpacingHorizontal/);
  assert.match(group_inspector_source, /IconSpacingVertical/);
  assert.match(
    group_inspector_source,
    /<FieldLabel>\{labels\.distribution\}<\/FieldLabel>/,
  );
  assert.match(
    group_inspector_source,
    /aria-label=\{labels\.gap\}[\s\S]*unit="px"/,
  );
  assert.match(group_inspector_source, /disabled=\{elements\.length < 2\}/);
  assert.match(group_inspector_source, /<Tooltip disableHoverablePopup>/);
  assert.match(group_inspector_source, /disabled=\{!has_reference\}/);
  assert.doesNotMatch(
    group_inspector_source,
    /IconArrows(Horizontal|Vertical)/,
  );
  assert.doesNotMatch(group_inspector_source, /labels\.actions/);
  assert.doesNotMatch(group_inspector_source, /<Button/);
  assert.match(
    sidebar_source,
    /onPatchCommit=\{\(patch\) =>\s*onElementPatchCommit\(selection\.primaryElementId, patch\)/,
  );
});
