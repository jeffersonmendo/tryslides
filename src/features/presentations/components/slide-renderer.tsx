"use client";

import { Feedback } from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { DragCommitResult } from "./editor-drag";
import {
  commitDragPreview,
  getDragPreviewForSource,
  getDragTransform,
  getFinalDragPosition,
  getTerminalDragPosition,
  type ResizeHandle,
  shouldDeselectCanvas,
  updatePreviewPositionsAfterDragCommit,
} from "./editor-drag";
import { EditorElementView } from "./editor-element";
import type { EditorSlide } from "./editor-model";
import { SlideVisualContent } from "./slide-visual-content";

type SlideRendererProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly slide: EditorSlide | null;
  readonly emptySlideLabel: string;
  readonly selectionIds: readonly string[];
  readonly referenceElementId: string | null;
  readonly imageUrls: Readonly<Record<string, string>>;
  readonly imageUnavailableLabel: string;
  readonly moveInstruction: string;
  readonly rotationElementLabel: string;
  readonly rotationInstruction: string;
  readonly referenceElementLabel: string;
  readonly resizeElementLabel: string;
  readonly resizeHandleLabels: Readonly<Record<ResizeHandle, string>>;
  readonly onSelectElement: (element_id: string, additive?: boolean) => void;
  readonly onSetReferenceElement: (element_id: string) => void;
  readonly onSelectElements: (
    element_ids: readonly string[],
    additive: boolean,
  ) => void;
  readonly onDeselectElement: () => void;
  readonly onMoveEnd: (
    element_id: string,
    x: number,
    y: number,
  ) => Promise<DragCommitResult>;
  readonly onRotateEnd: (
    element_id: string,
    rotation: number,
  ) => Promise<DragCommitResult>;
  readonly onResizeEnd: (
    element_id: string,
    position: { readonly x: number; readonly y: number },
    size: { readonly width: number; readonly height: number },
  ) => Promise<DragCommitResult>;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
};

