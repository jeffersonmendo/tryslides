import type { PresentationState } from "@/features/presentations/core/presentation-core";
import { createSlide } from "@/features/presentations/core/presentation-core";

import type {
  PresentationCommandResult,
  PresentationCommands,
} from "./presentation-commands";
import type { PresentationRepository } from "./presentation-repository";
import {
  type LoadPresentationResult,
  loadPresentation,
} from "./save-presentation";

export type EditorCapability = {
  loadPresentation(presentation_id: string): Promise<LoadPresentationResult>;
  createSlide(state: PresentationState): Promise<PresentationCommandResult>;
  undo(state: PresentationState): Promise<PresentationCommandResult>;
  redo(state: PresentationState): Promise<PresentationCommandResult>;
};

export function createEditorCapability(
  repository: PresentationRepository,
  commands: PresentationCommands,
): EditorCapability {
  return {
    loadPresentation: (presentation_id) =>
      loadPresentation(repository, presentation_id),
    createSlide: (state) =>
      commands.execute(state, (current_state, input) =>
        createSlide(current_state, {
          id: commands.createSlideId(),
          ...input,
        }),
      ),
    undo: (state) => commands.undo(state),
    redo: (state) => commands.redo(state),
  };
}
