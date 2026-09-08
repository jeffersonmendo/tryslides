import { IconDeviceDesktop } from "@tabler/icons-react";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { EditorHeader } from "./editor-header";
import type { EditorSelection, EditorSlide } from "./editor-model";
import { EditorWorkspace } from "./editor-workspace";
import { PropertiesSidebar } from "./properties-sidebar";
import { SlideSidebar } from "./slide-sidebar";

type EditorShellProps = {
  readonly title: string;
  readonly slides: readonly EditorSlide[];
  readonly activeSlide: EditorSlide | null;
  readonly activeSlideId: string | null;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly isPending: boolean;
  readonly persistenceError: string | null;
  readonly selection: EditorSelection;
  readonly zoom: number;
  readonly labels: {
    readonly addSlide: string;
    readonly canvasLabel: string;
    readonly desktopRequiredDescription: string;
    readonly desktopRequiredTitle: string;
    readonly emptySlide: string;
    readonly futureImageInspector: string;
    readonly futureShapeInspector: string;
    readonly futureTextInspector: string;
    readonly noSelection: string;
    readonly presentation: string;
    readonly properties: string;
    readonly redo: string;
    readonly saveError: string;
    readonly saved: string;
    readonly saving: string;
    readonly slide: string;
    readonly slideBackground: string;
    readonly slideTransition: string;
    readonly slides: string;
    readonly undo: string;
  };
  readonly onCreateSlide: () => void;
  readonly onRedo: () => void;
  readonly onSelectSlide: (slide_id: string) => void;
  readonly onUndo: () => void;
};

export function EditorShell({
  title,
  slides,
  activeSlide,
  activeSlideId,
  canvas,
  canRedo,
  canUndo,
  isPending,
  persistenceError,
  selection,
  zoom,
  labels,
  onCreateSlide,
  onRedo,
  onSelectSlide,
  onUndo,
}: EditorShellProps) {
  return (
    <>
      <SidebarProvider className="hidden min-h-dvh md:flex">
        <Sidebar aria-label={labels.slides} collapsible="none" side="left">
          <SlideSidebar
            activeSlideId={activeSlideId}
            isPending={isPending}
            labels={labels}
            slides={slides}
            onCreateSlide={onCreateSlide}
            onSelectSlide={onSelectSlide}
          />
        </Sidebar>
        <SidebarInset className="min-w-0 rounded-none shadow-none">
          <EditorHeader
            canRedo={canRedo}
            canUndo={canUndo}
            isPending={isPending}
            persistenceError={persistenceError}
            saveErrorLabel={labels.saveError}
            savedLabel={labels.saved}
            savingLabel={labels.saving}
            title={title}
            undoLabel={labels.undo}
            redoLabel={labels.redo}
            onRedo={onRedo}
            onUndo={onUndo}
          />
          <EditorWorkspace
            activeSlide={activeSlide}
            canvas={canvas}
            labels={labels}
            zoom={zoom}
          />
        </SidebarInset>
        <Sidebar aria-label={labels.properties} collapsible="none" side="right">
          <PropertiesSidebar
            activeSlide={activeSlide}
            labels={labels}
            selection={selection}
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
