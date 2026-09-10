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
  assert.match(
    source,
    /subscribeEditorDrafts\(scheduler, store\.getState\(\)\.setDrafts\)/,
  );
  assert.doesNotMatch(
    source,
    /scheduler\.subscribe\(\(drafts\) => store\.getState\(\)\.setDrafts\(drafts\)\)/,
  );
});
