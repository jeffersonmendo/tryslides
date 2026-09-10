import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("renders a destructive deletion action after selected-element properties", () => {
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
  assert.doesNotMatch(sidebar_source, /labels\.noSelection/);
  assert.doesNotMatch(sidebar_source, /\{labels\.slideBackground\}: \{/);
  assert.doesNotMatch(sidebar_source, /\{labels\.slideTransition\}: \{/);
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
  assert.match(
    text_inspector_source,
    /<TooltipContent>\{label\}<\/TooltipContent>/,
  );
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
    /icon=\{<IconStackPush \/>\}[\s\S]*label=\{labels\.moveBackward\}[\s\S]*onClick=\{onSendBackward\}/,
  );
  assert.match(
    element_inspector_source,
    /icon=\{<IconStackPop \/>\}[\s\S]*label=\{labels\.moveForward\}[\s\S]*onClick=\{onBringForward\}/,
  );
  assert.match(
    text_inspector_source,
    /icon=\{<IconStackPush \/>\}[\s\S]*label=\{labels\.moveBackward\}[\s\S]*onClick=\{onSendBackward\}/,
  );
  assert.match(
    text_inspector_source,
    /icon=\{<IconStackPop \/>\}[\s\S]*label=\{labels\.moveForward\}[\s\S]*onClick=\{onBringForward\}/,
  );
});

test("publishes group inspector values immediately and commits them at completion", () => {
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
    /onDraftChange=\{\(value\) => onPatch\(\{ rotation: Number\(value\) \}\)\}/,
  );
  assert.match(
    group_inspector_source,
    /onCommit=\{\(value\) => onPatchCommit\(\{ rotation: Number\(value\) \}\)\}/,
  );
  assert.match(
    sidebar_source,
    /onPatchCommit=\{\(patch\) =>\s*onElementPatchCommit\(selection\.primaryElementId, patch\)\s*\}/,
  );
});
