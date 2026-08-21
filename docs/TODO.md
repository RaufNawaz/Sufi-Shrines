# To-do — as of 18 August 2026

> **18 August: the sheet import is DONE.** The live published sheet now serves 171 rows /
> 44 columns with `support_level` populated; §1 below is closed and kept only for the record.
> Verified against `data/shrines_final_import_2026-08-16.csv`: 0 descriptions differ, 0
> ``` fences leaked into any Description, 49 newline-free descriptions → 1. See §0 for what
> the 18 August session did and what is next.

---

## 0. Session log — 21 August 2026 (twelfth: publication-readiness)

Brief was "a full-scale professional deliverable, publicly publishable". So this pass looked for
things that would embarrass the project in public rather than for features.

### An internal note to a colleague was a public UI control

The region-filter chip reading *"not the shrine's exact position) — ask Saifullah for a precise
pin when possible"* was only the visible half. The note is still in `Location`, a public column,
and still reaches the shrine page, the almanac and the sidebar.

`scripts/data/validate-publication-safety.mjs` (wired into `data:validate`) refuses to ship
internal workflow notes. It draws one careful line:

- **`(surveyor: Saifullah)` inside a bibliography is correct and must stay.** Seventeen entries
  credit their fieldworker, and an archive whose distinguishing claim is provenance names its
  sources, including its people. A rule broad enough to catch personal names would delete
  exactly the thing this project exists to provide.
- **"ask Saifullah for a precise pin" is not a fact about a shrine.** It is a note between
  colleagues that happens to live in a content column.

So the rule is "no directives addressed to a person, and no task markers" — not "no names".
Proved in both directions: a planted `TODO: confirm the urs date with Rauf` fails it, and a
stale entry in its own exception list fails it too. `data/patch_data_hygiene_2026-08-21.csv`
moves the two live notes into `qa_note` (internal, never rendered) and keeps the substantive
provenance — *"an approximate landmark, not the shrine's exact position"* — where it is.

### A schema violation nothing was checking

`validate.mjs` never checked that `category` is one of the six schema values. `Darbar Abul Muali
Qadri` carries a blank `Category` and a lowercase `category: "Islam"`, so it loses its map
colour, drops out of the category filter, and is excluded from every per-tradition count — the
archive under-reporting itself by one, silently. Now a named warning; the repair is in the same
patch.

My first draft of that check accused a second row falsely: `row['category'] ?? row['Category']`
lets an *empty string* shadow a valid value, because `??` only falls through null. Same
first-non-empty semantics as `getFieldValue` now.

### /coverage — the gaps as a page

`src/lib/data/coverage.ts` + `/coverage`, computed from the shipped data on every load. Support
level, depth, tradition, citations, photography, dates, coordinates, observances — with
"not recorded" shown as its own row, because *the archive does not say* is a fact about the
archive and hiding the row would imply there is no such case.

It immediately earned its place twice: it exposed the category violation above, and it
established that **CLAUDE.md's standing finding "49 of 167 entries have no bibliography at all"
is closed** — 168 of 169 now carry one, 544 citations, 107 citing three or more. That note had
been quoted as current for weeks after it stopped being true. It is struck through in CLAUDE.md
rather than deleted, because the note is the lesson: **a standing finding is a measurement with
a date on it.** A page computed from the data cannot go stale that way.

### `/about` — licence, citation, corrections

`src/pages/AboutPage.tsx` + `src/lib/data/citation.ts`. Code MIT, data ODbL-1.0, stated on the
page rather than only in `LICENSE`; copy-able citations for the archive as a whole and for a
single entry; how to report a correction. A public archive that cannot be cited cannot be used
in the scholarship it exists to support.

### Then the accessibility sweep, which was scanning two pages out of nine

`e2e/a11y.spec.ts` covered `/` and `/shrine/:slug` while the app grew `/graph`, `/almanac`,
`/saint`, `/order`, `/coverage` and `/about` — the fifth instance this week of a check reporting
success over the wrong universe. Extended to nine routes × both languages (23 tests).

It failed eight of eighteen, and **six of the eight were the check's own fault.** axe folds
ancestor `opacity` into the foreground colour it measures, so it was reporting elements
part-way through their fade-in: almanac text at `#978d7f`, order links at `#6b82b6` — colours
that are in no palette, being `--color-text-muted` and `--color-primary` composited onto the
page ground. Every failing selector carried `.reveal-rise` or `.page-enter`.

Worth writing down that my first diagnosis was wrong: I had rebuilt `dist` twice during the
run and concluded the failures were artefacts of that. Rebuilding mid-run is a real mistake,
but it was not this one — the failures reproduced exactly on a stable build. **A plausible
explanation is not a cause.** `settle()` now waits for animations to finish before scanning,
skipping infinite ones, and *fails* if they never finish, so a permanently semi-transparent
element is still caught and is attributed to the animation rather than the palette.

Two genuine findings were underneath:

- **`.not-found-code` at 1.43:1.** The 36px "404" was painted with `--color-border`, a hairline
  token. `src/styles/__tests__/textColorTokens.test.ts` now rejects any `color:` resolving to a
  border token, with a by-selector exemption list for decorative glyphs that fails when an entry
  goes stale. Mutation-tested.
- **Order links distinguished by hue alone**, 1.26:1 against the surrounding prose (WCAG 1.4.1).
  The obvious fix was an underline; an underline crosses the descenders of Nastaliq and that
  line is Urdu half the time. They are pills now, matching the shrine tags beneath them. axe
  reported it on the Urdu route only, but the markup was identical — **an accessibility fix that
  reads as an English-first fix is not finished.**

23/23 green. `npm run verify`: 499 tests.

### And the social card, which did not exist

`index.html` declared `twitter:card=summary_large_image` and carried no `og:image`, so every
link to this archive shared on WhatsApp — which is how most of its readers arrive — rendered as
a bare URL. `npm run og:image` renders `public/og-image.png` from the repo's own material: both
`siteTitle` values, the palette from `tokens.css`, and all 169 recorded coordinates as a point
cloud that traces the Indus corridor. The skew towards Punjab is the honest part; a card
implying national coverage would advertise something the archive does not have.

The generator refuses to write if a font did not load (a card silently set in DejaVu Serif is
found out from a shared link months later), `withSocialImage()` in `prerender.mjs` *replaces*
rather than appends so a photographed shrine does not end up with two `og:image` tags where
crawlers read only the first, and `scripts/og-image.lock.json` +
`src/lib/data/__tests__/socialCard.test.ts` fail when the count baked into the PNG drifts from
the data. Also deleted a 14-line dead `metaBlock` in `prerender.mjs` that nothing referenced.

`npm run verify`: 505 tests.

### Then the map route, which shipped a megabyte of basemap first

`/` carried 1628 KB of eager JS and 1035 KB of it was maplibre-gl — the tiles *under* the
archive. The sidebar, search worker, filters, era slider and markers are Leaflet and React and
need none of it. Lazy-loaded: **1628 KB → 593 KB**, and `/` is no longer the heaviest route.
Guarded by `MUST_STAY_LAZY` (build fails on a stray top-level import — proved) and by a
payload spec that holds the chunk unfulfilled forever and asserts markers, list and search
still work, because a lazy module can still be awaited before first paint.

### And the Urdu accessible layer, which was entirely English

Twenty-six hardcoded `aria-label` / `title` / `alt` literals: every breadcrumb landmark,
"Shrine browser", "Open sidebar", "Clear search", "Filter by category", "Previous image",
"Reading progress", "Dismiss", and Leaflet's "Zoom in" / "Zoom out" / "Layers". An Urdu
screen-reader user got an English interface around Urdu content. The no-leak guard walks text
nodes; an accessible name is an attribute — the sixth wrong-universe check this week.

Two worse cases inside it. The sidebar's category heading rendered the Urdu label and set its
`aria-label` from the raw English key, so a screen reader announced English over Urdu. And
`UpdateToast` had *visible* English that no guard could ever reach, because it only renders
after a `controllerchange` and the e2e config blocks service workers — **a component gated on
something the harness disables is invisible to every e2e guard.**

`e2e/urdu-accessible-names.spec.ts` covers eight routes and every name-bearing attribute, with
three declared exemptions. Mutation-tested.

### A translated sentence that stated a false number

The almanac's coverage line was `{dated} {t('almanacCoverageOf')} {total} {t('...Sites')}`.
Urdu's postposition reverses the operands — "X میں سے Y" is "Y out of X" — so the Urdu page
said **"169 places out of 32"**. Both fragments translate perfectly; only the composition was
wrong. Fixed with `tFn` (each language writes the whole sentence), and
`noSentenceFragments.test.ts` now rejects any UI value that is nothing but a function word.

### Also

- The infobox title's accent was a 3px cobalt→gold gradient running into a 12px corner radius,
  so it read as two stray colour chips at the corners. Inset clear of the radius and solid.
- Five e2e failures traced to the sandbox, not the code: a reload of `/` takes 12.6 s here
  because every external subresource times out through the proxy. Verified by rebuilding
  `40d9fe1` and watching them fail identically.

### And a blank page for 12.5 s, for a font

`index.html` linked fonts.googleapis.com as a plain render-blocking stylesheet, so nothing
painted until that host answered. Measured with the CDN blocked: **first paint 12468 ms →
44 ms**, first contentful paint 12672 ms → 108 ms. Preload + `media="print"` +
`onload="this.media='all'"` + a `<noscript>` copy. It works only because every family has a
real fallback in tokens.css, which `renderBlocking.test.ts` asserts along with the rule.

This was already the project's reasoning applied to half the fonts: Nastaliq is self-hosted so
the Urdu reading face does not depend on a CDN. The Latin faces never got the same treatment.

The guard's first draft passed while inspecting nothing — the HTML comment documenting the
pattern says `<noscript>` in prose, and stripping noscript before comments swallowed the links
under test. Strip comments first; the CSS tests already do.

`npm run verify`: 512 tests.

