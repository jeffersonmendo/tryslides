# Engineering Standards

This directory contains the reusable engineering standards for this project.

These documents define **how software should be designed, organized, and maintained**.

They describe conventions for architecture, components, modules, TypeScript, data access, state, validation, errors, internationalization, testing, comments, and other engineering concerns.

They are intended for both:

- developers
- AI coding agents

The goal is to maintain a consistent engineering approach across projects without forcing unnecessary architecture or duplicating framework documentation.

---

## Purpose

The standards answer questions such as:

```text
How should responsibilities be separated?
Where should this code live?
What should a component be responsible for?
How should modules communicate?
Where should business logic live?
How should infrastructure be accessed?
How should state be owned?
How should errors cross boundaries?
How should comments preserve important context?
```

They do **not** attempt to teach Next.js, React, TypeScript, or other libraries.

Framework and library behavior should follow:

1. official documentation
2. installed project skills
3. these engineering standards for project conventions

The standards define how those technologies are used within our architecture.

---

## Core Engineering Principle

The most important principle across these standards is:

> **Separate responsibilities, not code for the sake of separation.**

Good architecture does not mean maximizing:

```text
folders
layers
interfaces
services
repositories
factories
files
```

Instead, architecture should make responsibilities and dependencies clear while remaining as simple as the application allows.

Prefer:

```text
Clear responsibility
+
Explicit boundary
+
Simple implementation
```

over unnecessary architectural ceremony.

---

## Before Writing Code

Before implementing a meaningful change, developers and coding agents should:

1. Read this document.
2. Identify which standards apply to the task.
3. Read those standards.
4. Read `/docs/product/README.md`.
5. Read the relevant project-specific documentation.
6. Review relevant installed skills.
7. Inspect existing code for established patterns.
8. Implement the change according to those constraints.

Do not read every standards document for every small modification.

Read the documents relevant to the responsibility being changed.

For example:

```text
Creating a component
→ components.md
→ server-client.md
→ naming.md

Adding database access
→ data-access.md
→ server-client.md
→ validation.md
→ errors.md

Creating a feature module
→ architecture.md
→ project-structure.md
→ modules.md
→ imports.md
```

The project documentation determines how these general standards apply to the specific application.

---

# Standards Index

## Architecture

[`architecture.md`](./architecture.md)

Defines the overall engineering philosophy and dependency direction.

Covers:

- responsibility boundaries
- feature-oriented architecture
- dependency direction
- application and infrastructure separation
- presentation boundaries
- public and private APIs
- extensibility
- architectural simplicity

Read this when making decisions that affect multiple parts of the application.

---

## Project Structure

[`project-structure.md`](./project-structure.md)

Defines how source code should be organized.

Covers:

- `app/`
- `features/`
- `components/`
- `hooks/`
- `lib/`
- `types/`
- colocation
- ownership
- global versus feature-specific code

Read this when deciding where new code belongs.

---

## Naming

[`naming.md`](./naming.md)

Defines naming conventions.

Covers:

- files
- directories
- variables
- functions
- components
- types
- constants
- booleans
- hooks
- callbacks
- application operations

Read this when creating or renaming code.

---

## Components

[`components.md`](./components.md)

Defines component responsibilities and communication patterns.

Covers:

- UI components
- feature components
- composition components
- props
- callbacks
- business logic boundaries
- component extraction
- hooks
- predictable component behavior

Read this when creating or modifying React components.

---

## Server and Client

[`server-client.md`](./server-client.md)

Defines server/client responsibility boundaries.

Covers:

- Server Components
- Client Components
- `"use client"`
- mutations
- server infrastructure
- secrets
- serialization
- client state
- optimistic interfaces

Read this whenever code crosses the server/client boundary.

---

## Modules

[`modules.md`](./modules.md)

Defines how application capabilities are organized into modules.

Covers:

- module ownership
- public APIs
- private implementation
- cross-feature dependencies
- shared modules
- contracts
- module cohesion
- circular dependencies

Read this when creating or changing feature boundaries.

---

## Functions

[`functions.md`](./functions.md)

Defines function design conventions.

Covers:

- cohesive operations
- function naming
- parameters
- side effects
- private helpers
- control flow
- boolean arguments
- pass-through functions

Read this when designing application logic.

---

## TypeScript

[`typescript.md`](./typescript.md)

Defines TypeScript usage conventions.

Covers:

- type safety
- inference
- `unknown`
- `any`
- unions
- interfaces
- type aliases
- assertions
- external contracts
- generics
- type ownership

Read this when designing types or TypeScript APIs.

---

## Data Access

[`data-access.md`](./data-access.md)

Defines boundaries around persistence and external infrastructure.

Covers:

- database access
- repositories
- data-access functions
- infrastructure isolation
- provider dependencies
- mapping
- external APIs
- authorization
- persistence ownership

Read this whenever code accesses databases or external services.

---

## State Management

[`state-management.md`](./state-management.md)

Defines how state ownership should be determined.

Covers:

- local state
- shared feature state
- URL state
- server state
- global client state
- Zustand
- Context
- persistence
- sources of truth

Read this before introducing or expanding application state.

---

## Validation

[`validation.md`](./validation.md)

Defines runtime validation boundaries.

Covers:

