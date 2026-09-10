import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cancelRotationPreview,
  canResizeElement,
  clampElementPosition,
  commitDragPreview,
  getCenterResizeHandleSize,
  getDragPreviewForSource,
  getDragTransform,
  getFinalDragPosition,
  getResizeBounds,
  getResizeCursor,
  getRotationAngle,
  getRotationConnectorGeometry,
  getTerminalDragPosition,
  type ResizeHandle,
  resolveRotationPreviewAfterCommit,
  shouldDeselectCanvas,
  shouldDisableElementDrag,
  shouldShowRotationValue,
  stopEditingPointerDown,
  updatePreviewPositionsAfterDragCommit,
} from "./editor-drag";

const CANVAS = { width: 1920, height: 1080 };
const SIZE = { width: 400, height: 200 };

test("clamps positions to the Core visibility bounds", () => {
  assert.deepEqual(clampElementPosition({ x: -1000, y: 1000 }, SIZE, CANVAS), {
    x: -200,
    y: 980,
  });
  assert.deepEqual(clampElementPosition({ x: 5000, y: -1000 }, SIZE, CANVAS), {
    x: 1720,
    y: -100,
  });
});

test("converts a final drag transform and clamps it before persistence", () => {
  assert.deepEqual(
    getFinalDragPosition({
      canvas: CANVAS,
      position: { x: 1600, y: 900 },
      size: SIZE,
      transform: { x: 320, y: 160 },
      viewport: { width: 960, height: 540 },
    }),
    { x: 1720, y: 980 },
  );
});

test("preserves direct-manipulation coordinates at a narrow 16:9 viewport", () => {
  assert.deepEqual(
    getFinalDragPosition({
      canvas: CANVAS,
      position: { x: 400, y: 300 },
      size: SIZE,
      transform: { x: 80, y: 60 },
      viewport: { width: 480, height: 270 },
    }),
    { x: 720, y: 540 },
  );
  assert.deepEqual(
    getResizeBounds({
      canvas: CANVAS,
      handle: "east",
      pointerDelta: { x: 20, y: 0 },
      start: { position: { x: 400, y: 300 }, size: SIZE },
      viewport: { width: 480, height: 270 },
    }),
    { position: { x: 400, y: 300 }, size: { width: 480, height: 200 } },
  );
  assert.equal(
    getRotationAngle({
      canvas: CANVAS,
      element: { position: { x: 600, y: 300 }, size: SIZE },
      pointer: { x: 500, y: 150 },
      viewport: { left: 100, top: 50, width: 480, height: 270 },
    }),
    90,
  );
});

test("sends a non-zero drag preview to onMoveEnd when Feedback uses none", async () => {
  const event = {
    to: { x: 480, y: 320 },
    operation: {
      position: { initial: { x: 320, y: 200 } },
      transform: { x: 0, y: 0 },
    },
  };
  const transform = getDragTransform(
    event.to,
    event.operation.position.initial,
  );
  assert.deepEqual(transform, { x: 160, y: 120 });
  assert.notDeepEqual(transform, event.operation.transform);

  const position = getFinalDragPosition({
    canvas: CANVAS,
    position: { x: 400, y: 300 },
    size: SIZE,
    transform: transform ?? { x: 0, y: 0 },
    viewport: { width: 960, height: 540 },
  });
  const moves: Array<{ elementId: string; x: number; y: number }> = [];

  await commitDragPreview(
    { elementId: "elementOne", position },
    async (element_id, x, y) => {
      moves.push({ elementId: element_id, x, y });
      return { persisted: true };
    },
  );

  assert.deepEqual(moves, [{ elementId: "elementOne", x: 720, y: 540 }]);
});

