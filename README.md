# UtiliDock

Everyday tools, one place. UtiliDock is a registry-driven Next.js utilities platform with browser-based PDF, bill splitting, attendance hours, and geography tools.

## Requirements and setup

- Node.js 22.12 or newer (use a current LTS release)
- npm 10 or newer

```sh
npm install
Copy-Item .env.example .env.local # PowerShell; set NEXT_PUBLIC_SITE_URL to your canonical production origin
npm run dev
```

Open `http://localhost:3000`. The application requires no API keys or database. PDF files are processed locally in a browser worker.

## Commands

```sh
npm run dev       # local development
npm run build     # production build
npm start         # serve the production build
npm test          # Vitest unit and PDF processing tests
npm run test:watch
npm run test:e2e   # browser navigation, attendance, conversion, merge, and mobile checks (requires a running server)
```

For browser checks against the production build, start the app in one terminal with `npm run build && npm start`, then run `npm run test:e2e` in another terminal.

For production, set `NEXT_PUBLIC_SITE_URL` to the public canonical origin, run `npm ci`, `npm run build`, then `npm start` on a supported Node.js host. Configure the host to route requests to the Next.js process and serve static assets. Use HTTPS. The app does not require a server-side file store or other infrastructure.

## Architecture

- `src/app`: App Router public pages, route metadata, sitemap, and robots.
- `src/lib/registry.ts`: category and utility metadata. Public discovery and route lookup share this registry.
- `src/components`: shared navigation, cards, search, upload, ordered file lists, processing, and result UI.
- `src/lib/pdf-service.ts`: processing functions shared by the worker and tests.
- `src/workers/pdf.worker.ts`: off-main-thread PDF creation and merging.
- `src/app/globals.scss`: Bootstrap 5 base plus the product design system and responsive layouts.

Tool pages resolve the `component` field in the registry to their dedicated specialized workspace. Processing remains independent of route/page rendering.

The World Map uses the bundled world-atlas Natural Earth 4.1.0 1:110m dataset. Its simplified boundaries are not a real-time or authoritative political reference; small areas and recent changes may be absent. Map edits remain in the open page and can be exported as SVG.

## Adding a utility

1. Add its category if needed in `src/lib/registry.ts`, including a stable category slug.
2. Implement a specialized workspace component under `src/components`. Reuse the upload/list/result components where appropriate; keep tool-specific processing in its own service.
3. Add an active registry entry with a unique ID, URL slug, category, description, icon, keywords, SEO fields, and component key. The home page, search, category page, tool listing, sitemap, and route params update from the registry.
4. Add usage instructions and FAQs in `src/app/tools/[category]/[tool]/page.tsx`, then cover processing and route behavior with unit and browser tests.

Only entries marked `active` are linked publicly. Do not publish a tool until its workspace and processing implementation are ready.

## Privacy and limits

Files are not sent to the UtiliDock server. Current UI limits are centralized in `src/lib/limits.ts`: 20 files per workspace, 50 MB per file. Object URLs are released when previews are removed or the workspace is disposed. The privacy and terms pages are provided as initial product copy and should be reviewed for the operator's jurisdiction and final contact details before public launch.
