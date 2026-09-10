"use client";

import {
  IconAlignBoxCenterMiddle,
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconStackPop,
  IconStackPush,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ColorControl } from "@/components/ui/color";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
    readonly size: string;
    readonly width: string;
    readonly height: string;
    readonly properties: string;
    readonly moveForward: string;
    readonly moveBackward: string;
    readonly rotation: string;
    readonly opacity: string;
  };
  readonly elementIndex: number;
  readonly elementCount: number;
  readonly onContentChange: (content: string) => void;
  readonly onContentCommit: (content: string) => void;
  readonly onCenter: (axis: "horizontal" | "vertical") => void;
  readonly onPositionChange: (position: ElementPosition) => void;
  readonly onSizeChange: (size: {
    readonly width: number;
    readonly height: number;
  }) => void;
  readonly onStyleChange: (style: Partial<EditorTextStyle>) => void;
  readonly onStyleCommit: (style: Partial<EditorTextStyle>) => void;
  readonly onStyleApply: (style: Partial<EditorTextStyle>) => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
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
  onCenter,
  onPositionChange,
  onSizeChange,
  onStyleChange,
  onStyleCommit,
  onStyleApply,
  onBringForward,
  onSendBackward,
  onPatch,
  onPatchCommit,
}: TextInspectorProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`text-content-${text.id}`}>
          {labels.content}
        </FieldLabel>
        <InspectorDraftTextarea
          id={`text-content-${text.id}`}
          value={text.content}
          onCommit={onContentCommit}
          onDraftChange={onContentChange}
        />
      </Field>
      <Field>
        <FieldLabel>
          {labels.rotation} / {labels.opacity}
        </FieldLabel>
        <div className="flex gap-2">
          <UnitDraftInput
            type="number"
            unit="°"
            value={text.rotation}
            isValid={(value) => isValidNumericDraft(value, () => true)}
            onCommit={(value) => onPatchCommit({ rotation: Number(value) })}
            onDraftChange={(value) => onPatch({ rotation: Number(value) })}
          />
          <UnitDraftInput
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
            onDraftChange={(value) => onPatch({ opacity: Number(value) / 100 })}
          />
        </div>
      </Field>
      <PositionFields
        labels={labels}
        position={text.position}
        onCenter={onCenter}
        onPositionChange={onPositionChange}
        onPositionCommit={(position) => onPatchCommit({ position })}
      />
      <Field>
        <FieldLabel>{labels.size}</FieldLabel>
        <div className="flex gap-2">
          <UnitDraftInput
            aria-label={labels.width}
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
              onSizeChange({ width: Number(value), height: text.size.height })
            }
          />
          <UnitDraftInput
            aria-label={labels.height}
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
              onSizeChange({ width: text.size.width, height: Number(value) })
            }
          />
        </div>
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
      <Field>
        <FieldLabel>{labels.properties}</FieldLabel>
        <div className="flex gap-2">
          <PositionIconButton
            disabled={elementIndex === 0}
            icon={<IconStackPush />}
            label={labels.moveBackward}
            onClick={onSendBackward}
          />
          <PositionIconButton
            disabled={elementIndex === elementCount - 1}
            icon={<IconStackPop />}
            label={labels.moveForward}
            onClick={onBringForward}
          />
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor={`text-font-size-${text.id}`}>
          {labels.fontSize}
        </FieldLabel>
        <UnitDraftInput
          id={`text-font-size-${text.id}`}
          min="1"
          type="number"
          value={text.style.fontSize}
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number > 0)
          }
          onCommit={(value) => onStyleCommit({ fontSize: Number(value) })}
          onDraftChange={(value) => onStyleChange({ fontSize: Number(value) })}
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
              <SelectItem value="400">{labels.fontWeightRegular}</SelectItem>
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
          size="sm"
          value={[text.style.alignment]}
          onValueChange={(value) => {
            const alignment = value[0];

            if (alignment !== undefined) {
              onStyleApply({ alignment });
            }
          }}
        >
          <AlignmentToggleItem
            icon={<IconAlignLeft />}
            label={labels.alignmentLeft}
            value="left"
          />
          <AlignmentToggleItem
            icon={<IconAlignCenter />}
            label={labels.alignmentCenter}
            value="center"
          />
          <AlignmentToggleItem
            icon={<IconAlignRight />}
            label={labels.alignmentRight}
            value="right"
          />
        </ToggleGroup>
      </Field>
    </FieldGroup>
  );
}

function PositionFields({
  labels,
  position,
  onCenter,
  onPositionChange,
  onPositionCommit,
}: {
  readonly labels: TextInspectorProps["labels"];
  readonly position: ElementPosition;
  readonly onCenter: TextInspectorProps["onCenter"];
  readonly onPositionChange: TextInspectorProps["onPositionChange"];
  readonly onPositionCommit: TextInspectorProps["onPositionChange"];
}) {
  return (
    <Field>
      <FieldLabel>{labels.position}</FieldLabel>
      <div className="flex gap-2">
        <UnitDraftInput
          aria-label={labels.x}
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
      <div className="flex gap-2">
        <PositionIconButton
          icon={<IconAlignCenter data-icon="inline-start" />}
          label={labels.centerHorizontally}
          onClick={() => onCenter("horizontal")}
        />
        <PositionIconButton
          icon={<IconAlignBoxCenterMiddle data-icon="inline-start" />}
          label={labels.centerVertically}
          onClick={() => onCenter("vertical")}
        />
      </div>
    </Field>
  );
}

function UnitDraftInput({
  onCommit,
  unit = "px",
  ...props
}: React.ComponentProps<typeof InspectorDraftInput> & {
  readonly unit?: string;
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

function PositionIconButton({
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="outline"
            onClick={onClick}
          >
            {icon}
          </Button>
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
    <Tooltip>
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