- external input
- Zod schemas
- server validation
- client validation
- environment configuration
- normalization
- validation errors
- trust boundaries

Read this whenever untrusted data enters the application.

---

## Errors

[`errors.md`](./errors.md)

Defines how errors move through the application.

Covers:

- application error codes
- infrastructure errors
- boundary responses
- HTTP status
- validation errors
- expected and unexpected errors
- logging
- safe user messages

Read this when implementing failure behavior or application responses.

---

## Internationalization

[`i18n.md`](./i18n.md)

Defines internationalization organization and ownership.

Covers:

- translation files
- namespaces
- translation keys
- server/client translations
- locale routing
- navigation
- dynamic values
- formatting
- localized errors
- metadata

Read this when adding or modifying user-facing copy or locale behavior.

---

## Imports

[`imports.md`](./imports.md)

Defines import and dependency conventions.

Covers:

- `@/` aliases
- relative imports
- module boundaries
- dependency direction
- circular dependencies
- barrel files
- type imports
- server-only imports
- third-party dependencies

Read this when introducing dependencies between modules.

---

## Testing

[`testing.md`](./testing.md)

Defines the testing philosophy.

Covers:

- behavior-focused testing
- risk-based testing
- unit tests
- integration tests
- component tests
- mocks
- fakes
- failure paths
- business rules
- end-to-end tests
- regression tests
- coverage

Read this when adding tests or designing code that contains important behavior.

---

## Comments

[`comments.md`](./comments.md)

Defines how source comments and code documentation should be used.

Covers:

- useful comments
- non-obvious constraints
- invariants
- TSDoc
- TODOs
- workarounds
- warning comments
- temporary behavior
- commented-out code
- AI-generated comments
- documentation boundaries

Read this when adding comments or documenting behavior that cannot be communicated clearly through code alone.

---

## Code Quality

[`code-quality.md`](./code-quality.md)

Defines the general maintainability principles that connect the standards.

Covers:

- clarity
- cohesion
- abstractions
- duplication
- dead code
- refactoring
- focused changes
- existing patterns
- tooling
- maintainability
- complexity

Read this when evaluating the overall quality or maintainability of an implementation.

---

# Standards vs Project Documentation

The documentation system has two different responsibilities:

```text
docs/
├── standards/
└── project/
```

They must not be confused.

## `/docs/standards`

Defines:

> How we build software.

These rules are reusable across projects.

Examples:

```text
Components communicate through explicit APIs.
UI should not depend directly on database infrastructure.
Imports should respect module boundaries.
Runtime input should be validated at trust boundaries.
```

---

## `/docs/product`

Defines:

> How this specific application works.

Examples:

```text
What the product does.
What the domain entities are.
How data flows through this application.
Which infrastructure providers are used.
Which architectural decisions were made.
Which business rules exist.
```

A new project description must **not overwrite engineering standards**.

Project-specific information belongs in `/docs/product`.

---

# Project Exceptions

A project may occasionally need to deviate from a general standard.

That does not automatically mean the standard should change.

Document intentional exceptions in:

```text
/docs/product/decisions.md
```

A decision should explain:

```text
Context
Decision
Reason
Trade-offs
Affected standards
```

If the exception later proves to be a better general engineering approach, the relevant standard may then be intentionally updated.

---

# Rule Precedence

When instructions conflict, use the following order:

```text
1. Explicit user instruction for the current task
2. Project-specific documented rules
3. Engineering standards
4. Framework or library defaults
```

Framework requirements that are technically necessary must still be respected.

When a project intentionally deviates from a standard, the reason should be documented.

---

# Working With Installed Skills

Skills and standards serve different purposes.

```text
Skill
↓
How the technology should be used

Standard
↓
How our software should be organized
```

For example:

```text
React Skill
+
components.md
```

The React skill may explain current React best practices.

`components.md` explains our component responsibilities and boundaries.

Similarly:

```text
Next.js Skill
+
server-client.md
```

or:

```text
TypeScript Skill
+
typescript.md
```

Use both when appropriate.

Do not copy framework documentation into these standards.

---

# Creating New Standards

Do not create a new standards document for every new technical decision.

A new standard is appropriate when a reusable engineering concern:

- applies across projects
- has meaningful conventions
- does not clearly belong to an existing standard
- is important enough for developers and agents to discover independently

Prefer extending an existing cohesive standard when the concern naturally belongs there.

The goal is not to maximize documentation.

The goal is to make important engineering expectations discoverable.

---

# Updating Standards

Engineering standards should change intentionally.

Update `/docs/standards` when:

- the general engineering philosophy changes
- an existing standard proves consistently inadequate
- a new reusable convention is adopted
- experience reveals a better general approach

Do not update standards merely because one project needs an exception.

That belongs in project documentation.

---

# Final Principle

These standards exist to make engineering decisions more consistent without removing judgment.

They should help developers and agents answer:

```text
What owns this responsibility?
Where should this code live?
What should this depend on?
Which boundary should protect it?
What is the simplest structure that keeps those responsibilities clear?
```

When multiple implementations satisfy the standards, prefer the one that is:

```text
Simpler
Clearer
More cohesive
Less coupled
Easier to change
```

Architecture should serve the product.

The product should not be forced to serve the architecture.