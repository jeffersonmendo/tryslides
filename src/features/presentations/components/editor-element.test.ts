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
