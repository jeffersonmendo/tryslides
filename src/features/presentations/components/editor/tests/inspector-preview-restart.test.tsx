import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AnimationInspector } from "../animation-inspector";
import type {
  EditorAnimation,
  EditorElement,
  EditorSlide,
} from "../lib/editor-model";
import { SlideInspector } from "../slide-inspector";

const EDITOR_NAMESPACE = "Editor";

const messages = {
  [EDITOR_NAMESPACE]: {
    animationAlways: "Always",
    animationDelay: "Delay",
    animationDuration: "Duration",
    animationEasing: "Easing",
    animationEasingEase: "Ease",
    animationEasingEaseIn: "Ease in",
    animationEasingEaseInOut: "Ease in and out",
    animationEasingEaseOut: "Ease out",
    animationEasingLinear: "Linear",
    animationEffect: "Effect",
    animationEntrance: "Entrance",
    animationExit: "Exit",
    animationFadeIn: "Fade in",
    animationFadeOut: "Fade out",
    animationFloat: "Float",
    animationInfinite: "Infinite",
    animationInterval: "Interval",
    animationNone: "None",
    animationPulse: "Pulse",
    animationRepeat: "Repeat",
    animationRepeatOnce: "Once",
    animationRepeatThreeTimes: "Three times",
    animationRepeatTwice: "Twice",
    animationRotate: "Rotate",
    animationScaleIn: "Scale in",
    animationScaleOut: "Scale out",
    animationSlideIn: "Slide in",
    animationSlideOut: "Slide out",
    animationTypewriter: "Typewriter",
    animationContinuous: "Continuous",
    deleteSlide: "Delete slide",
    duplicateSlide: "Duplicate slide",
    pauseAnimation: "Pause animation",
    pauseTransition: "Pause transition",
    playAnimation: "Play animation",
    playTransition: "Play transition",
    previewTransition: "Preview transition",
    slideBackground: "Background",
    slideTransition: "Transition",
    transitionDuration: "Transition duration",
    transitionFade: "Fade",
    transitionNone: "None",
    transitionScale: "Scale",
    transitionSlide: "Slide",
  },
} as const;

const element: EditorElement = {
  id: "element-1",
  type: "text",
  content: "Preview me",
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
  animations: [
    {
      type: "fade-in",
      duration: 500,
      delay: 50,
      easing: "ease-out",
    },
  ],
};

const slide: EditorSlide = {
  id: "slide-1",
  number: 1,
  backgroundStyle: "#FFFFFF",
  background: { type: "solid", color: "#FFFFFF" },
  transitionType: "fade",
  transitionDuration: 500,
  elements: [],
};

function renderInspector(ui: React.ReactNode) {
  const wrap = (content: React.ReactNode) => (
    <NextIntlClientProvider locale="en" messages={messages}>
      {content}
    </NextIntlClientProvider>
  );
  const result = render(wrap(ui));
  return {
    ...result,
    rerender: (next_ui: React.ReactNode) => result.rerender(wrap(next_ui)),
  };
}

test.afterEach(() => cleanup());

