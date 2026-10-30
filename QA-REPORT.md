# QA report — Scroll The Quran

Date: 2026-10-30 · Build: handover from Kimi (Phases 0–3) → completed Phases 4–8 + fixes.

## Results

| Check | Result |
| --- | --- |
| TypeScript (`npm run check`) | Pass |
| ESLint (`npm run lint`) | Pass |
| Unit tests (Vitest) | 36 / 36 pass (10 files) |
| Browser tests (Playwright, mobile 375×812 + desktop 1440×900) | 118 / 118 pass, two consecutive full runs |
| Privacy audit (every browser test) | Zero third-party requests; no feeling name in any URL or request body |
| Lighthouse, mobile, production build | Performance 96 · Accessibility 100 · Best practices 100 · SEO 100 (FCP 1.4 s, LCP 2.6 s, CLS 0) |
| Text contrast over all 4 scenes + 5 tints | ≥ 4.5:1 for the translation (measured from pixels) |
| Production-only install (`npm ci --omit=dev`) | Server starts; all routes, previews, audio, tafsir, ping work |

## Defects found and fixed

| # | Severity | Defect | Fix |
| --- | --- | --- | --- |
| 1 | Critical | 2,240 of 6,236 ayahs (36%) showed a dotted-circle placeholder instead of a Quran mark (e.g. 13:28 ءَامَنُواْ). Present on the live Kimi link. Cause: `text_uthmani` text paired with the KFGQPC Hafs font. | Re-fetched sourced `text_qpc_hafs` (the font's encoding). 0 placeholders; translations, audio, timings unchanged. Unit test checks every character of every ayah. |
| 2 | Critical | Every popup (surah picker, settings, tafsir drawer, privacy link) rendered off-screen. Tailwind `!` negation dropped dialog/drawer styles. | Explicit content globs. Browser test asserts popups are on screen. |
| 3 | High | Popups jumped ~50% of the screen while opening (animation overrode the centring transform). | Centre with the CSS `translate` property. |
| 4 | High | Shared links (`/13/28`), `/privacy`, 404s had no privacy/security headers. | Headers applied to every response at the server boundary. Tested on 9 response types. |
| 5 | High | Server refused to start without `APP_ID`, `APP_SECRET`, MySQL. Dockerfile copied a non-existent `.env`. | Env optional; JSON-file count store by default, MySQL optional. Dockerfile rewritten. |
| 6 | High | Quran data was cached by browsers as "immutable" for a year, so text corrections would never reach returning readers. | Normal cache lifetime for data; offline cache version bumped (v4). |
| 7 | Medium | Rapid next/previous taps could land on the wrong ayah (scroll race; cause of a flaky test). | Target-index lock during programmatic scrolls. |
| 8 | Medium | Settings: "Privacy" and "Data and attribution" links ran together on one line. | Stacked. |
| 9 | Low | Lockfile pointed to Kimi's private npm mirror; unused AI packages installed. | Public registry; AI packages removed. |

## Built (Phases 4–8)

Daily Ayah habit · How do you feel? + crisis screen · share links, preview images (≤ 130 KB, Arabic shaped with HarfBuzz), sitemap/robots · "light through a mashrabiya" artwork with time-of-day and feeling tints, parallax, reduced-motion and hidden-tab pause · support link.

## Deviations from the spec (deliberate)

- **Done for today:** a full recitation counts on its own (very short ayahs end before 5 s). Drawer still needs 5 s; long ayahs 30 s.
- **Storage:** `localStorage`, not IndexedDB. Both are cleared the same way by iOS; one store is simpler.
- **Feeling history:** not stored at all (the spec allowed optional local history). Most private option.
- **Preview params:** `?tint=` takes palette names (`calm`, `warm`…), not feeling names, so no URL ever contains a feeling.
- **Header:** the old consecutive-day streak is replaced by the gentle week count (`3/7`).

## Open items (need a person, not code)

1. Scholar/imam sign-off on `src/data/feelings.json` (app shows "Selection under scholarly review" until `reviewStatus` is `approved`).
2. Quran Foundation production credentials + attribution terms; confirm the server-side font copy used for preview images.
3. A hafiz/teacher spot-check of the Arabic after the encoding change (sourced text, but worth human eyes).
4. Hosting: Kimi's preview injects its own analytics — move to your own host (Cloudflare) before sharing publicly.
5. Set `PUBLIC_ORIGIN` and `SUPPORT_URL`.

## Not tested here

Real iPhone/Android hardware (Safari install flow, audio on lock screen), screen readers beyond automated checks, Docker image build (no Docker in this environment; the production-only install it uses was tested).
