import assert from "node:assert/strict";
import test from "node:test";
import { EditIntentScheduler } from "@/features/presentations/application/edit-intent-scheduler";
import {
  createElement,
  createPresentation,
  createSlide,
  type PresentationState,
} from "@/features/presentations/core/presentation-core";
import { subscribeEditorDrafts } from "./editor-draft-subscription";
import type { EditorIntentDraft } from "./editor-drafts";
import { createEditorStore } from "./editor-store";

function createState(): PresentationState {
  const presentation = createPresentation({
    id: "550e8400-e29b-41d4-a716-446655440000",
    publicId: "Ab3xYz",
    title: "Drafts",
    createdAt: "2026-09-09T12:00:00.000Z",
  });
  assert.equal(presentation.success, true);
  if (!presentation.success) throw new Error("Presentation creation failed");
  const slide = createSlide(presentation.state, {
    id: "slide_1",
    updatedAt: "2026-09-09T12:00:01.000Z",
  });
  assert.equal(slide.success, true);
  if (!slide.success) throw new Error("Slide creation failed");
  const element = createElement(slide.state, {
    slideId: "slide_1",
    updatedAt: "2026-09-09T12:00:02.000Z",
    element: {
      id: "text_1",
      type: "text",
      content: "Before",
      position: { x: 0, y: 0 },
      size: { width: 400, height: 80 },
      rotation: 0,
      opacity: 1,
    },
  });
  assert.equal(element.success, true);
  if (!element.success) throw new Error("Element creation failed");
  return element.state;
}

function getText(
  state: PresentationState,
): Extract<
  PresentationState["slides"][number]["elements"][number],
  { readonly type: "text" }
> {
  const element = state.slides[0]?.elements[0];
  if (element?.type !== "text") throw new Error("Text element missing");
  return element;
}

test("renders pending text and element patches without changing Core state", () => {
  const store = createEditorStore();
  const state = createState();
  store.getState().setSnapshot({ state, saveStatus: "durable" });
  store.getState().setDrafts(
    new Map<string, EditorIntentDraft>([
      [
        "text:slide_1:text_1",
        {
          kind: "text",
          slideId: "slide_1",
          elementId: "text_1",
          content: "Draft",
        },
      ],
      [
        "element:slide_1:text_1",
        {
          kind: "element",
          slideId: "slide_1",
          elementIds: ["text_1"],
          patch: { opacity: 0.4, style: { color: "#ff0000" } },
        },
      ],
    ]),
  );

  const effective = store.getState().effectiveState;
  assert.notEqual(effective, null);
  if (effective === null) return;
  assert.deepEqual(getText(effective).content, "Draft");
  assert.equal(getText(effective).opacity, 0.4);
  assert.equal(getText(effective).style.color, "#ff0000");
  assert.equal(getText(state).content, "Before");
  assert.equal(getText(state).opacity, 1);
});

test("keeps the latest coalesced draft visible and falls back on cancel or flush", () => {
  const store = createEditorStore();
  let state = createState();
  store.getState().setSnapshot({ state, saveStatus: "durable" });
  const scheduler = new EditIntentScheduler<string, EditorIntentDraft>();
  scheduler.subscribe((drafts) => store.getState().setDrafts(drafts));
  const schedule = (content: string) =>
    scheduler.schedule({
      key: "text:slide_1:text_1",
      draft: { kind: "text", slideId: "slide_1", elementId: "text_1", content },
      delay: 1_000,
      dispatch: (draft) => {
        if (draft.kind !== "text") return false;
        state = {
          ...state,
          slides: state.slides.map((slide) =>
            slide.id !== draft.slideId
              ? slide
              : {
                  ...slide,
                  elements: slide.elements.map((element) =>
                    element.type === "text" && element.id === draft.elementId
                      ? { ...element, content: draft.content }
                      : element,
                  ),
                },
          ),
        };
        store.getState().setSnapshot({ state, saveStatus: "durable" });
        return true;
      },
    });

  schedule("First");
  schedule("Latest");
  assert.equal(
    getText(store.getState().effectiveState ?? state).content,
    "Latest",
  );

  scheduler.cancel("text:slide_1:text_1");
  assert.equal(
    getText(store.getState().effectiveState ?? state).content,
    "Before",
  );

  schedule("Flushed");
  scheduler.flush("text:slide_1:text_1");
  assert.equal(
    getText(store.getState().effectiveState ?? state).content,
    "Flushed",
  );
  assert.equal(store.getState().drafts.size, 0);
});

