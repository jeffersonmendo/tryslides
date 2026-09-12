"use client";

import {
  IconAlignCenter,
  IconAlignLeft2,
  IconAlignRight2,
  IconChevronDown,
  IconChevronsDown,
  IconChevronsUp,
  IconChevronUp,
  IconLayoutAlignBottomFilled,
  IconLayoutAlignCenterFilled,
  IconLayoutAlignLeftFilled,
  IconLayoutAlignMiddleFilled,
  IconLayoutAlignRightFilled,
  IconLayoutAlignTopFilled,
} from "@tabler/icons-react";
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
import type {
  ElementPatch,
  ElementPosition,
} from "@/features/presentations/core/presentation-core";
import type { EditorTextElement, EditorTextStyle } from "./editor-model";
import {
  InspectorDraftInput,
  InspectorDraftTextarea,
  isValidNumericDraft,
} from "./inspector-draft-input";

type TextInspectorProps = {
  readonly text: EditorTextElement;
  readonly acceptedColor: string;
  readonly labels: {
    readonly alignment: string;
    readonly layoutAlign: string;
    readonly alignmentCenter: string;
    readonly alignmentLeft: string;
    readonly alignmentRight: string;
    readonly color: string;
    readonly content: string;
    readonly fontSize: string;
    readonly fontWeight: string;
    readonly fontWeightBold: string;
    readonly fontWeightRegular: string;
    readonly role: string;
    readonly textRoleH1: string;
    readonly textRoleH2: string;
    readonly textRoleH3: string;
    readonly textRoleParagraph: string;
    readonly position: string;
    readonly x: string;
    readonly y: string;
    readonly centerHorizontally: string;
    readonly centerVertically: string;
    readonly alignLeft: string;
    readonly alignRight: string;
    readonly alignTop: string;
    readonly alignBottom: string;
    readonly size: string;
    readonly width: string;
    readonly height: string;
    readonly properties: string;
    readonly appearance: string;
    readonly layers: string;
    readonly transform: string;
    readonly moveForward: string;
    readonly moveBackward: string;
    readonly bringToFront: string;
    readonly sendToBack: string;
    readonly rotation: string;
    readonly opacity: string;
  };
  readonly elementIndex: number;
  readonly elementCount: number;
  readonly onContentChange: (content: string) => void;
  readonly onContentCommit: (content: string) => void;
  readonly onAlign: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  readonly onPositionChange: (position: ElementPosition) => void;
  readonly onSizeChange: (size: {
    readonly width: number;
    readonly height: number;
  }) => void;
  readonly onStyleChange: (style: Partial<EditorTextStyle>) => void;
  readonly onStyleCommit: (style: Partial<EditorTextStyle>) => void;
  readonly onStyleApply: (style: Partial<EditorTextStyle>) => void;
  readonly onBringForward: () => void;
  readonly onBringToFront: () => void;
  readonly onSendBackward: () => void;
  readonly onSendToBack: () => void;
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
};

