# Server and Client

This document defines how server-side and client-side responsibilities should be separated in this project.

The goal is to keep server capabilities protected, client code focused on interaction, and boundaries easy to understand.

For framework-specific behavior, always consult the Next.js and React skills before implementation.

---

## 1. Server by Default

Prefer server-side execution when client-side behavior is not required.

Server-side code is appropriate for:

- accessing secrets
- reading protected data
- database access
- privileged mutations
- external service credentials
- server-only validation
- preparing data before rendering
- operations that do not require browser APIs

Do not make code client-side merely because it is easier to call from a component.

---

## 2. Use Client Components for Interaction

Client Components are appropriate when the responsibility requires:

- event handlers
- local interactive state
- browser APIs
- client-side React hooks
- drag and drop
- keyboard interaction
- client-only libraries
- real-time UI behavior

Example:

```text
Server Page
↓
Client Editor
↓
Interactive Toolbar
```

Keep `"use client"` as close as practical to the interactive boundary.

Avoid:

```text
Entire application
↓
"use client"
```

when only a small part actually needs client-side behavior.

---

## 3. Client Code Must Not Own Server Infrastructure

Client code must never directly depend on server-only capabilities such as:

- database credentials
- private environment variables
- privileged SDKs
- server secrets
- protected service tokens

Avoid:

```tsx
"use client"

import { database } from "@/lib/database"

export function DeleteButton() {
  async function handleDelete() {
    await database.projects.delete(...)
  }

  // ...
}
```

Prefer an explicit boundary:

```text
Client Component
↓
Application Entry Point
↓
Server
↓
Data Access / Infrastructure
```

Depending on the project, the application entry point may be:

- a Server Action
- a Route Handler
- another server-side application capability

The exact choice depends on the project and framework guidance.

---

## 4. Server Components May Read, Client Components Interact

A useful default model is:

```text
Server Component
├── reads or prepares data
├── performs server-safe composition
└── passes serializable data
        ↓
Client Component
├── renders interaction
├── manages local UI state
└── emits user intent
```

Example:

```tsx
export async function PresentationPage() {
  const presentation = await getPresentation()

  return (
    <PresentationEditor
      presentation={presentation}
    />
  )
}
```

The editor may then handle client-side interactions without knowing how the presentation was loaded.

Do not force all data loading into client hooks when the data can be prepared naturally on the server.

---

## 5. Mutations Should Cross an Explicit Boundary

A client interaction should communicate intent to the server rather than directly reaching infrastructure.

Conceptually:

```text
Button
↓
Callback / Client Hook
↓
Server Action
↓
Application Operation
↓
Repository / Data Access
↓
Database
```

Not every mutation requires every layer.

For simple cases:

```text
Button
↓
Server Action
↓
Data Access
```

may be enough.

For more complex business behavior:

```text
Button
↓
Server Action
↓
Service / Application Operation
↓
Repository
↓
Database
```

may be more appropriate.

Use the smallest structure that preserves clear responsibilities.

---

## 6. Hooks Are Client-Side Tools, Not Infrastructure Boundaries

Hooks may coordinate reusable client behavior.

Good examples:

```ts
useSelection()
useEditorState()
useKeyboardShortcuts()
```

A hook may manage:

- local React state
- effects
- browser APIs
- interaction behavior

Do not use hooks to hide inappropriate infrastructure coupling.

Avoid making this the default architecture:

```text
Component
↓
Hook
↓
Database
```

A hook should not become a disguised repository or service merely because the component is client-side.

---

## 7. Environment Variables

Server-only environment variables must remain on the server.

Client code may only use values intentionally exposed to the browser.

Do not expose a variable publicly merely because client code currently wants access to it.

Before exposing configuration to the browser, ask whether the client actually needs it.

Secrets, private tokens, privileged keys, and internal credentials must never cross the client boundary.

---

## 8. Serializable Boundaries

Data passed from server code to client components should be suitable for crossing the server/client boundary.

Prefer plain application data:

```ts
{
  id: "presentation_1",
  title: "Demo",
  is_public: false
}
```

Avoid passing infrastructure objects such as:

```text
Database clients
Repository instances
SDK clients
Request objects
Server-only classes
```

Client components should receive the data and capabilities they need, not server infrastructure.

---

## 9. Keep Client State Local When Possible

Do not introduce global client state merely because a component is interactive.

Prefer the smallest owner:

```text
Single component
→ local state

Component subtree
→ lifted/shared feature state

URL-driven state
→ URL

Cross-feature client state
→ shared store when justified
```

Client state ownership is defined further in [`state-management.md`](./state-management.md).

---

## 10. Avoid Duplicate Server and Client Logic

Do not maintain separate versions of the same business rule in server and client code.

Avoid:

```text
Client discount calculation
+
Server discount calculation
```

when both represent the same authoritative product rule.

Business behavior should have one authoritative implementation when practical.

The client may calculate temporary presentation values when needed, but security-sensitive or authoritative rules must be verified on the server.

---

## 11. Client Optimism Does Not Replace Server Authority

Optimistic UI may improve interaction, but the server remains authoritative for protected mutations and persisted state.

Conceptually:

```text
Client
↓ optimistic update
UI responds immediately

Server
↓ validates + persists
Authoritative result
```

If the server rejects the operation, the client must reconcile appropriately.

Do not trust client state as proof that a protected operation is valid.

---

## 12. Framework Details Belong to Skills

This standard defines our architectural expectations.

It should not duplicate detailed framework documentation such as:

- exact Server Action APIs
- caching APIs
- React rendering internals
- Next.js directive behavior
- framework version-specific conventions

Before implementing these details:

> Review the relevant Next.js and React skills.

Use the standards to decide **where the responsibility belongs**.

Use the skills to decide **how to implement it correctly with the current framework**.

---

## Common Warning Signs

Reconsider the server/client boundary when:

- `"use client"` appears at high-level layouts without a clear reason
- database code is imported into Client Components
- secrets need to be exposed to make UI code work
- client hooks perform privileged infrastructure operations
- the same business rule is independently implemented on both sides
- large amounts of server data are sent to the client unnecessarily
- a server capability becomes coupled to React state
- every mutation requires custom client API plumbing despite an existing server-side boundary

These are signals to investigate, not automatic failures.

---

## Related Standards

- [Architecture](./architecture.md) — dependency direction and infrastructure boundaries.
- [Components](./components.md) — component responsibilities and callbacks.
- [Data Access](./data-access.md) — database and external service access.
- [State Management](./state-management.md) — ownership of client and server state.
- [Validation](./validation.md) — validation at external boundaries.
- [Project Structure](./project-structure.md) — where server/client code belongs.