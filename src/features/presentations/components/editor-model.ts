import type {
  ShapeType,
  SlideBackground,
} from "@/features/presentations/core/presentation-core";

export type EditorSlide = {
  readonly id: string;
  readonly number: number;
  readonly ariaLabel: string;
  readonly backgroundStyle: string;
  readonly background: SlideBackground;
  readonly transitionLabel: string;
  readonly transitionType: "none" | "fade" | "slide" | "scale";
  readonly transitionDuration: number;
  readonly elements: readonly EditorElement[];
};

export type EditorTextStyle = {
  readonly role: "H1" | "H2" | "H3" | "Paragraph";
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly color: string;
  readonly alignment: string;
};

export type EditorTextElement = {
  readonly id: string;
  readonly type: "text";
  readonly content: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly opacity: number;
  readonly rotation: number;
  readonly style: EditorTextStyle;
};

export type EditorImageElement = {
  readonly id: string;
  readonly type: "image";
  readonly assetId: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly opacity: number;
  readonly rotation: number;
  readonly style: { readonly objectFit: string; readonly borderRadius: number };
  readonly animations: readonly EditorAnimation[];
};

export type EditorShapeElement = {
  readonly id: string;
  readonly type: "shape";
  readonly shapeType: ShapeType;
  readonly position: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly opacity: number;
  readonly rotation: number;
  readonly style: {
    readonly fill: string;
    readonly border: string;
    readonly borderWidth: number;
    readonly radius: number;
  };
  readonly animations: readonly EditorAnimation[];
};

export type EditorAnimation = {
  readonly type: string;
  readonly duration: number;
};
export type EditorElement =
  | EditorTextElement
  | EditorImageElement
  | EditorShapeElement;

export type EditorSelection =
  | { readonly kind: "none" }
  | { readonly kind: "text"; readonly elementId: string }
  | { readonly kind: "image"; readonly elementId: string }
  | { readonly kind: "shape"; readonly elementId: string }
  | {
      readonly kind: "multiple";
      readonly elementIds: readonly string[];
      readonly primaryElementId: string;
    };
