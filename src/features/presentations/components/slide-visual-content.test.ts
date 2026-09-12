import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getShapeViewportStyle } from "./slide-visual-content";

const source = readFileSync(
  new URL("./slide-visual-content.tsx", import.meta.url),
  "utf8",
);

test("keeps reusable slide visuals independent from editor interactions", () => {
  assert.match(source, /export function SlideVisualContent/);
  assert.match(source, /export function SlideVisualElement/);
  assert.doesNotMatch(source, /@dnd-kit|onSelect|onMove|onResize|onRotate/);
});

test("uses the full logical bounds for static text", () => {
  assert.match(
    source,
    /className="block size-full overflow-visible whitespace-pre-wrap"/,
  );
  assert.doesNotMatch(
    source,
    /className="block size-full overflow-visible whitespace-pre-wrap p-1"/,
  );
});

test("maps Tabler-inspired shapes to the full editable bounds", () => {
  assert.match(source, /viewBox="0 0 24 24"/);
  assert.match(source, /preserveAspectRatio="none"/);
  assert.doesNotMatch(source, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(source, /strokeLinecap="round"/);
  assert.match(source, /strokeLinejoin="round"/);
  assert.match(source, /vectorEffect: "non-scaling-stroke"/);

  for (const path of [
    "M12 0l12 24h-24z",
    "M12 0l12 12l-12 12l-12 -12z",
    "M0 12h24",
    "M12 0l12 12l-12 12",
    "M12 0v24",
    "M24 0l-24 24",
    "M0 8h24",
    "M0 24l24 -24",
  ]) {
    assert.match(
      source,
      new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(source, /<rect\s+height="24"/);
  assert.match(source, /<ellipse cx="12" cy="12" rx="12" ry="12"/);
});

test("uses a full-bounds cubic heart silhouette without intersecting lobes", () => {
  assert.match(
    source,
    /case "heart":\s+return \(\s+<path\s+d="M12 24C10\.3 22\.5 0 14\.4 0 7\.2C0 3\.2 3\.1 0 7\.1 0C9\.3 0 11 1 12 2\.6C13 1 14\.7 0 16\.9 0C20\.9 0 24 3\.2 24 7\.2C24 14\.4 13\.7 22\.5 12 24Z"/,
  );
});

test("uses curved tail transitions for both callout shapes", () => {
  assert.match(
    source,
    /case "speech-bubble":\s+return \(\s+<path\s+d="M4 0H20A4 4 0 0 1 24 4V12A4 4 0 0 1 20 16H14\.6C13\.2 18\.9 11\.1 21\.1 9\.5 22\.5C9 22\.9 8\.7 23\.4 8\.5 24C8 23\.2 7\.8 22\.3 7\.9 21\.4C8\.1 19\.4 7\.6 17\.5 6\.7 16H4A4 4 0 0 1 0 12V4A4 4 0 0 1 4 0Z"/,
  );
  assert.match(
    source,
    /case "round-bubble":\s+return \(\s+<path\s+d="M12 0C18\.6 0 24 3\.8 24 8\.5C24 13\.2 18\.6 17 12 17C10\.8 17 9\.6 16\.9 8\.5 16\.6C7\.7 19\.5 6\.1 22\.2 4\.4 23\.6C3\.9 24 3\.4 24 3 23\.6C3\.3 21\.2 3\.1 18\.9 2\.2 16\.5C\.8 14\.8 0 11\.8 0 8\.5C0 3\.8 5\.4 0 12 0Z"/,
  );
});

test("renders the plain line as a straight full-width horizontal segment", () => {
  assert.match(source, /case "line":\s+return <path d="M0 12h24"/);
  assert.doesNotMatch(source, /case "line":\s+return <path d="M4 19l16 -14"/);
});

test("preserves the editor color semantics for filled and line shapes", () => {
  assert.match(source, /fill: element\.style\.fill/);
  assert.match(source, /stroke: element\.style\.border/);
  assert.match(source, /fill: "none",\s*stroke: element\.style\.fill/);
  assert.match(source, /fill=\{line_style\.stroke\}/);
});

test("renders filled shapes without a border when border width is zero", () => {
  assert.match(
    source,
    /const shape_border_width = element\.style\.borderWidth;/,
  );
  assert.match(source, /strokeWidth: shape_border_width/);
  assert.match(
    source,
    /const line_stroke_width = Math\.max\(1, element\.style\.borderWidth\);/,
  );
  assert.match(source, /strokeWidth: line_stroke_width/);
});

test("keeps zero-width circle and heart geometry flush with their layout bounds", () => {
  const expected_viewport = {
    height: "calc(100% - 0px)",
    left: "0px",
    top: "0px",
    width: "calc(100% - 0px)",
  };

  assert.deepEqual(getShapeViewportStyle("circle", 0), expected_viewport);
  assert.deepEqual(getShapeViewportStyle("heart", 0), expected_viewport);
});

test("reserves thick circle and heart borders inside their selectable layout bounds", () => {
  const expected_viewport = {
    height: "calc(100% - 24px)",
    left: "12px",
    top: "12px",
    width: "calc(100% - 24px)",
  };

  assert.deepEqual(getShapeViewportStyle("circle", 24), expected_viewport);
  assert.deepEqual(getShapeViewportStyle("heart", 24), expected_viewport);
  assert.match(source, /className="relative size-full overflow-hidden"/);
  assert.match(source, /overflow="visible"/);
});

test("keeps line-family viewport bounds unchanged by border reservation", () => {
  assert.deepEqual(getShapeViewportStyle("line", 24), {
    height: "100%",
    left: "0",
    top: "0",
    width: "100%",
  });
});