### The skip links: English, dangling, and not moving focus

Three defects in the two controls a keyboard reader reaches first. The labels were hardcoded
English on every route. `#shrine-directory` exists only on the map route, so on eight of nine
routes the second link pointed at a missing id and focus stayed put. And `#main-content` had no
`tabindex="-1"`, so following the working link scrolled the page and left focus on the link —
the next Tab resumed from the header the reader had just asked to bypass. Plus four pages
rendering a duplicate `#main-content` link on top of the global one.

Invisible to axe (a plausible fragment href is not a violation), to screenshots (a skip link is
hidden until focused) and to the leak guard. `e2e/skip-links.spec.ts` is behavioural: every
route, does each target exist, is it unique, does following it move focus.

### And the leak guard was exempting every `<a>`

`.coords, a, bdi, [data-latin]` — on a site where a large share of the interface is anchors.
Removing `a`: **328 leaks on the map route**, nearly all of them `#shrine-directory`, the
`sr-only` list of all 169 shrines, announcing English names and locations on the Urdu site.
Built for screen-reader users, invisible to screenshots, waved through by the one guard for it.

`bdi` is no longer an exemption either. `<bdi>` is a bidi tool — mixed-script text needs it
whether or not the run is translated — so letting it mean "deliberately untranslated" made the
fix for any leak "wrap it", which satisfies the check and changes nothing for the reader. The
declaration is `data-latin` now, and `e2e/urdu-no-leak.spec.ts` **counts** it per route against
a budget that may shrink and may not grow.

Undeclared English: 0 on all eight routes. Declared debt: graph 253, almanac 87, order 41,
saint 14, about 7, map 7, shrine 4, coverage 1.

Also found: the same alt-name field was localised on the order page and raw on the saint page
and lineage view; `altNames.join(' · ')` made one Latin run that bidi reordered; and two
components render the same related-card shape, so fixing one left the other leaking. Grep the
class name, not the component.

`npm run verify`: 512 tests.

### And then translated them

The almanac's observance strings were the largest block of untranslated reader-facing prose
left, on the page a reader visits to find out when to go. Measured: 318 occurrences over 168
rows, semicolon-joined, **190 distinct segments**, of which the 33 most common cover 157. So the
unit is the segment, not the cell — a whole-cell lookup matches almost nothing.

`OBSERVANCES` in `build_dictionary.py` carries those 33; `localizeObservance.ts` splits on `;`,
looks each part up, and **leaves an unmatched segment exactly as written**. Composing Urdu from
tokens ("annual" + "urs" + "spring") is refused on purpose — that is how the false number
happened above. The separator is localised to `؛` only when something actually translated;
Arabic punctuation around English fragments reads as a bug, not a translation.

The shrine infobox's `Events` row goes through the same path now (it had the same whole-string
lookup problem), with `resolveFieldValue()` holding both field-specific cases in one place.

The 33 entries are drafts, same standing as the shrine names. What is not translated stays
English and stays counted.

Measured effect: the almanac's declared debt fell **87 → 39**, the shrine page's 4 → 2.

### 169 links in the accessibility landmark 404'd in production

The screen-reader shrine directory emitted `<a href="/shrine/${slug}">`, which bypasses the
router basename — and the site is served from `/Sufi-Shrines/`. Every one of those links was
broken on the live site: the one part of the interface that exists solely for a screen reader.

**No test could see it.** `build:e2e` sets `VITE_BASE_PATH=/`, which is exactly the
configuration in which the bug does not exist. `<Link to>` now, plus
`internalLinks.test.ts`, whose own first draft flagged the comment explaining the fix (it
quotes the bad pattern) — the third time this session a check scraped its own prose.

### And a spec that was measuring a transition

`dragging the handle open reveals the shrine list` read the sheet's height as soon as the
`collapsed` class dropped: 134px against >200, on a sheet that animates 108px → ~641px. Two
wrong diagnoses first — "more environmental failures" (no: it reproduced alone, three times)
and "one of this session's commits" (no: the bisect came back non-monotonic, which is a bisect
telling you the test is timing-dependent). `settle()` moved from the a11y spec into
`fixtures.ts` and both use it; two checks had now blamed the code for a transient animated
state.

`npm run verify`: 520 tests.

### Four routes 404'd on the live site

`/graph`, `/almanac`, `/coverage` and `/about` were declared in App.tsx, reachable in-app, and
had no prerendered file. GitHub Pages serves files, so a shared link to any of them returned
GitHub's 404 — including the licence page and the coverage page, the two most linkable things in
the archive.

Invisible three times over: `public/_redirects` carries `/* /index.html 200`, which is **Netlify**
syntax that GitHub Pages ignores, so the SPA fallback had never worked; `npm run preview` has SPA
fallback built in; and the e2e suite runs against that preview server.

Now: real prerendered files with title, description, canonical and `/ur` mirror; `dist/404.html`
as the GitHub Pages fallback for anything else; the `Sitemap:` line robots.txt never had; and
the four in sitemap.xml. `scripts/check-routes-prerendered.mjs` parses the route table out of
App.tsx (a hardcoded list is what would go stale) and runs in `npm run build`. Mutation-tested.

`npm run verify`: 522 tests.

### Lighthouse was measuring two routes of twelve

`.lighthouserc.cjs` listed `/` and `/shrine/data-darbar` while the app grew six more routes, so
the performance, SEO and accessibility budgets reported on a sixth of the site. Now all nine
page types plus `?lang=ur`. **Unverified locally and the config says so** — lhci cannot run
here (no tile/font/CSV host is reachable through the proxy, and the report upload needs
network). The additions rest on the axe sweep, which does run here and is clean on every one of
those routes in both languages.

`public/_redirects` now says in its first line that it does nothing on GitHub Pages, and
`backfill-slugs.mjs` says so where it generates blocks for it.

### The docs index listed 23 of 52 files, and HANDOVER.md was not one

CLAUDE.md calls `docs/README.md` the index of all docs. It omitted this file's own companion —
`HANDOVER.md`, the one CLAUDE.md says to read first — plus `TODO.md`, `RUNBOOK.md`,
`GOLD_STANDARD.md`, `FRONTEND_NOTES.md` and the whole `prompts/` directory.

The worse half pointed somewhere wrong rather than nowhere: the "live working checklist" link
went to `docs/planning/TODO.md`, a 12 July snapshot whose stated highest-priority item was
completed on 18 August. Anyone following the index would have started on finished work. That
file now opens with a SUPERSEDED banner.

Rewritten to list all 52, and `docsIndex.test.ts` enforces both directions. Mutation-tested —
and the first mutation *passed*, because HANDOVER.md was linked twice and I had broken only one
link. A mutation test that passes has not proved the check sound; it has proved the mutation
weak.

`npm run verify`: 526 tests.

### The site count was stale in four files, one of them the front page

README.md said 163 sacred sites and named three traditions of six; CITATION.cff said 163;
HANDOVER §1 said 167; CLAUDE.md's standing findings said "49 of 167". None was wrong when
written — a count in prose is a measurement with a date on it, and prose does not recompute.
`siteCountConsistency.test.ts` checks each against the shipped snapshot, anchored on the
surrounding words so a reworded sentence fails rather than silently stopping being checked.

The README also had **no link to the live site** — the front door said "GitHub Pages (deployed
via .github/workflows/deploy-pages.yml)". Now it links the site, `/about` and `/coverage`, lists
the features added since (almanac, coverage, about, shared ground), and describes `npm run
verify` accurately: it includes format:check and the data gates, which CLAUDE.md is emphatic
about and the old wording omitted.

`npm run verify`: 531 tests.

### A doc told the reader to do the one thing RULE 3 forbids — and I had just promoted it

`docs/RUNBOOK.md` STEP 1 said `File → Download → Tab-separated values`. TSV export strips the
newlines inside cells and flattens the markdown of every Description; the repo documents that in
three other places. The runbook predates the discovery — it is dated 9 August.

The point is what the index rewrite above did to it: I put it under "read these first" on the
strength of its title, without reading it. A stale fact is believed; a stale instruction is
followed. Corrected in place with the old wording quoted, bannered with its date, demoted to the
history section, and `docsNoTsvExport.test.ts` now fails any doc that instructs a TSV export
while allowing the passages that explain why it is banned. Its first two runs flagged my own
prose — the banner, then these very log entries — which is the fourth and fifth time this
session a check caught text describing the thing it bans. The second lesson is the sharper one:
the exemption was scoped to the matching *line*, and prose wraps. A line is not a thought. It
looks at a window now, which costs nothing — a genuine imperative step does not have the word
"forbidden" three lines away.

### Searching in Urdu on the Urdu site returned zero results

`داتا`, `لاہور`, `مندر`, `گوردوارہ` — all zero. A reader in an entirely Urdu interface, with an
Urdu placeholder in the box, had to type English to find anything.

Two sources for one fact, one empty. The page displays Urdu names from the dictionary (169/169
covered); the index took `urduName` from a **sheet column that does not exist** — the sheet has
no Urdu column at all — so the boosted field indexed `''` 169 times.

Everything around it was right, which is what hid it: the worker folds Arabic letter variants,
strips harakat, boosts urduName to 4, and its unit tests assert `داتا دربار` matches. **Those
tests build their own index from hand-written docs**, so they passed while production indexed
nothing. A unit test that supplies its own fixture proves the algorithm and says nothing about
the data reaching it — worth auditing anywhere else an index is tested that way.

Now indexed in both scripts from the dictionary, always (a reader in Urdu may type a Latin name
from a citation). Urdu article prose deliberately excluded — it is the 1 MB lazy chunk.
`e2e/search-bilingual.spec.ts` runs the real index over the real dataset through the real UI in
both languages, mutation-tested by blanking the Urdu fields.

### A dated CSV restore point — `npm run data:restore-point`

