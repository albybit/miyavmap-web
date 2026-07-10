# MiyavMap Web — design package

Web port of the app's **Visual System v1**. Same tokens, same card frames, same pins —
not a re-design. Source of truth: the app's Visual System doc + `DESIGN_INTEGRATION.md`.

## Contents

```
css/tokens.css        Color / type / shape tokens (light + dark + card constants)
css/components.css    Cards (4 tier frames + states), pins, floating UI, chips, buttons
assets/               14 brand SVGs — used directly (no vector-drawable conversion)
preview.html          Reference render of everything, with a theme toggle

index.html            v0 presentation page (LANDING_SPEC.md) — hero, how-it-works,
style.css             map teaser, rarity card samples, privacy strip, footer
main.js               Theme toggle + lazy Leaflet init (~60 lines, no build step)
pins.json             Static pin snapshot {lat,lng,rarity,name} — PLACEHOLDER data
                      until the real export from the seeded neighborhood lands
tools/export-pins.mjs Read-only exporter that regenerates pins.json from Firestore
                      (node tools/export-pins.mjs --center lat,lng --radius-km 3);
                      run it after the neighborhood is seeded, review, commit
vendor/               Leaflet 1.9.4 (self-hosted — no third-party runtime requests)
fonts/                Self-hosted woff2 subsets (Fredoka 500–600, Nunito Sans
css/fonts.css         400–800 variable, latin + latin-ext) — no CDN at runtime
assets/icon-*.png     Rasterized favicons 32/180/512 from app-icon.svg
assets/og-default.png Default social card (wordmark + mascot on the gradient)
```

## How to use

1. Load `tokens.css` then `components.css`.
2. Theme: `prefers-color-scheme` is the default; a manual toggle stamps
   `data-theme="light|dark"` on `<html>` (toggle wins). The two dark blocks in
   tokens.css are intentional duplicates — keep them in sync.
3. Card markup: see the comment block at `.cat-card` in components.css, or copy from
   `preview.html`. Epic and Legendary need the `.cat-card__wrap` element; Legendary also
   takes four `.cat-card__finial` spans as siblings of the wrap.
4. Pins: `.pin-photo` (circular divIcon, anchor center, 44 px) or `.pin-classic`
   (`pin-*.svg`, anchor tip, 32 px). Shared-cat badge: `.pin-badge pin-badge--<tier>`.
   Clusters: `.pin-cluster`.
5. Inline the `icon-*.svg` files where you need `fill: currentColor` tinting.

## Binding rules (do not break)

- No emoji in UI chrome. Design glyphs ★ ◆ ✦ ✓ are allowed.
- Fredoka only for page titles, card names, wordmark — never below 13 px.
- `#FF8F00` never as text. Text uses `#A65E00` light / `#FFC155` dark; on-gold `#2E1500`.
- `#1565C0` is borders-only on dark; rare text on dark uses `#7FB2F9`.
- Tiers are always double-coded (glyph + color).
- The card face is dark in both themes — `--card-*` constants, never theme tokens.
- Anything drawn ON the card face uses the `--rarity-*-oncard` aliases (dark set).
- `prefers-reduced-motion` handling in components.css is non-negotiable.

## Not included / TODO on your side

- ~~Fonts~~ **done** — self-hosted in `fonts/` + `css/fonts.css` (index.html uses them;
  preview.html still loads the CDN for convenience, it never ships).
- ~~Favicons~~ **done** — `assets/icon-{32,180,512}.png`, wired into index.html with
  `theme-color` `#FFF8F3` light / `#17120D` dark.
- **pins.json is placeholder data** (Rome, invented cats) — after seeding the beachhead
  neighborhood, regenerate with `tools/export-pins.mjs`, review, commit. (Tested
  2026-07-10 against the live project: works; register held only 3 test cards.)
- **Legal-page + og:image URLs**: confirm once the app repo's `catchcat → miyavmap`
  rename and this repo's name/domain are settled (TODO comments in index.html).
- Phase 1 Leaflet extras (photo divIcons, cluster class override) are spec §6 —
  the v0 teaser only uses the classic pins.
