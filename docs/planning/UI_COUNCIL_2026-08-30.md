# The UI & features council, 30 August 2026 — four lenses, twenty-four findings

A second council, convened the same day as [`UX_COUNCIL_2026-08-30.md`](UX_COUNCIL_2026-08-30.md)
and with a different brief. The first one asked *what is broken*. This one asked **what should
the archive become** — features and UI direction — and was told to propose, not only to fault-find.

Five reviewers were briefed in parallel against the running dev server, each with one lens and no
overlap:

| Lens | Returned |
| --- | --- |
| Reader journeys, discovery, mobile/field use | ✅ 7 findings |
| The scholar and the researcher | ✅ 7 findings |
| Information architecture and the shape of the site | ✅ 7 findings |
| Urdu and bilingual parity as a *product* question | ✅ 6 findings |
| **Visual craft and the design system** | ❌ **did not return** — killed by an API rate limit before it read the design docs. **This lens is unrun and the council is incomplete without it.** |

All were read-only. Each was given the same rules — measure the instrument before believing it,
never invent content, expect most of what you check to be fine — and each was **required to
publish a retraction section**. Between them they retracted **fourteen** findings.

---

## Read this part first: the numbers the council got wrong

Three of its headline figures did not survive being checked, and one of them was in the finding
that has already shipped.

- **"Citation is offered on 169 of 524 published entity URLs" — the denominator was wrong.**
  Counted from the prerendered route directories: 169 shrines + 244 saints + 29 places + 9 orders
  + 8 traditions = **459 per language**, not 524. The reviewer had **94 places**; only **29** are
  published, because a place page exists for a place that has sites in it. The finding was real
  and is fixed (`2357fd3`); its arithmetic was not.
- **"3,650 Western digits across 158 Urdu articles"** — retracted by the reviewer itself, and the
  reason is the standing lesson of this project: it was true of the data file and false on screen,
  because `localizeProseDigits` converts at render. **Reading a data file is measuring the wrong
  surface.**
- **"9 of 12 headings render in English on the Urdu Data Darbar page"** — the Urdu reviewer nearly
  filed this as missing translations. It was actually finding U‑1 below, a *state* bug: their probe
  happened to visit the English site first. Same symptom, completely different cause, opposite fix.

**Any count quoted from the dev server today is unstable.** The palette read "171 SITES" in one run
and "169 SITES" twenty minutes later — the known snapshot-vs-live-sheet drift awaiting
`data:build`, not a new defect.

---

## Already shipped from this council

| Finding | Commit |
| --- | --- |
| S‑6 · 290 of the archive's 459 entity pages could not be cited | `2357fd3` |

---

## The queue, ranked by what a reader gains

Prefixes: **J** journeys · **S** scholar · **IA** information architecture · **U** Urdu.
Every entry says whether an agent can build it under RULE 2, or whether it needs Rauf.

### 1. U‑1 · The first Urdu page after an English visit renders the English article — and keeps it

**AGENT · S** — the worst finding in the council, and the best-diagnosed.

Eleven of fifteen sampled entries rendered an **English article body** in the Urdu view after an
English visit. `data-darbar`: 12,405 Latin letters against 1,450 Arabic, where a fresh context
gives 766 against 11,139. Still English at 12 s, so it is a state and not a flash. It reproduces on
`?lang=ur` and `/ur/…` alike, and after an English *map* visit alone — which means **every shared
link, bookmark, search result and hard refresh** a reader reaches after browsing in English.

Two isolations pin it: clearing `localStorage` fixes it, and *blocking the sheet CSV also fixes
it*. So it is the background refresh. `fingerprintShrines` (`useShrineData.ts:230‑238`) hashes
name, founded and the **English** description length — its own comment says the Urdu merge leaves
it unchanged — and `adoptCsvResult` (`:259‑262`) uses that equality to keep the remembered English
dataset and discard the freshly-built Urdu-merged one.

Fix: make the fingerprint language-aware. **Every existing Urdu spec starts from a fresh context,
which is exactly why this has never been seen** — so the test must visit English first.

### 2. J‑1 · On a phone the map opens with a third of the archive off-screen

**AGENT · M.** Across five phone viewports, **54–60 of 169 pins** fall outside the visible map
rectangle (viewport minus the sidebar sheet); desktop 1280×900 is 0. It is skewed by tradition on
every size: **14 of 14 Nanakpanthi/Udasi darbars, 16 of 36 Hindu temples, 2 of 3 Jain temples**.
Not density — `MapContainer` opens at a fixed Lahore centre and zoom 6 regardless of viewport, and
portrait plus a 184–233px sheet crops Sindh and Balochistan away. The six-tradition claim is the
archive's headline and a phone reader is shown four of them.

Fit the bounds into the *unoccluded* rectangle. This does not reopen the pin-density ruling: the
resting appearance is unchanged, and no clustering is proposed.

### 3. IA‑1 · `/chronology` cannot be reached from anywhere in the site

