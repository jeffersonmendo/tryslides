# Architecture

This document defines the architectural principles used in this project.

The goal is not to impose a large or rigid architecture on every application. The goal is to establish **clear responsibilities, predictable dependency boundaries, and consistent organization** so applications can grow without turning into tightly coupled systems.

Project-specific architecture belongs in the [product documentation](../product/README.md).

---

## 1. Architectural Philosophy

This project favors architecture that is:

- simple enough for the current problem
- explicit about responsibilities
- organized around product features
- independent from unnecessary infrastructure details
- easy to navigate
- easy to test
- easy to extend
- resistant to accidental coupling

Architecture exists to make change easier.

It should not exist merely to make the project look sophisticated.

A project should introduce a boundary, abstraction, layer, service, repository, registry, adapter, or pattern only when it protects a meaningful responsibility or reason to change.

> Separate responsibilities, not code for the sake of separation.

---

## 2. Architecture Is Not a Fixed Folder Tree

This project does not require every application to contain the same architectural layers.

Different products have different needs.

A simple application may need:

```text
UI
↓
Application
↓
Data Access
```

Another application may require:

```text
UI
↓
Application
↓
Domain
↓
Repository Contract
↑
Infrastructure
```

An editor or extensible system may introduce additional concepts such as:

```text
UI
↓
Core
↓
Ports
↑
Adapters
```

with independent registries for extensible capabilities.

The project architecture MUST be documented in:

`/docs/product/architecture.md`

The standards define **how architectural decisions should be made**.

The project documentation defines **which architecture was actually chosen**.

---

## 3. Feature-First Organization

Application code should primarily be organized around **product capabilities**, not only around technical categories.

Prefer:

```text
features/
├── auth/
├── billing/
├── presentations/
└── sharing/
```

over a project where every feature is fragmented globally:

```text
components/
services/
hooks/
actions/
repositories/
utils/
```

and developers must search across the entire repository to understand one capability.

A feature should keep code that changes together reasonably close together.

Example:

```text
features/
└── presentations/
    ├── components/
    ├── actions/
    ├── services/
    ├── repository/
    ├── schemas/
    └── types/
```

These directories are examples, not mandatory structure.

Only create a directory when the feature actually has that responsibility.

Do not generate empty architectural layers from a template.

---

## 4. Colocation Before Global Abstraction

Code should remain close to the feature that owns it until there is a clear reason for it to become shared.

A component used only by `billing` belongs to `billing`.

A schema describing only presentations belongs to `presentations`.

A service implementing inventory behavior belongs to `inventory`.

Move something into shared infrastructure only when its responsibility is genuinely shared.

Do not move code to `shared`, `common`, `lib`, or `utils` merely because it could theoretically be reused later.

Prefer proven reuse over hypothetical reuse.

---

## 5. Dependency Direction

Dependencies should point toward more stable application rules and away from volatile implementation details whenever practical.

Business behavior should not depend directly on:

- React
- UI components
- database SDKs
- payment SDKs
- storage providers
- analytics providers
- email providers
- framework-specific request objects

Infrastructure may depend on contracts defined by more stable parts of the application.

For example:

```text
Application/Core
      │
      │ defines what it needs
      ▼
Repository Contract
      ▲
      │ implements
      │
Infrastructure
      │
      ├── Supabase
      ├── PostgreSQL
      ├── IndexedDB
      └── Mock
```

The core of the application should care about **what capability it needs**, not necessarily which technology provides it.

---

## 6. Presentation Boundary

Presentation code is responsible for presenting information and handling presentation concerns.

It may contain:

- rendering
- UI state
- interaction state
- event wiring
- accessibility behavior
- visual transformations
- loading/error presentation
- component composition

For example, this is legitimate UI logic:

```tsx
const [is_open, set_is_open] = useState(false)
```

Presentation code should not become the owner of unrelated business or infrastructure behavior.

Avoid:

```tsx
function PresentationEditor() {
  async function save_document() {
    await supabase
      .from("presentations")
      .update(...)
  }

  // ...
}
```

The problem is not that asynchronous code exists inside a component.

The problem is that the presentation layer now knows the persistence technology and database representation.

Prefer a boundary such as:

```tsx
<Editor onSave={save_document} />
```

where the persistence implementation exists outside the presentation responsibility.

---

## 7. Business Logic

Business rules should live independently from presentation whenever the rule represents product behavior rather than UI behavior.

For example:

```ts
function calculate_order_total(order: Order) {
  // business rules
}
```

should not require React to execute.

This makes business behavior:

- reusable
- independently testable
- easier to understand
- less sensitive to UI changes

Do not extract trivial presentation calculations into a "business layer" simply to satisfy architecture.

The distinction is responsibility, not file location.

---

## 8. Application Coordination

Some operations require coordinating several responsibilities.

Examples:

- validate input
- execute domain behavior
- persist a result
- trigger an external capability
- return an application result

This coordination may live in an application service, action, use case, or equivalent project-specific boundary.

This project does not require one particular naming convention for this architectural role unless another standard defines it.

Avoid creating multiple coordination layers that merely forward the same parameters:

