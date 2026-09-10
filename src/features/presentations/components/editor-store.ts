import { createStore } from "zustand/vanilla";
import type { EditorSessionSnapshot } from "@/features/presentations/application/editor-session";
import type { PresentationState } from "@/features/presentations/core/presentation-core";
import { haveSameDraftEntries } from "./editor-draft-subscription";
import {
  type EditorIntentDraft,
  getEffectivePresentationState,
} from "./editor-drafts";
import type { EditorSelection } from "./editor-model";

export type EditorStoreState = {
  readonly snapshot: EditorSessionSnapshot | null;
  readonly effectiveState: PresentationState | null;
  readonly activeSlideId: string | null;
  readonly selection: EditorSelection;
  readonly drafts: ReadonlyMap<string, EditorIntentDraft>;
  setSnapshot(snapshot: EditorSessionSnapshot | null): void;
  setActiveSlideId(slide_id: string | null): void;
  setSelection(selection: EditorSelection): void;
  setDrafts(drafts: ReadonlyMap<string, EditorIntentDraft>): void;
};

export type EditorStore = ReturnType<typeof createEditorStore>;

function haveSameSelection(
  current: EditorSelection,
  next: EditorSelection,
): boolean {
  if (current.kind !== next.kind) return false;
  if (current.kind === "none") return true;
  if (current.kind === "multiple") {
    if (next.kind !== "multiple") return false;
    if (
      current.primaryElementId !== next.primaryElementId ||
      current.elementIds.length !== next.elementIds.length
    )
      return false;

    const next_ids = new Set(next.elementIds);
    return current.elementIds.every((id) => next_ids.has(id));
  }
  if (next.kind === "none" || next.kind === "multiple") return false;
  return current.elementId === next.elementId;
}

export function createEditorStore() {
  return createStore<EditorStoreState>()((set) => ({
    snapshot: null,
    effectiveState: null,
    activeSlideId: null,
    selection: { kind: "none" },
    drafts: new Map(),
    setSnapshot: (snapshot) =>
      set((state) => ({
        snapshot,
        effectiveState: getEffectivePresentationState(
          snapshot?.state ?? null,
          state.drafts,
        ),
      })),
    setActiveSlideId: (active_slide_id) =>
      set({ activeSlideId: active_slide_id }),
    setSelection: (selection) =>
      set((state) =>
        haveSameSelection(state.selection, selection) ? state : { selection },
      ),
    setDrafts: (drafts) =>
      set((state) =>
        haveSameDraftEntries(state.drafts, drafts)
          ? state
          : {
              drafts,
              effectiveState: getEffectivePresentationState(
                state.snapshot?.state ?? null,
                drafts,
              ),
            },
      ),
  }));
}
