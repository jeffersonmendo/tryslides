# Starnext

A fast, opinionated Next.js starter for your next application.

## Create your application

```bash
git clone https://github.com/jeffersonmendo/starnext.git <app-name>
cd <app-name>
rm -rf .git
git init
bun install
bun update --latest
git add .
git commit -m "chore: initialize project"
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Define your product

1. Replace the starter UI, metadata, and this README with your product.
2. Use [`docs/product/`](./docs/product/README.md) to add your product's business rules, workflows, and technical documentation.
3. Keep [`docs/standards/`](./docs/standards/README.md) as the reusable engineering foundation.
4. Keep [`AGENTS.md`](./AGENTS.md) as the instructions for developers and coding agents.
5. Review [`docs/stack.md`](./docs/stack.md) before changing the foundation. Document every important new library or platform service there.
6. Build the application from those verified product rules.

## Commands

```bash
bun dev      # Start the development server
bun lint     # Check code with Biome
bun format   # Format code with Biome
bun build    # Create a production build
bun start    # Run the production build
```

## Included foundation

See [`docs/stack.md`](./docs/stack.md) for the included technologies, configuration entry points, and intentional omissions.
