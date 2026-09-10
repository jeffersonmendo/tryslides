"use client";

import { useMemo } from "react";
import { createLocalEditorCapability } from "@/features/presentations/client/local-editor-capability";
import { EditorController } from "./editor-controller";
import { EditorStoreProvider } from "./editor-store-provider";

type EditorEntryProps = {
  readonly presentationId: string;
};

export function EditorEntry({ presentationId }: EditorEntryProps) {
  const capability = useMemo(createLocalEditorCapability, []);

  return (
    <EditorStoreProvider>
      <EditorController
        capability={capability}
        presentationId={presentationId}
      />
    </EditorStoreProvider>
  );
}
