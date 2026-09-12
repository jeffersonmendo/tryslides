"use client";

import { Feedback } from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EditorElementView } from "./editor-element";
import type { DragCommitResult } from "./lib/editor-drag";
import {
  commitDragPreview,
  getDragPreviewForSource,
  getDragPreviewPositions,
  getDragTransform,
  getFinalDragPosition,
  getTerminalDragPosition,
  shouldDeselectCanvas,
  updatePreviewPositionsAfterDragCommit,
} from "./lib/editor-drag";
import type { EditorSlide } from "./lib/editor-model";
import { SlideVisualContent } from "./slide-visual-content";

type SlideRendererProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly slide: EditorSlide | null;
  readonly selectionIds: readonly string[];
  readonly referenceElementId: string | null;
  readonly imageUrls: Readonly<Record<string, string>>;
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
    element_ids: readonly string[],
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
  selectionIds,
  referenceElementId,
  imageUrls,
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
  const t = useTranslations("Editor");
  const [preview_positions, set_preview_positions] = useState<
    Readonly<Record<string, { readonly x: number; readonly y: number }>>
  >({});
  const slide_plane_ref = useRef<HTMLDivElement>(null);
  const last_drag_preview_ref = useRef<{
    readonly elementId: string;
    readonly position: { readonly x: number; readonly y: number };
  } | null>(null);
  const drag_element_ids_ref = useRef<readonly string[]>([]);
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
        {t("emptySlide")}
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
    const source_preview = getDragPreviewForSource(
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
    const positions = getDragPreviewPositions({
      canvas,
      elements: getDragElements(source),
      sourceId: source.id,
      sourcePosition: source_preview.position,
    });
    const preview = {
      elementId: source.id,
      position: positions[source.id] ?? source_preview.position,
    };

    if (
      preview.position.x === source.position.x &&
      preview.position.y === source.position.y
    )
      return;

    setDragPreview(preview, positions);
    void commitDragPreview(preview, getDragElementIds(source), onMoveEnd).then(
      (result) => {
        if (!result.persisted) {
          set_preview_positions({});
          return;
        }
        set_preview_positions((current) =>
          updatePreviewPositionsAfterDragCommit(
            current,
            source.id,
            preview.position,
            result,
          ),
        );
      },
    );
  }

  function handleDragStart(event: DragStartEvent) {
    last_drag_preview_ref.current = null;
    const source = getDragSource(event.operation.source?.id);
    if (source === undefined) return;
    drag_element_ids_ref.current = selectionIds.includes(source.id)
      ? selectionIds
      : [source.id];
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
    const source_position = getFinalDragPosition({
      canvas,
      position: source.position,
      size: source.size,
      transform,
      viewport: bounds,
    });
    const positions = getDragPreviewPositions({
      canvas,
      elements: getDragElements(source),
      sourceId: source.id,
      sourcePosition: source_position,
    });
    const position = positions[source.id] ?? source_position;
    setDragPreview({ elementId: source.id, position }, positions);
  }

  function setDragPreview(
    preview: NonNullable<typeof last_drag_preview_ref.current>,
    positions: Readonly<
      Record<string, { readonly x: number; readonly y: number }>
    > = { [preview.elementId]: preview.position },
  ) {
    flushSync(() => {
      set_preview_positions((current) => ({
        ...current,
        ...positions,
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

  function getDragElementIds(source: EditorSlide["elements"][number]) {
    return drag_element_ids_ref.current.includes(source.id)
      ? drag_element_ids_ref.current
      : [source.id];
  }

  function getDragElements(source: EditorSlide["elements"][number]) {
    const element_ids = getDragElementIds(source);
    return active_slide.elements.filter((element) =>
      element_ids.includes(element.id),
    );
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
            isSelected={selectionIds.includes(element.id)}
            isReference={referenceElementId === element.id}
            canSetReference={selectionIds.length >= 2}
            key={element.id}
            previewPosition={preview_positions[element.id]}
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
