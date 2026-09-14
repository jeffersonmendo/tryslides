"use client";

import {
  IconLogin2,
  IconLogout2,
  IconPlayerPause,
  IconPlayerPlay,
  IconRepeat,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  AnimationCapability,
  AnimationCategory,
} from "@/features/presentations/core/presentation-core";
import { ANIMATION_CAPABILITIES } from "@/features/presentations/core/presentation-core";
import { InspectorNumericField } from "./inspector-controls";
import type {
  EditorAnimation,
  EditorAnimationPreview,
  EditorElement,
} from "./lib/editor-model";

type AnimationInspectorProps = {
  readonly element: EditorElement | null;
  readonly onConfigureAnimation: (
    element_id: string,
    type: EditorAnimation["type"],
    configuration: Omit<EditorAnimation, "type">,
  ) => void;
  readonly onRemoveAnimation: (
    element_id: string,
    category: AnimationCategory,
  ) => void;
  readonly onPreviewAnimation: (
    element_id: string,
    animation: EditorAnimation,
  ) => void;
  readonly activePreview: EditorAnimationPreview | null;
  readonly onStopPlayback: (category?: AnimationCategory) => void;
};

const NONE_VALUE = "__none__";

const CATEGORIES: readonly AnimationCategory[] = [
  "entrance",
  "exit",
  "continuous",
];

export function AnimationInspector({
  element,
  onConfigureAnimation,
  onRemoveAnimation,
  onPreviewAnimation,
  activePreview,
  onStopPlayback,
}: AnimationInspectorProps) {
  if (element === null) return null;

  return (
    <div className="flex flex-col gap-6">
      {CATEGORIES.map((category) => {
        const capabilities: readonly AnimationCapability[] =
          ANIMATION_CAPABILITIES.filter(
            (capability) =>
              capability.category === category &&
              capability.supportedElementTypes.some(
                (element_type) => element_type === element.type,
              ),
          );
        const animation = element.animations.find(
          (current_animation) =>
            ANIMATION_CAPABILITIES.find(
              (capability) => capability.id === current_animation.type,
            )?.category === category,
        );
        return (
          <AnimationCategoryFields
            key={category}
            category={category}
            element={element}
            capabilities={capabilities}
            animation={animation}
            onConfigureAnimation={onConfigureAnimation}
            onRemoveAnimation={onRemoveAnimation}
            onPreviewAnimation={onPreviewAnimation}
            activePreview={activePreview}
            onStopPlayback={onStopPlayback}
          />
        );
      })}
    </div>
  );
}