test("does not invoke the terminal move callback for a zero-displacement drag", async () => {
  const source_position = { x: 400, y: 300 };
  const preview = {
    elementId: "elementOne",
    position: getTerminalDragPosition({
      canvas: CANVAS,
      position: source_position,
      size: SIZE,
      initial: { x: 320, y: 200 },
      current: { x: 320, y: 200 },
      viewport: { width: 960, height: 540 },
    }),
  };
  const moves: Array<{ elementId: string; x: number; y: number }> = [];

  if (
    preview.position.x !== source_position.x ||
    preview.position.y !== source_position.y
  )
    await commitDragPreview(preview, async (element_id, x, y) => {
      moves.push({ elementId: element_id, x, y });
      return { persisted: true };
    });

  assert.deepEqual(moves, []);

  const source = readFileSync(
    new URL("./slide-renderer.tsx", import.meta.url),
    "utf8",
  );
  const drag_end_source = source.slice(
    source.indexOf("function handleDragEnd"),
    source.indexOf("function handleDragStart"),
  );
  assert.match(
    drag_end_source,
    /preview\.position\.x === source\.position\.x[\s\S]*preview\.position\.y === source\.position\.y[\s\S]*return/,
  );
  assert.ok(
    drag_end_source.indexOf("preview.position.x === source.position.x") <
      drag_end_source.indexOf("setDragPreview(preview)"),
  );
});

test("calculates terminal operation coordinates when no drag preview exists", () => {
  assert.equal(getDragPreviewForSource(null, "elementOne"), null);
  assert.deepEqual(
    getTerminalDragPosition({
      canvas: CANVAS,
      position: { x: 400, y: 300 },
      size: SIZE,
      initial: { x: 320, y: 200 },
      current: { x: 800, y: 470 },
      viewport: { width: 960, height: 540 },
    }),
    { x: 1360, y: 840 },
  );
});

test("keeps a queued drag preview instead of advancing to a farther terminal pointer coordinate", () => {
  const queued_preview = {
    elementId: "elementOne",
    position: { x: 720, y: 540 },
  };
  const farther_terminal_position = getTerminalDragPosition({
    canvas: CANVAS,
    position: { x: 400, y: 300 },
    size: SIZE,
    initial: { x: 320, y: 200 },
    current: { x: 800, y: 470 },
    viewport: { width: 960, height: 540 },
  });

  const terminal_preview = getDragPreviewForSource(
    queued_preview,
    "elementOne",
  );

  assert.deepEqual(terminal_preview, queued_preview);
  assert.notDeepEqual(terminal_preview?.position, farther_terminal_position);
});

test("uses the DnD operation coordinate when raw pointerup is farther than the final operation", () => {
  const raw_pointerup = { x: 800, y: 470 };
  const current = { x: 480, y: 320 };

  assert.notDeepEqual(raw_pointerup, current);
  assert.deepEqual(
    getTerminalDragPosition({
      canvas: CANVAS,
      position: { x: 400, y: 300 },
      size: SIZE,
      initial: { x: 320, y: 200 },
      current,
      viewport: { width: 960, height: 540 },
    }),
    { x: 720, y: 540 },
  );
});

test("falls back to the drag operation coordinate for keyboard DnD", () => {
  const current = { x: 480, y: 320 };

  assert.deepEqual(current, { x: 480, y: 320 });
  assert.deepEqual(
    getTerminalDragPosition({
      canvas: CANVAS,
      position: { x: 400, y: 300 },
      size: SIZE,
      initial: { x: 320, y: 200 },
      current,
      viewport: { width: 960, height: 540 },
    }),
    { x: 720, y: 540 },
  );
});

test("keeps valid 50% overflow positions within the Core bounds", () => {
  const allowed_positions = [
    { x: -SIZE.width / 2, y: 100 },
    { x: 100, y: -SIZE.height / 2 },
    { x: CANVAS.width - SIZE.width / 2, y: 100 },
    { x: 100, y: CANVAS.height - SIZE.height / 2 },
  ];

  for (const position of allowed_positions) {
    assert.deepEqual(clampElementPosition(position, SIZE, CANVAS), position);
  }
});

