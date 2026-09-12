"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SlideBackground,
  TransitionType,
} from "@/features/presentations/core/presentation-core";
import { TRANSITION_CAPABILITIES } from "@/features/presentations/core/presentation-core";
import {
  InspectorColorField,
  InspectorNumericField,
} from "./inspector-controls";
import { InspectorDraftInput } from "./inspector-draft-input";
import type { EditorSlide } from "./lib/editor-model";

type SlideInspectorProps = {
  readonly slide: EditorSlide;
  readonly acceptedColor: string;
  readonly onBackgroundChange: (background: SlideBackground) => void;
  readonly onBackgroundCommit: (background: SlideBackground) => void;
  readonly onTransitionChange: (
    type: TransitionType,
    duration?: number,
  ) => void;
  readonly onTransitionCommit: (
    type: TransitionType,
    duration?: number,
  ) => void;
  readonly onDuplicateSlide: () => void;
  readonly onDeleteSlide: () => void;
};

export function SlideInspector({
  slide,
  acceptedColor,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
  onDuplicateSlide: on_duplicate_slide,
  onDeleteSlide: on_delete_slide,
}: SlideInspectorProps) {
  const t = useTranslations("Editor");
  const labels = getSlideInspectorLabels(t);
  return (
    <FieldGroup>
      {slide.background.type === "solid" ? (
        <ColorField
          id={`slide-background-${slide.id}`}
          label={labels.slideBackground}
          value={slide.background.color}
          acceptedValue={acceptedColor}
          onChange={(color) => onBackgroundChange({ type: "solid", color })}
          onCommit={(color) => onBackgroundCommit({ type: "solid", color })}
        />
      ) : (
        <Field>
          <FieldLabel htmlFor={`slide-background-${slide.id}`}>
            {labels.slideBackground}
          </FieldLabel>
          <InspectorDraftInput
            id={`slide-background-${slide.id}`}
            value={slide.background.gradient}
            isValid={isNonBlank}
            onCommit={(gradient) =>
              onBackgroundCommit({
                type: "gradient",
                gradient,
              })
            }
            onDraftChange={(gradient) =>
              onBackgroundChange({ type: "gradient", gradient })
            }
          />
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor={`slide-transition-${slide.id}`}>
          {labels.slideTransition}
        </FieldLabel>
        <Select
          value={slide.transitionType}
          onValueChange={(value) => {
            if (value !== null && isTransitionType(value)) {
              onTransitionCommit(value);
            }
          }}
        >
          <SelectTrigger id={`slide-transition-${slide.id}`}>
            <SelectValue>
              {getTransitionLabel(slide.transitionType, labels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {TRANSITION_CAPABILITIES.map((capability) => (
                <SelectItem key={capability.id} value={capability.id}>
                  {getTransitionLabel(capability.id, labels)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {slide.transitionType === "none" ? null : (
        <Field>
          <FieldLabel htmlFor={`slide-transition-duration-${slide.id}`}>
            {labels.transitionDuration}
          </FieldLabel>
          <InspectorNumericField
            id={`slide-transition-duration-${slide.id}`}
            min={1}
            value={slide.transitionDuration}
            isValid={(value) => value >= 1}
            onCommit={(value) =>
              onTransitionCommit(slide.transitionType, value)
            }
            onChange={(value) =>
              onTransitionChange(slide.transitionType, value)
            }
          />
        </Field>
      )}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant="secondary"
          onClick={on_duplicate_slide}
        >
          {labels.duplicateSlide}
        </Button>
        <Button
          className="flex-1"
          variant="destructive"
          onClick={on_delete_slide}
        >
          {labels.deleteSlide}
        </Button>
      </div>
    </FieldGroup>
  );
}

function ColorField({
  id,
  label,
  value,
  acceptedValue,
  onChange,
  onCommit,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly acceptedValue: string;
  readonly onChange: (value: string) => void;
  readonly onCommit: (value: string) => void;
}) {
  return (
    <InspectorColorField
      {...{ id, label, value, acceptedValue, onChange, onCommit }}
    />
  );
}

function isNonBlank(value: string): boolean {
  return value.trim().length > 0;
}

function isTransitionType(value: string): value is TransitionType {
  return TRANSITION_CAPABILITIES.some((capability) => capability.id === value);
}

function getTransitionLabel(
  type: TransitionType,
  labels: Record<string, string>,
): string {
  switch (type) {
    case "none":
      return labels.transitionNone;
    case "fade":
      return labels.transitionFade;
    case "slide":
      return labels.transitionSlide;
    case "scale":
      return labels.transitionScale;
  }
}

function getSlideInspectorLabels(t: ReturnType<typeof useTranslations>) {
  return Object.fromEntries(
    [
      "slideBackground",
      "slideTransition",
      "transitionDuration",
      "transitionFade",
      "transitionNone",
      "transitionScale",
      "transitionSlide",
      "deleteSlide",
      "duplicateSlide",
    ].map((key) => [key, t(key as never)]),
  );
}
