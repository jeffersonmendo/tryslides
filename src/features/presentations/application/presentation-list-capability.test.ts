import assert from "node:assert/strict";
import test from "node:test";

import { PresentationCommands } from "./presentation-commands";
import { createPresentationListCapability } from "./presentation-list-capability";
import type {
  AcknowledgePresentationSaveInput,
  PersistedPresentation,
  PresentationCard,
  PresentationRepository,
} from "./presentation-repository";

const PRESENTATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const PUBLIC_ID = "Ab3xYz";
const CREATED_AT = "2026-09-07T12:00:00.000Z";

test("exposes local presentation listing and creation through an application capability", async () => {
  const repository = new MemoryPresentationRepository([
    {
      id: PRESENTATION_ID,
      publicId: PUBLIC_ID,
      title: "Existing presentation",
      status: "draft",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      lastSavedAt: CREATED_AT,
      lastPublishedAt: null,
      coverBackground: null,
    },
  ]);
  const commands = new PresentationCommands(
    repository,
    {
      createPresentationId: () => PRESENTATION_ID,
      createPublicId: () => PUBLIC_ID,
      createSlideId: () => "slide_1",
      createLocalOperationId: () => "operation_1",
    },
    createClock(),
  );
  const capability = createPresentationListCapability(repository, commands);

  assert.deepEqual(await capability.listPresentations(), repository.cards);

  const created = await capability.createPresentation({
    title: "New presentation",
  });

  assert.equal(created.success, true);
  if (!created.success) return;
  assert.equal(created.state.slides.length, 1);
  assert.equal(repository.saved.length, 2);
  assert.equal(repository.acknowledged.length, 2);
});

class MemoryPresentationRepository implements PresentationRepository {
  readonly saved: PersistedPresentation[] = [];
  readonly acknowledged: AcknowledgePresentationSaveInput[] = [];

  constructor(readonly cards: readonly PresentationCard[]) {}

  async save(presentation: PersistedPresentation): Promise<void> {
    this.saved.push(presentation);
  }

  async acknowledgeLocalSave(
    input: AcknowledgePresentationSaveInput,
  ): Promise<void> {
    this.acknowledged.push(input);
  }

  async load(): Promise<null> {
    return null;
  }

  async list(): Promise<readonly PresentationCard[]> {
    return this.cards;
  }

  async delete(): Promise<"not-found"> {
    return "not-found";
  }
}

function createClock() {
  let timestamp = Date.parse(CREATED_AT);

  return {
    now: () => {
      timestamp += 1;
      return new Date(timestamp).toISOString();
    },
  };
}
