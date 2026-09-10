"use client";

import {
  createEditorCapability,
  type EditorCapability,
} from "@/features/presentations/application/editor-capability";
import { createLocalPresentationDependencies } from "./local-presentation-bootstrap";

export function createLocalEditorCapability(): EditorCapability {
  const { repository, commands } = createLocalPresentationDependencies();

  return createEditorCapability(repository, commands);
}
