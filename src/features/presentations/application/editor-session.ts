import type { PresentationState } from "@/features/presentations/core/presentation-core";

import type { PreparedPresentationCommandResult } from "./presentation-commands";

export type EditorSaveStatus = "durable" | "pending" | "failed";

export type EditorSessionSnapshot = {
  readonly state: PresentationState;
  readonly saveStatus: EditorSaveStatus;
};

export type EditorSessionDispatchResult =
  | { readonly accepted: false; readonly persisted: Promise<false> }
  | {
      readonly accepted: true;
      readonly state: PresentationState;
      readonly persisted: Promise<boolean>;
    };

type PersistenceCheckpoint = {
  readonly version: number;
  readonly prepared: Extract<
    PreparedPresentationCommandResult,
    { readonly success: true }
  >;
  readonly resolve: (persisted: boolean) => void;
};

/** Owns one editor's optimistic Core state and its ordered durability checkpoints. */
export class EditorSession {
  private currentVersion = 0;
  private isPersisting = false;
  private saveStatus: EditorSaveStatus = "durable";
  private state: PresentationState;
  private readonly checkpoints: PersistenceCheckpoint[] = [];
  private readonly listeners = new Set<
    (snapshot: EditorSessionSnapshot) => void
  >();

  constructor(initial_state: PresentationState) {
    this.state = initial_state;
  }

  getSnapshot(): EditorSessionSnapshot {
    return { state: this.state, saveStatus: this.saveStatus };
  }

  subscribe(listener: (snapshot: EditorSessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(
    command: (state: PresentationState) => PreparedPresentationCommandResult,
  ): EditorSessionDispatchResult {
    const prepared = command(this.state);
    if (!prepared.success)
      return { accepted: false, persisted: Promise.resolve(false) };

    this.currentVersion += 1;
    const version = this.currentVersion;
    this.state = prepared.state;
    if (this.saveStatus !== "failed") this.saveStatus = "pending";
    let resolve_persistence: (persisted: boolean) => void = () => undefined;
    const persisted = new Promise<boolean>((resolve) => {
      resolve_persistence = resolve;
    });
    this.checkpoints.push({ version, prepared, resolve: resolve_persistence });
    this.publish();
    void this.persistInOrder();
    return { accepted: true, state: prepared.state, persisted };
  }

  retry(): void {
    if (this.saveStatus !== "failed" || this.checkpoints.length === 0) return;
    this.saveStatus = "pending";
    this.publish();
    void this.persistInOrder();
  }

  private async persistInOrder(): Promise<void> {
    if (this.isPersisting || this.saveStatus === "failed") return;
    this.isPersisting = true;

    while (this.checkpoints.length > 0) {
      const checkpoint = this.checkpoints[0];
      let result: Awaited<ReturnType<typeof checkpoint.prepared.persist>>;
      try {
        result = await checkpoint.prepared.persist();
      } catch {
        result = { success: false, code: "PERSISTENCE_WRITE_FAILED" };
      }
      if (!result.success) {
        this.saveStatus = "failed";
        this.isPersisting = false;
        checkpoint.resolve(false);
        this.publish();
        return;
      }

      this.checkpoints.shift();
      checkpoint.resolve(true);
      if (checkpoint.version === this.currentVersion) this.state = result.state;
      this.saveStatus = this.checkpoints.length === 0 ? "durable" : "pending";
      this.publish();
    }

    this.isPersisting = false;
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
