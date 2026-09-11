import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { finishSlideDrag } from "./slide-sidebar";

const source_text = readFileSync(
  new URL("./slide-sidebar.tsx", import.meta.url),
  "utf8",
);

test("renders decorative visual previews for every slide sidebar button", () => {
  assert.match(source_text, /import \{ SlideVisualContent \}/);
  assert.match(source_text, /aria-label=\{slide\.ariaLabel\}/);
  assert.match(
    source_text,
    /aria-hidden="true"[\s\S]*<SlideVisualContent[\s\S]*canvas=\{canvas\}[\s\S]*imageUrls=\{image_urls\}[\s\S]*slide=\{slide\}/,
  );
  assert.doesNotMatch(
    source_text,
    /toDataURL|html2canvas|createElement\(["']canvas/,
  );
});

test("uses sortable event data to preserve a genuine reorder after optimistic sorting", () => {
  assert.match(source_text, /DragDropProvider/);
  assert.match(
    source_text,
    /useSortable\(\{[\s\S]*id: slide\.id,[\s\S]*index,[\s\S]*\}\)/,
  );
  assert.match(
    source_text,
    /onDragOver=\{\(event\) =>\s*handleDragOver\(event, slides, latest_target_id_ref\)\s*\}/,
  );
  assert.match(source_text, /source_id !== target_id/);
  assert.match(source_text, /latest_target_id_ref\.current = target_id/);
  assert.match(source_text, /isSortableOperation\(event\.operation\)/);
  assert.match(
    source_text,
    /source\.sortable\.initialIndex !==\s*event\.operation\.source\.sortable\.index/,
  );
});

test("dispatches a genuine slide reorder and clears its transient target", () => {
  const reordered: Array<[string, string | null]> = [];
  const latest_target_id_ref = { current: "slide-b" };

  finishSlideDrag(
    {
      canceled: false,
      sourceId: "slide-a",
      finalTargetId: "slide-a",
      hasSortablePositionChange: true,
    },
    [{ id: "slide-a" }, { id: "slide-b" }],
    (slide_id, after_slide_id) => reordered.push([slide_id, after_slide_id]),
    latest_target_id_ref,
  );

  assert.deepEqual(reordered, [["slide-a", "slide-b"]]);
  assert.equal(latest_target_id_ref.current, null);
});

test("does not dispatch when a drag returns to its source", () => {
  const reordered: Array<[string, string | null]> = [];
  const latest_target_id_ref = { current: "slide-b" };

  finishSlideDrag(
    {
      canceled: false,
      sourceId: "slide-a",
      finalTargetId: "slide-a",
      hasSortablePositionChange: false,
    },
    [{ id: "slide-a" }, { id: "slide-b" }],
    (slide_id, after_slide_id) => reordered.push([slide_id, after_slide_id]),
    latest_target_id_ref,
  );

  assert.deepEqual(reordered, []);
  assert.equal(latest_target_id_ref.current, null);
});

test("does not dispatch a canceled drag and clears its transient target", () => {
  const reordered: Array<[string, string | null]> = [];
  const latest_target_id_ref = { current: "slide-b" };

  finishSlideDrag(
    {
      canceled: true,
      sourceId: "slide-a",
      finalTargetId: "slide-a",
      hasSortablePositionChange: true,
    },
    [{ id: "slide-a" }, { id: "slide-b" }],
    (slide_id, after_slide_id) => reordered.push([slide_id, after_slide_id]),
    latest_target_id_ref,
  );

  assert.deepEqual(reordered, []);
  assert.equal(latest_target_id_ref.current, null);
});
