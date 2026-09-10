"use client";

import { useDraggable } from "@dnd-kit/react";
import { IconRotate2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import {
  type CenterResizeHandle,
  cancelRotationPreview,
  canResizeElement,
  type DragCommitResult,
  getCenterResizeHandleSize,
  getResizeBounds,
  getResizeCursor,
  getRotationAngle,
  getRotationConnectorGeometry,
  type ResizeHandle,
  resolveRotationPreviewAfterCommit,
  shouldDisableElementDrag,
  shouldShowRotationValue,
  stopEditingPointerDown,
} from "./editor-drag";
import type { EditorElement } from "./editor-model";

type EditorElementProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly element: EditorElement;
  readonly isSelected: boolean;
  readonly imageUrl: string | null;
  readonly imageUnavailableLabel: string;
  readonly moveInstruction: string;
  readonly rotationElementLabel: string;
  readonly rotationInstruction: string;
  readonly previewPosition:
    | { readonly x: number; readonly y: number }
    | undefined;
  readonly resizeElementLabel: string;
  readonly resizeHandleLabels: Readonly<Record<ResizeHandle, string>>;
  readonly getSlidePlaneRect: () => DOMRect | null;
  readonly onResizeEnd: (
    element_id: string,
    position: { readonly x: number; readonly y: number },
    size: { readonly width: number; readonly height: number },
  ) => Promise<DragCommitResult>;
  readonly onRotateEnd: (
    element_id: string,
    rotation: number,
  ) => Promise<DragCommitResult>;
  readonly onSelect: (element_id: string, additive?: boolean) => void;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
};

