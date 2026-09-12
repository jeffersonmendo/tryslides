"use client";

import {
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
  readonly onBringToFront: () => void;
  readonly onSendBackward: () => void;
  readonly onSendToBack: () => void;
  readonly onAlign: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
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
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onAlign,
}: ElementInspectorProps) {
  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.transform}
        </FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>{labels.position}</FieldLabel>
            <div className="flex gap-2">
              <UnitDraftInput
                aria-label={labels.x}
                context={labels.x}
                type="number"
                value={element.position.x}
                isValid={(value) => isValidNumericDraft(value, () => true)}
                onCommit={(value) =>
                  onPatchCommit({
                    position: { x: Number(value), y: element.position.y },
                  })
                }
                onDraftChange={(value) =>
                  onPatch({
                    position: { x: Number(value), y: element.position.y },
                  })
                }
              />
              <UnitDraftInput
                aria-label={labels.y}
                context={labels.y}
                type="number"
                value={element.position.y}
                isValid={(value) => isValidNumericDraft(value, () => true)}
                onCommit={(value) =>
                  onPatchCommit({
                    position: { x: element.position.x, y: Number(value) },
                  })
                }
                onDraftChange={(value) =>
                  onPatch({
                    position: { x: element.position.x, y: Number(value) },
                  })
                }
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>{labels.size}</FieldLabel>
            <div className="flex gap-2">
              <UnitDraftInput
                aria-label={labels.width}
                context="W"
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
                context="H"
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
            <FieldLabel>{labels.layoutAlign}</FieldLabel>
            <ToggleGroup
              className="grid grid-cols-3"
              size="sm"
              value={[]}
              variant="ghost"
            >
              <InspectorIconToggleItem
                icon={<IconLayoutAlignLeftFilled stroke={2} />}
                label={labels.alignLeft}
                onClick={() => onAlign("left")}
              />
              <InspectorIconToggleItem
                icon={<IconLayoutAlignCenterFilled stroke={2} />}
                label={labels.centerHorizontally}
                onClick={() => onAlign("center")}
              />
              <InspectorIconToggleItem
                icon={<IconLayoutAlignRightFilled stroke={2} />}
                label={labels.alignRight}
                onClick={() => onAlign("right")}
              />
              <InspectorIconToggleItem
                icon={<IconLayoutAlignTopFilled stroke={2} />}
                label={labels.alignTop}
                onClick={() => onAlign("top")}
              />
              <InspectorIconToggleItem
                icon={<IconLayoutAlignMiddleFilled stroke={2} />}
                label={labels.centerVertically}
                onClick={() => onAlign("middle")}
              />
              <InspectorIconToggleItem
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
              <InspectorIconToggleItem
                disabled={elementIndex === 0}
                icon={<IconChevronsDown stroke={2} />}
                label={labels.sendToBack}
                onClick={onSendToBack}
              />
              <InspectorIconToggleItem
                disabled={elementIndex === 0}
                icon={<IconChevronDown stroke={2} />}
                label={labels.moveBackward}
                onClick={onSendBackward}
              />
              <InspectorIconToggleItem
                disabled={elementIndex === elementCount - 1}
                icon={<IconChevronUp stroke={2} />}
                label={labels.moveForward}
                onClick={onBringForward}
              />
              <InspectorIconToggleItem
                disabled={elementIndex === elementCount - 1}
                icon={<IconChevronsUp stroke={2} />}
                label={labels.bringToFront}
                onClick={onBringToFront}
              />
            </ToggleGroup>
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
        </FieldGroup>
      </FieldSet>
      <FieldSet>
        <FieldLegend className="text-muted-foreground">
          {labels.appearance}
        </FieldLegend>
        <FieldGroup className="gap-4">
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
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}

function InspectorIconToggleItem({
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
          {labels.shapeType}
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
              <SelectItem value="triangle">{labels.shapeTriangle}</SelectItem>
              <SelectItem value="diamond">{labels.shapeDiamond}</SelectItem>
              <SelectItem value="star">{labels.shapeStar}</SelectItem>
              <SelectItem value="heart">{labels.shapeHeart}</SelectItem>
              <SelectItem value="line">{labels.shapeLine}</SelectItem>
              <SelectItem value="arrow">{labels.shapeArrow}</SelectItem>
              <SelectItem value="double-arrow">
                {labels.shapeDoubleArrow}
              </SelectItem>
              <SelectItem value="speech-bubble">
                {labels.shapeSpeechBubble}
              </SelectItem>
              <SelectItem value="round-bubble">
                {labels.shapeRoundBubble}
              </SelectItem>
              <SelectItem value="plus">{labels.shapePlus}</SelectItem>
              <SelectItem value="minus">{labels.shapeMinus}</SelectItem>
              <SelectItem value="multiply">{labels.shapeMultiply}</SelectItem>
              <SelectItem value="divide">{labels.shapeDivide}</SelectItem>
              <SelectItem value="equal">{labels.shapeEqual}</SelectItem>
              <SelectItem value="not-equal">{labels.shapeNotEqual}</SelectItem>
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
      {isLineShape(element.shapeType) ? null : (
        <ColorField
          id={`border-${element.id}`}
          label={labels.border}
          value={element.style.border}
          acceptedValue={acceptedElement?.style.border ?? element.style.border}
          onChange={(border) => onPatch({ style: { border } })}
          onCommit={(border) => onPatchCommit({ style: { border } })}
        />
      )}
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
      {element.shapeType === "rectangle" ? (
        <UnitStyleField
          id={`radius-${element.id}`}
          label={labels.radius}
          value={element.style.radius}
          onChange={(radius) => onPatch({ style: { radius } })}
          onCommit={(radius) => onPatchCommit({ style: { radius } })}
        />
      ) : null}
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
  return [
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
  ].includes(value);
}

function isLineShape(
  shape_type: Extract<EditorElement, { readonly type: "shape" }>["shapeType"],
): boolean {
  return [
    "line",
    "arrow",
    "double-arrow",
    "plus",
    "minus",
    "multiply",
    "divide",
    "equal",
    "not-equal",
  ].includes(shape_type);
}

function getShapeTypeLabel(
  shape_type: Extract<EditorElement, { readonly type: "shape" }>["shapeType"],
  labels: Record<string, string>,
): string {
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
        unit="px"
        value={value}
        isValid={(next) => isValidNumericDraft(next, (number) => number >= 0)}
        onCommit={(next) => onCommit(Number(next))}
        onDraftChange={(next) => onChange(Number(next))}
      />
    </Field>
  );
}
