# Lucid Lattice

Lucid Lattice is a mobile-first, offline-first PWA for capturing dream journals and emotionally meaningful waking experiences on iPhone and Android without app stores, accounts, or backend infrastructure.

## What is included
- Next.js + React + TypeScript + Tailwind CSS foundation
- Dark, mobile-first single-screen capture flow
- Web Speech API integration behind a `SpeechProvider` abstraction
- IndexedDB persistence with Dexie
- Zustand draft/filter state
- Emotion tagging with Plutchik's 8 primary emotions, per-emotion intensity, and double-valenced support
- **Multi-word phrase extraction** using compromise — noun phrases, adjective+noun combos, and compound nouns are identified, deduplicated, and ranked by frequency
- Local analytics with top phrases table (frequency, trend direction, last seen, top emotion)
- Single-word frequency analytics, recurring entity tracking, and emotional trend charts
- Phrase and word analytics filterable by timeframe (7d / 30d / 60d / 90d / all), emotion, entry type, lucid, nightmare, and mixed-emotion flags
- PWA manifest, service worker registration, cached app shell, fullscreen install metadata
- Local export/delete controls for privacy-conscious data handling

## Quick start
```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Available scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm run test` | Run all Vitest unit and component tests |
| `npm run test:e2e` | Run Playwright end-to-end tests (requires a running dev server or `next build`) |

## Testing

### Unit & component tests
Tests live alongside source files and are run with Vitest + React Testing Library:

```bash
npm run test
```

The test environment uses `happy-dom` so component tests work without a real browser. `@testing-library/jest-dom` matchers are available globally.

### End-to-end tests
E2E tests are in `e2e/` and run with Playwright. The config spins up the Next.js dev server automatically:

```bash
# Install Playwright browsers once
npx playwright install --with-deps chromium

npm run test:e2e
```

### CI/CD
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and on every pull request:

1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — type-check
3. `npm run lint` — ESLint
4. `npm run test` — unit + component tests
5. `npm run build` — production build

PRs fail automatically if any step fails.

## Mobile install
### Android / Chrome
1. Open the site in Chrome.
2. Use the browser menu.
3. Choose **Install app**.

### iPhone / Safari
1. Open the site in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.

## Offline behavior
After the first successful load, the service worker caches the shell and same-origin assets so the app can relaunch offline. Journal entries and analytics stay local in IndexedDB.

## Privacy posture
- No accounts
- No trackers
- No ads
- No cloud sync in MVP
- All NLP runs locally in-browser (compromise, natural)
- Local JSON export and local delete controls included

## Architecture
See `/docs/architecture.md` for the module layout and data flow.
