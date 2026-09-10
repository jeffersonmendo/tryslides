import { Button } from "@/components/ui/button";
import type {
  ElementPatch,
  SlideBackground,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import type {
  EditorElement,
  EditorSelection,
  EditorSlide,
  EditorTextElement,
  EditorTextStyle,
} from "./editor-model";
import { ElementInspector } from "./element-inspector";
import { GroupInspector } from "./group-inspector";
import { SlideInspector } from "./slide-inspector";
import { TextInspector } from "./text-inspector";

type PropertiesSidebarProps = {
  readonly activeSlide: EditorSlide | null;
  readonly acceptedActiveSlide: EditorSlide | null;
  readonly selection: EditorSelection;
  readonly labels: {
    readonly alignment: string;
    readonly alignmentCenter: string;
    readonly alignmentLeft: string;
    readonly alignmentRight: string;
    readonly color: string;
    readonly content: string;
    readonly fontSize: string;
    readonly fontWeight: string;
    readonly fontWeightBold: string;
    readonly fontWeightRegular: string;
    readonly textRoleH1: string;
    readonly textRoleH2: string;
    readonly textRoleH3: string;
    readonly textRoleParagraph: string;
    readonly properties: string;
    readonly role: string;
    readonly position: string;
    readonly x: string;
    readonly y: string;
    readonly centerHorizontally: string;
    readonly centerVertically: string;
    readonly size: string;
    readonly rotation: string;
    readonly opacity: string;
    readonly width: string;
    readonly height: string;
    readonly moveForward: string;
    readonly moveBackward: string;
    readonly deleteElement: string;
    readonly slideBackground: string;
    readonly slideTransition: string;
    readonly transitionDuration: string;
    readonly transitionFade: string;
    readonly transitionNone: string;
    readonly transitionScale: string;
    readonly transitionSlide: string;
  };
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
  readonly onSendBackward: (element_id: string) => void;
  readonly onCenter: (
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
};

export function PropertiesSidebar({
  activeSlide,
  acceptedActiveSlide,
  labels,
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
  onSendBackward,
  onCenter,
  onDeleteElement,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
}: PropertiesSidebarProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4">
      <h2 className="text-sm font-medium">{labels.properties}</h2>
      {selection.kind === "none" && activeSlide !== null ? (
        <SlideInspector
          labels={labels}
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
        />
      ) : null}
      {selection.kind === "text" &&
      selectedText !== null &&
      acceptedText !== null ? (
        <TextInspector
          key={selectedText.id}
          acceptedColor={acceptedText.style.color}
          labels={labels}
          text={selectedText}
          elementCount={activeSlide?.elements.length ?? 0}
          elementIndex={selectedElementIndex}
          onContentChange={onTextContentChange}
          onContentCommit={onTextContentCommit}
          onCenter={(axis) => onCenter(selectedText.id, axis)}
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
          onSendBackward={() => onSendBackward(selectedText.id)}
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
          labels={labels}
          onPatch={(patch) => onElementPatch(selectedElement.id, patch)}
          onPatchCommit={(patch) =>
            onElementPatchCommit(selectedElement.id, patch)
          }
          onBringForward={() => onBringForward(selectedElement.id)}
          onSendBackward={() => onSendBackward(selectedElement.id)}
          onCenter={(axis) => onCenter(selectedElement.id, axis)}
        />
      ) : null}
      {selection.kind === "multiple" && activeSlide !== null ? (
        <GroupInspector
          elements={activeSlide.elements.filter((element) =>
            selection.elementIds.includes(element.id),
          )}
          labels={labels}
          onPatch={(patch) => onElementPatch(selection.primaryElementId, patch)}
          onPatchCommit={(patch) =>
            onElementPatchCommit(selection.primaryElementId, patch)
          }
        />
      ) : null}
      {selectedElement !== null ? (
        <Button
          className="w-full"
          variant="destructive"
          onClick={() => onDeleteElement(selectedElement.id)}
        >
          {labels.deleteElement}
        </Button>
      ) : null}
    </div>
  );
}
