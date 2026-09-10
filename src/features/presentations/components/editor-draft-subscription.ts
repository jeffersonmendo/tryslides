import type { EditIntentScheduler } from "@/features/presentations/application/edit-intent-scheduler";
import type { EditorIntentDraft } from "./editor-drafts";

type DraftListener = (drafts: ReadonlyMap<string, EditorIntentDraft>) => void;

/** Bridges scheduler notifications into the scoped editor store without redundant writes. */
export function subscribeEditorDrafts(
  scheduler: EditIntentScheduler<string, EditorIntentDraft>,
  set_drafts: DraftListener,
): () => void {
  let is_active = true;
  let current_drafts = scheduler.getDrafts();
  const unsubscribe = scheduler.subscribe((next_drafts) => {
    if (!is_active || haveSameDraftEntries(current_drafts, next_drafts)) return;
    current_drafts = next_drafts;
    set_drafts(next_drafts);
  });

  return () => {
    is_active = false;
    unsubscribe();
  };
}

export function haveSameDraftEntries<Draft>(
  current: ReadonlyMap<string, Draft>,
  next: ReadonlyMap<string, Draft>,
): boolean {
  if (current.size !== next.size) return false;
  for (const [key, draft] of current) {
    if (next.get(key) !== draft) return false;
  }
  return true;
}