`data/snapshot_<date>[_<label>].csv`: every row, every column, Description newlines intact.
Written because the sheet is production and keeps no history, so the state before an import has
to be recoverable from a commit. `.gitignore` needed `!data/snapshot_*.csv` — without it the
file would have been written, reported, and quietly untracked. Verified by 7,436 field
comparisons against the source: zero differing, all 168 newline-bearing Descriptions preserved.
`snapshotFidelity.test.ts` keeps the newest snapshot honest.

The date is the data's `generated` stamp, not the run date. See `data/SNAPSHOTS.md` for what it
is, what it is not, and the import settings.

**Its own first invariant was wrong** and fired on Sant Baba Asudaram Darbar — a well-formed
single paragraph that has no newline because it is the one entry with no bibliography. TSV
flattening is a population-level collapse, not one row; the check is a ≥90% share now (99.4%
today) and reports individuals. RULE 4's own worked example, in my code, within the hour.

### Four bugs in the gallery lightbox, behind one click no test performed

Every sweep in this suite — accessible names, axe, no-leak — scans the page *as loaded*. A modal
that exists only after a click is invisible to all of them. Same blind spot as `UpdateToast`, and
now the second time it has hidden real defects. **Anything gated on a click, hover,
service-worker event or geolocation grant is unexamined.**

- **Arrowing past the end destroyed the lightbox in Urdu.** The RTL step was flipped, the clamp
  was not, so `items[idx]` went out of range and the render threw. Two copies of the arithmetic;
  one clamped `step()` now.
- **Nothing trapped focus**, under a comment saying "Focus trap" — it described focus management.
  Eight Tabs escaped to a `.related-card` behind `aria-modal="true"`.
- **The restore did nothing either**: `closeRef.current?.focus()` ran *before*
  `const prev = document.activeElement`, so `prev` was the dialog's own close button and focus
  fell to `<body>`. Two correct statements in the wrong order look like working code.
- **The image `alt` was English** on the Urdu site; it is `photoOf` now.

`e2e/lightbox.spec.ts` covers all of it in both languages. The focus-restore test found the
third bug — the first three by reading, the fourth by the test written for them.

### The gated-surface audit came back clean

Having found four bugs behind one click, I ran the same scan after each interaction that reveals
new UI: guided-tours toggle, basemap picker, facet panel (+1251 elements, +12,611 chars),
scroll-to-foot, Share. All five clean in Urdu. That bounds the "audit for others" worry — the
lightbox was the outlier, not the pattern.

Two harness lessons on the way: the first run reported everything broken because **the preview
server had died and I had not checked** (a sweep with a dead harness reports silence as
success), and the second reported Share as dead because the probe had no clipboard permission —
with it granted, the toast shows, localised, and the copied URL preserves `?lang=ur`.

### `npm run verify:pages` — the production base path, checked

Boots the real artifact at `/Sufi-Shrines/` behind a server that behaves like GitHub Pages
(files under the prefix, 404.html with a 404 status) and asserts every route renders, no page
errors, no failed subrequests, every in-app href carries the base, and a client-side navigation
lands inside it. **12/12 clean.** Wired into `deploy-pages.yml` as the last gate before publish;
mutation-tested by turning one `<Link>` back into an `<a href>`.

It exists because nothing else can see base-path bugs — every other job builds with the base at
`/`. And **`vite preview` cannot serve a subpath build**: it computes `base` only for
`command === 'build'`, so subpath asset requests fall through to its HTML fallback, where `curl`
sees 200 and the browser sees 404. Hence a hand-written static server: for a check about how
files are served, the serving has to be under test.

### Places as entities — Track B shipped

`/place/:slug` and `/ur/place/:slug`: **29 pages** for every place holding two or more sites,
from a closed **66-entry** vocabulary. Indexed from `/coverage`, a pill row on every shrine
masthead, prerendered in both languages, in the sitemap, in the axe / no-leak /
accessible-names / skip-link sweeps, and covered by `e2e/places.spec.ts` (6 tests, the journey
in both languages).

Lahore holds **35 sites and five of the six traditions** — a fact no view in the archive stated
before. **One site is unplaced**, and its survey states no city, district, tehsil or province
anywhere; `/coverage` says so rather than hiding it.

Five of the vocabulary's entries came from reading the *unplaced* list afterwards: Quetta,
Hyderabad, Kasur and Sharda were missing outright, and Girhor Sharif was unplaced because the
sheet spells its district "Umarkot" against a pattern that only accepted "Umerkot". Six of the
seven gaps were the vocabulary's fault, not the data's — worth knowing before trusting the next
"the data doesn't say".

The shape was forced by the data: there is no District, City, Province or Region column, and
across the snapshot the last segment of `Location` is "Pakistan" for 124 rows and a province for
35. So the vocabulary is matched anywhere in the string. A site can be in two places, and the
date span reads bare Gregorian years only — every Hijri and hedged date is skipped rather than
flattened (RULE 2).

Three checks came out of it, two of them from my own mistakes: `classNamesStyled.test.ts` (a
`className` that exists in no stylesheet — I wrote two such pages an hour apart, and it then
found a real one on `/saint/:slug`), `placesVocabSync.test.ts` (the vocabulary and the sheet
column read the same on both sides), and a `place/lahore` + `ur/place/lahore` spot-check in the
prerender gate. The prerenderer also stopped writing Western digits into Urdu meta descriptions:
`(وفات 1072)` → `(وفات ۱۰۷۲)`, for places, saints and orders.

### The Urdu dictionary is no longer on every route — 74 KB off each one

Track B's 282 place tokens took the seed to 960 entries and 80 KB, and `urduFallback` imported it
statically, so it rode on all eleven routes. That was the second budget raise in two days for the
same cause, and recording a debt twice is where recording stops being the answer.

Now loaded on demand and gated on language, like `urdu-content.json`. `index.html`: **322 KB →
248 KB** of eager JavaScript. Map route: **611 → 537**. Every budget in
`check-bundle-budget.mjs` came down.

The synchronous-render problem — `translateToUrdu` is called during render, so a late dictionary
flashes English — is handled by requesting it at module scope in `main.tsx` before React's first
pass, a `dictVersion` in the language context, `useShrineData` awaiting it, and `useSearch`
rebuilding the index when it lands.

**It broke Urdu search in the English interface, and the existing suite caught it.** The worker
indexes both scripts on purpose; that was free only while the dictionary was eager. `useSearch`
now fetches it the moment a query contains Urdu letters. An English reader who never types Urdu
ships none of it.

**The service worker was cancelling the gate anyway.** The PWA precache globbed every emitted
`.js`, so both language payloads (1 MB of articles, 77 KB of dictionary) were fetched in the
background for every visitor on first load — invisible to the budget check and to Lighthouse,
because it happens after first paint. Excluded via `globIgnores` and cached on first real use by a
runtime rule instead: precache **4980 KiB → 3865 KiB**.

### Suite state

(Updated after Track B: **570 tests, 64 files, green**, and the Playwright suite is 142 passed /
5 failed with the same five environmental failures.)

`npm run verify`: 537 tests, green. Full Playwright run: **121 passed, 5 failed** — and those
five are the environmental failures of §9.53, verified by rebuilding `40d9fe1` (the commit this
session started from) and watching them fail identically. A reload of `/` takes 12.6 s here
because every external subresource times out through the agent proxy. The mobile-sheet failure
that appeared alongside them is fixed.

### Translate next

The **graph's 253** are mostly personal names, and some are not names at all but phrases from a
source quote ("the princess Jahanara", "founder of the Rashidi order") — inventing Urdu for
those would break RULE 2, so they need a human reading the sources, not a dictionary pass. The
almanac's remaining tail is 157 single-occurrence segments, several of them a sentence long.

### Needs a human

- The ~20 new Urdu accessible-name strings and the five map-control strings are drafts, same
  standing as the dictionary additions.
- The five map-control strings and the seven basemap descriptors are drafts too. The provider
  names in the picker (CARTO, Esri, MapTiler) stay Latin on purpose, on the same footing as a
  bibliography entry — a reader chasing an attribution needs the exact string.

---

## 0. Session log — 21 August 2026 (eleventh: shared ground, and a dictionary measuring the wrong archive)

### Planned first

`docs/planning/SHARED_GROUND_VISION.md` — a blue-sky vision for the next phase, every number in
it measured rather than estimated. Its argument: this archive documents six traditions and shows
each site as an island, while its own coordinates say **62 of 169 sites stand within 800 m of
another, and in eight places the neighbour belongs to a different tradition.** For much of
Punjab and Sindh that adjacency *is* the heritage — these communities built on the same streets.
Four tracks (shared ground · places as entities · chronology · the gaps as a page), sequenced.

### Then built — Track A

`src/lib/data/sharedGround.ts` and a **Shared ground** section on every shrine page, under the
map. Data Darbar's reads: *"5 other sites within walking distance, 3 of them in another
tradition"* — Gurdwara Chowmala Sahib at 222 m, Peer Makki at 576 m, Gurdwara Baoli Sahib at
692 m, Qutbuddin Aibak's tomb at 727 m.

**The near-miss worth recording.** The obvious model was a cluster: single-link everything
within 800 m, call each component a complex. Measured, that gave one cluster of 15 sites with an
extent of **3358 m** — transitive closure had strung together central Lahore and called it a
courtyard. The shipped unit is "within 800 m of *this* site", no chaining.

**And the editorial rule it forced.** Four coordinate groups in the data are identical, and every
one is a documented approximation. `NearbyShrines` rendered them as "< 1 km" — the same string it
used for 900 m. Both components now say **"same recorded location"** for a shared pin and show
metres otherwise: a distance the archive did not measure must never be displayed as one it did.

### And a dictionary measuring the wrong archive

`urdu-i18n/_shrine_rows.json` held **143 rows while the app shipped 169**, so the build printed
"OK — 100% coverage, zero Latin-script leaks" and `data:validate` passed while 27 shrine names,
17 saint strings, 30 founding phrases and 23 rows of place tokens had no Urdu at all. The README
documented the refresh step — as a note.

