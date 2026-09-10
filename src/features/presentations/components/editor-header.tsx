import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconPhoto,
  IconShape,
  IconTypography,
} from "@tabler/icons-react";
import { type ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";

type EditorHeaderProps = {
  readonly title: string;
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly isPending: boolean;
  readonly imageError: string | null;
  readonly persistenceError: string | null;
  readonly addImageLabel: string;
  readonly addShapeLabel: string;
  readonly addTextLabel: string;
  readonly redoLabel: string;
  readonly saveErrorLabel: string;
  readonly savedLabel: string;
  readonly savingLabel: string;
  readonly undoLabel: string;
  readonly onRedo: () => void;
  readonly onRetryPersistence: () => void;
  readonly onCreateShape: (shape_type: "rectangle" | "circle" | "line") => void;
  readonly onCreateText: () => void;
  readonly onUploadImages: (files: readonly File[]) => void;
  readonly onUndo: () => void;
};

export function EditorHeader({
  title,
  canRedo,
  canUndo,
  isPending,
  imageError,
  persistenceError,
  addImageLabel,
  addShapeLabel,
  addTextLabel,
  redoLabel,
  saveErrorLabel,
  savedLabel,
  savingLabel,
  undoLabel,
  onRedo,
  onRetryPersistence,
  onCreateShape,
  onCreateText,
  onUploadImages,
  onUndo,
}: EditorHeaderProps) {
  const image_input_ref = useRef<HTMLInputElement>(null);
  const save_state = persistenceError ?? (isPending ? savingLabel : savedLabel);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const image_files = Array.from(event.target.files ?? []);
    if (image_files.length > 0) onUploadImages(image_files);
    event.target.value = "";
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <h1 className="truncate font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={onCreateText}
        >
          <IconTypography data-icon="inline-start" />
          {addTextLabel}
        </Button>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onCreateShape("rectangle")}
        >
          <IconShape data-icon="inline-start" />
          {addShapeLabel}
        </Button>
        <input
          ref={image_input_ref}
          accept="image/*"
          className="sr-only"
          multiple
          type="file"
          onChange={handleImageChange}
        />
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() => image_input_ref.current?.click()}
        >
          <IconPhoto data-icon="inline-start" />
          {addImageLabel}
        </Button>
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
        {persistenceError === null ? (
          <p
            aria-live="polite"
            className={
              imageError === null
                ? "text-xs text-muted-foreground"
                : "text-xs text-destructive"
            }
          >
            {imageError ?? save_state}
          </p>
        ) : (
          <Button
            className="h-auto px-0 text-xs text-destructive"
            size="sm"
            type="button"
            variant="link"
            onClick={onRetryPersistence}
          >
            {saveErrorLabel}: {persistenceError}
          </Button>
        )}
      </div>
    </header>
  );
}