**AGENT · S.** Across 81 rendered pages at two widths: **0 anchors, 0 buttons, 0 text mentions**.
No `Link to="/chronology"` anywhere in `src/`. The palette returns nothing for "chronology". Yet
`prerender.mjs` publishes it in the sitemap at priority 0.7 and it renders 171 shrine links. Six
e2e specs exercise it and **every one arrives by `page.goto`** — which is why it survived. A
crawler can reach the page; a reader cannot.

### 4. IA‑2 · On desktop there is no top-level navigation at all

**AGENT · M.** `.tabbar` is `display:none` at ≥641px. On `/?selected=data-darbar` at 1280 there
are **2 visible links on the whole page**, both to the selected shrine; visible links to `/graph`,
`/almanac`, `/typology`, `/shared-ground`, `/chronology` are **0, 0, 0, 0, 0**. Those five are
reachable from one component in the entire desktop app — `WelcomeCard`, which renders only when
nothing is selected. The same state on a phone keeps all five in the tab bar.

### 5. J‑2 · The front door says nothing about what is in the archive

**AGENT for the figures · PERSON for any new connective sentence.** A TreeWalker over *visible*
text on `/` finds **zero digits**. The largest element in the sidebar is an empty state. Every
figure an orientation card would need is computable from shipped data (`buildCoverage`,
`buildAlmanac`) and already rendered on `/about`, so nothing new is claimed — but it must be
computed, never typed, given the count instability noted above.

### 6. J‑3 · The map's colour code has no key on the map

**AGENT · S.** `/` renders **168 coloured marks and 0 labelled**; `/typology` 102 and 1;
`/chronology` 120 and 0. The key exists only on `/about` and `/shared-ground`. Filter chips do not
help — an active "Jain Temple" chip paints cobalt, not Jain blue. Labels exist in both languages.
Keep the text label: never colour alone.

### 7. S‑3 · The site states ODbL rights and never hands over the database

**AGENT, except one Urdu heading.** Across 13 routes, links matching `\.(csv|json|jsonld|ttl|zip)`
= **0 on every route**, `/about` included, where the word "download" appears **0 times** in 16,444
characters. Nothing copies `data/` into `dist/`. A "Get the data" section under the licence
`/about` already quotes, with each file's size and snapshot date.

### 8. U‑2 · Half the archive's *ʿurs* and observance text reaches an Urdu reader in English

**AGENT for the month substitution and the queue · PERSON for the segments.** Rendered
`/almanac?lang=ur`: **33 of 95 entries carry a Latin observance run** — `سالانہ عرس؛ Sufi music and
remembrance`. Against the data: 318 segments, **161 (51%) translate**; 62 entries render none of
theirs in Urdu. The skew matters — 22/79 for Muslim shrines against 39/85 for every other
tradition. The Hijri month names are *already held in Urdu* at `localizeRecordedDate.ts` and the
observance path never calls them; applying the archive's own table is substitution, not
composition.

### 9. J‑4 · Eight guided tours have no page, no URL, and no entry point off the map

**AGENT · M.** Fully bilingual in `tours.json`, and: no route, nothing links `?tour=`, nothing in
the tab bar or footer, nothing prerendered. On an iPhone 13 the toggle reaches the screen only
after **475px of scrolling inside the sidebar** — three deliberate actions with no cue tours exist.

### 10. S‑2 · The machine exports drop exactly the columns that make this archive different