All four gaps are filled (**shrine names 169/169**), snapshot drift is now a build **error** that
names the differing rows, and `NAME_LIST` — 143 Urdu names matched to rows *by index*, so a
re-sorted sheet would have renamed every shrine — is a keyed dict.

This was the fourth instance of one pattern in a single session: a check that passes because it
is measuring the wrong universe. **When a check reports success, ask what set it ran over.**

**Needs a human:** the ~97 new dictionary entries are unreviewed drafts. The founding-date ones
matter most — several are hedges ("1024 AH (as given in the form; not a construction date)")
translated with the hedge intact, and a fluent reader should confirm the hedge survived. The
Sindhi and Balochi place names have competing spellings.

**Debt this created, logged in the vision doc:** the seed grew 49 KB → 67 KB and
`urduFallback` imports it eagerly, so bundle budgets rose ~22 KB on every route. The real fix is
to language-gate the seed as `urdu-content.json` already is — worth ~67 KB off every route —
but `translateToUrdu` is synchronous during render, so it needs the same care the article
payload got.

---

## 0. Session log — 20 August 2026 (tenth: a chip three times wider than its sidebar)

Following the region-filter finding, I checked the other facet built the same way. The **saint
filter is 147 chips**, and eleven of its values are qualified names — the longest 150 characters.
With `white-space: nowrap` and `flex-shrink: 0`, that produced a pill **1163px wide inside a
380px sidebar**; the row's `scrollWidth` was 1179 against a `clientWidth` of 379.

Clamped with `max-width` + ellipsis, full value in `title` — the same treatment the almanac's
Location column already gets, and for the same reason: the value is the join key and the
qualification is real content, so neither may be shortened at the source.

**The instructive part was the test, not the CSS.** My first guard clicked a list of plausible
disclosure selectors and swallowed the failures. None of them matched (the control is
`.more-filters-toggle`), so the saint facet never entered the DOM, the spec measured seven
category chips, and it **passed with the clamp deleted**. I only caught it because I check that a
new guard fails before trusting it.

`e2e/filter-layout.spec.ts` now asserts >100 chips are present before measuring. **A test that
can silently skip the thing it checks is worse than no test: it reports a safety it never
established.** Any spec that reveals UI behind a disclosure needs an assertion that the
disclosure opened — not a best-effort click.

---

## 0. Session log — 20 August 2026 (ninth: the region filter was offering prose)

**The map's region filter had six chips that were sentence fragments** — one of them reading
"not the shrine's exact position) — ask Saifullah for a precise pin when possible." An internal
note to a colleague was a filter option on the live site.

`extractRegion` took the last comma-separated segment of Location. Six rows carry a *paragraph*
there instead of an address, because a field survey that can only place a shrine as "Lahore"
says so at length — the honesty RULE 2 asks for, and not something to edit. Their commas are
sentence commas, so the last segment was the tail of a sentence.

The same rule was breaking the filter for the other 124 rows too: their Location ends
"…, Pakistan", so a filter meant to narrow by region had one option matching **73% of the
archive**. Measured before and after:

| | before | after |
|---|---|---|
| Punjab | 30 | **87** |
| Sindh | 6 | **43** |
| Khyber Pakhtunkhwa | 1 | **15** |
| Balochistan | 1 | **10** |
| Islamabad Capital Territory | 2 | **4** |
| Pakistan (country only) | **124** | 5 |
| unknown | 0 | 5 |
| junk chips | **6** | **0** |

The rule now scans from the end for a known Pakistani administrative unit, prefers a province
over the country, and matches at the *head* of a segment — which recovers one province out of
prose ("…, Punjab. The field survey places the shrine…"). Rows naming no unit return empty:
unknown, not guessed.

Guarded two ways: unit cases for the rule, and one invariant that runs `buildShrines` over the
whole shipped snapshot and asserts every derived region is in a closed list of place names.
Only the second would have caught the original — proved by reinstating the old rule and watching
8 tests fail.

**Worth carrying forward:** a derived field inherits every irregularity of its source. The prose
Locations were already documented as correct; nobody had asked what a comma-splitting rule would
do to them. Any future derivation off Location, Description or Events needs that question asked.

---

## 0. Session log — 20 August 2026 (eighth: the almanac and the lineage now point at each other)

**A figure's page now says when their ʿurs falls.** The almanac already linked each observance
to the figure it commemorates; this is the other direction, and it is the one a reader arriving
from a lineage view actually wants — *when do people gather for this saint?* Built from only
that figure's own shrines through the same `buildAlmanac` the almanac page uses, so there is no
second implementation of Hijri projection to drift.

Verified in a browser across three figures: Abul Faiz Qalander Ali Suharwardi reads "Next ʿurs:
24–25 August 2026 · approximate", Shams Ali Qalandar "6 September 2026" with **no** flag
(his date is Gregorian, not projected), Data Ganj Bakhsh "22–24 July 2027 · approximate". The
flag appears exactly where the date is a forecast rather than a date, which is the distinction
`AlmanacEntry.approximate` exists to carry. In Urdu: "اگلا عرس: ۲۴–۲۵ اگست ۲۰۲۶ تخمینی".

---

## 0. Session log — 20 August 2026 (seventh: navigating the almanac, and a scroll nobody had guarded)

**The Urs Almanac listed thirteen month sections with no way to jump between them** — reaching
next spring meant scrolling past four hundred entries. There is a pill row now, one per month
with its entry count. Anchor links rather than a scripted scroller: they work without
JavaScript, they are focusable and announced as links, and the motion comes free from
`scroll-behavior` — which the browser suppresses natively for a reader who has asked it to.

Building it exposed an ambiguity worth keeping in mind for any twelve-month window: **its first
and last group share a month name.** Two pills both read "August". The year is shown only on
the names that actually repeat, so it disambiguates without cluttering the other eleven.

**And it found a real accessibility gap nobody had guarded.** `scroll-behavior: smooth` was set
globally on `<html>` and never switched off under `prefers-reduced-motion: reduce`. Scroll
animation is the *most* likely kind to trigger vestibular symptoms — a whole viewport of content
sliding past, not one small element fading — and every anchor jump on the site did it: the
article contents nav, every skip link, and now the almanac's month row. It is `auto` under
reduce, and `motion.test.ts` grew a case for it, because the `@keyframes` check structurally
cannot see this: there is no keyframe involved.

**The sidebar preview now acknowledges a selection.** Clicking a second marker used to swap the
card's content in place with no sign anything had happened. It carries the shared entrance
animation, keyed on the shrine id — without the `key` React reuses the DOM node, so the CSS
animation runs once for the first shrine and never again.

Both new guards were confirmed to fail before being trusted: the scroll one by deleting the
`scroll-behavior: auto` escape and watching the test name the file.

---

## 0. Session log — 20 August 2026 (sixth: finding a figure among 136)

**The explorer listed 136 figures under seven headings with no way to find one.** There is a
filter now, and it searches **both scripts regardless of the reader's language** — because
someone reading in English may only know a figure by their Urdu name, and vice versa. Typing
`قادری` in the *English* view returns six figures, Bulleh Shah among them, because his recorded
Urdu name is بلھے شاہ (عبداللہ شاہ قادری); typing `qadri` in the Urdu view works the same way.
The group label is in the haystack too, so `sikh guru` / `سکھ گرو` selects a whole tradition.
Terms match in any order, so a half-remembered name still lands.

Deliberately *not* MiniSearch, which the shrine list uses through a worker: 136 short strings
already in memory beat a worker round-trip and a build step. The logic lives in
`src/lib/data/figureSearch.ts` with 10 unit tests against the real graph rather than fixtures,
since the property that matters — bilingual reach — only holds if the actual dictionary
resolves the actual names.

**One test taught something.** I first asserted the English and Urdu queries return identical
sets. They do not, and should not: `سکھ گرو` also finds Bhai Biba Singh, whose recorded Urdu
name reads "بھائی بیبا سنگھ (سکھ جنگجو؛ گوردوارہ گرو گوبند سنگھ کے دور سے)" — a Sikh warrior of
Guru Gobind Singh's era. Two languages hold different text, so they pick up different incidental
matches. The assertion is now the honest one: both queries must reach every figure in the group,
not the same set exactly.

**A side effect worth naming:** the filter makes the duplicate-figure problem impossible to
miss. Type "guru" and you see *Guru Nanak*, *Guru Nanak Dev Ji* and *Guru Nanak Dev Ji;
associated with Bhai Lalo* side by side, plus *Guru Arjan Dev* beside the composite *Guru Arjan
Dev & Guru Hargobind*. That is the §0 item-3 duplicate problem, now visible to anyone who
looks rather than only to whoever reads the graph JSON.

---

## 0. Session log — 20 August 2026 (fifth: motion, and the graph that left out the lineage)

**The lineage graph left out the lineage.** `/saint/<slug>`'s network diagram plotted the
figure's order and shrines and stopped there — while the page directly below it listed
teachers and disciples the knowledge graph had known about all along. So the one picture of a
figure's place in a silsila omitted the silsila. Teachers and disciples are on the ring now,
ordered teachers → order → disciples → shrines so the edges trace outward roughly the way a
reader follows them. Ganj-e-Inayat Sarkar went from 2 nodes to 7.

Feeding it real data immediately exposed three faults that a sparse graph had hidden — the
same lesson as §9.26, that *a layout which works on sparse data is untested, not correct*:

- **A duplicated person.** `getTeachersOf` returns one link per *relation*, so a figure
  recorded as both `disciple_of` and `successor_of` the same master came back twice and the
  ring drew them at two positions. The relation list keeps both (two recorded relations are
  two facts); the diagram plots people, so it dedupes by slug.
- **A legend claiming a distinction the diagram did not make.** Teachers and the order were
  both filled `--color-primary`. The order is now a rounded square — it is an institution, not
  a person — which survives greyscale, colour-blindness and print in a way hue does not.
