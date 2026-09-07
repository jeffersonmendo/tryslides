import type { AnimationCapability, ElementType } from "../types";

const ELEMENT_TYPES = [
  "text",
  "image",
  "shape",
] as const satisfies readonly ElementType[];
const STANDARD_ANIMATION_SCHEMA = {
  duration: { minimum: 1 },
  delay: { minimum: 0 },
  easing: { minimumLength: 1 },
} as const;
const CONTINUOUS_ANIMATION_SCHEMA = {
  ...STANDARD_ANIMATION_SCHEMA,
  repeat: { minimum: 1, allowsInfinite: true },
  interval: { minimum: 0 },
} as const;

/**
 * The Core's source of truth for animation availability and configuration.
 * Commands validate against it while consumers may discover supported options.
 */
export const ANIMATION_CAPABILITIES = [
  {
    id: "fade-in",
    category: "entrance",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-out" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "slide-in",
    category: "entrance",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-out" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "scale-in",
    category: "entrance",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-out" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "typewriter",
    category: "entrance",
    supportedElementTypes: ["text"],
    defaults: { duration: 500, delay: 0, easing: "ease-out" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "fade-out",
    category: "exit",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-in" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "slide-out",
    category: "exit",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-in" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "scale-out",
    category: "exit",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: { duration: 500, delay: 0, easing: "ease-in" },
    configurationSchema: STANDARD_ANIMATION_SCHEMA,
  },
  {
    id: "float",
    category: "continuous",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: {
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    },
    configurationSchema: CONTINUOUS_ANIMATION_SCHEMA,
  },
  {
    id: "pulse",
    category: "continuous",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: {
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    },
    configurationSchema: CONTINUOUS_ANIMATION_SCHEMA,
  },
  {
    id: "rotate",
    category: "continuous",
    supportedElementTypes: ELEMENT_TYPES,
    defaults: {
      duration: 500,
      delay: 0,
      easing: "ease-in-out",
      repeat: "infinite",
      interval: 0,
    },
    configurationSchema: CONTINUOUS_ANIMATION_SCHEMA,
  },
] as const satisfies readonly AnimationCapability[];

export function getAnimationCapability(
  type: string,
): AnimationCapability | undefined {
  return ANIMATION_CAPABILITIES.find((capability) => capability.id === type);
}
