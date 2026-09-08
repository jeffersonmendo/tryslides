"use client";

import { useMemo } from "react";
import { createLocalPresentationListCapability } from "@/features/presentations/client/local-presentation-list-capability";
import { PresentationListController } from "./presentation-list-controller";

export function PresentationListEntry() {
  const capability = useMemo(createLocalPresentationListCapability, []);

  return <PresentationListController capability={capability} />;
}
