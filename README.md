# Scroll The Quran

A mobile-first, full-screen Quran reader built around one calm loop: read, swipe, listen, understand, and return.

## MVP features

- One ayah per viewport with vertical snap scrolling and keyboard navigation
- Uthmani Arabic, Sahih International, optional transliteration, and scalable text
- Ayah audio by Mishary Rashid Alafasy with continuous playback and word highlighting
- Tap-to-understand sheet with an unedited Ibn Kathir (Abridged) excerpt and word meanings
- Searchable surah navigator and automatic continuation into the next surah
- Browser-local last-read position, daily streak, and reading preferences
- Subtle Islamic geometric ambience with floating gold light and a static reduced-motion alternative
- Safe-area spacing, long-ayah scrolling, and responsive layouts

## Run

```bash
npm install
npm run dev
```

The development server runs on port 3000. Production:

```bash
npm run check
npm run build
npm start
```

## Quran Foundation configuration

The backend uses `@quranjs/api/server`. Credentials stay server-only. Without credentials, the app uses Quran.com's public v4 API as its verified fallback.

```bash
QF_CLIENT_ID=your_client_id
QF_CLIENT_SECRET=your_client_secret
QF_ENV=prelive
```

Pre-live contains Surahs 1–2 only; other surahs fall back to Quran.com. After production approval, use production credentials and set `QF_ENV=production`. Never expose `QF_CLIENT_SECRET` through a `VITE_` variable or client code.

## Data and persistence

- Arabic, translations, word data, audio, and tafsir: Quran Foundation / Quran.com
- Translation resource: Sahih International (`20`)
- Tafsir resource: Ibn Kathir (Abridged), English (`169`)
- Recitation: Mishary Rashid Alafasy (`7`)
- Last-read position, streak, transliteration, and font size are stored only in this browser. They do not sync across devices, and clearing browser data removes them.

Offline surah downloads, accounts, cloud-synced notes/bookmarks, and image-card sharing are intentionally outside this MVP.

## Structure

- `src/pages/Home.tsx` — reading loop, navigation, audio state, and persistence wiring
- `src/components/` — ayah feed, audio dock, tafsir sheet, surah navigator, and settings
- `api/quranService.ts` — server-side provider integration, normalization, fallback, and attribution
- `api/quranRouter.ts` — validated tRPC endpoints
- `contracts/quran.ts` — shared Quran data contracts