test("calculates independent geometry for every resize handle", () => {
  const start = { position: { x: 400, y: 300 }, size: SIZE };
  const cases = [
    ["north", { x: 400, y: 260 }, { width: 400, height: 240 }],
    ["north-east", { x: 400, y: 260 }, { width: 440, height: 240 }],
    ["east", { x: 400, y: 300 }, { width: 440, height: 200 }],
    ["south-east", { x: 400, y: 300 }, { width: 440, height: 160 }],
    ["south", { x: 400, y: 300 }, { width: 400, height: 160 }],
    ["south-west", { x: 440, y: 300 }, { width: 360, height: 160 }],
    ["west", { x: 440, y: 300 }, { width: 360, height: 200 }],
    ["north-west", { x: 440, y: 260 }, { width: 360, height: 240 }],
  ] as const;

  for (const [handle, position, size] of cases) {
    assert.deepEqual(
      getResizeBounds({
        canvas: CANVAS,
        handle,
        pointerDelta: { x: 20, y: -20 },
        start,
        viewport: { width: 960, height: 540 },
      }),
      { position, size },
      handle,
    );
  }
});

test("keeps resized elements positive and within Core visibility bounds", () => {
  assert.deepEqual(
    getResizeBounds({
      canvas: CANVAS,
      handle: "north-west",
      pointerDelta: { x: 10_000, y: 10_000 },
      start: { position: { x: 0, y: 0 }, size: SIZE },
      viewport: { width: 960, height: 540 },
    }),
    { position: { x: 399, y: 199 }, size: { width: 1, height: 1 } },
  );
});

test("projects rotated resize pointer deltas into the element local axes", () => {
  const start = { position: { x: 400, y: 300 }, size: SIZE };
  const cases = [
    [45, { x: 20, y: 20 }, 400 + 40 * Math.SQRT2],
    [90, { x: 0, y: 20 }, 440],
    [135, { x: -20, y: 20 }, 400 + 40 * Math.SQRT2],
    [270, { x: 0, y: -20 }, 440],
  ] as const;

  for (const [rotation, pointer_delta, expected_width] of cases) {
    const resized = getResizeBounds({
      canvas: CANVAS,
      handle: "east",
      pointerDelta: pointer_delta,
      rotation,
      start,
      viewport: { width: 960, height: 540 },
    });

    assert.ok(Math.abs(resized.size.width - expected_width) < 0.000_001);
    assert.equal(resized.size.height, SIZE.height);
  }
});

test("keeps the visual opposite handle anchored for every rotated resize handle", () => {
  const start = { position: { x: 700, y: 400 }, size: SIZE };
  const local_delta = { x: 30, y: -20 };
  const rotations = [45, 90, 135, 270] as const;
  const handles = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
  ] as const;

  for (const rotation of rotations) {
    const pointer_delta = rotateOffset(local_delta, rotation);

    for (const handle of handles) {
      const resized = getResizeBounds({
        canvas: CANVAS,
        handle,
        pointerDelta: pointer_delta,
        rotation,
        start,
        viewport: { width: 1920, height: 1080 },
      });
      const opposite_handle = getOppositeHandle(handle);
      const start_anchor = getVisualHandlePoint(
        start.position,
        start.size,
        opposite_handle,
        rotation,
      );
      const resized_anchor = getVisualHandlePoint(
        resized.position,
        resized.size,
        opposite_handle,
        rotation,
      );

      assert.ok(
        Math.abs(resized_anchor.x - start_anchor.x) < 0.000_001,
        `${rotation}° ${handle}: opposite handle x moved`,
      );
      assert.ok(
        Math.abs(resized_anchor.y - start_anchor.y) < 0.000_001,
        `${rotation}° ${handle}: opposite handle y moved`,
      );
    }
  }
});

