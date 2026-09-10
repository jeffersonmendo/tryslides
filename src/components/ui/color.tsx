"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  ColorArea as AriaColorArea,
  type ColorAreaProps as AriaColorAreaProps,
  ColorField as AriaColorField,
  ColorPicker as AriaColorPicker,
  ColorSlider as AriaColorSlider,
  ColorSwatch as AriaColorSwatch,
  ColorSwatchPicker as AriaColorSwatchPicker,
  ColorSwatchPickerItem as AriaColorSwatchPickerItem,
  type ColorSwatchPickerItemProps as AriaColorSwatchPickerItemProps,
  type ColorSwatchPickerProps as AriaColorSwatchPickerProps,
  type ColorSwatchProps as AriaColorSwatchProps,
  ColorThumb as AriaColorThumb,
  type ColorThumbProps as AriaColorThumbProps,
  ColorWheel as AriaColorWheel,
  type ColorWheelProps as AriaColorWheelProps,
  ColorWheelTrack as AriaColorWheelTrack,
  Input as AriaInput,
  SliderOutput as AriaSliderOutput,
  SliderTrack as AriaSliderTrack,
  type SliderTrackProps as AriaSliderTrackProps,
  composeRenderProps,
  Dialog,
  DialogTrigger,
  Popover,
  parseColor,
} from "react-aria-components";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const ColorSlider = AriaColorSlider;

const ColorField = AriaColorField;

const ColorWheelTrack = AriaColorWheelTrack;

const ColorPicker = AriaColorPicker;

const SliderOutput = AriaSliderOutput;

interface ColorWheelProps extends Omit<
  AriaColorWheelProps,
  "outerRadius" | "innerRadius"
> {
  outerRadius?: number;
  innerRadius?: number;
}

function ColorWheel({
  className,
  outerRadius = 100,
  innerRadius = 74,
  ...props
}: ColorWheelProps) {
  return (
    <AriaColorWheel
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      className={composeRenderProps(className, (className) => cn(className))}
      {...props}
    />
  );
}

function ColorArea({ className, ...props }: AriaColorAreaProps) {
  return (
    <AriaColorArea
      className={composeRenderProps(className, (className) =>
        cn(
          "size-48 shrink-0 rounded-md border border-border shadow-md",
          className,
        ),
      )}
      {...props}
    />
  );
}

function SliderTrack({ className, ...props }: AriaSliderTrackProps) {
  return (
    <AriaSliderTrack
      className={composeRenderProps(className, (className) =>
        cn("h-7 w-48 rounded-md border border-border ", className),
      )}
      {...props}
    />
  );
}

function ColorThumb({ className, ...props }: AriaColorThumbProps) {
  return (
    <AriaColorThumb
      className={composeRenderProps(className, (className) =>
        cn(
          "z-10 box-border size-5 rounded-[50%] border-2 shadow-md",
          /* Focus Visible */
          "data-focus-visible:size-6",
          className,
        ),
      )}
      {...props}
    />
  );
}

function ColorSwatchPicker({
  className,
  ...props
}: AriaColorSwatchPickerProps) {
  return (
    <AriaColorSwatchPicker
      className={composeRenderProps(className, (className) =>
        cn("flex flex-wrap gap-2", className),
      )}
      {...props}
    />
  );
}

function ColorSwatchPickerItem({
  className,
  ...props
}: AriaColorSwatchPickerItemProps) {
  return (
    <AriaColorSwatchPickerItem
      className={composeRenderProps(className, (className) =>
        cn(
          "size-8 overflow-hidden rounded-md border-2 ring-offset-background transition-colors",
          /* Selected */
          "data-selected:border-white",
          /* Disabled */
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          /* Focus Visible */
          "data-focus-visible:outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring",
          className,
        ),
      )}
      {...props}
    />
  );
}

function ColorSwatch({ className, ...props }: AriaColorSwatchProps) {
  return (
    <AriaColorSwatch
      className={composeRenderProps(className, (className) =>
        cn("size-8", className),
      )}
      {...props}
    />
  );
}

type ColorControlProps = {
  readonly acceptedValue: string;
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onCommit: (value: string) => void;
};

function ColorControl({
  acceptedValue,
  id,
  label,
  value,
  onChange,
  onCommit,
}: ColorControlProps) {
  const normalized_value = normalizeColor(value) ?? "#000000";
  const normalized_accepted_value =
    normalizeColor(acceptedValue) ?? normalized_value;
  const [draft, setDraft] = useState(normalized_value);
  const is_focused_ref = useRef(false);
  const latest_accepted_value_ref = useRef(normalized_accepted_value);
  const latest_draft_ref = useRef(normalized_value);

  useEffect(() => {
    latest_accepted_value_ref.current = normalized_accepted_value;
  }, [normalized_accepted_value]);

  useEffect(() => {
    if (!is_focused_ref.current) {
      latest_draft_ref.current = normalized_value;
      setDraft(normalized_value);
    }
  }, [normalized_value]);

  function preview(next: string) {
    const normalized = normalizeColor(next);
    if (normalized === null) return;
    latest_draft_ref.current = normalized;
    setDraft(normalized);
    onChange(normalized);
  }

  function commit(next: string) {
    const normalized = normalizeColor(next);
    if (
      normalized === null ||
      normalized === latest_accepted_value_ref.current
    ) {
      return;
    }
    onCommit(normalized);
  }

  return (
    <ColorPicker
      value={parseColor(normalized_value)}
      onChange={(color) => preview(color.toString("hex"))}
    >
      <InputGroup>
        <InputGroupInput
          id={id}
          aria-label={label}
          value={draft}
          onBlur={() => {
            is_focused_ref.current = false;
            commit(draft);
          }}
          onChange={(event) => {
            const next = event.target.value;
            latest_draft_ref.current = next;
            setDraft(next);
            preview(next);
          }}
          onFocus={() => {
            is_focused_ref.current = true;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              latest_draft_ref.current = normalized_value;
              setDraft(normalized_value);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <DialogTrigger>
            <AriaButton
              aria-label={label}
              data-slot="input-group-control"
              className="relative flex size-6 items-center justify-center overflow-hidden rounded-md border border-border focus-visible:outline-none"
            >
              <ColorSwatch className="size-full" />
            </AriaButton>
            <Popover className="z-50 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none">
              <Dialog
                aria-label={label}
                className="flex flex-col gap-3 outline-none"
              >
                <ColorArea
                  colorSpace="hsb"
                  xChannel="saturation"
                  yChannel="brightness"
                  onChangeEnd={(color) => commit(color.toString("hex"))}
                >
                  <ColorThumb />
                </ColorArea>
                <ColorSlider
                  colorSpace="hsb"
                  channel="hue"
                  onChangeEnd={(color) => commit(color.toString("hex"))}
                >
                  <SliderTrack>
                    <ColorThumb />
                  </SliderTrack>
                </ColorSlider>
                <ColorField aria-label={label}>
                  <AriaInput
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onBlur={() => commit(latest_draft_ref.current)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commit(latest_draft_ref.current);
                      }
                    }}
                  />
                </ColorField>
              </Dialog>
            </Popover>
          </DialogTrigger>
        </InputGroupAddon>
      </InputGroup>
    </ColorPicker>
  );
}

function normalizeColor(value: string): string | null {
  return /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : null;
}

export type { ColorWheelProps };
export {
  ColorArea,
  ColorControl,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  ColorWheel,
  ColorWheelTrack,
  SliderOutput,
  SliderTrack,
};
