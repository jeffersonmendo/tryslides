import type { ComponentPropsWithRef, ReactNode } from "react";
import type { EditorElement, EditorSlide } from "./editor-model";

type SlideVisualContentProps = {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly slide: EditorSlide;
  readonly imageUrls: Readonly<Record<string, string>>;
  readonly imageUnavailableLabel: string;
  readonly children?: ReactNode;
  readonly planeProps?: Omit<
    ComponentPropsWithRef<"div">,
    "children" | "className" | "style"
  > & { readonly "data-editor-canvas"?: boolean };
  readonly renderElement?: (element: EditorElement) => ReactNode;
};

export function SlideVisualContent({
  canvas,
  slide,
  imageUrls,
  imageUnavailableLabel,
  planeProps,
  renderElement,
  children,
}: SlideVisualContentProps) {
  return (
    <div
      data-slide-visual-content
      className="relative size-full origin-center @container"
      style={{ background: slide.backgroundStyle }}
      {...planeProps}
    >
      {slide.elements.map((element) => (
        <div key={element.id}>
          {renderElement?.(element) ?? (
            <SlideVisualElement
              canvas={canvas}
              element={element}
              imageUnavailableLabel={imageUnavailableLabel}
              imageUrl={
                element.type === "image"
                  ? (imageUrls[element.assetId] ?? null)
                  : null
              }
            />
          )}
        </div>
      ))}
      {children}
    </div>
  );
}

export function SlideVisualElement({
  canvas,
  element,
  imageUrl,
  imageUnavailableLabel,
}: {
  readonly canvas: { readonly width: number; readonly height: number };
  readonly element: EditorElement;
  readonly imageUrl: string | null;
  readonly imageUnavailableLabel: string;
}) {
  return (
    <div
      className="absolute"
      style={{
        height: `${(element.size.height / canvas.height) * 100}%`,
        left: `${(element.position.x / canvas.width) * 100}%`,
        top: `${(element.position.y / canvas.height) * 100}%`,
        width: `${(element.size.width / canvas.width) * 100}%`,
      }}
    >
      <div className="absolute inset-0" style={{ opacity: element.opacity }}>
        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${element.rotation}deg)`,
            transformOrigin: "center",
          }}
        >
          <SlideElementContent
            canvas={canvas}
            element={element}
            imageUnavailableLabel={imageUnavailableLabel}
            imageUrl={imageUrl}
          />
        </div>
      </div>
    </div>
  );
}

export function SlideElementContent({
  canvas,
  element,
  imageUrl,
  imageUnavailableLabel,
}: {
  readonly canvas: { readonly width: number };
  readonly element: EditorElement;
  readonly imageUrl: string | null;
  readonly imageUnavailableLabel: string;
}) {
  if (element.type === "text")
    return (
      <span
        className="block size-full overflow-visible whitespace-pre-wrap"
        style={{
          color: element.style.color,
          fontFamily: "Arial, sans-serif",
          fontSize: `${(element.style.fontSize / canvas.width) * 100}cqw`,
          fontWeight: element.style.fontWeight,
          textAlign: element.style.alignment as "left" | "center" | "right",
        }}
      >
        {element.content}
      </span>
    );
  if (element.type === "image")
    return imageUrl === null ? (
      <span className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
        {imageUnavailableLabel}
      </span>
    ) : (
      // biome-ignore lint/performance/noImgElement: Local object URLs cannot be optimized by Next.js.
      <img
        alt=""
        className="size-full"
        src={imageUrl}
        style={{
          borderRadius: element.style.borderRadius,
          objectFit: element.style.objectFit as "cover" | "contain",
        }}
      />
    );
  if (element.shapeType === "line")
    return (
      <span
        className="absolute left-0 right-0 block"
        style={{
          borderTop: `${Math.max(1, element.style.borderWidth)}px solid ${element.style.fill}`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    );
  return (
    <span
      className="block size-full"
      style={{
        background: element.style.fill,
        border: `${element.style.borderWidth}px solid ${element.style.border}`,
        borderRadius:
          element.shapeType === "circle" ? "9999px" : element.style.radius,
      }}
    />
  );
}
