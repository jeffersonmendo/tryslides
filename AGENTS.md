# Agent Guide

Before coding:

1. Read the relevant standards.
2. Read relevant product docs.
3. Load applicable skills.
4. Inspect existing code.
5. Implement the simplest correct solution.
6. Run relevant checks.

Do not invent existing conventions, architecture, or business rules.

## Standards

- [Architecture](./docs/standards/architecture.md)
- [Project Structure](./docs/standards/project-structure.md)
- [Naming](./docs/standards/naming.md)
- [Components](./docs/standards/components.md)
- [Server / Client](./docs/standards/server-client.md)
- [Modules](./docs/standards/modules.md)
- [Functions](./docs/standards/functions.md)
- [TypeScript](./docs/standards/typescript.md)
- [Data Access](./docs/standards/data-access.md)
- [State Management](./docs/standards/state-management.md)
- [Validation](./docs/standards/validation.md)
- [Errors](./docs/standards/errors.md)
- [i18n](./docs/standards/i18n.md)
- [Imports](./docs/standards/imports.md)
- [Testing](./docs/standards/testing.md)
- [Comments](./docs/standards/comments.md)
- [Code Quality](./docs/standards/code-quality.md)

[Index](./docs/standards/README.md)

`AGENTS.md` and `docs/standards/**` are protected unless explicitly requested otherwise.

## Product

Read [docs/product/README.md](./docs/product/README.md) and relevant `docs/product/**` files.

## Skills

Load relevant skills before coding:

- [Next.js](./.agents/skills/next-best-practices/SKILL.md)
- [React](./.agents/skills/vercel-react-best-practices/SKILL.md)
- [TypeScript](./.agents/skills/typescript-advanced-types/SKILL.md)
- [shadcn/ui](./.agents/skills/shadcn/SKILL.md)
- [next-intl i18n](./.agents/skills/web-i18n-next-intl/SKILL.md) — load for Next.js App Router internationalization work.

Check `.agents/skills/` for additional skills.

## Priority

Developer instruction > Product docs > Standards > Existing patterns > Skills/framework guidance.

## Principle

**Separate responsibilities, not code for the sake of separation.**
