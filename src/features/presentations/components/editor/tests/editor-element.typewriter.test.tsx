import assert from "node:assert/strict";
import test from "node:test";
import { act, cleanup, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EditorElementView } from "../editor-element";
import { TypewriterTextPreview } from "../editor-preview-layer";
import type { EditorElement } from "../lib/editor-model";

const EDITOR_NAMESPACE = "Editor";

const messages = {
  [EDITOR_NAMESPACE]: {
    moveInstruction: "Move element",
    referenceAlignmentSelected: "Reference alignment selected",
    resizeElement: "Resize element",
    resizeNorth: "Resize north",
    resizeNorthEast: "Resize north east",
    resizeEast: "Resize east",
    resizeSouthEast: "Resize south east",
    resizeSouth: "Resize south",
    resizeSouthWest: "Resize south west",
    resizeWest: "Resize west",
    resizeNorthWest: "Resize north west",
    rotationInstruction: "Rotate element",
    rotationElement: "Rotate element",
  },
} as const;

const text_element: EditorElement = {
  id: "text-1",
  type: "text",
  content: "A😀B",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 40 },
  opacity: 1,
  rotation: 0,
  style: {
    role: "Paragraph",
    fontFamily: "Geist",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#000000",
    alignment: "left",
  },
  animations: [],
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test.afterEach(() => cleanup());

test("keeps selected editor chrome outside the animated visual wrapper", () => {
  const result = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EditorElementView
        animationSessionId={1}
        canvas={{ width: 1920, height: 1080 }}
        canSetReference={false}
        element={text_element}
        getSlidePlaneRect={() => null}
        imageUrl={null}
        isReference={false}
        isSelected
        previewAnimations={[
          {
            elementId: text_element.id,
            key: 1,
            animation: {
              type: "typewriter",
              delay: 0,
              duration: 50,
              easing: "linear",
            },
          },
        ]}
        previewPosition={undefined}
        onAnimationEnd={() => undefined}
        onResizeEnd={async () => ({ persisted: false })}
        onRotateEnd={async () => ({ persisted: false })}
        onSelect={() => undefined}
        onSetReference={() => undefined}
        onTextContentChange={() => undefined}
        onTextContentCommit={() => undefined}
      />
    </NextIntlClientProvider>,
  );

  const animation = result.container.querySelector("[data-animation-preview]");
  const selection = result.container.querySelector("[data-selection-chrome]");
  assert.ok(animation);
  assert.ok(selection);
  assert.equal(animation.contains(selection), false);
  assert.equal(selection.parentElement?.contains(animation), true);
});

test("reveals typewriter text by Unicode characters and removes its cursor on completion", async () => {
  const result = render(
    <TypewriterTextPreview
      className=""
      content="A😀B"
      delay={20}
      duration={90}
      style={{}}
    />,
  );

  assert.equal(result.container.textContent, "");
  assert.equal(
    result.container.querySelector("[data-typewriter-cursor]"),
    null,
  );

  await act(() => wait(55));
  assert.equal(result.container.textContent, "A|");
  const cursor = result.container.querySelector("[data-typewriter-cursor]");
  assert.ok(cursor);
  assert.ok(
    cursor.classList.contains(
      "motion-safe:animate-[editor-typewriter-cursor-blink_1s_step-end_infinite]",
    ),
  );

  await act(() => wait(35));
  assert.equal(result.container.textContent, "A😀|");
  assert.ok(result.container.querySelector("[data-typewriter-cursor]"));

  await act(() => wait(50));
  assert.equal(result.container.textContent, "A😀B");
  assert.equal(
    result.container.querySelector("[data-typewriter-cursor]"),
    null,
  );
});
