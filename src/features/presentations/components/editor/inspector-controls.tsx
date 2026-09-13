"use client";

import { ColorControl } from "@/components/ui/color";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";

type Geometry = { readonly x: number; readonly y: number };
type Size = { readonly width: number; readonly height: number };

type InspectorNumericFieldProps = {
  readonly id?: string;
  readonly label?: string;
  readonly ariaLabel?: string;
  readonly prefix?: string;
  readonly leading?: React.ReactNode;
  readonly unit?: string;
  readonly value: number | "";
  readonly min?: number | string;
  readonly disabled?: boolean;
  readonly isValid?: (value: number) => boolean;
  readonly onChange: (value: number) => void;
  readonly onCommit: (value: number) => void;
};

export function InspectorNumericField({
  id,
  label,
  ariaLabel,
  prefix,
  leading,
  unit,
  value,
  min,
  disabled = false,
  isValid = () => true,
  onChange,
  onCommit,
}: InspectorNumericFieldProps) {
  const input = (
    <InputGroup>
      {prefix === undefined && leading === undefined ? null : (
        <InputGroupAddon align="inline-start">
          <InputGroupText>{leading ?? prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InspectorDraftInput
        aria-label={ariaLabel ?? label}
        control="group"
        id={id}
        min={min}
        disabled={disabled}
        type="number"
        value={value}
        isValid={(draft) => isValidNumericDraft(draft, isValid)}
        onCommit={(draft) => onCommit(Number(draft))}
        onDraftChange={(draft) => onChange(Number(draft))}
      />
      {unit === undefined ? null : (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{unit}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  );

  return label === undefined ? (
    input
  ) : (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {input}
    </Field>
  );
}

type InspectorColorFieldProps = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly acceptedValue: string;
  readonly onChange: (value: string) => void;
  readonly onCommit: (value: string) => void;
};

export function InspectorColorField({
  id,
  label,
  value,
  acceptedValue,
  onChange,
  onCommit,
}: InspectorColorFieldProps) {
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

type InspectorGeometryPairProps<T extends Geometry | Size> = {
  readonly label: string;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly firstPrefix: string;
  readonly secondPrefix: string;
  readonly unit?: string;
  readonly value: T;
  readonly minimum?: number;
  readonly onChange: (value: T) => void;
  readonly onCommit: (value: T) => void;
};

export function InspectorGeometryPair<T extends Geometry | Size>({
  label,
  firstLabel,
  secondLabel,
  firstPrefix,
  secondPrefix,
  unit,
  value,
  minimum,
  onChange,
  onCommit,
}: InspectorGeometryPairProps<T>) {
  const is_position = "x" in value;
  const first = is_position ? value.x : value.width;
  const second = is_position ? value.y : value.height;
  const update = (first_value: number, second_value: number) =>
    (is_position
      ? { x: first_value, y: second_value }
      : { width: first_value, height: second_value }) as T;

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <InspectorNumericField
          ariaLabel={firstLabel}
          isValid={(number) => minimum === undefined || number >= minimum}
          min={minimum}
          prefix={firstPrefix}
          unit={unit}
          value={first}
          onChange={(next) => onChange(update(next, second))}
          onCommit={(next) => onCommit(update(next, second))}
        />
        <InspectorNumericField
          ariaLabel={secondLabel}
          isValid={(number) => minimum === undefined || number >= minimum}
          min={minimum}
          prefix={secondPrefix}
          unit={unit}
          value={second}
          onChange={(next) => onChange(update(first, next))}
          onCommit={(next) => onCommit(update(first, next))}
        />
      </div>
    </Field>
  );
}
