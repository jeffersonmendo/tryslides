export type ImageAssetReference = {
  readonly id: string;
  readonly contentIdentity: string;
};

export type ImageUrlEntry = ImageAssetReference & {
  readonly url: string;
};

export function reconcileImageUrlEntries(
  entries: ReadonlyMap<string, ImageUrlEntry>,
  references: readonly ImageAssetReference[],
): {
  readonly retained: ReadonlyMap<string, ImageUrlEntry>;
  readonly removed: readonly ImageUrlEntry[];
  readonly missing: readonly ImageAssetReference[];
} {
  const references_by_id = new Map(
    references.map((reference) => [reference.id, reference]),
  );
  const retained = new Map<string, ImageUrlEntry>();
  const removed: ImageUrlEntry[] = [];

  for (const [id, entry] of entries) {
    const reference = references_by_id.get(id);
    if (
      reference === undefined ||
      reference.contentIdentity !== entry.contentIdentity
    ) {
      removed.push(entry);
      continue;
    }
    retained.set(id, entry);
  }

  return {
    retained,
    removed,
    missing: references.filter((reference) => !retained.has(reference.id)),
  };
}

export function toImageUrlRecord(
  entries: ReadonlyMap<string, ImageUrlEntry>,
): Readonly<Record<string, string>> {
  return Object.fromEntries([...entries].map(([id, entry]) => [id, entry.url]));
}

export function getImageUrlRecordIfChanged(
  current: Readonly<Record<string, string>>,
  entries: ReadonlyMap<string, ImageUrlEntry>,
): Readonly<Record<string, string>> {
  if (Object.keys(current).length !== entries.size)
    return toImageUrlRecord(entries);
  for (const [id, entry] of entries) {
    if (current[id] !== entry.url) return toImageUrlRecord(entries);
  }
  return current;
}
