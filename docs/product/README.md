# Tryslides Product Documentation

This directory is the source of truth for Tryslides-specific product
behavior and architecture.

General engineering conventions belong in `docs/standards/`.
Technology choices belong in `docs/stack.md`.

The documents here define what Tryslides is and the product-specific
rules required to build it correctly.

## Documents

- [Product](./product.md) — vision, principles, MVP, workflows, and scope.
- [Architecture](./architecture.md) — Presentation Core, renderer, editor,
  commands, boundaries, and architectural invariants.
- [Persistence](./persistence.md) — presentation storage, revisions,
  operations, assets, IndexedDB, and Supabase persistence.
- [Billing](./billing.md) — authentication, subscriptions, pricing, and
  product access.

## Source of Truth

Before implementing product behavior, read the documents relevant to
the task.

Do not invent product behavior, domain rules, persistence behavior, or
architectural conventions already defined here.

If an implementation requires a product or architectural decision that
is not documented, surface the decision instead of silently creating a
new convention.

## Product Principle

Tryslides is built around a presentation domain that is independent
from its interfaces and infrastructure.

Human users, future AI tools, and future MCP clients must operate
through the same validated domain operations.

The UI expresses intent.

The Presentation Core decides how the presentation changes.

The Renderer displays presentation state.

Repositories persist presentation state.

Infrastructure must not become the owner of domain behavior.
