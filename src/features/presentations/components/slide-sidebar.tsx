import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { EditorSlide } from "./editor-model";
import { SlideVisualContent } from "./slide-visual-content";

type SlideSidebarProps = {
  readonly activeSlideId: string | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly imageUnavailableLabel: string;
  readonly imageUrls: Readonly<Record<string, string>>;
  readonly labels: {
    readonly addSlide: string;
    readonly presentation: string;
    readonly slide: string;
    readonly slideBackground: string;
    readonly slideTransition: string;
    readonly slides: string;
  };
  readonly slides: readonly EditorSlide[];
  readonly onCreateSlide: () => void;
  readonly onSelectSlide: (slide_id: string) => void;
};

export function SlideSidebar({
  activeSlideId,
  canvas,
  imageUnavailableLabel,
  imageUrls,
  labels,
  slides,
  onCreateSlide,
  onSelectSlide,
}: SlideSidebarProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{labels.slides}</h2>
        <Button
          aria-label={labels.addSlide}
          size="icon-sm"
          variant="ghost"
          onClick={onCreateSlide}
        >
          <IconPlus data-icon="inline-start" />
        </Button>
      </div>
      <nav
        aria-label={labels.slides}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        {slides.map((slide) => (
          <button
            aria-current={slide.id === activeSlideId ? "true" : undefined}
            aria-label={slide.ariaLabel}
            className="flex flex-col select-none gap-1 rounded-xl p-2 text-left outline-none ring-ring focus-visible:ring-2 data-[active=true]:bg-sidebar-accent"
            data-active={slide.id === activeSlideId}
            key={slide.id}
            type="button"
            onClick={() => onSelectSlide(slide.id)}
          >
            <span className="text-xs">
              {labels.slide} {slide.number}
            </span>
            <div
              aria-hidden="true"
              className="aspect-video pointer-events-none overflow-hidden rounded border"
            >
              <SlideVisualContent
                canvas={canvas}
                imageUnavailableLabel={imageUnavailableLabel}
                imageUrls={imageUrls}
                slide={slide}
              />
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
