# Credits

## Quran content and audio

- Arabic text: Quran.com API v4, `text_qpc_hafs` encoding (the encoding the KFGQPC UthmanicHafs font is built for) — https://quran.com/developers
- Translation: Sahih International (resource 20). Word meanings and transliteration from Quran.com.
- Tafsir: Ibn Kathir (Abridged), English (resource 169), shown unedited with a source link.
- Recitation: Mishary Rashid Alafasy, ayah-level audio, served through this site's own `/audio` proxy.
- Quran Foundation Content API and the official `@quranjs/api` SDK — https://api-docs.quran.foundation/

No AI-generated translations, meanings, or tafsir are used. Nothing in the Quran text is edited.

## Typography (all self-hosted — no font CDNs)

- KFGQPC UthmanicHafs (v18) from Quran Foundation — see `public/fonts/UthmanicHafs-NOTICE.txt`.
  The server keeps an unmodified TTF copy (same font, decompressed from the WOFF2) in `api/assets/fonts/`
  only to draw the ayah in share-preview images. Confirm this use against the QF developer terms before launch.
- Hanken Grotesk and Tajawal — SIL Open Font License (see `public/fonts/*-OFL.txt`).

## Interface

- Icons: Lucide — https://lucide.dev/
- UI primitives: Radix UI, Vaul, and shadcn/ui patterns
- Text shaping for preview images: HarfBuzz (harfbuzzjs); rasterising: resvg

The background artwork ("light through a mashrabiya") is original SVG + CSS. No stock photography or generated imagery.
