# TypeScript

This document defines how TypeScript should be used in this project.

The goal is to use the type system to make application contracts explicit, prevent invalid states where practical, and improve refactoring without creating unnecessary type complexity.

This document does not teach TypeScript. For language-specific implementation details and advanced TypeScript patterns, always consult the TypeScript skill.

---

## 1. Prefer Type Safety

Application-owned code should remain type-safe.

Avoid `any` because it disables the guarantees TypeScript provides.

Avoid:

```ts
function parseUser(data: any) {
  return data.name
}
```

When the value is genuinely unknown, prefer:

```ts
function parseUser(data: unknown) {
  // validate or narrow before using
}
```

Use `any` only when interacting with unavoidable untyped code and when a safer alternative would add unreasonable complexity.

When possible, isolate it at the integration boundary instead of allowing it to spread through the application.

---

## 2. Prefer Inference When the Type Is Obvious

Do not annotate values TypeScript can clearly infer.

Prefer:

```ts
const user_name = "Jefferson"
const is_active = true
const users = await getUsers()
```

instead of:

```ts
const user_name: string = "Jefferson"
const is_active: boolean = true
```

Explicit types are useful when they define an important contract.

For example:

```ts
function getUserById(id: string): Promise<User | null> {
  // ...
}
```

or:

```ts
const config = {
  default_locale: "en",
} satisfies AppConfig
```

Use types to communicate information that matters, not to repeat information the compiler already knows.

---

## 3. Model Meaningful States Explicitly

Prefer types that represent the actual states an application value can have.

Avoid overly loose representations:

```ts
type RequestState = {
  status: string
  data?: User
  error?: string
}
```

when the states are known.

Prefer:

```ts
type RequestState =
  | {
      status: "idle"
    }
  | {
      status: "loading"
    }
  | {
      status: "success"
      data: User
    }
  | {
      status: "error"
      error: string
    }
```

This prevents impossible combinations such as a successful state containing an error but no data.

Use discriminated unions when they make meaningful state transitions safer and clearer.

Do not introduce complex unions for trivial values that do not benefit from them.

---

## 4. `type` and `interface`

Use both according to what they represent rather than enforcing one universally.

Prefer `type` for:

- unions
- intersections
- aliases
- mapped or derived types
- component props
- data shapes that do not require interface extension

Example:

```ts
type UserRole = "admin" | "member"

type UserCardProps = {
  user: User
  onDelete: (id: string) => void
}
```

`interface` is appropriate for contracts intended to be implemented or extended.

Example:

```ts
interface PresentationRepository {
  findById(id: string): Promise<Presentation | null>
  save(presentation: Presentation): Promise<void>
}
```

Do not convert between `type` and `interface` merely for stylistic consistency when the existing choice communicates the concept correctly.

---

## 5. Prefer Derived Types Over Duplicated Types

Do not manually maintain multiple types that represent the same source of truth.

Avoid:

```ts
type User = {
  id: string
  name: string
  email: string
}

type UserPreview = {
  id: string
  name: string
}
```

when the relationship is intentionally derived:

```ts
type UserPreview = Pick<User, "id" | "name">
```

The same principle applies when types can safely be inferred or derived from:

- schemas
- constants
- domain models
- library types
- function return values

However, do not create clever chains of utility types that make an important application contract difficult to understand.

Explicit duplication can occasionally be appropriate when two concepts happen to look the same today but represent independent contracts.

---

## 6. Avoid Unsafe Type Assertions

Do not use type assertions merely to silence the compiler.

Avoid:

```ts
const user = response as User
```

when `response` comes from an untrusted external source.

A type assertion does not validate runtime data.

External input should be validated or narrowed at the appropriate boundary:

```ts
const user = user_schema.parse(response)
```

Assertions may be appropriate when the application has information TypeScript cannot reasonably infer.

When using one, the reason should be clear from the surrounding code.

Avoid:

```ts
value as unknown as Something
```

unless there is an exceptional and documented interoperability reason.

---

## 7. Keep External and Internal Types Separate When Needed

External systems may expose representations that should not spread through application code.

For example:

```ts
type ProviderCustomer = {
  customerId: string
  subscriptionStatus: string
}
```

The application may map that representation into its own model:

```ts
type Customer = {
  customer_id: string
  subscription_status: SubscriptionStatus
}
```

Conceptually:

```text
External Data
↓
Validation / Mapping
↓
Application Type
↓
Application Logic
```

Do not create separate DTOs, domain models, and persistence models automatically for every entity.

Separate representations when they protect a meaningful boundary or represent genuinely different concepts.

---

## 8. Use Generics When They Preserve Meaning

Generics are useful when multiple values share the same structural relationship.

Example:

```ts
type Result<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: AppError
    }
```

Avoid generics that make simple code harder to understand:

```ts
type AbstractEntityProcessor<
  TEntity,
  TInput,
  TOutput,
  TContext,
  TMetadata
> = ...
```

unless the abstraction genuinely requires that flexibility.

Prefer the simplest type that correctly represents the contract.

---

## 9. Types Should Follow Ownership

Keep types close to the code or feature that owns them.

Feature-specific:

```text
features/
└── presentations/
    └── types/
        └── presentation.ts
```

Component-specific types may remain in the component file when they are only used there:

```ts
type PresentationCardProps = {
  presentation: Presentation
  onSelect: (id: string) => void
}
```

Move a type into shared application types only when it is genuinely shared and has no clearer feature owner.

Do not create a global `types/` dumping ground.

---

## 10. Runtime Validation and TypeScript Are Different Responsibilities

TypeScript protects code during development and compilation.

It does not make external runtime data trustworthy.

Values entering from boundaries such as:

- forms
- APIs
- webhooks
- URL parameters
- environment variables
- persisted untrusted data
- AI tool input

may require runtime validation.

Conceptually:

```text
Unknown external data
↓
Runtime validation
↓
Typed application data
↓
Internal code
```

Once data has been validated and transformed into a trusted internal representation, avoid validating it repeatedly without reason.

See [`validation.md`](./validation.md).

---

## 11. Keep Types Understandable

Advanced TypeScript is useful when it removes duplication or protects important contracts.

It becomes harmful when developers need to decode the type system before understanding the application.

Prefer:

```text
Clear domain model
Clear function contract
Clear union
```

over type-level cleverness for its own sake.

When a sophisticated generic or conditional type is genuinely necessary, give it a meaningful name and document non-obvious reasoning.

---

## TypeScript Skill

Before implementing TypeScript-heavy code, especially involving:

- advanced generics
- conditional types
- mapped types
- inference
- complex unions
- library typing
- type-level transformations

review the installed TypeScript skill.

These standards define **how TypeScript should fit into our codebase**.

The skill defines **how to implement TypeScript correctly and effectively**.

---

## Related Standards

- [Naming](./naming.md) — naming types, interfaces, variables, and functions.
- [Functions](./functions.md) — input and output contracts.
- [Modules](./modules.md) — ownership and visibility of types.
- [Validation](./validation.md) — runtime validation of external data.
- [Data Access](./data-access.md) — external and persistence representations.
- [Code Quality](./code-quality.md) — avoiding unnecessary complexity.