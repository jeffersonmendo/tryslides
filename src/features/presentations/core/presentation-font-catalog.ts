export type PresentationFontAsset = {
  readonly path: string;
  readonly format: "woff2" | "truetype";
  readonly weight: string;
  readonly style: "normal";
};

export type PresentationFontDefinition = {
  readonly id: string;
  readonly labelKey: string;
  readonly cssFamilyStack: string;
  readonly assets: readonly PresentationFontAsset[];
  readonly license: {
    readonly name: "SIL Open Font License 1.1";
    readonly noticePath: string;
    readonly sourceUrl: string;
  };
};

export const PRESENTATION_FONT_CATALOG = [
  {
    id: "Geist",
    labelKey: "fontGeist",
    cssFamilyStack: '"Geist", sans-serif',
    assets: [
      {
        path: "/fonts/Geist/variable/Geist-Variable.woff2",
        format: "woff2",
        weight: "100 900",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/Geist/NOTICE",
      sourceUrl: "https://github.com/vercel/geist-font",
    },
  },
  {
    id: "Geist Mono",
    labelKey: "fontGeistMono",
    cssFamilyStack: '"Geist Mono", monospace',
    assets: [
      {
        path: "/fonts/GeistMono/variable/GeistMono-Variable.woff2",
        format: "woff2",
        weight: "100 900",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/GeistMono/NOTICE",
      sourceUrl: "https://github.com/vercel/geist-font",
    },
  },
  {
    id: "Geist Pixel",
    labelKey: "fontGeistPixel",
    cssFamilyStack: '"Geist Pixel", monospace',
    assets: [
      {
        path: "/fonts/GeistPixel/variable/GeistPixel[ELSH].ttf",
        format: "truetype",
        weight: "400",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/GeistPixel/NOTICE",
      sourceUrl: "https://github.com/vercel/geist-font",
    },
  },
  {
    id: "Inter",
    labelKey: "fontInter",
    cssFamilyStack: '"Inter", sans-serif',
    assets: [
      {
        path: "/fonts/Inter/Inter-Variable-Latin.woff2",
        format: "woff2",
        weight: "100 900",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/Inter/NOTICE",
      sourceUrl: "https://fonts.google.com/specimen/Inter",
    },
  },
  {
    id: "Montserrat",
    labelKey: "fontMontserrat",
    cssFamilyStack: '"Montserrat", sans-serif',
    assets: [
      {
        path: "/fonts/Montserrat/Montserrat-Variable-Latin.woff2",
        format: "woff2",
        weight: "100 900",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/Montserrat/NOTICE",
      sourceUrl: "https://fonts.google.com/specimen/Montserrat",
    },
  },
  {
    id: "Playfair Display",
    labelKey: "fontPlayfairDisplay",
    cssFamilyStack: '"Playfair Display", serif',
    assets: [
      {
        path: "/fonts/PlayfairDisplay/PlayfairDisplay-Variable-Latin.woff2",
        format: "woff2",
        weight: "400 900",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/PlayfairDisplay/NOTICE",
      sourceUrl: "https://fonts.google.com/specimen/Playfair+Display",
    },
  },
  {
    id: "Lora",
    labelKey: "fontLora",
    cssFamilyStack: '"Lora", serif',
    assets: [
      {
        path: "/fonts/Lora/Lora-Variable-Latin.woff2",
        format: "woff2",
        weight: "400 700",
        style: "normal",
      },
    ],
    license: {
      name: "SIL Open Font License 1.1",
      noticePath: "/fonts/Lora/NOTICE",
      sourceUrl: "https://fonts.google.com/specimen/Lora",
    },
  },
] as const satisfies readonly PresentationFontDefinition[];

export type PresentationFontId =
  (typeof PRESENTATION_FONT_CATALOG)[number]["id"];

export const PRESENTATION_FONT_IDS = PRESENTATION_FONT_CATALOG.map(
  (font) => font.id,
) as readonly PresentationFontId[];

export function getPresentationFontDefinition(
  value: unknown,
): PresentationFontDefinition | null {
  return PRESENTATION_FONT_CATALOG.find((font) => font.id === value) ?? null;
}

export function getPresentationFontStack(font_id: PresentationFontId): string {
  return (
    getPresentationFontDefinition(font_id)?.cssFamilyStack ??
    PRESENTATION_FONT_CATALOG[0].cssFamilyStack
  );
}
