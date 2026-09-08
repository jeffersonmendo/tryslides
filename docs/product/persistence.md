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

## Documentation Status

This document defines the target offline-first persistence and synchronization
architecture. The current implementation includes a browser-only IndexedDB
repository that atomically writes the local projection, Core snapshot and its
optional external receipt, one local operation, one outbox entry, and sync
metadata. Supabase RPCs, outbox processing, cache-miss hydration, and conflict
resolution are not implemented.

## Repository Boundary

Application code accesses presentation persistence through an explicit
repository contract.

Conceptually:

    PresentationRepository

Possible implementations:

    IndexedDbPresentationRepository
    SupabasePresentationSyncAdapter
    InMemoryPresentationRepository

The Application uses IndexedDB as the editor's repository and uses the
Supabase adapter only to synchronize. In-memory persistence is for deterministic
tests. Each adapter preserves the same Core domain semantics; none may create a
second implementation of Core rules.

## Identity, Public Routes, and Lifecycle

Repositories persist both immutable presentation identifiers. `id` is the UUID
used for internal relations, permissions, operations, and storage. `publicId`
is an opaque six-character Base62 value, for example `aB7kQ2`, used only for
the public route:

```text
/p/{publicId}
```

The Core validates their formats; the repository must enforce durable global
uniqueness. A public route must resolve by `publicId`, never expose or accept
the internal `id` as its public identifier.

Persist the Core lifecycle fields as JSON values: `status`, `createdAt`,
`updatedAt`, `lastSavedAt`, and `lastPublishedAt`. Times are canonical
ISO-8601 UTC strings. Application generates `createdAt` and `updatedAt` and
passes them explicitly to Core commands. `lastSavedAt` is `null` until local
IndexedDB durability has been confirmed. `lastPublishedAt` is `null` until
remote publication of the exact revision has been confirmed. Both are recorded
through their existing Core acknowledgement operations and persisted locally.

Repository sync metadata is deliberately separate from Core lifecycle state:

| Field | Meaning |
| --- | --- |
| `lastSyncedAt` | Most recent successful reconciliation with the remote service |
| `remoteCursor` | Opaque cursor for the remote change stream applied locally |
| `syncStatus` | Current synchronization state, such as idle, pending, syncing, or blocked by conflict |
| `lastSyncError` | Most recent synchronization failure diagnostic, or `null` |

Supabase also records its own server audit and operation-receipt timestamps.
Neither those timestamps nor client lifecycle timestamps decide conflicts or
merge results.

## Serialized Snapshot Integrity Receipts

Core serialization validates structure and history coherence but is not an
authenticity system. A coordinated rewrite of a snapshot root and its history
can remain structurally valid. A hash embedded in the same serialized payload
can be rewritten too, so it is not tamper-proof.

When Application needs to detect that threat, the repository or another
Infrastructure boundary must keep an immutable or signed receipt separate from
the serialized snapshot. It verifies that receipt against the exact serialized
string through the Core's caller-supplied verification hook during restoration.
Receipt creation, signing, storage, key handling, and verification technology
belong outside the Core. A successful verified import is explicitly
`receipt-verified`; a restoration without a receipt is explicitly `unverified`.
The receipt guarantee is limited to detecting payload changes relative to the
external authenticated receipt. It does not make an unverified payload trusted,
replace Core structural validation, authorize access, or resolve synchronization
conflicts.

## Presentation Deletion

The Core creates a validated deletion intent with the exact presentation ID
and current revision. This JSON-safe value is a repository boundary contract,
not evidence that data was removed. A future application/repository layer is
responsible for physical deletion from IndexedDB or Supabase and for reporting
its outcome. The current local Application flow uses the intent to atomically
remove the projection, snapshot/receipt, operations, outbox, and metadata.
Deletion is idempotent when the local presentation is already absent and keeps
an asset when any remaining local projection references it.

## IndexedDB

IndexedDB provides real local persistence.

It is not considered a mock.

It is the source for editor reads and the first durable boundary for every
valid Core command. The UI reads the materialized local projection, never a
Supabase response directly.

