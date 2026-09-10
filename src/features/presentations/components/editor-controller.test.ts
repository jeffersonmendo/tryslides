import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./editor-controller.tsx", import.meta.url),
  "utf8",
);

test("schedules valid inspector previews before persistence", () => {
  assert.match(source, /function scheduleElementPatch[\s\S]*delay: 150/);
  assert.match(source, /function scheduleSlidePatch[\s\S]*delay: 150/);
  assert.match(source, /onTextContentChange[\s\S]*scheduleTextEdit/);
  assert.match(
    source,
    /onElementPatch=\{\(element_id, patch\) =>[\s\S]*scheduleElementPatch/,
  );
});

test("normalizes geometry drafts from effective elements before rendering them", () => {
  assert.match(source, /hasGeometryPatch\(patch\)/);
  assert.match(
    source,
    /scheduleElementPatch\(slide_id, \[element_id\], patch\)/,
  );
  assert.match(
    source,
    /getActiveSlide\(\s*effective_state\?\.slides \?\? \[\],\s*slide_id,\s*\)/,
  );
  assert.match(source, /normalizeGeometryDraftPatch\(element, merged_patch\)/);
});

test("flushes pending element intents before direct discrete commands", () => {
  assert.match(
    source,
    /function flushElementIntents[\s\S]*draft\.elementIds\.includes\(element_id\)/,
  );
  assert.match(
    source,
    /function applyElementPatch[\s\S]*flushElementIntents[\s\S]*capability\.editElement/,
  );
  assert.match(source, /onTextStyleApply[\s\S]*applyElementPatch/);
});

test("flushes explicit input commits without UI effect persistence", () => {
  assert.match(
    source,
    /function commitElementPatch[\s\S]*scheduleElementPatch[\s\S]*flushElementIntents/,
  );
  assert.match(
    source,
    /onBackgroundCommit[\s\S]*scheduleSlidePatch[\s\S]*\.flush\(key\)/,
  );
});

test("uses a lifecycle-safe scheduler draft subscription", () => {
  const session_source = readFileSync(
    new URL("./use-editor-session.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    session_source,
    /subscribeEditorDrafts\(scheduler, store\.getState\(\)\.setDrafts\)/,
  );
  assert.doesNotMatch(
    session_source,
    /scheduler\.subscribe\(\(drafts\) => store\.getState\(\)\.setDrafts\(drafts\)\)/,
  );
});

test("loads distinct image assets referenced by every effective slide", () => {
  assert.match(source, /getImageAssetReferences\(effective_state\.slides\)/);
  assert.match(
    source,
    /function getImageAssetReferences\(\s*slides: readonly Slide\[\],[\s\S]*for \(const slide of slides\)[\s\S]*for \(const element of slide\.elements\)/,
  );
  assert.match(source, /references\.set\(element\.assetId/);
});

test("only enables and dispatches history for the active slide after drafts flush", () => {
  assert.match(
    source,
    /const can_redo =[\s\S]*redo_entry !== undefined[\s\S]*isHistoryEntryApplicableToSlide\(redo_entry, active_slide_id\)/,
  );
  assert.match(
    source,
    /function runHistoryCommand[\s\S]*scheduler_ref\.current\?\.flushAll\(\)[\s\S]*session\?\.getSnapshot\(\)\.state\[stack\]\.at\(-1\)[\s\S]*isHistoryEntryApplicableToSlide\(entry, active_slide_id\)[\s\S]*return runCommand\(command\)/,
  );
  assert.match(
    source,
    /onRedo=\{\(\) => \{[\s\S]*runHistoryCommand\(capability\.redo, "redoStack"\)/,
  );
});
