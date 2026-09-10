import assert from "node:assert/strict";
import test from "node:test";
import {
  type ImageUrlEntry,
  reconcileImageUrlEntries,
  toImageUrlRecord,
} from "./editor-image-urls";

test("retains unchanged image URLs and invalidates removed or replaced assets", () => {
  const unchanged: ImageUrlEntry = {
    id: "asset_1",
    contentIdentity: "asset_1",
    url: "blob:asset_1",
  };
  const replaced: ImageUrlEntry = {
    id: "asset_2",
    contentIdentity: "asset_2-v1",
    url: "blob:asset_2-v1",
  };
  const removed: ImageUrlEntry = {
    id: "asset_3",
    contentIdentity: "asset_3",
    url: "blob:asset_3",
  };

  const result = reconcileImageUrlEntries(
    new Map([
      [unchanged.id, unchanged],
      [replaced.id, replaced],
      [removed.id, removed],
    ]),
    [
      { id: "asset_1", contentIdentity: "asset_1" },
      { id: "asset_2", contentIdentity: "asset_2-v2" },
    ],
  );

  assert.deepEqual(
    toImageUrlRecord(result.retained),
    Object.fromEntries([["asset_1", "blob:asset_1"]]),
  );
  assert.deepEqual(result.removed, [replaced, removed]);
  assert.deepEqual(result.missing, [
    { id: "asset_2", contentIdentity: "asset_2-v2" },
  ]);
});
