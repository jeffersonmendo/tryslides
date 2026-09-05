# Code Quality

This document defines the general code-quality principles for this project.

The goal is to produce code that is understandable, maintainable, and easy to change without introducing unnecessary abstractions or complexity.

Code quality is not measured by how sophisticated the code looks.

It is measured by how clearly the code represents the application.

---

## 1. Optimize for Clarity

Prefer code that communicates its purpose directly.

Good code should make it reasonably easy to understand:

```text
What does this do?
Why does it exist?
What does it depend on?
What can it change?
Where does it belong?
```

Prefer:

```ts
const can_delete =
  presentation.owner_id === current_user.id
```

over unnecessarily indirect code:

```ts
const result =
  permission_manager.resolve(
    permission_factory.create(
      "presentation.delete",
      presentation,
      current_user,
    ),
  )
```

when the application does not require that abstraction.

Complexity should come from the problem, not from the desire to make the code look architectural.

---

## 2. Separate Responsibilities, Not Code

The goal of separation is to isolate responsibilities that change for different reasons.

It is not to maximize the number of:

- files
- functions
- classes
- interfaces
- services
- repositories
- folders

A file may contain several functions when they support one cohesive responsibility.

A component may contain local presentation logic.

A service may coordinate several operations when they belong to the same application capability.

Prefer:

```text
One cohesive responsibility
↓
One understandable module
```

over:

```text
One operation
↓
Many artificial layers
↓
Many forwarding files
```

Ask:

> Can I describe this file's responsibility in one sentence without combining unrelated concerns?

If yes, the file may already be cohesive.

---

## 3. Introduce Abstractions When They Protect Something

An abstraction should have a reason to exist.

Good reasons include:

- hiding infrastructure
- representing a stable application capability
- supporting multiple implementations
- isolating meaningful business behavior
- protecting a module boundary
- reducing significant repeated complexity

Avoid abstractions created only because a pattern exists.

For example:

```text
Controller
↓
Service
↓
Manager
↓
Repository
↓
Adapter
↓
Database
```

is not automatically better than:

```text
Server Action
↓
Data Access
↓
Database
```

The correct structure depends on the responsibility being protected.

Start with the simplest meaningful boundary and evolve it when the product requires more.

---

## 4. Avoid Premature Generalization

Do not design a universal solution before the application has demonstrated that it needs one.

For example, two similar functions do not automatically require:

```text
GenericOperationFactory<T>
```

Sometimes:

```ts
createPresentation()
createDocument()
```

should remain separate because they represent different product concepts even if their current implementations look similar.

Wait until the shared behavior and reason for change are understood.

Prefer a small amount of clear duplication over the wrong abstraction.

---

## 5. Remove Meaningless Duplication

Not all duplication is bad.

Repeated business rules or important transformations can become dangerous because they create multiple sources of truth.

For example:

```text
Pricing rule in checkout
+
Pricing rule in billing
+
Pricing rule in dashboard
```

should probably have one authoritative owner.

However, two similar pieces of simple presentation code do not automatically need abstraction.

Ask:

> If this behavior changes, should every copy change for the same reason?

If yes, extraction may be appropriate.

If not, the similarity may be accidental.

---

## 6. Comments Explain Why

Prefer code that explains **what** through naming and structure.

Use comments primarily when the reason behind the code is not obvious.

Useful:

```ts
// Stripe may deliver this event more than once,
// so the operation must remain idempotent.
await processPaymentEvent(event)
```

Less useful:

```ts
// Get the user
const user = await getUser()
```

Comments may also explain:

- non-obvious constraints
- external provider behavior
- compatibility workarounds
- performance decisions
- intentional architectural exceptions
- temporary migration behavior

Do not use comments to compensate for unclear naming when the code itself can be improved.

---

## 7. Document Important Decisions, Not Every Implementation Detail

Code comments are not the right place for every architectural explanation.

If a decision affects the project broadly, document it in:

```text
/docs/project/architecture.md
```

or:

```text
/docs/project/decisions.md
```

Examples:

```text
Why IndexedDB is used before server persistence
Why a provider was selected
Why a feature intentionally bypasses a usual standard
Why a specific consistency model exists
```

Code should explain the local implementation.

Project documentation should explain broader architectural decisions.

---

## 8. Avoid Dead and Speculative Code

Remove code that no longer serves the application.

Avoid leaving:

- unused functions
- unused components
- unused types
- commented-out implementations
- abandoned feature flags
- obsolete compatibility code
- abstractions for hypothetical future requirements

Do not keep code merely because:

> We may need it someday.

Git already preserves history.

If a capability becomes necessary later, reintroduce it based on the actual requirement.

---

## 9. TODOs Must Be Actionable

TODO comments are acceptable when they represent concrete unfinished work.

Prefer:

```ts
// TODO: Remove this adapter after the legacy API
// is retired.
```

