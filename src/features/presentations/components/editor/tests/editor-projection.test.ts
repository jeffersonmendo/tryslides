import assert from "node:assert/strict";
import test from "node:test";
import { toEditorAnimation } from "../lib/editor-projection";

test("omits absent optional animation fields from editor projections", () => {
  const animation = toEditorAnimation({
    type: "fade-in",
    duration: 720,
    delay: 180,
    easing: "ease-in-out",
  });

  assert.deepEqual(animation, {
    type: "fade-in",
    duration: 720,
    delay: 180,
    easing: "ease-in-out",
  });
  assert.equal(Object.hasOwn(animation, "repeat"), false);
  assert.equal(Object.hasOwn(animation, "interval"), false);
});

test("retains configured continuous optional animation fields", () => {
  assert.deepEqual(
    toEditorAnimation({
      type: "pulse",
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    }),
    {
      type: "pulse",
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    },
  );
});
