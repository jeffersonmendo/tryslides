"use client";

import {
  IconAlignBoxBottomCenterFilled,
  IconAlignBoxCenterMiddleFilled,
  IconAlignBoxLeftMiddleFilled,
  IconAlignBoxRightMiddleFilled,
  IconAlignBoxTopCenterFilled,
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft2,
  IconAlignRight2,
  IconLayoutAlignBottomFilled,
  IconLayoutAlignCenterFilled,
  IconLayoutAlignLeftFilled,
  IconLayoutAlignMiddleFilled,
  IconLayoutAlignRightFilled,
  IconLayoutAlignTopFilled,
  IconLetterSpacing,
  IconLineHeight,
  IconSpacingHorizontal,
  IconSpacingVertical,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ElementPatch } from "@/features/presentations/core/presentation-core";
import {
  isTextAlignment,
  isTextFontWeight,
  TEXT_FONT_WEIGHTS,
  type TextFontWeight,
} from "@/features/presentations/core/presentation-core";
import { FontFamilyCombobox } from "./font-family-combobox";
import {
  InspectorColorField,
  InspectorNumericField,
} from "./inspector-controls";
import {
  type InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";
import { InspectorOpacitySlider } from "./inspector-opacity-slider";
import type { EditorElement } from "./lib/editor-model";
import { getGroupInspectorCapabilities } from "./lib/group-inspector-capabilities";

type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";
type DistributionAxis = "horizontal" | "vertical";
type GroupInspectorLabels = {
  readonly content: string;
  readonly transform: string;
  readonly appearance: string;
  readonly role: string;
  readonly shapeType: string;
  readonly rotation: string;
  readonly alignToCanvas: string;
  readonly distribution: string;
  readonly alignToReference: string;
  readonly referenceAlignmentStatusSet: string;
  readonly referenceAlignmentStatusNone: string;
  readonly fontSize: string;
  readonly fontFamily: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  readonly letterSpacing: string;
  readonly fontWeightBold: string;
  readonly fontWeightRegular: string;
  readonly fontWeightThin: string;
  readonly fontWeightExtraLight: string;
  readonly fontWeightLight: string;
  readonly fontWeightMedium: string;
  readonly fontWeightSemiBold: string;
  readonly fontWeightExtraBold: string;
  readonly fontWeightBlack: string;
  readonly color: string;
  readonly alignment: string;
  readonly alignmentLeft: string;
  readonly alignmentCenter: string;
  readonly alignmentRight: string;
  readonly alignmentJustify: string;
  readonly fit: string;
  readonly fitContain: string;
  readonly fitCover: string;
  readonly radius: string;
  readonly fill: string;
  readonly border: string;
  readonly borderWidth: string;
  readonly stroke: string;
  readonly strokeWidth: string;
  readonly distributeHorizontally: string;
  readonly distributeVertically: string;
  readonly gap: string;
  readonly alignLeft: string;
  readonly centerHorizontally: string;
  readonly alignRight: string;
  readonly alignTop: string;
  readonly centerVertically: string;
  readonly alignBottom: string;
  readonly textRoleH1: string;
  readonly textRoleH2: string;
  readonly textRoleH3: string;
  readonly textRoleParagraph: string;
  readonly shapeRectangle: string;
  readonly shapeCircle: string;
  readonly shapeTriangle: string;
  readonly shapeDiamond: string;
  readonly shapeStar: string;
  readonly shapeHeart: string;
  readonly shapeLine: string;
  readonly shapeArrow: string;
  readonly shapeDoubleArrow: string;
  readonly shapeSpeechBubble: string;
  readonly shapeRoundBubble: string;
  readonly shapePlus: string;
  readonly shapeMinus: string;
  readonly shapeMultiply: string;
  readonly shapeDivide: string;
  readonly shapeEqual: string;
  readonly shapeNotEqual: string;
};
type GroupInspectorProps = {
  readonly elements: readonly EditorElement[];
  readonly referenceElementId: string | null;
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
  readonly onRotateChange: (delta: number) => void;
  readonly onRotateCommit: (delta: number) => void;
  readonly onOpacityChange: (opacity: number) => void;
  readonly onOpacityCommit: (opacity: number) => void;
  readonly onAlignToCanvas: (alignment: Alignment) => void;
  readonly onAlignToReference: (alignment: Alignment) => void;
  readonly onDistribute: (axis: DistributionAxis, gap: number) => void;
};

const ALIGNMENTS: readonly Alignment[] = [
  "left",
  "center",
  "right",
  "top",
  "middle",
  "bottom",
];
const TEXT_ROLES = ["H1", "H2", "H3", "Paragraph"] as const;

export function GroupInspector({
  elements,
  referenceElementId,
  onPatch,
  onPatchCommit,
  onRotateChange,
  onRotateCommit,
  onOpacityChange,
  onOpacityCommit,
  onAlignToCanvas,
  onAlignToReference,
  onDistribute,
}: GroupInspectorProps) {
  const t = useTranslations("Editor");
  const labels = getGroupInspectorLabels(t);
  const capabilities = getGroupInspectorCapabilities(elements);
  const has_reference = referenceElementId !== null;

  return (
    <FieldGroup>
      {capabilities.text || capabilities.shape ? (
        <FieldSet>
          <FieldLegend className="text-muted-foreground">
            {labels.content}
          </FieldLegend>
          <FieldGroup className="gap-4">
            {capabilities.text ? (
              <TextRoleField
                elements={elements}
                labels={labels}
                onPatchCommit={onPatchCommit}
              />
            ) : null}
            {capabilities.shape ? (
              <ShapeTypeField
                elements={elements}
                labels={labels}
                onPatchCommit={onPatchCommit}
              />
            ) : null}
          </FieldGroup>
        </FieldSet>
      ) : null}
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.transform}
        </FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>{labels.rotation}</FieldLabel>
            <UnitInput
              aria-label={labels.rotation}
              value={0}
              unit="°"
              isValid={(value) => isValidNumericDraft(value, () => true)}
              onCommit={(value) => {
                const delta = Number(value);
                if (delta !== 0) onRotateCommit(delta);
              }}
              onDraftChange={(value) => onRotateChange(Number(value))}
            />
          </Field>
          <AlignmentControls
            label={labels.alignToCanvas}
            labels={labels}
            onAction={onAlignToCanvas}
          />
          <Field>
            <FieldLabel>{labels.distribution}</FieldLabel>
            <DistributionField
              key={getDistributionSelectionKey(elements)}
              disabled={elements.length < 2}
              labels={labels}
              onDistribute={onDistribute}
            />
          </Field>
          <Field>
            <FieldLabel>{labels.alignToReference}</FieldLabel>
            <p
              className="text-sm text-muted-foreground"
              id="reference-alignment-instruction"
            >
              {t.rich("referenceAlignmentInstruction", {
                shortcut: () => (
                  <KbdGroup aria-label={t("referenceAlignmentShortcut")}>
                    <Kbd>{t("shiftKey")}</Kbd>
                    <span aria-hidden="true">+</span>
                    <Kbd>{t("clickLabel")}</Kbd>
                  </KbdGroup>
                ),
              })}
            </p>
            <p
              className="sr-only"
              id="reference-alignment-status"
              role="status"
            >
              {has_reference
                ? labels.referenceAlignmentStatusSet
                : labels.referenceAlignmentStatusNone}
            </p>
            <AlignmentToggleGroup
              disabled={!has_reference}
              labels={labels}
              onAction={onAlignToReference}
              reference
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.appearance}
        </FieldLegend>
        <FieldGroup className="gap-4">
          {capabilities.text ? (
            <TextAlignmentField
              elements={elements}
              labels={labels}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
          <Field>
            <InspectorOpacitySlider
              id="group-opacity"
              opacity={getSharedValue(
                elements.map((element) => element.opacity),
              )}
              onChange={onOpacityChange}
              onCommit={onOpacityCommit}
            />
          </Field>
          {capabilities.text ? (
            <TextAppearanceFields
              elements={elements}
              labels={labels}
              onPatch={onPatch}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
          {capabilities.image ? (
            <ImageAppearanceFields
              elements={elements}
              labels={labels}
              onPatch={onPatch}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
          {capabilities.shape ? (
            <ShapeAppearanceFields
              capabilities={capabilities}
              elements={elements}
              labels={labels}
              onPatch={onPatch}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}

function getGroupInspectorLabels(
  t: ReturnType<typeof useTranslations>,
): GroupInspectorLabels {
  return {
    content: t("content"),
    transform: t("transform"),
    appearance: t("appearance"),
    role: t("role"),
    shapeType: t("shapeType"),
    rotation: t("rotation"),
    alignToCanvas: t("alignToCanvas"),
    distribution: t("distribution"),
    alignToReference: t("alignToReference"),
    referenceAlignmentStatusSet: t("referenceAlignmentStatusSet"),
    referenceAlignmentStatusNone: t("referenceAlignmentStatusNone"),
    fontSize: t("fontSize"),
    fontFamily: t("fontFamily"),
    fontWeight: t("fontWeight"),
    lineHeight: t("lineHeight"),
    letterSpacing: t("letterSpacing"),
    fontWeightBold: t("fontWeightBold"),
    fontWeightRegular: t("fontWeightRegular"),
    fontWeightThin: t("fontWeightThin"),
    fontWeightExtraLight: t("fontWeightExtraLight"),
    fontWeightLight: t("fontWeightLight"),
    fontWeightMedium: t("fontWeightMedium"),
    fontWeightSemiBold: t("fontWeightSemiBold"),
    fontWeightExtraBold: t("fontWeightExtraBold"),
    fontWeightBlack: t("fontWeightBlack"),
    color: t("color"),
    alignment: t("alignment"),
    alignmentLeft: t("alignmentLeft"),
    alignmentCenter: t("alignmentCenter"),
    alignmentRight: t("alignmentRight"),
    alignmentJustify: t("alignmentJustify"),
    fit: t("fit"),
    fitContain: t("fitContain"),
    fitCover: t("fitCover"),
    radius: t("radius"),
    fill: t("fill"),
    border: t("border"),
    borderWidth: t("borderWidth"),
    stroke: t("stroke"),
    strokeWidth: t("strokeWidth"),
    distributeHorizontally: t("distributeHorizontally"),
    distributeVertically: t("distributeVertically"),
    gap: t("gap"),
    alignLeft: t("alignLeft"),
    centerHorizontally: t("centerHorizontally"),
    alignRight: t("alignRight"),
    alignTop: t("alignTop"),
    centerVertically: t("centerVertically"),
    alignBottom: t("alignBottom"),
    textRoleH1: t("textRoleH1"),
    textRoleH2: t("textRoleH2"),
    textRoleH3: t("textRoleH3"),
    textRoleParagraph: t("textRoleParagraph"),
    shapeRectangle: t("shapeRectangle"),
    shapeCircle: t("shapeCircle"),
    shapeTriangle: t("shapeTriangle"),
    shapeDiamond: t("shapeDiamond"),
    shapeStar: t("shapeStar"),
    shapeHeart: t("shapeHeart"),
    shapeLine: t("shapeLine"),
    shapeArrow: t("shapeArrow"),
    shapeDoubleArrow: t("shapeDoubleArrow"),
    shapeSpeechBubble: t("shapeSpeechBubble"),
    shapeRoundBubble: t("shapeRoundBubble"),
    shapePlus: t("shapePlus"),
    shapeMinus: t("shapeMinus"),
    shapeMultiply: t("shapeMultiply"),
    shapeDivide: t("shapeDivide"),
    shapeEqual: t("shapeEqual"),
    shapeNotEqual: t("shapeNotEqual"),
  };
}

function TextRoleField({
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
}) {
  const text = elements as readonly Extract<
    EditorElement,
    { readonly type: "text" }
  >[];
  const role = getSharedValue(text.map((element) => element.style.role));
  return (
    <Field>
      <FieldLabel>{labels.role}</FieldLabel>
      <Select
        value={role ?? null}
        onValueChange={(value) => {
          if (isTextRole(value))
            onPatchCommit({
              style: { role: value, ...getTextRolePreset(value) },
            });
        }}
      >
        <SelectTrigger>
          <SelectValue>
            {role === null ? "—" : getTextRoleLabel(role, labels)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {TEXT_ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {getTextRoleLabel(value, labels)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function ShapeTypeField({
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
}) {
  const shapes = elements as readonly Extract<
    EditorElement,
    { readonly type: "shape" }
  >[];
  const shape_type = getSharedValue(shapes.map((element) => element.shapeType));
  return (
    <Field>
      <FieldLabel>{labels.shapeType}</FieldLabel>
      <Select
        value={shape_type ?? null}
        onValueChange={(value) => {
          if (isShapeType(value)) onPatchCommit({ shapeType: value });
        }}
      >
        <SelectTrigger>
          <SelectValue>
            {shape_type === null ? "—" : getShapeTypeLabel(shape_type, labels)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {SHAPE_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {getShapeTypeLabel(value, labels)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function TextAppearanceFields({
  elements,
  labels,
  onPatch,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatch" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
}) {
  const text = elements as readonly Extract<
    EditorElement,
    { readonly type: "text" }
  >[];
  const font_size = getSharedValue(
    text.map((element) => element.style.fontSize),
  );
  const font_family = getSharedValue(
    text.map((element) => element.style.fontFamily),
  );
  const font_weight = getSharedValue(
    text.map((element) => element.style.fontWeight),
  );
  const line_height = getSharedValue(
    text.map((element) => element.style.lineHeight),
  );
  const letter_spacing = getSharedValue(
    text.map((element) => element.style.letterSpacing),
  );
  const color = getSharedValue(text.map((element) => element.style.color));
  return (
    <>
      <FontFamilyCombobox
        value={font_family}
        onValueChange={(font_family) =>
          onPatchCommit({ style: { fontFamily: font_family } })
        }
      />
      <Field>
        <FieldLabel>{labels.fontSize}</FieldLabel>
        <UnitInput
          value={font_size ?? ""}
          unit="px"
          min="1"
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number > 0)
          }
          onCommit={(value) =>
            onPatchCommit({ style: { fontSize: Number(value) } })
          }
          onDraftChange={(value) =>
            onPatch({ style: { fontSize: Number(value) } })
          }
        />
      </Field>
      <Field>
        <FieldLabel>{labels.lineHeight}</FieldLabel>
        <UnitInput
          aria-label={labels.lineHeight}
          leading={<IconLineHeight aria-hidden />}
          value={line_height ?? ""}
          min="0.1"
          step="0.1"
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number > 0)
          }
          onCommit={(value) =>
            onPatchCommit({ style: { lineHeight: Number(value) } })
          }
          onDraftChange={(value) =>
            onPatch({ style: { lineHeight: Number(value) } })
          }
        />
      </Field>
      <Field>
        <FieldLabel>{labels.letterSpacing}</FieldLabel>
        <UnitInput
          aria-label={labels.letterSpacing}
          leading={<IconLetterSpacing aria-hidden />}
          value={letter_spacing ?? ""}
          unit="px"
          isValid={(value) => isValidNumericDraft(value, () => true)}
          onCommit={(value) =>
            onPatchCommit({ style: { letterSpacing: Number(value) } })
          }
          onDraftChange={(value) =>
            onPatch({ style: { letterSpacing: Number(value) } })
          }
        />
      </Field>
      <Field>
        <FieldLabel>{labels.fontWeight}</FieldLabel>
        <Select
          value={font_weight === null ? null : String(font_weight)}
          onValueChange={(value) => {
            const font_weight = Number(value);
            if (isTextFontWeight(font_weight))
              onPatchCommit({ style: { fontWeight: font_weight } });
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {font_weight === null
                ? "—"
                : getFontWeightLabel(font_weight, labels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {TEXT_FONT_WEIGHTS.map((font_weight) => (
                <SelectItem key={font_weight} value={String(font_weight)}>
                  {getFontWeightLabel(font_weight, labels)}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <InspectorColorField
        acceptedValue={color ?? "#000000"}
        id="group-text-color"
        label={labels.color}
        value={color ?? "#000000"}
        onChange={(value) => onPatch({ style: { color: value } })}
        onCommit={(value) => onPatchCommit({ style: { color: value } })}
      />
    </>
  );
}

function TextAlignmentField({
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
}) {
  const text = elements as readonly Extract<
    EditorElement,
    { readonly type: "text" }
  >[];
  const alignment = getSharedValue(
    text.map((element) => element.style.alignment),
  );
  return (
    <Field>
      <FieldLabel>{labels.alignment}</FieldLabel>
      <ToggleGroup
        aria-label={labels.alignment}
        className="grid grid-cols-4"
        size="sm"
        variant="ghost"
        value={alignment === null ? [] : [alignment]}
        onValueChange={(value) => {
          const selected_alignment = value[0];
          if (isTextAlignment(selected_alignment))
            onPatchCommit({ style: { alignment: selected_alignment } });
        }}
      >
        <IconToggleItem
          icon={<IconAlignLeft2 stroke={2} />}
          label={labels.alignmentLeft}
          value="left"
        />
        <IconToggleItem
          icon={<IconAlignCenter stroke={2} />}
          label={labels.alignmentCenter}
          value="center"
        />
        <IconToggleItem
          icon={<IconAlignRight2 stroke={2} />}
          label={labels.alignmentRight}
          value="right"
        />
        <IconToggleItem
          icon={<IconAlignJustified stroke={2} />}
          label={labels.alignmentJustify}
          value="justify"
        />
      </ToggleGroup>
    </Field>
  );
}

function ImageAppearanceFields({
  elements,
  labels,
  onPatch,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatch" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
}) {
  const images = elements as readonly Extract<
    EditorElement,
    { readonly type: "image" }
  >[];
  const fit = getSharedValue(images.map((element) => element.style.objectFit));
  const radius = getSharedValue(
    images.map((element) => element.style.borderRadius),
  );
  return (
    <>
      <Field>
        <FieldLabel>{labels.fit}</FieldLabel>
        <Select
          value={fit ?? null}
          onValueChange={(value) => {
            if (value === "contain" || value === "cover")
              onPatchCommit({ style: { objectFit: value } });
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {fit === null
                ? "—"
                : fit === "contain"
                  ? labels.fitContain
                  : labels.fitCover}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="contain">{labels.fitContain}</SelectItem>
              <SelectItem value="cover">{labels.fitCover}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>{labels.radius}</FieldLabel>
        <UnitInput
          min="0"
          value={radius ?? ""}
          unit="px"
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number >= 0)
          }
          onCommit={(value) =>
            onPatchCommit({ style: { borderRadius: Number(value) } })
          }
          onDraftChange={(value) =>
            onPatch({ style: { borderRadius: Number(value) } })
          }
        />
      </Field>
    </>
  );
}

function ShapeAppearanceFields({
  capabilities,
  elements,
  labels,
  onPatch,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "onPatch" | "onPatchCommit"> & {
  readonly labels: GroupInspectorLabels;
  readonly capabilities: ReturnType<typeof getGroupInspectorCapabilities>;
}) {
  const shapes = elements as readonly Extract<
    EditorElement,
    { readonly type: "shape" }
  >[];
  const fill = getSharedValue(shapes.map((element) => element.style.fill));
  const border = getSharedValue(shapes.map((element) => element.style.border));
  const border_width = getSharedValue(
    shapes.map((element) => element.style.borderWidth),
  );
  const radius = getSharedValue(shapes.map((element) => element.style.radius));
  const uses_stroke = capabilities.shapeStroke;
  return (
    <>
      <InspectorColorField
        acceptedValue={fill ?? "#000000"}
        id="group-shape-fill"
        label={uses_stroke ? labels.stroke : labels.fill}
        value={fill ?? "#000000"}
        onChange={(value) => onPatch({ style: { fill: value } })}
        onCommit={(value) => onPatchCommit({ style: { fill: value } })}
      />
      {capabilities.shapeBorder ? (
        <InspectorColorField
          acceptedValue={border ?? "#000000"}
          id="group-shape-border"
          label={labels.border}
          value={border ?? "#000000"}
          onChange={(value) => onPatch({ style: { border: value } })}
          onCommit={(value) => onPatchCommit({ style: { border: value } })}
        />
      ) : null}
      <Field>
        <FieldLabel>
          {uses_stroke ? labels.strokeWidth : labels.borderWidth}
        </FieldLabel>
        <UnitInput
          min="0"
          value={border_width ?? ""}
          unit="px"
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number >= 0)
          }
          onCommit={(value) =>
            onPatchCommit({ style: { borderWidth: Number(value) } })
          }
          onDraftChange={(value) =>
            onPatch({ style: { borderWidth: Number(value) } })
          }
        />
      </Field>
      {capabilities.shapeRadius ? (
        <Field>
          <FieldLabel>{labels.radius}</FieldLabel>
          <UnitInput
            min="0"
            value={radius ?? ""}
            unit="px"
            isValid={(value) =>
              isValidNumericDraft(value, (number) => number >= 0)
            }
            onCommit={(value) =>
              onPatchCommit({ style: { radius: Number(value) } })
            }
            onDraftChange={(value) =>
              onPatch({ style: { radius: Number(value) } })
            }
          />
        </Field>
      ) : null}
    </>
  );
}

function AlignmentControls({
  label,
  labels,
  onAction,
}: {
  readonly label: string;
  readonly labels: GroupInspectorLabels;
  readonly onAction: (alignment: Alignment) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <AlignmentToggleGroup labels={labels} onAction={onAction} />
    </Field>
  );
}
function AlignmentToggleGroup({
  disabled = false,
  labels,
  onAction,
  reference = false,
}: {
  readonly disabled?: boolean;
  readonly labels: GroupInspectorLabels;
  readonly onAction: (alignment: Alignment) => void;
  readonly reference?: boolean;
}) {
  return (
    <ToggleGroup
      aria-describedby={
        reference
          ? "reference-alignment-instruction reference-alignment-status"
          : undefined
      }
      className="grid grid-cols-3"
      size="sm"
      value={[]}
      variant="ghost"
    >
      {ALIGNMENTS.map((alignment) => (
        <IconToggleItem
          key={alignment}
          disabled={disabled}
          icon={getAlignmentIcon(alignment, reference)}
          label={getAlignmentLabel(alignment, labels)}
          value={alignment}
          onClick={() => onAction(alignment)}
        />
      ))}
    </ToggleGroup>
  );
}
function DistributionField({
  disabled,
  labels,
  onDistribute,
}: {
  readonly disabled: boolean;
  readonly labels: GroupInspectorLabels;
  readonly onDistribute: GroupInspectorProps["onDistribute"];
}) {
  const [axis, set_axis] = useState<DistributionAxis | null>(null);
  const [gap, set_gap] = useState(0);

  function apply(axis: DistributionAxis, gap: number) {
    set_axis(axis);
    onDistribute(axis, gap);
  }

  function updateGap(value: string) {
    const next_gap = Number(value);
    set_gap(next_gap);
    if (axis !== null) onDistribute(axis, next_gap);
  }

  return (
    <div className="flex gap-2">
      <ToggleGroup
        size="sm"
        value={axis === null ? [] : [axis]}
        variant="ghost"
        onValueChange={(value) => {
          const next_axis = value[0];
          if (isDistributionAxis(next_axis)) apply(next_axis, gap);
        }}
      >
        <IconToggleItem
          className="data-pressed:bg-muted"
          disabled={disabled}
          icon={<IconSpacingHorizontal stroke={2} />}
          label={labels.distributeHorizontally}
          value="horizontal"
        />
        <IconToggleItem
          className="data-pressed:bg-muted"
          disabled={disabled}
          icon={<IconSpacingVertical stroke={2} />}
          label={labels.distributeVertically}
          value="vertical"
        />
      </ToggleGroup>
      <UnitInput
        aria-label={labels.gap}
        disabled={disabled}
        min="0"
        value={gap}
        unit="px"
        isValid={(value) => isValidNumericDraft(value, (number) => number >= 0)}
        onCommit={(value) => set_gap(Number(value))}
        onDraftChange={updateGap}
      />
    </div>
  );
}
function IconToggleItem({
  className,
  icon,
  label,
  value,
  disabled = false,
  onClick,
}: {
  readonly className?: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <ToggleGroupItem
            aria-label={label}
            className={className}
            disabled={disabled}
            value={value}
            onClick={onClick}
          >
            {icon}
          </ToggleGroupItem>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
function UnitInput({
  onCommit,
  unit,
  leading,
  value,
  isValid,
  onDraftChange,
  "aria-label": aria_label,
  ...props
}: Omit<
  React.ComponentProps<typeof InspectorDraftInput>,
  "isValid" | "onCommit" | "onDraftChange" | "value"
> & {
  readonly value: string | number;
  readonly isValid: (value: string) => boolean;
  readonly onCommit: (value: string) => void;
  readonly onDraftChange: (value: string) => void;
  readonly unit?: string;
  readonly leading?: React.ReactNode;
}) {
  return (
    <InspectorNumericField
      {...props}
      ariaLabel={aria_label}
      leading={leading}
      unit={unit}
      value={value === "" ? "" : Number(value)}
      isValid={(number) => isValid(String(number))}
      onChange={(number) => onDraftChange(String(number))}
      onCommit={(number) => onCommit(String(number))}
    />
  );
}
function getAlignmentIcon(
  alignment: Alignment,
  reference: boolean,
): React.ReactNode {
  if (reference)
    return {
      left: <IconAlignBoxLeftMiddleFilled stroke={2} />,
      center: <IconAlignBoxCenterMiddleFilled stroke={2} />,
      right: <IconAlignBoxRightMiddleFilled stroke={2} />,
      top: <IconAlignBoxTopCenterFilled stroke={2} />,
      middle: <IconAlignBoxCenterMiddleFilled stroke={2} />,
      bottom: <IconAlignBoxBottomCenterFilled stroke={2} />,
    }[alignment];
  return {
    left: <IconLayoutAlignLeftFilled stroke={2} />,
    center: <IconLayoutAlignCenterFilled stroke={2} />,
    right: <IconLayoutAlignRightFilled stroke={2} />,
    top: <IconLayoutAlignTopFilled stroke={2} />,
    middle: <IconLayoutAlignMiddleFilled stroke={2} />,
    bottom: <IconLayoutAlignBottomFilled stroke={2} />,
  }[alignment];
}
function getAlignmentLabel(
  alignment: Alignment,
  labels: GroupInspectorLabels,
): string {
  return {
    left: labels.alignLeft,
    center: labels.centerHorizontally,
    right: labels.alignRight,
    top: labels.alignTop,
    middle: labels.centerVertically,
    bottom: labels.alignBottom,
  }[alignment];
}
function getDistributionSelectionKey(
  elements: readonly EditorElement[],
): string {
  return elements
    .map((element) => element.id)
    .toSorted()
    .join(",");
}
function isDistributionAxis(
  value: string | undefined,
): value is DistributionAxis {
  return value === "horizontal" || value === "vertical";
}
function getSharedValue<T>(values: readonly T[]): T | null {
  return values.length > 0 && values.every((value) => value === values[0])
    ? (values[0] ?? null)
    : null;
}
function isTextRole(
  value: string | null,
): value is Extract<EditorElement, { readonly type: "text" }>["style"]["role"] {
  return (
    value !== null && TEXT_ROLES.includes(value as (typeof TEXT_ROLES)[number])
  );
}
function getFontWeightLabel(
  font_weight: TextFontWeight,
  labels: GroupInspectorLabels,
): string {
  return {
    100: labels.fontWeightThin,
    200: labels.fontWeightExtraLight,
    300: labels.fontWeightLight,
    400: labels.fontWeightRegular,
    500: labels.fontWeightMedium,
    600: labels.fontWeightSemiBold,
    700: labels.fontWeightBold,
    800: labels.fontWeightExtraBold,
    900: labels.fontWeightBlack,
  }[font_weight];
}
function getTextRolePreset(
  role: (typeof TEXT_ROLES)[number],
): Pick<
  Extract<EditorElement, { readonly type: "text" }>["style"],
  "fontSize" | "fontWeight"
> {
  return role === "H1"
    ? { fontSize: 64, fontWeight: 700 }
    : role === "H2"
      ? { fontSize: 48, fontWeight: 700 }
      : role === "H3"
        ? { fontSize: 32, fontWeight: 700 }
        : { fontSize: 16, fontWeight: 400 };
}
function getTextRoleLabel(
  role: (typeof TEXT_ROLES)[number],
  labels: GroupInspectorLabels,
) {
  if (role === "H1") return labels.textRoleH1;
  if (role === "H2") return labels.textRoleH2;
  if (role === "H3") return labels.textRoleH3;
  return labels.textRoleParagraph;
}
const SHAPE_TYPES = [
  "rectangle",
  "circle",
  "triangle",
  "diamond",
  "star",
  "heart",
  "line",
  "arrow",
  "double-arrow",
  "speech-bubble",
  "round-bubble",
  "plus",
  "minus",
  "multiply",
  "divide",
  "equal",
  "not-equal",
] as const;
function isShapeType(
  value: string | null,
): value is (typeof SHAPE_TYPES)[number] {
  return (
    value !== null &&
    SHAPE_TYPES.includes(value as (typeof SHAPE_TYPES)[number])
  );
}
function getShapeTypeLabel(
  type: (typeof SHAPE_TYPES)[number],
  labels: GroupInspectorLabels,
) {
  return {
    rectangle: labels.shapeRectangle,
    circle: labels.shapeCircle,
    triangle: labels.shapeTriangle,
    diamond: labels.shapeDiamond,
    star: labels.shapeStar,
    heart: labels.shapeHeart,
    line: labels.shapeLine,
    arrow: labels.shapeArrow,
    "double-arrow": labels.shapeDoubleArrow,
    "speech-bubble": labels.shapeSpeechBubble,
    "round-bubble": labels.shapeRoundBubble,
    plus: labels.shapePlus,
    minus: labels.shapeMinus,
    multiply: labels.shapeMultiply,
    divide: labels.shapeDivide,
    equal: labels.shapeEqual,
    "not-equal": labels.shapeNotEqual,
  }[type];
}
