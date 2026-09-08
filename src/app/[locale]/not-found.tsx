import { useTranslations } from "next-intl";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFoundPage() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
