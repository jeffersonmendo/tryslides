"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  getPresentationFontDefinition,
  getPresentationFontStack,
  isTextFontFamily,
  TEXT_FONT_FAMILIES,
  type TextFontFamily,
} from "@/features/presentations/core/presentation-core";

type FontFamilyComboboxProps = {
  readonly value: TextFontFamily | null;
  readonly onValueChange: (value: TextFontFamily) => void;
};

export function FontFamilyCombobox({
  value,
  onValueChange,
}: FontFamilyComboboxProps) {
  const id = useId();
  const t = useTranslations("Editor");

  return (
    <Field>
      <FieldLabel htmlFor={id}>{t("fontFamily")}</FieldLabel>
      <Combobox
        items={TEXT_FONT_FAMILIES}
        value={value}
        onValueChange={(next_value) => {
          if (isTextFontFamily(next_value)) onValueChange(next_value);
        }}
      >
        <ComboboxInput
          id={id}
          placeholder={value === null ? t("mixedValue") : t("searchFontFamily")}
        />
        <ComboboxContent>
          <ComboboxEmpty>{t("noFontFamiliesFound")}</ComboboxEmpty>
          <ComboboxList>
            {(font_family) => (
              <ComboboxItem key={font_family} value={font_family}>
                <span
                  style={{ fontFamily: getPresentationFontStack(font_family) }}
                >
                  {t(
                    getPresentationFontDefinition(font_family)?.labelKey ??
                      "fontGeist",
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
