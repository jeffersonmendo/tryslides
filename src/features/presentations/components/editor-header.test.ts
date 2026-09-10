import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("exposes header creation actions outside the dimmed editor workspace", () => {
  const header_source = readFileSync(
    new URL("./editor-header.tsx", import.meta.url),
    "utf8",
  );
  const shell_source = readFileSync(
    new URL("./editor-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(header_source, /onClick=\{onCreateText\}/);
  assert.match(
    header_source,
    /onClick=\{\(\) => onCreateShape\("rectangle"\)\}/,
  );
  assert.match(header_source, /accept="image\/\*"/);
  assert.match(header_source, /onChange=\{handleImageChange\}/);
  assert.match(header_source, /multiple/);
  assert.match(header_source, /Array\.from\(event\.target\.files \?\? \[\]\)/);
  assert.match(header_source, /onUploadImages\(image_files\)/);
  assert.match(
    shell_source,
    /<EditorHeader[\s\S]*onCreateText=\{onCreateText\}/,
  );
  assert.match(
    shell_source,
    /<EditorHeader[\s\S]*onCreateShape=\{onCreateShape\}/,
  );
  assert.match(
    shell_source,
    /<EditorHeader[\s\S]*onUploadImages=\{onUploadImages\}/,
  );
  assert.match(
    shell_source,
    /<EditorHeader[\s\S]*<EditorWorkspace[\s\S]*onTextContentChange/,
  );
});
