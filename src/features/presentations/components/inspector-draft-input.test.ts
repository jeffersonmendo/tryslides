import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EditIntentScheduler } from "../application/edit-intent-scheduler";
import {
  getDraftCommitValue,
  getNativeColorBlurCommitValue,
  getSyncedDraftValue,
  isValidHexColor,
  isValidNumericDraft,
  shouldPublishDraft,
} from "./inspector-draft-input";

test("publishes valid inspector drafts without creating a Core command", () => {
  const source = readFileSync(
    new URL("./inspector-draft-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /onChange\(next: string\) \{\n[\s\S]*set_draft\(next\);/,
  );
  assert.doesNotMatch(
    source,
    /onChange\(next: string\) \{[\s\S]*?on_commit\(next\);/,
  );
  assert.match(
    source,
    /if \(shouldPublishDraft\(next, is_valid\)\) on_draft_change\?\.\(next\)/,
  );
});

test("keeps partial hex values local and excludes them from drafts", () => {
  assert.equal(isValidHexColor("#123"), false);
  assert.equal(isValidHexColor("#123456"), true);
  assert.equal(shouldPublishDraft("#123", isValidHexColor), false);
  assert.equal(shouldPublishDraft("#123456", isValidHexColor), true);
});

test("uses the ordinary input unless an explicit input group control is requested", () => {
  const source = readFileSync(
    new URL("./inspector-draft-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /control = "standalone"/);
  assert.match(source, /control === "group" \? \([\s\S]*<InputGroupInput/);
  assert.match(source, /\) : \([\s\S]*<Input \{\.\.\.input_props\}/);
});

test("requests group controls only from local unit wrappers", () => {
  const element_inspector_source = readFileSync(
    new URL("./element-inspector.tsx", import.meta.url),
    "utf8",
  );
  const text_inspector_source = readFileSync(
    new URL("./text-inspector.tsx", import.meta.url),
    "utf8",
  );
  const group_inspector_source = readFileSync(
    new URL("./group-inspector.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    element_inspector_source,
    /<InspectorDraftInput control="group"/,
  );
  assert.match(text_inspector_source, /<InspectorDraftInput control="group"/);
  assert.match(group_inspector_source, /<InspectorDraftInput control="group"/);
});

test("commits a valid changed draft only on an explicit commit", () => {
  assert.equal(
    getDraftCommitValue("#123456", "#000000", () => true),
    "#123456",
  );
  assert.equal(
    getDraftCommitValue("#000000", "#000000", () => true),
    null,
  );
  assert.equal(
    getDraftCommitValue("", "#000000", (value) => value.length > 0),
    null,
  );
});

test("rejects empty, non-finite, and constraint-invalid numeric drafts", () => {
  assert.equal(
    isValidNumericDraft("", () => true),
    false,
  );
  assert.equal(
    isValidNumericDraft("Infinity", () => true),
    false,
  );
  assert.equal(
    isValidNumericDraft("0", (value) => value > 0),
    false,
  );
  assert.equal(
    isValidNumericDraft("24", (value) => value > 0),
    true,
  );
});

test("restores persisted drafts on Escape and synchronizes only while unfocused", () => {
  const source = readFileSync(
    new URL("./inspector-draft-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /event\.key === "Escape"[\s\S]*restore\(\);/);
  assert.equal(getSyncedDraftValue(true, "persisted"), null);
  assert.equal(getSyncedDraftValue(false, "persisted"), "persisted");
});

test("commits inputs on blur or Enter and reserves multiline Enter for a newline", () => {
  const source = readFileSync(
    new URL("./inspector-draft-input.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onBlur\(\) \{[\s\S]*commit\(\);/);
  assert.match(source, /event\.key === "Enter"\) \{[\s\S]*commit\(\);/);
  assert.match(
    source,
    /event\.key === "Enter" && \(event\.ctrlKey \|\| event\.metaKey\)/,
  );
});

test("uses the shared color control for previews and completion", () => {
  const color_control_source = readFileSync(
    new URL("../../../components/ui/color.tsx", import.meta.url),
    "utf8",
  );
  assert.match(color_control_source, /function ColorControl/);
  assert.match(color_control_source, /onChange=\{\(event\) => \{/);
  assert.match(color_control_source, /onBlur=\{\(\) => \{/);
  assert.match(color_control_source, /onChangeEnd=\{\(color\) => commit/);
});

test("emits one Core command when native color debounce completes before blur", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const core_commands: string[] = [];
  const color = "#123456";

  scheduler.schedule({
    key: "element:slide_1:text_1",
    draft: color,
    delay: 150,
    dispatch: (draft) => {
      core_commands.push(`editElement:${draft}`);
      return true;
    },
  });
  scheduler.flush("element:slide_1:text_1");

  const blur_color = getNativeColorBlurCommitValue(color, color);
  if (blur_color !== null) {
    scheduler.schedule({
      key: "element:slide_1:text_1",
      draft: blur_color,
      delay: 150,
      dispatch: (draft) => {
        core_commands.push(`editElement:${draft}`);
        return true;
      },
    });
    scheduler.flush("element:slide_1:text_1");
  }

  assert.deepEqual(core_commands, ["editElement:#123456"]);
});

test("flushes a final native color change immediately after its prior debounce dispatch", () => {
  const scheduler = new EditIntentScheduler<string, string>();
  const core_commands: string[] = [];
  const key = "element:slide_1:text_1";
  const debounced_color = "#123456";
  const final_blur_color = "#654321";
  let latest_accepted_color = "#000000";
  const dispatch = (draft: string) => {
    core_commands.push(`editElement:${draft}`);
    latest_accepted_color = draft;
    return true;
  };

  // onChange(debounced color) -> debounce dispatch
  scheduler.schedule({
    key,
    draft: debounced_color,
    delay: 150,
    dispatch,
  });
  scheduler.flush(key);
  assert.deepEqual(core_commands, ["editElement:#123456"]);

  // onChange(final distinct color) does not replace the accepted color used by blur.
  const blur_color = getNativeColorBlurCommitValue(
    final_blur_color,
    latest_accepted_color,
  );
  assert.equal(blur_color, final_blur_color);

  // onBlur(final color) schedules and flushes the final value immediately.
  scheduler.schedule({
    key,
    draft: blur_color,
    delay: 150,
    dispatch,
  });
  scheduler.flush(key);

  assert.deepEqual(core_commands, [
    "editElement:#123456",
    "editElement:#654321",
  ]);
});
