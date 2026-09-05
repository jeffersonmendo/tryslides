# Project Structure

This document defines how application code should be organized in this project.

The goal is to make file placement predictable. When creating new code, a developer should be able to determine where it belongs based on **ownership and responsibility**, not personal preference.

The structure is a guide, not a requirement to create every possible directory.

---

## 1. Organization Principle

Organize application code primarily by responsibility and product ownership.

A typical project may look like:

```text
src/
├── app/
├── components/
│   └── ui/
├── features/
├── hooks/
├── lib/
└── types/
```

Not every project needs every directory.

Do not create folders in advance because they may be useful someday.

Create them when actual code has a clear reason to live there.

---

## 2. `app/` — Application Entry Points

`app/` owns the Next.js application structure.

It may contain:

- routes
- layouts
- pages
- loading and error boundaries
- Route Handlers
- route-specific composition
- Next.js metadata and framework entry points

Example:

```text
app/
├── [locale]/
│   ├── dashboard/
│   │   └── page.tsx
│   └── layout.tsx
└── api/
```

Pages and layouts should primarily **compose application capabilities**.

Avoid turning route files into large implementations containing UI, business rules, validation, database queries, and unrelated helpers together.

When behavior belongs to a product capability, move that responsibility to its feature.

For framework-specific implementation details, consult the Next.js skill.

---

## 3. `features/` — Product Capabilities

`features/` contains code owned by a specific product capability.

Example:

```text
features/
├── auth/
├── billing/
├── presentations/
└── sharing/
```

A feature may contain:

```text
presentations/
├── components/
├── actions/
├── hooks/
├── schemas/
├── services/
├── repositories/
└── types/
```

These directories are **not mandatory**.

For example, if a feature has no meaningful service layer:

```text
presentations/
├── components/
├── actions/
└── schemas/
```

is preferable to creating empty architectural layers.

Feature-specific code should remain inside the feature until it becomes genuinely shared.

---

## 4. `components/` — Shared UI

Global `components/` is reserved for UI that is genuinely reusable outside a single product feature.

Reusable UI primitives belong in:

```text
components/
└── ui/
    ├── button.tsx
    ├── dialog.tsx
    ├── input.tsx
    └── ...
```

Feature-specific UI belongs with its feature:

```text
features/
└── billing/
    └── components/
        ├── pricing-card.tsx
        └── payment-form.tsx
```

Do not move a component into global `components/` merely because it is a React component.

Ownership determines placement.

A shared `Button` belongs in `components/ui`.

A `SubscriptionCard` that only exists for billing belongs in `features/billing/components`.

Component behavior and boundaries are defined in [`components.md`](./components.md).

---

## 5. Supporting Directories

Some responsibilities may justify top-level supporting directories.

For example:

### `hooks/`

Use for hooks that are genuinely reusable across unrelated features.

Feature-owned hooks stay inside their feature:

```text
features/editor/hooks/use-selection.ts
```

A global hook should represent behavior with no clear feature owner.

### `types/`

Use for truly application-wide types when necessary.

Prefer keeping domain- or feature-specific types close to their owner.

```text
features/users/types/user.ts
```

is preferable to moving every type into a global `types/` directory.

### `lib/`

`lib/` may contain application-level integrations, configuration, or infrastructure utilities that do not belong to a specific feature.

For example:

```text
lib/
├── stripe/
├── email/
└── database/
```

`lib/` must not become a dumping ground for unrelated functions.

If code has a clear feature owner, keep it with that feature.

If `lib/` starts containing unrelated business logic, reconsider its placement.

---

## 6. Colocation and Ownership

Prefer placing code close to the responsibility that owns it.

For example:

```text
features/
└── auth/
    ├── components/
    │   └── login-form.tsx
    ├── actions/
    │   └── login.ts
    ├── schemas/
    │   └── login-schema.ts
    └── types/
        └── auth.ts
```

This makes the feature understandable without searching across the entire repository.

Avoid organizing everything globally:

```text
components/login-form.tsx
actions/login.ts
schemas/login-schema.ts
types/auth.ts
```

when all of those files belong exclusively to the same capability.

Code should move out of a feature only when its ownership actually changes.

---

## 7. Choosing Where New Code Belongs

When creating a file, determine ownership before choosing a directory.

Ask:

**Is this a Next.js entry point?**

→ `app/`

**Does this belong to one product capability?**

→ `features/<feature>/`

**Is this reusable presentation UI with no product-specific behavior?**

→ `components/ui/`

**Is this behavior shared across unrelated features?**

→ consider an appropriate shared location.

**Does this integrate application code with external infrastructure?**

→ place it behind the appropriate infrastructure/data-access boundary.

Do not create a new global directory simply because no existing folder immediately feels appropriate.

First determine the responsibility of the code.

---

## 8. Keep the Structure Cohesive

Directories and files should communicate meaningful responsibilities.

Avoid structures such as:

```text
utils/
helpers/
misc/
common/
stuff/
```

when there is no clear definition of what belongs there.

These names are not universally forbidden, but their responsibility must be explicit.

Likewise, avoid excessive fragmentation.

A feature does not need:

```text
controllers/
managers/
services/
use-cases/
repositories/
adapters/
factories/
```

unless those responsibilities genuinely exist.

The preferred structure is the **smallest structure that clearly represents the application**.

---

## Related Standards

- [Architecture](./architecture.md) — architectural boundaries and dependency direction.
- [Components](./components.md) — component ownership and responsibilities.
- [Modules](./modules.md) — module boundaries and public/internal APIs.
- [Imports](./imports.md) — how modules may depend on each other.
- [Data Access](./data-access.md) — database and external infrastructure boundaries.
- [Naming](./naming.md) — naming files and directories.