- **A clipped label.** `LABEL_GUTTER` was 132px; the widest label `clamp` can emit needs ~156,
  so a full-length name at 9 o'clock lost its first letter.

**And a bidi bug that only an RTL reader would ever have seen.** `text-anchor` is *logical*:
under `direction: rtl`, `start` means the right edge. The placement code reasons physically
("this label is left of its node, so extend it leftwards"), so every Urdu label extended back
across its own node and printed on top of it — the order's name sat inside the order's square.
Labels now carry an explicit direction and the anchor is flipped for Arabic script. Latin names
inside the Urdu page get `direction="ltr"` too, which fixes the truncation ellipsis rendering
on the wrong side.

**Motion.** `src/styles/motion.css` is a shared layer replacing five one-off `@keyframes`
scattered across four stylesheets, each with its own timing and its own (or missing)
reduced-motion handling. Two entrance animations: a staggered rise for lists that arrive
together (order members, figure lists, almanac cards, the graph's link list), and — the one
piece of motion here that is about meaning rather than polish — the graph's edges tracing
outward from the hub one after another. A silsila is a *chain*; drawing it says so better than
a static star does. Stagger is driven by a `--stagger-index` the component sets (CSS cannot
count siblings) and capped at 320ms so a thirty-item list does not take three seconds to
arrive.

**Two guards, because "we'll remember to check reduced motion" is exactly the kind of
intention RULE 4 exists to replace:**

- `src/styles/__tests__/motion.test.ts` reads every stylesheet and asserts each `@keyframes`
  has an escape. Writing it was instructive: the first draft flagged three existing animations
  and *all three were the check's fault*, so the three legitimate escapes are now named in it —
  timed by a `--duration-*` token (which reduce zeroes), declared inside
  `@media (prefers-reduced-motion: no-preference)`, or explicitly exempt because the motion is
  the message (one entry: a loading spinner frozen mid-turn reads as a hung page). The
  exemption list is itself asserted to stay at most one entry long.
- `e2e/motion.spec.ts` asks the browser instead of the stylesheet. A static check cannot see
  whether anything is *actually animating*; `document.getAnimations()` can. Measured: the saint
  page runs 5 animations by default and **0** under `prefers-reduced-motion: reduce`. Zero, not
  fewer — for some readers vestibular motion causes nausea and migraine, so it is a medical
  setting, not a preference.

Both guards were confirmed to fail before being trusted: the CSS one by adding a deliberately
unguarded shake keyframe, the whole scheme by measuring animation counts in both media states.

---

## 0. Session log — 20 August 2026 (fourth: the explorer in Urdu, and the graph off the shrine route)

**The Saints & Orders explorer was an English page with Urdu furniture around it.**
`/order/qadiriyya?lang=ur` rendered its own title, its description, all 23 figure names, every
shrine tag and its founding year in Latin script. `/saint/*` and `/graph` the same. The cause
is worth writing down: **the no-English-leak guard only covered the two routes it was written
for**, and the knowledge-graph routes were added later, outside it.

Almost nothing was missing — `urdu-seed.json` is keyed on the English string, so
`translateToUrdu` could always resolve these names; nobody was asking it.
`src/lib/i18n/localizeKgName.ts` now asks, from all four call sites. `/order/*` is at **zero**
leaks, guarded in `e2e/payload.spec.ts`. Three fixes fell out:

- `translateToUrdu('c. 1165')` had always missed (the `c.` stayed Latin, failing the
  function's own no-Latin check), so every order page printed `c. ۱۱۶۵`. Fixed with a circa
  rule in `buildUrduFallback` — applies everywhere, not just here.
- GraphPage was passing a whole English sentence to a name dictionary. Orders now carry
  `descriptionUr` in `data/kg-seeds.json` (5 short translations, written this session); an
  order without one shows no summary in Urdu rather than an English one.
- OrderPage's shrine tags were title-cased slugs, which can never match a dictionary keyed on
  the real name. They use the live dataset now — which fixed the English view too
  ("Shrine Of Shah Rukn E Alam" → "Shrine of Shah Rukn-e-Alam").

The floor is a **ratchet** rather than an assertion
(`src/lib/i18n/__tests__/kgNameCoverage.test.ts`): coverage may rise, and a drop fails.

**Then most of the remaining gap turned out not to be a gap.** 51 of the 69 uncovered figures
were the same name written differently on the two sides — "Hazrat Data Ganj Bakhsh (Ali
Hujwiri)" vs "Data Ganj Bakhsh", "Shrine Of Shah Rukn E Alam" vs "Shrine of Shah
Rukn-e-Alam". `translateNameToUrdu` matches on a normalized key (parentheticals and quotes
dropped, dashes flattened, leading honorifics stripped) after exact matching fails, and tries
a record's `altNames` too. Figures **67 → 118 of 136**; shrine labels **92 → 102 of 169**.

Matching is exact-after-normalization and never by prefix, because "Khwaja Muhammad Qasim" and
"Khwaja Muhammad Qasim Sadiq" are a master and his pupil; `translateToUrdu` itself is
untouched, because normalized matching on a status or a date phrase would equate "Active" with
"Active c. 6th–12th c."; and a collision test fails the build if two figures ever resolve to
one Urdu name. That test immediately found one real duplicate in the graph —
`valmiki` / `bhagwan-valmik`, one figure entered twice — which is allowlisted with a comment
rather than tolerated silently.

**Order pages now show what the graph actually knows.** Each member carries its branch (شاخ)
when a source names one, an `unreviewed` chip when the edge has not been read by a human, and
links to the *other* silsilas the same figure holds — 20 of 64 memberships are second or third
affiliations. Two design calls, both driven by looking at the data first:

- **No branch grouping.** Only 13 of 64 memberships name a branch; on Qadiriyya that would be
  four headings of one member each beside nineteen with none.
- **`asRecorded` is not shown here.** It is the row's `silsila` cell, not a per-edge string, so
  a figure recorded "Suhrawardi" whose prose also places them in the Qadiriyya carries it on
  *both* edges — printing it under Qadiriyya would attribute the source's words to the wrong
  order.

**ShrinePage was importing the whole 426 KB knowledge graph for one link.** It took exactly
one fact from it — the slug of the shrine's named figure. `data/kg-shrine-figures.json` (11 KB)
carries that edge type alone; `src/lib/__tests__/kgShrineFigures.test.ts` compares it against
the graph for every shrine so it cannot drift. `/shrine/<slug>`: 774 → 475 KB eager, and
2667 → 1379 KB of total JS with the Urdu-payload fix.

**The Urs Almanac now links into the lineage views.** An ʿurs is a death anniversary, so the
figure it commemorates is the point of the entry — but the almanac only ever linked the shrine.
Each card now carries "Commemorating / یادگار: <figure>" linking to that figure's entity page,
so a reader can go from "whose ʿurs is this week" straight to their silsila, teachers and
disciples. The name comes from the sheet in the reader's own language; only the link target
comes from the graph, through the 11 KB shrine → figure index rather than the whole graph, so
the almanac route grows by kilobytes rather than by 317 of them.

**Then the last 18 were written, and figure coverage is 136/136.** They were genuinely absent
from the dictionary rather than spelled differently, so they went into `SAINTS` in
`urdu-i18n/build_dictionary.py`. Most are Pakistani names whose native script *is*
Perso-Arabic, so writing them there restores the original spelling rather than translating it;
three carry a descriptive clause, which is translated. **The gate for figures is now a hard
assertion, not a floor** — add a shrine whose principal figure has no Urdu name and
`kgNameCoverage.test.ts` fails and tells you where to put it. That is the point of it.

**A trap, now fixed in `urdu-i18n/README.md`.** The README said `urdu-dictionary.json` was the
source of truth and to "Edit here". It is not: `build_dictionary.py` holds the real
dictionaries and rewrites that JSON from them on every run. I added 18 entries to the JSON,
ran the build, and watched them vanish with no error. Also worth knowing: `npm run
data:build:urdu` writes `urdu-i18n/shrine-translations.seed.json` but does **not** sync it to
`src/data/urdu-seed.json` — only `npm run urdu:build` does, so a dictionary change made with
the shorter command never reaches the app.

**Needs a human:**

1. The **18 new figure names are unreviewed drafts**. Confidence is high for the Punjabi/Urdu
   Muslim names and lower for the Sindhi Hindu ones — "Sant Baba Asudaram" and "Satguru Swami
   Sai Satramdas Sahib" both have more than one current spelling. They are flagged in a
   comment beside them in `build_dictionary.py`.
2. The **five order descriptions** I translated are machine-quality drafts by the project's own
   standard and want a fluent reader.
3. `valmiki` and `bhagwan-valmik` are **one figure entered twice** in the graph — the first
   duplicate the new collision test caught. There are others it did not (three Guru Nanak
   nodes, a composite "Guru Arjan Dev & Guru Hargobind"), still awaiting the merge rules noted
   in the previous session log.
4. **67 of 169 shrine *slug labels* still have no Urdu name.** Much lower priority than it
   sounds: OrderPage and SaintPage take shrine names from the live dataset, so
   `localizeShrineSlug` only fires for a shrine the graph knows and the sheet has dropped. Its
   floor stays at 102 rather than becoming an assertion for that reason.

---

## 0. Session log — 20 August 2026 (third: the English critical path)

**Every visitor was downloading the entire Urdu edition of the archive.**
`src/data/urdu-content.json` — 1.0 MB, complete Urdu Descriptions for 168 shrines — was a
static import in `src/lib/data/urduContentOverride.ts`, so it shared the eager chunk with
`useShrineData`. An English-only reader parsed all of it before the first map tile appeared.
Measured against `vite preview` with Playwright:

| route | eager JS before | after | change |
|---|---|---|---|
| `/` (map) | 3506 KB | 2517 KB | −989 KB (−28%) |
| `/shrine/data-darbar` | 2667 KB | 1678 KB | −989 KB (−37%) |
| `/saint/data-ganj-bakhsh` | 2520 KB | 1532 KB | −988 KB (−39%) |
| `/almanac` | 2214 KB | 1226 KB | −988 KB (−45%) |

