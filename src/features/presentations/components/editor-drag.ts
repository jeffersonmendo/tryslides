type Canvas = {
  readonly width: number;
  readonly height: number;
};

type Position = {
  readonly x: number;
  readonly y: number;
};

type Size = {
  readonly width: number;
  readonly height: number;
};

type Viewport = {
  readonly width: number;
  readonly height: number;
};

type CanvasViewport = Viewport & {
  readonly left: number;
  readonly top: number;
};

type Transform = {
  readonly x: number;
  readonly y: number;
};

type DragPreview = {
  readonly elementId: string;
  readonly position: Position;
};

export type ResizeHandle =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

export type CenterResizeHandle = Extract<
  ResizeHandle,
  "north" | "east" | "south" | "west"
>;

type RenderedSize = {
  readonly width: number;
  readonly height: number;
};

export type CenterResizeHandleSize = {
  readonly width: number;
  readonly height: number;
};

type ResizeStart = {
  readonly position: Position;
  readonly size: Size;
};

export type DragCommitResult =
  | { readonly persisted: true }
  | { readonly persisted: false };

type DragPreviewPositions = Readonly<Record<string, Position>>;

export function updatePreviewPositionsAfterDragCommit(
  previews: DragPreviewPositions,
  element_id: string,
  position: Position,
  result: DragCommitResult,
): DragPreviewPositions {
  if (result.persisted) return previews;

  const preview = previews[element_id];
  if (preview?.x !== position.x || preview.y !== position.y) return previews;

  const { [element_id]: _, ...remaining_previews } = previews;
  return remaining_previews;
}

export function clampElementPosition(
  position: Position,
  size: Size,
  canvas: Canvas,
): Position {
  return {
    x: clamp(position.x, -size.width / 2, canvas.width - size.width / 2),
    y: clamp(position.y, -size.height / 2, canvas.height - size.height / 2),
  };
}

export function getFinalDragPosition({
  canvas,
  position,
  size,
  transform,
  viewport,
}: {
  readonly canvas: Canvas;
  readonly position: Position;
  readonly size: Size;
  readonly transform: Transform;
  readonly viewport: Viewport;
}): Position {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return clampElementPosition(position, size, canvas);
  }

  return clampElementPosition(
    {
      x: position.x + (transform.x / viewport.width) * canvas.width,
      y: position.y + (transform.y / viewport.height) * canvas.height,
    },
    size,
    canvas,
  );
}

export function getDragTransform(
  to: Position | undefined,
  initial: Position,
): Transform | null {
  if (to === undefined) return null;

  return {
    x: to.x - initial.x,
    y: to.y - initial.y,
  };
}

export function getTerminalDragPosition({
  canvas,
  position,
  size,
  initial,
  current,
  viewport,
}: {
  readonly canvas: Canvas;
  readonly position: Position;
  readonly size: Size;
  readonly initial: Position;
  readonly current: Position;
  readonly viewport: Viewport;
}): Position {
  return getFinalDragPosition({
    canvas,
    position,
    size,
    transform: getDragTransform(current, initial) ?? { x: 0, y: 0 },
    viewport,
  });
}

export function getDragPreviewForSource(
  preview: DragPreview | null,
  source_id: string,
): DragPreview | null {
  if (preview?.elementId !== source_id) return null;

  return preview;
}

export function commitDragPreview(
  preview: DragPreview,
  on_move_end: (
    element_id: string,
    x: number,
    y: number,
  ) => Promise<DragCommitResult>,
): Promise<DragCommitResult> {
  return on_move_end(preview.elementId, preview.position.x, preview.position.y);
}

export function getResizeBounds({
  canvas,
  handle,
  pointerDelta,
  rotation = 0,
  start,
  viewport,
}: {
  readonly canvas: Canvas;
  readonly handle: ResizeHandle;
  readonly pointerDelta: Position;
  readonly rotation?: number;
  readonly start: ResizeStart;
  readonly viewport: Viewport;
}): ResizeStart {
  if (viewport.width <= 0 || viewport.height <= 0) return start;

  const viewport_delta = {
    x: (pointerDelta.x / viewport.width) * canvas.width,
    y: (pointerDelta.y / viewport.height) * canvas.height,
  };
  const delta = getLocalPointerDelta(viewport_delta, rotation);
  const resizes_north = handle.includes("north");
  const resizes_south = handle.includes("south");
  const resizes_west = handle.includes("west");
  const resizes_east = handle.includes("east");
  const requested_size = {
    width: Math.max(
      1,
      start.size.width +
        (resizes_east ? delta.x : 0) -
        (resizes_west ? delta.x : 0),
    ),
    height: Math.max(
      1,
      start.size.height +
        (resizes_south ? delta.y : 0) -
        (resizes_north ? delta.y : 0),
    ),
  };
  const unrotated_position = {
    x: resizes_west
      ? start.position.x + start.size.width - requested_size.width
      : start.position.x,
    y: resizes_north
      ? start.position.y + start.size.height - requested_size.height
      : start.position.y,
  };
  const start_center = {
    x: start.position.x + start.size.width / 2,
    y: start.position.y + start.size.height / 2,
  };
  const requested_center = {
    x: unrotated_position.x + requested_size.width / 2,
    y: unrotated_position.y + requested_size.height / 2,
  };
  const rotated_center_delta = rotateLocalOffset(
    {
      x: requested_center.x - start_center.x,
      y: requested_center.y - start_center.y,
    },
    rotation,
  );
  const requested_position = {
    x: start_center.x + rotated_center_delta.x - requested_size.width / 2,
    y: start_center.y + rotated_center_delta.y - requested_size.height / 2,
  };

  return {
    position: clampElementPosition(requested_position, requested_size, canvas),
    size: requested_size,
  };
}

