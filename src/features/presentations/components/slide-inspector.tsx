"use client";

import { ColorControl } from "@/components/ui/color";
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
import type { EditorSlide } from "./editor-model";
import {
  InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";

type SlideInspectorProps = {
  readonly slide: EditorSlide;
  readonly acceptedColor: string;
  readonly labels: {
    readonly slideBackground: string;
    readonly slideTransition: string;
    readonly transitionDuration: string;
    readonly transitionFade: string;
    readonly transitionNone: string;
    readonly transitionScale: string;
    readonly transitionSlide: string;
  };
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
};

const TRANSITION_TYPES = ["none", "fade", "slide", "scale"] as const;

export function SlideInspector({
  slide,
  acceptedColor,
  labels,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
}: SlideInspectorProps) {
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
              {TRANSITION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {getTransitionLabel(type, labels)}
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
          <InspectorDraftInput
            id={`slide-transition-duration-${slide.id}`}
            min="1"
            type="number"
            value={slide.transitionDuration}
            isValid={(value) =>
              isValidNumericDraft(value, (number) => number >= 1)
            }
            onCommit={(value) =>
              onTransitionCommit(slide.transitionType, Number(value))
            }
            onDraftChange={(value) =>
              onTransitionChange(slide.transitionType, Number(value))
            }
          />
        </Field>
      )}
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
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ColorControl
        acceptedValue={acceptedValue}
        id={id}
        label={label}
        value={value}
        onCommit={onCommit}
        onChange={onChange}
      />
    </Field>
  );
}

function isNonBlank(value: string): boolean {
  return value.trim().length > 0;
}

function isTransitionType(value: string): value is TransitionType {
  return TRANSITION_TYPES.includes(value as TransitionType);
}

function getTransitionLabel(
  type: TransitionType,
  labels: SlideInspectorProps["labels"],
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
