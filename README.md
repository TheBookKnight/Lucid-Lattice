# Lucid Lattice

Lucid Lattice is a mobile-first, offline-first PWA for capturing dream journals on iPhone and Android without app stores, accounts, or backend infrastructure.

## Features

- Offline-first dream journaling with speech-to-text capture
- **Audio recording** — record dreams verbally (3-minute max), replay, and re-record
- **Transcription** — generate transcripts from recordings using the Web Speech API (SpeechProvider architecture supports future offline Whisper Tiny fallback)
- **Favorite dreams** — mark important dreams with ⭐ and filter by favorites
- Emotion tagging with Plutchik's 8 primary emotions and per-emotion intensity
- Multi-word phrase extraction using compromise NLP — noun phrases, named entities, and compound phrases
- Top 30 phrases table and top 10 phrase frequency graph
- Phrase analytics filterable by timeframe (30d / 60d / 90d / all), emotion, and favorites
- CSV export with correct escaping for all entry data
- PWA manifest, service worker, cached app shell, fullscreen install
- Storage persistence request with install guidance fallback
- No accounts, no backend, no tracking

## Audio Recording

Users often wake up groggy and cannot type effectively. The audio recording feature allows:

1. **Record** — tap "Start Recording" to capture a dream verbally using the device microphone
2. **3-minute limit** — recordings automatically stop at 3 minutes with a countdown timer
3. **Playback** — play, pause, and restart recorded audio using native HTML audio
4. **Re-record** — discard an existing recording (with confirmation) and start fresh
5. **Local storage** — audio blobs are stored in IndexedDB (separate from journal metadata) as actual Blob objects, never base64

### Privacy

Audio recordings never leave the device. There is no cloud upload, no API calls, and no backend processing.

## Transcription

### Current implementation

The app uses the **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) for live speech-to-text capture. The existing "Tap to speak" button provides real-time transcription.

### SpeechProvider architecture

A `SpeechProvider` interface abstracts transcription:

```ts
interface SpeechProvider {
  isAvailable(): Promise<boolean>;
  transcribe(audio: Blob): Promise<string>;
}
```

Two providers are implemented:
- **NativeSpeechProvider** — uses the Web Speech API with runtime capability detection. Attempts `localOnly = true` when supported.
- **WhisperTinyProvider** — stub for future offline Whisper Tiny model support (currently throws "Not implemented")

### Future Whisper support

The `WhisperTinyProvider` abstraction layer is ready for future offline transcription via a locally-downloaded Whisper Tiny model. No model download is wired yet.

## Favorites

- Each dream entry has an `isFavorite` boolean field
- Toggle favorites with the ⭐ button on each entry
- Filter the journal list: "All Dreams" or "Favorites Only"
- Analytics support a "Favorites only" checkbox to analyze only favorited dreams

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

## Development

### How to run

```bash
npm install
npm run dev
```

### How to test

```bash
npm run test          # unit + component tests
npm run test:e2e      # end-to-end (Playwright)
npx tsc --noEmit     # type-check
npm run lint          # ESLint
```

### How IndexedDB stores audio

Audio blobs are stored in a separate `audioBlobs` table in IndexedDB (Dexie). Each blob is stored as an actual `Blob` object with a UUID key. Dream entries reference blobs via an optional `audioBlobId` field. This separation keeps the main entries table lightweight.

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
- Audio recordings stay on-device in IndexedDB
- Speech recognition uses the browser's built-in Web Speech API
- Local CSV export and local delete controls included

## Architecture

See `/docs/architecture.md` for the module layout and data flow.
