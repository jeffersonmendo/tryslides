import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./slide-sidebar.tsx", import.meta.url),
  "utf8",
);

test("renders decorative visual previews for every slide sidebar button", () => {
  assert.match(source, /import \{ SlideVisualContent \}/);
  assert.match(source, /aria-label=\{slide\.ariaLabel\}/);
  assert.match(
    source,
    /aria-hidden="true"[\s\S]*<SlideVisualContent[\s\S]*canvas=\{canvas\}[\s\S]*imageUrls=\{imageUrls\}[\s\S]*slide=\{slide\}/,
  );
  assert.doesNotMatch(
    source,
    /toDataURL|html2canvas|createElement\(["']canvas/,
  );
});
