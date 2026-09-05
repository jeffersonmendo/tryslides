# Imports

This document defines how imports should be organized in this project.

The goal is to keep dependencies explicit, preserve module boundaries, make files easy to move and understand, and prevent implementation details from leaking across features.

Imports should reflect the architecture of the application.

---

## 1. Prefer the Project Alias for Application Imports

Use the configured `@/` alias for imports that cross meaningful application directories.

Prefer:

```ts
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/features/auth/actions/get-current-user"
import { env } from "@/lib/env"
```

instead of:

```ts
import { Button } from "../../../../components/ui/button"
```

The alias makes application-level dependencies easier to understand and avoids fragile relative paths.

---

## 2. Relative Imports Are Appropriate for Nearby Internal Code

Relative imports are appropriate when files belong to the same local responsibility.

Example:

```text
features/
└── editor/
    ├── editor.ts
    ├── normalize-element.ts
    └── types.ts
```

Inside `editor.ts`:

```ts
import { normalizeElement } from "./normalize-element"
import type { EditorElement } from "./types"
```

This communicates that the dependency is local to the module.

Do not replace every local import with `@/` merely for visual consistency.

A useful default is:

```text
Same local module
→ relative import

Different application area
→ @/ alias
```

Clarity and ownership are more important than enforcing one syntax everywhere.

---

## 3. Imports Must Respect Module Boundaries

A feature should not reach into another feature's private implementation.

Avoid:

```ts
import { stripe_client }
  from "@/features/billing/internal/stripe-client"
```

when another feature only needs a billing capability.

Prefer:

```ts
import { createSubscription }
  from "@/features/billing/create-subscription"
```

or another intentionally exposed module API.

The fact that a file can technically be imported does not mean it is part of the module's public contract.

See [`modules.md`](./modules.md).

---

## 4. Dependency Direction Matters

Imports should follow the dependency direction established by the architecture.

Conceptually:

```text
Presentation
↓
Application / Feature Capability
↓
Domain / Contracts
↑
Infrastructure Implementations
```

Avoid dependencies that reverse intended ownership.

For example, application logic should not import a React component merely to access a helper:

```text
Application Service
↓
React Component
```

Move the shared behavior to the layer that actually owns it.

Likewise, domain or application code should not depend unnecessarily on:

```text
UI
Framework presentation details
Provider-specific infrastructure
```

Imports are one of the clearest ways to detect architectural leakage.

---

## 5. Avoid Circular Dependencies

Modules should not depend on each other in cycles.

Avoid:

```text
users
↓
billing
↓
users
```

or:

```text
editor.ts
↓
selection.ts
↓
editor.ts
```

Circular imports often indicate unclear ownership.

When a cycle appears, investigate whether:

- a responsibility belongs in a different module
- coordination belongs at a higher level
- a shared contract should be extracted
- two modules actually represent one cohesive capability

Do not create a random `helpers.ts` merely to hide the cycle.

Fix the ownership problem when possible.

---

## 6. Prefer Direct Imports Over Large Barrels

Prefer importing from the module that owns the capability:

```ts
import { Button } from "@/components/ui/button"
import { createPresentation }
  from "@/features/presentations/actions/create-presentation"
```

Avoid large barrel files that re-export unrelated parts of the application:

```ts
import {
  Button,
  createPresentation,
  PresentationRepository,
  presentation_schema,
  useEditor,
} from "@/features/presentations"
```

when the barrel hides where those responsibilities actually live.

Barrels may also introduce:

- unclear dependencies
- accidental public APIs
- circular dependency risk
- unnecessary module loading relationships

Barrel files are not forbidden.

Use them when they intentionally define a small, stable public module API.

---

## 7. Do Not Import Through Unrelated Layers

Do not use another module merely as a shortcut to reach a dependency.

Avoid:

```text
Feature A
↓
Feature B
↓ re-exports shared utility
Shared Utility
```

when Feature A can depend on the actual owner:

```text
Feature A
↓
Shared Utility
```

Re-exporting should represent an intentional public API, not convenience routing.

