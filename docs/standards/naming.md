# Naming

This document defines naming conventions for this project.

Names should communicate **purpose and responsibility** without requiring developers to inspect the implementation.

Consistency is more important than personal preference. Do not introduce a different naming convention inside a feature unless there is a technical reason or an external API requires it.

---

## 1. Files and Directories

### Rule

Files and directories use `kebab-case`.

```text
user-card.tsx
create-user.ts
user-schema.ts
state-management/
data-access/
```

Avoid:

```text
UserCard.tsx
user_card.tsx
createUser.ts
StateManagement/
```

### Why

A single filesystem convention makes paths predictable and avoids mixing TypeScript identifier conventions with filesystem naming.

Framework-required filenames are exceptions.

Examples:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
route.ts
```

Third-party tools or generated files may also require their own naming conventions.

---

## 2. Variables

### Rule

Application-owned variables use `snake_case`.

```ts
const current_user = getCurrentUser()
const presentation_id = params.id
const is_loading = false
const selected_element = elements[0]
```

Avoid mixing styles:

```ts
const currentUser = getCurrentUser()
const presentationId = params.id
```

### Why

Variables are visually distinguishable from functions and types while maintaining one predictable convention across the codebase.

External data should not be renamed mechanically merely to satisfy this rule when preserving its original representation is important.

For example, a third-party API may return:

```ts
response.customerId
```

Do not mutate external contracts solely for naming consistency.

Normalize external data at a boundary when the application benefits from owning its internal representation.

---

## 3. Functions

### Rule

Functions use descriptive `camelCase` names.

```ts
getCurrentUser()
createPresentation()
calculateOrderTotal()
saveDocument()
```

Prefer names that describe an action or capability.

Avoid vague names:

```ts
handle()
process()
execute()
doStuff()
manageData()
```

unless the surrounding abstraction makes the meaning genuinely obvious.

### Event Handlers

Internal event handlers may use `handleXxx` when they represent handling a specific event:

```ts
function handleSubmit() {}

function handleSelectionChange() {}
```

Application operations should describe the actual operation instead:

```ts
createUser()
deletePresentation()
updateSubscription()
```

Do not call every function `handleSomething`.

---

## 4. Components

### Rule

React component identifiers use `PascalCase`.

```tsx
function UserCard() {}

function PresentationEditor() {}

function PricingSection() {}
```

The filename remains `kebab-case`:

```text
user-card.tsx
presentation-editor.tsx
pricing-section.tsx
```

### Naming by Responsibility

Component names should describe what the component represents.

Prefer:

```text
UserCard
PaymentForm
EditorToolbar
PresentationList
```

Avoid generic names:

```text
Container
Wrapper
Component
Section2
ItemThing
DataBox
```

unless the generic concept is genuinely the component's responsibility.

Do not include implementation details in the name unless they are meaningful to consumers.

---

## 5. Types and Interfaces

### Rule

Types and interfaces use `PascalCase`.

```ts
type User = {}

type PresentationDocument = {}

