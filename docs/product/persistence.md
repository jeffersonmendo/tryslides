# Tryslides Persistence

## Principle

Persistence is an implementation detail outside the Presentation Core.

The Core must not know:

- whether data is persisted
- where data is persisted
- which database is used
- whether the application is online
- whether the current repository is local or remote

Persistence changes storage behavior, not presentation behavior.

## Repository Boundary

Application code accesses presentation persistence through an explicit
repository contract.

Conceptually:

    PresentationRepository

Possible implementations:

    IndexedDbPresentationRepository
    SupabasePresentationRepository
    InMemoryPresentationRepository

These implementations must preserve the same domain semantics.

## IndexedDB

IndexedDB provides real local persistence.

It is not considered a mock.

Initial use cases include:

- local development
- demos
- local-only presentation editing
- testing the complete editor without cloud infrastructure

A local presentation should still use:

- the same Presentation Core
- the same commands
- the same schemas
- the same revisions
- the same operations
- the same Renderer

Only the persistence adapter changes.

Conceptually:

Editor
→ Application
→ Core
→ IndexedDbPresentationRepository
→ IndexedDB

## Supabase

Supabase provides durable cloud persistence for authenticated product
users.

Conceptually:

Editor
→ Application
→ Core
→ SupabasePresentationRepository
→ approved RPC boundary
→ PostgreSQL

Supabase must not become part of the Presentation Core.

## Supabase Database Access

Application repositories should use the documented narrow RPC boundary
rather than spreading direct table queries throughout application code.

Database functions persist already-valid domain operations.

Database functions must not become an alternative implementation of
Presentation Core business rules.

Domain behavior belongs in the Core.

Database behavior belongs in persistence.

## In-Memory Persistence

An in-memory repository may be used for deterministic tests.

This is distinct from IndexedDB.

IndexedDB:

- real browser persistence

InMemory:

- temporary testing implementation

## Granular Persistence

Tryslides does not treat an entire presentation as one giant physical
database JSON document.

The domain is composed of granular entities.

Conceptually:

Presentation
└── Slide
└── Element

Additional persistence concepts include:

- revisions
- operations
- operation changes
- assets

The application may reconstruct an aggregated PresentationDocument for
rendering and domain operations.

Physical persistence may remain granular.

## Stable IDs

Entities use stable identifiers.

Operations must target IDs rather than positional array indexes.

Prefer:

    editElement({
      slide_id: "slide_01",
      element_id: "title_01"
    })

Avoid domain identity such as:

    slides[2].elements[4]

Ordering may change.

Identity must not.

## Revisions

Presentation entities support granular immutable revisions.

Changing one element should not require duplicating the complete
presentation.

Example:

Before:

    title_01 → v4
    image_01 → v7
    shape_01 → v2

Edit image:

    title_01 → v4
    image_01 → v8
    shape_01 → v2

Only the changed entity receives a new revision.

## Operations

Granular revisions are grouped into logical user operations.

Example:

    Operation #105
    type: move-elements
    source: user

    title_01 v4 → v5
    image_01 v8 → v9
    shape_01 v2 → v3

The operation represents user intent.

This allows Undo to revert the complete action instead of individual
database writes.

## Operation Sources

Operations should support explicit sources.

Initial values:

- user
- system

Reserved future values:

- ai
- mcp

The architecture should permit future sources without changing revision
semantics.

## Undo / Redo

Undo and redo operate at the logical operation level.

They must not depend on database implementation.

Therefore the same behavior should work with:

- IndexedDB
- Supabase
- InMemory repositories

## Autosave

Autosave persists valid domain operations.

Avoid creating meaningless durable revisions for every transient browser
event when those events belong to one logical edit.

For example, typing a title should not necessarily produce a durable
cloud revision for every individual keypress.

The exact batching/debounce strategy may evolve, but it must preserve
operation semantics.

## Assets

Binary assets must not be embedded directly into presentation JSON.

An image element references an asset:

    {
      "element_id": "image_01",
      "type": "image",
      "asset_id": "asset_783"
    }

The binary file is stored separately.

Cloud:

    asset_783 → Supabase Storage

Local:

    asset_783 → local asset storage / IndexedDB

Replacing an asset creates a new reference/revision when appropriate.

Changing visual properties such as position or opacity must not
duplicate the binary asset.

## Repository Interchangeability

A key architectural test is that the editor can operate against
IndexedDB and later against Supabase without changing Presentation Core
behavior.

Conceptually:

                 PresentationRepository
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        IndexedDB    Supabase    InMemory

The application chooses the adapter.

The domain does not.

## Future Local-to-Cloud Migration

A future product capability may allow a local presentation to be moved
or synchronized to cloud storage after authentication.

This is not required for the initial MVP.

Do not implement synchronization until its conflict, ownership, asset,
and revision semantics are explicitly defined.
