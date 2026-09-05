# Components

This document defines how React components should be structured and used in this project.

The goal is to keep UI predictable, reusable, and decoupled from business and infrastructure concerns.

Components should focus on presentation, interaction, and composition.

For React-specific implementation details, always consult the React skill. For Next.js Server and Client Component behavior, consult the Next.js skill.

---

## 1. Component Responsibility

A component should have one clear UI responsibility.

Good examples:

```text id="d73x5f"
UserCard
PaymentForm
EditorToolbar
PresentationList
```

Avoid components that simultaneously:

- render UI
- query the database
- implement business rules
- send emails
- call external providers
- manage unrelated global state

A component may contain local presentation logic, but it should not become the owner of the application's business or infrastructure behavior.

---

## 2. Components Communicate Through Props and Callbacks

Prefer components that receive data through props and communicate actions through callbacks.

Example:

```tsx id="3u1l4u"
type UserCardProps = {
  user: User
  onDelete: (id: string) => void
}

export function UserCard({
  user,
  onDelete,
}: UserCardProps) {
  return (
    <article>
      <h2>{user.name}</h2>

      <button onClick={() => onDelete(user.id)}>
        Delete
      </button>
    </article>
  )
}
```

The component knows:

- what to render
- what interaction happened

It does not need to know how deletion is implemented.

Avoid:

```tsx id="dlkdjp"
export function UserCard({ user }: UserCardProps) {
  async function handleDelete() {
    await database.users.delete(user.id)
  }

  return (
    <button onClick={handleDelete}>
      Delete
    </button>
  )
}
```

The UI should not know persistence details.

A preferred conceptual flow is:

```text id="5kg1tw"
UI
↓
Application Capability
↓
Data Access / Infrastructure Boundary
↓
External System
```

The exact project-specific flow belongs in `/docs/project/architecture.md`.

---

## 3. Component Categories

Components usually fall into a small number of responsibilities.

### UI Components

Reusable visual primitives with little or no product-specific behavior.

Examples:

```text id="08hym4"
Button
Dialog
Input
DropdownMenu
Tooltip
```

They normally live in:

```text id="17m94z"
src/components/ui/
```

These components should be generic and reusable.

### Feature Components

Components owned by a product capability.

Examples:

```text id="zjp09w"
BillingSummary
PresentationToolbar
LoginForm
SubscriptionCard
```

They belong close to their feature:

```text id="90c4jk"
features/
└── billing/
    └── components/
        └── subscription-card.tsx
```

Do not move feature-specific UI into global `components/` merely because it is reusable inside that feature.

### Composition Components

Some components exist mainly to compose smaller pieces and connect data or behavior.

They may:

- prepare props
- coordinate child components
- connect callbacks
- select which UI to render

They should still avoid becoming large containers for unrelated business logic.

---

## 4. Server and Client Components

Use Server Components by default when client-side interactivity is not required.

Server Components are appropriate for responsibilities such as:

- reading server-side data
- composing server-rendered UI
- accessing protected server capabilities
- preparing data for child components

Client Components should be used when the component requires:

- event handlers
- browser APIs
- interactive local state
- React client hooks
- client-only libraries

Keep client boundaries as small as practical.

Avoid marking a large tree `"use client"` because a small nested component needs interaction.

Example:

```text id="aqdbyq"
PresentationPage        Server
└── PresentationEditor  Client
    ├── Toolbar
    └── Canvas
```

instead of turning the entire route into a Client Component.

Detailed server/client rules are defined in [`server-client.md`](./server-client.md).

---

## 5. Business Logic Does Not Belong in UI Components

Components may contain presentation logic.

Examples:

```ts id="s5io4a"
const is_empty = items.length === 0
const is_selected = selected_id === item.id
```

This is different from product behavior such as:

```ts id="ipsp0g"
calculateSubscriptionPrice()
canUserDeleteWorkspace()
applyOrderDiscount()
```

Business rules should live outside the component when they represent behavior that matters independently of the UI.

Prefer:

```tsx id="bh2i10"
const can_delete = canDeleteWorkspace(workspace, current_user)

<WorkspaceMenu
  canDelete={can_delete}
  onDelete={delete_workspace}
/>
```

This allows the rule to exist independently from React.

Do not extract trivial UI expressions simply to create additional layers.

---

## 6. Data Access and Mutations

UI components should not directly communicate with:

- databases
- database SDKs
- external APIs
- payment providers
- storage providers
- email providers

Avoid:

```tsx id="b50i5g"
await supabase.from("projects").delete()
```

inside reusable UI.

Prefer calling an application capability through an appropriate boundary.

For client interaction, that may be:

```text id="jxk0yn"
Client Component
↓
Callback / Hook
↓
Server Action or Application API
↓
Data Access
```

For server-rendered behavior, it may be:

```text id="7tq23i"
Server Component
↓
Application/Data Access
↓
Infrastructure
```

Do not introduce a service or repository merely to satisfy a diagram. Use the smallest boundary that preserves the required separation.

---

## 7. Hooks

Hooks are appropriate for reusable client-side behavior.

Examples:

```ts id="8854vj"
useSelection()
useEditorKeyboard()
useResponsiveLayout()
```

A hook may coordinate:

- React state
- effects
- browser APIs
- reusable interaction behavior

Do not use hooks as a hiding place for unrelated business logic or infrastructure coupling.

Avoid turning:

```ts id="x52fcq"
database → hook → component
```

into the default data architecture simply because hooks are convenient.

Feature-owned hooks belong with their feature.

Shared hooks should only be global when they are genuinely reusable across unrelated features.

---

## 8. Component Extraction

Do not extract a component merely because some JSX is long.

Extract when doing so creates a meaningful responsibility.

Good reasons include:

- the UI concept has its own identity
- the component is reused
- it owns independent interaction
- extraction makes the parent's responsibility clearer
- the section changes independently

Avoid creating excessive components such as:

```text id="fzu9yt"
CardHeaderText
CardHeaderIcon
CardHeaderWrapper
CardHeaderInnerWrapper
```

when those abstractions do not improve understanding or reuse.

Prefer cohesive components over artificial fragmentation.

---

## 9. Props

Props should represent the component's public API.

Prefer specific props:

```tsx id="zyjih3"
<UserCard
  user={user}
  isSelected={is_selected}
  onSelect={handleSelect}
/>
```

Avoid passing infrastructure objects or unrelated application context through UI components:

```tsx id="rx8nb5"
<UserCard
  database={database}
  stripe={stripe}
  repository={repository}
/>
```

unless the component itself genuinely owns that architectural responsibility, which ordinary UI components usually should not.

Avoid excessively large prop interfaces when they indicate that the component has too many responsibilities.

---

## 10. Keep Components Predictable

A component should be understandable primarily from:

- its name
- its props
- its rendered output
- its callbacks

Avoid hidden behavior that makes a reusable component unexpectedly:

- persist data
- navigate
- modify unrelated global state
- trigger analytics
- communicate with infrastructure

when those effects are not part of the component's explicit responsibility.

Prefer explicit communication and composition.

---

## Related Standards

- [Architecture](./architecture.md) — dependency and responsibility boundaries.
- [Project Structure](./project-structure.md) — where components belong.
- [Naming](./naming.md) — component, file, props, and callback naming.
- [Server and Client](./server-client.md) — server/client execution boundaries.
- [State Management](./state-management.md) — ownership of component and shared state.
- [Data Access](./data-access.md) — persistence and infrastructure boundaries.
- [Functions](./functions.md) — extracting logic from components.