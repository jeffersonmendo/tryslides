# Tryslides Architecture

## Goal

Tryslides separates presentation domain behavior from interfaces,
rendering, persistence, and infrastructure.

The architecture should allow the presentation system to evolve without
making React, Supabase, IndexedDB, Stripe, AI, or MCP owners of the
presentation domain.

## Architectural Model

Conceptually:

Human → Editor ───────┐
Future AI ────────────┼→ Presentation Core → Presentation State
Future MCP ───────────┘ │
↓
Renderer

Persistence exists outside the Presentation Core.

## Presentation Core

The Presentation Core is the authority over valid presentation state.

It owns:

- presentation domain models
- slide behavior
- element behavior
- commands
- validation
- operations
- revisions
- undo / redo semantics
- serialization rules
- domain capability definitions

The Core should remain pure TypeScript whenever practical.

## Core Independence

The Presentation Core must not depend on:

- React
- Next.js
- Presentation Renderer
- Supabase
- IndexedDB
- Stripe
- authentication providers
- SQL
- HTTP
- browser APIs
- UI components

The Core must not know where presentation state is stored or how it is
visually rendered.

This is a non-negotiable architectural invariant.

## Domain Mutations

Presentation state must not be mutated directly by UI, repositories,
renderers, AI, MCP, or infrastructure.

Changes pass through explicit validated Core operations.

Examples include:

- createSlide
- editSlide
- deleteSlide
- duplicateSlide
- reorderSlide

- createElement
- editElement
- deleteElement
- duplicateElement
- reorderElement

- moveElement
- resizeElement

- replaceAsset
- configureAnimation
- configureTransition

The final command surface should remain deliberate and relatively small.

Do not create a separate command for every visual property when the
changes represent the same domain intent.

For example:

    editElement({
      element_id,
      patch: {
        style: {
          color: "#FF0000",
          font_size: 72
        }
      }
    })

is preferable to independent domain commands such as:

    changeTextColor()
    changeTextFontSize()

unless those operations require meaningfully different domain behavior.

## Command Responsibility

A Core command may:

1. receive an explicit input
2. validate the request
3. verify domain constraints
4. calculate the resulting mutation
5. produce entity revisions
6. associate changes with an operation
7. return the resulting domain state/result

A failed command must not leave partially mutated domain state.

Errors should use stable error codes when appropriate.

Examples:

- ELEMENT_NOT_FOUND
- SLIDE_NOT_FOUND
- INVALID_ANIMATION_TYPE
- ANIMATION_NOT_SUPPORTED
- INVALID_DURATION

## UI Boundary

UI components are presentational.

A UI component may:

- receive values
- display values
- maintain purely visual/ephemeral interaction state when appropriate
- emit callbacks/events describing user intent

A UI component must not own presentation domain mutations.

For example:

    <ColorPicker
      value={color}
      onChange={onColorChange}
    />

The ColorPicker does not know:

- Presentation
- Element
- editElement
- revisions
- operations
- repositories
- Supabase
- IndexedDB

The editor/controller interprets the callback and invokes the
appropriate Core operation.

Conceptually:

UI Component
→ callback/event
→ Editor Controller
→ Core command
→ valid presentation state

## Editor

The Editor is an interface over the Presentation Core.

It coordinates:

- selection
- canvas interactions
- property panels
- user intent
- Core commands
- renderer input
- application-level persistence orchestration

The Editor does not become the source of truth for domain rules.

## Renderer

The Presentation Renderer interprets valid presentation state and
produces its visual representation.

The Renderer does not own presentation state.

The Renderer must not:

- mutate presentation domain state
- execute Core commands as hidden side effects
- access persistence
- access Supabase
- access IndexedDB
- contain business rules

Conceptually:

PresentationDocument
→ PresentationRenderer
→ SlideRenderer
→ ElementRenderer

Possible element renderers:

- TextRenderer
- ImageRenderer
- ShapeRenderer

## Core and Renderer Independence

The Core does not depend on the Renderer.

The Renderer may consume domain contracts defined by the Core.

Therefore:

Renderer → domain types/contracts: allowed

Core → Renderer: forbidden

The same Core should continue working if the rendering technology is
replaced.

Likewise, multiple visual consumers may exist:

Presentation State
├── Editor Preview
├── Present Mode
├── Public Presentation
├── Thumbnail Renderer
└── Export Renderer

## Capabilities

Capabilities should be explicit and discoverable.

Examples:

- element types
- animations
- transitions
- backgrounds

Registries may provide a single source of truth for capability metadata.

An animation definition may describe:

- id
- name
- category
- supported element types
- configuration schema
- defaults

The editor uses capability metadata to expose valid options.

The Core uses it to validate domain state.

The Renderer uses the animation identifier to select the appropriate
visual implementation.

## Animation Responsibility

The Core understands animation configuration and validity.

The Core does not execute visual animation.

The Renderer interprets animation configuration and performs the visual
effect.

For example:

Core state:

    {
      "type": "fade-in",
      "duration": 500
    }

Renderer:

    fade-in
      → animation implementation
      → visual effect

## Application Layer

Application services coordinate boundaries.

They may orchestrate:

- Core
- repositories
- authentication context
- asset services
- application transactions

They should not duplicate domain rules already owned by the Core.

## Persistence Boundary

Persistence exists outside the Core.

Conceptually:

Editor
→ Application
→ Core
→ valid changes

Application
→ Repository
→ persistence implementation

The Core never invokes a repository.

## Repository Port

Persistence should be exposed through explicit contracts.

Conceptually:

    PresentationRepository

with implementations such as:

    IndexedDbPresentationRepository
    SupabasePresentationRepository
    InMemoryPresentationRepository

The application chooses the appropriate implementation.

The Presentation Core remains unchanged.

## Infrastructure Independence

Changing:

Supabase → IndexedDB

or:

IndexedDB → Supabase

must not require changing:

- Presentation Core
- domain commands
- domain validation
- operation semantics
- revision semantics
- renderer behavior

Infrastructure changes persistence, not presentation behavior.

## Future AI and MCP

Future AI and MCP integrations are adapters over the same Core command
surface.

They must not modify presentation JSON directly.

Conceptually:

Editor ──────┐
AI Tools ────┼→ Core commands
MCP Tools ───┘

This guarantees that manual, AI-generated, and externally generated
changes follow the same validation and domain rules.

## Non-Negotiable Invariants

1. Presentation state changes only through approved Core operations.
2. Core does not depend on React.
3. Core does not depend on Renderer.
4. Core does not depend on persistence.
5. Core does not depend on Supabase or IndexedDB.
6. Core does not depend on Stripe or authentication.
7. UI components do not own domain mutations.
8. Renderer does not mutate domain state.
9. Renderer does not access persistence.
10. Repositories do not own domain rules.
11. Presentation entities use stable IDs.
12. Revisions remain granular.
13. Undo/redo operates on logical operations.
14. Assets remain separate from presentation JSON.
15. AI and MCP must use the same Core operations as human interfaces.
