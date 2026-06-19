# WeMail Docs

Standalone Fumadocs documentation app for WeMail.

## Commands

```bash
pnpm dev:docs
pnpm typecheck:docs
pnpm lint:docs
pnpm build:docs
```

The local development server runs at http://127.0.0.1:3000.

## Content

Documentation pages live in `apps/docs/content/docs` as MDX files. Fumadocs
generates the docs routing, sidebar tree, search index, and LLM-readable
markdown routes from this directory.

## Deployment

Deploy `apps/docs` as an independent Next.js app. Set `NEXT_PUBLIC_SITE_URL`
to the public docs origin so Open Graph images resolve to the production
domain.
