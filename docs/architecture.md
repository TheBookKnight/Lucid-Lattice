# Lucid Lattice architecture

## Core principles
- **Local-first**: journal entries, tags, and analytics live in IndexedDB via Dexie.
- **Offline-first**: the app shell is cached by a service worker so the installed PWA can reopen without a network connection after the first visit.
- **Mobile-first**: the primary UI is a single-column capture flow with large touch targets, dark mode defaults, and safe-area padding.
- **Extensible speech layer**: `SpeechProvider` abstracts Web Speech so future providers can replace it without rewriting the capture UI.

## Main modules
- `src/components/app-shell.tsx` drives capture, storage, export/delete controls, and the recent-entry view.
- `src/components/emotion-picker.tsx` implements Plutchik’s eight-emotion multi-select with per-emotion intensity and double-valenced flags.
- `src/components/analytics-dashboard.tsx` renders local analysis scaffolding with Recharts.
- `src/lib/db.ts` wraps Dexie for entry persistence.
- `src/lib/analysis.ts` performs lightweight local NLP using compromise plus natural stopwords.
- `src/lib/speech.ts` exposes the speech abstraction and Web Speech implementation.

## Data flow
1. The user records or types text into the draft state managed by Zustand.
2. Saving creates a normalized entry, extracts lightweight entities locally, and writes it to IndexedDB.
3. The dashboard filters entries in memory and computes recurring words, recurring entities, and emotional trends.
4. Export/download uses a local JSON blob; delete clears IndexedDB on the device.

## PWA notes
- `src/app/manifest.ts` defines standalone install metadata.
- `public/sw.js` caches the app shell and same-origin GET responses for offline reopening.
- `src/components/service-worker-registration.tsx` registers the service worker on the client.
