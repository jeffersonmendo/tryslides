import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const TITLE_ERROR_ID = "presentation-title-error";

type PresentationCreateDialogProps = {
  readonly isOpen: boolean;
  readonly isPending: boolean;
  readonly title: string;
  readonly titleError: string | null;
  readonly errorMessage: string | null;
  readonly labels: {
    readonly title: string;
    readonly description: string;
    readonly titleLabel: string;
    readonly cancel: string;
    readonly create: string;
    readonly creating: string;
    readonly close: string;
  };
  readonly onOpenChange: (is_open: boolean) => void;
  readonly onTitleChange: (title: string) => void;
  readonly onSubmit: () => void;
};

export function PresentationCreateDialog({
  isOpen,
  isPending,
  title,
  titleError,
  errorMessage,
  labels,
  onOpenChange,
  onTitleChange,
  onSubmit,
}: PresentationCreateDialogProps) {
  const has_title_error = titleError !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={labels.close} showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <FieldGroup>
            <Field data-invalid={has_title_error}>
              <FieldLabel htmlFor="presentation-title">
                {labels.titleLabel}
              </FieldLabel>
              <Input
                id="presentation-title"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                disabled={isPending}
                aria-describedby={has_title_error ? TITLE_ERROR_ID : undefined}
                aria-invalid={has_title_error}
                autoFocus
              />
              {has_title_error ? (
                <FieldError id={TITLE_ERROR_ID}>{titleError}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {errorMessage === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {labels.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? labels.creating : labels.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
