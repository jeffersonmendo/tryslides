import type { EditorSlide } from "./editor-model";
import { SlideRenderer } from "./slide-renderer";

type EditorCanvasProps = {
  readonly activeSlide: EditorSlide | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly emptySlideLabel: string;
  readonly zoom: number;
};

export function EditorCanvas({
  activeSlide,
  canvas,
  emptySlideLabel,
  zoom,
}: EditorCanvasProps) {
  return (
    <div
      className="w-full max-w-5xl overflow-hidden border bg-background shadow-sm"
      style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
    >
      <SlideRenderer
        emptySlideLabel={emptySlideLabel}
        slide={activeSlide}
        zoom={zoom}
      />
    </div>
  );
}
