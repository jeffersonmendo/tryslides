# Modules

This document defines how modules and feature boundaries should be organized in this project.

The goal is to keep features cohesive, reduce accidental coupling, and make dependencies between parts of the application easy to understand.

A module should expose a clear capability while keeping its internal implementation private whenever possible.

---

## 1. A Module Represents a Responsibility

A module should group code that belongs to the same product capability or technical responsibility.

Examples:

```text id="f0bs6i"
features/
├── auth/
├── billing/
├── presentations/
└── sharing/
```

Each feature owns its implementation.

For example:

```text id="s7foc1"
features/
└── presentations/
    ├── components/
    ├── actions/
    ├── services/
    ├── repositories/
    ├── schemas/
    └── types/
```

Not every module needs every directory.

Only create internal structure when the responsibility actually exists.

---

## 2. Keep Internal Code Internal

A module may contain internal implementation details that should not be consumed directly by unrelated modules.

For example:

```text id="qclh6h"
features/
└── billing/
    ├── services/
    │   └── calculate-invoice.ts
    ├── repositories/
    │   └── billing-repository.ts
    └── components/
        └── billing-summary.tsx
```

Another feature should not reach deeply into `billing` simply because a function is technically importable.

Avoid:

```ts id="wg0pve"
import { calculateInvoice }
  from "@/features/billing/services/internal/calculate-invoice"
```

when `billing` should expose a higher-level capability instead.

Dependencies should target intentional APIs, not internal file paths.

---

## 3. Public APIs Should Be Intentional

A module should expose only what other parts of the application genuinely need.

Conceptually:

```text id="x45w6t"
Billing
├── public capabilities
│   ├── createSubscription
│   └── getBillingStatus
│
└── internal implementation
    ├── stripe adapter
    ├── helpers
    ├── schemas
    └── persistence details
```

The consumer should depend on:

```ts id="3k6ofg"
createSubscription()
```

not on every internal step required to implement it.

Do not make every file public by default.

A public API should represent a meaningful capability or reusable contract.

---

## 4. Avoid Cross-Feature Internal Imports

Features should not depend directly on the internal implementation of other features.

Avoid:

```text id="z802ce"
auth
↓
billing/internal/helper

presentations
↓
users/internal/repository
```

If one feature requires something from another, prefer one of these:

```text id="jhha22"
Feature A
↓
public capability of Feature B
```

or, when the behavior belongs above both features:

```text id="x1c3xf"
Application coordinator
├── Feature A
└── Feature B
```

If many features continuously reach into each other's internals, the module boundaries may be incorrect.

---

## 5. Shared Modules Must Have Real Shared Ownership

Do not move code into a global shared module merely because two files currently use it.

First ask:

- does this concept belong to one feature?
- is reuse likely to remain stable?
- is the behavior genuinely independent from feature-specific rules?

Good shared candidates may include:

```text id="iv4j1g"
shared UI primitives
generic formatting
application-wide contracts
common infrastructure
```

Poor shared candidates often include:

```text id="pgf8cl"
feature-specific business rules
feature-specific validation
domain behavior owned by one capability
```

Prefer duplication of a tiny simple implementation over creating the wrong shared abstraction.

---

## 6. Avoid Generic Module Dumping Grounds

Directories such as:

```text id="a49xjq"
shared/
common/
lib/
utils/
helpers/
```

should have a clearly documented responsibility.

Do not use them as the default destination for code without an obvious owner.

For example:

```text id="sa1a2k"
lib/
├── stripe/
├── database/
└── email/
```

can be reasonable if `lib/` is explicitly defined as infrastructure integrations.

This is less clear:

```text id="yyjq9q"
lib/
├── date.ts
├── billing.ts
├── user.ts
├── editor.ts
├── random-helper.ts
└── calculations.ts
```

when unrelated application behavior accumulates there.

A generic folder becoming difficult to describe is a signal that code should be reorganized by responsibility.

---

## 7. Prefer Direct Imports

Prefer importing the exact capability needed.

Example:

```ts id="nsg05b"
import { UserCard } from "@/features/users/components/user-card"
```

This makes dependencies explicit.

Avoid introducing large barrel files only to shorten imports:

```ts id="kjnk5h"
import {
  UserCard,
  deleteUser,
  UserSchema,
  UserRepository,
} from "@/features/users"
```

when doing so hides which part of the module is actually being consumed or creates unnecessary dependency chains.

A small intentional public entry point may still be appropriate when a module has a stable public API.

Barrels are not forbidden; they must solve a real module-boundary problem.

See [`imports.md`](./imports.md) for detailed import conventions.

---

## 8. Module Dependencies Should Be Directional

Dependencies between modules should have a clear reason.

Avoid circular relationships such as:

```text id="4c6brh"
Feature A
↓
Feature B
↓
Feature A
```

When circular dependencies appear, investigate whether:

- responsibilities are mixed
- a shared concept should move to a more appropriate owner
- coordination belongs at a higher application level
- the modules should actually be one feature

Do not resolve circular dependencies merely by adding another helper file that hides the cycle.

---

## 9. Modules May Define Contracts

A module may define contracts for capabilities it requires from infrastructure or other layers.

Example:

```ts id="h9fvg6"
export interface PresentationRepository {
  findById(id: string): Promise<Presentation | null>
  save(presentation: Presentation): Promise<void>
}
```

The implementation may live elsewhere:

```text id="goawx1"
Presentation module
↓ defines contract

Infrastructure
↑ implements contract
```

This allows the module to depend on what it needs without knowing the implementation technology.

Do not create interfaces automatically for every function.

Contracts are useful when they represent a meaningful boundary.

---

## 10. Module Size Should Follow Cohesion

Do not split a module simply because it contains many files.

A large feature may still be cohesive.

Likewise, a small feature may contain unrelated responsibilities and need restructuring.

Ask:

> Does this code change for the same product reason?

If yes, keeping it together may be correct.

If a module starts representing several unrelated capabilities, split it around those responsibilities rather than around arbitrary file counts.

---

## Related Standards

- [Architecture](./architecture.md) — dependency direction and responsibility boundaries.
- [Project Structure](./project-structure.md) — where modules and features live.
- [Imports](./imports.md) — import visibility and dependency conventions.
- [Data Access](./data-access.md) — infrastructure boundaries and repository contracts.
- [Components](./components.md) — feature-owned and shared UI.
- [Code Quality](./code-quality.md) — cohesion and abstraction principles.