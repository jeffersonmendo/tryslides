"use client";

import { useTranslations } from "next-intl";
import { FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";

type InspectorOpacitySliderProps = {
  readonly id: string;
  readonly opacity: number | null;
  readonly onChange: (opacity: number) => void;
  readonly onCommit: (opacity: number) => void;
};

export function InspectorOpacitySlider({
  id,
  opacity,
  onChange,
  onCommit,
}: InspectorOpacitySliderProps) {
  const t = useTranslations("Editor");
  const percentage = opacity === null ? null : toOpacityPercentage(opacity);
  const label_id = `${id}-label`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id={label_id}>{t("opacity")}</FieldLabel>
        <output aria-live="polite" className="text-sm text-muted-foreground">
          {formatOpacityPercentage(percentage)}
        </output>
      </div>
      <Slider
        max={100}
        min={0}
        step={1}
        thumbAriaLabelledby={label_id}
        value={[percentage ?? 100]}
        onValueChange={(value) => {
          onChange(toStoredOpacity(getSliderValue(value)));
        }}
        onValueCommitted={(value) => {
          onCommit(toStoredOpacity(getSliderValue(value)));
        }}
      />
    </div>
  );
}

export function formatOpacityPercentage(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function getSliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : (value[0] ?? 0);
}

function toOpacityPercentage(opacity: number): number {
  return Math.round(opacity * 100);
}

function toStoredOpacity(percentage: number): number {
  return percentage / 100;
}
