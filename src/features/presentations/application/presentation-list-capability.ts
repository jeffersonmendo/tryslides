import type {
  PresentationCard,
  PresentationRepository,
} from "./persistence/presentation-repository";
import type {
  PresentationCommandResult,
  PresentationCommands,
} from "./presentation-commands";

export type PresentationListCapability = {
  listPresentations(): Promise<readonly PresentationCard[]>;
  createPresentation(input: {
    readonly title: string;
  }): Promise<PresentationCommandResult>;
};

export function createPresentationListCapability(
  repository: PresentationRepository,
  commands: PresentationCommands,
): PresentationListCapability {
  return {
    listPresentations: () => repository.list(),
    createPresentation: (input) => commands.createWithInitialSlide(input),
  };
}