export function EditorElementView({
  canvas,
  element,
  isSelected,
  imageUrl,
  imageUnavailableLabel,
  moveInstruction,
  rotationElementLabel,
  rotationInstruction,
  previewPosition,
  resizeElementLabel,
  resizeHandleLabels,
  getSlidePlaneRect,
  onResizeEnd,
  onRotateEnd,
  onSelect,
  onTextContentChange,
  onTextContentCommit,
}: EditorElementProps) {
  const [is_editing_text, set_is_editing_text] = useState(false);
  const { ref, handleRef } = useDraggable({
    id: element.id,
    disabled: shouldDisableElementDrag(is_editing_text),
  });
  const resize_start = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    position: { readonly x: number; readonly y: number };
    handle: ResizeHandle;
    rotation: number;
  } | null>(null);
  const [preview_bounds, set_preview_bounds] = useState<{
    readonly position: { readonly x: number; readonly y: number };
    readonly width: number;
    readonly height: number;
  } | null>(null);
  const rotation_start = useRef<{ readonly hasMoved: boolean } | null>(null);
  const keyboard_rotation = useRef<number | null>(null);
  const element_container_ref = useRef<HTMLDivElement>(null);
  const [rendered_size, set_rendered_size] = useState<{
    readonly width: number;
    readonly height: number;
  } | null>(null);
  const [is_rotating, set_is_rotating] = useState(false);
  const [preview_rotation, set_preview_rotation] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const node = element_container_ref.current;
    if (node === null) return;

    const observer = new ResizeObserver(([entry]) => {
      const next_size = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      set_rendered_size((current) =>
        current?.width === next_size.width &&
        current.height === next_size.height
          ? current
          : next_size,
      );
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    set_preview_bounds((current) =>
      current?.position.x === element.position.x &&
      current.position.y === element.position.y &&
      current.width === element.size.width &&
      current.height === element.size.height
        ? null
        : current,
    );
  }, [
    element.position.x,
    element.position.y,
    element.size.height,
    element.size.width,
  ]);

  useEffect(() => {
    set_preview_rotation((current) =>
      current === element.rotation ? null : current,
    );
  }, [element.rotation]);

  function beginResize(
    event: React.PointerEvent<HTMLButtonElement>,
    handle: ResizeHandle,
  ) {
    event.preventDefault();
    event.stopPropagation();
    resize_start.current = {
      x: event.clientX,
      y: event.clientY,
      width: element.size.width,
      height: element.size.height,
      position: element.position,
      handle,
      rotation: displayed_rotation,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishResize(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resize_start.current;
    resize_start.current = null;
    if (start === null) return;
    const bounds = getSlidePlaneRect();
    if (bounds === null) return;
    const resized = getResizePreview(event, bounds, start);
    set_preview_bounds({
      position: resized.position,
      width: resized.size.width,
      height: resized.size.height,
    });
    void onResizeEnd(element.id, resized.position, resized.size).then(
      (result) => {
        if (!result.persisted) set_preview_bounds(null);
      },
    );
  }

  function previewResize(event: React.PointerEvent<HTMLButtonElement>) {
    const start = resize_start.current;
    if (start === null) return;
    const bounds = getSlidePlaneRect();
    if (bounds === null) return;
    const resized = getResizePreview(event, bounds, start);
    set_preview_bounds({
      position: resized.position,
      width: resized.size.width,
      height: resized.size.height,
    });
  }

  function cancelResize() {
    resize_start.current = null;
    set_preview_bounds(null);
  }

  function getPreviewRotation(event: React.PointerEvent<HTMLButtonElement>) {
    const bounds = getSlidePlaneRect();
    if (bounds === null) return element.rotation;
    return getRotationAngle({
      canvas,
      element: { position: element.position, size: element.size },
      pointer: { x: event.clientX, y: event.clientY },
      viewport: bounds,
    });
  }

  function beginRotation(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    rotation_start.current = { hasMoved: false };
    set_is_rotating(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function previewRotation(event: React.PointerEvent<HTMLButtonElement>) {
    if (rotation_start.current === null) return;
    rotation_start.current = { hasMoved: true };
    set_preview_rotation(getPreviewRotation(event));
  }

  function finishRotation(event: React.PointerEvent<HTMLButtonElement>) {
    const start = rotation_start.current;
    rotation_start.current = null;
    set_is_rotating(false);
    if (start === null || !start.hasMoved) return;
    const rotation = getPreviewRotation(event);
    set_preview_rotation(rotation);
    void Promise.resolve()
      .then(() => onRotateEnd(element.id, rotation))
      .then((result) => {
        set_preview_rotation((current) =>
          resolveRotationPreviewAfterCommit(current, result),
        );
      })
      .catch(() => set_preview_rotation(cancelRotationPreview()));
  }

  function cancelRotation() {
    rotation_start.current = null;
    set_is_rotating(false);
    set_preview_rotation(cancelRotationPreview());
  }

  function handleRotationKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    const rotation_delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : null;
    if (rotation_delta === null) return;
    event.preventDefault();
    event.stopPropagation();
    const next_rotation =
      ((keyboard_rotation.current ?? preview_rotation ?? element.rotation) +
        rotation_delta +
        360) %
      360;
    keyboard_rotation.current = next_rotation;
    set_is_rotating(true);
    set_preview_rotation(next_rotation);
  }

  function finishKeyboardRotation() {
    const rotation = keyboard_rotation.current;
    keyboard_rotation.current = null;
    set_is_rotating(false);
    if (rotation === null) return;
    void Promise.resolve()
      .then(() => onRotateEnd(element.id, rotation))
      .then((result) => {
        set_preview_rotation((current) =>
          resolveRotationPreviewAfterCommit(current, result),
        );
      })
      .catch(() => set_preview_rotation(cancelRotationPreview()));
  }

  function getResizePreview(
    event: React.PointerEvent<HTMLButtonElement>,
    bounds: DOMRect,
    start: NonNullable<typeof resize_start.current>,
  ) {
    return getResizeBounds({
      canvas,
      handle: start.handle,
      pointerDelta: { x: event.clientX - start.x, y: event.clientY - start.y },
      rotation: start.rotation,
      start: { position: start.position, size: start },
      viewport: bounds,
    });
  }

  const displayed_rotation = preview_rotation ?? element.rotation;
  const displayed_position =
    preview_bounds?.position ?? previewPosition ?? element.position;
  const displayed_size = {
    height: preview_bounds?.height ?? element.size.height,
    width: preview_bounds?.width ?? element.size.width,
  };
  const handle_size = 12;
  const border_width = 1;
  const rotation_offset = 24;
  const rotation_button_size = 20;
  const north_handle_size =
    canResizeElement(element.type) && rendered_size !== null
      ? getCenterResizeHandleSize("north", rendered_size)
      : null;
  const rotation_connector = getRotationConnectorGeometry(
    rotation_offset,
    north_handle_size?.height ?? 0,
  );

  function setElementContainer(node: HTMLDivElement | null) {
    ref(node);
    element_container_ref.current = node;
  }

  return (
    <div
      ref={setElementContainer}
      className="absolute outline-none"
      data-selected={isSelected}
      style={{
        height: `${(displayed_size.height / canvas.height) * 100}%`,
        left: `${(displayed_position.x / canvas.width) * 100}%`,
        top: `${(displayed_position.y / canvas.height) * 100}%`,
        width: `${(displayed_size.width / canvas.width) * 100}%`,
      }}
    >
      <div className="absolute inset-0" style={{ opacity: element.opacity }}>
        <div
          className="absolute inset-0"
          data-rotated-selection-plane
          style={{
            transform: `rotate(${displayed_rotation}deg)`,
            transformOrigin: "center",
          }}
        >
          <button
            ref={handleRef}
            aria-label={`${element.type}. ${moveInstruction}`}
            aria-pressed={isSelected}
            className="absolute inset-0 cursor-grab border-0 bg-transparent p-0 text-left focus-visible:outline-none active:cursor-grabbing"
            type="button"
            onClick={(event) =>
              onSelect(element.id, event.metaKey || event.ctrlKey)
            }
            onFocus={() => onSelect(element.id)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelect(element.id, event.metaKey || event.ctrlKey);
            }}
            onPointerDown={(event) =>
              onSelect(element.id, event.metaKey || event.ctrlKey)
            }
          >
            <ElementContent
              element={element}
              imageUrl={imageUrl}
              imageUnavailableLabel={imageUnavailableLabel}
              canvas={canvas}
              isEditing={is_editing_text}
              onTextContentChange={onTextContentChange}
              onTextContentCommit={onTextContentCommit}
              onEditingChange={set_is_editing_text}
            />
          </button>
          {isSelected ? (
            <div className="pointer-events-none absolute inset-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 border border-primary"
                style={{ borderWidth: border_width }}
              />
              {canResizeElement(element.type)
                ? RESIZE_HANDLES.filter(
                    (handle) => handle.direction !== "north",
                  ).map((handle) => {
                    const size =
                      handle.isCenter && rendered_size !== null
                        ? getCenterResizeHandleSize(
                            handle.direction,
                            rendered_size,
                          )
                        : handle.isCenter
                          ? null
                          : { width: handle_size, height: handle_size };
                    if (size === null) return null;

                    return (
                      <button
                        aria-label={`${resizeElementLabel}: ${resizeHandleLabels[handle.direction]}`}
                        className={`pointer-events-auto absolute border border-primary bg-background ${handle.isCenter ? "rounded" : "rounded-full"} ${handle.className}`}
                        key={handle.direction}
                        style={{
                          cursor: getResizeCursor(
                            handle.direction,
                            displayed_rotation,
                          ),
                          borderWidth: border_width,
                          height: size.height,
                          width: size.width,
                        }}
                        type="button"
                        onPointerCancel={cancelResize}
                        onPointerMove={previewResize}
                        onPointerDown={(event) =>
                          beginResize(event, handle.direction)
                        }
                        onPointerUp={finishResize}
                      />
                    );
                  })
                : null}
              <div
                className="absolute left-1/2 top-0"
                data-selection-center-axis
              >
                {north_handle_size !== null ? (
                  <button
                    aria-label={`${resizeElementLabel}: ${resizeHandleLabels.north}`}
                    className="pointer-events-auto absolute left-0 top-0 rounded border border-primary bg-background -translate-x-1/2 -translate-y-1/2"
                    style={{
                      borderWidth: border_width,
                      cursor: getResizeCursor("north", displayed_rotation),
                      height: north_handle_size.height,
                      width: north_handle_size.width,
                    }}
                    type="button"
                    onPointerCancel={cancelResize}
                    onPointerMove={previewResize}
                    onPointerDown={(event) => beginResize(event, "north")}
                    onPointerUp={finishResize}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 bg-primary"
                  style={{
                    height: rotation_connector.height,
                    transform: `translate(-50%, ${rotation_connector.offsetY}px)`,
                    width: border_width,
                  }}
                />
                <button
                  aria-description={rotationInstruction}
                  aria-label={rotationElementLabel}
                  className="pointer-events-auto absolute left-0 top-0 flex items-center justify-center rounded-full border border-primary bg-background text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{
                    borderWidth: border_width,
                    height: rotation_button_size,
                    transform: `translate(-50%, calc(-100% - ${rotation_offset}px))`,
                    width: rotation_button_size,
                  }}
                  type="button"
                  onKeyDown={handleRotationKeyDown}
                  onKeyUp={finishKeyboardRotation}
                  onPointerCancel={cancelRotation}
                  onPointerDown={beginRotation}
                  onPointerMove={previewRotation}
                  onPointerUp={finishRotation}
                >
                  <span
                    style={{ transform: `rotate(${-displayed_rotation}deg)` }}
                  >
                    <IconRotate2
                      aria-hidden
                      style={{
                        height: 12,
                        width: 12,
                      }}
                    />
                  </span>
                </button>
              </div>
              {shouldShowRotationValue(preview_rotation, is_rotating) ? (
                <output
                  aria-live="polite"
                  className="absolute left-[calc(50%+0.75rem)] top-0 -translate-y-[calc(100%+1.5rem)] whitespace-nowrap"
                >
                  <span
                    className="block rounded bg-background px-1 text-xs shadow"
                    style={{
                      transform: `rotate(${-displayed_rotation}deg)`,
                      transformOrigin: "top left",
                    }}
                  >
                    {preview_rotation}°
                  </span>
                </output>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ElementContent({
  canvas,
  element,
  imageUrl,
  imageUnavailableLabel,
  isEditing,
  onEditingChange,
  onTextContentChange,
  onTextContentCommit,
}: {
  readonly canvas: { readonly width: number };
  readonly element: EditorElement;
  readonly imageUrl: string | null;
  readonly imageUnavailableLabel: string;
  readonly isEditing: boolean;
  readonly onEditingChange: (is_editing: boolean) => void;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
}) {
  if (element.type === "text") {
    return (
      <CanvasText
        element={element}
        canvas={canvas}
        onContentChange={onTextContentChange}
        onContentCommit={onTextContentCommit}
        isEditing={isEditing}
        onEditingChange={onEditingChange}
      />
    );
  }
  if (element.type === "image") {
    return imageUrl === null ? (
      <span className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
        {imageUnavailableLabel}
      </span>
    ) : (
      // biome-ignore lint/performance/noImgElement: Local object URLs cannot be optimized by Next.js.
      <img
        alt=""
        className="size-full"
        src={imageUrl}
        style={{
          borderRadius: element.style.borderRadius,
          objectFit: element.style.objectFit as "cover" | "contain",
        }}
      />
    );
  }
  if (element.shapeType === "line") {
    return (
      <span
        className="absolute left-0 right-0 block"
        style={{
          borderTop: `${Math.max(1, element.style.borderWidth)}px solid ${element.style.fill}`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    );
  }
  return (
    <span
      className="block size-full"
      style={{
        background: element.style.fill,
        border: `${element.style.borderWidth}px solid ${element.style.border}`,
        borderRadius:
          element.shapeType === "circle" ? "9999px" : element.style.radius,
      }}
    />
  );
}

function CanvasText({
  canvas,
  element,
  onContentChange,
  onContentCommit,
  isEditing,
  onEditingChange,
}: {
  readonly canvas: { readonly width: number };
  readonly element: Extract<EditorElement, { readonly type: "text" }>;
  readonly onContentChange: (content: string) => void;
  readonly onContentCommit: (content: string) => void;
  readonly isEditing: boolean;
  readonly onEditingChange: (is_editing: boolean) => void;
}) {
  const content_ref = useRef<HTMLSpanElement>(null);
  const original_content = useRef(element.content);
  useEffect(() => {
    if (!isEditing && content_ref.current !== null)
      content_ref.current.textContent = element.content;
  }, [element.content, isEditing]);
  function commit() {
    const node = content_ref.current;
    const content = node?.textContent ?? "";
    onEditingChange(false);
    if (content !== element.content) onContentCommit(content);
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The canvas supports inline content editing on double click.
    <span
      ref={content_ref}
      contentEditable={isEditing}
      role={isEditing ? "textbox" : undefined}
      suppressContentEditableWarning
      className="block size-full overflow-visible whitespace-pre-wrap p-1 outline-none"
      style={{
        color: element.style.color,
        fontFamily: "Arial, sans-serif",
        fontSize: `${(element.style.fontSize / canvas.width) * 100}cqw`,
        fontWeight: element.style.fontWeight,
        textAlign: element.style.alignment as "left" | "center" | "right",
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        original_content.current = element.content;
        onEditingChange(true);
        requestAnimationFrame(() => content_ref.current?.focus());
      }}
      onPointerDown={(event) => {
        if (isEditing) stopEditingPointerDown(event);
      }}
      onBlur={commit}
      onInput={(event) =>
        onContentChange(event.currentTarget.textContent ?? "")
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (content_ref.current !== null)
            content_ref.current.textContent = original_content.current;
          onEditingChange(false);
          content_ref.current?.blur();
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          content_ref.current?.blur();
        }
      }}
    >
      {element.content}
    </span>
  );
}

type ResizeControl =
  | {
      readonly direction: CenterResizeHandle;
      readonly className: string;
      readonly isCenter: true;
    }
  | {
      readonly direction: Exclude<ResizeHandle, CenterResizeHandle>;
      readonly className: string;
      readonly isCenter: false;
    };

const RESIZE_HANDLES: readonly ResizeControl[] = [
  {
    direction: "north",
    className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
    isCenter: true,
  },
  {
    direction: "north-east",
    className: "right-0 top-0 translate-x-1/2 -translate-y-1/2",
    isCenter: false,
  },
  {
    direction: "east",
    className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
    isCenter: true,
  },
  {
    direction: "south-east",
    className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
    isCenter: false,
  },
  {
    direction: "south",
    className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    isCenter: true,
  },
  {
    direction: "south-west",
    className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
    isCenter: false,
  },
  {
    direction: "west",
    className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
    isCenter: true,
  },
  {
    direction: "north-west",
    className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
    isCenter: false,
  },
];
