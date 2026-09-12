import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type {
  ElementPatch,
  SlideBackground,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import { ElementInspector } from "./element-inspector";
import { GroupInspector } from "./group-inspector";
import type {
  EditorElement,
  EditorSelection,
  EditorSlide,
  EditorTextElement,
  EditorTextStyle,
} from "./lib/editor-model";
import { SlideInspector } from "./slide-inspector";
import { TextInspector } from "./text-inspector";

type PropertiesSidebarProps = {
  readonly activeSlide: EditorSlide | null;
  readonly acceptedActiveSlide: EditorSlide | null;
  readonly selection: EditorSelection;
  readonly selectedText: EditorTextElement | null;
  readonly acceptedText: EditorTextElement | null;
  readonly selectedElement: EditorElement | null;
  readonly acceptedElement: EditorElement | null;
  readonly selectedElementIndex: number;
  readonly onTextContentChange: (content: string) => void;
  readonly onTextContentCommit: (content: string) => void;
  readonly onTextStyleChange: (style: Partial<EditorTextStyle>) => void;
  readonly onTextStyleCommit: (style: Partial<EditorTextStyle>) => void;
  readonly onTextStyleApply: (style: Partial<EditorTextStyle>) => void;
  readonly onElementPatch: (element_id: string, patch: ElementPatch) => void;
  readonly onElementPatchCommit: (
    element_id: string,
    patch: ElementPatch,
  ) => void;
  readonly onBringForward: (element_id: string) => void;
  readonly onBringToFront: (element_id: string) => void;
  readonly onSendBackward: (element_id: string) => void;
  readonly onSendToBack: (element_id: string) => void;
  readonly onAlign: (
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
  readonly onDuplicateSlide: () => void;
  readonly onDeleteSlide: () => void;
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
};

export function PropertiesSidebar({
  activeSlide,
  acceptedActiveSlide,
  selection,
  selectedText,
  acceptedText,
  selectedElement,
  acceptedElement,
  selectedElementIndex,
  onTextContentChange,
  onTextContentCommit,
  onTextStyleChange,
  onTextStyleCommit,
  onTextStyleApply,
  onElementPatch,
  onElementPatchCommit,
  onBringForward,
  onBringToFront: on_bring_to_front,
  onSendBackward,
  onSendToBack: on_send_to_back,
  onAlign: on_align,
  onDeleteElement,
  onDeleteElements,
  onRotateElementsChange,
  onRotateElementsCommit,
  onSetElementsOpacityChange,
  onSetElementsOpacityCommit,
  onAlignElementsToCanvas,
  onAlignElementsToReference,
  onDistributeElements,
  onDuplicateSlide: on_duplicate_slide,
  onDeleteSlide: on_delete_slide,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
}: PropertiesSidebarProps) {
  const t = useTranslations("Editor");
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
      <h2 className="text-sm font-medium">{t("properties")}</h2>
      {selection.kind === "none" && activeSlide !== null ? (
        <SlideInspector
          slide={activeSlide}
          acceptedColor={
            acceptedActiveSlide?.background.type === "solid"
              ? acceptedActiveSlide.background.color
              : activeSlide.background.type === "solid"
                ? activeSlide.background.color
                : "#FFFFFF"
          }
          onBackgroundChange={onBackgroundChange}
          onBackgroundCommit={onBackgroundCommit}
          onTransitionChange={onTransitionChange}
          onTransitionCommit={onTransitionCommit}
          onDuplicateSlide={on_duplicate_slide}
          onDeleteSlide={on_delete_slide}
        />
      ) : null}
      {selection.kind === "text" &&
      selectedText !== null &&
      acceptedText !== null ? (
        <TextInspector
          key={selectedText.id}
          acceptedColor={acceptedText.style.color}
          text={selectedText}
          elementCount={activeSlide?.elements.length ?? 0}
          elementIndex={selectedElementIndex}
          onContentChange={onTextContentChange}
          onContentCommit={onTextContentCommit}
          onAlign={(alignment) => on_align(selectedText.id, alignment)}
          onPositionChange={(position) =>
            onElementPatch(selectedText.id, { position })
          }
          onSizeChange={(size) => onElementPatch(selectedText.id, { size })}
          onStyleChange={onTextStyleChange}
          onStyleCommit={onTextStyleCommit}
          onStyleApply={onTextStyleApply}
          onPatch={(patch) => onElementPatch(selectedText.id, patch)}
          onPatchCommit={(patch) =>
            onElementPatchCommit(selectedText.id, patch)
          }
          onBringForward={() => onBringForward(selectedText.id)}
          onBringToFront={() => on_bring_to_front(selectedText.id)}
          onSendBackward={() => onSendBackward(selectedText.id)}
          onSendToBack={() => on_send_to_back(selectedText.id)}
        />
      ) : null}
      {selectedElement !== null &&
      selectedElement.type !== "text" &&
      activeSlide !== null ? (
        <ElementInspector
          element={selectedElement}
          acceptedElement={acceptedElement}
          elementCount={activeSlide.elements.length}
          elementIndex={selectedElementIndex}
          onPatch={(patch) => onElementPatch(selectedElement.id, patch)}
          onPatchCommit={(patch) =>
            onElementPatchCommit(selectedElement.id, patch)
          }
          onBringForward={() => onBringForward(selectedElement.id)}
          onBringToFront={() => on_bring_to_front(selectedElement.id)}
          onSendBackward={() => onSendBackward(selectedElement.id)}
          onSendToBack={() => on_send_to_back(selectedElement.id)}
          onAlign={(alignment) => on_align(selectedElement.id, alignment)}
        />
      ) : null}
      {selection.kind === "multiple" && activeSlide !== null ? (
        <GroupInspector
          elements={activeSlide.elements.filter((element) =>
            selection.elementIds.includes(element.id),
          )}
          referenceElementId={selection.referenceElementId}
          onPatch={(patch) => onElementPatch(selection.primaryElementId, patch)}
          onPatchCommit={(patch) =>
            onElementPatchCommit(selection.primaryElementId, patch)
          }
          onRotateChange={(delta) =>
            onRotateElementsChange(selection.elementIds, delta)
          }
          onRotateCommit={(delta) =>
            onRotateElementsCommit(selection.elementIds, delta)
          }
          onOpacityChange={(opacity) =>
            onSetElementsOpacityChange(selection.elementIds, opacity)
          }
          onOpacityCommit={(opacity) =>
            onSetElementsOpacityCommit(selection.elementIds, opacity)
          }
          onAlignToCanvas={(alignment) =>
            onAlignElementsToCanvas(selection.elementIds, alignment)
          }
          onAlignToReference={(alignment) => {
            if (selection.referenceElementId !== null)
              onAlignElementsToReference(
                selection.elementIds,
                selection.referenceElementId,
                alignment,
              );
          }}
          onDistribute={(axis, gap) =>
            onDistributeElements(selection.elementIds, axis, gap)
          }
        />
      ) : null}
      {selection.kind === "multiple" ? (
        <Button
          className="w-full"
          variant="destructive"
          onClick={() => onDeleteElements(selection.elementIds)}
        >
          {t("deleteElement")}
        </Button>
      ) : null}
      {selectedElement !== null ? (
        <Button
          className="w-full"
          variant="destructive"
          onClick={() => onDeleteElement(selectedElement.id)}
        >
          {t("deleteElement")}
        </Button>
      ) : null}
    </div>
  );
}
