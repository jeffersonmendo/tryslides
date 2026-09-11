import {
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import { IconPlus } from "@tabler/icons-react";
import { useRef } from "react";
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
  readonly onReorderSlide: (
    slide_id: string,
    after_slide_id: string | null,
  ) => void;
  readonly onSelectSlide: (slide_id: string) => void;
};

type SlideDragEndInput = {
  readonly canceled: boolean;
  readonly sourceId: string | null;
  readonly finalTargetId: string | null;
  readonly hasSortablePositionChange: boolean;
};

export function SlideSidebar({
  activeSlideId: active_slide_id,
  canvas,
  imageUnavailableLabel: image_unavailable_label,
  imageUrls: image_urls,
  labels,
  slides,
  onCreateSlide,
  onReorderSlide: on_reorder_slide,
  onSelectSlide: on_select_slide,
}: SlideSidebarProps) {
  const latest_target_id_ref = useRef<string | null>(null);

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
      <DragDropProvider
        onDragEnd={(event) => {
          finishSlideDrag(
            getSlideDragEndInput(event),
            slides,
            on_reorder_slide,
            latest_target_id_ref,
          );
        }}
        onDragOver={(event) =>
          handleDragOver(event, slides, latest_target_id_ref)
        }
      >
        <nav
          aria-label={labels.slides}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {slides.map((slide, index) => (
            <SortableSlide
              activeSlideId={active_slide_id}
              canvas={canvas}
              imageUnavailableLabel={image_unavailable_label}
              imageUrls={image_urls}
              key={slide.id}
              labels={labels}
              slide={slide}
              index={index}
              onSelectSlide={on_select_slide}
            />
          ))}
        </nav>
      </DragDropProvider>
    </div>
  );
}

function SortableSlide({
  activeSlideId: active_slide_id,
  canvas,
  imageUnavailableLabel: image_unavailable_label,
  imageUrls: image_urls,
  labels,
  slide,
  index,
  onSelectSlide: on_select_slide,
}: Omit<SlideSidebarProps, "slides" | "onCreateSlide" | "onReorderSlide"> & {
  readonly slide: EditorSlide;
  readonly index: number;
}) {
  const { ref, isDragging: is_dragging } = useSortable({
    id: slide.id,
    index,
  });

  return (
    <button
      aria-current={slide.id === active_slide_id ? "true" : undefined}
      aria-label={slide.ariaLabel}
      className="flex flex-col select-none gap-1 rounded-xl p-2 text-left outline-none ring-ring focus-visible:ring-2 data-[active=true]:bg-sidebar-accent"
      data-active={slide.id === active_slide_id}
      data-dragging={is_dragging || undefined}
      ref={ref}
      type="button"
      onClick={() => on_select_slide(slide.id)}
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
          imageUnavailableLabel={image_unavailable_label}
          imageUrls={image_urls}
          slide={slide}
        />
      </div>
    </button>
  );
}

export function finishSlideDrag(
  input: SlideDragEndInput,
  slides: readonly Pick<EditorSlide, "id">[],
  on_reorder_slide: SlideSidebarProps["onReorderSlide"],
  latest_target_id_ref: { current: string | null },
): void {
  try {
    if (input.canceled) return;
    const target_id = getSlideDragTargetId(input, latest_target_id_ref.current);
    if (
      input.sourceId === null ||
      target_id === null ||
      input.sourceId === target_id
    ) {
      return;
    }
    const source_index = slides.findIndex(
      (slide) => slide.id === input.sourceId,
    );
    const target_index = slides.findIndex((slide) => slide.id === target_id);
    if (source_index === -1 || target_index === -1) return;
    const reordered = slides.filter((slide) => slide.id !== input.sourceId);
    reordered.splice(target_index, 0, slides[source_index]);
    const moved_index = reordered.findIndex(
      (slide) => slide.id === input.sourceId,
    );
    const after_slide_id = reordered[moved_index - 1]?.id ?? null;
    const current_after_slide_id = slides[source_index - 1]?.id ?? null;
    if (after_slide_id === current_after_slide_id) return;
    on_reorder_slide(input.sourceId, after_slide_id);
  } finally {
    latest_target_id_ref.current = null;
  }
}

function getSlideDragEndInput(event: DragEndEvent): SlideDragEndInput {
  const source_id = event.operation.source?.id;
  const final_target_id = event.operation.target?.id;
  const has_sortable_position_change =
    isSortableOperation(event.operation) &&
    event.operation.source !== null &&
    (event.operation.source.sortable.initialIndex !==
      event.operation.source.sortable.index ||
      event.operation.source.sortable.initialGroup !==
        event.operation.source.sortable.group);

  return {
    canceled: event.canceled,
    sourceId: typeof source_id === "string" ? source_id : null,
    finalTargetId: typeof final_target_id === "string" ? final_target_id : null,
    hasSortablePositionChange: has_sortable_position_change,
  };
}

function getSlideDragTargetId(
  input: SlideDragEndInput,
  fallback_target_id: string | null,
): string | null {
  if (
    input.finalTargetId === input.sourceId &&
    input.hasSortablePositionChange
  ) {
    return fallback_target_id;
  }

  return input.finalTargetId;
}

function handleDragOver(
  event: DragOverEvent,
  slides: readonly EditorSlide[],
  latest_target_id_ref: { current: string | null },
): void {
  const source_id = event.operation.source?.id;
  const target_id = event.operation.target?.id;
  if (
    typeof source_id === "string" &&
    typeof target_id === "string" &&
    source_id !== target_id &&
    slides.some((slide) => slide.id === target_id)
  ) {
    latest_target_id_ref.current = target_id;
  }
}
