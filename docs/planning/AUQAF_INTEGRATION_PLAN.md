# Auqaf ↔ Shrines integration plan — Bibi Pak Daman demo

## STATUS (updated 2026-07-31, end of working session)

**Done by Claude — awaiting your review:**

- ✅ Workstreams A + D + E implemented in `Awqaf/` (a working copy of the Awqaf
  repo now inside this folder, branch `shrine-links-20260731`, two commits on
  top of `1.1` — code + a PROJECT_HANDOFF.md note; photos are sparse-excluded
  locally but unaffected in the repo). Cache token bumped to
  `v=shrine-links-20260731`. The same two commits also exist as
  `awqaf-shrine-links.patch` in the project root (apply to any checkout with
  `git am awqaf-shrine-links.patch`) in case you prefer your own clone.
- ✅ Workstream C implemented here (`src/pages/ShrinePage.tsx`,
  `src/styles/shrine.css`), plus the photo-credit CSS bug fix.
  Verified on Linux: typecheck ✓, eslint (0 warnings) ✓, vitest 197/197 ✓,
  vite build ✓. Left uncommitted for your review (`git diff`).
- ✅ **Photos (updated 2026-07-31, evening):** the Drive-URL approach was dead on
  arrival — the `uc?export=view` format is deprecated AND the form-upload files
  are private (owner-only), so no Google URL would ever render for visitors.
  Also, 5 of the 12 "Image" links in the old TSV were actually **PDF books**,
  not photos. Fixed by self-hosting: the 7 real photos were downloaded from
  Drive and committed to `public/photos/bibi-pak-daman/` (hero landscape of the
  zarih + dome first, then architecture/zarih/exterior/courtyard/dusk/street).
  `data/shrines.json`, `src/data/shrines-fallback.json`, and
  `shrines_updated.tsv` now point at
  `https://raufnawaz.github.io/Sufi-Shrines/photos/bibi-pak-daman/bibi-pak-daman-0N.jpg`
  (Image 1–7) with Image 8–16 cleared. Verified again end-to-end:
  197/197 tests, build, prerender (og:image = the new hero URL).

**Batch photo update (2026-07-31, late):** the same self-hosting treatment was
applied to every surveyed shrine. 55 more photos (downloaded from Drive,
EXIF-corrected, resized to ≤1600px) now live under `public/photos/` for:
Mazar-e-Iqbal (10), Shah Jamal (10), Peer Makki (10), Abul Faiz Qalander Ali
Suharwardi (9), Madho Lal Hussain (8, two unusable frames dropped),
Ganj e Inayat Sarkar (8), Data Darbar (1 — appended after its Wikimedia hero;
its flaky Dawn hotlink dropped). Mauj Darya Bukhari's survey photos were
deleted from Drive and Mian Mir's uploads were all PDF books, so both rows were
restored to their original Wikimedia images in `shrines_updated.tsv`. The five
PDF-book links mistakenly merged into image columns were cleared everywhere.
Every photo was visually reviewed via contact sheets; heroes hand-picked.
All data files updated; 197/197 tests, build, prerender re-verified.

**Left for you (in order):**

