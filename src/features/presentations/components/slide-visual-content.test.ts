import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./slide-visual-content.tsx", import.meta.url),
  "utf8",
);

test("keeps reusable slide visuals independent from editor interactions", () => {
  assert.match(source, /export function SlideVisualContent/);
  assert.match(source, /export function SlideVisualElement/);
  assert.doesNotMatch(source, /@dnd-kit|onSelect|onMove|onResize|onRotate/);
});
