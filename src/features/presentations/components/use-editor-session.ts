import { useEffect, useRef, useState } from "react";
import { EditIntentScheduler } from "@/features/presentations/application/edit-intent-scheduler";
import type { EditorCapability } from "@/features/presentations/application/editor-capability";
import { EditorSession } from "@/features/presentations/application/editor-session";
import { subscribeEditorDrafts } from "./editor-draft-subscription";
import type { EditorIntentDraft } from "./editor-drafts";
import type { EditorStore } from "./editor-store";

export type EditorLoadStatus =
  | { readonly kind: "loading" }
  | { readonly kind: "not-found" }
  | { readonly kind: "error" };

export function useEditorSession({
  capability,
  presentationId,
  store,
}: {
  readonly capability: EditorCapability;
  readonly presentationId: string;
  readonly store: EditorStore;
}) {
  const [load_status, set_load_status] = useState<EditorLoadStatus>({
    kind: "loading",
  });
  const session_ref = useRef<EditorSession | null>(null);
  const scheduler_ref = useRef<EditIntentScheduler<
    string,
    EditorIntentDraft
  > | null>(null);

  if (scheduler_ref.current === null)
    scheduler_ref.current = new EditIntentScheduler();

  useEffect(() => {
    const scheduler = scheduler_ref.current;
    if (scheduler === null) return;
    return subscribeEditorDrafts(scheduler, store.getState().setDrafts);
  }, [store]);

  useEffect(() => {
    let is_active = true;
    let unsubscribe: () => void = () => undefined;

    async function loadEditor() {
      try {
        const result = await capability.loadPresentation(presentationId);
        if (!is_active) return;
        if (!result.success) {
          set_load_status({
            kind:
              result.code === "PRESENTATION_NOT_FOUND" ? "not-found" : "error",
          });
          return;
        }
        const session = new EditorSession(result.state);
        session_ref.current = session;
        unsubscribe = session.subscribe((next_snapshot) => {
          store.getState().setSnapshot(next_snapshot);
        });
        store.getState().setActiveSlideId(result.state.slides[0]?.id ?? null);
        store.getState().setSelection({ kind: "none" });
        store.getState().setSnapshot(session.getSnapshot());
      } catch {
        if (is_active) set_load_status({ kind: "error" });
      }
    }

    void loadEditor();
    return () => {
      is_active = false;
      unsubscribe();
      scheduler_ref.current?.flushAll();
      session_ref.current = null;
      store.getState().setSnapshot(null);
    };
  }, [capability, presentationId, store]);

  return {
    loadStatus: load_status,
    sessionRef: session_ref,
    schedulerRef: scheduler_ref,
  };
}
