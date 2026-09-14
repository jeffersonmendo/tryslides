"use client";

import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  readonly onPreviewTransition: (
    type: TransitionType,
    duration: number,
  ) => void;
  readonly onStopTransitionPreview: () => void;
  readonly isPreviewActive: boolean;
  readonly canPreviewTransition: boolean;
};

export function SlideInspector({
  slide,
  acceptedColor,
  onBackgroundChange,
  onBackgroundCommit,
  onTransitionChange,
  onTransitionCommit,
  onPreviewTransition,
  onStopTransitionPreview,
  isPreviewActive,
  canPreviewTransition,
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
      <div className="flex items-end gap-2">
        <Field className="flex-1">
          <FieldLabel htmlFor={`slide-transition-${slide.id}`}>
            {labels.slideTransition}
          </FieldLabel>
          <Select
            value={slide.transitionType}
            onValueChange={(value) => {
              if (value !== null && isTransitionType(value)) {
                onTransitionCommit(value);
                const capability = TRANSITION_CAPABILITIES.find(
                  (item) => item.id === value,
                );
                if (capability !== undefined)
                  onPreviewTransition(value, capability.defaults.duration);
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
        <TransitionPreviewButton
          canPreview={canPreviewTransition}
          isActive={isPreviewActive}
          pauseLabel={t("pauseTransition")}
          playLabel={t("playTransition")}
          onClick={() => {
            if (isPreviewActive) onStopTransitionPreview();
            else
              onPreviewTransition(
                slide.transitionType,
                slide.transitionDuration,
              );
          }}
        />
      </div>
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
            onChange={(value) => {
              onTransitionChange(slide.transitionType, value);
              onPreviewTransition(slide.transitionType, value);
            }}
          />
        </Field>
      )}
    </FieldGroup>
  );
}

function TransitionPreviewButton({
  canPreview,
  isActive,
  pauseLabel,
  playLabel,
  onClick,
}: {
  readonly canPreview: boolean;
  readonly isActive: boolean;
  readonly pauseLabel: string;
  readonly playLabel: string;
  readonly onClick: () => void;
}) {
  const label = isActive ? pauseLabel : playLabel;
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={!canPreview}
            size="icon-sm"
            type="button"
            variant="secondary"
            onClick={onClick}
          >
            {isActive ? (
              <IconPlayerPause data-icon="inline-start" />
            ) : (
              <IconPlayerPlay data-icon="inline-start" />
            )}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
      "previewTransition",
    ].map((key) => [key, t(key as never)]),
  );
}
