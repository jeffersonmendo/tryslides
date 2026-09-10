import assert from "node:assert/strict";
import test from "node:test";

import {
  createElement,
  createPresentation,
  createSlide,
  moveElement,
  renamePresentation,
} from "@/features/presentations/core/presentation-core";

import { EditorSession } from "./editor-session";
import type { PreparedPresentationCommandResult } from "./presentation-commands";

const PRESENTATION_ID = "550e8400-e29b-41d4-a716-446655440000";

test("accepts a second command while the first persistence checkpoint is delayed", async () => {
  const initial = createInitialState();
  const first_gate = deferred<void>();
  const persisted_titles: string[] = [];
  const session = new EditorSession(initial);

  const first = session.dispatch((state) =>
    prepareSlideTitle(state, "First", async () => {
      await first_gate.promise;
      persisted_titles.push("First");
    }),
  );
  const second = session.dispatch((state) =>
    prepareSlideTitle(state, "Second", async () => {
      persisted_titles.push("Second");
    }),
  );

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.equal(getSlideTitle(session), "Second");
  assert.deepEqual(persisted_titles, []);

  first_gate.resolve();
  await second.persisted;
  assert.deepEqual(persisted_titles, ["First", "Second"]);
  assert.equal(getSlideTitle(session), "Second");
  assert.equal(session.getSnapshot().saveStatus, "durable");
});

test("does not replace newer working state when an older checkpoint completes", async () => {
  const gate = deferred<void>();
  const session = new EditorSession(createInitialState());
  const snapshots: string[] = [];
  session.subscribe(() => snapshots.push(getSlideTitle(session)));

  const first = session.dispatch((state) =>
    prepareSlideTitle(state, "First", () => gate.promise),
  );
  session.dispatch((state) => prepareSlideTitle(state, "Second"));
  gate.resolve();
  await first.persisted;

  assert.equal(getSlideTitle(session), "Second");
  assert.equal(snapshots.includes("First"), true);
  assert.equal(snapshots.at(-1), "Second");
});

test("retains optimistic work after failure and retries pending checkpoints in order", async () => {
  let attempts = 0;
  const persisted_titles: string[] = [];
  const session = new EditorSession(createInitialState());

  const first = session.dispatch((state) =>
    prepareSlideTitle(state, "First", () => {
      attempts += 1;
      if (attempts === 1) throw new Error("IndexedDB unavailable");
      persisted_titles.push("First");
    }),
  );
  session.dispatch((state) =>
    prepareSlideTitle(state, "Second", () => {
      persisted_titles.push("Second");
    }),
  );

  assert.equal(await first.persisted, false);
  assert.equal(getSlideTitle(session), "Second");
  assert.equal(session.getSnapshot().saveStatus, "failed");

  session.retry();
  await waitFor(() => session.getSnapshot().saveStatus === "durable");
  assert.deepEqual(persisted_titles, ["First", "Second"]);
  assert.equal(getSlideTitle(session), "Second");
});

test("rapid consecutive position commands calculate from the latest working coordinates", async () => {
  const session = new EditorSession(createInitialState());

  session.dispatch((state) => preparePositionDelta(state, 10));
  session.dispatch((state) => preparePositionDelta(state, 15));

  assert.equal(
    session.getSnapshot().state.slides[0]?.elements[0]?.position.x,
    25,
  );
});

function createInitialState() {
  const created = createPresentation({
    id: PRESENTATION_ID,
    publicId: "Ab3xYz",
    title: "Session",
    createdAt: "2026-09-09T12:00:00.000Z",
  });
  assert.equal(created.success, true);
  if (!created.success) throw new Error("Failed to create fixture");
  const slide = createSlide(created.state, {
    id: "slide_1",
    updatedAt: "2026-09-09T12:00:01.000Z",
  });
  assert.equal(slide.success, true);
  if (!slide.success) throw new Error("Failed to create fixture slide");
  const element = createElement(slide.state, {
    slideId: "slide_1",
    element: {
      id: "shape_1",
      type: "shape",
      shapeType: "rectangle",
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      rotation: 0,
      opacity: 1,
    },
    updatedAt: "2026-09-09T12:00:02.000Z",
  });
  assert.equal(element.success, true);
  if (!element.success) throw new Error("Failed to create fixture element");
  return element.state;
}

function prepareSlideTitle(
  state: ReturnType<typeof createInitialState>,
  title: string,
  persist: () => void | Promise<void> = () => undefined,
): PreparedPresentationCommandResult {
  const result = renamePresentation(state, {
    title,
    updatedAt: nextTimestamp(state.updatedAt),
  });
  if (!result.success) return { success: false, code: result.error.code };
  return {
    success: true,
    state: result.state,
    operation: result.operation,
    persist: async () => {
      await persist();
      return {
        success: true,
        state: result.state,
        operation: result.operation,
      };
    },
  };
}

function preparePositionDelta(
  state: ReturnType<typeof createInitialState>,
  delta: number,
): PreparedPresentationCommandResult {
  const element = state.slides[0]?.elements[0];
  assert.notEqual(element, undefined);
  if (element === undefined)
    return { success: false, code: "ELEMENT_NOT_FOUND" };
  const result = moveElement(state, {
    slideId: "slide_1",
    elementId: element.id,
    position: { x: element.position.x + delta, y: element.position.y },
    updatedAt: nextTimestamp(state.updatedAt),
  });
  if (!result.success) return { success: false, code: result.error.code };
  return {
    success: true,
    state: result.state,
    operation: result.operation,
    persist: async () => ({
      success: true,
      state: result.state,
      operation: result.operation,
    }),
  };
}

function getSlideTitle(session: EditorSession): string {
  return session.getSnapshot().state.title;
}

function nextTimestamp(timestamp: string): string {
  return new Date(Date.parse(timestamp) + 1).toISOString();
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  while (!predicate()) await new Promise((resolve) => setTimeout(resolve, 0));
}