Now language-gated: `loadUrduContent()` fetches once on demand, `LanguageProvider` asks for
it whenever the language is Urdu, and `useShrineData` re-merges the rows already on screen
when it lands (from the remembered raw rows — no second sheet fetch), so switching language
mid-session still fills the Urdu article body. Verified in a real browser: English never
requests the chunk; `?lang=ur` requests it and renders the prose; the toggle does both.

**Two invariants, because this class of bug is silent by construction** — nothing was broken,
no test failed, the payload was just always there:

- `scripts/check-bundle-budget.mjs` (wired into `npm run build`) walks the real static import
  graph from Vite's manifest and fails the build when a route's eager JS passes a budget set
  at the measured figure plus ~8%. It also names `urdu-content-*` and `shrines-fallback-*` as
  chunks that must never re-enter a static graph. Proved by reverting the static import and
  watching it fail on all eight routes.
- `e2e/payload.spec.ts` guards the behaviour a size budget cannot see (English never fetches
  it; Urdu does, on load and on toggle).

Also: `src/hooks/useShrineData.ts` held two literal NUL bytes as separators in a template
literal, so `file` called it `data` and `grep -rn` refused to print its lines. Now `\0`
escapes. Anyone who ever grepped for a symbol in the hot data path and found nothing was
looking at this.

**Nothing here needs a human.** The one judgement call worth knowing about: the service
worker's precache glob still includes the Urdu chunk, so a first-time visitor's *total*
bytes are unchanged — only the critical path shrank. That matches how `shrines-fallback` is
already treated (precached so offline works) and was left alone deliberately rather than
traded for offline Urdu.

---

## 0. Session log — 20 August 2026 (second half: mobile, citations, knowledge graph)

**The reported bug: the sidebar was unreachable on a phone in portrait.** It was never
missing — it was painted over. Leaflet numbers its internals in the hundreds while this
app's z-index scale tops out at 60, and `.map-container` was `position: relative` with
`z-index: auto`, which does *not* create a stacking context. So the tile pane and the
markers drew on top of the fixed bottom sheet. `isolation: isolate` fixes it;
`e2e/mobile-sheet.spec.ts` guards it with `elementFromPoint` (a visibility assertion could
never have caught it — the element was visible and correctly sized the whole time). Two
things surfaced alongside: Leaflet's zoom control was clipped by the sheet and the
attribution was hidden behind it, which is a licence-terms problem; and the blank white
square in the map corner was Leaflet's layer switcher, whose sprite an existing rule
suppressed without putting anything in its place.

**Decision taken: Latin citations are allowed; Urdu prose is not.** Resolves HANDOVER
§9.14. Both gates now split at the first bibliography heading. `urdu_content_qa.py`'s
length ratio moved to prose-only for the same reason — an Urdu bibliography's length says
nothing about article coverage, and the old full-text ratio could have blocked a build for
*adding* a source. **Follow-up available:** the ~25 bibliographies written earlier that day
render their English titles in Urdu script; they can now carry the originals, which
restores the exact search string. Not broken, just improvable.

**The lineage / order / almanac features were unfed, not underbuilt.** 130 figures, 6
lineage edges, 20 order memberships — and the graph held ZERO dates while the sheet has
`figure_born` for 66 rows and `figure_died` for 71, and no `figure_type` while the sheet
has it for 168. Three extraction agents over the archive's own English produced 235
quote-carrying proposals. The graph now holds **86 lineage edges**, **64 order
memberships** (13 with a named branch), **69 born / 75 died**, 93 figures with honorifics
and 11 with a recorded date dispute. `data/kg.json` had also gone stale against the
dataset — events 95 -> 168, which the Urs Almanac reads, so it had been showing barely half
of them.

**The explorer was calling Durga a saint.** 130 names under a heading reading "All saints",
including Kali, Krishna, Guru Nanak and "Jain Tirthankaras". Now grouped by the dataset's
own `figure_type`. Two rows answer that column with a sentence — one of them specifically
to say the figure is *not* a Sufi pir — so those show as recorded under "Recorded
differently" rather than being filed under a category they deny.

**Verification, not trust.** `scripts/data/verify-kg-proposals.mjs` re-checks all 235
against the sources they name and is wired into `data:validate`. Its sharpest rule came
from one of the agents: every 3-4 digit year must occur *literally* in the quoted source,
because a verbatim quote proves the sentence exists, not that the year beside it is the one
in it. That plus a subject-mismatch rule caught two real defects the agents' own reports
had not flagged as errors.

### Needs a human — in priority order

1. **Read the Urdu prose.** Unchanged and still the biggest item: 53 articles, all
   `reviewed=false`.
2. **80 of the 86 lineage edges and 44 of the 64 order memberships are unreviewed.** They
   are quote-verified and labelled `unreviewed` in the UI with the sentence shown inline,
   so nothing is passing itself off as checked. But a reader who knows these silsilas
   would confirm or kill them fast, and the quote is right there.
3. **Four hand-curated order memberships that the dataset contradicts** —
   `daud-bandagi-kirmani`, `waris-shah`, `shams-ali-qalandar`, `qalandar-baba-auliya` — and
   **four more no source verifies at all** (`rahman-baba`, `sachal-sarmast`,
   `sufi-shah-inayat-shaheed`, `makhdoom-burhan-ud-din`). Untouched on purpose: overwriting
   reviewed data with an extraction is the wrong direction of trust.
   See `data/kg-order-proposals.json#disagreesWithExistingSeed`.
4. **Six `subjectMismatch` rows** where the prose is partly about someone other than the
   recorded figure — the `allo-mahar` pattern, found five more times. `eidgah-sharif` is
   the sharpest: two precise birth dates, neither the principal figure's.
   See `data/kg-saint-dates-proposals.json#subjectMismatch`.
5. **31 rows where the structured date column hardened a hedge the prose never made** —
   Data Ganj Bakhsh's column says `1072` where the prose says "between about 1072 and 1077
   CE (465–469 AH)". The sheet is authoritative so nothing was changed, but the columns are
   currently *less* honest than the prose they came from.
6. **Duplicate figures fragmenting the graph.** Three separate Guru Nanak nodes, a
   composite "Guru Arjan Dev & Guru Hargobind" node, duplicate Kali / Valmiki / Jhulelal.
   And a trap: `khwaja-muhammad-qasim` (Zinda Pir, 1912–1999) and
   `khwaja-muhammad-qasim-sadiq` (Mohra Sharif, b. c. 1846) are **different men in a
   master–pupil relation** — a name-based merge would collapse that edge. Likewise
   "Sarwari" names two branches under two different parents.

---

## 0. Session log — 20 August 2026

**The headline is not the backlog, it is a retraction that never crossed languages.**
`allo-mahar`'s English was cut back to an "awaiting a field visit" stub because its prose was
a confident biography of the wrong man (`docs/allo_mahar_resolution.md`). The Urdu still
carried the withdrawn 700 words — dates, offices, an urs date, none of it sourced — and had
done since the retraction, because `mergeUrduContent()` overrides the whole Urdu Description
per slug and nothing compares the two languages. Fixed, and now gated. Full account in
`docs/HANDOVER.md` §9.11–§9.17.

**Done and committed:**

- **A8 step 2 is COMPLETE. The Urdu delta backlog is zero.** 53 articles written or
  corrected: `allo-mahar` plus every one of the 74 deltas. Backlog **74 -> 0** entries,
  **61,635 -> 0** added English chars; all 167 rows with an Urdu article now match the
  English they were translated from. `pipeline/urdu_content_qa.py` reports **0 errors, 0
  warnings** across 168 files. What remains of A8 is step 3 — the 2 full translations,
  still blocked on `docs/EDITORIAL_DECISIONS_PENDING.md`.

  **Four of those 53 were corrections, not gaps** — entries whose Urdu asserted the
  *reverse* of its English: `allo-mahar` (a retracted biography of the wrong man, still
  live in Urdu), `ziarat-kaka-sahib` (named a contemporary as the saint's teacher, which
  the English explicitly denies), `shrine-of-pir-baba-syed-ali-tirmizi` (called the 2008
  attack on the shrine foiled, where the English says it destroyed the inscriptions), and
  `kalat-kali-temple` (opened with a distance the English never claims). Three proper nouns
  were also mistranslated, one file each. Full account, and the conventions the work
  settled, in `docs/planning/A8_URDU_DELTA_SCOPE.md`.

- **THE NEXT ACTION ON THE URDU TRACK IS A HUMAN READING IT.** Every entry in
  `urdu-i18n/TRANSLATION_LOG.md` is `reviewed=false`. 53 articles were drafted or edited in
  one day by a machine and none has been read by a native reader. Under RULE 2 this is all
  drafts, and it is now the largest body of unreviewed prose the project has ever held.
  More translation is *not* the highest-value next step; review is.
- **New gate: `pipeline/urdu_content_qa.py`**, wired into `npm run data:validate` (so `verify`
  covers it). Latin leaks, asterisk balance, section-count sanity, and the Urdu/English length
  ratio. Over-coverage >1.15x is an ERROR — it is exactly the allo-mahar signature, and
  reverting that file makes the gate fail at 2.46x. Under-coverage <0.70x warns against a
  ratchet, now at 41, that may only be lowered.
- **`a8_urdu_delta.py --mark <slug>`** — records the English an article was translated from.
  Doing this by hand is what once made five finished translations grow the backlog 74 -> 79.
- **Two build scripts that could not run in a fresh clone**, both reading the gitignored
  `data/shrines_final_import_2026-08-16.csv`. `npm run urdu:build` crashed at step 4 of 4,
  after steps 1-3 had written their output. Both now fall back to tracked `data/shrines.csv`.