test("composes ordered animation section legends with decorative icons", () => {
  const result = renderInspector(
    <AnimationInspector
      activePreview={null}
      element={element}
      onConfigureAnimation={() => undefined}
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );
  const legends = [...result.container.querySelectorAll("fieldset > legend")];

  assert.deepEqual(
    legends.map((legend) => legend.textContent),
    ["Entrance", "Exit", "Continuous"],
  );
  for (const legend of legends) {
    const composition = legend.querySelector("span.flex.items-center.gap-2");
    const icon = composition?.querySelector("svg[aria-hidden='true']");

    assert.ok(composition);
    assert.ok(icon);
    assert.equal(icon.classList.contains("size-3!"), true);
    assert.equal(icon.getAttribute("stroke-width"), "2");
  }

  const source = readFileSync(
    new URL("../animation-inspector.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /return <IconLogin2 aria-hidden className="size-3!" stroke=\{2\} \/>/,
  );
  assert.match(
    source,
    /return <IconRepeat aria-hidden className="size-3!" stroke=\{2\} \/>/,
  );
  assert.match(
    source,
    /return <IconLogout2 aria-hidden className="size-3!" stroke=\{2\} \/>/,
  );
});

test("renders animation timing units as inline input addons", () => {
  const result = renderInspector(
    <AnimationInspector
      activePreview={null}
      element={element}
      onConfigureAnimation={() => undefined}
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );

  for (const label of ["Duration", "Delay"]) {
    const input = result.getByLabelText(label);
    const addon = input.nextElementSibling;
    assert.equal(addon?.getAttribute("data-align"), "inline-end");
    assert.equal(addon?.textContent, "ms");
  }
});

test("persists finite animation duration and delay through the configuration callback after rerender", () => {
  const configurations: Omit<EditorAnimation, "type">[] = [];
  const previews: unknown[] = [];
  let current_element = element;
  const render_animation_inspector = () => (
    <AnimationInspector
      activePreview={null}
      element={current_element}
      onConfigureAnimation={(_element_id, type, configuration) => {
        configurations.push(configuration);
        current_element = {
          ...current_element,
          animations: [{ type, ...configuration }],
        };
      }}
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={(_element_id, animation) => previews.push(animation)}
      onStopPlayback={() => undefined}
    />
  );
  const result = renderInspector(render_animation_inspector());

  fireEvent.change(result.getByLabelText("Duration"), {
    target: { value: "720" },
  });
  result.rerender(render_animation_inspector());
  assert.equal(result.getByLabelText("Duration").getAttribute("value"), "720");

  fireEvent.change(result.getByLabelText("Delay"), {
    target: { value: "180" },
  });
  result.rerender(render_animation_inspector());
  assert.equal(result.getByLabelText("Delay").getAttribute("value"), "180");

  assert.deepEqual(configurations, [
    { duration: 720, delay: 50, easing: "ease-out" },
    { duration: 720, delay: 180, easing: "ease-out" },
  ]);
  assert.deepEqual(previews, [
    { type: "fade-in", duration: 720, delay: 50, easing: "ease-out" },
    { type: "fade-in", duration: 720, delay: 180, easing: "ease-out" },
  ]);
});

test("renders persisted easing after an animation inspector rerender", () => {
  const result = renderInspector(
    <AnimationInspector
      activePreview={null}
      element={element}
      onConfigureAnimation={() => undefined}
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );
  result.rerender(
    <AnimationInspector
      activePreview={null}
      element={{
        ...element,
        animations: [{ ...element.animations[0], easing: "ease-in" }],
      }}
      onConfigureAnimation={() => undefined}
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );

  assert.match(result.getByLabelText("Easing").textContent ?? "", /^Ease in/);
});

test("displays localized animation select labels while callbacks retain raw values", async () => {
  const configurations: unknown[] = [];
  const result = renderInspector(
    <AnimationInspector
      activePreview={null}
      element={element}
      onConfigureAnimation={(_element_id, type, configuration) =>
        configurations.push({ type, configuration })
      }
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );

  const easing = result.getByLabelText("Easing");
  assert.match(easing.textContent ?? "", /^Ease out/);
  fireEvent.pointerDown(easing);
  fireEvent.click(easing);
  const ease_in = await result.findByRole("option", { name: "Ease in" });
  fireEvent.pointerDown(ease_in);
  fireEvent.pointerUp(ease_in);
  fireEvent.click(ease_in);

  assert.deepEqual(configurations, [
    {
      type: "fade-in",
      configuration: { duration: 500, delay: 50, easing: "ease-in" },
    },
  ]);
});

test("displays localized repeat labels while callbacks retain numeric repeat values", async () => {
  const configurations: unknown[] = [];
  const continuous_element: EditorElement = {
    ...element,
    animations: [
      {
        type: "float",
        duration: 500,
        delay: 50,
        easing: "ease-out",
        repeat: 2,
        interval: 100,
      },
    ],
  };
  const result = renderInspector(
    <AnimationInspector
      activePreview={null}
      element={continuous_element}
      onConfigureAnimation={(_element_id, type, configuration) =>
        configurations.push({ type, configuration })
      }
      onRemoveAnimation={() => undefined}
      onPreviewAnimation={() => undefined}
      onStopPlayback={() => undefined}
    />,
  );

  const repeat = result.getByLabelText("Repeat");
  assert.match(repeat.textContent ?? "", /^Twice/);
  fireEvent.pointerDown(repeat);
  fireEvent.click(repeat);
  const once = await result.findByRole("option", { name: "Once" });
  fireEvent.pointerDown(once);
  fireEvent.pointerUp(once);
  fireEvent.click(once);

  assert.deepEqual(configurations, [
    {
      type: "float",
      configuration: {
        duration: 500,
        delay: 50,
        easing: "ease-out",
        repeat: 1,
        interval: 100,
      },
    },
  ]);
});

test("removes the selected animation category without configuring a None value", async () => {
  const removals: unknown[] = [];
  const configured: unknown[] = [];
  const stops: unknown[] = [];
  const result = renderInspector(
    <AnimationInspector
      activePreview={{
        elementId: element.id,
        animation: element.animations[0],
        key: 1,
      }}
      element={element}
      onConfigureAnimation={(_element_id, type, configuration) =>
        configured.push({ type, configuration })
      }
      onPreviewAnimation={() => undefined}
      onRemoveAnimation={(element_id, category) =>
        removals.push({ elementId: element_id, category })
      }
      onStopPlayback={(category) => stops.push(category)}
    />,
  );

  const effect = result.container.querySelector("#element-1-entrance-effect");
  assert.ok(effect);
  fireEvent.pointerDown(effect);
  fireEvent.click(effect);
  const none_option = await result.findByRole("option", { name: "None" });
  fireEvent.pointerDown(none_option);
  fireEvent.pointerUp(none_option);
  fireEvent.click(none_option);

  assert.deepEqual(removals, [
    { elementId: "element-1", category: "entrance" },
  ]);
  assert.deepEqual(stops, ["entrance"]);
  assert.deepEqual(configured, []);
});

test("restarts a transition preview with the changed duration", () => {
  const changes: unknown[] = [];
  const previews: unknown[] = [];
  const result = renderInspector(
    <SlideInspector
      acceptedColor="#FFFFFF"
      canPreviewTransition
      isPreviewActive={false}
      slide={slide}
      onBackgroundChange={() => undefined}
      onBackgroundCommit={() => undefined}
      onPreviewTransition={(type, duration) =>
        previews.push({ type, duration })
      }
      onStopTransitionPreview={() => undefined}
      onTransitionChange={(type, duration) => changes.push({ type, duration })}
      onTransitionCommit={() => undefined}
    />,
  );

  fireEvent.change(result.getByLabelText("Transition duration"), {
    target: { value: "720" },
  });

  assert.deepEqual(changes, [{ type: "fade", duration: 720 }]);
  assert.deepEqual(previews, [{ type: "fade", duration: 720 }]);
});