1. In this repo: review the diff, run `npm run verify && npm run e2e` on your
   Mac (Playwright browsers couldn't run in my sandbox), commit
   (**including the new `public/photos/bibi-pak-daman/` folder**), push.
   The photos only exist online after this deploy.
2. Update the live shrines Google Sheet — Bibi Pak Daman row: set Image 1–7 to
   the seven URLs above (copy them from the row in `shrines_updated.tsv`) and
   **clear Image 8–16** (they currently hold broken Drive links / PDF books).
   Or paste the whole corrected `shrines_updated.tsv` if you want all 14
   surveyed shrines' text updates too — but note the other 13 rows still carry
   dead `uc?export=view` photo links, so their images will show placeholders
   until we self-host those the same way (say the word and I'll batch it).
3. In `Awqaf/`: review `git show`, test locally (`npx serve .`), check
   `mosque.html` on your iPhone via the local server, then push the branch and
   merge to `1.1` (that is the production deploy).
4. After both deploys: run the demo script at the bottom of this doc.

---

Prepared 2026-07-31 for the department presentation. Covers four asks:
cross-linking the Awqaf site to the shrine page, high-res photos + top-of-page
panels on the Bibi Pak Daman shrine page, link styling on the Awqaf map drawer,
and mobile fixes on the Awqaf mosque pages.

## The two sites

| | Shrines Project | Awqaf |
|---|---|---|
| Repo | this folder (React + Vite) | `RaufNawaz/Awqaf`, **branch `1.1` = production** |
| Live | `https://raufnawaz.github.io/Sufi-Shrines/` | `https://raufnawaz.github.io/Awqaf/` |
| Data | published Google Sheet CSV (`data/csv-source.json`) | published Google Sheet CSV (`js/config.js`) |
| Deploy | GitHub Actions (`deploy-pages.yml`) | pushing/merging to `1.1` IS the deploy (~1–2 min) |

Bibi Pak Daman URLs for the demo:

- Shrine page: `https://raufnawaz.github.io/Sufi-Shrines/shrine/shrine-of-bibi-pak-daman`
- Mosque page: `https://raufnawaz.github.io/Awqaf/mosque.html?id=<mosqueId>-<rowIndex>` —
  the exact id is read off the live map (click the marker; the URL bar gets `?id=…`).
  Note the Awqaf row id embeds the sheet row index, so it changes if sheet rows are
  reordered — fine for the demo, worth stabilizing later.

---

## Workstream A — Awqaf → shrine links (ask #1)

All three placements link **to** the shrine page (this is what builds our visibility):

1. **Map drawer** (`js/app.js` `renderDetails`, ~L395): the shrine name under
   "Associated Shrine" is currently plain text via `appendTextRow`. When a link
   exists, render it with `appendLinkRow` instead (shrine name as the anchor text,
   `target="_blank"`).
2. **Mosque page, "About this mosque"** (`js/mosque.js`): append a sentence after the
   narrative — *"More information on the associated shrine, [Bibi Pak Daman], can be
   found on the Sufi Shrines archive."* `formatParagraphs` HTML-escapes everything,
   so this paragraph is built separately with an escaped `<a>` inserted.
3. **Mosque page, right panel** (`js/mosque.js` `renderFactRows` + `publicFacts`,
   ~L303/L530): extend fact items with an optional `href`; the "Associated shrine"
   value becomes a hyperlink.

### Scalable mapping (per your long-run goal)

New module `js/shrine-links.js`:

```js
// Keyed by the sheet's "Shrine Name" value, normalized with normalizeSearchText().
// Add a line per Auqaf shrine as pages go live — no other code changes needed.
const SHRINE_PAGE_LINKS = {
  "bibi pak daman": "https://raufnawaz.github.io/Sufi-Shrines/shrine/shrine-of-bibi-pak-daman",
};
export function getShrineLink(row) { /* normalize row.shrineName, look up */ }
```

The exact key is taken from the live Awqaf sheet's "Shrine Name" cell during
implementation. **Phase 2 (post-presentation):** add a `Shrine Page URL` column to
the Awqaf sheet (`config.columns` + `data.js`) that takes precedence over the map,
so non-developers can add links from the sheet alone.

### Cache busting (matters because imams will open this on phones)

Every JS/CSS reference carries `?v=hero-photo-cap-20260710` (in `index.html`,
`mosque.html`, and every intra-JS `import`). Bump all of them to a new token
(e.g. `v=shrine-links-20260731`) in the same commit, or phones serve stale code.

---

## Workstream B — high-res photos on the shrine page (ask #2a)

The shrine site takes images from the sheet's `Image N` columns; the current
`Image 1` is a low-res 2004 Wikimedia photo. Saifullah's response-form photos are
already merged into **`shrines_updated.tsv`** (project root): the Bibi Pak Daman row
has 12 Drive URLs in Image 1–12 (`drive.google.com/uc?export=view&id=…`).

1. **Verify one Drive URL renders as a plain `<img>`** (Drive sometimes redirects
   `uc?export=view` to a viewer). If it doesn't, rewrite to
   `https://lh3.googleusercontent.com/d/<FILE_ID>=w2400` (direct render, full res)
   — a mechanical substitution I can apply across the TSV.
2. **Paste `shrines_updated.tsv` into the live sheet** (or minimally: paste the
   Image 1–12 cells of the Bibi Pak Daman row). This is the one step only you can
   do. Caveat from the earlier session: the TSV is alphabetically sorted, so a full
   paste re-sorts the sheet (harmless to the app — slugs are name-based).
3. `npm run data:build` → refreshes `data/shrines.json` + `src/data/shrines-fallback.json`;
   `npm run data:validate` (+ `data:validate:images` HTTP-checks every URL).
4. Free win: `parseGallery` picks up `Image 1–12` automatically → the shrine page
   gets a 12-photo gallery; hero uses Image 1. Pick the strongest exterior shot as
   Image 1. Optional: add `Image 1 Credit` column ("Saifullah Imtiaz / Shrines
   Project field survey, 2026") — schema already supports it.

---

## Workstream C — panels visible on page open (ask #2b)

Diagnosis: nothing is hidden — the ToC rail and the "Muslim Shrine" infobox simply
sit *below* the hero in the DOM (`ShrinePage.tsx` L185–241), and the title block
(~300px) + 460px hero push `.shrine-article-layout` below the fold. `position:
sticky` on the infobox can't pull it up.

Fix: move the hero **inside** the article layout so the infobox and ToC start at the
top of the page beside it.

- `src/pages/ShrinePage.tsx`: relocate the `.shrine-hero` block to be the first
  child of `.shrine-article-main` (inside `.shrine-article-layout`).
- `src/styles/shrine.css`: the existing grid already does the rest —
  ≥640px: `'toc infobox' / 'main infobox'` puts ToC + infobox at the top beside the
  photo; ≥1340px the ToC moves to the left margin rail. Trim `.shrine-hero`'s bottom
  margin inside the new position; optionally cap `.shrine-hero-img` at ~380px so
  photo + infobox top align cleanly.
- Mobile (<640px) keeps its current order (infobox card first, then photo/article).
- Pre-existing bug to fix while there: `shrine.css:825` `.shrine-hero img ~ * { display:none }`
  suppresses the photo credit line whenever an image loads.
- Gates: `npm run verify`, `npm run e2e` (incl. Urdu no-leak), visual check at
  1440/1024/640/390 widths, both `?lang=en|ur`.

---

## Workstream D — drawer title link styling (ask #3)

`style.css` `.details-title-link` (~L200) currently inherits black with no
underline. Change to the site's link blue (`--link: #0b5f86`) with a permanent
underline:

```css
.details-title-link {
  color: var(--link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.details-title-link:hover { color: var(--accent-strong); }
```

Also applies visual consistency to the new "Associated Shrine" link (same
underline treatment, via a shared class).

---

## Workstream E — mosque page mobile fixes (ask #4)

Goal: no horizontal scroll, content centered, at iPhone widths (~375–430px), since
imams will open `mosque.html` during the presentation.

1. **Audit first**: open the live Bibi Pak Daman mosque page at 390×844 and list
   every element wider than the viewport (one-liner:
   `[...document.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1)`).
2. Likely offenders from the CSS (`style.css`): grid/flex children without
   `min-width: 0`; `.mosque-coordinate-card { min-width: 220px }`; long unbreakable
   strings (coordinates `<code>`, addresses, mosque names) in `.mosque-fact dd` /
   `.mosque-richtext`; the `mosque-fade-up` entrance transforms mid-animation.
3. Targeted fixes plus safety nets, all scoped to `.mosque-body`:
   - `.mosque-body { overflow-x: clip; }`
   - `.mosque-layout > *, .mosque-hero-top > *, .mosque-main > * { min-width: 0; }`
   - `.mosque-fact dd, .mosque-richtext p, .mosque-address-text, .mosque-coordinate-card code { overflow-wrap: anywhere; }`
   - `img, iframe { max-width: 100%; }` within the page
   - at ≤430px: `.mosque-coordinate-card { min-width: 0; flex-basis: 100%; }`,
     `.mosque-title { font-size: 2rem; }`
4. Re-audit after fixes; verify no regression at desktop widths. Same cache-bust
   commit as Workstream A.

---

## Sequencing

| # | Step | Owner |
|---|---|---|
| 1 | Awqaf: clone into this folder (`Awqaf/`, feature branch, excluded from the shrines repo via `.git/info/exclude`) | Claude |
| 2 | Awqaf: Workstreams A + D + E + cache bump, verified locally with a static server + 390px viewport | Claude |
| 3 | Shrines: Workstream C layout change, `verify` + `e2e` green | Claude |
| 4 | Verify Drive image URL format; fix TSV if needed | Claude |
| 5 | Paste `shrines_updated.tsv` into the live shrines sheet | **rauf** |
| 6 | `npm run data:build && npm run data:validate`, commit fallback snapshots | Claude |
| 7 | Review Awqaf diff → push/merge to `1.1` (= production deploy) | **rauf** |
| 8 | Shrines: push `main`, then fast-forward the deploy branch — `git push origin main:1.6` (Pages deploys from `1.6`, NOT `main`) | **rauf** |
| 9 | Dry-run the demo script below on desktop + iPhone | both |

## Demo script (for the presentation)

1. Awqaf map → click the Bibi Pak Daman marker → drawer: mosque name now blue +
   underlined; "Associated Shrine: Bibi Pak Daman" is a link.
2. Click the mosque name → mosque page: "About this mosque" mentions the shrine
   with a link; right panel "Associated shrine" also links out.
3. Click through → shrine page: Saifullah's high-res hero photo, Contents + Muslim
   Shrine panels visible immediately beside it, 12-photo gallery below.
4. Hand an iPhone around: mosque page scrolls only vertically, everything centered.