test("uses native resize cursors aligned with the rotated handle orientation", () => {
  assert.equal(getResizeCursor("east", 0), "ew-resize");
  assert.equal(getResizeCursor("east", 45), "nwse-resize");
  assert.equal(getResizeCursor("east", 90), "ns-resize");
  assert.equal(getResizeCursor("east", 135), "nesw-resize");
  assert.equal(getResizeCursor("east", 270), "ns-resize");
  assert.equal(getResizeCursor("north-east", 90), "nwse-resize");
});

test("sizes center resize controls from their rendered axis with corner clearance", () => {
  assert.deepEqual(
    getCenterResizeHandleSize("north", { width: 38, height: 1 }),
    { width: 18, height: 8 },
  );
  assert.deepEqual(
    getCenterResizeHandleSize("south", { width: 100, height: 1 }),
    { width: 24, height: 8 },
  );
  assert.deepEqual(
    getCenterResizeHandleSize("east", { width: 1, height: 38 }),
    { width: 8, height: 18 },
  );
  assert.deepEqual(
    getCenterResizeHandleSize("west", { width: 1, height: 100 }),
    { width: 8, height: 24 },
  );
});

test("independently hides center controls whose rendered axis cannot clear corners", () => {
  assert.equal(
    getCenterResizeHandleSize("north", { width: 37.99, height: 100 }),
    null,
  );
  assert.deepEqual(
    getCenterResizeHandleSize("east", { width: 37.99, height: 100 }),
    { width: 8, height: 24 },
  );
});

test("ends the rotation connector at the north handle edge", () => {
  const connector = getRotationConnectorGeometry(24, 8);

  assert.deepEqual(connector, { height: 20, offsetY: -24 });
  assert.equal(connector.offsetY + connector.height, -4);
});

test("keeps selection chrome inside the single rotated interaction plane", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /ref=\{setElementContainer\}[\s\S]*data-rotated-selection-plane/,
  );
  assert.match(source, /data-rotated-selection-plane[\s\S]*ref=\{handleRef\}/);
  assert.match(source, /handle\.isCenter \? "rounded" : "rounded-full"/);
  assert.match(source, /style=\{\{\s*cursor: getResizeCursor/);
  assert.match(source, /getCenterResizeHandleSize/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /borderWidth: border_width/);
  assert.match(
    source,
    /north_handle_size\?\.height \?\? 0[\s\S]*data-selection-center-axis[\s\S]*north_handle_size[\s\S]*rotation_connector[\s\S]*rotationElementLabel/,
  );
});

