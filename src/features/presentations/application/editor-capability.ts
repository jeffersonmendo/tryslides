import type {
  AnimationConfigurationInput,
  ElementPatch,
  ElementPosition,
  ElementSize,
  PresentationState,
  ShapeElement,
  SlideBackground,
  TextStylePatch,
  TransitionConfigurationInput,
} from "@/features/presentations/core/presentation-core";
import {
  bringForward,
  bringToFront,
  configureAnimation,
  configureTransition,
  createElement,
  createElements,
  createSlide,
  deleteElement,
  deleteSlide,
  duplicateSlide,
  editElement,
  editElements,
  editSlide,
  moveElement,
  PRESENTATION_CANVAS,
  redoPresentation,
  redoSlide,
  reorderSlide,
  resizeElement,
  sendBackward,
  sendToBack,
  undoPresentation,
  undoSlide,
} from "@/features/presentations/core/presentation-core";

import { loadLocalAsset } from "./local-assets";
import type {
  PreparedPresentationCommandResult,
  PresentationCommands,
} from "./presentation-commands";
import type {
  LocalAsset,
  LocalAssetRepository,
  PresentationRepository,
} from "./presentation-repository";
import {
  type LoadPresentationResult,
  loadPresentation,
} from "./save-presentation";

export type EditorCapability = {
  loadPresentation(presentation_id: string): Promise<LoadPresentationResult>;
  createSlide(state: PresentationState): PreparedPresentationCommandResult;
  duplicateSlide(
    state: PresentationState,
    input: { readonly slideId: string },
  ): PreparedPresentationCommandResult;
  deleteSlide(
    state: PresentationState,
    input: { readonly slideId: string },
  ): PreparedPresentationCommandResult;
  reorderSlide(
    state: PresentationState,
    input: { readonly slideId: string; readonly afterSlideId: string | null },
  ): PreparedPresentationCommandResult;
  createTextElement(
    state: PresentationState,
    input: { readonly slideId: string; readonly content: string },
  ): PreparedPresentationCommandResult;
  editTextElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly content?: string;
      readonly style?: TextStylePatch;
    },
  ): PreparedPresentationCommandResult;
  createShapeElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly shapeType: ShapeElement["shapeType"];
    },
  ): PreparedPresentationCommandResult;
  createImageElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly file: File;
      readonly naturalSize: ElementSize;
    },
  ): PreparedPresentationCommandResult;
  createImageElements(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly images: readonly ImageImportInput[];
    },
  ): PreparedPresentationCommandResult;
  editElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly patch: ElementPatch;
    },
  ): PreparedPresentationCommandResult;
  editElements(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementIds: readonly string[];
      readonly patch: ElementPatch;
    },
  ): PreparedPresentationCommandResult;
  deleteElement(
    state: PresentationState,
    input: { readonly slideId: string; readonly elementId: string },
  ): PreparedPresentationCommandResult;
  moveElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly position: ElementPosition;
    },
  ): PreparedPresentationCommandResult;
  resizeElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly size: ElementSize;
    },
  ): PreparedPresentationCommandResult;
  bringForward(
    state: PresentationState,
    input: { readonly slideId: string; readonly elementId: string },
  ): PreparedPresentationCommandResult;
  sendBackward(
    state: PresentationState,
    input: { readonly slideId: string; readonly elementId: string },
  ): PreparedPresentationCommandResult;
  bringToFront(
    state: PresentationState,
    input: { readonly slideId: string; readonly elementId: string },
  ): PreparedPresentationCommandResult;
  sendToBack(
    state: PresentationState,
    input: { readonly slideId: string; readonly elementId: string },
  ): PreparedPresentationCommandResult;
  alignElement(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly alignment:
        | "left"
        | "center"
        | "right"
        | "top"
        | "middle"
        | "bottom";
    },
  ): PreparedPresentationCommandResult;
  editSlideBackground(
    state: PresentationState,
    input: { readonly slideId: string; readonly background: SlideBackground },
  ): PreparedPresentationCommandResult;
  configureTransition(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly type: string;
      readonly configuration?: TransitionConfigurationInput;
    },
  ): PreparedPresentationCommandResult;
  configureAnimation(
    state: PresentationState,
    input: {
      readonly slideId: string;
      readonly elementId: string;
      readonly type: string;
      readonly configuration?: AnimationConfigurationInput;
    },
  ): PreparedPresentationCommandResult;
  loadAsset(asset_id: string): ReturnType<typeof loadLocalAsset>;
  undo(state: PresentationState): PreparedPresentationCommandResult;
  redo(state: PresentationState): PreparedPresentationCommandResult;
  undoSlide(
    state: PresentationState,
    input: { readonly slideId: string },
  ): PreparedPresentationCommandResult;
  redoSlide(
    state: PresentationState,
    input: { readonly slideId: string },
  ): PreparedPresentationCommandResult;
  undoPresentation(state: PresentationState): PreparedPresentationCommandResult;
  redoPresentation(state: PresentationState): PreparedPresentationCommandResult;
};

