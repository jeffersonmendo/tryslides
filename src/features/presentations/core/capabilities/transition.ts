import type { TransitionCapability } from "../types";

/**
 * The Core's source of truth for transition availability and configuration.
 * Commands validate against it while consumers may discover supported options.
 */
export const TRANSITION_CAPABILITIES = [
  {
    id: "none",
    defaults: { duration: 0 },
    configurationSchema: { duration: { minimum: 1 } },
  },
  {
    id: "fade",
    defaults: { duration: 500 },
    configurationSchema: { duration: { minimum: 1 } },
  },
  {
    id: "slide",
    defaults: { duration: 500 },
    configurationSchema: { duration: { minimum: 1 } },
  },
  {
    id: "scale",
    defaults: { duration: 500 },
    configurationSchema: { duration: { minimum: 1 } },
  },
] as const satisfies readonly TransitionCapability[];

export function getTransitionCapability(
  type: string,
): TransitionCapability | undefined {
  return TRANSITION_CAPABILITIES.find((capability) => capability.id === type);
}