- **An orphan check that accused a healthy row.** Against the 169-row built snapshot,
  `update_log.py` flagged `darbar-hazrat-shah-gohar-peer` — a real live row, dropped from the
  snapshot for empty coordinates. Orphan detection now only fails when the universe is
  complete, and `a8-scope.json` carries `partial: true`.
- **`shrine-of-peer-makki` said "Diwan Ganj Bakhsh"** where the other 14 files say "Data".

**Needs a human decision — CLAUDE.md contradicts a gate.** i18n rule 6 permits URLs in the
Urdu view; `scripts/data/validate-urdu-leak.mjs` forbids every Latin letter in
`urdu-content.json`. A citation that is a URL therefore cannot be carried in an Urdu
bibliography. Hit on `tomb-of-qutbuddin-aibak`; worked around by naming the source and
pointing at the English entry. Either exempt URLs in the gate or write the prohibition down.
**Do not let the next session work around it a third way.**

**Note on scope regeneration.** `docs.google.com` is unreachable from this environment's
network policy, so the live sheet could not be fetched and everything above was computed
against `data/shrines.csv`. It reproduced the committed 74-delta scope exactly before any
edits, so it is a faithful English source — but `a8-scope.json` now carries `partial: true`
and **someone with sheet access should rerun `python3 pipeline/a8_urdu_delta.py` to clear it.**

**Still outstanding from earlier sessions, unchanged by this one:** the 4-row
`data/patch_schema_and_truncation.csv` import, `data/provenance.json` stale at 163 rows, and
coordinates for the two rows the site never receives.

---

## 0. Session log — 18 August 2026

**Done and committed:**

- **Import verified** (`1c69e7e`..`3619e30` range). Note for anyone who fetches the CSV
  right after an import: Google's publish-to-web endpoint serves **both** the old and new
  version for a while. Nine consecutive fetches returned 171 rows eight times and 167 once.
  It settles on its own — do not re-import on the strength of one stale fetch.
- **`~/shrines` rescued** (`b64b0aa`). A SHA-256 sweep found **11 files with no
  byte-identical copy anywhere in the repo**; all 11 are now in `pipeline/`. Everything else
  there is already safe, verified rather than assumed — including all 104 media files, which
  are already in `media-source/photos` (152 files, a strict superset). HANDOVER risk #1 is
  substantially reduced. Details in `pipeline/legacy-exports/README.md`.
- **Housekeeping** (`b64b0aa`). Stray root `shrines` file deleted (cmp-verified duplicate);
  `validation_issues.tsv` gitignored.
- **Three decision briefs written** (`5569482`) — see §3, §6, §7 below.
- **A8 scope measured** (`3619e30`) — `pipeline/a8_urdu_delta.py` +
  `urdu-i18n/a8-scope.json` + `docs/planning/A8_URDU_DELTA_SCOPE.md`.

---

## 0b. Session log — 18 August 2026, second session

**A8 step 1 is done: the 5 no-editorial-question Urdu translations are written.**
`darbar-hazrat-tahir-bandagi-qadri`, `darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami`,
`darbar-wasif-ali-wasif`, `darbar-ghazi-ilm-din-shaheed`, `darbar-hazrat-shah-gohar-peer`.
Heading structure checked 1:1 against each English original (9/7/8/9/6 headings, all match),
zero Latin leaks, `data:validate` + `verify` green (259 tests). All are **`reviewed=false`** —
**a human still has to read the Urdu prose before this counts as done** (RULE 2). Scope is now
3 full / 74 delta / 94 no-action.

**Next on A8: step 2, the 74 deltas, largest first** — `urdu-i18n/a8-scope.json` is pre-sorted.
Step 3 (the last 3 full translations) stays blocked on §3's editorial decisions.

**Found and fixed while doing it** (full detail in `docs/HANDOVER.md` §9):

- The Urdu progress log claimed **100% coverage while 8 rows had no Urdu** — it counted against
  a 12 July snapshot. Now counts live rows, and fails loudly on orphaned content files.
- `a8_urdu_delta.py` **counted finished translations as unfinished**, so completing five made
  the remaining work appear to grow. Fixed by recording the English they were translated from.
- **A live basemap bug you reported mid-session:** the "Invalid key" tiles are *not* an origin
  restriction and were never localhost-only — MapTiler 403s **raster tiles of a custom Map
  Designer style** on this account, production included, and serves that 403 as a PNG of the
  error text. Default basemap switched to built-in `streets-v2` + `language=en` (same English
  labels the custom style existed for), plus automatic fallback to keyless CARTO after 4 tile
  errors. `CLAUDE.md`'s note on this was wrong and is corrected; measurements in
  `docs/FRONTEND_NOTES.md` §6.

**Needs you — one small sheet import.** `data/patch_schema_and_truncation.csv` (4 rows), from
`python3 pipeline/fix_wrapped_field_truncation.py`. Import per RULE 3 (replace sheet, comma,
conversion OFF). It fixes:

- **3 rows whose `category` is outside the six-value schema** (`'Islam'` ×2,
  `'Sufi shrine (Islam)'`). These are excluded from **every** category-chip selection live and
  draw with the default marker colour. Only `darbar-abul-muali-qadri` currently reaches the
  site; the other two are dropped for missing coordinates, so their bug is latent until a pin
  arrives. (Hinglaj's *empty* category is fine — the legacy `Category` fallback covers it.)
- **6 cells on `Darbar Hazrat Shah Gohar Peer` truncated mid-sentence in production** — caused
  by a hard-wrapped entry file whose bullets were converted keeping only the first line each.
  Restored by re-parsing the entry file, not retyping.

**Also outstanding, newly identified:** `data/provenance.json` is stale at 163 rows and has no
entry for any of the 8 new shrines, so `SourcesProvenance` shows them no citations at all.

**Next, in order:**

1. **A8 translation itself — not started.** Scope is measured and sequenced; step (2) of the
   task (drafting the Urdu) is the resume point. Start with the 5 full translations that carry
   no editorial questions. Read `docs/planning/A8_URDU_DELTA_SCOPE.md` first — it corrects
   three things A8's own description got wrong.
2. **Tier 1 of `entries/web-research-2026-08/ACQUISITION_LIST.md`** — 13 sources already free
   online, needing nobody. Not started this session.
3. **The three decisions** in §3, §6, §7 — each now has a brief; each needs one answer.
4. **Send the Saifullah message** — draft ready at `docs/message_to_saifullah_2026-08-16.md`.
   Explicitly excluded from the 18 August session at your request.

**Still blocked on you, unchanged:** the Urdu aesthetic pass (§4) needs a specific pain point
or a screenshot — re-checked, nothing concrete to fix without one.

---

# To-do — as of 16 August 2026 (superseded above; kept for the record)

Written at the close of the session covered in `docs/HANDOVER.md` §8b; updated through the
end of 16 August, which added a 37-entry web-research enrichment pass and merged everything
pending into one importable CSV. Grouped by who needs to act. Nothing here duplicates
HANDOVER's own outstanding lists (§8's Technical/Editorial items, §9, §10) — check those too.

---

## 1. ~~Needs you — one sheet import~~ — **DONE 18 August 2026**

**Recommended: one consolidated import**, not the seven separate patches below.
`pipeline/build_final_import.py` fetches the live sheet fresh and applies every pending patch
in the correct order (with invariant checks at each step — see the script's own docstring for
exactly what it does and why), then re-runs `pipeline/build_sources_registry.py` fresh against
the final merged content to compute `support_level`/`info_level` for all 171 rows. Run it
yourself with `python3 pipeline/build_final_import.py`; it writes
**`data/shrines_final_import_2026-08-16.csv`** (171 rows, 44 columns — gitignored like other
full-sheet CSV snapshots, so it stays local; re-run the script any time to regenerate it fresh).

Import settings per CLAUDE.md RULE 3: Replace current sheet, comma separator, "Convert text to
numbers, dates and formulas" **OFF**.

**What's in it, beyond the six patches already known about:**
- The web-research pass (§4 below, now done) is folded in as `data/patch_web_research.csv` —
  38 of the 40 targeted `Web-compiled` entries gained a citation-backed addition (37 from the
  original pass, plus Gurdwara Malji Sahib after a same-day follow-up check — see §4); the
  other 2 ("nothing reliable found") are untouched.
- `support_level`/`info_level` are **not** taken from `data/patch_provenance_badges.csv` — that
  patch was computed on 15 August, before the coordinate/content fix, the tazkira enrichment,
  and this pass all added new Bibliography citations to rows it had already scored. Applying it
  now would have **regressed** the 4 field-survey rows from their current, correct
  `info_level=Full` down to a stale `Low`. The script recomputes fresh instead — full tally:
  `Web-compiled`/`Low` 60→2, `Field-verified`/`Full` unchanged at 16 but now includes the 4
  field-survey rows correctly, `Source-documented`+`Source-seeded`/`Moderate` 153.
