# Scroll The Quran

A calm, private Quran reader: one ayah at a time, with recitation, translation and tafsir.
No accounts, no ads, no tracking. Built as a mobile-first web app that installs to the home screen.

## Features

- **Reader** — one ayah per screen, vertical swipe, keyboard (↑/↓, j/k), word-by-word highlighting during recitation, tafsir drawer, transliteration and text size.
- **Daily Ayah** — one ayah is enough. "Done for today" after listening to the recitation, or opening the tafsir for 5 s (30 s of reading for long ayahs). A gentle week count ("5 of the last 7 days") that never resets to zero. Optional time label (After Fajr, Morning, …), no notifications.
- **How do you feel?** (`/feel`) — eight feelings, each opening a few hand-picked ayahs. The selection lives in `src/data/feelings.json` and is **pending scholar review**. "I'm not okay" opens Canada 9-8-8, 911 and findahelpline.com. The chosen feeling is never stored, sent or put in a URL.
- **Share** — every ayah has a link like `/13/28`. The server adds link-preview tags and a 1200×630 preview image, so WhatsApp and others show the ayah. `sitemap.xml` lists all 6,350 pages.
- **Artwork** — "light through a mashrabiya": light passing through a carved lattice onto a wall. It follows the time of day (Fajr, day, Maghrib, night) and takes a calm tint inside the feelings flow. Static under reduced motion. Preview any state with `?scene=fajr|day|maghrib|night` and `?tint=calm|warm|cool|rising|bright`.
- **Offline** — service worker caches the app and any surah or recitation opened once.
- **Privacy** — the browser only ever talks to this site (fonts, data and audio are all same-origin). Strict Content-Security-Policy on every response. One anonymous daily count (`new`, `1`, `2-7`, `8-30`, `31+`), nothing else.
- **Support** — set `SUPPORT_URL` to show a quiet "Support Scroll Quran" link (settings + done card). No payments in the app.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm start            # NODE_ENV=production node dist/boot.js
```

Cloudflare (recommended): see **Deploy to Cloudflare** below.

Docker: `docker build -t scroll-quran . && docker run -p 3000:3000 -v scroll-data:/app/data scroll-quran`

Configuration is optional — see `.env.example` (`PUBLIC_ORIGIN`, `SUPPORT_URL`, `COUNTS_FILE`/`DATABASE_URL`).

## Deploy to Cloudflare

Workers + Static Assets. Static files (app, Quran data, fonts) are served free at the edge; the Worker
(`worker/index.ts`) runs pages with preview tags, the audio proxy, tafsir, the daily count (D1), preview
images (cached in R2) and the sitemap. Preview images need Workers Paid ($5/month) for CPU time.

One-time setup:

```bash
npx wrangler login
npx wrangler d1 create scroll-quran-counts        # put the id into wrangler.jsonc
npx wrangler r2 bucket create scroll-quran-og     # enable R2 in the dashboard first
npm run cf:migrate
```

Set `PUBLIC_ORIGIN` and `SUPPORT_URL` in `wrangler.jsonc` (`vars`), add the custom domain under
`routes` (`{ "pattern": "quran.example.com", "custom_domain": true }`), then `npm run cf:deploy`.

Local check in Cloudflare's runtime: `npm run build && npm run cf:dev`, then `npm run test:e2e` (all suites
run against it unchanged).

## Tests

```bash
npm run lint && npm run check   # ESLint + TypeScript
npm test                        # unit tests (Vitest)
npm run test:e2e                # browser tests (Playwright, mobile + desktop)
```

To reuse an installed Chromium: `PW_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.
Visual baselines live in `tests/phase7.spec.ts-snapshots/` (Linux). Regenerate on another OS with `--update-snapshots`.

## Quran data

`public/data/` holds all 114 surahs as static JSON (built by `npm run data:quran`). The Arabic uses Quran.com's
`text_qpc_hafs` encoding, which matches the bundled UthmanicHafs font. Do not switch to `text_uthmani`: with this
font it draws placeholder circles on ~36% of ayahs. A unit test checks every character of all 6,236 ayahs against the font.

## Structure

- `src/pages/` — `Home` (reader), `Feel` (feelings + crisis), `Privacy`
- `src/components/` — ayah view, audio dock, tafsir drawer, surah picker, settings, done card, share, background scene
- `src/lib/` — pure logic with unit tests: `dailyAyah`, `scene`, `share`, `install`
- `api/` — Hono server: audio proxy, tafsir, ping, preview images (`/og`), sitemap, HTML preview tags, security headers
- `contracts/` — shared types and validators (feelings, ping, Quran data)
- `tests/` — Playwright suites per phase, plus `fixtures.ts` which fails any test that makes a third-party request or sends a feeling

## Before launch

- Scholar/imam sign-off on `src/data/feelings.json`; then set `"reviewStatus": "approved"` (hides the review note).
- Quran Foundation production credentials and attribution terms; confirm the preview-image font use (see `CREDITS.md`).
- Set `PUBLIC_ORIGIN` and `SUPPORT_URL` on the host.
