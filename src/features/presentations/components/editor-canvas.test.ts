import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./editor-canvas.tsx", import.meta.url),
  "utf8",
);

test("shows the active slide outline only when no elements are selected", () => {
  assert.match(
    source,
    /data-selected=\{activeSlide !== null && selectionIds\.length === 0\}/,
  );
  assert.match(
    source,
    /outline bg-background data-\[selected=true\]:outline-blue-500/,
  );
  assert.doesNotMatch(source, /data-\[selected=true\]:outline-2/);
  assert.match(
    source,
    /<button[\s\S]*type="button"[\s\S]*onClick=\{onDeselectElement\}/,
  );
  assert.match(source, /aria-pressed=\{selectionIds\.length === 0\}/);
  assert.match(
    source,
    /bottom-full left-0 z-20 mb-2 flex items-center gap-4 rounded-md bg-white p-1 px-2 text-xs! text-foreground/,
  );
  assert.match(source, /\{activeSlide\.ariaLabel\}/);
  assert.equal(
    source.match(/pointer-events-none[^\n]*-z-10[^\n]*bg-muted\/80/g)?.length,
    4,
  );
});

test("fills narrow workspace width without changing the logical canvas ratio", () => {
  assert.match(
    source,
    /style=\{\{\s*width: "100%",\s*maxWidth: canvas\.width \/ 2,\s*aspectRatio: `\$\{canvas\.width\} \/ \$\{canvas\.height\}`,\s*\}\}/,
  );
  assert.doesNotMatch(source, /height: canvas\.height \/ 2/);
  assert.doesNotMatch(source, /width: canvas\.width \/ 2/);
});
