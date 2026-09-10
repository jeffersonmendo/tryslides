import assert from "node:assert/strict";
import test from "node:test";
import { EditIntentScheduler } from "./edit-intent-scheduler";

test("coalesces a key to its latest observable draft", () => {
  const scheduler = new EditIntentScheduler<string, number>();
  const drafts: number[] = [];
  const dispatched: number[] = [];
  scheduler.subscribe((current) => drafts.push(current.get("color") ?? 0));

  scheduler.schedule({
    key: "color",
    draft: 1,
    delay: 1_000,
    dispatch: (draft) => {
      dispatched.push(draft);
      return true;
    },
  });
  scheduler.schedule({
    key: "color",
    draft: 2,
    delay: 1_000,
    dispatch: (draft) => {
      dispatched.push(draft);
      return true;
    },
  });
  scheduler.flush("color");

  assert.deepEqual(dispatched, [2]);
  assert.deepEqual(drafts, [0, 1, 2, 0]);
});

test("flushes and cancels only the requested drafts", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const dispatched: string[] = [];
  scheduler.schedule({
    key: "a",
    draft: "a",
    delay: 1_000,
    dispatch: (draft) => {
      dispatched.push(draft);
      return true;
    },
  });
  scheduler.schedule({
    key: "b",
    draft: "b",
    delay: 1_000,
    dispatch: (draft) => {
      dispatched.push(draft);
      return true;
    },
  });

  scheduler.cancel("a");
  scheduler.flushAll();

  assert.deepEqual(dispatched, ["b"]);
  assert.equal(scheduler.getDrafts().size, 0);
});

test("keeps a draft observable through successful dispatch and retains it on failure", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const events: string[] = [];
  scheduler.subscribe((drafts) =>
    events.push(`observe:${drafts.get("text") ?? "none"}`),
  );
  scheduler.schedule({
    key: "text",
    draft: "draft",
    delay: 1_000,
    dispatch: (draft) => {
      events.push(`dispatch:${draft}:${scheduler.getDrafts().get("text")}`);
      return true;
    },
  });

  scheduler.flush("text");
  assert.deepEqual(events, [
    "observe:none",
    "observe:draft",
    "dispatch:draft:draft",
    "observe:none",
  ]);

  scheduler.schedule({
    key: "text",
    draft: "retry",
    delay: 1_000,
    dispatch: () => false,
  });
  scheduler.flush("text");
  assert.equal(scheduler.getDrafts().get("text"), "retry");
});

test("does not dispatch a visible draft until debounce or explicit flush", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const dispatched: string[] = [];
  scheduler.schedule({
    key: "text",
    draft: "preview",
    delay: 1_000,
    dispatch: (draft) => {
      dispatched.push(draft);
      return true;
    },
  });

  assert.equal(scheduler.getDrafts().get("text"), "preview");
  assert.deepEqual(dispatched, []);
  scheduler.flush("text");
  assert.deepEqual(dispatched, ["preview"]);
});

test("flushes a pending element patch before a direct discrete command", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const operations: string[] = [];
  scheduler.schedule({
    key: "element:slide_1:text_1",
    draft: "opacity",
    delay: 1_000,
    dispatch: (draft) => {
      operations.push(`patch:${draft}`);
      return true;
    },
  });

  scheduler.flush("element:slide_1:text_1");
  operations.push("toggle:alignment");
  assert.deepEqual(operations, ["patch:opacity", "toggle:alignment"]);
});
