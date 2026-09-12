import assert from "node:assert/strict";
import test from "node:test";
import type { EditorElement } from "./editor-model";
import { getGroupInspectorCapabilities } from "./group-inspector-capabilities";

const text: EditorElement = {
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
const image: EditorElement = {
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
const rectangle: EditorElement = {
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
const line: EditorElement = { ...rectangle, id: "line", shapeType: "line" };

test("intersects only properties meaningful to every selected element", () => {
  assert.deepEqual(getGroupInspectorCapabilities([text, image]), {
    text: false,
    image: false,
    shape: false,
    shapeBorder: false,
    shapeRadius: false,
  });
  assert.deepEqual(
    getGroupInspectorCapabilities([text, { ...text, id: "text_2" }]),
    {
      text: true,
      image: false,
      shape: false,
      shapeBorder: false,
      shapeRadius: false,
    },
  );
  assert.deepEqual(
    getGroupInspectorCapabilities([image, { ...image, id: "image_2" }]),
    {
      text: false,
      image: true,
      shape: false,
      shapeBorder: false,
      shapeRadius: false,
    },
  );
  assert.deepEqual(
    getGroupInspectorCapabilities([
      rectangle,
      { ...rectangle, id: "rectangle_2" },
    ]),
    {
      text: false,
      image: false,
      shape: true,
      shapeBorder: true,
      shapeRadius: true,
    },
  );
  assert.deepEqual(getGroupInspectorCapabilities([rectangle, line]), {
    text: false,
    image: false,
    shape: true,
    shapeBorder: false,
    shapeRadius: false,
  });
});
