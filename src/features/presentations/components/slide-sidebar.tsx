import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { EditorSlide } from "./editor-model";

type SlideSidebarProps = {
  readonly activeSlideId: string | null;
  readonly isPending: boolean;
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
  isPending,
  labels,
  slides,
  onCreateSlide,
  onSelectSlide,
}: SlideSidebarProps) {
  const initial_slide = slides[0] ?? null;

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{labels.slides}</h2>
        <Button
          aria-label={labels.addSlide}
          disabled={isPending}
          size="icon-sm"
          variant="ghost"
          onClick={onCreateSlide}
        >
          <IconPlus data-icon="inline-start" />
        </Button>
      </div>
      <nav aria-label={labels.slides} className="flex flex-col gap-2">
        {slides.map((slide) => (
          <button
            aria-current={slide.id === activeSlideId ? "true" : undefined}
            className="flex flex-col gap-1 rounded-xl p-2 text-left outline-none ring-ring focus-visible:ring-2 data-[active=true]:bg-sidebar-accent"
            data-active={slide.id === activeSlideId}
            key={slide.id}
            type="button"
            onClick={() => onSelectSlide(slide.id)}
          >
            <span
              aria-hidden
              className="aspect-video rounded border"
              style={{ background: slide.backgroundStyle }}
            />
            <span className="text-xs">
              {labels.slide} {slide.number}
            </span>
          </button>
        ))}
      </nav>
      {initial_slide === null ? null : (
        <section className="mt-auto flex flex-col gap-2 border-t pt-4">
          <h3 className="text-xs font-medium text-muted-foreground">
            {labels.presentation}
          </h3>
          <div className="flex flex-col gap-1 text-xs">
            <span>
              {labels.slideBackground}: {initial_slide.backgroundStyle}
            </span>
            <span>
              {labels.slideTransition}: {initial_slide.transitionLabel}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