export function getResizeCursor(
  handle: ResizeHandle,
  rotation: number,
): "ew-resize" | "ns-resize" | "nwse-resize" | "nesw-resize" {
  const handle_angle = {
    east: 0,
    "south-east": 45,
    south: 90,
    "south-west": 135,
    west: 180,
    "north-west": 225,
    north: 270,
    "north-east": 315,
  } satisfies Readonly<Record<ResizeHandle, number>>;
  const cursor_orientations = [
    { angle: 0, cursor: "ew-resize" },
    { angle: 45, cursor: "nwse-resize" },
    { angle: 90, cursor: "ns-resize" },
    { angle: 135, cursor: "nesw-resize" },
  ] as const;
  const orientation = normalizeRotation(handle_angle[handle] + rotation) % 180;

  return cursor_orientations.reduce((closest, candidate) =>
    angularDistance(orientation, candidate.angle) <
    angularDistance(orientation, closest.angle)
      ? candidate
      : closest,
  ).cursor;
}

export function canResizeElement(type: "text" | "image" | "shape"): boolean {
  return type === "text" || type === "image" || type === "shape";
}

export function getCenterResizeHandleSize(
  handle: CenterResizeHandle,
  rendered_size: RenderedSize,
): CenterResizeHandleSize | null {
  const is_horizontal = handle === "north" || handle === "south";
  const rendered_axis = is_horizontal
    ? rendered_size.width
    : rendered_size.height;
  const available_length =
    rendered_axis - CENTER_HANDLE_CORNER_SIZE - CENTER_HANDLE_CLEARANCE * 2;

  if (available_length < CENTER_HANDLE_MIN_LENGTH) return null;

  const length = clamp(
    available_length,
    CENTER_HANDLE_MIN_LENGTH,
    CENTER_HANDLE_MAX_LENGTH,
  );

  return is_horizontal
    ? { width: length, height: CENTER_HANDLE_THICKNESS }
    : { width: CENTER_HANDLE_THICKNESS, height: length };
}

export function shouldDisableElementDrag(is_editing: boolean): boolean {
  return is_editing;
}

export function stopEditingPointerDown(event: {
  stopPropagation(): void;
}): void {
  event.stopPropagation();
}

export function shouldDeselectCanvas(
  target: EventTarget | null,
  current_target: EventTarget | null,
): boolean {
  return target === current_target;
}

export function getRotationAngle({
  canvas,
  element,
  pointer,
  viewport,
}: {
  readonly canvas: Canvas;
  readonly element: ResizeStart;
  readonly pointer: Position;
  readonly viewport: CanvasViewport;
}): number {
  if (viewport.width <= 0 || viewport.height <= 0) return 0;

  const scale_x = viewport.width / canvas.width;
  const scale_y = viewport.height / canvas.height;
  const center = {
    x: viewport.left + (element.position.x + element.size.width / 2) * scale_x,
    y: viewport.top + (element.position.y + element.size.height / 2) * scale_y,
  };
  const logical_delta_x = (pointer.x - center.x) / scale_x;
  const logical_delta_y = (pointer.y - center.y) / scale_y;

  return normalizeRotation(
    (Math.atan2(logical_delta_y, logical_delta_x) * 180) / Math.PI + 90,
  );
}

export function resolveRotationPreviewAfterCommit(
  preview_rotation: number | null,
  result: DragCommitResult,
): number | null {
  return result.persisted ? preview_rotation : null;
}

export function cancelRotationPreview(): null {
  return null;
}

export function shouldShowRotationValue(
  preview_rotation: number | null,
  is_rotating: boolean,
): boolean {
  return is_rotating && preview_rotation !== null;
}

export function getRotationConnectorGeometry(
  rotation_offset: number,
  north_handle_size: number,
): { readonly height: number; readonly offsetY: number } {
  return {
    height: Math.max(0, rotation_offset - north_handle_size / 2),
    offsetY: -rotation_offset,
  };
}

const CENTER_HANDLE_CORNER_SIZE = 12;
const CENTER_HANDLE_CLEARANCE = 4;
const CENTER_HANDLE_THICKNESS = 8;
const CENTER_HANDLE_MIN_LENGTH = 18;
const CENTER_HANDLE_MAX_LENGTH = 24;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getLocalPointerDelta(delta: Position, rotation: number): Position {
  const radians = (-rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: delta.x * cosine - delta.y * sine,
    y: delta.x * sine + delta.y * cosine,
  };
}

function rotateLocalOffset(offset: Position, rotation: number): Position {
  const radians = (rotation * Math.PI) / 180;
  const cosine = normalizeTrigonometricValue(Math.cos(radians));
  const sine = normalizeTrigonometricValue(Math.sin(radians));

  return {
    x: offset.x * cosine - offset.y * sine,
    y: offset.x * sine + offset.y * cosine,
  };
}

function normalizeTrigonometricValue(value: number): number {
  return Math.abs(value) < 0.000_000_000_001 ? 0 : value;
}

function angularDistance(first: number, second: number): number {
  const distance = Math.abs(first - second);
  return Math.min(distance, 180 - distance);
}

function normalizeRotation(rotation: number): number {
  return ((Math.round(rotation) % 360) + 360) % 360;
}
