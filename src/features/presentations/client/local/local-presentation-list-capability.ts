"use client";

import {
  createPresentationListCapability,
  type PresentationListCapability,
} from "@/features/presentations/application/presentation-list-capability";
import { createLocalPresentationDependencies } from "./local-presentation-bootstrap";

export function createLocalPresentationListCapability(): PresentationListCapability {
  const { repository, commands } = createLocalPresentationDependencies();

  return createPresentationListCapability(repository, commands);
}
