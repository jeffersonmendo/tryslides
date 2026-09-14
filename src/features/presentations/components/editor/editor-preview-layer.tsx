import { type CSSProperties, useEffect, useMemo, useState } from "react";
import type { EditorTransitionPreview } from "./lib/editor-model";
import { SlideVisualContent } from "./slide-visual-content";

type EditorPreviewLayerProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly transitionPreview: EditorTransitionPreview | null;
  readonly imageUrls: Readonly<Record<string, string>>;
  readonly onTransitionEnd: (key: number) => void;
};

export function EditorPreviewLayer({
  canvas,
  transitionPreview,
  imageUrls,
  onTransitionEnd,
}: EditorPreviewLayerProps) {
  if (transitionPreview === null) return null;
  const animation_name = `editor-transition-${transitionPreview.transition.transitionType}`;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      key={transitionPreview.key}
    >
      <style>{getTransitionKeyframes()}</style>
      <div
        className="absolute inset-0"
        style={{
          animation: `${animation_name} ${transitionPreview.transition.transitionDuration}ms ease-out both`,
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget)
            onTransitionEnd(transitionPreview.key);
        }}
      >
        <SlideVisualContent
          canvas={canvas}
          imageUrls={imageUrls}
          slide={transitionPreview.nextSlide}
        />
      </div>
    </div>
  );
}

export function getAnimationPreviewStyle({
  key,
  type,
  duration,
  delay,
  easing,
  repeat,
  interval,
}: {
  readonly key: number;
  readonly type: string;
  readonly duration: number;
  readonly delay: number;
  readonly easing: string;
  readonly repeat?: number | "infinite";
  readonly interval?: number;
}) {
  const iterations = repeat ?? 1;
  const cycle_duration = duration + (interval ?? 0);
  return {
    animationDelay: `${delay}ms`,
    animationDuration: `${cycle_duration}ms`,
    animationFillMode: "both",
    animationIterationCount: iterations,
    animationName: `editor-animation-${type}-${key}`,
    animationTimingFunction: easing,
  };
}

type TypewriterTextPreviewProps = {
  readonly className: string;
  readonly content: string;
  readonly delay: number;
  readonly duration: number;
  readonly style: CSSProperties;
};

export function TypewriterTextPreview({
  className,
  content,
  delay,
  duration,
  style,
}: TypewriterTextPreviewProps) {
  const characters = useMemo(() => Array.from(content), [content]);
  const [revealed_count, set_revealed_count] = useState(0);
  const [is_active, set_is_active] = useState(false);

  useEffect(() => {
    set_revealed_count(0);
    set_is_active(false);

    const start_timer = setTimeout(() => set_is_active(true), delay);
    const timers = characters.map((_, index) =>
      setTimeout(
        () => {
          set_revealed_count(index + 1);
        },
        delay + ((index + 1) / characters.length) * duration,
      ),
    );
    const completion_timer = setTimeout(() => {
      set_revealed_count(characters.length);
      set_is_active(false);
    }, delay + duration);

    return () => {
      clearTimeout(start_timer);
      for (const timer of timers) clearTimeout(timer);
      clearTimeout(completion_timer);
    };
  }, [characters, delay, duration]);

  return (
    <span className={className} style={style}>
      {characters.slice(0, revealed_count).join("")}
      {is_active ? (
        <span
          aria-hidden="true"
          className="motion-safe:animate-[editor-typewriter-cursor-blink_1s_step-end_infinite]"
          data-typewriter-cursor
        >
          |
        </span>
      ) : null}
    </span>
  );
}

type EditorAnimationPreviewStylesProps = {
  readonly previews: readonly {
    readonly key: number;
    readonly animation: {
      readonly type: string;
      readonly duration: number;
      readonly interval?: number;
    };
  }[];
};

export function EditorAnimationPreviewStyles({
  previews,
}: EditorAnimationPreviewStylesProps) {
  return previews.length === 0 ? null : (
    <style>{previews.map(getAnimationKeyframes).join("\n")}</style>
  );
}

function getAnimationKeyframes(
  preview: EditorAnimationPreviewStylesProps["previews"][number],
): string {
  const name = `editor-animation-${preview.animation.type}-${preview.key}`;
  const active_percentage =
    (preview.animation.duration /
      (preview.animation.duration + (preview.animation.interval ?? 0))) *
    100;
  return `
    @keyframes ${name} {
      ${getAnimationFrames(preview.animation.type, active_percentage)}
    }
  `;
}

function getAnimationFrames(type: string, active_percentage: number): string {
  const active_end = `${active_percentage}%`;
  const active_middle = `${active_percentage / 2}%`;
  switch (type) {
    case "fade-in":
      return "from { opacity: 0; } to { opacity: 1; }";
    case "slide-in":
      return "from { opacity: 0; transform: translateX(-12%); } to { opacity: 1; transform: translateX(0); }";
    case "scale-in":
      return "from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); }";
    case "typewriter":
      return "from { opacity: 1; } to { opacity: 1; }";
    case "fade-out":
      return "from { opacity: 1; } to { opacity: 0; }";
    case "slide-out":
      return "from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(12%); }";
    case "scale-out":
      return "from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.85); }";
    case "float":
      return `0%, ${active_end}, 100% { transform: translateY(0); } ${active_middle} { transform: translateY(-8%); }`;
    case "pulse":
      return `0%, ${active_end}, 100% { transform: scale(1); } ${active_middle} { transform: scale(1.06); }`;
    case "rotate":
      return `0% { transform: rotate(0deg); } ${active_end}, 100% { transform: rotate(360deg); }`;
    default:
      return "from { opacity: 1; } to { opacity: 1; }";
  }
}

function getTransitionKeyframes(): string {
  return `
    @keyframes editor-transition-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes editor-transition-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes editor-transition-scale { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes editor-transition-none { from { opacity: 1; } to { opacity: 1; } }
  `;
}
