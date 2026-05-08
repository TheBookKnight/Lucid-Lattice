# Lucid Lattice architecture

## Core principles
- **Local-first**: journal entries, tags, and analytics live in IndexedDB via Dexie.
- **Offline-first**: the app shell is cached by a service worker so the installed PWA can reopen without a network connection after the first visit.
- **Mobile-first**: the primary UI is a single-column capture flow with large touch targets, dark mode defaults, and safe-area padding.
- **Extensible speech layer**: `SpeechProvider` abstracts Web Speech so future providers can replace it without rewriting the capture UI.
- **Privacy-first NLP**: all text analysis runs in-browser using compromise and natural — no data ever leaves the device.

## Main modules
- `src/components/app-shell.tsx` drives capture, storage, export/delete controls, and the recent-entry view.
- `src/components/emotion-picker.tsx` implements Plutchik's eight-emotion multi-select with per-emotion intensity and double-valenced flags.
- `src/components/analytics-dashboard.tsx` renders local analysis including a Top Phrases table, recurring word chart, emotional trend chart, and entity/correlation panels.
- `src/lib/db.ts` wraps Dexie for entry persistence.
- `src/lib/analysis.ts` performs lightweight local NLP using compromise plus natural stopwords. Exports:
  - `tokenizeText` — single-word tokenizer with stop-word and filler-word filtering
  - `extractEntities` — named entity extraction (person, place, noun) via compromise
  - `extractPhrases` — multi-word phrase extraction (noun phrases, adjective+noun, compound nouns) normalized to lowercase with deduplication
  - `buildAnalysis` — computes `AnalysisSnapshot` including `topPhrases`, `topWords`, `recurringEntities`, `emotionalTrends`, and `correlations`
  - `filterEntries` — applies timeframe, emotion, entry-type, lucid, nightmare, and double-valenced filters
- `src/lib/speech.ts` exposes the speech abstraction and Web Speech implementation.
- `src/types/journal.ts` defines all shared types including `PhraseMetric` and `AnalysisSnapshot`.

## NLP pipeline

```
raw entry text
  → tokenizeText      → single-word frequency table (topWords)
  → extractPhrases    → multi-word phrase frequency table (topPhrases)
  → extractEntities   → stored on entry at save time (recurringEntities)
  → emotion data      → daily intensity aggregates (emotionalTrends)
```

### Phrase extraction detail
`extractPhrases` uses three compromise patterns:
1. `doc.nouns()` — all noun phrases (includes compound nouns)
2. `doc.match('#Adjective+ #Noun+')` — adjective-led noun phrases ("silver wolf", "dark forest")
3. `doc.match('#Noun #Noun+')` — compound noun chains ("race car", "ice cream")

Candidates are lowercased, trimmed, deduplicated within the text, and filtered to multi-word phrases (≥ 2 tokens) that are not composed entirely of stop/filler words.

## Data flow
1. The user records or types text into the draft state managed by Zustand.
2. Saving creates a normalized entry, extracts lightweight entities locally, and writes it to IndexedDB.
3. The dashboard filters entries in memory and computes recurring phrases, recurring words, recurring entities, and emotional trends.
4. Export/download uses a local JSON blob; delete clears IndexedDB on the device.

## Testing

### Unit & component tests (`src/`)
- **Runner**: Vitest 4 + React Testing Library + happy-dom
- **Setup**: `src/test/setup.ts` extends vitest `expect` with `@testing-library/jest-dom` matchers
- **Types**: `src/test/vitest.d.ts` provides TypeScript declarations for the extended matchers
- Coverage targets: analytics correctness, phrase extraction correctness, filtering logic, component interactivity

### End-to-end tests (`e2e/`)
- **Runner**: Playwright (Chromium)
- **Config**: `playwright.config.ts` — auto-starts the dev server, headless in CI
- Tests cover: page load, tab switching, emotion UI, analytics empty state, entry save flow

### CI/CD (`.github/workflows/ci.yml`)
Runs on every push to `main` and every pull request:
1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run test`
5. `npm run build`

## PWA notes
- `src/app/manifest.ts` defines standalone install metadata.
- `public/sw.js` caches the app shell and same-origin GET responses for offline reopening.
- `src/components/service-worker-registration.tsx` registers the service worker on the client.