**AGENT · M.** In `graph.ttl` and `graph.jsonld`: `support_level` **0**, `info_level` **0**,
`site_type` **0**, `year_built` **0**, `"Field-verified"` **0** — against 14 occurrences in
`data/shrines.json`. `datapackage.json` declares **11 fields for a 44-column dataset**. A
researcher cannot select by evidence in the RDF, which is the one thing this archive's data is
*for*. *(Export scripts are the other session's lane — hand it over.)*

### 11–24, in order

| # | Finding | Measured | Size |
| --- | --- | --- | --- |
| J‑5 | "Back to map" throws away the reader's filter | `?category=sikh` (33 markers) → shrine → back → 169. Browser Back is correct; the in-page link is not | S · AGENT |
| S‑5 | 456 of 464 sources leave the reader nothing to click | **8 of 464 citations contain a URL (2%)**; no DOI, no ISBN | S · AGENT |
| IA‑3 | Tab bar and breadcrumb disagree about where 37 pages live | 12 routes render a breadcrumb, **every one a single crumb**; `/place/:slug` uses a different root label and a dead "Places" crumb | M · AGENT |
| IA‑4 | Eight tradition pages, no index | `/about` links **all 29** places and **0 of 8** traditions; 18 shrine infoboxes are the only inbound anchors | S · AGENT |
| S‑4 | Coordinate uncertainty is understated to the reader | `/about` says **8**; `audit_coordinates.py` records **22** (12 at ≤2 decimals, 10 sharing a point). Two instruments, one published | M · AGENT + PERSON |
| U‑4 | Urdu search is a smaller instrument than English search | English indexes 5 fields incl. 500 chars of prose; Urdu indexes 4 and no prose. `entitySearch` does not fold ي→ی though its comment claims parity. Eastern digits match nothing | S/M · AGENT |
| U‑5 | 168 Urdu articles, 0 reviewed, and not one page says so | `reviewed.json` is `{}`; **0 of 169 Urdu pages carry a status marker**, while `/about` promises in Urdu that drafts are marked | S · AGENT + one glance |
| J‑7 | The archive's name is clipped in the header at every width but one | `.sidebar-title` 161/134 even at 1920; only 768 is unclipped | S · AGENT (CSS) |
| U‑3 | Figure pages are the least-translated route family | 41 of 41 sampled `/saint/` pages carry Latin runs, **mean 31.6 per page**; 19 of 236 `altNames` and 30 of 185 `titles` have Urdu | M · AGENT + PERSON |
| IA‑5 | Five projections of one dataset, none knows the others exist | **0 of the 20 ordered pairs** among the five non-map indexes has a visible link | M · AGENT |
| IA‑6 | Search finds six kinds of entity and zero pages | "almanac" → 0 groups; "chronology" → 0 | S · AGENT |
| IA‑7 | Only shrine pages tell a reader what to read next | 24/24 shrine pages carry a related grid; **0/20 saint, 0/9 order, 0/8 tradition, 0/10 place** | M · AGENT |
| U‑6 | Urdu category headings are sorted by their English strings | `localeCompare(a, b, lang)` applied to Latin text while the Urdu label is displayed | S · AGENT |
| J‑6 | The only alphabetical index stops at 40 of 171 | `MAX_RESULTS = 40`, honestly labelled, with no paging and no onward link | S · AGENT |

### Waiting on Rauf, not on an agent

- **S‑1 · Nothing a reader cites can be retrieved.** 0 git tags, one committed snapshot
  (2026‑08‑18), no `doi:` in `CITATION.cff`, `PUBLICATION.version` frozen at a string. The
  agent-buildable half is printing the data's vintage on every page that carries a citation; the
  DOI is an afternoon of yours.
- **The vocabulary collision on "tradition"** — it names both the six-value `category` facet and the
  eight sampradayas. Editorial.
- **The 40 English gloss sentences** in figure titles, and the untranslated observance segments.
  Composition, not substitution: a fluent speaker.

---

## The retractions — fourteen, and they are why the rest is credible

**Instrument failures, all four lenses:**

- A crawl reported 171 visible shrine links on the map's front door. `nav#shrine-directory` is
  `.sr-only` with `clip: rect(0,0,0,0)`, and the ancestor walk checked only `display` and
  `visibility`. **171 of 3,840 "visible" links were screen-reader-only.** Re-run with clip
  detection: the desktop front door has **0** visible shrine anchors, which is intentional.
- "Enter does not activate a map marker; only Space does." The probe had focused a marker *inside a
  pile*, where Enter correctly fans. On an isolated marker Enter selects.
- An observance sweep reported "32 of 32 sections fully Urdu" — the selector matched 32 of 169
  pages and the wrong container. Discarded; U‑2 rests on the almanac and infobox instead.
- A shrine-page probe found "0 `about#source-` links" and nearly filed the cross-entry source index
  as missing. It exists; it renders only for a *shared* source, and only 28 of 466 are.

**Findings that turned out to be fine, recorded so nobody re-checks them:**

- Urdu articles are **not** shorter and do **not** lose their bibliography: item counts identical on
  **169 of 169**, median rendered prose ratio ur/en **0.997**.
- UI strings: 740/740 keys in both tables, 0 missing. All 8 tours and 46 stops bilingual. 131 of 131
  reader-facing source notes bilingual.
- The Urdu map is **not** labelled in English — `localizeStyle.ts` rewrites every name-bearing
  symbol layer.
- Search works: fuzzy matching, place/saint/order/century/deity all reachable, honest zero-result
  state. Tradition and place pages *are* in the palette.
- 50,009 characters of `qa_note` are not hidden — `SourceNotes` publishes bilingual restatements for
  52 slugs under an existing ruling.
- `data/shrines.csv` is tracked, despite `.gitignore` line 87 appearing to exclude it.
- All 15 route families end their `<title>` consistently; `/review`'s zero inbound links are
  deliberate; unknown slugs no longer become the map.
- `/graph?lang=ur` shows 63 Latin runs and they are **deliberately** untranslated: they are source
  quotations, and translating a quotation is what RULE 2 forbids.

**Incidental, and worth someone's attention:**

- CLAUDE.md says "**107** of them citing three or more sources". The shipped snapshot and the live
  `/about` both give **103**. The same drift class the 544→533 note already warns about.
- Five route families render **two** skip links to `#main-content` — `App`'s plus a page-level copy.
- There is **no `tradition` route in the Urdu Latin-run budget table**, so the eight tradition pages
  are outside that guard entirely.

---

## The missing lens

The visual-craft reviewer never ran. Anything in this document about type scale, spacing rhythm,
dark-theme consistency or whether the fifteen routes look like one designed object is **absent, not
cleared** — the one exception being J‑7 (a clipped title) and J‑3 (an unlabelled colour code),
which two other lenses happened to trip over. Re-run that lens before treating this council as
complete.
