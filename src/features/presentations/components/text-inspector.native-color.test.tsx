import assert from "node:assert/strict";
import test from "node:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useRef, useState } from "react";
import { EditIntentScheduler } from "@/features/presentations/application/edit-intent-scheduler";
import type { EditorIntentDraft } from "./editor-drafts";
import type { EditorTextElement } from "./editor-model";
import { TextInspector } from "./text-inspector";

const labels = {
  alignment: "Alignment",
  alignmentCenter: "Center",
  alignmentLeft: "Left",
  alignmentRight: "Right",
  layoutAlign: "Layout alignment",
  color: "Color",
  content: "Content",
  fontSize: "Font size",
  fontWeight: "Font weight",
  fontWeightBold: "Bold",
  fontWeightRegular: "Regular",
  role: "Role",
  textRoleH1: "H1",
  textRoleH2: "H2",
  textRoleH3: "H3",
  textRoleParagraph: "Paragraph",
  position: "Position",
  x: "X",
  y: "Y",
  centerHorizontally: "Center horizontally",
  centerVertically: "Center vertically",
  alignLeft: "Align left",
  alignRight: "Align right",
  alignTop: "Align top",
  alignBottom: "Align bottom",
  size: "Size",
  width: "Width",
  height: "Height",
  properties: "Properties",
  appearance: "Appearance",
  layers: "Layers",
  transform: "Transform",
  moveForward: "Move forward",
  moveBackward: "Move backward",
  bringToFront: "Bring to front",
  sendToBack: "Send to back",
  rotation: "Rotation",
  opacity: "Opacity",
};

function NativeColorHarness({ commands }: { readonly commands: string[] }) {
  const scheduler_ref = useRef(
    new EditIntentScheduler<string, EditorIntentDraft>(),
  );
  const [accepted_color, set_accepted_color] = useState("#000000");
  const [preview_color, set_preview_color] = useState(accepted_color);
  const text: EditorTextElement = {
    id: "text_1",
    type: "text",
    content: "Text",
    position: { x: 100, y: 100 },
    size: { width: 400, height: 100 },
    rotation: 0,
    opacity: 1,
    style: {
      role: "Paragraph",
      fontSize: 16,
      fontWeight: 400,
      color: preview_color,
      alignment: "left",
    },
  };
  const schedule_color = (color: string) => {
    const key = "element:slide_1:text_1";
    scheduler_ref.current.schedule({
      key,
      draft: {
        kind: "element",
        slideId: "slide_1",
        elementIds: ["text_1"],
        patch: { style: { color } },
      },
      delay: 150,
      dispatch: () => {
        commands.push(`editElement:${color}`);
        set_accepted_color(color);
        set_preview_color(color);
        return true;
      },
    });
    return key;
  };

  return (
    <TextInspector
      acceptedColor={accepted_color}
      elementCount={1}
      elementIndex={0}
      labels={labels}
      text={text}
      onBringForward={() => undefined}
      onBringToFront={() => undefined}
      onAlign={() => undefined}
      onContentChange={() => undefined}
      onContentCommit={() => undefined}
      onPatch={() => undefined}
      onPatchCommit={() => undefined}
      onPositionChange={() => undefined}
      onSendBackward={() => undefined}
      onSendToBack={() => undefined}
      onSizeChange={() => undefined}
      onStyleApply={() => undefined}
      onStyleChange={(style) => {
        if (style.color === undefined) return;
        set_preview_color(style.color);
        schedule_color(style.color);
      }}
      onStyleCommit={(style) => {
        if (style.color === undefined) return;
        scheduler_ref.current.flush(schedule_color(style.color));
      }}
    />
  );
}

async function waitForColorDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 175));
  });
}

function getColorInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>("#text-color-text_1");
  if (input === null) throw new Error("Shared color input was not rendered");
  return input;
}

test.afterEach(() => cleanup());

test("text color change, debounce, and blur produce one Core command", async () => {
  const commands: string[] = [];
  render(<NativeColorHarness commands={commands} />);
  const input = getColorInput();

  fireEvent.change(input, { target: { value: "#123456" } });
  await waitForColorDebounce();
  fireEvent.blur(input);

  assert.deepEqual(commands, ["editElement:#123456"]);
});

test("text color blur immediately persists a distinct color after debounce", async () => {
  const commands: string[] = [];
  render(<NativeColorHarness commands={commands} />);
  const input = getColorInput();

  fireEvent.change(input, { target: { value: "#123456" } });
  await waitForColorDebounce();
  fireEvent.change(input, { target: { value: "#654321" } });
  fireEvent.blur(input);

  assert.deepEqual(commands, ["editElement:#123456", "editElement:#654321"]);
});
