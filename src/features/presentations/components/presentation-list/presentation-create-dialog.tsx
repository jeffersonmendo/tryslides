import { useTranslations } from "next-intl";
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
  readonly titleErrorCode: "TITLE_REQUIRED" | null;
  readonly errorCode: "CREATE_FAILED" | null;
  readonly onOpenChange: (is_open: boolean) => void;
  readonly onTitleChange: (title: string) => void;
  readonly onSubmit: () => void;
};

export function PresentationCreateDialog({
  isOpen,
  isPending,
  title,
  titleErrorCode,
  errorCode,
  onOpenChange,
  onTitleChange,
  onSubmit,
}: PresentationCreateDialogProps) {
  const t = useTranslations("Presentations");
  const has_title_error = titleErrorCode !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("close")} showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
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
                {t("titleLabel")}
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
                <FieldError id={TITLE_ERROR_ID}>
                  {t("titleRequired")}
                </FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {errorCode === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {t("createError")}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
