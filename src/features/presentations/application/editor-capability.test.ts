import assert from "node:assert/strict";
import test from "node:test";
import { createEditorCapability } from "./editor-capability";
import { PresentationCommands } from "./presentation-commands";
import type {
  AcknowledgePresentationSaveInput,
  LocalAsset,
  PersistedPresentation,
  PresentationCard,
  PresentationRepository,
} from "./presentation-repository";

test("creates a line shape through the editor application capability", async () => {
  const repository = new MemoryPresentationRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => "element_1",
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({ title: "Line" });

  assert.equal(presentation.success, true);
  if (!presentation.success) return;

  const result = await capability.createShapeElement(presentation.state, {
    slideId: "slide_1",
    shapeType: "line",
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  const element = result.state.slides[0]?.elements[0];
  assert.equal(element?.type, "shape");
  if (element?.type === "shape") assert.equal(element.shapeType, "line");
});

test("reports a failed element move when persistence rejects the final commit", async () => {
  const repository = new MemoryPresentationRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => "element_1",
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({ title: "Move" });

  assert.equal(presentation.success, true);
  if (!presentation.success) return;
  const created = await capability.createShapeElement(presentation.state, {
    slideId: "slide_1",
    shapeType: "rectangle",
  });

  assert.equal(created.success, true);
  if (!created.success) return;
  repository.shouldFailSaves = true;
  const prepared = capability.moveElement(created.state, {
    slideId: "slide_1",
    elementId: "element_1",
    position: { x: 720, y: 420 },
  });
  assert.equal(prepared.success, true);
  if (!prepared.success) return;
  const result = await prepared.persist();

  assert.deepEqual(result, {
    success: false,
    code: "PERSISTENCE_WRITE_FAILED",
  });
});

test("deletes an element through the editor application capability", async () => {
  const repository = new MemoryPresentationRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => "element_1",
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({
    title: "Delete",
  });

  assert.equal(presentation.success, true);
  if (!presentation.success) return;
  const created = await capability.createShapeElement(presentation.state, {
    slideId: "slide_1",
    shapeType: "rectangle",
  });

  assert.equal(created.success, true);
  if (!created.success) return;
  const result = await capability.deleteElement(created.state, {
    slideId: "slide_1",
    elementId: "element_1",
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.state.slides[0]?.elements, []);
});

test("aligns an element against the canvas edges and centers using its size", async () => {
  const repository = new MemoryPresentationRepository();
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => "element_1",
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({
    title: "Align",
  });
  assert.equal(presentation.success, true);
  if (!presentation.success) return;
  const created = await capability.createShapeElement(presentation.state, {
    slideId: "slide_1",
    shapeType: "rectangle",
  });
  assert.equal(created.success, true);
  if (!created.success) return;

  const aligned_right = capability.alignElement(created.state, {
    slideId: "slide_1",
    elementId: "element_1",
    alignment: "right",
  });
  assert.equal(aligned_right.success, true);
  if (!aligned_right.success) return;
  assert.deepEqual(aligned_right.state.slides[0]?.elements[0]?.position, {
    x: 1320,
    y: 360,
  });

  const aligned_bottom = capability.alignElement(aligned_right.state, {
    slideId: "slide_1",
    elementId: "element_1",
    alignment: "bottom",
  });
  assert.equal(aligned_bottom.success, true);
  if (!aligned_bottom.success) return;
  assert.deepEqual(aligned_bottom.state.slides[0]?.elements[0]?.position, {
    x: 1320,
    y: 720,
  });
});

test("duplicates a slide after its source with fresh element IDs and shared asset references", async () => {
  const repository = new AssetMemoryPresentationRepository();
  let slide_number = 0;
  let element_number = 0;
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => `slide_${++slide_number}`,
      createElementId: () => `element_${++element_number}`,
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({
    title: "Duplicate",
  });
  assert.equal(presentation.success, true);
  if (!presentation.success) return;
  const image = await capability.createImageElement(presentation.state, {
    slideId: "slide_1",
    file: new File(["image"], "image.png", { type: "image/png" }),
    naturalSize: { width: 800, height: 400 },
  });
  assert.equal(image.success, true);
  if (!image.success) return;

  const duplicated = capability.duplicateSlide(image.state, {
    slideId: "slide_1",
  });
  assert.equal(duplicated.success, true);
  if (!duplicated.success) return;
  assert.deepEqual(
    duplicated.state.slides.map((slide) => slide.id),
    ["slide_1", "slide_2"],
  );
  assert.notEqual(
    duplicated.state.slides[0]?.elements[0]?.id,
    duplicated.state.slides[1]?.elements[0]?.id,
  );
  assert.equal(duplicated.state.slides[0]?.elements[0]?.type, "image");
  assert.equal(duplicated.state.slides[1]?.elements[0]?.type, "image");
  if (
    duplicated.state.slides[0]?.elements[0]?.type === "image" &&
    duplicated.state.slides[1]?.elements[0]?.type === "image"
  )
    assert.equal(
      duplicated.state.slides[0].elements[0].assetId,
      duplicated.state.slides[1].elements[0].assetId,
    );
});

test("creates a decoded image batch in selection order with one persisted operation", async () => {
  const repository = new AssetMemoryPresentationRepository();
  let element_number = 0;
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => `element_${++element_number}`,
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({
    title: "Images",
  });
  assert.equal(presentation.success, true);
  if (!presentation.success) return;

  const first = new File(["first"], "first.png", { type: "image/png" });
  const second = new File(["second"], "second.png", { type: "image/png" });
  const prepared = capability.createImageElements(presentation.state, {
    slideId: "slide_1",
    images: [
      { file: first, naturalSize: { width: 1600, height: 900 } },
      { file: second, naturalSize: { width: 800, height: 400 } },
    ],
  });
  assert.equal(prepared.success, true);
  if (!prepared.success) return;
  const result = await prepared.persist();

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.operation?.type, "create-elements");
  assert.equal(
    result.state.undoStack.length,
    presentation.state.undoStack.length + 1,
  );
  assert.equal(repository.savedAssets.length, 2);
  assert.deepEqual(
    result.state.slides[0]?.elements.flatMap((element) =>
      element.type === "image" ? [element.assetId] : [],
    ),
    repository.savedAssets.map((asset) => asset.metadata.id),
  );
  assert.deepEqual(result.state.slides[0]?.elements[0]?.position, {
    x: 768,
    y: 432,
  });
  assert.deepEqual(result.state.slides[0]?.elements[1]?.position, {
    x: 720,
    y: 412,
  });
  assert.deepEqual(result.state.slides[0]?.elements[0]?.size, {
    width: 384,
    height: 216,
  });
  assert.deepEqual(result.state.slides[0]?.elements[1]?.size, {
    width: 384,
    height: 192,
  });
});

test("creates a single image within 20% canvas bounds while preserving its aspect ratio", async () => {
  const repository = new AssetMemoryPresentationRepository();
  let element_number = 0;
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => "550e8400-e29b-41d4-a716-446655440000",
      createPublicId: () => "Ab3xYz",
      createSlideId: () => "slide_1",
      createElementId: () => `element_${++element_number}`,
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createEditorCapability(repository, commands);
  const presentation = await commands.createWithInitialSlide({
    title: "Image",
  });
  assert.equal(presentation.success, true);
  if (!presentation.success) return;

  const result = await capability.createImageElement(presentation.state, {
    slideId: "slide_1",
    file: new File(["image"], "portrait.png", { type: "image/png" }),
    naturalSize: { width: 800, height: 1600 },
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.state.slides[0]?.elements[0]?.size, {
    width: 108,
    height: 216,
  });
  assert.deepEqual(result.state.slides[0]?.elements[0]?.position, {
    x: 906,
    y: 432,
  });
});

class MemoryPresentationRepository implements PresentationRepository {
  shouldFailSaves = false;

  async save(_presentation: PersistedPresentation): Promise<void> {
    if (this.shouldFailSaves) throw new Error("Persistence failed");
  }

  async acknowledgeLocalSave(
    _input: AcknowledgePresentationSaveInput,
  ): Promise<void> {}

  async load(_presentation_id: string): Promise<null> {
    return null;
  }

  async list(): Promise<readonly PresentationCard[]> {
    return [];
  }

  async delete(): Promise<"not-found"> {
    return "not-found";
  }
}

class AssetMemoryPresentationRepository extends MemoryPresentationRepository {
  savedAssets: LocalAsset[] = [];

  async saveWithAsset(
    _presentation: PersistedPresentation,
    asset: LocalAsset,
  ): Promise<void> {
    this.savedAssets = [asset];
  }

  async saveWithAssets(
    _presentation: PersistedPresentation,
    assets: readonly LocalAsset[],
  ): Promise<void> {
    this.savedAssets = [...assets];
  }
}

function createClock() {
  let timestamp = Date.parse("2026-09-08T12:00:00.000Z");

  return {
    now: () => {
      timestamp += 1;
      return new Date(timestamp).toISOString();
    },
  };
}
