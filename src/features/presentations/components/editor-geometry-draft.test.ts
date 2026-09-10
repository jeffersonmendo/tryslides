import assert from "node:assert/strict";
import test from "node:test";
import type { PresentationElement } from "@/features/presentations/core/presentation-core";
import { normalizeGeometryDraftPatch } from "./editor-geometry-draft";

const element = {
  id: "shape_1",
  type: "shape",
  position: { x: 100, y: 100 },
  size: { width: 400, height: 200 },
  rotation: 0,
  opacity: 1,
  style: {
    fill: "#000000",
    border: "transparent",
    borderWidth: 0,
    radius: 0,
  },
  shapeType: "rectangle",
  revision: 1,
  animations: [],
} satisfies PresentationElement;

test("normalizes inspector position and size previews to the Core overflow boundary", () => {
  const patch = normalizeGeometryDraftPatch(element, {
    position: { x: -10_000, y: 10_000 },
    size: { width: 600, height: 300 },
  });

  assert.deepEqual(patch, {
    position: { x: -300, y: 930 },
    size: { width: 600, height: 300 },
  });
});

test("uses each effective element geometry when normalizing a shared inspector draft", () => {
  const smaller = {
    ...element,
    id: "shape_2",
    size: { width: 100, height: 100 },
  } satisfies PresentationElement;

  assert.deepEqual(
    normalizeGeometryDraftPatch(element, {
      position: { x: -10_000, y: -10_000 },
    }).position,
    { x: -200, y: -100 },
  );
  assert.deepEqual(
    normalizeGeometryDraftPatch(smaller, {
      position: { x: -10_000, y: -10_000 },
    }).position,
    { x: -50, y: -50 },
  );
});
