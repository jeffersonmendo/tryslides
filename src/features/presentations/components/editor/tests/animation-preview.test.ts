import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAnimationPreviewStyle } from "../editor-preview-layer";

const projection_source = readFileSync(
  new URL("../lib/editor-projection.ts", import.meta.url),
  "utf8",
);
const inspector_source = readFileSync(
  new URL("../animation-inspector.tsx", import.meta.url),
  "utf8",
);
const preview_source = readFileSync(
  new URL("../editor-preview-layer.tsx", import.meta.url),
  "utf8",
);

test("projects validated animation configuration for every editor element type", () => {
  for (const field of ["duration", "delay", "easing", "repeat", "interval"])
    assert.match(projection_source, new RegExp(`animation\\.${field}`, "g"));
  assert.match(projection_source, /function toEditorTextElement/);
  assert.match(projection_source, /type: "image" as const/);
  assert.match(projection_source, /type: "shape" as const/);
});

test("drives animation choices from Core capabilities and configures through callbacks", () => {
  assert.match(inspector_source, /ANIMATION_CAPABILITIES/);
  assert.match(inspector_source, /supportedElementTypes\.some/);
  assert.match(
    inspector_source,
    /onConfigureAnimation\(\s*element\.id,\s*capability\.id,\s*capability\.defaults,?\s*\)/,
  );
  assert.match(
    inspector_source,
    /const \{ type: _type, \.\.\.next_configuration \} = next_animation;[\s\S]*onConfigureAnimation\(\s*element\.id,\s*selected_capability\.id,\s*next_configuration,?\s*\)/,
  );
  assert.match(
    inspector_source,
    /t\(`animation\$\{capitalize\(category\)\}`\)/,
  );
  assert.match(
    inspector_source,
    /aria-label=\{isActive \? pauseLabel : playLabel\}/,
  );
  assert.match(inspector_source, /<Tooltip disableHoverablePopup>/);
});

test("keeps playback in an editor preview boundary rather than static slide visuals", () => {
  assert.match(preview_source, /getAnimationPreviewStyle/);
  assert.match(preview_source, /EditorPreviewLayer/);
  assert.match(preview_source, /editor-transition-/);
  assert.doesNotMatch(preview_source, /framer-motion|motion\//i);
});

test("uses the current duration, delay, and easing in the generated preview payload", () => {
  assert.deepEqual(
    getAnimationPreviewStyle({
      key: 17,
      type: "slide-in",
      duration: 720,
      delay: 180,
      easing: "ease-in-out",
    }),
    {
      animationDelay: "180ms",
      animationDuration: "720ms",
      animationFillMode: "both",
      animationIterationCount: 1,
      animationName: "editor-animation-slide-in-17",
      animationTimingFunction: "ease-in-out",
    },
  );
});

test("holds rotate at 360 degrees during the interval without alternating direction", () => {
  assert.match(
    preview_source,
    /case "rotate":[\s\S]*return `0% \{ transform: rotate\(0deg\); \} \$\{active_end\}, 100% \{ transform: rotate\(360deg\); \}`/,
  );
  assert.doesNotMatch(preview_source, /animationDirection|animation-direction/);
});

test("restarts inspector previews with each newly configured animation or transition", () => {
  const slide_inspector_source = readFileSync(
    new URL("../slide-inspector.tsx", import.meta.url),
    "utf8",
  );
  const shell_source = readFileSync(
    new URL("../editor-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    inspector_source,
    /onConfigureAnimation\(\s*element\.id,\s*selected_capability\.id,\s*next_configuration,?\s*\);[\s\S]*onPreviewAnimation\(element\.id, \{[\s\S]*type: selected_capability\.id/,
  );
  for (const field of ["duration", "delay", "easing", "repeat", "interval"])
    assert.match(
      inspector_source,
      new RegExp(`configure\\(\\{\\s*${field}`, "g"),
    );
  assert.match(
    inspector_source,
    /onConfigureAnimation\(\s*element\.id,\s*capability\.id,\s*capability\.defaults,?\s*\);[\s\S]*onPreviewAnimation\(element\.id, \{[\s\S]*type: capability\.id/,
  );
  assert.match(
    slide_inspector_source,
    /onPreviewTransition\(value, capability\.defaults\.duration\)/,
  );
  assert.match(
    slide_inspector_source,
    /onTransitionChange\(slide\.transitionType, value\);[\s\S]*onPreviewTransition\(slide\.transitionType, value\)/,
  );
  assert.match(shell_source, /transitionType: transition_type/);
  assert.match(shell_source, /transitionDuration: transition_duration/);
});

test("coordinates finite, continuous, individual, transition, and slide playback in the shell", () => {
  const shell_source = readFileSync(
    new URL("../editor-shell.tsx", import.meta.url),
    "utf8",
  );
  const element_source = readFileSync(
    new URL("../editor-element.tsx", import.meta.url),
    "utf8",
  );
  const sidebar_source = readFileSync(
    new URL("../properties-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const slide_inspector_source = readFileSync(
    new URL("../slide-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shell_source, /createSlidePlayback/);
  assert.match(shell_source, /completeSlidePlayback/);
  assert.match(shell_source, /pauseSlidePlayback/);
  assert.match(shell_source, /activeSlide\.elements\.flatMap/);
  assert.match(shell_source, /set_animation_playback\(null\)/);
  assert.match(shell_source, /\}, \[activeSlideId\]\)/);
  assert.match(sidebar_source, /value=\{active_tab\}/);
  assert.match(
    sidebar_source,
    /if \(value !== "animations"\) onStopAnimationPlayback\(\)/,
  );
  assert.match(
    slide_inspector_source,
    /isActive \?\s*\(?\s*<IconPlayerPause data-icon="inline-start" \/>\s*\)?\s*:\s*\(?\s*<IconPlayerPlay data-icon="inline-start" \/>/,
  );
  assert.match(element_source, /previews\.reduceRight/);
  assert.match(element_source, /onAnimationEnd=\{\(event\) =>/);
});
