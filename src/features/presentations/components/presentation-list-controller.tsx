"use client";

import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PresentationListCapability } from "@/features/presentations/application/presentation-list-capability";
import type { PresentationCard } from "@/features/presentations/application/presentation-repository";
import { useRouter } from "@/i18n/navigation";
import { PresentationCreateDialog } from "./presentation-create-dialog";
import {
  PresentationList,
  type PresentationListItem,
} from "./presentation-list";

type PresentationListControllerProps = {
  readonly capability: PresentationListCapability;
};

export function PresentationListController({
  capability,
}: PresentationListControllerProps) {
  const t = useTranslations("Presentations");
  const router = useRouter();
  const [items, set_items] = useState<readonly PresentationListItem[]>([]);
  const [is_loading, set_is_loading] = useState(true);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [is_dialog_open, set_is_dialog_open] = useState(false);
  const [title, set_title] = useState("");
  const [title_error, set_title_error] = useState<string | null>(null);
  const [create_error, set_create_error] = useState<string | null>(null);
  const [is_creating, set_is_creating] = useState(false);

  useEffect(() => {
    let is_active = true;

    async function loadPresentations() {
      try {
        const cards = await capability.listPresentations();
        if (is_active)
          set_items(
            cards.map((card) => toPresentationListItem(card, t(card.status))),
          );
      } catch {
        if (is_active) set_load_error(t("loadError"));
      } finally {
        if (is_active) set_is_loading(false);
      }
    }

    void loadPresentations();

    return () => {
      is_active = false;
    };
  }, [capability, t]);

  function handleDialogOpenChange(is_open: boolean) {
    if (!is_open && is_creating) return;
    set_is_dialog_open(is_open);
    if (!is_open) {
      set_title("");
      set_title_error(null);
      set_create_error(null);
    }
  }

  function handleTitleChange(next_title: string) {
    set_title(next_title);
    set_title_error(null);
  }

  async function createPresentation() {
    const normalized_title = title.trim();
    if (normalized_title.length === 0) {
      set_title_error(t("titleRequired"));
      return;
    }

    set_is_creating(true);
    set_create_error(null);
    const result = await capability.createPresentation({
      title: normalized_title,
    });
    set_is_creating(false);

    if (!result.success) {
      set_create_error(t("createError"));
      return;
    }

    router.push(`/editor/${result.state.id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          disabled={is_loading}
          onClick={() => handleDialogOpenChange(true)}
        >
          <IconPlus data-icon="inline-start" />
          {t("create")}
        </Button>
      </header>
      <PresentationList
        items={items}
        isLoading={is_loading}
        errorMessage={load_error}
        createLabel={t("create")}
        openLabel={t("open")}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        onCreate={() => handleDialogOpenChange(true)}
        onOpen={(presentation_id) => router.push(`/editor/${presentation_id}`)}
      />
      <PresentationCreateDialog
        isOpen={is_dialog_open}
        isPending={is_creating}
        title={title}
        titleError={title_error}
        errorMessage={create_error}
        labels={{
          title: t("createTitle"),
          description: t("createDescription"),
          titleLabel: t("titleLabel"),
          cancel: t("cancel"),
          create: t("create"),
          creating: t("creating"),
          close: t("close"),
        }}
        onOpenChange={handleDialogOpenChange}
        onTitleChange={handleTitleChange}
        onSubmit={createPresentation}
      />
    </main>
  );
}

function toPresentationListItem(
  card: PresentationCard,
  status_label: string,
): PresentationListItem {
  return {
    id: card.id,
    title: card.title,
    statusLabel: status_label,
    coverStyle:
      card.coverBackground === null
        ? undefined
        : card.coverBackground.type === "solid"
          ? card.coverBackground.color
          : card.coverBackground.gradient,
  };
}
