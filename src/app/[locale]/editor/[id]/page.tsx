import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { EditorEntry } from "@/features/presentations/components/editor-entry";
import { isValidPresentationId } from "@/features/presentations/core/presentation-core";
import { routing } from "@/i18n/routing";

type EditorPageProps = {
  readonly params: Promise<{ readonly id: string; readonly locale: string }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { id, locale } = await params;

  if (!hasLocale(routing.locales, locale) || !isValidPresentationId(id)) {
    notFound();
  }

  setRequestLocale(locale);
  return <EditorEntry presentationId={id} />;
}
