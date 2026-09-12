"use client";

import {
  IconAlignBoxBottomCenterFilled,
  IconAlignBoxCenterMiddleFilled,
  IconAlignBoxLeftMiddleFilled,
  IconAlignBoxRightMiddleFilled,
  IconAlignBoxTopCenterFilled,
  IconAlignCenter,
  IconAlignLeft2,
  IconAlignRight2,
  IconLayoutAlignBottomFilled,
  IconLayoutAlignCenterFilled,
  IconLayoutAlignLeftFilled,
  IconLayoutAlignMiddleFilled,
  IconLayoutAlignRightFilled,
  IconLayoutAlignTopFilled,
  IconSpacingHorizontal,
  IconSpacingVertical,
} from "@tabler/icons-react";
import { useState } from "react";
import { ColorControl } from "@/components/ui/color";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
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
import type { EditorElement } from "./editor-model";
import { getGroupInspectorCapabilities } from "./group-inspector-capabilities";
import {
  InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";

type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";
type DistributionAxis = "horizontal" | "vertical";
type GroupInspectorProps = {
  readonly elements: readonly EditorElement[];
  readonly referenceElementId: string | null;
  readonly labels: Record<string, string>;
  readonly onPatchCommit: (patch: ElementPatch) => void;
  readonly onRotate: (delta: number) => void;
  readonly onOpacity: (opacity: number) => void;
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
  labels,
  onPatchCommit,
  onRotate,
  onOpacity,
  onAlignToCanvas,
  onAlignToReference,
  onDistribute,
}: GroupInspectorProps) {
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
                if (delta !== 0) onRotate(delta);
              }}
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
              {labels.referenceAlignmentInstructionPrefix}{" "}
              <KbdGroup aria-label={labels.referenceAlignmentShortcut}>
                <Kbd>{labels.shiftKey}</Kbd>
                <span aria-hidden="true">+</span>
                <Kbd>{labels.clickLabel}</Kbd>
              </KbdGroup>{" "}
              {labels.referenceAlignmentHint}
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
          <Field>
            <FieldLabel>{labels.opacity}</FieldLabel>
            <UnitInput
              aria-label={labels.opacity}
              max="100"
              min="0"
              value={
                getSharedValue(elements.map((element) => element.opacity)) ?? ""
              }
              unit="%"
              isValid={(value) =>
                isValidNumericDraft(
                  value,
                  (number) => number >= 0 && number <= 100,
                )
              }
              onCommit={(value) => onOpacity(Number(value) / 100)}
            />
          </Field>
          {capabilities.text ? (
            <TextAppearanceFields
              elements={elements}
              labels={labels}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
          {capabilities.image ? (
            <ImageAppearanceFields
              elements={elements}
              labels={labels}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
          {capabilities.shape ? (
            <ShapeAppearanceFields
              capabilities={capabilities}
              elements={elements}
              labels={labels}
              onPatchCommit={onPatchCommit}
            />
          ) : null}
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}

function TextRoleField({
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "labels" | "onPatchCommit">) {
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
}: Pick<GroupInspectorProps, "elements" | "labels" | "onPatchCommit">) {
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
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "labels" | "onPatchCommit">) {
  const text = elements as readonly Extract<
    EditorElement,
    { readonly type: "text" }
  >[];
  const font_size = getSharedValue(
    text.map((element) => element.style.fontSize),
  );
  const font_weight = getSharedValue(
    text.map((element) => element.style.fontWeight),
  );
  const color = getSharedValue(text.map((element) => element.style.color));
  const alignment = getSharedValue(
    text.map((element) => element.style.alignment),
  );
  return (
    <>
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
        />
      </Field>
      <Field>
        <FieldLabel>{labels.fontWeight}</FieldLabel>
        <Select
          value={font_weight === null ? null : String(font_weight)}
          onValueChange={(value) => {
            if (value === "400" || value === "700")
              onPatchCommit({ style: { fontWeight: Number(value) } });
          }}
        >
          <SelectTrigger>
            <SelectValue>
              {font_weight === null
                ? "—"
                : font_weight === 700
                  ? labels.fontWeightBold
                  : labels.fontWeightRegular}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="400">{labels.fontWeightRegular}</SelectItem>
              <SelectItem value="700">{labels.fontWeightBold}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>{labels.color}</FieldLabel>
        <ColorControl
          acceptedValue={color ?? "#000000"}
          id="group-text-color"
          label={labels.color}
          value={color ?? "#000000"}
          onChange={() => undefined}
          onCommit={(value) => onPatchCommit({ style: { color: value } })}
        />
      </Field>
      <Field>
        <FieldLabel>{labels.alignment}</FieldLabel>
        <ToggleGroup
          aria-label={labels.alignment}
          className="grid grid-cols-3"
          size="sm"
          variant="ghost"
          value={alignment === null ? [] : [alignment]}
          onValueChange={(value) => {
            if (value[0] !== undefined)
              onPatchCommit({ style: { alignment: value[0] } });
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
        </ToggleGroup>
      </Field>
    </>
  );
}

function ImageAppearanceFields({
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "labels" | "onPatchCommit">) {
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
        />
      </Field>
    </>
  );
}

function ShapeAppearanceFields({
  capabilities,
  elements,
  labels,
  onPatchCommit,
}: Pick<GroupInspectorProps, "elements" | "labels" | "onPatchCommit"> & {
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
  return (
    <>
      <Field>
        <FieldLabel>{labels.fill}</FieldLabel>
        <ColorControl
          acceptedValue={fill ?? "#000000"}
          id="group-shape-fill"
          label={labels.fill}
          value={fill ?? "#000000"}
          onChange={() => undefined}
          onCommit={(value) => onPatchCommit({ style: { fill: value } })}
        />
      </Field>
      {capabilities.shapeBorder ? (
        <Field>
          <FieldLabel>{labels.border}</FieldLabel>
          <ColorControl
            acceptedValue={border ?? "#000000"}
            id="group-shape-border"
            label={labels.border}
            value={border ?? "#000000"}
            onChange={() => undefined}
            onCommit={(value) => onPatchCommit({ style: { border: value } })}
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel>{labels.borderWidth}</FieldLabel>
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
  readonly labels: Record<string, string>;
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
  readonly labels: Record<string, string>;
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
  readonly labels: Record<string, string>;
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
  ...props
}: React.ComponentProps<typeof InspectorDraftInput> & {
  readonly unit: string;
}) {
  return (
    <InputGroup>
      <InspectorDraftInput control="group" {...props} onCommit={onCommit} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
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
  labels: Record<string, string>,
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
function getTextRolePreset(role: (typeof TEXT_ROLES)[number]) {
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
  labels: Record<string, string>,
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
  labels: Record<string, string>,
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
