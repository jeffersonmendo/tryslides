import { EditorCanvas } from "./editor-canvas";
import type { EditorSlide } from "./editor-model";

type EditorWorkspaceProps = {
  readonly activeSlide: EditorSlide | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly labels: {
    readonly canvasLabel: string;
    readonly emptySlide: string;
  };
  readonly zoom: number;
};

export function EditorWorkspace({
  activeSlide,
  canvas,
  labels,
  zoom,
}: EditorWorkspaceProps) {
  return (
    <section
      aria-label={labels.canvasLabel}
      className="flex min-h-0 flex-1 items-center justify-center bg-muted p-8"
    >
      <EditorCanvas
        activeSlide={activeSlide}
        canvas={canvas}
        emptySlideLabel={labels.emptySlide}
        zoom={zoom}
      />
    </section>
  );
}
