# WeMail Docs

Standalone Fumadocs documentation app for WeMail.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWeOpen%2FWeMail&root-directory=apps%2Fdocs&project-name=wemail-docs&repository-name=wemail-docs&env=NEXT_PUBLIC_SITE_URL&envDescription=Docs%20public%20origin%20used%20for%20Open%20Graph%20URLs&envLink=https%3A%2F%2Fgithub.com%2FWeOpen%2FWeMail%2Ftree%2Fmain%2Fapps%2Fdocs)

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

Deploy `apps/docs` as an independent Next.js app on Vercel.

Recommended Vercel settings:

- Root Directory: `apps/docs`
- Framework Preset: `Next.js`
- Install Command: leave default
- Build Command: leave default
- Environment Variable: `NEXT_PUBLIC_SITE_URL`

Set `NEXT_PUBLIC_SITE_URL` to the public docs origin so Open Graph images
resolve to the production domain.
