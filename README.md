# Tryslides

Create modern presentations through an MVP workflow in progress.

Tryslides is a modern presentation editor built around a simple idea:

> If you can see it, you can click it. If you can click it, you can edit it.

The editor focuses on direct manipulation, discoverable controls, planned
expressive animations, and a clean presentation workflow without unnecessary
complexity.

## Product

The MVP vision is:

```text
Create → Design → Animate → Present → Share
```

The workflow defines the intended MVP scope. The current implementation is
still focused on Create and Design foundations; Animate, Present, and Share
are planned MVP stages, not currently available workflows. See the
[`ROADMAP.md`](./ROADMAP.md) for the current implementation status.

The MVP includes:

- presentations and slides
- text, images, and shapes
- direct canvas editing
- entrance, exit, and continuous animations (pending)
- slide transitions
- undo and redo
- fullscreen presentation (pending)
- static PDF export (pending)
- public sharing (pending)

AI, MCP, collaboration, advanced timelines, video, audio, and other advanced capabilities are intentionally outside the initial MVP.

## Architecture

Tryslides is built around a persistence-agnostic Presentation Core.

```text
Human → Editor ───────┐
Future AI ────────────┼→ Presentation Core → Presentation State
Future MCP ───────────┘          │
                                 ↓
                              Renderer
```

Presentation state changes only through validated Core operations.

The Core does not depend on:

- React
- the Renderer
- Supabase
- IndexedDB
- Stripe
- HTTP
- browser APIs

UI components express user intent through callbacks and events rather than owning domain mutations.

The Renderer interprets valid presentation state but does not modify it.

Persistence is accessed through repository boundaries, allowing different implementations such as IndexedDB for local workflows and Supabase for cloud persistence without changing Presentation Core behavior.

## Documentation

Product-specific documentation lives in [`docs/product/`](./docs/product/README.md).

Current implementation status lives in [`ROADMAP.md`](./ROADMAP.md).

Engineering standards live in [`docs/standards/`](./docs/standards/README.md).

Technology and infrastructure decisions are documented in [`docs/stack.md`](./docs/stack.md).

Developer and coding-agent instructions are defined in [`AGENTS.md`](./AGENTS.md).

## Development

```bash
bun install
bun dev
```

Additional checks:

```bash
bun lint
bun typecheck
bun format
bun build
```

## Status

Tryslides is under active development.

The initial focus is building the Presentation Core, Renderer, editor experience, local persistence, and the fundamental presentation workflow before introducing deferred capabilities such as AI or MCP.
