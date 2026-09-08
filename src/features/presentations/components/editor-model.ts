export type EditorSlide = {
  readonly id: string;
  readonly number: number;
  readonly ariaLabel: string;
  readonly backgroundStyle: string;
  readonly transitionLabel: string;
};

export type EditorSelection =
  | { readonly kind: "none" }
  | { readonly kind: "text" }
  | { readonly kind: "image" }
  | { readonly kind: "shape" };
