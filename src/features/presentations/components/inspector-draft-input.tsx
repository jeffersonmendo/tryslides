"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";

type DraftValue = string | number;

type InspectorDraftInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "onBlur" | "onChange" | "onFocus" | "onKeyDown" | "value"
> & {
  readonly control?: "group" | "standalone";
  readonly value: DraftValue;
  readonly isValid?: (value: string) => boolean;
  readonly onCommit: (value: string) => void;
  readonly onDraftChange?: (value: string) => void;
};

type InspectorDraftTextareaProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "onBlur" | "onChange" | "onFocus" | "onKeyDown" | "value"
> & {
  readonly value: string;
  readonly isValid?: (value: string) => boolean;
  readonly onCommit: (value: string) => void;
  readonly onDraftChange?: (value: string) => void;
};

export function InspectorDraftInput({
  control = "standalone",
  value,
  isValid,
  onCommit,
  onDraftChange,
  ...props
}: InspectorDraftInputProps) {
  const draft = useInspectorDraft(value, isValid, onCommit, onDraftChange);

  const input_props = {
    ...props,
    value: draft.value,
    onBlur: draft.onBlur,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      draft.onChange(event.target.value),
    onFocus: draft.onFocus,
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) =>
      draft.onKeyDown(event),
  };

  return control === "group" ? (
    <InputGroupInput {...input_props} />
  ) : (
    <Input {...input_props} />
  );
}

export function InspectorDraftTextarea({
  value,
  isValid,
  onCommit,
  onDraftChange,
  ...props
}: InspectorDraftTextareaProps) {
  const draft = useInspectorDraft(value, isValid, onCommit, onDraftChange);

  return (
    <Textarea
      {...props}
      value={draft.value}
      onBlur={draft.onBlur}
      onChange={(event) => draft.onChange(event.target.value)}
      onFocus={draft.onFocus}
      onKeyDown={(event) => draft.onTextareaKeyDown(event)}
    />
  );
}

export function isValidNumericDraft(
  value: string,
  is_valid_number: (value: number) => boolean,
): boolean {
  if (value.trim() === "") return false;
  const number = Number(value);
  return Number.isFinite(number) && is_valid_number(number);
}

export function isValidHexColor(value: string): boolean {
  return /^#[\da-f]{6}$/i.test(value);
}

export function shouldPublishDraft(
  value: string,
  is_valid: (value: string) => boolean,
): boolean {
  return is_valid(value);
}

export function getDraftCommitValue(
  draft: string,
  persisted: string,
  is_valid: (value: string) => boolean,
): string | null {
  if (!is_valid(draft) || draft === persisted) return null;
  return draft;
}

export function getNativeColorBlurCommitValue(
  value: string,
  latest_accepted_or_scheduled: string,
): string | null {
  return value === latest_accepted_or_scheduled ? null : value;
}

export function getSyncedDraftValue(
  is_focused: boolean,
  persisted: string,
): string | null {
  return is_focused ? null : persisted;
}

function useInspectorDraft(
  value: DraftValue,
  is_valid_prop: ((value: string) => boolean) | undefined,
  on_commit: (value: string) => void,
  on_draft_change: ((value: string) => void) | undefined,
) {
  const persisted = String(value);
  const [draft, set_draft] = useState(persisted);
  const is_focused_ref = useRef(false);
  const last_committed_ref = useRef<string | null>(null);
  const skip_commit_on_blur_ref = useRef(false);
  const is_valid = is_valid_prop ?? (() => true);

  useEffect(() => {
    const synced = getSyncedDraftValue(is_focused_ref.current, persisted);
    if (synced !== null) set_draft(synced);
  }, [persisted]);

  function restore() {
    last_committed_ref.current = null;
    set_draft(persisted);
  }

  function commit() {
    const next = getDraftCommitValue(draft, persisted, is_valid);
    if (next === null) {
      if (!is_valid(draft)) restore();
      return;
    }
    if (last_committed_ref.current === next) return;
    last_committed_ref.current = next;
    on_commit(next);
  }

  return {
    value: draft,
    onChange(next: string) {
      last_committed_ref.current = null;
      skip_commit_on_blur_ref.current = false;
      set_draft(next);
      if (shouldPublishDraft(next, is_valid)) on_draft_change?.(next);
    },
    onFocus() {
      is_focused_ref.current = true;
    },
    onBlur() {
      is_focused_ref.current = false;
      if (skip_commit_on_blur_ref.current) {
        skip_commit_on_blur_ref.current = false;
        return;
      }
      commit();
    },
    onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Escape") {
        event.preventDefault();
        skip_commit_on_blur_ref.current = true;
        restore();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    },
    onTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key === "Escape") {
        event.preventDefault();
        skip_commit_on_blur_ref.current = true;
        restore();
        return;
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        commit();
      }
    },
  };
}