```text
Action
↓
Controller
↓
Manager
↓
Service
↓
UseCase
↓
Repository
```

If several layers provide no distinct responsibility, the architecture is unnecessarily indirect.

---

## 9. Persistence Boundary

Persistence is an implementation detail of the application.

Business behavior and presentation should not be unnecessarily coupled to where data is stored.

The same application concept may eventually be persisted through:

```text
Supabase
PostgreSQL
IndexedDB
SQLite
External API
Memory
Mock
```

Changing persistence should ideally produce localized changes.

When a meaningful persistence boundary is required, define the capability the application needs.

Example:

```ts
export interface PresentationRepository {
  find_by_id(id: string): Promise<Presentation | null>
  save(presentation: Presentation): Promise<void>
}
```

An infrastructure implementation can then satisfy that contract.

```ts
export class SupabasePresentationRepository
  implements PresentationRepository {
  // Supabase-specific implementation
}
```

A repository should not be introduced automatically for every query.

For simple operations where a dedicated data-access function provides a sufficient boundary, prefer the simpler solution.

The purpose is isolation, not ceremony.

---

## 10. External Services

External services should be treated similarly to persistence infrastructure.

Examples include:

- Stripe
- Resend
- storage providers
- analytics
- AI providers
- third-party APIs

Product logic should avoid depending unnecessarily on vendor-specific representations.

Instead of spreading provider behavior throughout the application:

```text
UI → Stripe
Service → Stripe
Route → Stripe
Component → Stripe
```

prefer a controlled integration boundary:

```text
Application
     ↓
Payment capability
     ↑
Stripe implementation
```

The amount of abstraction should remain proportional to the complexity and likelihood of change.

---

## 11. Server and Client Boundaries

Next.js server/client boundaries are implementation concerns that must respect the larger architecture.

Code should execute on the server by default when it:

- accesses secrets
- accesses privileged data
- communicates directly with infrastructure
- performs protected mutations
- does not require browser APIs or interactive client state

Client Components should be introduced when browser-side behavior is actually required.

Examples include:

- local interactive state
- browser APIs
- event-driven interaction
- client-only libraries

Do not convert large parts of the application into Client Components merely because a nested element requires interaction.

Keep client boundaries as focused as practical.

Detailed framework-specific behavior should defer to the current Next.js and React skills rather than duplicating framework documentation here.

---

## 12. Module Responsibility and Cohesion

A module should have one clear, cohesive responsibility.

This does **not** mean:

> one function = one file

For example:

```ts
// calculate-order-total.ts

function calculate_subtotal() {
  // ...
}

function calculate_tax() {
  // ...
}

export function calculate_order_total() {
  // ...
}
```

is cohesive if all internal functions exist to implement the same responsibility.

A warning sign is when the purpose of a file requires several unrelated statements:

> "This file calculates orders, sends emails, writes analytics, and updates customers."

Those responsibilities should probably be separated.

A useful test is:

> Can the purpose of this module be described clearly in one sentence?

---

## 13. Public and Private Module APIs

Features and modules should expose intentional public APIs rather than requiring consumers to understand their internal structure.

Internal implementation details should remain internal when possible.

Conceptually:

```text
feature/
├── public capability
│
└── internal implementation
    ├── helpers
    ├── schemas
    ├── adapters
    └── implementation details
```

Do not expose internal functions merely because another module can import them.

A public boundary should represent a capability that another part of the application legitimately needs.

---

## 14. Shared Code

Shared code should have a clearly defined reason for being shared.

A shared module is appropriate when:

- multiple independent features genuinely depend on it
- its responsibility does not belong to one feature
- its API is stable enough to be consumed across features

Avoid generic dumping grounds such as:

```text
utils/
helpers/
misc/
common/
lib/
```

when their responsibility is undefined.

These names are not inherently forbidden.

For example, `lib/` may be appropriate when the project explicitly defines what belongs there.

The problem is ambiguity, not the folder name itself.

---

## 15. Extensibility

Systems that expect capabilities to be added repeatedly may benefit from explicit extension points.

Examples include:

- animation definitions
- editor tools
- export formats
- payment providers
- AI tools
- element types
- commands

A registry may be appropriate when new capabilities should become discoverable by the rest of the application through a single definition.

Conceptually:

```text
New Capability
      ↓
Definition / Registration
      ↓
Registry
   ↙   ↓   ↘
 UI  Core  Other consumers
```

This can allow adding a capability without modifying unrelated systems.

However, registries are not a default requirement.

Do not create a registry for a closed set of behavior that can be represented more simply.

Registries should also remain focused.

Prefer:

```text
animation-registry
element-registry
tool-registry
```

over a global registry containing unrelated application capabilities.

Project-specific registry architecture belongs in `/docs/product/architecture.md`.

---

## 16. Open for Extension Without Premature Abstraction

When a part of the product is known to evolve frequently, design an appropriate extension boundary.

However, do not attempt to predict every future requirement.

Prefer:

```text
Current requirements
        +
Known extension pressure
        ↓
Small stable boundary
```

over:

```text
Possible future requirement
        ↓
Large abstraction hierarchy
```