interface PresentationRepository {}
```

Do not prefix interfaces with `I`:

```ts
interface IUser {}
interface IPresentationRepository {}
```

Prefer:

```ts
interface User {}
interface PresentationRepository {}
```

The name should describe the concept, not the TypeScript construct used to represent it.

### Props

Component props should normally use the component name followed by `Props`.

```ts
type UserCardProps = {
  user: User
  onDelete: (id: string) => void
}
```

This keeps prop types easy to locate and understand.

---

## 6. Constants

### Rule

True application constants use `UPPER_SNAKE_CASE`.

```ts
const MAX_UPLOAD_SIZE = 10_000_000
const DEFAULT_LOCALE = "en"
const MAX_RETRY_COUNT = 3
```

Do not use uppercase merely because a variable is declared with `const`.

```ts
const current_user = user
const presentation_id = presentation.id
```

These values are variables whose bindings happen to be immutable, not application constants.

Use `UPPER_SNAKE_CASE` for values that conceptually behave as fixed configuration or named constants.

---

## 7. Booleans

Boolean names should communicate the condition they represent.

Prefer condition-oriented prefixes such as:

```ts
const is_loading = true
const is_authenticated = false
const has_access = true
const can_edit = false
const should_refresh = true
```

Avoid ambiguous booleans:

```ts
const loading = true
const access = true
const edit = false
```

The name should make conditions readable:

```ts
if (can_edit) {
  // ...
}
```

instead of:

```ts
if (edit) {
  // ...
}
```

---

## 8. Hooks

React hooks follow the standard React `use` prefix.

```ts
useEditor()
useSelection()
useCurrentUser()
```

Hook files remain `kebab-case`:

```text
use-editor.ts
use-selection.ts
use-current-user.ts
```

Do not use `use` for ordinary functions that are not React hooks.

```ts
useCalculatePrice()
```

is misleading if the function does not use React's hook model.

Prefer:

```ts
calculatePrice()
```

For React-specific hook implementation practices, consult the React skill.

---

## 9. Callback Props

Callback props use the `onXxx` convention.

```tsx
type EditorToolbarProps = {
  onSave: () => void
  onDelete: () => void
  onSelectionChange: (id: string) => void
}
```

The component communicates **what happened or what was requested**, rather than exposing the implementation that handles it.

Example:

```tsx
<Button onClick={onSave}>
  Save
</Button>
```

Prefer:

```text
onSave
onClose
onSelect
onDelete
onValueChange
```

over implementation-oriented names such as:

```text
saveToDatabase
callDeleteApi
updateSupabase
```

A UI component should not need to know how its consumer fulfills the callback.

See [Components](./components.md) for component communication boundaries.

---

## 10. Schemas, Services, Repositories, and Actions

Names should describe the capability or concept first and the architectural role when that role adds useful context.

Examples:

```text
login-schema.ts
create-user-schema.ts

presentation-repository.ts
subscription-repository.ts

create-presentation.ts
delete-account.ts
```

Types may use architectural suffixes when they communicate a meaningful contract:

```ts
interface PresentationRepository {}

type CreateUserInput = {}

type UpdatePresentationResult = {}
```

Avoid meaningless architectural names:

```text
user-manager.ts
data-helper.ts
presentation-processor.ts
general-service.ts
```

If a file cannot be named clearly, reconsider whether its responsibility is sufficiently cohesive.

---

## 11. External Contracts

Application naming conventions apply to code owned by the application.

Do not blindly rename fields from:

- external APIs
- database drivers
- webhooks
- third-party SDKs
- generated types
- framework APIs

For example, if an external service defines:

```ts
{
  customerId: "...",
  paymentStatus: "..."
}
```

preserving that shape at the integration boundary may be appropriate.

When external data enters the application's own domain or internal model, it may be mapped into the application's naming conventions.

This keeps external contracts isolated without spreading inconsistent naming throughout the codebase.

---

## General Guideline

Choose names based on **what something represents or does**, not how it happens to be implemented today.

Prefer:

```ts
savePresentation()
```

over:

```ts
savePresentationToSupabase()
```

when callers should not care which persistence provider is used.

Prefer:

```ts
sendPasswordReset()
```

over:

```ts
sendResendEmail()
```

when the provider is an infrastructure detail.

Implementation-specific names are appropriate inside the infrastructure implementation itself.

Good naming reinforces architectural boundaries.

---

## Related Standards

- [Project Structure](./project-structure.md) — where named files and directories belong.
- [Architecture](./architecture.md) — responsibilities and dependency boundaries.
- [Components](./components.md) — component and callback conventions.
- [Functions](./functions.md) — function responsibilities and structure.
- [TypeScript](./typescript.md) — type design and TypeScript conventions.
- [Data Access](./data-access.md) — repository and infrastructure naming context.