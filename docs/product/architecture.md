# Tryslides Architecture

## Goal

Tryslides separates presentation domain behavior from interfaces,
rendering, persistence, and infrastructure.

The architecture should allow the presentation system to evolve without
making React, Supabase, IndexedDB, Stripe, AI, or MCP owners of the
presentation domain.

## Documentation Status

This document specifies the target architecture. It does not claim that every
adapter, transaction, synchronization flow, or conflict workflow described
here is running today. The current implementation provides the Presentation
Core, its in-memory state, and JSON serialization; IndexedDB persistence,
Supabase adapters, cache-miss hydration, and synchronization remain planned
application and infrastructure work.

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

### Presentation Identity and Lifecycle

Every presentation has two immutable identifiers supplied by the Application
layer at creation:

| Field | Contract | Owner |
| --- | --- | --- |
| `id` | UUID internal identity for relations, permissions, operations, and persistence | Application generates; Core validates |
| `publicId` | Exactly six opaque Base62 characters, for example `aB7kQ2`, for the public route `/p/{publicId}` | Application generates; Core validates |

The Core validates identifier format and state-level identity consistency. A
repository is responsible for enforcing cross-presentation uniqueness of both
identifiers at durable storage boundaries.

The persistible lifecycle is JSON-safe and uses canonical ISO-8601 UTC
timestamps (`YYYY-MM-DDTHH:mm:ss.SSSZ`):

| Field | Meaning |
| --- | --- |
| `status` | `draft` until a publication is externally confirmed; then `published` |
| `createdAt` | Creation instant; immutable |
| `updatedAt` | Explicit time supplied with each successful content mutation |
| `lastSavedAt` | Most recent successful local IndexedDB durability confirmation; initially `null` |
| `lastPublishedAt` | Most recent remote publication confirmation; initially `null` |

The Core has no clock and does not generate identifiers. It validates supplied
values without `crypto` or `Date`. Application supplies the identifiers and
timestamps explicitly. Repository synchronization metadata, including
`lastSyncedAt`, remote cursor, and last sync status or error, is outside this
Core lifecycle state.

### Canvas Contract

The Core owns one fixed presentation-level 1920 × 1080 logical canvas
(16:9). Slides do not define independent canvas formats in the MVP.

Element coordinates and sizes are logical canvas units. A renderer may
scale the logical canvas for its output surface, but it must not redefine
the Core-owned dimensions.

The Core evaluates bounds from unrotated, axis-aligned position and size;
rotation does not expand that envelope. It permits controlled overflow of
up to 50% of the element's own width on the left or right edge and up to
50% of its own height on the top or bottom edge. At least half of each
dimension must remain visible within the canvas. The Core validates this
invariant during element creation, editing, moving, resizing, and state
deserialization.

### Creation Defaults

| Entity | Core default |
| --- | --- |
| Slide | Solid `#FFFFFF` background; `none` transition with duration `0` |
| Text | `Paragraph`, Arial, 16px, weight 400, `#000000`, left-aligned |
| Image | `cover` object fit; border radius `0` |
| Shape | `#000000` fill; transparent border; border width and radius `0` |

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

- createPresentationDeletionIntent
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

Each element has at most one animation configuration in each Core
category: `entrance`, `exit`, and `continuous`. Configuring another
animation in a category replaces the existing configuration for that
category. The product-facing label for `continuous` is “Always”.

This is declarative Core state only; it does not imply that renderer
animation behavior has been implemented.

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

Application generates IDs and timestamps, invokes Core content operations, and
coordinates external work. It generates `createdAt` at creation and `updatedAt`
for each content command. The Core receives those explicit ISO-8601 UTC values;
it never reads a clock.

After a valid content command, the target Application flow commits the local
projection, logical operation, sync-outbox entry, and local persistence metadata
in one IndexedDB transaction. Only after IndexedDB confirms durability does it
record `lastSavedAt` through `confirmPresentationSaved` and durably update the
local projection. A recovery path must complete that acknowledgement from the
durable local metadata if an interruption occurs between confirmation and the
acknowledgement update.

After remote publication confirms the exact revision, Application records
`lastPublishedAt` through `confirmPresentationPublished` and durably updates the
local projection. These acknowledgement operations do not perform I/O or create
content revisions or logical operations. Later edits may make `updatedAt` newer
than either acknowledgement while retaining the last known external success.

Application also owns synchronization orchestration and conflict presentation.
It may merge persisted operations and revisions, but it must not bypass Core
validation or mutate presentation state directly. Timestamps describe events;
they never decide merge winners.

## Persistence Boundary

Persistence exists outside the Core.

The Core serializes JSON-safe presentation state together with its logical
undo and redo history. Serialization preserves Core state; it is not a
durable persistence implementation. Repository adapters remain responsible
for durable storage and restoration.

Serialization includes identity, lifecycle fields, document content, revisions,
and undo/redo snapshots. Content commands retain before/after lifecycle values,
so undo and redo restore the corresponding logical document and `updatedAt`.
Save and publication acknowledgements are external facts rather than logical
content commands; the serialized current state preserves them, while undo/redo
restore the acknowledgement values belonging to their snapshots.

Serialized state is mutable, untrusted interchange data. Internal structural
validation detects malformed or incoherent state, but cannot prove that a
coordinated rewrite of the root and its history is authentic. A hash stored
inside that payload is mutable with it and is not tamper-proof.

For callers that require that guarantee, `deserializePresentationState` accepts
an Application- or Infrastructure-supplied immutable or signed integrity receipt
and a verifier. The receipt remains outside the serialized payload and the
verifier receives the exact serialized string. The Core performs no I/O, receipt
storage, secret management, cryptographic signing, or cryptographic verification.
An accepted receipt marks the import `receipt-verified`; imports without this
boundary remain explicitly `unverified`. Receipt verification rejects a payload
whose exact serialized string differs from the externally authenticated receipt,
including a coordinated rewrite of lifecycle acknowledgements or operation
sequences.

Conceptually:

Editor
→ Application
→ Core
→ valid changes

Application
→ Repository
→ persistence implementation

The Core never invokes a repository.

### Presentation Deletion Boundary

Presentation deletion is split deliberately. The Core currently creates a
validated, immutable, JSON-safe intent containing the presentation ID and
its current revision. It does not remove Core state, record a Core operation,
or report a durable deletion.

A future application/repository layer must use that intent to perform the
physical IndexedDB or Supabase removal and handle persistence outcomes.

## Repository Port

Persistence should be exposed through explicit contracts.

Conceptually:

    PresentationRepository

with implementations such as:

    IndexedDbPresentationRepository
    SupabasePresentationSyncAdapter
    InMemoryPresentationRepository

The Application reads and writes the local IndexedDB repository. The Supabase
adapter is a synchronization boundary rather than an alternate authoritative
editor read path. In-memory persistence remains appropriate for deterministic
tests.

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
16. Local projection, operation, outbox entry, and local persistence metadata
    are committed atomically after each valid Core command.
17. UI presentation reads are served from the local projection, not directly
    from Supabase.
18. Conflict detection and merge decisions use revisions and operation
    dependencies, never timestamps.
19. Snapshot authenticity for coordinated-payload tampering requires an external
    integrity receipt; payload-internal metadata is not an authenticity boundary.
