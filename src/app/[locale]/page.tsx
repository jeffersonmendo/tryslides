import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { PresentationListEntry } from "@/features/presentations/components/presentation-list-entry";
import { routing } from "@/i18n/routing";

type Props = Readonly<{
  params: Promise<{ readonly locale: string }>;
}>;

export default async function Home({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <PresentationListEntry />;
}