For each valid Core command, Application commits the following records in one
IndexedDB transaction:

1. the materialized presentation projection at the resulting Core revision;
2. the serialized Core snapshot and optional opaque integrity receipt;
3. the immutable logical operation and its revision transitions;
4. a sync-outbox entry keyed by the local operation key; and
5. local persistence metadata, including the next local sequence and sync
   status.

Each command-produced snapshot explicitly stores the local operation ID of the
operation committed beside it. The repository validates that this associated
operation is a real Core operation compatible with the serialized snapshot; it
does not infer the association from the current undo stack. A newly created
presentation instead stores an explicit `initial` snapshot origin, with no
invented Core operation or outbox entry.

The transaction either commits all five records or commits none of them. This
prevents a visible projection without its replayable operation, and prevents an
operation without an outbox record. When the transaction confirms durability,
Application records `lastSavedAt` through the Core acknowledgement contract and
persists the acknowledged projection. The initial transaction records a pending
save-acknowledgement marker in local metadata. On the next local restoration,
Application completes that acknowledgement only when the marker still matches
the persisted revision and local operation key. A later save makes an older
marker inapplicable, so a delayed acknowledgement is a no-op rather than a
write over newer state.

The repository stores a caller-provided `localOperationId` with the operation
and outbox entry. It is unique only inside that local database; it is not
derived from a Core sequence and carries no multi-device or remote idempotency
semantics. Remote synchronization must define that identity separately rather
than treating this local key as a protocol contract.

`PresentationCommands` deterministically disambiguates repeated injected local
operation values within one instance. The IndexedDB repository independently
rejects a colliding local operation/outbox key before writing, so immutable
records are never replaced. For local save acknowledgement, Application uses
the latest of the supplied local time, Core `updatedAt`, and existing
`lastSavedAt`; this guarantees `savedAt >= updatedAt` even if an injected clock
repeats or moves backwards, without altering the Core operation timestamp.

An integrity receipt is created from the exact serialized string it protects.
The acknowledgement writes a different serialized string because it adds
`lastSavedAt`, so it receives a newly created receipt for that final string. If
an interruption requires recovery, no receipt factory is durable; recovery
persists the acknowledged snapshot without a receipt rather than retaining the
receipt for the earlier string. This is a local integrity limitation, not a
remote synchronization guarantee.

The repository validates persisted records structurally before returning them.
Its integrity receipt remains opaque and untrusted until Application supplies a
verifier to Core during restoration. The existing `fake-indexeddb` development
dependency provides deterministic browser-transaction integration tests without
introducing a browser runner.

### Local Reads and Cache Misses

When a requested presentation is absent from the local projection:

1. If online, Application fetches it from Supabase, validates and materializes
   the response into IndexedDB with its remote revision and cursor metadata,
   then serves it from the local projection.
2. If offline, Application reports the presentation as unavailable.

The repository must never fabricate an empty presentation to satisfy a cache
miss. A local projection may be stale while synchronization is pending, but it
is still the editor read model.

### Local Presentation Cards

The local repository exposes a card-only listing read from presentation
projections. Each card includes internal and public identity, title, lifecycle
timestamps, status, and the first slide background as its minimal existing
visual data. It never loads or returns snapshots, operations, outbox entries,
integrity receipts, asset metadata, or binary data.

The list validates every persisted projection's card fields before returning it.
Invalid or corrupt records fail with the stable
`INVALID_PERSISTED_PRESENTATION` error instead of exposing an untrusted partial
card. Cards are ordered by `updatedAt` descending, then internal `id` ascending
to make equal timestamps deterministic.

Conceptually:

Editor → Application → Core → IndexedDbPresentationRepository → IndexedDB

## Supabase

Supabase provides durable cloud synchronization for authenticated product
users. It is not the normal editor read path.

Conceptually:

IndexedDB outbox → Application sync service → approved RPC boundary → PostgreSQL

Supabase must not become part of the Presentation Core.

## Supabase Database Access

