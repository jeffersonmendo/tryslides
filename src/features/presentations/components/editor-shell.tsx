"use client";

import { IconDeviceDesktop } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import type {
  ElementPatch,
  SlideBackground,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import type { DragCommitResult, ResizeHandle } from "./editor-drag";
import { EditorHeader } from "./editor-header";
import type {
  EditorSelection,
  EditorSlide,
  EditorTextElement,
  EditorTextStyle,
} from "./editor-model";
import { EditorWorkspace } from "./editor-workspace";
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
  readonly isPending: boolean;
  readonly imageError: string | null;
  readonly persistenceError: string | null;
  readonly selection: EditorSelection;
  readonly imageUrls?: Readonly<Record<string, string>>;
  readonly labels: {
    readonly addSlide: string;
    readonly addText: string;
    readonly addImage: string;
    readonly addShape: string;
    readonly shapeRectangle: string;
    readonly shapeCircle: string;
    readonly shapeLine: string;
    readonly alignment: string;
    readonly alignmentCenter: string;
    readonly alignmentLeft: string;
    readonly alignmentRight: string;
    readonly canvasLabel: string;
    readonly color: string;
    readonly content: string;
    readonly desktopRequiredDescription: string;
    readonly desktopRequiredTitle: string;
    readonly emptySlide: string;
    readonly fontSize: string;
    readonly fontWeight: string;
    readonly fontWeightBold: string;
    readonly fontWeightRegular: string;
    readonly textRoleH1: string;
    readonly textRoleH2: string;
    readonly textRoleH3: string;
    readonly textRoleParagraph: string;
    readonly presentation: string;
    readonly properties: string;
    readonly redo: string;
    readonly saveError: string;
    readonly saved: string;
    readonly saving: string;
    readonly slide: string;
    readonly slideBackground: string;
    readonly slideTransition: string;
    readonly transitionDuration: string;
    readonly transitionFade: string;
    readonly transitionNone: string;
    readonly transitionScale: string;
    readonly transitionSlide: string;
    readonly slides: string;
    readonly role: string;
    readonly undo: string;
    readonly position: string;
    readonly size: string;
    readonly rotation: string;
    readonly opacity: string;
    readonly width: string;
    readonly height: string;
    readonly x: string;
    readonly y: string;
    readonly fill: string;
    readonly border: string;
    readonly borderWidth: string;
    readonly radius: string;
    readonly fit: string;
    readonly fitContain: string;
    readonly fitCover: string;
    readonly imageUnavailable: string;
    readonly moveInstruction: string;
    readonly rotationElement: string;
    readonly rotationInstruction: string;
    readonly moveForward: string;
    readonly moveBackward: string;
    readonly deleteElement: string;
    readonly resizeElement: string;
    readonly resizeHandleLabels: Readonly<Record<ResizeHandle, string>>;
    readonly centerHorizontally: string;
    readonly centerVertically: string;
  };
  readonly onCreateSlide: () => void;
  readonly onCreateText: () => void;
  readonly onCreateShape: (shape_type: "rectangle" | "circle" | "line") => void;
  readonly onUploadImages: (files: readonly File[]) => void;
  readonly onRedo: () => void;
  readonly onRetryPersistence: () => void;
  readonly onSelectSlide: (slide_id: string) => void;
  readonly onSelectElement: (element_id: string, additive?: boolean) => void;
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
  readonly onSendBackward: (element_id: string) => void;
  readonly onCenterElement: (
    element_id: string,
    axis: "horizontal" | "vertical",
  ) => void;
  readonly onDeleteElement: (element_id: string) => void;
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
  isPending,
  imageError,
  persistenceError,
  selection,
  imageUrls = {},
  labels,
  onCreateSlide,
  onCreateText,
  onCreateShape,
  onUploadImages,
  onRedo,
  onRetryPersistence,
  onSelectSlide,
  onSelectElement,
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
  onSendBackward,
  onCenterElement,
  onDeleteElement,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
  onUndo,
}: EditorShellProps) {
  return (
    <>
      <SidebarProvider className="hidden h-dvh min-h-0 overflow-hidden overscroll-none md:flex">
        <Sidebar
          className="h-svh min-h-0 overflow-hidden overscroll-none"
          aria-label={labels.slides}
          collapsible="none"
          side="left"
        >
          <SlideSidebar
            activeSlideId={activeSlideId}
            labels={labels}
            slides={slides}
            onCreateSlide={onCreateSlide}
            onSelectSlide={onSelectSlide}
          />
        </Sidebar>
        <SidebarInset className="flex min-h-0 min-w-0 flex-col overflow-hidden overscroll-none rounded-none shadow-none">
          <EditorHeader
            addImageLabel={labels.addImage}
            addShapeLabel={labels.addShape}
            addTextLabel={labels.addText}
            canRedo={canRedo}
            canUndo={canUndo}
            isPending={isPending}
            imageError={imageError}
            persistenceError={persistenceError}
            redoLabel={labels.redo}
            saveErrorLabel={labels.saveError}
            savedLabel={labels.saved}
            savingLabel={labels.saving}
            title={title}
            undoLabel={labels.undo}
            onCreateShape={onCreateShape}
            onCreateText={onCreateText}
            onRedo={onRedo}
            onRetryPersistence={onRetryPersistence}
            onUploadImages={onUploadImages}
            onUndo={onUndo}
          />
          <EditorWorkspace
            activeSlide={activeSlide}
            canvas={canvas}
            labels={labels}
            selectionIds={getSelectionIds(selection)}
            imageUrls={imageUrls}
            onSelectElement={onSelectElement}
            onSelectElements={onSelectElements}
            onDeselectElement={onDeselectElement}
            onMoveEnd={onMoveEnd}
            onResizeEnd={onResizeEnd}
            onRotateEnd={onRotateEnd}
            onTextContentChange={onTextContentChange}
            onTextContentCommit={onTextContentCommit}
          />
        </SidebarInset>
        <Sidebar
          className="h-svh min-h-0 overflow-hidden overscroll-none"
          aria-label={labels.properties}
          collapsible="none"
          side="right"
        >
          <PropertiesSidebar
            activeSlide={activeSlide}
            acceptedActiveSlide={acceptedActiveSlide}
            labels={labels}
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
            onSendBackward={onSendBackward}
            onCenter={onCenterElement}
            onDeleteElement={onDeleteElement}
            onBackgroundChange={onBackgroundChange}
            onBackgroundCommit={onBackgroundCommit}
            onTransitionChange={onTransitionChange}
            onTransitionCommit={onTransitionCommit}
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
            {labels.desktopRequiredTitle}
          </h1>
          <p className="text-muted-foreground">
            {labels.desktopRequiredDescription}
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