/** Browser input already validated and decoded at the UI boundary. */
export type ImageImportInput = {
  readonly file: File;
  readonly naturalSize: ElementSize;
};

export function createEditorCapability(
  repository: PresentationRepository,
  commands: PresentationCommands,
): EditorCapability {
  return {
    loadPresentation: (presentation_id) =>
      loadPresentation(repository, presentation_id),
    createSlide: (state) =>
      commands.prepare(state, (current_state, input) =>
        createSlide(current_state, {
          id: commands.createSlideId(),
          ...input,
        }),
      ),
    duplicateSlide: (state, input) =>
      commands.prepare(state, (current_state, command_input) => {
        const slide = current_state.slides.find(
          (current) => current.id === input.slideId,
        );
        return duplicateSlide(current_state, {
          ...input,
          id: commands.createSlideId(),
          elementIds: Object.fromEntries(
            (slide?.elements ?? []).map((element) => [
              element.id,
              commands.createElementId(),
            ]),
          ),
          ...command_input,
        });
      }),
    deleteSlide: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        deleteSlide(current_state, { ...input, ...command_input }),
      ),
    reorderSlide: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        reorderSlide(current_state, { ...input, ...command_input }),
      ),
    createTextElement: (state, text_input) =>
      commands.prepare(state, (current_state, command_input) =>
        createElement(current_state, {
          slideId: text_input.slideId,
          element: {
            id: commands.createElementId(),
            type: "text",
            content: text_input.content,
            ...createTextElementLayout(text_input.content),
            rotation: 0,
            opacity: 1,
            style: { fontSize: 32, fontWeight: 400 },
          },
          ...command_input,
        }),
      ),
    editTextElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        editElement(current_state, {
          ...input,
          patch: {
            ...(input.content === undefined ? {} : { content: input.content }),
            ...(input.style === undefined ? {} : { style: input.style }),
          },
          ...command_input,
        }),
      ),
    createShapeElement: (state, shape_input) =>
      commands.prepare(state, (current_state, command_input) =>
        createElement(current_state, {
          slideId: shape_input.slideId,
          element: {
            id: commands.createElementId(),
            type: "shape",
            shapeType: shape_input.shapeType,
            position: { x: 660, y: 360 },
            size: { width: 600, height: 360 },
            rotation: 0,
            opacity: 1,
          },
          ...command_input,
        }),
      ),
    createImageElement: (state, image_input) => {
      const asset = createLocalImageAsset(state.id, image_input, commands);
      return commands.prepareWithLocalAsset(
        state,
        asset,
        (current_state, command_input) =>
          createElement(current_state, {
            slideId: image_input.slideId,
            element: {
              id: commands.createElementId(),
              type: "image",
              assetId: asset.metadata.id,
              ...createImageElementLayout(image_input.naturalSize, 0),
              rotation: 0,
              opacity: 1,
              style: { objectFit: "contain" },
            },
            ...command_input,
          }),
      );
    },
    createImageElements: (state, image_input) => {
      if (
        image_input.images.length === 0 ||
        image_input.images.length > MAX_IMAGE_IMPORT_COUNT
      )
        return commands.prepare(state, (current_state, command_input) =>
          createElements(current_state, {
            slideId: image_input.slideId,
            elements: [],
            ...command_input,
          }),
        );
      const assets = image_input.images.map((image) =>
        createLocalImageAsset(state.id, image, commands),
      );
      return commands.prepareWithLocalAssets(
        state,
        assets,
        (current_state, command_input) =>
          createElements(current_state, {
            slideId: image_input.slideId,
            elements: image_input.images.map((image, index) => ({
              id: commands.createElementId(),
              type: "image" as const,
              assetId: assets[index]?.metadata.id ?? "",
              ...createImageElementLayout(image.naturalSize, index),
              rotation: 0,
              opacity: 1,
              style: { objectFit: "contain" },
            })),
            ...command_input,
          }),
      );
    },
    editElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        editElement(current_state, {
          ...input,
          patch: input.patch,
          ...command_input,
        }),
      ),
    editElements: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        editElements(current_state, { ...input, ...command_input }),
      ),
    deleteElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        deleteElement(current_state, { ...input, ...command_input }),
      ),
    moveElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        moveElement(current_state, { ...input, ...command_input }),
      ),
    resizeElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        resizeElement(current_state, { ...input, ...command_input }),
      ),
    bringForward: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        bringForward(current_state, { ...input, ...command_input }),
      ),
    sendBackward: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        sendBackward(current_state, { ...input, ...command_input }),
      ),
    bringToFront: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        bringToFront(current_state, { ...input, ...command_input }),
      ),
    sendToBack: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        sendToBack(current_state, { ...input, ...command_input }),
      ),
    alignElement: (state, input) =>
      commands.prepare(state, (current_state, command_input) => {
        const element = current_state.slides
          .find((slide) => slide.id === input.slideId)
          ?.elements.find((current) => current.id === input.elementId);
        if (element === undefined)
          return editElement(current_state, {
            ...input,
            patch: {},
            ...command_input,
          });
        return editElement(current_state, {
          ...input,
          patch: {
            position: getAlignedElementPosition(
              element.position,
              element.size,
              current_state.canvas,
              input.alignment,
            ),
          },
          ...command_input,
        });
      }),
    editSlideBackground: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        editSlide(current_state, {
          ...input,
          patch: { background: input.background },
          ...command_input,
        }),
      ),
    configureTransition: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        configureTransition(current_state, { ...input, ...command_input }),
      ),
    configureAnimation: (state, input) =>
      commands.prepare(state, (current_state, command_input) =>
        configureAnimation(current_state, { ...input, ...command_input }),
      ),
    loadAsset: (asset_id) =>
      loadLocalAsset(repository as unknown as LocalAssetRepository, asset_id),
    undo: (state) => commands.prepareUndo(state),
    redo: (state) => commands.prepareRedo(state),
    undoSlide: (state, input) =>
      commands.prepare(state, (current_state) =>
        undoSlide(current_state, input.slideId),
      ),
    redoSlide: (state, input) =>
      commands.prepare(state, (current_state) =>
        redoSlide(current_state, input.slideId),
      ),
    undoPresentation: (state) =>
      commands.prepare(state, (current_state) =>
        undoPresentation(current_state),
      ),
    redoPresentation: (state) =>
      commands.prepare(state, (current_state) =>
        redoPresentation(current_state),
      ),
  };
}

