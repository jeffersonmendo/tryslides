import { EditorCanvas } from "./editor-canvas";
import type { DragCommitResult, ResizeHandle } from "./editor-drag";
import type { EditorSlide } from "./editor-model";

type EditorWorkspaceProps = {
  readonly activeSlide: EditorSlide | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly labels: {
    readonly canvasLabel: string;
    readonly emptySlide: string;
    readonly imageUnavailable: string;
    readonly moveInstruction: string;
    readonly rotationElement: string;
    readonly rotationInstruction: string;
    readonly resizeElement: string;
    readonly resizeHandleLabels: Readonly<Record<ResizeHandle, string>>;
  };
  readonly selectionIds: readonly string[];
  readonly imageUrls: Readonly<Record<string, string>>;
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

export function EditorWorkspace({
  activeSlide,
  canvas,
  labels,
  selectionIds,
  imageUrls,
  onSelectElement,
  onSelectElements,
  onDeselectElement,
  onMoveEnd,
  onResizeEnd,
  onRotateEnd,
  onTextContentChange,
  onTextContentCommit,
}: EditorWorkspaceProps) {
  return (
    <section
      aria-label={labels.canvasLabel}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted p-8"
    >
      <EditorCanvas
        activeSlide={activeSlide}
        canvas={canvas}
        emptySlideLabel={labels.emptySlide}
        selectionIds={selectionIds}
        imageUrls={imageUrls}
        imageUnavailableLabel={labels.imageUnavailable}
        moveInstruction={labels.moveInstruction}
        rotationElementLabel={labels.rotationElement}
        rotationInstruction={labels.rotationInstruction}
        resizeElementLabel={labels.resizeElement}
        resizeHandleLabels={labels.resizeHandleLabels}
        onSelectElement={onSelectElement}
        onSelectElements={onSelectElements}
        onDeselectElement={onDeselectElement}
        onMoveEnd={onMoveEnd}
        onResizeEnd={onResizeEnd}
        onRotateEnd={onRotateEnd}
        onTextContentChange={onTextContentChange}
        onTextContentCommit={onTextContentCommit}
      />
    </section>
  );
}
