"use client";

import { PresentationCommands } from "@/features/presentations/application/presentation-commands";
import {
  createPresentationListCapability,
  type PresentationListCapability,
} from "@/features/presentations/application/presentation-list-capability";
import { IndexedDbPresentationRepository } from "@/features/presentations/infrastructure/indexed-db-presentation-repository";

const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const PUBLIC_ID_LENGTH = 6;

export function createLocalPresentationListCapability(): PresentationListCapability {
  const repository = new IndexedDbPresentationRepository();
  const commands = new PresentationCommands(
    repository,
    createBrowserPresentationIdGenerator(),
    createBrowserPresentationClock(),
  );

  return createPresentationListCapability(repository, commands);
}

function createBrowserPresentationIdGenerator() {
  return {
    createPresentationId: () => crypto.randomUUID(),
    createPublicId: createPublicId,
    createSlideId: () => crypto.randomUUID(),
    createElementId: () => crypto.randomUUID(),
    createLocalOperationId: () => crypto.randomUUID(),
  };
}

function createBrowserPresentationClock() {
  let last_timestamp = 0;

  return {
    now: () => {
      const current_timestamp = Date.now();
      const next_timestamp = Math.max(current_timestamp, last_timestamp + 1);
      last_timestamp = next_timestamp;
      return new Date(next_timestamp).toISOString();
    },
  };
}

function createPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PUBLIC_ID_LENGTH));
  return Array.from(
    bytes,
    (byte) => BASE62_ALPHABET[byte % BASE62_ALPHABET.length],
  ).join("");
}
