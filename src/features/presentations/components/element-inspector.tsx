"use client";

import {
  IconAlignBoxCenterMiddle,
  IconAlignCenter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ElementPatch } from "@/features/presentations/core/presentation-core";
import type { EditorElement } from "./editor-model";
import {
  InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";

type ElementInspectorProps = {
  readonly element: Exclude<EditorElement, { readonly type: "text" }>;
  readonly acceptedElement: EditorElement | null;
  readonly elementIndex: number;
  readonly elementCount: number;
  readonly labels: Record<string, string>;
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
  readonly onCenter: (axis: "horizontal" | "vertical") => void;
};

export function ElementInspector({
  element,
  acceptedElement,
  elementIndex,
  elementCount,
  labels,
  onPatch,
  onPatchCommit,
  onBringForward,
  onSendBackward,
  onCenter,
}: ElementInspectorProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{labels.position}</FieldLabel>
        <div className="flex gap-2">
          <UnitDraftInput
            aria-label={labels.x}
            type="number"
            value={element.position.x}
            isValid={(value) => isValidNumericDraft(value, () => true)}
            onCommit={(value) =>
              onPatchCommit({
                position: { x: Number(value), y: element.position.y },
              })
            }
            onDraftChange={(value) =>
              onPatch({ position: { x: Number(value), y: element.position.y } })
            }
          />
          <UnitDraftInput
            aria-label={labels.y}
            type="number"
            value={element.position.y}
            isValid={(value) => isValidNumericDraft(value, () => true)}
            onCommit={(value) =>
              onPatchCommit({
                position: { x: element.position.x, y: Number(value) },
              })
            }
            onDraftChange={(value) =>
              onPatch({ position: { x: element.position.x, y: Number(value) } })
            }
          />
        </div>
      </Field>
      <Field>
        <FieldLabel>{labels.size}</FieldLabel>
        <div className="flex gap-2">
          <UnitDraftInput
            aria-label={labels.width}
            min="1"
            type="number"
            value={element.size.width}
            isValid={(value) =>
              isValidNumericDraft(value, (number) => number > 0)
            }
            onCommit={(value) =>
              onPatchCommit({
                size: { width: Number(value), height: element.size.height },
              })
            }
            onDraftChange={(value) =>
              onPatch({
                size: { width: Number(value), height: element.size.height },
              })
            }
          />
          <UnitDraftInput
            aria-label={labels.height}
            min="1"
            type="number"
            value={element.size.height}
            isValid={(value) =>
              isValidNumericDraft(value, (number) => number > 0)
            }
            onCommit={(value) =>
              onPatchCommit({
                size: { width: element.size.width, height: Number(value) },
              })
            }
            onDraftChange={(value) =>
              onPatch({
                size: { width: element.size.width, height: Number(value) },
              })
            }
          />
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor={`rotation-${element.id}`}>
          {labels.rotation}
        </FieldLabel>
        <UnitDraftInput
          id={`rotation-${element.id}`}
          type="number"
          value={element.rotation}
          unit="°"
          isValid={(value) => isValidNumericDraft(value, () => true)}
          onCommit={(value) => onPatchCommit({ rotation: Number(value) })}
          onDraftChange={(value) => onPatch({ rotation: Number(value) })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`opacity-${element.id}`}>
          {labels.opacity}
        </FieldLabel>
        <UnitDraftInput
          id={`opacity-${element.id}`}
          max="100"
          min="0"
          step="1"
          type="number"
          unit="%"
          value={element.opacity * 100}
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number >= 0 && number <= 100)
          }
          onCommit={(value) => onPatchCommit({ opacity: Number(value) / 100 })}
          onDraftChange={(value) => onPatch({ opacity: Number(value) / 100 })}
        />
      </Field>
      {element.type === "shape" ? (
        <ShapeFields
          element={element}
          acceptedElement={
            acceptedElement?.type === "shape" ? acceptedElement : null
          }
          labels={labels}
          onPatch={onPatch}
          onPatchCommit={onPatchCommit}
        />
      ) : (
        <ImageFields
          element={element}
          labels={labels}
          onPatch={onPatch}
          onPatchCommit={onPatchCommit}
        />
      )}
      <Field>
        <FieldLabel>{labels.position}</FieldLabel>
        <div className="flex gap-2">
          <InspectorIconButton
            icon={<IconAlignCenter data-icon="inline-start" />}
            label={labels.centerHorizontally}
            onClick={() => onCenter("horizontal")}
          />
          <InspectorIconButton
            icon={<IconAlignBoxCenterMiddle data-icon="inline-start" />}
            label={labels.centerVertically}
            onClick={() => onCenter("vertical")}
          />
        </div>
      </Field>
      <Field>
        <FieldLabel>{labels.properties}</FieldLabel>
        <div className="flex gap-2">
          <InspectorIconButton
            disabled={elementIndex === 0}
            icon={<IconStackPush />}
            label={labels.moveBackward}
            onClick={onSendBackward}
          />
          <InspectorIconButton
            disabled={elementIndex === elementCount - 1}
            icon={<IconStackPop />}
            label={labels.moveForward}
            onClick={onBringForward}
          />
        </div>
      </Field>
    </FieldGroup>
  );
}

