import type { EditorSelection, EditorSlide } from "./editor-model";

type PropertiesSidebarProps = {
  readonly activeSlide: EditorSlide | null;
  readonly selection: EditorSelection;
  readonly labels: {
    readonly futureImageInspector: string;
    readonly futureShapeInspector: string;
    readonly futureTextInspector: string;
    readonly noSelection: string;
    readonly properties: string;
    readonly slideBackground: string;
    readonly slideTransition: string;
  };
};

export function PropertiesSidebar({
  activeSlide,
  labels,
  selection,
}: PropertiesSidebarProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h2 className="text-sm font-medium">{labels.properties}</h2>
      <section className="flex flex-col gap-2 text-sm">
        <h3 className="font-medium">
          {selection.kind === "none" ? labels.noSelection : labels.properties}
        </h3>
        {activeSlide === null ? null : (
          <dl className="flex flex-col gap-2 text-muted-foreground">
            <div>
              <dt className="sr-only">{labels.slideBackground}</dt>
              <dd>
                {labels.slideBackground}: {activeSlide.backgroundStyle}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{labels.slideTransition}</dt>
              <dd>
                {labels.slideTransition}: {activeSlide.transitionLabel}
              </dd>
            </div>
          </dl>
        )}
      </section>
      <section
        aria-label={labels.properties}
        className="mt-auto flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground"
      >
        <span>{labels.futureTextInspector}</span>
        <span>{labels.futureImageInspector}</span>
        <span>{labels.futureShapeInspector}</span>
      </section>
    </div>
  );
}
