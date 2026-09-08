import type { EditorSlide } from "./editor-model";

type SlideRendererProps = {
  readonly slide: EditorSlide | null;
  readonly emptySlideLabel: string;
  readonly zoom: number;
};

export function SlideRenderer({
  slide,
  emptySlideLabel,
  zoom,
}: SlideRendererProps) {
  if (slide === null)
    return (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        {emptySlideLabel}
      </div>
    );

  return (
    <div
      aria-label={slide.ariaLabel}
      className="size-full origin-center"
      role="img"
      style={{ background: slide.backgroundStyle, transform: `scale(${zoom})` }}
    />
  );
}