export function SlideRenderer({
  canvas,
  slide,
  emptySlideLabel,
  selectionIds,
  referenceElementId,
  imageUrls,
  imageUnavailableLabel,
  moveInstruction,
  rotationElementLabel,
  rotationInstruction,
  referenceElementLabel,
  resizeElementLabel,
  resizeHandleLabels,
  onSelectElement,
  onSetReferenceElement,
  onSelectElements,
  onDeselectElement,
  onMoveEnd,
  onResizeEnd,
  onRotateEnd,
  onTextContentChange,
  onTextContentCommit,
}: SlideRendererProps) {
  const [preview_positions, set_preview_positions] = useState<
    Readonly<Record<string, { readonly x: number; readonly y: number }>>
  >({});
  const slide_plane_ref = useRef<HTMLDivElement>(null);
  const last_drag_preview_ref = useRef<{
    readonly elementId: string;
    readonly position: { readonly x: number; readonly y: number };
  } | null>(null);
  const [marquee, set_marquee] = useState<{
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
    readonly additive: boolean;
  } | null>(null);
  const marquee_ref = useRef<MarqueeSelection | null>(null);
  const marquee_frame_ref = useRef<number | null>(null);

  useEffect(() => {
    set_preview_positions((current) => {
      let has_resolved_preview = false;
      const next = { ...current };

      for (const element of slide?.elements ?? []) {
        const preview = next[element.id];
        if (
          preview !== undefined &&
          preview.x === element.position.x &&
          preview.y === element.position.y
        ) {
          delete next[element.id];
          has_resolved_preview = true;
        }
      }

      return has_resolved_preview ? next : current;
    });
  }, [slide]);

  useEffect(
    () => () => {
      if (marquee_frame_ref.current !== null)
        cancelAnimationFrame(marquee_frame_ref.current);
    },
    [],
  );

  if (slide === null)
    return (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        {emptySlideLabel}
      </div>
    );

  const active_slide = slide;

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) {
      last_drag_preview_ref.current = null;
      set_preview_positions({});
      return;
    }
    const source = getDragSource(event.operation.source?.id);
    const bounds = slide_plane_ref.current?.getBoundingClientRect() ?? null;
    if (source === undefined || bounds === null) {
      return;
    }
    const preview = getDragPreviewForSource(
      last_drag_preview_ref.current,
      source.id,
    ) ?? {
      elementId: source.id,
      position: getTerminalDragPosition({
        canvas,
        position: source.position,
        size: source.size,
        initial: event.operation.position.initial,
        current: event.operation.position.current,
        viewport: bounds,
      }),
    };

    if (
      preview.position.x === source.position.x &&
      preview.position.y === source.position.y
    )
      return;

    setDragPreview(preview);
    void commitDragPreview(preview, onMoveEnd).then((result) => {
      set_preview_positions((current) =>
        updatePreviewPositionsAfterDragCommit(
          current,
          source.id,
          preview.position,
          result,
        ),
      );
    });
  }

  function handleDragStart(event: DragStartEvent) {
    last_drag_preview_ref.current = null;
    const source = getDragSource(event.operation.source?.id);
    if (source === undefined) return;
    if (!selectionIds.includes(source.id)) onSelectElement(source.id);
  }

  function handleDragMove(event: DragMoveEvent) {
    const source = getDragSource(event.operation.source?.id);
    const bounds = slide_plane_ref.current?.getBoundingClientRect() ?? null;
    if (source === undefined || bounds === null) return;
    const transform = getDragTransform(
      event.to,
      event.operation.position.initial,
    );
    if (transform === null) return;
    const position = getFinalDragPosition({
      canvas,
      position: source.position,
      size: source.size,
      transform,
      viewport: bounds,
    });
    setDragPreview({ elementId: source.id, position });
  }

  function setDragPreview(
    preview: NonNullable<typeof last_drag_preview_ref.current>,
  ) {
    flushSync(() => {
      set_preview_positions((current) => ({
        ...current,
        [preview.elementId]: preview.position,
      }));
    });
    // Drag end may only select a preview after React has committed it to the DOM.
    last_drag_preview_ref.current = preview;
  }

  function setMarqueePreview(next_marquee: MarqueeSelection, flush = false) {
    marquee_ref.current = next_marquee;
    if (flush) {
      flushMarqueePreview();
      return;
    }
    if (marquee_frame_ref.current !== null) return;
    marquee_frame_ref.current = requestAnimationFrame(flushMarqueePreview);
  }

  function flushMarqueePreview() {
    if (marquee_frame_ref.current !== null) {
      cancelAnimationFrame(marquee_frame_ref.current);
      marquee_frame_ref.current = null;
    }
    set_marquee(marquee_ref.current);
  }

  function getDragSource(id: string | number | undefined) {
    return active_slide.elements.find((element) => element.id === id);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!shouldDeselectCanvas(event.target, event.currentTarget)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setMarqueePreview(
      {
        start: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
        end: {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        },
        additive: event.metaKey || event.ctrlKey,
      },
      true,
    );
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const current_marquee = marquee_ref.current;
    if (current_marquee === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setMarqueePreview({
      ...current_marquee,
      end: {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      },
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const current_marquee = marquee_ref.current;
    if (current_marquee === null) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const final_marquee = {
      ...current_marquee,
      end: {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      },
    };
    const selection = getMarqueeSelection(
      active_slide.elements,
      canvas,
      bounds,
      final_marquee,
    );
    marquee_ref.current = null;
    if (marquee_frame_ref.current !== null) {
      cancelAnimationFrame(marquee_frame_ref.current);
      marquee_frame_ref.current = null;
    }
    set_marquee(null);
    if (selection.length === 0 && !final_marquee.additive) onDeselectElement();
    else onSelectElements(selection, final_marquee.additive);
  }

  return (
    <DragDropProvider
      onDragEnd={handleDragEnd}
      onDragMove={handleDragMove}
      onDragStart={handleDragStart}
      plugins={(defaults) =>
        defaults.map((plugin) =>
          plugin === Feedback
            ? Feedback.configure({ feedback: "none" })
            : plugin,
        )
      }
    >
      <SlideVisualContent
        canvas={canvas}
        imageUnavailableLabel={imageUnavailableLabel}
        imageUrls={imageUrls}
        slide={active_slide}
        planeProps={{
          ref: slide_plane_ref,
          "data-editor-canvas": true,
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
        }}
        renderElement={(element) => (
          <EditorElementView
            canvas={canvas}
            element={element}
            imageUrl={
              element.type === "image"
                ? (imageUrls[element.assetId] ?? null)
                : null
            }
            imageUnavailableLabel={imageUnavailableLabel}
            isSelected={selectionIds.includes(element.id)}
            isReference={referenceElementId === element.id}
            canSetReference={selectionIds.length >= 2}
            key={element.id}
            moveInstruction={moveInstruction}
            previewPosition={preview_positions[element.id]}
            resizeElementLabel={resizeElementLabel}
            resizeHandleLabels={resizeHandleLabels}
            rotationElementLabel={rotationElementLabel}
            rotationInstruction={rotationInstruction}
            referenceElementLabel={referenceElementLabel}
            getSlidePlaneRect={() =>
              slide_plane_ref.current?.getBoundingClientRect() ?? null
            }
            onResizeEnd={onResizeEnd}
            onRotateEnd={onRotateEnd}
            onTextContentChange={onTextContentChange}
            onTextContentCommit={onTextContentCommit}
            onSelect={onSelectElement}
            onSetReference={onSetReferenceElement}
          />
        )}
      >
        {marquee !== null ? <Marquee selection={marquee} /> : null}
      </SlideVisualContent>
    </DragDropProvider>
  );
}

type MarqueeSelection = {
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
  readonly additive: boolean;
};

function Marquee({ selection }: { readonly selection: MarqueeSelection }) {
  const left = Math.min(selection.start.x, selection.end.x);
  const top = Math.min(selection.start.y, selection.end.y);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute border border-primary bg-primary/10"
      style={{
        left,
        top,
        width: Math.abs(selection.end.x - selection.start.x),
        height: Math.abs(selection.end.y - selection.start.y),
      }}
    />
  );
}

function getMarqueeSelection(
  elements: readonly EditorSlide["elements"][number][],
  canvas: { readonly width: number; readonly height: number },
  bounds: DOMRect,
  marquee: {
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
  },
): readonly string[] {
  const left =
    (Math.min(marquee.start.x, marquee.end.x) / bounds.width) * canvas.width;
  const right =
    (Math.max(marquee.start.x, marquee.end.x) / bounds.width) * canvas.width;
  const top =
    (Math.min(marquee.start.y, marquee.end.y) / bounds.height) * canvas.height;
  const bottom =
    (Math.max(marquee.start.y, marquee.end.y) / bounds.height) * canvas.height;
  return elements
    .filter(
      (element) =>
        element.position.x >= left &&
        element.position.y >= top &&
        element.position.x + element.size.width <= right &&
        element.position.y + element.size.height <= bottom,
    )
    .map((element) => element.id);
}
