import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TRANSITION_CAPABILITIES } from "@/features/presentations/core/presentation-core";

const source = readFileSync(
  new URL("./slide-inspector.tsx", import.meta.url),
  "utf8",
);

test("derives slide transition options from the Core registry", () => {
  assert.deepEqual(
    TRANSITION_CAPABILITIES.map((capability) => capability.id),
    ["none", "fade", "slide", "scale"],
  );
  assert.match(source, /TRANSITION_CAPABILITIES\.map\(\(capability\)/);
  assert.match(
    source,
    /TRANSITION_CAPABILITIES\.some\(\(capability\) => capability\.id === value\)/,
  );
  assert.doesNotMatch(source, /const TRANSITION_TYPES/);
});