const TEXT_ROLES = ["H1", "H2", "H3", "Paragraph"] as const;
export function TextInspector({
  text,
  acceptedColor,
  labels,
  elementIndex,
  elementCount,
  onContentChange,
  onContentCommit,
  onAlign,
  onPositionChange,
  onSizeChange,
  onStyleChange,
  onStyleCommit,
  onStyleApply,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onPatch,
  onPatchCommit,
}: TextInspectorProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.content}
        </FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <InspectorDraftTextarea
              aria-label={labels.content}
              id={`text-content-${text.id}`}
              value={text.content}
              onCommit={onContentCommit}
              onDraftChange={onContentChange}
            />
          </Field>
          <Field>
            <FieldLabel>{labels.role}</FieldLabel>
            <Select
              value={text.style.role}
              onValueChange={(role) => {
                if (role !== null && isTextRole(role)) {
                  onStyleApply({ role, ...getTextRolePreset(role) });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {getTextRoleLabel(text.style.role, labels)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TEXT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getTextRoleLabel(role, labels)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.transform}
        </FieldLegend>
        <FieldGroup className="gap-4">
          <PositionFields
            labels={labels}
            position={text.position}
            onPositionChange={onPositionChange}
            onPositionCommit={(position) => onPatchCommit({ position })}
          />
          <Field>
            <FieldLabel>{labels.size}</FieldLabel>
            <div className="flex gap-2">
              <UnitDraftInput
                aria-label={labels.width}
                context="W"
                min="1"
                type="number"
                value={text.size.width}
                isValid={(value) =>
                  isValidNumericDraft(value, (number) => number > 0)
                }
                onCommit={(value) =>
                  onPatchCommit({
                    size: { width: Number(value), height: text.size.height },
                  })
                }
                onDraftChange={(value) =>
                  onSizeChange({
                    width: Number(value),
                    height: text.size.height,
                  })
                }
              />
              <UnitDraftInput
                aria-label={labels.height}
                context="H"
                min="1"
                type="number"
                value={text.size.height}
                isValid={(value) =>
                  isValidNumericDraft(value, (number) => number > 0)
                }
                onCommit={(value) =>
                  onPatchCommit({
                    size: { width: text.size.width, height: Number(value) },
                  })
                }
                onDraftChange={(value) =>
                  onSizeChange({
                    width: text.size.width,
                    height: Number(value),
                  })
                }
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>{labels.layoutAlign}</FieldLabel>
            <ToggleGroup
              className="grid grid-cols-3"
              size="sm"
              value={[]}
              variant="ghost"
            >
              <PositionIconToggleItem
                icon={<IconLayoutAlignLeftFilled stroke={2} />}
                label={labels.alignLeft}
                onClick={() => onAlign("left")}
              />
              <PositionIconToggleItem
                icon={<IconLayoutAlignCenterFilled stroke={2} />}
                label={labels.centerHorizontally}
                onClick={() => onAlign("center")}
              />
              <PositionIconToggleItem
                icon={<IconLayoutAlignRightFilled stroke={2} />}
                label={labels.alignRight}
                onClick={() => onAlign("right")}
              />
              <PositionIconToggleItem
                icon={<IconLayoutAlignTopFilled stroke={2} />}
                label={labels.alignTop}
                onClick={() => onAlign("top")}
              />
              <PositionIconToggleItem
                icon={<IconLayoutAlignMiddleFilled stroke={2} />}
                label={labels.centerVertically}
                onClick={() => onAlign("middle")}
              />
              <PositionIconToggleItem
                icon={<IconLayoutAlignBottomFilled stroke={2} />}
                label={labels.alignBottom}
                onClick={() => onAlign("bottom")}
              />
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel>{labels.layers}</FieldLabel>
            <ToggleGroup
              className="grid grid-cols-4"
              size="sm"
              value={[]}
              variant="ghost"
            >
              <PositionIconToggleItem
                disabled={elementIndex === 0}
                icon={<IconChevronsDown stroke={2} />}
                label={labels.sendToBack}
                onClick={onSendToBack}
              />
              <PositionIconToggleItem
                disabled={elementIndex === 0}
                icon={<IconChevronDown stroke={2} />}
                label={labels.moveBackward}
                onClick={onSendBackward}
              />
              <PositionIconToggleItem
                disabled={elementIndex === elementCount - 1}
                icon={<IconChevronUp stroke={2} />}
                label={labels.moveForward}
                onClick={onBringForward}
              />
              <PositionIconToggleItem
                disabled={elementIndex === elementCount - 1}
                icon={<IconChevronsUp stroke={2} />}
                label={labels.bringToFront}
                onClick={onBringToFront}
              />
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor={`rotation-${text.id}`}>
              {labels.rotation}
            </FieldLabel>
            <UnitDraftInput
              id={`rotation-${text.id}`}
              type="number"
              unit="°"
              value={text.rotation}
              isValid={(value) => isValidNumericDraft(value, () => true)}
              onCommit={(value) => onPatchCommit({ rotation: Number(value) })}
              onDraftChange={(value) => onPatch({ rotation: Number(value) })}
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
            <FieldLabel htmlFor={`opacity-${text.id}`}>
              {labels.opacity}
            </FieldLabel>
            <UnitDraftInput
              id={`opacity-${text.id}`}
              max="100"
              min="0"
              type="number"
              unit="%"
              value={text.opacity * 100}
              isValid={(value) =>
                isValidNumericDraft(
                  value,
                  (number) => number >= 0 && number <= 100,
                )
              }
              onCommit={(value) =>
                onPatchCommit({ opacity: Number(value) / 100 })
              }
              onDraftChange={(value) =>
                onPatch({ opacity: Number(value) / 100 })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`text-font-size-${text.id}`}>
              {labels.fontSize}
            </FieldLabel>
            <UnitDraftInput
              id={`text-font-size-${text.id}`}
              min="1"
              type="number"
              unit="px"
              value={text.style.fontSize}
              isValid={(value) =>
                isValidNumericDraft(value, (number) => number > 0)
              }
              onCommit={(value) => onStyleCommit({ fontSize: Number(value) })}
              onDraftChange={(value) =>
                onStyleChange({ fontSize: Number(value) })
              }
            />
          </Field>
          <Field>
            <FieldLabel>{labels.fontWeight}</FieldLabel>
            <Select
              value={String(text.style.fontWeight)}
              onValueChange={(value) => {
                const font_weight = Number(value);
                if (
                  value !== null &&
                  Number.isFinite(font_weight) &&
                  font_weight > 0
                ) {
                  onStyleApply({ fontWeight: font_weight });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {getFontWeightLabel(text.style.fontWeight, labels)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="400">
                    {labels.fontWeightRegular}
                  </SelectItem>
                  <SelectItem value="700">{labels.fontWeightBold}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <ColorField
            acceptedValue={acceptedColor}
            id={`text-color-${text.id}`}
            label={labels.color}
            value={text.style.color}
            onChange={(color) => onStyleChange({ color })}
            onCommit={(color) => onStyleCommit({ color })}
          />
          <Field>
            <FieldLabel>{labels.alignment}</FieldLabel>
            <ToggleGroup
              aria-label={labels.alignment}
              className="grid grid-cols-3"
              size="sm"
              variant="ghost"
              value={[text.style.alignment]}
              onValueChange={(value) => {
                const alignment = value[0];

                if (alignment !== undefined) {
                  onStyleApply({ alignment });
                }
              }}
            >
              <AlignmentToggleItem
                icon={<IconAlignLeft2 stroke={2} />}
                label={labels.alignmentLeft}
                value="left"
              />
              <AlignmentToggleItem
                icon={<IconAlignCenter stroke={2} />}
                label={labels.alignmentCenter}
                value="center"
              />
              <AlignmentToggleItem
                icon={<IconAlignRight2 stroke={2} />}
                label={labels.alignmentRight}
                value="right"
              />
            </ToggleGroup>
          </Field>
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}

function PositionFields({
  labels,
  position,
  onPositionChange,
  onPositionCommit,
}: {
  readonly labels: TextInspectorProps["labels"];
  readonly position: ElementPosition;
  readonly onPositionChange: TextInspectorProps["onPositionChange"];
  readonly onPositionCommit: TextInspectorProps["onPositionChange"];
}) {
  return (
    <Field>
      <FieldLabel>{labels.position}</FieldLabel>
      <div className="flex gap-2">
        <UnitDraftInput
          aria-label={labels.x}
          context={labels.x}
          type="number"
          value={position.x}
          isValid={(value) => isValidNumericDraft(value, () => true)}
          onCommit={(value) =>
            onPositionCommit({ x: Number(value), y: position.y })
          }
          onDraftChange={(value) =>
            onPositionChange({ x: Number(value), y: position.y })
          }
        />
        <UnitDraftInput
          aria-label={labels.y}
          context={labels.y}
          type="number"
          value={position.y}
          isValid={(value) => isValidNumericDraft(value, () => true)}
          onCommit={(value) =>
            onPositionCommit({ x: position.x, y: Number(value) })
          }
          onDraftChange={(value) =>
            onPositionChange({ x: position.x, y: Number(value) })
          }
        />
      </div>
    </Field>
  );
}

function UnitDraftInput({
  onCommit,
  context,
  unit,
  ...props
}: React.ComponentProps<typeof InspectorDraftInput> & {
  readonly context?: string;
  readonly unit?: string;
}) {
  return (
    <InputGroup>
      {context === undefined ? null : (
        <InputGroupAddon align="inline-start">
          <InputGroupText>{context}</InputGroupText>
        </InputGroupAddon>
      )}
      <InspectorDraftInput control="group" {...props} onCommit={onCommit} />
      {unit === undefined ? null : (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

function ColorField({
  acceptedValue,
  id,
  label,
  value,
  onChange,
  onCommit,
}: {
  readonly acceptedValue: string;
  readonly id: string;
  readonly label: string;
  readonly value: string;
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
        onChange={onChange}
        onCommit={onCommit}
      />
    </Field>
  );
}

function PositionIconToggleItem({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <ToggleGroupItem
            aria-label={label}
            disabled={disabled}
            value={label}
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

function AlignmentToggleItem({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: "left" | "center" | "right";
}) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <ToggleGroupItem aria-label={label} value={value}>
            {icon}
          </ToggleGroupItem>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function isTextRole(value: string): value is EditorTextStyle["role"] {
  return TEXT_ROLES.includes(value as EditorTextStyle["role"]);
}

function getTextRolePreset(role: EditorTextStyle["role"]) {
  switch (role) {
    case "H1":
      return { fontSize: 64, fontWeight: 700 };
    case "H2":
      return { fontSize: 48, fontWeight: 700 };
    case "H3":
      return { fontSize: 32, fontWeight: 700 };
    case "Paragraph":
      return { fontSize: 16, fontWeight: 400 };
  }
}

function getTextRoleLabel(
  role: EditorTextStyle["role"],
  labels: TextInspectorProps["labels"],
): string {
  switch (role) {
    case "H1":
      return labels.textRoleH1;
    case "H2":
      return labels.textRoleH2;
    case "H3":
      return labels.textRoleH3;
    case "Paragraph":
      return labels.textRoleParagraph;
  }
}

function getFontWeightLabel(
  font_weight: number,
  labels: TextInspectorProps["labels"],
): string {
  return font_weight === 700 ? labels.fontWeightBold : labels.fontWeightRegular;
}
