# Tryslides

Create, design, animate, present, and share modern presentations.

Tryslides is a modern presentation editor built around a simple idea:

> If you can see it, you can click it. If you can click it, you can edit it.

The editor focuses on direct manipulation, discoverable controls, expressive animations, and a clean presentation workflow without unnecessary complexity.

## Product

The core workflow is:

```text
Create → Design → Animate → Present → Share
```

The initial product focuses on:

- presentations and slides
- text, images, and shapes
- direct canvas editing
- entrance, exit, and continuous animations
- slide transitions
- undo and redo
- fullscreen presentation
- static PDF export
- public sharing

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
