# Starter Stack

This starter provides a focused Next.js foundation. Add product-specific services only after their requirements are documented in [`product/`](./product/README.md).

For the exact dependency versions and package metadata, read [`../package.json`](../package.json).

## Included technologies

| Technology | Why it is included | Entry point |
| --- | --- | --- |
| Bun | Package manager and script runner. | `package.json` |
| Next.js | Application framework with the App Router. | `next.config.ts`, `src/app/` |
| React | UI rendering layer. The React Compiler is enabled. | `next.config.ts` |
| TypeScript | Strict, typed application code. | `tsconfig.json` |
| Tailwind CSS | Utility-first styling. | `src/app/globals.css`, `postcss.config.mjs` |
| shadcn/ui and Base UI | Accessible, composable UI primitives. | `components.json`, `src/components/ui/` |
| Tabler Icons | Icon library configured for shadcn/ui. | `components.json` |
| next-intl | Locale-aware routing and translations. | `src/i18n/`, `src/proxy.ts`, `next.config.ts` |
| next-themes | Theme switching support. | `src/components/theme-provider.tsx` |
| Biome | Formatting, linting, and import organization. | `biome.json` |

## Conventions already configured

- `@/*` resolves to `src/*`.
- shadcn/ui components use `src/components/ui/`; its aliases are defined in `components.json`.
- Tailwind styles start in `src/app/globals.css`.
- The default scripts are `bun dev`, `bun lint`, `bun format`, `bun build`, and `bun start`.

## Not included by default

The package manifest does not include an authentication provider, database client, ORM, or billing integration. Choose and document those only when the product requires them.

## Keep this document current

When you add an important library or platform service, document its purpose and configuration entry point here. Keep product behavior and business decisions in [`product/`](./product/README.md), not in this stack reference.
