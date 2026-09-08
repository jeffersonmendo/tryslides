import { IconPresentation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export type PresentationListItem = {
  readonly id: string;
  readonly title: string;
  readonly statusLabel: string;
  readonly coverStyle: string | undefined;
};

type PresentationListProps = {
  readonly items: readonly PresentationListItem[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly createLabel: string;
  readonly openLabel: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly onCreate: () => void;
  readonly onOpen: (presentation_id: string) => void;
};

export function PresentationList({
  items,
  isLoading,
  errorMessage,
  createLabel,
  openLabel,
  emptyTitle,
  emptyDescription,
  onCreate,
  onOpen,
}: PresentationListProps) {
  if (isLoading) return <PresentationListSkeleton />;

  if (errorMessage !== null)
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage}
      </p>
    );

  if (items.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPresentation />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreate}>{createLabel}</Button>
        </EmptyContent>
      </Empty>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <div
            aria-hidden
            className="h-28 bg-muted"
            style={
              item.coverStyle === undefined
                ? undefined
                : { background: item.coverStyle }
            }
          />
          <CardHeader>
            <CardTitle className="truncate">{item.title}</CardTitle>
            <CardDescription>{item.statusLabel}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1" />
          <CardFooter>
            <Button variant="outline" onClick={() => onOpen(item.id)}>
              {openLabel}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function PresentationListSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {["first", "second", "third"].map((key) => (
        <Card key={key}>
          <Skeleton className="h-28 rounded-none" />
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardFooter>
            <Skeleton className="h-9 w-20" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