test("renders a valid slide draft immediately without changing Core state", () => {
  const store = createEditorStore();
  const state = createState();
  const original_background = state.slides[0]?.background;
  store.getState().setSnapshot({ state, saveStatus: "durable" });
  store.getState().setDrafts(
    new Map<string, EditorIntentDraft>([
      [
        "slide:slide_1:background",
        {
          kind: "slide",
          slideId: "slide_1",
          patch: { background: { type: "solid", color: "#123456" } },
        },
      ],
    ]),
  );

  assert.equal(
    store.getState().effectiveState?.slides[0]?.background.type,
    "solid",
  );
  assert.deepEqual(store.getState().effectiveState?.slides[0]?.background, {
    type: "solid",
    color: "#123456",
  });
  assert.deepEqual(state.slides[0]?.background, original_background);
});

test("bridges scheduler drafts without recursive or stale store notifications", () => {
  const store = createEditorStore();
  const scheduler = new EditIntentScheduler<string, EditorIntentDraft>();
  let store_notifications = 0;
  const unsubscribe_store = store.subscribe(() => {
    store_notifications += 1;
  });
  const unsubscribe_drafts = subscribeEditorDrafts(
    scheduler,
    store.getState().setDrafts,
  );

  assert.equal(store_notifications, 0);
  scheduler.schedule({
    key: "text:slide_1:text_1",
    draft: {
      kind: "text",
      slideId: "slide_1",
      elementId: "text_1",
      content: "Draft",
    },
    delay: 1_000,
    dispatch: () => true,
  });
  assert.equal(store_notifications, 1);

  unsubscribe_drafts();
  scheduler.cancel("text:slide_1:text_1");
  assert.equal(store_notifications, 1);
  unsubscribe_store();
});

test("coalesces rapid color previews and clears the final draft after Core acceptance", () => {
  const store = createEditorStore();
  let state = createState();
  store.getState().setSnapshot({ state, saveStatus: "durable" });
  const scheduler = new EditIntentScheduler<string, EditorIntentDraft>();
  const dispatched: string[] = [];
  const unsubscribe = subscribeEditorDrafts(
    scheduler,
    store.getState().setDrafts,
  );
  const key = "element:slide_1:text_1";
  const schedule_color = (color: string) =>
    scheduler.schedule({
      key,
      draft: {
        kind: "element",
        slideId: "slide_1",
        elementIds: ["text_1"],
        patch: { style: { color } },
      },
      delay: 1_000,
      dispatch: (draft) => {
        if (draft.kind !== "element") return false;
        const visible_color = getText(store.getState().effectiveState ?? state)
          .style.color;
        dispatched.push(`dispatch:${visible_color}`);
        state = {
          ...state,
          slides: state.slides.map((slide) => ({
            ...slide,
            elements: slide.elements.map((element) =>
              element.type === "text" && element.id === "text_1"
                ? { ...element, style: { ...element.style, color } }
                : element,
            ),
          })),
        };
        store.getState().setSnapshot({ state, saveStatus: "durable" });
        return true;
      },
    });

  schedule_color("#111111");
  schedule_color("#222222");
  schedule_color("#333333");

  assert.equal(
    getText(store.getState().effectiveState ?? state).style.color,
    "#333333",
  );
  assert.deepEqual(dispatched, []);

  scheduler.flush(key);
  assert.deepEqual(dispatched, ["dispatch:#333333"]);
  assert.equal(store.getState().drafts.size, 0);
  assert.equal(
    getText(store.getState().effectiveState ?? state).style.color,
    "#333333",
  );
  unsubscribe();
});