function AnimationCategoryFields({
  category,
  element,
  capabilities,
  animation,
  onConfigureAnimation,
  onRemoveAnimation,
  onPreviewAnimation,
  activePreview,
  onStopPlayback,
}: {
  readonly category: AnimationCategory;
  readonly element: EditorElement;
  readonly capabilities: readonly AnimationCapability[];
  readonly animation: EditorAnimation | undefined;
  readonly onConfigureAnimation: AnimationInspectorProps["onConfigureAnimation"];
  readonly onRemoveAnimation: AnimationInspectorProps["onRemoveAnimation"];
  readonly onPreviewAnimation: AnimationInspectorProps["onPreviewAnimation"];
  readonly activePreview: EditorAnimationPreview | null;
  readonly onStopPlayback: AnimationInspectorProps["onStopPlayback"];
}) {
  const t = useTranslations("Editor");
  const selected_capability = capabilities.find(
    (capability) => capability.id === animation?.type,
  );
  const configuration = animation ?? selected_capability?.defaults;
  const effect_value: string | null = animation?.type ?? null;

  function configure(next: Partial<Omit<EditorAnimation, "type">>) {
    if (selected_capability === undefined || configuration === undefined)
      return;
    const next_animation: EditorAnimation = {
      type: selected_capability.id,
      ...configuration,
      ...next,
    };
    const { type: _type, ...next_configuration } = next_animation;
    onConfigureAnimation(
      element.id,
      selected_capability.id,
      next_configuration,
    );
    onPreviewAnimation(element.id, {
      type: selected_capability.id,
      ...next_configuration,
    });
  }

  return (
    <FieldSet>
      <FieldLegend className="text-muted-foreground/80">
        <span className="flex items-center gap-2">
          {getCategoryIcon(category)}
          {t(`animation${capitalize(category)}`)}
        </span>
      </FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${element.id}-${category}-effect`}>
            {t("animationEffect")}
          </FieldLabel>
          <Select
            value={effect_value}
            onValueChange={(value) => {
              if (value === NONE_VALUE) {
                onStopPlayback(category);
                onRemoveAnimation(element.id, category);
                return;
              }
              const capability = capabilities.find((item) => item.id === value);
              if (capability === undefined) return;
              onConfigureAnimation(
                element.id,
                capability.id,
                capability.defaults,
              );
              onPreviewAnimation(element.id, {
                type: capability.id,
                ...capability.defaults,
              });
            }}
          >
            <SelectTrigger id={`${element.id}-${category}-effect`}>
              <SelectValue>
                {animation === undefined
                  ? t("animationNone")
                  : t(`animation${toLabelKey(animation.type)}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NONE_VALUE}>{t("animationNone")}</SelectItem>
                {capabilities.map((capability) => (
                  <SelectItem key={capability.id} value={capability.id}>
                    {t(`animation${toLabelKey(capability.id)}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {animation === undefined || configuration === undefined ? null : (
          <>
            <div className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor={`${element.id}-${category}-duration`}>
                  {t("animationDuration")}
                </FieldLabel>
                <InspectorNumericField
                  id={`${element.id}-${category}-duration`}
                  min={1}
                  unit="ms"
                  value={configuration.duration}
                  isValid={(value) => value >= 1}
                  onChange={(duration) => configure({ duration })}
                  onCommit={(duration) => configure({ duration })}
                />
              </Field>
              <PreviewButton
                isActive={
                  activePreview?.elementId === element.id &&
                  activePreview.animation.type === animation.type
                }
                playLabel={t("playAnimation")}
                pauseLabel={t("pauseAnimation")}
                onClick={() => {
                  if (
                    activePreview?.elementId === element.id &&
                    activePreview.animation.type === animation.type
                  )
                    onStopPlayback();
                  else
                    onPreviewAnimation(element.id, {
                      type: animation.type,
                      ...configuration,
                    });
                }}
              />
            </div>
            <NumericAnimationField
              id={`${element.id}-${category}-delay`}
              label={t("animationDelay")}
              value={configuration.delay}
              onChange={(delay) => configure({ delay })}
            />
            <Field>
              <FieldLabel htmlFor={`${element.id}-${category}-easing`}>
                {t("animationEasing")}
              </FieldLabel>
              <Select
                value={configuration.easing}
                onValueChange={(easing) => {
                  if (easing !== null) configure({ easing });
                }}
              >
                <SelectTrigger id={`${element.id}-${category}-easing`}>
                  <SelectValue>
                    {getEasingLabel(configuration.easing, t)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {EASINGS.map((easing) => (
                      <SelectItem key={easing} value={easing}>
                        {getEasingLabel(easing, t)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {category === "continuous" ? (
              <>
                <Field>
                  <FieldLabel htmlFor={`${element.id}-${category}-repeat`}>
                    {t("animationRepeat")}
                  </FieldLabel>
                  <Select
                    value={String(configuration.repeat ?? "infinite")}
                    onValueChange={(repeat) => {
                      if (repeat === null) return;
                      configure({
                        repeat:
                          repeat === "infinite" ? "infinite" : Number(repeat),
                      });
                    }}
                  >
                    <SelectTrigger id={`${element.id}-${category}-repeat`}>
                      <SelectValue>
                        {getRepeatLabel(configuration.repeat ?? "infinite", t)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="1">
                          {t("animationRepeatOnce")}
                        </SelectItem>
                        <SelectItem value="2">
                          {t("animationRepeatTwice")}
                        </SelectItem>
                        <SelectItem value="3">
                          {t("animationRepeatThreeTimes")}
                        </SelectItem>
                        <SelectItem value="infinite">
                          {t("animationInfinite")}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <NumericAnimationField
                  id={`${element.id}-${category}-interval`}
                  label={t("animationInterval")}
                  value={configuration.interval ?? 0}
                  onChange={(interval) => configure({ interval })}
                />
              </>
            ) : null}
          </>
        )}
      </FieldGroup>
    </FieldSet>
  );
}

function NumericAnimationField({
  id,
  label,
  value,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InspectorNumericField
        id={id}
        min={0}
        unit="ms"
        value={value}
        isValid={(next_value) => next_value >= 0}
        onChange={onChange}
        onCommit={onChange}
      />
    </Field>
  );
}

function PreviewButton({
  isActive,
  playLabel,
  pauseLabel,
  onClick,
}: {
  readonly isActive: boolean;
  readonly playLabel: string;
  readonly pauseLabel: string;
  readonly onClick: () => void;
}) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <Button
            aria-label={isActive ? pauseLabel : playLabel}
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
      <TooltipContent>{isActive ? pauseLabel : playLabel}</TooltipContent>
    </Tooltip>
  );
}

const EASINGS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const;

function getEasingLabel(
  easing: string,
  t: ReturnType<typeof useTranslations>,
): string {
  return t(`animationEasing${toLabelKey(easing)}`);
}

function getRepeatLabel(
  repeat: number | "infinite",
  t: ReturnType<typeof useTranslations>,
): string {
  switch (repeat) {
    case 1:
      return t("animationRepeatOnce");
    case 2:
      return t("animationRepeatTwice");
    case 3:
      return t("animationRepeatThreeTimes");
    default:
      return t("animationInfinite");
  }
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

function getCategoryIcon(category: AnimationCategory): React.ReactNode {
  if (category === "entrance")
    return <IconLogin2 aria-hidden className="size-3!" stroke={2} />;
  if (category === "continuous")
    return <IconRepeat aria-hidden className="size-3!" stroke={2} />;
  return <IconLogout2 aria-hidden className="size-3!" stroke={2} />;
}

function toLabelKey(value: string): string {
  return value.replace(/(^|-)\w/g, (match) =>
    match.replace("-", "").toUpperCase(),
  );
}
