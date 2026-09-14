"use client";

import { IconDeviceDesktop } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import type {
  AnimationCategory,
  ElementPatch,
  ShapeType,
  SlideBackground,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import { ANIMATION_CAPABILITIES } from "@/features/presentations/core/presentation-core";
import { EditorHeader } from "./editor-header";
import { EditorWorkspace } from "./editor-workspace";
import type { DragCommitResult } from "./lib/editor-drag";
import type {
  EditorAnimation,
  EditorAnimationPlayback,
  EditorAnimationPreview,
  EditorSelection,
  EditorSlide,
  EditorTextElement,
  EditorTextStyle,
  EditorTransitionPreview,
} from "./lib/editor-model";
import {
  completeSlidePlayback,
  createSlidePlayback,
  pauseSlidePlayback,
} from "./lib/slide-playback-planner";
import { PropertiesSidebar } from "./properties-sidebar";
import { SlideSidebar } from "./slide-sidebar";

type EditorShellProps = {
  readonly title: string;
  readonly slides: readonly EditorSlide[];
  readonly activeSlide: EditorSlide | null;
  readonly acceptedActiveSlide: EditorSlide | null;
  readonly activeSlideId: string | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly canRedoPresentation: boolean;
  readonly canUndoPresentation: boolean;
  readonly selection: EditorSelection;
  readonly imageUrls?: Readonly<Record<string, string>>;
  readonly onCreateSlide: () => void;
  readonly onDuplicateSlide: () => void;
  readonly onDeleteSlide: () => void;
  readonly onReorderSlide: (
    slide_id: string,
    after_slide_id: string | null,
  ) => void;
  readonly onCreateText: () => void;
  readonly onCreateShape: (shape_type: ShapeType) => void;
  readonly onUploadImages: (files: readonly File[]) => void;
  readonly onRedo: () => void;
  readonly onRedoPresentation: () => void;
  readonly onSelectSlide: (slide_id: string) => void;
  readonly onSelectElement: (element_id: string, additive?: boolean) => void;
  readonly onSetReferenceElement: (element_id: string) => void;
  readonly onSelectElements: (
    element_ids: readonly string[],
    additive: boolean,
  ) => void;
  readonly onDeselectElement: () => void;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
  readonly onTextStyleChange: (style: Partial<EditorTextStyle>) => void;
  readonly onTextStyleCommit: (style: Partial<EditorTextStyle>) => void;
  readonly onTextStyleApply: (style: Partial<EditorTextStyle>) => void;
  readonly onMoveEnd?: (
    element_id: string,
    x: number,
    y: number,
    element_ids: readonly string[],
  ) => Promise<DragCommitResult>;
  readonly onResizeEnd?: (
    element_id: string,
    position: { readonly x: number; readonly y: number },
    size: { readonly width: number; readonly height: number },
  ) => Promise<DragCommitResult>;
  readonly onRotateEnd?: (
    element_id: string,
    rotation: number,
  ) => Promise<DragCommitResult>;
  readonly onElementPatch: (element_id: string, patch: ElementPatch) => void;
  readonly onElementPatchCommit: (
    element_id: string,
    patch: ElementPatch,
  ) => void;
  readonly onBringForward: (element_id: string) => void;
  readonly onBringToFront: (element_id: string) => void;
  readonly onSendBackward: (element_id: string) => void;
  readonly onSendToBack: (element_id: string) => void;
  readonly onAlignElement: (
    element_id: string,
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  readonly onDeleteElement: (element_id: string) => void;
  readonly onDeleteElements: (element_ids: readonly string[]) => void;
  readonly onRotateElementsChange: (
    element_ids: readonly string[],
    delta: number,
  ) => void;
  readonly onRotateElementsCommit: (
    element_ids: readonly string[],
    delta: number,
  ) => void;
  readonly onSetElementsOpacityChange: (
    element_ids: readonly string[],
    opacity: number,
  ) => void;
  readonly onSetElementsOpacityCommit: (
    element_ids: readonly string[],
    opacity: number,
  ) => void;
  readonly onAlignElementsToCanvas: (
    element_ids: readonly string[],
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  readonly onAlignElementsToReference: (
    element_ids: readonly string[],
    reference_element_id: string,
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  readonly onDistributeElements: (
    element_ids: readonly string[],
    axis: "horizontal" | "vertical",
    gap: number,
  ) => void;
  readonly onBackgroundChange: (background: SlideBackground) => void;
  readonly onBackgroundCommit: (background: SlideBackground) => void;
  readonly onTransitionChange: (
    type: TransitionType,
    duration?: number,
  ) => void;
  readonly onTransitionCommit: (
    type: TransitionType,
    duration?: number,
  ) => void;
  readonly onUndo: () => void;
  readonly onUndoPresentation: () => void;
  readonly onConfigureAnimation: (
    element_id: string,
    type: EditorAnimation["type"],
    configuration: Omit<EditorAnimation, "type">,
  ) => void;
  readonly onRemoveAnimation: (
    element_id: string,
    category: AnimationCategory,
  ) => void;
};

export function EditorShell({
  title,
  slides,
  activeSlide,
  acceptedActiveSlide,
  activeSlideId,
  canvas,
  canRedo,
  canUndo,
  canRedoPresentation,
  canUndoPresentation,
  selection,
  imageUrls = {},
  onCreateSlide,
  onDuplicateSlide: on_duplicate_slide,
  onDeleteSlide: on_delete_slide,
  onReorderSlide: on_reorder_slide,
  onCreateText,
  onCreateShape,
  onUploadImages,
  onRedo,
  onRedoPresentation,
  onSelectSlide,
  onSelectElement,
  onSetReferenceElement,
  onSelectElements,
  onDeselectElement,
  onTextContentChange,
  onTextContentCommit,
  onTextStyleChange,
  onTextStyleCommit,
  onTextStyleApply,
  onMoveEnd = async () => ({ persisted: false }),
  onResizeEnd = async () => ({ persisted: false }),
  onRotateEnd = async () => ({ persisted: false }),
  onElementPatch,
  onElementPatchCommit,
  onBringForward,
  onBringToFront: on_bring_to_front,
  onSendBackward,
  onSendToBack: on_send_to_back,
  onAlignElement: on_align_element,
  onDeleteElement,
  onDeleteElements,
  onRotateElementsChange,
  onRotateElementsCommit,
  onSetElementsOpacityChange,
  onSetElementsOpacityCommit,
  onAlignElementsToCanvas,
  onAlignElementsToReference,
  onDistributeElements,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
  onUndo,
  onUndoPresentation,
  onConfigureAnimation,
  onRemoveAnimation,
}: EditorShellProps) {
  const t = useTranslations("Editor");
  const [animation_playback, set_animation_playback] =
    useState<EditorAnimationPlayback | null>(null);
  const [transition_preview, set_transition_preview] =
    useState<EditorTransitionPreview | null>(null);
  const active_slide_index = slides.findIndex(
    (slide) => slide.id === activeSlideId,
  );
  const next_slide =
    active_slide_index === -1 ? null : (slides[active_slide_index + 1] ?? null);
  const selection_key = JSON.stringify(selection);
  const preview_key_ref = useRef(0);
  const previous_selection_key_ref = useRef(selection_key);

  useEffect(() => {
    set_animation_playback((current) =>
      current?.slideId === activeSlideId ? current : null,
    );
    set_transition_preview((current) =>
      current?.sourceSlideId === activeSlideId ? current : null,
    );
  }, [activeSlideId]);

  useEffect(() => {
    if (previous_selection_key_ref.current === selection_key) return;
    previous_selection_key_ref.current = selection_key;
    set_animation_playback(null);
  }, [selection_key]);

  function nextPreviewKey(): number {
    preview_key_ref.current += 1;
    return preview_key_ref.current;
  }

  function previewAnimation(element_id: string, animation: EditorAnimation) {
    startAnimationPlayback("inspector", [{ elementId: element_id, animation }]);
  }

  function previewSlideAnimations() {
    if (activeSlide === null) return;
    const session_id = nextPreviewKey();
    set_animation_playback(
      createSlidePlayback(
        session_id,
        activeSlide.id,
        activeSlide.elements.flatMap((element) =>
          element.animations.map((animation) => ({
            elementId: element.id,
            animation,
            key: nextPreviewKey(),
          })),
        ),
      ),
    );
  }

  function toggleSlidePlayback() {
    if (animation_playback?.origin === "slide") {
      set_animation_playback(pauseSlidePlayback(animation_playback));
      return;
    }
    previewSlideAnimations();
  }

  function startAnimationPlayback(
    origin: EditorAnimationPlayback["origin"],
    animations: readonly Omit<EditorAnimationPreview, "key">[],
  ) {
    if (animations.length === 0) return;
    set_animation_playback({
      origin,
      key: nextPreviewKey(),
      slideId: activeSlideId ?? "",
      previews: animations.map((preview) => ({
        ...preview,
        key: nextPreviewKey(),
      })),
    });
  }

  function handleAnimationEnd(session_id: number, key: number) {
    set_animation_playback((current) => {
      if (current === null) return null;
      if (current.origin === "slide")
        return completeSlidePlayback(current, session_id, key);
      if (current.key !== session_id) return current;
      const preview = current.previews.find((item) => item.key === key);
      if (preview === undefined) return current;
      const previews = current.previews.filter((item) => item.key !== key);
      return previews.length === 0 ? null : { ...current, previews };
    });
  }

  function previewTransition(
    transition_type: TransitionType,
    transition_duration: number,
  ) {
    if (activeSlide === null || next_slide === null) return;
    const key = nextPreviewKey();
    const transition = {
      transitionType: transition_type,
      transitionDuration: transition_duration,
    };
    set_transition_preview({
      nextSlide: next_slide,
      sourceSlideId: activeSlide.id,
      transition,
      key,
    });
    if (transition_type === "none" || transition_duration === 0)
      window.setTimeout(() => {
        set_transition_preview((current) =>
          current?.key === key ? null : current,
        );
      }, 0);
  }
  return (
    <>
      <SidebarProvider className="hidden bg-muted h-dvh min-h-0 overflow-hidden overscroll-none md:flex">
        <Sidebar
          className="h-svh min-h-0  overflow-hidden overscroll-none"
          aria-label={t("slides")}
          collapsible="offcanvas"
          side="left"
          variant="floating"
        >
          <SlideSidebar
            activeSlideId={activeSlideId}
            canvas={canvas}
            imageUrls={imageUrls}
            slides={slides}
            canRedo={canRedoPresentation}
            canUndo={canUndoPresentation}
            onCreateSlide={onCreateSlide}
            onRedo={onRedoPresentation}
            onReorderSlide={on_reorder_slide}
            onSelectSlide={onSelectSlide}
            onUndo={onUndoPresentation}
          />
        </Sidebar>
        <SidebarInset className="flex min-h-0 min-w-0 flex-col bg bg-transparent mt-3.5 rounded-2xl! shadow-none">
          <EditorHeader
            canRedo={canRedo}
            canUndo={canUndo}
            title={title}
            onCreateShape={onCreateShape}
            onCreateText={onCreateText}
            onRedo={onRedo}
            onUploadImages={onUploadImages}
            onUndo={onUndo}
            isSlidePlaybackActive={animation_playback?.origin === "slide"}
            onPreviewSlideAnimations={toggleSlidePlayback}
          />
          <EditorWorkspace
            activeSlide={activeSlide}
            canvas={canvas}
            selectionIds={getSelectionIds(selection)}
            referenceElementId={
              selection.kind === "multiple"
                ? selection.referenceElementId
                : null
            }
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
            animationPlayback={animation_playback}
            onAnimationEnd={handleAnimationEnd}
            transitionPreview={transition_preview}
            onTransitionEnd={(key) =>
              set_transition_preview((current) =>
                current?.key === key ? null : current,
              )
            }
          />
        </SidebarInset>
        <Sidebar
          className="h-svh min-h-0 overflow-hidden border-none! shadow-none overscroll-none"
          aria-label={t("properties")}
          collapsible="offcanvas"
          side="right"
          variant="floating"
        >
          <PropertiesSidebar
            activeSlide={activeSlide}
            acceptedActiveSlide={acceptedActiveSlide}
            selection={selection}
            acceptedText={getSelectedText(acceptedActiveSlide, selection)}
            selectedText={getSelectedText(activeSlide, selection)}
            selectedElement={getSelectedElement(activeSlide, selection)}
            acceptedElement={getSelectedElement(acceptedActiveSlide, selection)}
            selectedElementIndex={getSelectedElementIndex(
              activeSlide,
              selection,
            )}
            onTextContentChange={onTextContentChange}
            onTextContentCommit={onTextContentCommit}
            onTextStyleChange={onTextStyleChange}
            onTextStyleCommit={onTextStyleCommit}
            onTextStyleApply={onTextStyleApply}
            onElementPatch={onElementPatch}
            onElementPatchCommit={onElementPatchCommit}
            onBringForward={onBringForward}
            onBringToFront={on_bring_to_front}
            onSendBackward={onSendBackward}
            onSendToBack={on_send_to_back}
            onAlign={on_align_element}
            onDeleteElement={onDeleteElement}
            onDeleteElements={onDeleteElements}
            onRotateElementsChange={onRotateElementsChange}
            onRotateElementsCommit={onRotateElementsCommit}
            onSetElementsOpacityChange={onSetElementsOpacityChange}
            onSetElementsOpacityCommit={onSetElementsOpacityCommit}
            onAlignElementsToCanvas={onAlignElementsToCanvas}
            onAlignElementsToReference={onAlignElementsToReference}
            onDistributeElements={onDistributeElements}
            onBackgroundChange={onBackgroundChange}
            onBackgroundCommit={onBackgroundCommit}
            onTransitionChange={onTransitionChange}
            onTransitionCommit={onTransitionCommit}
            onConfigureAnimation={onConfigureAnimation}
            onRemoveAnimation={onRemoveAnimation}
            onPreviewAnimation={previewAnimation}
            activeAnimationPreview={
              animation_playback?.origin === "inspector"
                ? (animation_playback.previews[0] ?? null)
                : null
            }
            onStopAnimationPlayback={(category) =>
              set_animation_playback((current) =>
                current?.origin !== "inspector" ||
                (category !== undefined &&
                  !current.previews.some(
                    (preview) =>
                      ANIMATION_CAPABILITIES.find(
                        (capability) =>
                          capability.id === preview.animation.type,
                      )?.category === category,
                  ))
                  ? current
                  : null,
              )
            }
            onPreviewTransition={previewTransition}
            isTransitionPreviewActive={transition_preview !== null}
            onStopTransitionPreview={() => set_transition_preview(null)}
            canPreviewTransition={next_slide !== null}
            onDuplicateSlide={on_duplicate_slide}
            onDeleteSlide={on_delete_slide}
          />
        </Sidebar>
      </SidebarProvider>
      <main className="flex min-h-dvh items-center justify-center p-6 md:hidden">
        <section
          aria-labelledby="desktop-required-title"
          className="flex max-w-sm flex-col items-center gap-3 text-center"
        >
          <IconDeviceDesktop
            aria-hidden
            className="size-10 text-muted-foreground"
          />
          <h1 id="desktop-required-title" className="text-xl font-semibold">
            {t("desktopRequiredTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("desktopRequiredDescription")}
          </p>
        </section>
      </main>
    </>
  );
}

function getSelectedElement(
  active_slide: EditorSlide | null,
  selection: EditorSelection,
) {
  return selection.kind === "none" ||
    selection.kind === "multiple" ||
    active_slide === null
    ? null
    : (active_slide.elements.find(
        (element) => element.id === selection.elementId,
      ) ?? null);
}

function getSelectedElementIndex(
  active_slide: EditorSlide | null,
  selection: EditorSelection,
) {
  const element = getSelectedElement(active_slide, selection);
  return element === null || active_slide === null
    ? -1
    : active_slide.elements.indexOf(element);
}

function getSelectedText(
  active_slide: EditorSlide | null,
  selection: EditorSelection,
): EditorTextElement | null {
  if (active_slide === null || selection.kind !== "text") {
    return null;
  }

  const element =
    active_slide.elements.find(
      (element) => element.id === selection.elementId,
    ) ?? null;
  return element?.type === "text" ? element : null;
}

function getSelectionIds(selection: EditorSelection): readonly string[] {
  return selection.kind === "none"
    ? []
    : selection.kind === "multiple"
      ? selection.elementIds
      : [selection.elementId];
}