over:

```ts
// TODO: improve this
```

A useful TODO should communicate enough context to understand what remains and why.

Important product work should normally also exist in the project's actual task-tracking system rather than relying exclusively on source-code comments.

Do not use TODOs to permanently postpone unclear architecture.

---

## 10. Handle Edge Cases Intentionally

Do not add defensive code for impossible scenarios merely to make code appear safer.

At the same time, do not ignore realistic failure cases.

Consider conditions such as:

- missing data
- empty collections
- unauthorized access
- invalid external input
- concurrency
- duplicate events
- network failures
- partial persistence
- stale state

Handle cases according to their actual product risk.

Avoid both extremes:

```text
Assume everything always works
```

and:

```text
Add defensive abstractions for every imaginable scenario
```

Engineering effort should reflect realistic failure modes.

---

## 11. Refactor When Understanding Improves

Do not require perfect architecture before writing the first implementation.

A reasonable process is:

```text
Understand requirement
↓
Implement clearly
↓
Observe responsibilities
↓
Refactor when boundaries become evident
```

Some boundaries should be designed early when mistakes would be expensive, such as:

- infrastructure coupling
- security
- persistence ownership
- important business rules

Other abstractions are easier to discover through implementation.

Refactoring is part of development, not evidence that the original code necessarily failed.

---

## 12. Keep Changes Focused

A change should normally solve the responsibility requested without rewriting unrelated areas.

When implementing a feature or fixing a bug:

```text
Understand affected boundary
↓
Make required change
↓
Update related tests/docs when necessary
```

Avoid opportunistic large refactors unless they are necessary to implement the change safely.

This is especially important for AI coding agents.

Agents should not rewrite existing architecture merely because they prefer another valid style.

Existing project conventions remain authoritative unless the task explicitly changes them.

---

## 13. Follow Existing Patterns Before Creating New Ones

Before introducing a new:

- folder
- abstraction
- component pattern
- response shape
- state mechanism
- repository style
- naming convention

inspect how the same responsibility is already handled in the project.

Prefer consistency when the existing pattern is sound.

Do not create two architectures for the same problem.

If the existing pattern is genuinely inadequate, improve it intentionally rather than silently introducing a competing convention.

---

## 14. Tooling Handles Mechanical Quality

Use project tooling for concerns that can be automated.

Examples include:

- formatting
- linting
- import organization
- basic static analysis
- TypeScript checking

Do not spend engineering standards on formatting rules that Biome or another configured tool can enforce reliably.

Agents should run the relevant project checks after meaningful changes when practical.

Tooling supports code quality.

It does not replace architectural judgment.

---

## 15. Optimize for Change

Code should be designed with the expectation that the product will evolve.

Good boundaries make likely changes local.

For example:

```text
Stripe
↓
Payment Adapter
↓
Application
```

makes changing payment infrastructure easier than allowing Stripe concepts throughout the application.

Likewise:

```text
Database
↓
Data Access Boundary
↓
Application
```

reduces persistence coupling.

However, do not abstract every dependency merely because it could theoretically change.

Focus on changes that are meaningful enough to justify a boundary.

---

## Warning Signs

Review the design when:

- understanding one operation requires opening many trivial files
- functions mostly forward arguments to another layer
- abstractions have only one trivial implementation and no boundary to protect
- a `utils` or `helpers` directory keeps growing with unrelated code
- the same business rule exists in multiple places
- comments explain code that should be obvious from naming
- old implementations remain commented out
- a small change requires modifications across unrelated modules
- framework or provider details spread throughout the application
- code is generalized for requirements that do not exist
- AI-generated code introduces new conventions without checking existing ones

These are signals to investigate, not automatic violations.

---

## Core Principles

### Clarity over cleverness

Prefer code that another developer can understand quickly.

### Cohesion over fragmentation

Keep code together when it changes for the same reason.

### Boundaries over coupling

Separate responsibilities where changes should remain independent.

### Simplicity over ceremony

Do not introduce architecture that provides no meaningful value.

### Explicitness over hidden behavior

Important effects, dependencies, and responsibilities should be visible.

### Evolution over speculation

Design for real requirements and evolve when new requirements appear.

The central rule is:

> **Separate responsibilities, not code for the sake of separation.**

A strong codebase is not the one with the most patterns.

It is the one where the product can continue changing without the architecture becoming difficult to understand.

---

## Related Standards

- [Architecture](./architecture.md) — overall architectural principles.
- [Project Structure](./project-structure.md) — ownership and file placement.
- [Functions](./functions.md) — cohesive function design.
- [Modules](./modules.md) — module boundaries and abstractions.
- [Data Access](./data-access.md) — infrastructure isolation.
- [Testing](./testing.md) — confidence and regression protection.
- [Naming](./naming.md) — communicating intent through names.