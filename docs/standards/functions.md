# Functions

This document defines how functions should be designed and organized in this project.

Functions should communicate intent, have cohesive responsibilities, and make side effects easy to identify.

The goal is readable and maintainable code, not enforcing arbitrary limits on function size or number of parameters.

---

## 1. One Cohesive Responsibility

A function should perform one cohesive operation.

Prefer:

```ts
function calculateOrderTotal(order: Order) {
  const subtotal = calculateSubtotal(order.items)
  const discount = calculateDiscount(order, subtotal)
  const tax = calculateTax(subtotal - discount)

  return subtotal - discount + tax
}
```

over a function that:

```text
calculates the order
saves it
sends an email
updates analytics
redirects the user
```

A function may perform several internal steps when all of them contribute to the same responsibility.

Do not split functions merely to satisfy a line-count rule.

---

## 2. Name Functions by Intent

Function names should describe what they accomplish.

Prefer:

```ts
getCurrentUser()
createPresentation()
calculateOrderTotal()
validateInvitation()
sendPasswordReset()
```

Avoid vague names:

```ts
process()
execute()
manage()
doWork()
handleData()
```

unless the surrounding abstraction gives those names a precise meaning.

The caller should understand the operation without needing to inspect its implementation.

Naming conventions are defined further in [`naming.md`](./naming.md).

---

## 3. Keep Inputs Explicit

A function should receive the information required to perform its responsibility.

Prefer:

```ts
createUser({
  name,
  email,
})
```

over relying unnecessarily on hidden mutable state.

When several parameters belong to the same operation, use a parameter object when it improves readability:

```ts
type CreateUserInput = {
  name: string
  email: string
  role: UserRole
}

function createUser(input: CreateUserInput) {
  // ...
}
```

Simple functions do not need parameter objects:

```ts
getUserById(id)
```

Do not introduce input types or objects when they make a trivial function harder to read.

---

## 4. Make Side Effects Clear

Functions that perform side effects should make that behavior understandable from their responsibility and context.

Examples of side effects include:

- database writes
- external API calls
- sending email
- modifying shared state
- writing files
- analytics events

Prefer explicit operations:

```ts
savePresentation()
sendInvitationEmail()
updateSubscription()
```

over hiding significant effects inside apparently harmless helpers:

```ts
formatPresentation()
```

that unexpectedly persists data or calls external services.

Pure transformations are preferable when the operation naturally allows them:

```ts
function calculateTotal(items: Item[]) {
  return items.reduce(
    (total, item) => total + item.price,
    0,
  )
}
```

Do not force functions to be pure when their actual responsibility requires an effect.

---

## 5. Use Private Helpers for Internal Steps

A file may contain private helper functions when they exist solely to support its main responsibility.

Example:

```ts
function calculateSubtotal(items: Item[]) {
  // ...
}

function calculateTax(subtotal: number) {
  // ...
}

export function calculateOrderTotal(order: Order) {
  const subtotal = calculateSubtotal(order.items)
  const tax = calculateTax(subtotal)

  return subtotal + tax
}
```

These helpers do not need separate files simply because they are separate functions.

Extract them when doing so:

- clarifies the main operation
- isolates meaningful logic
- enables legitimate reuse
- gives an important concept a name

Avoid excessive extraction that forces developers to jump between files to understand a simple operation.

---

## 6. Prefer Clear Control Flow

Prefer control flow that makes the successful path and exceptional conditions easy to understand.

Early returns are appropriate when they reduce unnecessary nesting.

```ts
function getDisplayName(user: User) {
  if (!user.profile) {
    return user.email
  }

  if (user.profile.display_name) {
    return user.profile.display_name
  }

  return user.profile.name
}
```

Avoid deeply nested conditions when the same behavior can be expressed more clearly.

However, do not mechanically rewrite every conditional into an early return.

Clarity is the goal.

---

## 7. Avoid Boolean Arguments When Their Meaning Is Unclear

Calls such as:

```ts
createUser(data, true, false)
```

make behavior difficult to understand.

Prefer explicit options:

```ts
createUser(data, {
  send_invitation: true,
  create_profile: false,
})
```

A boolean argument is acceptable when its meaning is obvious from the function and call site.

Do not create configuration objects for every simple boolean solely to follow a rule.

---

## 8. Keep Business Functions Independent From UI

Business behavior should not require React components, hooks, or UI state to execute.

Prefer:

```ts
function canDeletePresentation(
  presentation: Presentation,
  user: User,
) {
  return presentation.owner_id === user.id
}
```

instead of embedding the rule directly into a component.

The component can consume the result:

```tsx
const can_delete = canDeletePresentation(
  presentation,
  current_user,
)

<PresentationMenu
  canDelete={can_delete}
  onDelete={handleDelete}
/>
```

Do not extract ordinary presentation expressions when they only matter to that component.

The distinction is whether the function represents reusable application behavior or local UI behavior.

---

## 9. Do Not Create Pass-Through Functions Without Purpose

Avoid functions that exist only to forward arguments without adding a meaningful responsibility.

```ts
function savePresentation(data: Presentation) {
  return repository.savePresentation(data)
}
```

may be unnecessary if it adds no:

- business behavior
- validation
- authorization
- coordination
- transformation
- abstraction boundary

Sometimes a forwarding function is legitimate because it defines an intentional application API.

The question is not whether the function contains enough code.

The question is whether it represents a meaningful boundary.

---

## 10. Functions Should Be Easy to Change

A good function should make its dependencies and responsibility apparent.

Reconsider a function when:

- it requires many unrelated inputs
- its name cannot describe everything it does
- changing one behavior affects unrelated behavior
- it mixes business logic with infrastructure details unnecessarily
- it produces unexpected side effects
- it contains several unrelated reasons to change

Do not measure function quality primarily by line count.

A longer cohesive function can be easier to maintain than several tiny functions with unclear relationships.

---

## Framework-Specific Functions

Server Actions, React hooks, Route Handlers, Server Components, and other framework constructs have additional requirements.

These standards define the general engineering expectations.

For implementation details:

- Next.js → consult the Next.js skill
- React/hooks → consult the React skill
- TypeScript → consult the TypeScript skill

Do not duplicate framework documentation here.

---

## Related Standards

- [Naming](./naming.md) — function and parameter naming.
- [Architecture](./architecture.md) — responsibility and dependency boundaries.
- [Components](./components.md) — UI logic versus application logic.
- [Modules](./modules.md) — function ownership and visibility.
- [TypeScript](./typescript.md) — input, output, and type conventions.
- [Code Quality](./code-quality.md) — readability, cohesion, and refactoring.