- One tazkira-patch row was silently dropped, not silently applied: **Darbar Abul Muali
  Qadri**'s row in `patch_tazkira_enrichment.csv` has an empty `qa_note` column with its entire
  9-item qa_note dumped into the *Description* field as a literal ```` ```qa_note ```` fenced
  code block — a formatting defect that would have rendered a giant code block into the public
  page. `patch_field_survey_coordinates.csv` already has a clean, later, more complete version
  of the same row (its own item #10 shows it had already incorporated the tazkira
  cross-reference correctly) — that version is what the final CSV uses instead. Nothing was
  lost; the tazkira patch's superseded row is simply not applied.
- `patch_shah_inayat_merge.csv` blanks its own `Category` cell. Applying that patch's non-key
  columns unconditionally would have silently wiped the existing "Muslim Shrine" value even
  though HANDOVER/TODO describe this patch as "corrects nothing, only adds." The script only
  overwrites a column when the patch's own value for it is non-empty; 21 columns did have real
  values and were applied (Description, qa_note, Images 1-10, dates, silsila, flags, etc.).
- Reused the actual raw published sheet (fetched directly, not `data/shrines.csv`) as the base,
  because the app's own build step drops any row with unparseable coordinates — exactly the 4
  field-survey rows this session's coordinate patch fixes. `data/shrines.csv` only has 163 rows
  for this reason; the real sheet already has 167, and the final CSV adds the 4 brand-new rows
  for 171.

The six individual patch files are **still in `data/`** for reference/review (each still
independently re-validates clean — `coord_missing` on `sheet_missing_column`-shaped partial
patches and on the 2 still-blank coordinate rows is expected, not a blocker), but importing
them one by one is no longer necessary if you use the consolidated CSV.

## 2. Needs you — Saifullah

- [ ] **Precise coordinates for two shrines** — the field survey gave no usable landmark for
      either, so they're left blank rather than guessed:
  - Darbar Hazrat Shah Gohar Peer — no landmark at all in the survey.
  - Darbar Mian Qurban Ali Shah — survey says "Mint Stop, Lahore," which didn't resolve to one
    confident location (a "Pakistan Mint" railway/metro stop and a separate "Akhri Mint" bus
    stop are both real, different places). Ask which he meant, or for a pin.
  - (Darbar Ghazi Ilm Din Shaheed was a third such row until 16 August; it now carries the
    approximate Miani Sahib landmark pin, sourced to a verified press account per direction —
    see §1. It joins the approximate-pin list below.)
- [ ] **Precise coordinates, lower priority** — 8 other geocoded rows use an approximate
      landmark pin (Miani Sahib Graveyard, Mochi Gate, Mozang Chungi, or Data Darbar's own
      coordinate), explicitly labelled as approximate in each row's Location field. A real pin
      from Saifullah would improve all 8 (the 8th being Ghazi Ilm Din Shaheed, added 16 Aug).
- [ ] Still outstanding from before this session (see `docs/HANDOVER.md` §5, §8): Mauj Darya
      Bukhari needs re-shooting (all 12 original media files verified 404); Data Darbar and
      Bibi Pak Daman photos are WhatsApp-compressed and need re-shooting, sent as files not
      chat images; delete the stray database backup from the shared photo folder.

## 3. Needs a human editorial call — **briefed 18 August**

> Full analysis, with a recommendation per item, is now in
> `docs/EDITORIAL_DECISIONS_PENDING.md`. Corrections to what this section says below: the
> real count is **52 entries carrying qa_notes**, not 4; only **2** explicitly ask for a
> decision (Abul Muali Qadri, Malik Ahmad Ayaz) and those same two carry the sensitive
> material; **Mian Qurban Ali Shah's 13-item note resolves every item itself and asks for
> nothing.** The original text follows.

Several new/enriched entries carry a `qa_note` or embedded `qa_note` block listing specific
contradictions in the source material — per RULE 2 these were reported, not silently resolved.
Worth a read before/while importing:

- **Darbar Abul Muali Qadri** — 9 numbered items, including sensitive content (a conversion
  claim, a "war against the Sikhs" claim, a property-origin claim about Dyal Singh College)
  that the survey states as fact but which has no independent citation. See the entry's own
  embedded `qa_note` block in `data/patch_field_survey_coordinates.csv` — the version that
  actually lands in the final CSV (§1's tazkira/coords conflict note applies to this same row).
- **Darbar Malik Ahmad Ayaz** — 14 numbered items in the same file, including cross-tradition
  vocabulary ("diyas and prasad" at a Muslim shrine — genuine syncretism or loose surveyor
  wording?) and an unresolved Hijri-vs-Gregorian date question for "8 August 1041."
- **Darbar Mian Qurban Ali Shah** — 13 numbered items, same file.
- Smaller, single-point conflicts in the tazkira enrichment batch: a location dispute for
  Akhund Panju Baba (Akbarpura, Nowshera vs. Misri Pura, Peshawar Sadar); a ~70-year death-date
  discrepancy for Mian Umar Baba/Chamkani (1119 AH per the tazkira vs. 1776 CE already on
  file); a generational-count conflict for Shah Abdul Karim Bulri's relation to Shah Abdul
  Latif Bhittai (great-grandfather vs. great-great-grandfather).

None of these need to be "fixed" — they need a decision on whether the archive's voice should
say more than "both accounts are reported here."

## 4. Needs you — scope/direction

- [ ] **Urdu-specific aesthetic pass** (item 3 from your feedback list) — not done. Checked the
      existing Urdu styling against everything built this session (Tours, map markers, infobox)
      and it holds up: correct RTL, Nastaliq, Eastern numerals, no English leaks. Nothing
      concrete to fix without a specific pain point — if something in the Urdu view actually
      looks wrong to you, a screenshot the way you gave one for Tours would let me fix the
      right thing instead of guessing.
- [x] **The ~44 remaining `Web-compiled` entries** (60 minus the 16 tazkira-enriched) — done
      16 August via a directed web-research pass (not the book corpus, which was exhausted; per
      direction, online sources only to the reliability bar in
      `entries/web-research-2026-08/README.md`). 40 targets researched: 23 STRONG, 15 PARTIAL,
      2 nothing reliable found (`entries/web-research-2026-08/SUMMARY.md`). 38 folded into
      `data/patch_web_research.csv` and the final import CSV (§1); the 2 with nothing found
      (Allo Mahar, Sant Baba Asudaram Darbar) are untouched and remain genuinely `Web-compiled`
      — real candidates for Saifullah's incoming books.
- [x] **`entries/web-research-2026-08/ACQUISITION_LIST.md`** — every book/gazetteer named in
      any of the 40 research files' own "Acquisition leads" sections, consolidated once and
      deduplicated, split into what's already free online (13 sources, several covering
      multiple entries at once — top of the list: Iqbal Qaiser's 1998 book and a 1962
      government register, between them covering most of the 10 gurdwara targets) versus what
      needs Saifullah specifically (13 more, led by Zulfiqar Ali Kalhoro's 2022 Sindh book,
      confirmed not freely available anywhere online). Two of the highest-value shared leads
      were actually chased this session, not just listed: the 1962 register turned up a real,
      distinct entry for Gurdwara Malji Sahib's Nankana Sahib site (upgraded above), and a 1919
      Sukkur District gazetteer came back a clean negative for 5 Sindh sites, with a structural
      reason for 2 of them (their talukas left Sukkur District for the new Larkana district in
      1901) that correctly redirects future effort to the Larkana gazetteer instead.
- [x] **Two peer Claude Code sessions** — resolved 16 August by asking them directly. Both are
      unrelated to this repo: `abshaar-*` works in `~/Desktop/.../Harvard/Abshaar` (the
      Bulleh Shah corpus project) and `copilot-repo-starter-*` in
      `~/Desktop/copilot-repo-starter` (Ethos Copilot app). Both confirmed they have made and
      will make no commits here, and `git log --all` + reflog show no foreign commits. Nothing
      to reconcile.

## 6. The `/ur/*` routing review gate — **briefed 18 August**

The only open `[review]` gate across Batches 1-3 of the delegated plan (commit `22bca4c`).
One decision, with the alternative laid out: `docs/REVIEW_ur_prefix_routing.md`.

## 7. Oral histories — **forcing document written 18 August**

HANDOVER risk #4. The tooling has been ready for months; the blocker is a scope decision.
Three options, a recommendation, and a pre-agreed fallback date:
`docs/DECISION_oral_histories.md`.

## 5. Smaller/deferred

- [ ] `pipeline/build_sources_registry.py`'s classify() has known cosmetic termbase gaps not
      worth blocking on this session (e.g. `Qadri`→`Qadiri` romanization inconsistently applied
      across new/enriched entries) — low priority, see individual commit messages.
- [x] Consider whether `data/patch_tazkira_enrichment.csv`'s citation additions should also
      trigger a `pipeline/build_sources_registry.py` re-run once imported, to move some of
      those 16 shrines off `Web-compiled` in `pipeline/support_levels.tsv`. Done 16 August —
      `pipeline/build_final_import.py` does exactly this (and for the coords/web-research
      patches too) as its last step; `pipeline/{support_levels,sources,shrine_sources}.tsv`
      and `sources_report.txt` are updated to the fresh computation. New tally: only 2 entries
      are `Web-compiled`/`Low` archive-wide (was 60); 16 are `Field-verified`/`Full`.
- [ ] **Confirmed, not just suspected: all 49 of the "49 uncited entries" have a literally
      newline-free Description** — checked directly against the live published sheet (not a
      stale local file). 48 of the 49 gained structure this session (38 web-research —
      including Gurdwara Malji Sahib, upgraded from nothing-found after a same-day follow-up
      check found a real 1962 register entry — plus tazkira's 15, minus the 1 excluded/
      superseded row = the coords patch's 1); only 1 remains exactly as it was (Sant Baba
      Asudaram Darbar — genuinely searched twice this session, nothing citable found either
      time; the other, Allo Mahar, already had a placeholder Bibliography line so didn't trip
      the `no_bibliography` check either way). Not a formatting artefact to "fix" — per
      CLAUDE.md's own standing finding, these are genuinely single-paragraph, uncited prose;
      the newline count just makes that mechanically verifiable now instead of a description.
- [ ] `pipeline/validate_shrines.py` flags one pre-existing, unrelated issue on the final CSV
      untouched by anything this session did: **Amb Temples (Amb Sharif)** —
      `figure_not_in_description`, "'Shiva (Mahadev)' — no distinctive token appears in the
      description." Confirmed byte-identical to the live sheet's current Description; not
      caused by any patch, just noted in passing.
- [x] **Done 18 August.** An untracked, extensionless `shrines` file sat at the repo root (653,929 bytes,
      dated 9 August). Verified byte-identical (`cmp`) to the already-committed
      `pipeline/legacy-exports/shrines_flat_export.tsv` — the 15 August session archived a copy
      rather than moving it, or iCloud restored it. Safe to `rm shrines`; nothing is lost.
      (An agent attempted the delete on 16 August; the permission layer blocked it. Deleted
      18 August after re-running `cmp` to confirm the duplicate.)
