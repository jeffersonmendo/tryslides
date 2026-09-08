import type {
  PresentationCommandResult,
  PresentationCommands,
} from "./presentation-commands";
import type {
  PresentationCard,
  PresentationRepository,
} from "./presentation-repository";

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
