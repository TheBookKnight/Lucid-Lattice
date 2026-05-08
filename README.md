# Lucid Lattice

Lucid Lattice is a mobile-first, offline-first PWA for capturing dream journals and emotionally meaningful waking experiences on iPhone and Android without app stores, accounts, or backend infrastructure.

## What is included
- Next.js + React + TypeScript + Tailwind CSS foundation
- Dark, mobile-first single-screen capture flow
- Web Speech API integration behind a `SpeechProvider` abstraction
- IndexedDB persistence with Dexie
- Zustand draft/filter state
- Emotion tagging with Plutchik’s 8 primary emotions, per-emotion intensity, and double-valenced support
- Local analytics scaffolding with compromise, natural stopword filtering, and Recharts
- PWA manifest, service worker registration, cached app shell, fullscreen install metadata
- Local export/delete controls for privacy-conscious data handling

## Quick start
```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Available scripts
- `npm run dev` – start the development server
- `npm run lint` – run ESLint
- `npm run build` – create a production build
- `npm run test` – run the Vitest unit tests

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
- Local JSON export and local delete controls included

## Architecture
See `/docs/architecture.md` for the module layout and data flow.