Dependencies should point toward the real owner of the capability.

---

## 8. Use Type-Only Imports When Appropriate

When an import exists only for TypeScript types, prefer a type-only import where appropriate.

```ts
import type { Presentation } from "./types"
```

This communicates that the dependency is compile-time only.

When importing values and types from the same module, keep the representation clear according to the project's formatter and TypeScript configuration.

Do not restructure otherwise clear imports merely to create type-only imports everywhere.

Consult the TypeScript skill for language-specific behavior.

---

## 9. Keep Server-Only Dependencies Out of Client Modules

Client code must not import modules that depend on server-only infrastructure.

Avoid:

```text
Client Component
↓
Repository
↓
Database Client
```

or:

```text
Client Component
↓
Server Environment Configuration
```

Even when a client file only wants one harmless export from a module, importing that module may create an inappropriate dependency boundary.

Separate responsibilities when necessary.

For example:

```text
config/
├── shared-config.ts
└── server-config.ts
```

may be clearer than one configuration module containing both public and secret values.

The exact framework behavior should follow the current Next.js guidance.

See [`server-client.md`](./server-client.md).

---

## 10. Import From the Most Stable Appropriate Boundary

Prefer dependencies that are less likely to expose implementation details.

For example, application code may depend on:

```ts
import type { PaymentGateway }
  from "@/features/billing/contracts/payment-gateway"
```

while infrastructure depends on:

```ts
import { stripe } from "@/lib/stripe"
```

The application does not need to know which provider implements the contract.

Likewise, UI may depend on:

```ts
import type { Presentation }
  from "@/features/presentations/types/presentation"
```

without importing the persistence implementation that loads it.

Choose the import that represents the capability the consumer actually needs.

---

## 11. Third-Party Imports Should Stay Near Their Responsibility

Third-party packages should not spread throughout the application when they represent infrastructure or a specific integration.

For example, if Stripe is abstracted behind billing infrastructure, avoid importing Stripe directly from unrelated feature code.

Prefer:

```text
Application
↓
Billing Capability
↓
Stripe Integration
↓
stripe package
```

The same principle may apply to:

```text
email providers
storage providers
database SDKs
analytics
external APIs
```

Framework libraries such as React and Next.js naturally appear where their framework responsibilities require them.

Do not wrap third-party libraries merely to avoid seeing their imports.

Create a boundary when the dependency represents an implementation detail worth isolating.

---

## 12. Import Organization Should Remain Readable

Keep imports easy to scan.

A file may naturally contain:

```text
Framework / external dependencies

Application dependencies

Local module dependencies

Type dependencies
```

but do not manually fight the configured formatter or linter to enforce decorative grouping.

Biome and the project's tooling should handle mechanical formatting where possible.

The engineering concern is:

- dependency clarity
- correct ownership
- correct boundaries
- absence of unnecessary cycles

not visual perfection of the import block.

---

## Warning Signs

Review the dependency structure when you see:

- long chains of `../../../`
- one feature importing another feature's internal files
- application logic importing UI components
- Client Components importing server infrastructure
- provider SDKs appearing throughout unrelated modules
- large `index.ts` files exporting entire directories
- circular dependencies
- a shared module importing feature-specific code
- imports routed through unrelated modules
- moving one file breaking many unrelated paths

These often indicate an ownership or architecture problem rather than merely an import-style problem.

---

## Core Principle

> Imports should reveal the architecture, not fight it.

A developer should be able to inspect a file's imports and understand:

```text
What does this file depend on?
Which module owns those capabilities?
Which direction do the dependencies flow?
Does this file know more than its responsibility requires?
```

Prefer explicit ownership and stable boundaries over convenience imports.

---

## Related Standards

- [Architecture](./architecture.md) — dependency direction.
- [Modules](./modules.md) — public and private module boundaries.
- [Project Structure](./project-structure.md) — ownership and file placement.
- [Server and Client](./server-client.md) — server/client import boundaries.
- [Data Access](./data-access.md) — infrastructure dependencies.
- [TypeScript](./typescript.md) — type imports and contracts.