Application synchronization uses narrow RPCs rather than spreading direct table
queries throughout application code. Every push carries the operation ID,
device ID, authenticated actor ID when available, expected or base entity
revisions, client occurrence time, local sequence, and remote cursor context.
The RPC accepts an idempotent operation and returns canonical accepted changes,
entity revisions, and cursor data. Replaying the same operation ID must return
the same accepted outcome rather than apply the mutation again.

The pull boundary returns ordered canonical changes and an opaque next cursor.
Application stores the cursor only after materializing the returned changes in
the same local transaction. Supabase must persist accepted operations so retries
and subsequent pulls can be deduplicated and reconciled.

Database functions enforce persistence, authorization, ownership, idempotency,
and revision preconditions. They must not become an alternative implementation
of Presentation Core business rules. Domain behavior belongs in the Core;
database behavior belongs at the persistence boundary.

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

`updatedAt` changes with every successful content command and is stored in the
logical before/after snapshots used by undo and redo. Save and publication
acknowledgements do not create a content revision or operation; they record
confirmed external facts for the current revision.

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

An operation has a stable operation ID and records enough dependency and base
revision information to determine whether it can be applied to a later state.
The local sequence orders a device's own operations; it is not a global merge
clock and does not override revision dependencies.

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

Autosave persists valid domain operations through the IndexedDB transaction and
queues them for remote synchronization.

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

The current browser asset adapter stores the `Blob` separately with validated
metadata: stable asset ID, content type, exact byte size, creation/update times,
and the presentation IDs that declare intended use. Metadata is not a substitute
for projection reference checks during cleanup; physical deletion checks all
remaining projections before removing a binary. The adapter is browser-only and
reports local persistence unavailability during SSR rather than accessing
IndexedDB at module evaluation time.

The local asset transaction use case commits a Blob and its metadata alongside
the Core snapshot, projection, operation, outbox entry, and sync metadata that
references its asset ID in one IndexedDB transaction. It requires the resulting
projection to reference the asset and the metadata to include that presentation.
A failed transaction rolls back both sides. Deletion derives retained assets
from all remaining projections, not `metadata.presentationIds`, so stale asset
metadata cannot retain an orphan or remove a shared binary.

Replacing an asset creates a new reference/revision when appropriate.

Changing visual properties such as position or opacity must not
duplicate the binary asset.

Asset upload and reference synchronization are one logical durability contract.
Application must not synchronize an operation that references a remote asset
until that asset is durably available remotely, or the remote transaction must
atomically establish the asset record and reference. A failed upload leaves the
operation pending or failed with no published dangling reference. Remote asset
cleanup must retain binaries referenced by pending operations.

## Synchronization and Conflicts

Synchronization is operation-based. Application pushes pending outbox entries,
pulls canonical remote changes, materializes them locally, and advances the
remote cursor transactionally. A rejected push or a pull that overlaps local
unacknowledged work starts reconciliation rather than choosing a winner by
timestamp.

Reconciliation performs a three-way merge from the common base, the local
operation, and the remote changes. Revisions and operation dependencies decide
whether changes are concurrent; timestamps never decide conflicts.

- Changes to disjoint entities or disjoint properties merge automatically.
- Concurrent changes to the same property are explicit conflicts.
- Delete-versus-edit is an explicit conflict.
- Incompatible slide or element ordering changes are explicit conflicts.

An explicit conflict blocks only the affected work according to its dependency
scope and remains visible to the user or calling application service. Resolving
it creates a new operation against the latest materialized state. Resolution
never rewrites local or remote operation history.

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

## Target Implementation Boundary

The target architecture deliberately separates responsibilities:

- Core validates commands, produces operations, revisions, and undo/redo state.
- Application supplies time, coordinates IndexedDB transactions, and orchestrates
  synchronization and conflict resolution.
- IndexedDB stores the local projection, operations, outbox, and sync metadata.
- Supabase stores remote operations, canonical revisions and changes, cursors,
  assets, and server audit data through narrow RPCs.

Implementing this target requires the repository, outbox, RPC, materialization,
and conflict-resolution adapters described above. Until then, serialization is
not a substitute for durable local persistence or synchronization.