test("reveals canvas overflow with non-interactive opaque exterior overlays", () => {
  const canvas_source = readFileSync(
    new URL("./editor-canvas.tsx", import.meta.url),
    "utf8",
  );
  const workspace_source = readFileSync(
    new URL("./editor-workspace.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(canvas_source, /overflow-hidden/);
  assert.match(canvas_source, /relative group shrink-0 overflow-visible/);
  assert.equal(canvas_source.match(/data-canvas-outside-overlay=/g)?.length, 4);
  assert.equal(
    canvas_source.match(/pointer-events-none[^\n]*bg-muted\/80/g)?.length,
    4,
  );
  assert.match(workspace_source, /relative flex[\s\S]*overflow-hidden/);
});

test("keeps Feedback enabled without rendering a drag overlay", () => {
  const source = readFileSync(
    new URL("./slide-renderer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ Feedback \} from "@dnd-kit\/dom"/);
  assert.match(
    source,
    /plugin === Feedback\s*\? Feedback\.configure\(\{ feedback: "none" \}\)\s*: plugin/,
  );
  assert.doesNotMatch(
    source,
    /defaults\.filter\(\(plugin\) => plugin !== Feedback\)/,
  );
});

test("synchronously presents each drag preview before making it available to drag end", () => {
  const source = readFileSync(
    new URL("./slide-renderer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /function handleDragMove[\s\S]*getFinalDragPosition/);
  assert.match(
    source,
    /handleDragMove[\s\S]*setDragPreview\(\{ elementId: source\.id, position \}\)/,
  );
  assert.doesNotMatch(source, /requestAnimationFrame\(flushDragPreview\)/);
  assert.match(source, /requestAnimationFrame\(flushMarqueePreview\)/);
  assert.match(
    source,
    /handleDragEnd[\s\S]*getDragPreviewForSource\(\s*last_drag_preview_ref\.current,\s*source\.id,\s*\)[\s\S]*\?\?[\s\S]*getTerminalDragPosition/,
  );
  assert.match(
    source,
    /handleDragEnd[\s\S]*current: event\.operation\.position\.current/,
  );
  const drag_end_source = source.slice(
    source.indexOf("function handleDragEnd"),
    source.indexOf("function handleDragStart"),
  );
  assert.doesNotMatch(drag_end_source, /nativeEvent/);
  assert.match(source, /handleDragEnd[\s\S]*setDragPreview\(preview\)/);
  assert.match(source, /import \{ flushSync \} from "react-dom"/);
  const set_drag_preview_source = source.slice(
    source.indexOf("function setDragPreview"),
    source.indexOf("function setMarqueePreview"),
  );
  assert.match(
    set_drag_preview_source,
    /flushSync\(\(\) => \{[\s\S]*set_preview_positions/,
  );
  assert.ok(
    set_drag_preview_source.indexOf("set_preview_positions") <
      set_drag_preview_source.indexOf(
        "last_drag_preview_ref.current = preview",
      ),
  );
  assert.doesNotMatch(
    source,
    /pending_drag_preview_ref|drag_preview_frame_ref/,
  );
});

test("uses only the element opacity while previewing overflow", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /opacity: element\.opacity/);
  assert.doesNotMatch(
    source,
    /displayed_opacity|OUTSIDE_CANVAS_OPACITY_FACTOR/,
  );
});

test("keeps direct manipulation geometry static on native elements", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /return \(\s*<div\s+ref=\{setElementContainer\}[\s\S]*?style=\{\{[\s\S]*?height:[\s\S]*?left:[\s\S]*?top:[\s\S]*?width:/,
  );
  assert.match(
    source,
    /className="absolute inset-0"\s*style=\{\{ opacity: element\.opacity \}\}/,
  );
  const positioned_element = source.slice(
    source.indexOf("<div\n      ref={setElementContainer}"),
    source.indexOf('<div\n        className="absolute inset-0"'),
  );

  assert.match(
    positioned_element,
    /height:[\s\S]*left:[\s\S]*top:[\s\S]*width:/,
  );
  assert.doesNotMatch(source, /motion\.div|animate=|initial=|transition=/);
  assert.doesNotMatch(
    source,
    /getElementMotionTransition|isDragging|scale: 0\.96/,
  );
});

test("offers manual resize for every editor element", () => {
  assert.equal(canResizeElement("text"), true);
  assert.equal(canResizeElement("image"), true);
  assert.equal(canResizeElement("shape"), true);
});

test("allows an unselected element to start dragging in its first gesture", () => {
  assert.equal(shouldDisableElementDrag(false), false);
});

test("disables element drag while text content is being edited", () => {
  assert.equal(shouldDisableElementDrag(true), true);
});

test("keeps the drag source enabled while selecting an unselected element", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /disabled: shouldDisableElementDrag\(is_editing_text\)/);
  assert.match(
    source,
    /onPointerDown=\{\(event\) =>\s*onSelect\(element\.id, event\.metaKey \|\| event\.ctrlKey\)\s*\}/,
  );
});

test("stops editable text pointerdown before it reaches the drag handle", () => {
  let propagation_stopped = false;

  stopEditingPointerDown({
    stopPropagation() {
      propagation_stopped = true;
    },
  });

  assert.equal(propagation_stopped, true);
});

test("removes a drag preview when the final persistence commit fails", () => {
  const previews = {
    elementOne: { x: 600, y: 300 },
    elementTwo: { x: 100, y: 200 },
  };

  assert.deepEqual(
    updatePreviewPositionsAfterDragCommit(
      previews,
      "elementOne",
      { x: 600, y: 300 },
      { persisted: false },
    ),
    { elementTwo: { x: 100, y: 200 } },
  );
  assert.equal(
    updatePreviewPositionsAfterDragCommit(
      previews,
      "elementOne",
      { x: 600, y: 300 },
      { persisted: true },
    ),
    previews,
  );
});

test("calculates rotation from the element center in canvas coordinates", () => {
  const input = {
    canvas: CANVAS,
    element: { position: { x: 600, y: 300 }, size: SIZE },
    viewport: { left: 100, top: 50, width: 960, height: 540 },
  };

  assert.equal(getRotationAngle({ ...input, pointer: { x: 500, y: 150 } }), 0);
  assert.equal(getRotationAngle({ ...input, pointer: { x: 600, y: 250 } }), 90);
  assert.equal(
    getRotationAngle({ ...input, pointer: { x: 500, y: 350 } }),
    180,
  );
  assert.equal(
    getRotationAngle({ ...input, pointer: { x: 400, y: 250 } }),
    270,
  );
});

test("accounts for independent canvas viewport scales when rotating", () => {
  assert.equal(
    getRotationAngle({
      canvas: CANVAS,
      element: { position: { x: 600, y: 300 }, size: SIZE },
      pointer: { x: 600, y: 450 },
      viewport: { left: 100, top: 50, width: 960, height: 1080 },
    }),
    90,
  );
});

test("clears rotation previews when rotation is canceled or persistence fails", () => {
  assert.equal(cancelRotationPreview(), null);
  assert.equal(
    resolveRotationPreviewAfterCommit(45, { persisted: false }),
    null,
  );
  assert.equal(resolveRotationPreviewAfterCommit(45, { persisted: true }), 45);
});

test("only shows rotation values during an active rotation interaction", () => {
  assert.equal(shouldShowRotationValue(45, true), true);
  assert.equal(shouldShowRotationValue(45, false), false);
  assert.equal(shouldShowRotationValue(null, true), false);
});

test("only treats the canvas background as a deselection target", () => {
  const canvas = new EventTarget();
  const element = new EventTarget();

  assert.equal(shouldDeselectCanvas(canvas, canvas), true);
  assert.equal(shouldDeselectCanvas(element, canvas), false);
});

function getOppositeHandle(handle: ResizeHandle): ResizeHandle {
  const opposite_handle = {
    north: "south",
    "north-east": "south-west",
    east: "west",
    "south-east": "north-west",
    south: "north",
    "south-west": "north-east",
    west: "east",
    "north-west": "south-east",
  } as const satisfies Readonly<Record<ResizeHandle, ResizeHandle>>;

  return opposite_handle[handle];
}

function getVisualHandlePoint(
  position: { readonly x: number; readonly y: number },
  size: { readonly width: number; readonly height: number },
  handle: ResizeHandle,
  rotation: number,
) {
  const local_point = {
    north: { x: size.width / 2, y: 0 },
    "north-east": { x: size.width, y: 0 },
    east: { x: size.width, y: size.height / 2 },
    "south-east": { x: size.width, y: size.height },
    south: { x: size.width / 2, y: size.height },
    "south-west": { x: 0, y: size.height },
    west: { x: 0, y: size.height / 2 },
    "north-west": { x: 0, y: 0 },
  }[handle];
  const center = { x: size.width / 2, y: size.height / 2 };
  const rotated_offset = rotateOffset(
    { x: local_point.x - center.x, y: local_point.y - center.y },
    rotation,
  );

  return {
    x: position.x + center.x + rotated_offset.x,
    y: position.y + center.y + rotated_offset.y,
  };
}

function rotateOffset(
  offset: { readonly x: number; readonly y: number },
  rotation: number,
) {
  const radians = (rotation * Math.PI) / 180;
  return {
    x: offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
    y: offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
  };
}
