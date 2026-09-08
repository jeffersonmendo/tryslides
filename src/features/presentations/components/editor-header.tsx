import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

type EditorHeaderProps = {
  readonly title: string;
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly isPending: boolean;
  readonly persistenceError: string | null;
  readonly redoLabel: string;
  readonly saveErrorLabel: string;
  readonly savedLabel: string;
  readonly savingLabel: string;
  readonly undoLabel: string;
  readonly onRedo: () => void;
  readonly onUndo: () => void;
};

export function EditorHeader({
  title,
  canRedo,
  canUndo,
  isPending,
  persistenceError,
  redoLabel,
  saveErrorLabel,
  savedLabel,
  savingLabel,
  undoLabel,
  onRedo,
  onUndo,
}: EditorHeaderProps) {
  const save_state = persistenceError ?? (isPending ? savingLabel : savedLabel);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <h1 className="truncate font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button
          aria-label={undoLabel}
          disabled={!canUndo}
          size="icon-sm"
          variant="ghost"
          onClick={onUndo}
        >
          <IconArrowBackUp data-icon="inline-start" />
        </Button>
        <Button
          aria-label={redoLabel}
          disabled={!canRedo}
          size="icon-sm"
          variant="ghost"
          onClick={onRedo}
        >
          <IconArrowForwardUp data-icon="inline-start" />
        </Button>
        <p
          aria-live="polite"
          className={
            persistenceError === null
              ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
        >
          {persistenceError === null
            ? save_state
            : `${saveErrorLabel}: ${save_state}`}
        </p>
      </div>
    </header>
  );
}
