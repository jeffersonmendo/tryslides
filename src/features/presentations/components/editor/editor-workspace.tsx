import { useTranslations } from "next-intl";
import { EditorCanvas } from "./editor-canvas";
import type { DragCommitResult } from "./lib/editor-drag";
import type {
  EditorAnimationPlayback,
  EditorSlide,
  EditorTransitionPreview,
} from "./lib/editor-model";

type EditorWorkspaceProps = {
  readonly activeSlide: EditorSlide | null;
  readonly canvas: { readonly width: number; readonly height: number };
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
  readonly animationPlayback: EditorAnimationPlayback | null;
  readonly onAnimationEnd: (session_id: number, key: number) => void;
  readonly transitionPreview: EditorTransitionPreview | null;
  readonly onTransitionEnd: (key: number) => void;
};

export function EditorWorkspace({
  activeSlide,
  canvas,
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
  animationPlayback,
  onAnimationEnd,
  transitionPreview,
  onTransitionEnd,
}: EditorWorkspaceProps) {
  const t = useTranslations("Editor");
  return (
    <section
      aria-label={t("canvasLabel")}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted p-8"
    >
      <EditorCanvas
        activeSlide={activeSlide}
        canvas={canvas}
        selectionIds={selectionIds}
        referenceElementId={referenceElementId}
        imageUrls={imageUrls}
        onSelectElement={onSelectElement}
        onSetReferenceElement={onSetReferenceElement}
        onSelectElements={onSelectElements}
        onDeselectElement={onDeselectElement}
        onMoveEnd={onMoveEnd}
        onResizeEnd={onResizeEnd}
        onRotateEnd={onRotateEnd}
        onTextContentChange={onTextContentChange}
        onTextContentCommit={onTextContentCommit}
        animationPlayback={animationPlayback}
        onAnimationEnd={onAnimationEnd}
        transitionPreview={transitionPreview}
        onTransitionEnd={onTransitionEnd}
      />
    </section>
  );
}
