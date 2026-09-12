export type EditIntent<Key extends string, Draft> = {
  readonly key: Key;
  readonly draft: Draft;
  readonly delay: number;
  readonly dispatch: (draft: Draft) => boolean;
};

type ScheduledIntent<Key extends string, Draft> = EditIntent<Key, Draft> & {
  readonly timeout: ReturnType<typeof setTimeout>;
};

/**
 * Coalesces UI drafts before they become immutable Core commands.
 *
 * The scheduler deliberately has no React, Core, or persistence dependency.
 */
export class EditIntentScheduler<Key extends string, Draft> {
  private readonly scheduled = new Map<Key, ScheduledIntent<Key, Draft>>();
  private readonly listeners = new Set<
    (drafts: ReadonlyMap<Key, Draft>) => void
  >();

  schedule(intent: EditIntent<Key, Draft>): void {
    const previous = this.scheduled.get(intent.key);
    if (previous !== undefined) {
      clearTimeout(previous.timeout);
      this.scheduled.delete(intent.key);
    }
    const timeout = setTimeout(() => this.flush(intent.key), intent.delay);
    this.scheduled.set(intent.key, { ...intent, timeout });
    this.publish();
  }

  flush(key: Key): void {
    const intent = this.scheduled.get(key);
    if (intent === undefined) return;
    clearTimeout(intent.timeout);
    try {
      if (!intent.dispatch(intent.draft)) return;
    } catch {
      return;
    }
    this.scheduled.delete(key);
    this.publish();
  }

  flushAll(): void {
    for (const key of [...this.scheduled.keys()]) this.flush(key);
  }

  cancel(key: Key): void {
    const intent = this.scheduled.get(key);
    if (intent === undefined) return;
    clearTimeout(intent.timeout);
    this.scheduled.delete(key);
    this.publish();
  }

  subscribe(listener: (drafts: ReadonlyMap<Key, Draft>) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDrafts());
    return () => this.listeners.delete(listener);
  }

  getDrafts(): ReadonlyMap<Key, Draft> {
    return new Map(
      [...this.scheduled.entries()].map(([key, intent]) => [key, intent.draft]),
    );
  }

  private publish(): void {
    const drafts = this.getDrafts();
    for (const listener of this.listeners) listener(drafts);
  }
}
