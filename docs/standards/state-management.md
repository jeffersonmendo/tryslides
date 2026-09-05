# State Management

This document defines how state should be owned and managed in this project.

The goal is to keep state as close as possible to its real owner and avoid introducing global client state when simpler mechanisms already represent the data correctly.

State management is not about choosing a library first.

It is about deciding **who owns the state, how long it lives, and who needs access to it**.

---

## 1. Choose State by Ownership

Before choosing a state-management tool, determine what kind of state is being represented.

A useful default order is:

```text
Local UI State
↓
Shared Feature State
↓
URL State
↓
Server State
↓
Global Client State
```

This is not a strict execution flow.

It is a decision guide.

Use the smallest scope that correctly owns the state.

---

## 2. Prefer Local State for Local Interaction

If state belongs to one component or a small component subtree, keep it local.

Examples:

```text
open / closed
selected tab
hover state
temporary input
local modal state
temporary UI selection
```

Example:

```tsx
const [is_open, setIsOpen] = useState(false)
```

Do not move local state into a global store merely because another state-management library is available.

Prefer:

```text
Component
└── Local State
```

over:

```text
Component
↓
Global Store
↓
One Boolean
```

Local ownership makes behavior easier to understand and remove.

---

## 3. Lift State When Nearby Components Share It

When several related components need the same interactive state, move ownership to their closest meaningful common parent or feature boundary.

Conceptually:

```text
Editor
├── Toolbar
├── Canvas
└── Properties Panel
```

If all three need the selected element:

```text
Editor
↓ owns selected_element_id

├── Toolbar
├── Canvas
└── Properties Panel
```

This may use props, context, or a feature-level store depending on complexity.

Do not immediately introduce global state when ordinary composition is sufficient.

---

## 4. Use the URL for Navigational State

State that represents navigation, filtering, or a shareable application view often belongs in the URL.

Examples:

```text
search
page
sort
filters
selected category
active view
```

Conceptually:

```text
/products?category=books&page=2
```

is usually more appropriate than storing those values only in memory.

URL state is especially useful when the state should survive:

- refreshes
- browser navigation
- copied links
- shared URLs

When the project uses `nuqs`, use it for appropriate URL state according to its intended role.

Do not move every UI value into the URL.

Temporary interaction state such as whether a tooltip is open usually does not belong there.

---

## 5. Server Data Is Not Automatically Client State

Data loaded from the server should not automatically be copied into a global client store.

Avoid:

```text
Server
↓
Fetch Data
↓
Zustand
↓
Component
```

when the component can already receive the data through server composition or props.

Prefer:

```text
Server Component
↓
Data
↓
Component
```

when appropriate.

Duplicating server data into client state creates additional synchronization responsibilities.

Use client state when the client actually needs to modify, coordinate, or interact with a local representation.

---

## 6. Use Feature State for Complex Client Interaction

Some features genuinely require coordinated client-side state.

Examples include:

- editors
- multi-step interactive workflows
- complex selection systems
- drag-and-drop interfaces
- temporary client-side document models
- coordinated panels and tools

A feature store may be appropriate:

```text
Presentation Editor
↓
Editor Store
├── selected element
├── active slide
├── viewport state
└── temporary editing state
```

Keep the store owned by the feature when possible.

Example:

```text
features/
└── editor/
    └── store/
        └── editor-store.ts
```

Do not place feature-specific state in a global application store without a real cross-feature requirement.

---

## 7. Use Zustand When Shared Client State Justifies It

Zustand is the preferred general-purpose store when this project requires shared client state.

Use it when:

- multiple distant components need coordinated client state
- prop lifting becomes structurally awkward
- a feature has substantial interactive state
- state needs an explicit client-side API
- the store represents a cohesive responsibility

Do not use Zustand merely because:

- two nearby components share a value
- a component has several `useState` calls
- data came from the server
- avoiding props feels more convenient

The existence of Zustand in the stack does not mean every state belongs in Zustand.

---

## 8. Keep Stores Cohesive

