# Lucid Lattice

Lucid Lattice is a mobile-first, offline-first PWA for capturing dream journals on iPhone and Android without app stores, accounts, or backend infrastructure.

## Features

- Offline-first dream journaling with speech-to-text capture
- Emotion tagging with Plutchik's 8 primary emotions and per-emotion intensity
- Multi-word phrase extraction using compromise NLP — noun phrases, named entities, and compound phrases
- Top 30 phrases table and top 10 phrase frequency graph
- Phrase analytics filterable by timeframe (30d / 60d / 90d / all) and emotion
- CSV export with correct escaping for all entry data
- PWA manifest, service worker, cached app shell, fullscreen install
- Storage persistence request with install guidance fallback
- No accounts, no backend, no tracking

## Local Dev

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Worker Preview

```bash
npm run preview
```

Then open `http://localhost:8788`.

## Production Deploy

Automatic after merged PR to `main`. Deploys to Cloudflare Workers via OpenNext.

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run test` | Run all Vitest unit and component tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run preview` | Build and preview on local Cloudflare Workers emulator |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Testing

### Unit & component tests

```bash
npm run test
```

The test environment uses `happy-dom` so component tests work without a real browser.

### End-to-end tests

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

### CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every pull request to `main`:

1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — type-check
3. `npm run lint` — ESLint
4. `npm run test` — unit + component tests
5. `npm run build` — Cloudflare production build validation

PRs fail automatically if any step fails.

## Install Instructions

### iPhone

Safari → Share → Add to Home Screen

### Android

Chrome → Install App

**Why install?** Installed PWAs receive stronger offline storage persistence from the browser, ensuring your dream journal data survives cache pressure.

## Offline Behavior

After the first successful load, the service worker caches the shell and same-origin assets so the app can relaunch offline. Journal entries and analytics stay local in IndexedDB.

## Privacy

- No accounts
- No trackers
- No ads
- No cloud sync
- All NLP runs locally in-browser (compromise, natural)
- Local CSV export and local delete controls included

## Architecture

See `/docs/architecture.md` for the module layout and data flow.