function getAlignedElementPosition(
  position: ElementPosition,
  size: ElementSize,
  canvas: { readonly width: number; readonly height: number },
  alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
): ElementPosition {
  switch (alignment) {
    case "left":
      return { x: 0, y: position.y };
    case "center":
      return { x: (canvas.width - size.width) / 2, y: position.y };
    case "right":
      return { x: canvas.width - size.width, y: position.y };
    case "top":
      return { x: position.x, y: 0 };
    case "middle":
      return { x: position.x, y: (canvas.height - size.height) / 2 };
    case "bottom":
      return { x: position.x, y: canvas.height - size.height };
  }
}

const IMAGE_MAX_WIDTH = PRESENTATION_CANVAS.width * 0.2;
const IMAGE_MAX_HEIGHT = PRESENTATION_CANVAS.height * 0.2;
const MAX_IMAGE_IMPORT_COUNT = 10;
const TEXT_MIN_WIDTH = 160;
const TEXT_MAX_WIDTH = 720;
const TEXT_HEIGHT = 96;

function createTextElementLayout(content: string): {
  readonly position: ElementPosition;
  readonly size: ElementSize;
} {
  const width = Math.min(
    TEXT_MAX_WIDTH,
    Math.max(TEXT_MIN_WIDTH, content.trim().length * 22 + 48),
  );
  return {
    position: {
      x: (PRESENTATION_CANVAS.width - width) / 2,
      y: (PRESENTATION_CANVAS.height - TEXT_HEIGHT) / 2,
    },
    size: { width, height: TEXT_HEIGHT },
  };
}
const IMAGE_POSITION_OFFSETS = [
  { x: 0, y: 0 },
  { x: -48, y: -32 },
  { x: 48, y: -32 },
  { x: -64, y: 24 },
  { x: 64, y: 24 },
  { x: -24, y: 56 },
  { x: 24, y: -56 },
  { x: -72, y: -8 },
  { x: 72, y: -8 },
  { x: 0, y: 72 },
] as const;

function getContainedImageSize(natural_size: ElementSize): ElementSize {
  const scale = Math.min(
    1,
    IMAGE_MAX_WIDTH / natural_size.width,
    IMAGE_MAX_HEIGHT / natural_size.height,
  );
  return {
    width: Math.max(1, natural_size.width * scale),
    height: Math.max(1, natural_size.height * scale),
  };
}

function getCenteredImagePosition(natural_size: ElementSize): ElementPosition {
  const size = getContainedImageSize(natural_size);
  return { x: (1920 - size.width) / 2, y: (1080 - size.height) / 2 };
}

function createImageElementLayout(
  natural_size: ElementSize,
  index: number,
): { readonly position: ElementPosition; readonly size: ElementSize } {
  const size = getContainedImageSize(natural_size);
  const centered = getCenteredImagePosition(natural_size);
  const offset = IMAGE_POSITION_OFFSETS[index] ?? IMAGE_POSITION_OFFSETS[0];
  return {
    size,
    position: {
      x: Math.min(1920 - size.width, Math.max(0, centered.x + offset.x)),
      y: Math.min(1080 - size.height, Math.max(0, centered.y + offset.y)),
    },
  };
}

function createLocalImageAsset(
  presentation_id: string,
  image: ImageImportInput,
  commands: PresentationCommands,
): LocalAsset {
  const timestamp = commands.createTimestamp();
  return {
    metadata: {
      id: commands.createElementId(),
      contentType: image.file.type,
      size: image.file.size,
      createdAt: timestamp,
      updatedAt: timestamp,
      presentationIds: [presentation_id],
    },
    binary: image.file,
  };
}
