"use client";

import { PRESENTATION_CANVAS } from "../core/types";
import type { DragCommitResult, ResizeHandle } from "./editor-drag";
import type { EditorSlide } from "./editor-model";
import { SlideRenderer } from "./slide-renderer";

type EditorCanvasProps = {
  readonly activeSlide: EditorSlide | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly emptySlideLabel: string;
  readonly selectionIds: readonly string[];
  readonly imageUrls: Readonly<Record<string, string>>;
  readonly imageUnavailableLabel: string;
  readonly moveInstruction: string;
  readonly rotationElementLabel: string;
  readonly rotationInstruction: string;
  readonly resizeElementLabel: string;
  readonly resizeHandleLabels: Readonly<Record<ResizeHandle, string>>;
  readonly onSelectElement: (element_id: string, additive?: boolean) => void;
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
  readonly onResizeEnd: (
    element_id: string,
    position: { readonly x: number; readonly y: number },
    size: { readonly width: number; readonly height: number },
  ) => Promise<DragCommitResult>;
  readonly onRotateEnd: (
    element_id: string,
    rotation: number,
  ) => Promise<DragCommitResult>;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
};

export function EditorCanvas({
  activeSlide,
  canvas,
  emptySlideLabel,
  selectionIds,
  imageUrls,
  imageUnavailableLabel,
  moveInstruction,
  rotationElementLabel,
  rotationInstruction,
  resizeElementLabel,
  resizeHandleLabels,
  onSelectElement,
  onSelectElements,
  onDeselectElement,
  onMoveEnd,
  onResizeEnd,
  onRotateEnd,
  onTextContentChange,
  onTextContentCommit,
}: EditorCanvasProps) {
  return (
    <div
      className="relative group overflow-visible shrink-0 data-[selected=true]:outline dark:data-[selected=true]:outline-2 bg-background data-[selected=true]:outline-blue-500"
      data-selected={activeSlide !== null && selectionIds.length === 0}
      style={{
        width: "100%",
        maxWidth: canvas.width / 2,
        aspectRatio: `${canvas.width} / ${canvas.height}`,
      }}
    >
      {activeSlide === null ? null : (
        <button
          aria-pressed={selectionIds.length === 0}
          className="cursor-pointer absolute bottom-full left-0 mb-2 flex items-center gap-4 rounded-md bg-white dark:bg-sidebar dark:group-data-[selected=true]:bg-blue-500 dark:outline-none! p-1 px-2 text-xs! text-foreground group-data-[selected=true]:bg-blue-500 group-data-[selected=true]:outline group-data-[selected=true]:outline-none select-none group-data-[selected=true]:text-white"
          type="button"
          onClick={onDeselectElement}
        >
          <span>{activeSlide.ariaLabel}</span>
        </button>
      )}
      {activeSlide === null ? null : (
        <span className="absolute bottom-full font-mono! right-0 text-muted-foreground/60 mb-2 text-xs">
          {PRESENTATION_CANVAS.height}{" "}
          <span className="text-muted-foreground/50">x</span>{" "}
          {PRESENTATION_CANVAS.width}{" "}
          <span className="text-muted-foreground/50">px</span>
        </span>
      )}
      <SlideRenderer
        canvas={canvas}
        emptySlideLabel={emptySlideLabel}
        selectionIds={selectionIds}
        imageUrls={imageUrls}
        imageUnavailableLabel={imageUnavailableLabel}
        moveInstruction={moveInstruction}
        rotationElementLabel={rotationElementLabel}
        rotationInstruction={rotationInstruction}
        resizeElementLabel={resizeElementLabel}
        resizeHandleLabels={resizeHandleLabels}
        slide={activeSlide}
        onSelectElement={onSelectElement}
        onSelectElements={onSelectElements}
        onDeselectElement={onDeselectElement}
        onMoveEnd={onMoveEnd}
        onResizeEnd={onResizeEnd}
        onRotateEnd={onRotateEnd}
        onTextContentChange={onTextContentChange}
        onTextContentCommit={onTextContentCommit}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 -z-10 h-[100vmax] w-[100vmax] -translate-x-1/2 bg-muted/80"
        data-canvas-outside-overlay="top"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-1/2 -z-10 h-[100vmax] w-[100vmax] -translate-x-1/2 bg-muted/80"
        data-canvas-outside-overlay="bottom"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-full top-0 -z-10 h-full w-[100vmax] bg-muted/80"
        data-canvas-outside-overlay="left"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-0 -z-10 h-full w-[100vmax] bg-muted/80"
        data-canvas-outside-overlay="right"
      />
    </div>
  );
}
