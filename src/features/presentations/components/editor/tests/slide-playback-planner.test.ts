import assert from "node:assert/strict";
import test from "node:test";
import type {
  EditorAnimationPlayback,
  EditorAnimationPreview,
} from "../lib/editor-model";
import {
  completeSlidePlayback,
  createSlidePlayback,
  pauseSlidePlayback,
} from "../lib/slide-playback-planner";

function preview(
  key: number,
  type: EditorAnimationPreview["animation"]["type"],
  repeat?: number | "infinite",
): EditorAnimationPreview {
  return {
    key,
    elementId: `element_${key}`,
    animation: {
      type,
      duration: 300,
      delay: 0,
      easing: "linear",
      ...(repeat === undefined ? {} : { repeat }),
    },
  };
}

function requirePlayback(
  playback: EditorAnimationPlayback | null,
): EditorAnimationPlayback {
  assert.ok(playback);
  return playback;
}

test("plays entrances, finite continuous effects, and exits in phases", () => {
  const started = createSlidePlayback(101, "slide_1", [
    preview(1, "fade-in"),
    preview(2, "slide-in"),
    preview(3, "pulse", 2),
    preview(4, "fade-out"),
  ]);
  assert.equal(started?.phase, "entrance");
  assert.deepEqual(
    started?.previews.map((item) => item.key),
    [1, 2],
  );

  const waiting_for_entrance = completeSlidePlayback(
    requirePlayback(started),
    101,
    1,
  );
  assert.equal(waiting_for_entrance?.phase, "entrance");
  const continuous = completeSlidePlayback(
    requirePlayback(waiting_for_entrance),
    101,
    2,
  );
  assert.equal(continuous?.phase, "continuous");
  assert.deepEqual(
    continuous?.previews.map((item) => item.key),
    [3],
  );

  const exiting = completeSlidePlayback(requirePlayback(continuous), 101, 3);
  assert.equal(exiting?.phase, "exit");
  assert.equal(completeSlidePlayback(requirePlayback(exiting), 101, 4), null);
});

test("infinite continuous effects block automatic exits", () => {
  const started = createSlidePlayback(102, "slide_1", [
    preview(1, "pulse", "infinite"),
    preview(2, "fade-out"),
  ]);
  assert.equal(started?.phase, "continuous");
  assert.equal(
    completeSlidePlayback(requirePlayback(started), 102, 1),
    started,
  );
});

test("pause starts exits from entrance or continuous and clears without exits", () => {
  const during_entrance = createSlidePlayback(103, "slide_1", [
    preview(1, "fade-in"),
    preview(2, "fade-out"),
  ]);
  assert.equal(
    pauseSlidePlayback(requirePlayback(during_entrance))?.phase,
    "exit",
  );

  const during_continuous = createSlidePlayback(104, "slide_1", [
    preview(1, "pulse", "infinite"),
    preview(2, "fade-out"),
  ]);
  assert.equal(
    pauseSlidePlayback(requirePlayback(during_continuous))?.phase,
    "exit",
  );

  const without_exits = createSlidePlayback(105, "slide_1", [
    preview(1, "fade-in"),
  ]);
  assert.equal(pauseSlidePlayback(requirePlayback(without_exits)), null);
});

test("rejects stale completion events from replaced sessions", () => {
  const started = createSlidePlayback(106, "slide_1", [
    preview(1, "fade-in"),
    preview(2, "fade-out"),
  ]);
  assert.equal(
    completeSlidePlayback(requirePlayback(started), 105, 1),
    started,
  );
  assert.equal(
    completeSlidePlayback(requirePlayback(started), 106, 999),
    started,
  );
});
