import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Home" });
  const next_locale =
    routing.locales.find((candidate) => candidate !== locale) ??
    routing.defaultLocale;

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div className="flex max-w-xl flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {t("title")}
        </h1>
        <p className="text-balance text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href="https://github.com/jefferson-lopez/starnext"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          {t("view_on_github")}
        </a>
        <Link
          href="/"
          locale={next_locale}
          className={buttonVariants({ variant: "secondary" })}
        >
          {t("switch_locale")}
        </Link>
      </div>
    </main>
  );
}
