"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import type { ElementPatch } from "@/features/presentations/core/presentation-core";
import type { EditorElement } from "./editor-model";
import {
  InspectorDraftInput,
  isValidNumericDraft,
} from "./inspector-draft-input";

type GroupInspectorProps = {
  readonly elements: readonly EditorElement[];
  readonly labels: { readonly rotation: string; readonly opacity: string };
  readonly onPatch: (patch: ElementPatch) => void;
  readonly onPatchCommit: (patch: ElementPatch) => void;
};

export function GroupInspector({
  elements,
  labels,
  onPatch,
  onPatchCommit,
}: GroupInspectorProps) {
  const rotation = getSharedValue(elements.map((element) => element.rotation));
  const opacity = getSharedValue(elements.map((element) => element.opacity));
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{labels.rotation}</FieldLabel>
        <UnitInput
          placeholder={rotation === null ? "—" : undefined}
          value={rotation ?? ""}
          isValid={(value) => isValidNumericDraft(value, () => true)}
          unit="°"
          onCommit={(value) => onPatchCommit({ rotation: Number(value) })}
          onDraftChange={(value) => onPatch({ rotation: Number(value) })}
        />
      </Field>
      <Field>
        <FieldLabel>{labels.opacity}</FieldLabel>
        <UnitInput
          max="100"
          min="0"
          placeholder={opacity === null ? "—" : undefined}
          value={opacity === null ? "" : opacity * 100}
          isValid={(value) =>
            isValidNumericDraft(value, (number) => number >= 0 && number <= 100)
          }
          unit="%"
          onCommit={(value) => onPatchCommit({ opacity: Number(value) / 100 })}
          onDraftChange={(value) => onPatch({ opacity: Number(value) / 100 })}
        />
      </Field>
    </FieldGroup>
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

function getSharedValue(values: readonly number[]): number | null {
  return values.every((value) => value === values[0])
    ? (values[0] ?? null)
    : null;
}
