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
