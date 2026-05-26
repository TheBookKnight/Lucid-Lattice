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
| `npm run preview` | Build and preview on local Cloudflare Pages emulator |
| `npm run deploy` | Build and deploy to Cloudflare Pages |

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
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every pull request to `main`:

1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — type-check
3. `npm run lint` — ESLint
4. `npm run test` — unit + component tests
5. `npm run build` — production build

PRs fail automatically if any step fails.

## Deployment

### Cloudflare Pages

The app deploys automatically to Cloudflare Pages on every push to `main` via `.github/workflows/deploy.yml`.

#### Setup (first time only)

1. Create a Cloudflare Pages project named `lucid-lattice` in the Cloudflare dashboard.
2. Add the following secrets to this repository (**Settings → Secrets and variables → Actions**):
   - `CLOUDFLARE_API_TOKEN` — API token with Workers/Pages permissions
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
3. The next push to `main` will trigger a deployment.

#### How the deploy works

On every push to `main`:

1. **Install** — `npm ci`
2. **Build** — `npx opennextjs-cloudflare build` (runs `next build` then packages for Cloudflare Workers)
3. **Deploy** — `npx wrangler versions upload` pushes the `.open-next/` output to Cloudflare Pages

The workflow requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

#### Preview locally

```bash
npm run preview                        # builds and runs Cloudflare Pages locally
```

Then open `http://localhost:8788`.

## PWA icons and screenshots

### Icon sizes

All PWA icons live in `public/icons/` and are generated from the master 512×512 source at `public/icon-512.png`.

| File | Size | Purpose |
|---|---|---|
| `icon-72x72.png` | 72×72 | any |
| `icon-96x96.png` | 96×96 | any |
| `icon-128x128.png` | 128×128 | any |
| `icon-144x144.png` | 144×144 | any (minimum for Chrome installability) |
| `icon-152x152.png` | 152×152 | any |
| `icon-192x192.png` | 192×192 | any |
| `icon-384x384.png` | 384×384 | any |
| `icon-512x512.png` | 512×512 | any |
| `icon-192x192-maskable.png` | 192×192 | maskable (safe-area padded) |
| `icon-512x512-maskable.png` | 512×512 | maskable (safe-area padded) |

### Regenerate icons

Requires Python 3 with Pillow installed (`pip install Pillow`):

```python
from PIL import Image
import os

src = "public/icon-512.png"
out = "public/icons"
os.makedirs(out, exist_ok=True)
original = Image.open(src).convert("RGBA")

for size in [72, 96, 128, 144, 152, 192, 384, 512]:
    original.resize((size, size), Image.LANCZOS).save(f"{out}/icon-{size}x{size}.png")

# Maskable — 10% safe-area padding on each side
for size in [192, 512]:
    canvas = Image.new("RGBA", (size, size), (5, 8, 22, 255))
    inner_size = int(size * 0.8)
    inner = original.resize((inner_size, inner_size), Image.LANCZOS)
    offset = (size - inner_size) // 2
    canvas.paste(inner, (offset, offset), inner)
    canvas.save(f"{out}/icon-{size}x{size}-maskable.png")
```

### Screenshots

Screenshots for the richer install UI live in `public/screenshots/`:

| File | Dimensions | Use |
|---|---|---|
| `mobile-home.png` | 390×844 | Mobile install prompt |
| `desktop-dashboard.png` | 1280×720 | Desktop install prompt (`form_factor: "wide"`) |

Replace these files with real screenshots of the running app for best install-prompt presentation.

### Validating PWA installability

1. Deploy to Cloudflare Pages (or run `npm run preview`).
2. Open Chrome DevTools → **Application → Manifest** — check for zero errors.
3. Run **Lighthouse → PWA** audit — all installability checks should pass.

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