function InspectorIconButton({
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

function ShapeFields({
  element,
  acceptedElement,
  labels,
  onPatch,
  onPatchCommit,
}: {
  readonly element: Extract<EditorElement, { readonly type: "shape" }>;
  readonly acceptedElement: Extract<
    EditorElement,
    { readonly type: "shape" }
  > | null;
  readonly labels: Record<string, string>;
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`shape-type-${element.id}`}>
          {labels.addShape}
        </FieldLabel>
        <Select
          value={element.shapeType}
          onValueChange={(value) => {
            if (value !== null && isShapeType(value)) {
              onPatchCommit({ shapeType: value });
            }
          }}
        >
          <SelectTrigger id={`shape-type-${element.id}`}>
            <SelectValue>
              {getShapeTypeLabel(element.shapeType, labels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="rectangle">{labels.shapeRectangle}</SelectItem>
              <SelectItem value="circle">{labels.shapeCircle}</SelectItem>
              <SelectItem value="line">{labels.shapeLine}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <ColorField
        id={`fill-${element.id}`}
        label={labels.fill}
        value={element.style.fill}
        acceptedValue={acceptedElement?.style.fill ?? element.style.fill}
        onChange={(fill) => onPatch({ style: { fill } })}
        onCommit={(fill) => onPatchCommit({ style: { fill } })}
      />
      <ColorField
        id={`border-${element.id}`}
        label={labels.border}
        value={element.style.border}
        acceptedValue={acceptedElement?.style.border ?? element.style.border}
        onChange={(border) => onPatch({ style: { border } })}
        onCommit={(border) => onPatchCommit({ style: { border } })}
      />
      <UnitStyleField
        id={`border-width-${element.id}`}
        label={labels.borderWidth}
        value={element.style.borderWidth}
        onChange={(border_width) =>
          onPatch({ style: { borderWidth: border_width } })
        }
        onCommit={(border_width) =>
          onPatchCommit({ style: { borderWidth: border_width } })
        }
      />
      <UnitStyleField
        id={`radius-${element.id}`}
        label={labels.radius}
        value={element.style.radius}
        onChange={(radius) => onPatch({ style: { radius } })}
        onCommit={(radius) => onPatchCommit({ style: { radius } })}
      />
    </>
  );
}

function ImageFields({
  element,
  labels,
  onPatch,
  onPatchCommit,
}: {
  readonly element: Extract<EditorElement, { readonly type: "image" }>;
  readonly labels: Record<string, string>;
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`fit-${element.id}`}>{labels.fit}</FieldLabel>
        <Select
          value={element.style.objectFit}
          onValueChange={(value) => {
            if (value === "contain" || value === "cover") {
              onPatchCommit({ style: { objectFit: value } });
            }
          }}
        >
          <SelectTrigger id={`fit-${element.id}`}>
            <SelectValue>
              {getImageFitLabel(element.style.objectFit, labels)}
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
      <UnitStyleField
        id={`image-radius-${element.id}`}
        label={labels.radius}
        value={element.style.borderRadius}
        onChange={(border_radius) =>
          onPatch({ style: { borderRadius: border_radius } })
        }
        onCommit={(border_radius) =>
          onPatchCommit({ style: { borderRadius: border_radius } })
        }
      />
    </>
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

function isShapeType(
  value: string,
): value is Extract<EditorElement, { readonly type: "shape" }>["shapeType"] {
  return value === "rectangle" || value === "circle" || value === "line";
}

function getShapeTypeLabel(
  shape_type: Extract<EditorElement, { readonly type: "shape" }>["shapeType"],
  labels: Record<string, string>,
): string {
  return {
    rectangle: labels.shapeRectangle,
    circle: labels.shapeCircle,
    line: labels.shapeLine,
  }[shape_type];
}

function getImageFitLabel(
  object_fit: Extract<
    EditorElement,
    { readonly type: "image" }
  >["style"]["objectFit"],
  labels: Record<string, string>,
): string {
  return object_fit === "contain" ? labels.fitContain : labels.fitCover;
}

function UnitStyleField({
  id,
  label,
  value,
  onChange,
  onCommit,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly onCommit: (value: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <UnitDraftInput
        id={id}
        min="0"
        type="number"
        value={value}
        isValid={(next) => isValidNumericDraft(next, (number) => number >= 0)}
        onCommit={(next) => onCommit(Number(next))}
        onDraftChange={(next) => onChange(Number(next))}
      />
    </Field>
  );
}
