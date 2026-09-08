"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { EditorCapability } from "@/features/presentations/application/editor-capability";
import type {
  PresentationState,
  Slide,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import type { EditorSelection, EditorSlide } from "./editor-model";
import { EditorShell } from "./editor-shell";

type EditorControllerProps = {
  readonly capability: EditorCapability;
  readonly presentationId: string;
};

type EditorStatus =
  | { readonly kind: "loading" }
  | { readonly kind: "not-found" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly state: PresentationState };

export function EditorController({
  capability,
  presentationId,
}: EditorControllerProps) {
  const t = useTranslations("Editor");
  const [status, set_status] = useState<EditorStatus>({ kind: "loading" });
  const [active_slide_id, set_active_slide_id] = useState<string | null>(null);
  const [selection, set_selection] = useState<EditorSelection>({
    kind: "none",
  });
  const [zoom] = useState(1);
  const [is_pending, set_is_pending] = useState(false);
  const [persistence_error, set_persistence_error] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let is_active = true;

    async function loadEditor() {
      try {
        const result = await capability.loadPresentation(presentationId);
        if (!is_active) return;
        if (!result.success) {
          set_status({
            kind:
              result.code === "PRESENTATION_NOT_FOUND" ? "not-found" : "error",
          });
          return;
        }
        set_active_slide_id(result.state.slides[0]?.id ?? null);
        set_status({ kind: "ready", state: result.state });
      } catch {
        if (is_active) set_status({ kind: "error" });
      }
    }

    void loadEditor();
    return () => {
      is_active = false;
    };
  }, [capability, presentationId]);

  async function runCommand(
    command: (state: PresentationState) => ReturnType<EditorCapability["undo"]>,
    select_created_slide = false,
  ) {
    if (status.kind !== "ready" || is_pending) return;
    set_is_pending(true);
    set_persistence_error(null);
    let result: Awaited<ReturnType<EditorCapability["undo"]>>;
    try {
      result = await command(status.state);
    } catch {
      set_is_pending(false);
      set_persistence_error(t("persistenceError"));
      return;
    }
    set_is_pending(false);
    if (!result.success) {
      set_persistence_error(t("persistenceError"));
      return;
    }
    const next_active_slide_id = select_created_slide
      ? (result.state.slides.at(-1)?.id ?? null)
      : getActiveSlideId(result.state.slides, active_slide_id);
    set_active_slide_id(next_active_slide_id);
    set_status({ kind: "ready", state: result.state });
  }

  if (status.kind === "loading") return <EditorLoading label={t("loading")} />;
  if (status.kind === "not-found")
    return (
      <EditorMessage
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      />
    );
  if (status.kind === "error")
    return (
      <EditorMessage
        title={t("loadErrorTitle")}
        description={t("loadErrorDescription")}
      />
    );

  const transition_labels: Record<TransitionType, string> = {
    none: t("transitionNone"),
    fade: t("transitionFade"),
    slide: t("transitionSlide"),
    scale: t("transitionScale"),
  };
  const slides = status.state.slides.map((slide, index) =>
    toEditorSlide(
      slide,
      index,
      t("slideNumber", { number: index + 1 }),
      transition_labels,
    ),
  );
  const active_slide =
    slides.find((slide) => slide.id === active_slide_id) ?? null;

  return (
    <EditorShell
      title={status.state.title}
      slides={slides}
      activeSlide={active_slide}
      activeSlideId={active_slide_id}
      canvas={status.state.canvas}
      canRedo={status.state.redoStack.length > 0 && !is_pending}
      canUndo={status.state.undoStack.length > 0 && !is_pending}
      isPending={is_pending}
      persistenceError={persistence_error}
      selection={selection}
      zoom={zoom}
      labels={{
        addSlide: t("addSlide"),
        canvasLabel: t("canvasLabel"),
        desktopRequiredDescription: t("desktopRequiredDescription"),
        desktopRequiredTitle: t("desktopRequiredTitle"),
        emptySlide: t("emptySlide"),
        noSelection: t("noSelection"),
        presentation: t("presentation"),
        properties: t("properties"),
        redo: t("redo"),
        saveError: t("saveError"),
        saved: t("saved"),
        saving: t("saving"),
        slide: t("slide"),
        slideBackground: t("slideBackground"),
        slideTransition: t("slideTransition"),
        slides: t("slides"),
        undo: t("undo"),
        futureImageInspector: t("futureImageInspector"),
        futureShapeInspector: t("futureShapeInspector"),
        futureTextInspector: t("futureTextInspector"),
      }}
      onCreateSlide={() => runCommand(capability.createSlide, true)}
      onRedo={() => runCommand(capability.redo)}
      onSelectSlide={(slide_id) => {
        set_active_slide_id(slide_id);
        set_selection({ kind: "none" });
      }}
      onUndo={() => runCommand(capability.undo)}
    />
  );
}

function getActiveSlideId(
  slides: readonly Slide[],
  active_slide_id: string | null,
) {
  return slides.some((slide) => slide.id === active_slide_id)
    ? active_slide_id
    : (slides[0]?.id ?? null);
}

function toEditorSlide(
  slide: Slide,
  index: number,
  aria_label: string,
  transition_labels: Readonly<Record<TransitionType, string>>,
): EditorSlide {
  return {
    id: slide.id,
    number: index + 1,
    ariaLabel: aria_label,
    backgroundStyle:
      slide.background.type === "solid"
        ? slide.background.color
        : slide.background.gradient,
    transitionLabel: transition_labels[slide.transition.type],
  };
}

function EditorLoading({ label }: { readonly label: string }) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="flex min-h-dvh items-center justify-center p-6"
    >
      <Skeleton className="h-96 w-full max-w-6xl" />
    </main>
  );
}

function EditorMessage({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty role="alert">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
