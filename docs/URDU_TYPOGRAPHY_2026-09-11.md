# Urdu typography — the spacing pass of 11 September 2026

Rauf's brief (11 September 2026): *"Spacing and font size need to be more aesthetically
pleasing. The English versions look very clean, but in the Urdu versions the words are
flowing into one another, and things are just not coherent and appealing to the eye."*

This note records what was measured before anything was changed, what was changed, and
what the same probes read afterwards. The probes are `getComputedStyle` readings taken in
headless Chromium against the dev server at 1280×900 and 400×900, on `/ur/shrine/data-darbar`,
`/ur` with the shrine list open, `/ur/about`, a saint page and `/ur/order/qadiriyya`. Root
font-size in the RTL document is 16.8px (the long-standing compounding `1.05rem` on both
`html` and `body`, left alone).

## What was actually wrong

Two of the three causes were not the values the stylesheets carried but rules that stopped
those values from reaching the page.

1. **Article prose ran at 1.75 leading, not the 1.9 the token said.** `.article-prose`
   declares `line-height: var(--leading-relaxed)` for the Latin face, and at (0,1,0) it
   outranks the `[dir='rtl']` body rule that carries `--leading-urdu`. Measured: 18.65px
   Nastaliq on a 32.63px line. Nastaliq hangs descenders far below the baseline and stacks
   marks above it, so at 1.75 the tail of one line met the head of the next — which is
   exactly "words flowing into one another", vertically.
2. **Word-spacing was 0px on every Urdu surface**, under a comment in global.css saying a
   bump "reads as sprawl". Nastaliq words lean, and a word's tail runs beneath the head of
   the word after it, so the inter-word gap that reads as a space in Latin reads as a
   collision here. Form controls were doubly reset: Chrome's UA stylesheet sets
   `word-spacing: normal` on `button`/`input`, so even a bump on the root would not have
   reached the chips or the sidebar rows (each row is a `<button>`).
3. **Compact rows at 1.7 leading and badge text at 14px on a 1.5 line** clipped descenders
   inside pills and let an infobox value's tail touch the row beneath. Label and value in
   the Urdu infobox were also the same size (both `--text-sm`, because the English label's
   `--text-xs` is below the Nastaliq floor), so the hierarchy the English panel carries in
   size was carried in colour alone.

## What changed

All in `src/styles/`; tokens first, then the rules that make the tokens reach the page.

| Token / rule | Before | After |
| --- | --- | --- |
| `--leading-urdu` (tokens.css) | 1.9 | **2.05** |
| `--leading-urdu-heading` | 1.45 | **1.55** |
| `--leading-urdu-ui` | 1.7 | **1.85** |
| `--font-scale-urdu` | 1.11 | **1.15** |
| `--word-spacing-urdu` | — (0, hardcoded `normal`) | **0.12em**, consumed on `[dir='rtl']` and on RTL form controls; reset to `normal` on `[lang='en']` and `[data-latin]` |
| `[dir='rtl'] .article-prose` (shrine.css) | none — inherited 1.75 | `line-height: var(--leading-urdu)`; paragraph gap `--space-4` → `--space-5` |
| `[dir='rtl'] .article-section-heading` | margin-bottom `--space-4` | `--space-5` |
| `[dir='rtl'] .infobox-row` / `.infobox-value` | gap `--space-1`, value `--text-sm` | gap `--space-2`, value `--text-base` |
| `[dir='rtl'] .info-level-badge`, `.support-level-badge` (components.css) | `--text-xs`, line 1.5 | `--text-sm`, line 1.8 |
| `[dir='rtl'] .about-section p` | margin-bottom `--space-3` | `--space-4` |
| `[dir='rtl'] .shrine-list-name` (map.css) | margin-bottom `--space-1` | `--space-2` |
| `[dir='rtl'] .order-prose-quote` (kg.css) | 1.7 (Latin literal) | `var(--leading-urdu)` |

No `letter-spacing` was touched anywhere: tracking prises a connected script apart, and
`e2e/nastaliq-metrics.spec.ts` holds it at `normal`. `src/styles/__tests__/urduSpacing.test.ts`
now holds the ruling: leading floors (prose ≥ 2, rows ≥ 1.8), the RTL `.article-prose` rule
must exist and read the token, word-spacing must be a positive token consumed on the RTL
root and reset on Latin runs, and no RTL rule may set a non-zero letter-spacing.

## Measured, before → after (1280px; the 400px readings are identical except the h1)

| Element | Size | Line | Word-spacing |
| --- | --- | --- | --- |
| Article prose `p` | 18.65 → 19.32px | 32.63 → 39.61px (1.75 → 2.05) | 0 → 2.12px |
| Section `h2` | 23.31 → 24.15px | 33.80 → 37.43px | 0 → 2.12px |
| Page `h1` (1280) | 41.96 → 43.47px | 60.84 → 67.38px | 0 → 2.12px |
| Infobox label | 16.32 → 16.91px | 27.74 → 31.27px | 0 → 2.12px |
| Infobox value | 16.32 → 19.32px | 27.74 → 35.74px | 0 → 2.12px |
| Contents nav | 18.65 → 19.32px | 35.43 → 39.61px | 0 → 2.12px |
| About `p` | 18.65 → 19.32px | 35.43 → 39.61px; gap 12.6 → 16.8px | 0 → 2.32px |
| About lede | 20.98 → 21.74px | 39.86 → 44.56px | 0 → 2.32px |
| Sidebar row name | 16.32 → 16.91px | `normal` (unchanged, deliberately) | 0 → 2.03px |
| Sidebar group heading | 13.99 → 14.49px | 26.57 → 29.70px | 0 → 2.12px |
| Filter chip | 18.48px (literal, unchanged) | `normal` | 0 → 2.22px |
| Tab bar label (400px) | 12px (unchanged) | 17.4px | 0 |

Screenshots: scratchpad `urdu-typo/before/*.png` and `urdu-typo/after/*.png` for the same
six routes at both widths (session-local; the numbers above are what survives).

Horizontal overflow probe after the change, `/ur`, `/ur/shrine/data-darbar`, `/ur/about`,
`/ur/order/qadiriyya`, `/ur/settings`, `/ur/typology`, `/ur/shared-ground` at 390px and
400px: `scrollWidth === clientWidth` on every route.

## Deliberately not changed

- **Tab bar label at 12px on a phone.** Constrained by the bar's platform height; the
  earlier attempt at 10px smeared and 12px with a 1.45 line is the recorded compromise
  (tabbar.css). Larger type here means a taller bar, which is a layout decision.
- **Filter chips at a literal `1.1rem`.** The global.css comment explains why the literal
  is there (the reading-size slider); making each control read a token is a separate,
  visual decision it names.
- **Sidebar row `line-height: normal`.** These rows are single-line and `overflow: hidden`;
  the font's own metrics are the only value guaranteed to hold every Nastaliq descender
  inside the clip. The two provenance badges now wrap onto two lines in a 360px sidebar
  because they grew from 14px to 17px — the readable badge was preferred over the
  one-line row.
- **`src/styles/almanac.css`** — owned by the calendar redesign running in parallel.
- **Nothing in any `.tsx`**, and no UI string.

## If it recurs

Run the measurement, not the eye: the probe is a Playwright `getComputedStyle` sweep over
`.article-prose p`, `.infobox-value`, `.shrine-list-name`, `.filter-chip` on the Urdu
routes. If `.article-prose p` reports a line-height ratio under 2 in the RTL view, a Latin
`line-height` has been declared on a prose container again and is outranking the token —
that is the exact shape of the 1.75 bug, and the unit test names the rule that fixes it.
