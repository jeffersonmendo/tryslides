import type { ComponentPropsWithRef, ReactNode } from "react";
import type {
  EditorElement,
  EditorShapeElement,
  EditorSlide,
} from "./editor-model";

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
  return <ShapeVisual element={element} />;
}

function ShapeVisual({
  element,
}: {
  readonly element: Extract<EditorElement, { readonly type: "shape" }>;
}) {
  const shape_border_width = element.style.borderWidth;
  const line_stroke_width = Math.max(1, element.style.borderWidth);
  const shape_viewport_style = getShapeViewportStyle(
    element.shapeType,
    shape_border_width,
  );
  const shape_style = {
    fill: element.style.fill,
    stroke: element.style.border,
    strokeWidth: shape_border_width,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const line_style = {
    fill: "none",
    stroke: element.style.fill,
    strokeWidth: line_stroke_width,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <div className="relative size-full overflow-hidden">
      <svg
        aria-hidden="true"
        className="absolute"
        overflow="visible"
        preserveAspectRatio="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={shape_viewport_style}
        viewBox="0 0 24 24"
      >
        {getShapeMark(element, shape_style, line_style)}
      </svg>
    </div>
  );
}

export function getShapeViewportStyle(
  shape_type: EditorShapeElement["shapeType"],
  border_width: number,
) {
  if (isLineShape(shape_type)) {
    return { height: "100%", left: "0", top: "0", width: "100%" };
  }

  return {
    height: `calc(100% - ${border_width}px)`,
    left: `${border_width / 2}px`,
    top: `${border_width / 2}px`,
    width: `calc(100% - ${border_width}px)`,
  };
}

function isLineShape(shape_type: EditorShapeElement["shapeType"]): boolean {
  return [
    "line",
    "arrow",
    "double-arrow",
    "plus",
    "minus",
    "multiply",
    "divide",
    "equal",
    "not-equal",
  ].includes(shape_type);
}

function getShapeMark(
  element: Extract<EditorElement, { readonly type: "shape" }>,
  shape_style: {
    readonly fill: string;
    readonly stroke: string;
    readonly strokeWidth: number;
  },
  line_style: {
    readonly fill: string;
    readonly stroke: string;
    readonly strokeWidth: number;
  },
) {
  switch (element.shapeType) {
    case "rectangle":
      return (
        <rect
          height="24"
          rx={(element.style.radius / element.size.width) * 24}
          ry={(element.style.radius / element.size.height) * 24}
          {...shape_style}
          width="24"
          x="0"
          y="0"
        />
      );
    case "circle":
      return <ellipse cx="12" cy="12" rx="12" ry="12" {...shape_style} />;
    case "triangle":
      return <path d="M12 0l12 24h-24z" {...shape_style} />;
    case "diamond":
      return <path d="M12 0l12 12l-12 12l-12 -12z" {...shape_style} />;
    case "star":
      return (
        <path
          d="M12 0l3.23 8.31l8.77 .44l-6.83 5.52l2.39 8.73l-7.56 -4.9l-7.56 4.9l2.39 -8.73l-6.83 -5.52l8.77 -.44z"
          {...shape_style}
        />
      );
    case "heart":
      return (
        <path
          d="M12 24C10.3 22.5 0 14.4 0 7.2C0 3.2 3.1 0 7.1 0C9.3 0 11 1 12 2.6C13 1 14.7 0 16.9 0C20.9 0 24 3.2 24 7.2C24 14.4 13.7 22.5 12 24Z"
          {...shape_style}
        />
      );
    case "speech-bubble":
      return (
        <path
          d="M4 0H20A4 4 0 0 1 24 4V12A4 4 0 0 1 20 16H14.6C13.2 18.9 11.1 21.1 9.5 22.5C9 22.9 8.7 23.4 8.5 24C8 23.2 7.8 22.3 7.9 21.4C8.1 19.4 7.6 17.5 6.7 16H4A4 4 0 0 1 0 12V4A4 4 0 0 1 4 0Z"
          {...shape_style}
        />
      );
    case "round-bubble":
      return (
        <path
          d="M12 0C18.6 0 24 3.8 24 8.5C24 13.2 18.6 17 12 17C10.8 17 9.6 16.9 8.5 16.6C7.7 19.5 6.1 22.2 4.4 23.6C3.9 24 3.4 24 3 23.6C3.3 21.2 3.1 18.9 2.2 16.5C.8 14.8 0 11.8 0 8.5C0 3.8 5.4 0 12 0Z"
          {...shape_style}
        />
      );
    case "line":
      return <path d="M0 12h24" {...line_style} />;
    case "arrow":
      return (
        <>
          <path d="M0 12h24" {...line_style} />
          <path d="M22.7 10.3l1.3 1.7-1.3 1.7" {...line_style} />
        </>
      );
    case "double-arrow":
      return (
        <>
          <path d="M1.3 10.3L0 12l1.3 1.7" {...line_style} />
          <path d="M22.7 10.3L24 12l-1.3 1.7" {...line_style} />
          <path d="M0 12h24" {...line_style} />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 0v24" {...line_style} />
          <path d="M0 12h24" {...line_style} />
        </>
      );
    case "minus":
      return <path d="M0 12h24" {...line_style} />;
    case "multiply":
      return (
        <>
          <path d="M24 0l-24 24" {...line_style} />
          <path d="M0 0l24 24" {...line_style} />
        </>
      );
    case "divide":
      return (
        <>
          <circle cx="12" cy="7" r="1" fill={line_style.stroke} />
          <path d="M4 12h16" {...line_style} />
          <circle cx="12" cy="17" r="1" fill={line_style.stroke} />
        </>
      );
    case "equal":
      return (
        <>
          <path d="M0 8h24" {...line_style} />
          <path d="M0 16h24" {...line_style} />
        </>
      );
    case "not-equal":
      return (
        <>
          <path d="M0 8h24" {...line_style} />
          <path d="M0 16h24" {...line_style} />
          <path d="M0 24l24 -24" {...line_style} />
        </>
      );
  }
}
