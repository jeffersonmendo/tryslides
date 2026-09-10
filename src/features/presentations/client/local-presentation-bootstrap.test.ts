import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const editor_source = readFileSync(
  new URL("./local-editor-capability.ts", import.meta.url),
  "utf8",
);
const list_source = readFileSync(
  new URL("./local-presentation-list-capability.ts", import.meta.url),
  "utf8",
);

test("shares browser-local presentation bootstrap dependencies", () => {
  assert.match(editor_source, /createLocalPresentationDependencies/);
  assert.match(list_source, /createLocalPresentationDependencies/);
  assert.doesNotMatch(editor_source, /createBrowserPresentationIdGenerator/);
  assert.doesNotMatch(list_source, /createBrowserPresentationIdGenerator/);
});
