# Koushik’s portfolio

A personal portfolio built with **Vite, TypeScript, and plain CSS**. There is no React, router, backend, CMS, or runtime UI library. Content lives in typed data files; small render functions turn it into semantic HTML.

## Run locally

Use Node.js **22.13 or newer** (Node 22 is configured for Netlify) and npm.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:1234**. Vite refreshes the page when you save a file.

```sh
npm run build       # Type-check and create dist/
npm run preview     # Serve the production build at http://127.0.0.1:4173
npm run typecheck   # Check TypeScript without building
npm run lint        # ESLint
npm run format      # Format the code with Prettier
npm run format:check


