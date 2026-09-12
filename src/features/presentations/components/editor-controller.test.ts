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
  assert.match(
    source,
    /const image_asset_reference_key = getImageAssetReferenceKey\(/,
  );
  assert.match(source, /\}, \[capability, image_asset_reference_key\]\);/);
  assert.match(
    source,
    /function getImageAssetReferences\(\s*slides: readonly Slide\[\],[\s\S]*for \(const slide of slides\)[\s\S]*for \(const element of slide\.elements\)/,
  );
  assert.match(source, /references\.set\(element\.assetId/);
  assert.match(source, /getImageUrlRecordIfChanged\(\s*current/);
});

test("uses independent active-slide and presentation history after drafts flush", () => {
  assert.match(
    source,
    /const slide_history =[\s\S]*status\.state\.slideHistories\[active_slide_id\]/,
  );
  assert.match(
    source,
    /function runSlideHistoryCommand[\s\S]*scheduler_ref\.current\?\.flushAll\(\)[\s\S]*slideHistories\[active_slide_id\]\?\.\[stack\]/,
  );
  assert.match(
    source,
    /onRedo=\{\(\) => \{[\s\S]*runSlideHistoryCommand\(capability\.redoSlide, "redoStack"\)/,
  );
  assert.match(
    source,
    /runPresentationHistoryCommand\(capability\.undoPresentation, "undoStack"\)/,
  );
});

test("flushes drafts and keeps selection coherent for slide mutations", () => {
  assert.match(
    source,
    /function runSlideCommand[\s\S]*scheduler_ref\.current\?\.flushAll\(\)[\s\S]*runCommand\(command, false, on_success\)/,
  );
  assert.match(source, /capability\.duplicateSlide/);
  assert.match(source, /capability\.deleteSlide/);
  assert.match(source, /capability\.reorderSlide/);
  assert.match(source, /function getDeletedSlideFallbackId/);
  assert.match(
    source,
    /slides\[deleted_index - 1\]\?\.id \?\? slides\[deleted_index \+ 1\]\?\.id \?\? null/,
  );
});

test("routes layout alignment and extreme layer actions through the editor capability", () => {
  assert.match(
    source,
    /onAlignElement=\{\(element_id, alignment\) =>[\s\S]*capability\.alignElement[\s\S]*alignment/,
  );
  assert.match(
    source,
    /onSendToBack=\{\(element_id\) =>[\s\S]*capability\.sendToBack/,
  );
  assert.match(
    source,
    /onBringToFront=\{\(element_id\) =>[\s\S]*capability\.bringToFront/,
  );
});
