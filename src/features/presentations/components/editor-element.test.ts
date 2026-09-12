import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("publishes inline canvas text drafts before committing on blur", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /onInput=\{\(event\) =>\s*onContentChange\(event\.currentTarget\.textContent \?\? ""\)\s*\}/,
  );
  assert.match(
    source,
    /if \(content !== element\.content\) onContentCommit\(content\)/,
  );
});

test("uses the full logical bounds for editable canvas text", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /className="block size-full overflow-visible whitespace-pre-wrap outline-none"/,
  );
  assert.doesNotMatch(
    source,
    /className="block size-full overflow-visible whitespace-pre-wrap p-1 outline-none"/,
  );
});

test("applies element opacity only to visual content", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );
  const opacity_wrapper_start = source.indexOf(
    "style={{ opacity: element.opacity }}",
  );
  const element_content_start = source.indexOf(
    "<ElementContent",
    opacity_wrapper_start,
  );
  const opacity_wrapper_end = source.indexOf("</div>", element_content_start);
  const selection_controls_start = source.indexOf("{isSelected ? (");

  assert.ok(opacity_wrapper_start >= 0);
  assert.ok(element_content_start > opacity_wrapper_start);
  assert.ok(opacity_wrapper_end > element_content_start);
  assert.ok(selection_controls_start > opacity_wrapper_end);
});

test("renders a distinct accessible reference frame and consumes Shift reference selection", () => {
  const source = readFileSync(
    new URL("./editor-element.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const border_width = isReference \? 2 : 1;/);
  assert.match(source, /referenceElementLabel/);
  assert.match(source, /event\.shiftKey && isSelected && canSetReference/);
  assert.match(source, /onSetReference\(element\.id\)/);
  assert.match(
    source,
    /event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*onSetReference/,
  );
});