Architecture should make expected changes easier without making current development unnecessarily complicated.

---

## 17. State Ownership

State should live as close as practical to the responsibility that owns it.

Do not promote state to a global store merely because multiple components exist.

Different kinds of state may have different owners:

```text
Presentation state → component/UI boundary
URL state          → URL
Server data        → server/data boundary
Domain state       → domain/application
Global client state → shared store when genuinely necessary
```

Detailed state-management conventions belong in the corresponding state standard.

---

## 18. Validation Boundaries

External input must be considered untrusted.

Validation should happen at appropriate system boundaries such as:

- forms
- Server Actions
- Route Handlers
- external APIs
- webhooks
- persisted untrusted data
- AI/tool input

Validation protects the internal application from invalid external representations.

Do not repeatedly validate the same trusted internal value at every function boundary without a reason.

Detailed validation conventions belong in the validation standard.

---

## 19. Error Boundaries

Infrastructure errors should not unnecessarily leak through every layer of the application.

For example, UI code should generally not need to understand a vendor-specific database exception to display:

> "Unable to save presentation."

Translate errors at appropriate boundaries while preserving enough information for logging and debugging.

Detailed error formats and conventions belong in the error-handling standard.

---

## 20. Cross-Feature Communication

Features should avoid reaching deeply into each other's internal implementation.

Avoid:

```ts
import { internal_helper }
  from "@/features/billing/internal/private-helper"
```

Prefer consuming an intentional capability exposed by the feature.

When two features require substantial coordination, determine whether:

- one feature legitimately owns the operation
- an application-level coordinator is needed
- the behavior represents a shared domain concept
- the current feature boundaries are incorrect

Do not solve unclear ownership by creating a generic shared service automatically.

---

## 21. Architecture and Testing

Architecture should make important behavior independently testable.

Business logic should not require rendering React components or connecting to production infrastructure just to verify a rule.

Infrastructure boundaries may use test implementations when useful.

Example:

```text
Application
     ↓
Repository Contract
     ↑
Memory Repository
```

This does not mean every dependency requires an interface solely for testing.

Introduce boundaries because they represent meaningful architectural seams; testability is one of the benefits.

---

## 22. Architecture and Frameworks

Next.js is the application framework, not the application's domain architecture.

React is the presentation technology, not the business model.

Supabase, PostgreSQL, Stripe, Resend, and similar technologies are implementation choices.

Whenever practical, keep the most important application behavior independent from volatile implementation choices.

This does not require pretending the framework does not exist.

Use Next.js features when they simplify the application.

The objective is to prevent framework and infrastructure concerns from spreading into responsibilities that do not need to know about them.

---

## 23. Architectural Decisions

Not every architectural choice should become a global standard.

When a project makes an important project-specific decision, document it in:

`/docs/project/decisions.md`

Examples:

- choosing Supabase for persistence
- choosing IndexedDB for offline editing
- introducing an animation registry
- deciding that a particular feature uses event-driven communication
- intentionally deviating from an engineering standard

This prevents one project's decisions from accidentally becoming universal rules.

---

## 24. Architecture Evolution

Architecture is expected to evolve with the product.

Do not create infrastructure solely because the application may need it someday.

At the same time, avoid coupling unrelated responsibilities in ways that make predictable changes expensive.

A useful principle is:

> **Design important boundaries early. Add complexity when the product actually requires it.**

Changing infrastructure later should be easier than untangling business rules from infrastructure after they have spread throughout the application.

---

## 25. Architectural Warning Signs

Reconsider the architecture when:

- UI components directly know database schemas
- changing a persistence provider requires editing unrelated UI
- business rules require React to execute
- the same feature is scattered across many unrelated global directories
- files contain unrelated responsibilities
- adding one capability requires modifying many unrelated modules
- infrastructure-specific errors leak throughout the application
- features import each other's internal implementation
- `lib`, `utils`, or `helpers` become dumping grounds
- a single module becomes responsible for many unrelated systems
- simple behavior passes through several layers that only forward calls
- abstractions exist without a current responsibility

These are signals to investigate, not automatic proof that the architecture is wrong.

---

## 26. Simplicity Rule

When two designs satisfy the same architectural boundaries, prefer the simpler one.

Do not optimize architecture for appearance.

Do not measure architectural quality by:

- number of layers
- number of interfaces
- number of patterns
- number of directories
- number of abstractions

Measure it by whether the system is:

- understandable
- cohesive
- changeable
- testable
- predictable
- appropriately decoupled

---

## 27. Project Architecture Requirement

This project should document its actual architecture in:

`/docs/product/architecture.md`

That document should describe:

- major modules
- responsibilities
- dependency direction
- important boundaries
- data flow
- persistence
- extension points
- external systems
- intentional architectural exceptions

It should not duplicate this entire standard.

Instead, it should explain how these principles are applied to that particular product.

---

## Related Standards

Architecture interacts with the rest of the engineering standards.

See the standards index in [`README.md`](./README.md) for the current documentation structure.

Commonly related topics include:

- Components
- Naming
- TypeScript
- Data Access
- Validation
- Error Handling
- State Management
- Testing
- Patterns