A store should represent a clear state responsibility.

Prefer:

```text
EditorStore
├── active_slide_id
├── selected_element_id
├── zoom
└── editor actions
```

Avoid a single application store containing unrelated concerns:

```text
GlobalStore
├── current_user
├── editor
├── checkout
├── sidebar
├── notifications
├── billing
├── search
└── random UI flags
```

Separate stores by ownership and behavior when those concerns change independently.

Do not split stores into tiny pieces when they represent one cohesive feature.

---

## 9. Keep Persisted Data and UI State Distinct

Client stores should not become accidental databases.

Distinguish between:

```text
Persisted Application Data
```

and:

```text
Temporary Client State
```

For example:

```text
Presentation document
→ may be persisted

Selected element
→ temporary editor state

Toolbar popover
→ local UI state
```

A feature may maintain a client-side working copy of persisted data when required by its interaction model.

In that case, define clearly:

```text
Server/Persistence
↓
Loaded document
↓
Client working state
↓
Mutation / Save
↓
Server/Persistence
```

The project documentation should define which representation is authoritative.

---

## 10. Avoid Multiple Sources of Truth

Do not represent the same authoritative state independently in several places without a synchronization strategy.

Avoid:

```text
URL filter
+
Local filter state
+
Zustand filter state
```

when all three represent the same value.

Prefer one owner:

```text
URL
↓
Components derive filter
```

Likewise, avoid unnecessary duplication between:

```text
Server data
Client store
Component state
```

Choose the authoritative owner and derive other representations when possible.

---

## 11. Context Has a Specific Role

React Context may be appropriate for values naturally scoped to a component tree.

Examples:

```text
theme
feature configuration
compound component state
provider-owned behavior
```

Do not use Context as an automatic replacement for a state store.

Large frequently changing application state may become difficult to manage when placed into broad contexts.

Likewise, do not introduce Zustand when a small scoped Context naturally represents the responsibility.

Choose according to ownership and update behavior.

---

## 12. Separate State From Business Rules

A store may coordinate state transitions, but it should not become the default location for unrelated business logic or infrastructure access.

Avoid turning:

```text
EditorStore
```

into:

```text
EditorStore
├── UI state
├── database queries
├── Stripe operations
├── email sending
└── unrelated business rules
```

Business capabilities should remain in their appropriate modules.

Infrastructure should remain behind its appropriate boundaries.

State management does not replace application architecture.

---

## 13. Persist Client State Intentionally

Some client state may need persistence through mechanisms such as:

- local storage
- IndexedDB
- URL state
- server persistence

Persistence should be an explicit product decision.

Do not persist state automatically just because it can be persisted.

Ask:

- should this survive refresh?
- should it survive logout?
- is it device-specific?
- is it user-specific?
- is the server authoritative?
- could the persisted value become stale?

Project-specific persistence behavior belongs in `/docs/project/architecture.md` or the relevant project documentation.

---

## State Ownership Guide

Use this as a default decision guide:

```text
Does only one component need it?
→ Local state

Do nearby components need it?
→ Lift state / scoped composition

Does it represent navigation or a shareable view?
→ URL state

Is it authoritative server data?
→ Keep server ownership when possible

Does a complex interactive feature need coordinated client state?
→ Feature store

Is it genuinely shared across unrelated client areas?
→ Global client state may be justified
```

Always choose based on responsibility rather than library preference.

---

## Core Principle

> State should live with the smallest meaningful owner capable of managing it correctly.

Do not centralize state merely to make it accessible.

Do not duplicate state merely to make it convenient.

Make ownership explicit.

---

## Related Standards

- [Components](./components.md) — local state, props, callbacks, and component responsibilities.
- [Server and Client](./server-client.md) — server versus client ownership.
- [Architecture](./architecture.md) — application boundaries.
- [Modules](./modules.md) — feature ownership.
- [Data Access](./data-access.md) — persisted and server-owned data.
- [Imports](./imports.md) — store and module dependency boundaries.