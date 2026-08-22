# To-do — as of 22 August 2026

> **The current working plan is [`planning/NEXT_STEPS_2026-08-21.md`](planning/NEXT_STEPS_2026-08-21.md)**
> — three lanes: agent-executable next steps, the queue waiting on you, and the refreshed
> blue-sky line. This file remains the session-by-session log.

## 0a⁵. Session log — 22 August 2026, sixth session: every pending decision, decided

Rauf answered the whole Lane B queue in-session (reviews explicitly skipped — "ignore them
and just move on"). Rulings recorded in `EDITORIAL_DECISIONS_PENDING.md` §6; in brief:
reader-facing source-notes disclosure YES (further than recommended); sensitive content
attribute-everything-withhold-nothing; `silsila_note` column YES; oral/video media NO-GO
for now (F3/F8/F9 parked); the two coordinate-less rows get **unmapped-page treatment**;
the 4-row patch is to be **regenerated** before import; the Saifullah draft is to be
**updated** then sent; DOI + Auqaf register parked. New direction in their place:
**connect shrines with the Auqaf mosques data** (`RaufNawaz/Awqaf` — "Women's prayer
section" + "Shrine Name" columns; site already links Awqaf→shrines, we build the reverse).

Also this session: N4 groundwork landed (`5c5326e` — language facts in one table,
Lang derives from it; byte-identical, 480 unit + 84 e2e unchanged).

- **Shrines ↔ Auqaf mosques** (`4ec50fd`, the new direction): shrine pages list nearby
  Auqaf mosques from the Awqaf repo's live published CSV — the survey's "Women's prayer
  section" answer as recorded, distance the only computed fact, "this shrine's mosque"
  asserted only by the survey's own Shrine Name join key. Deep links replicate the Awqaf
  site's id contract (`mosqueId-rawRowIndex`) against the same live sheet. Lazy fetch,
  quiet absence on failure. e2e fixture router now disambiguates the two docs.google.com
  sheets by publish token. Unit 480 → 485; e2e 84 → 86/86.
- **The two importables are ready for you** (`ac89845`): the regenerated patch
  (`data/patch_schema_and_truncation.csv` + its `INSTRUCTIONS.md` — the instructions list
  is the authority, since a sparse CSV can't say "leave this cell alone") now carries the
  `silsila_note` moves, and the drift guard already earned its keep (the live abul-muali
  cell ends "See qa_note 1."). The Saifullah draft is refreshed (prasad/diya question in,
  coordinates ask softened). Front-end renders silsila_note the moment it lands.
  Unit 485 → 486; e2e 86/86.
- **Production redeployed on request** (deploy run #19 green): everything through the
  mosque connection is live on github.io. Branch restarted from main.
- **Unmapped shrines get pages** (`987b78d`): latLng honestly nullable; a named row
  without coordinates keeps its page/list/search presence marked "location not recorded";
  tour geometry narrowed through `MappedShrine` so it stays null-free by type; nearby/
  related/mosques/directions/print all decline rather than pretend. build-dataset keeps
  such rows (garbage coordinates still rejected). Takes effect for Shah Gohar Peer and
  Mian Qurban Ali Shah when the live sheet is next fetched or the snapshot rebuilt with
  network. Two legacy drop-policy tests updated. Unit 486 → 493; e2e 86/86.

---

## 0a⁗. Session log — 22 August 2026, fifth session: deployed, then system dark

- **Everything shipped to production.** PR #2 (32 commits: Urdu delta pass, mobile fixes,
  saved shrines, urs + .ics, /report, /typology, figure labels + silsila, motion system,
  perf) merged to main; PR #3 fast-forwarded the Pages branch `1.6`; deploy run #18 green.
  The branch was restarted from main per convention.
- **System dark preference honored** (`06ea535`): theme init read only localStorage and
  defaulted light, so a phone in dark mode got the light site. Both init paths now follow
  `prefers-color-scheme` when no choice is stored; the provider tracks live device flips
  until the moon button pins a choice. Unit 467 → 470; e2e 80 → 81/81.
- **Ziyarat print pack** (`fe518ef`, F6's remaining half): "Print your list" beside the
  saved filter prints names, places, categories, WGS84 coordinates (Western digits in every
  language) and computed next-observance windows with the approximate flag. Prints from the
  full saved list, never the search-narrowed view. **CSS gotcha:** `body:has(.x) *` (0,1,1)
  outranks a bare `.x` show-rule, so a print wrapper computes visibility:hidden while its
  children re-show — content prints, wrapper is genuinely hidden; both print wrappers now
  ride under `body:has(…)` in the show rule. Unit 470 → 473; e2e 81 → 82/82.
- **Shareable ziyarat list** (`46a3974`): "Copy list link" builds `?list=slug,slug`; arrival
  shows a consent card and narrows the list — nothing is written until "Add to my list"
  merges into the reader's own device list. Hostile tokens in the param are dropped, not
  guessed. **Gotcha again:** route slugs ≠ photo slugs (`shrine-of-shah-jamal`, not
  `shah-jamal`). Unit 473 → 478; e2e 82 → 84/84.

---

## 0a‴. Session log — 22 August 2026, fourth session: blue-sky continued

Standing instruction unchanged (keep improving until told to stop), plus two refinements from
you mid-stream: work in a *substantial, blue-sky* register, and once Urdu is solid, move to
animations, deeper UI integration, more features, database enrichment. Shipped, each verified
(`npm run verify` + full e2e green before every push):

- **Add-to-calendar** (`4010fcc`): the shrine urs block exports its projected windows as
  `.ics` (all windows in the horizon — a Hijri urs can fall twice in one Gregorian year).
  Approximation warnings travel inside the file.
- **Real files for /almanac, /graph, /report on GitHub Pages** (`426c46b`): Pages has no SPA
  rewrite, so app routes 404'd on hard refresh. Prerendered shells (+/ur mirrors, hreflang,
  sitemap pairs) and a noindex 404.html.
- **F10 — State of the Archive** (`929fac9`): `/report`, the archive grading itself in
  public. Everything computed from the loaded dataset (`archiveReport.ts`); the one external
  constant is Punjab Auqaf's 534, cited where used. Corrections and known-losses ledgers are
  content, bilingual, in the TRADITION_LABELS pattern.
- **Motion system** (`99a5a04`): useReveal() scroll-reveal with a 1500ms failsafe — content
  visible by default, hiding class added only by JS, so no-JS/print/prerender never lose
  prose. Stagger utilities on grids and ledgers; micro-interactions on chips/buttons/save.
  Two independent reduced-motion layers (media-query-gated rules + tokens.css durations→0).
  **Gotcha for the next person:** axe must scan at `reducedMotion: 'reduce'` — scanning
  mid-stagger samples colors at partial opacity and reports phantom contrast failures
  (e.g. `#827766`) that exist in no rest state. Rest-state contrast is 5.85:1.

Unit tests 447 → 452; e2e 66 → 71/71 green in ~56 s.

Continued the same day, same standing instruction:

- **Save from the map** (`82ce64c`): the preview card carries the same ziyarat bookmark as
  the shrine page — same store, same aria-pressed contract.
- **Phone-viewport guard** (`341b2a3`): on being asked whether the phone sidebar issue was
  fixed — yes (HANDOVER §9.9's min-height floor holds; measured 192px with all 169 items at
  390×844 and 360×740), and the e2e guard now pins the phone size, not just 1280×720.
- **The Atlas of Built Forms** (`949ea06`, N7 + a data-visibility bug): `site_type` was
  parsed and displayed **nowhere** — 168/169 rows invisible to readers through the whole
  schema migration. Now: an infobox "Built form" row (vocabulary localizes and links; the
  two survey-prose values render verbatim per RULE 2) and /typology grouping the archive by
  what stands at each site. **Found on the way:** the e2e fixture generator exported only
  the 11 legacy columns, so every e2e run to date saw a dataset with no `site_type`/
  `status`/`info_level`/`support_level` at all; the fixture now mirrors the live sheet's
  structured columns. **N2 (Wikidata round-trip) is blocked in this sandbox** — the egress
  proxy 403s both www.wikidata.org and query.wikidata.org; it needs a session with wider
  egress or a human-run script.

Unit tests 452 → 459; e2e 71 → 78/78 green in ~66 s.

- **Honest figure labels + silsila** (`48cab74`): the infobox called every principal figure
  "Saint" / "ولی" — 33 deities, 28 Sikh Gurus and 17 sants mislabeled, and ولی is
  specifically a Muslim saint. figure_type now drives the row label (دیوتا / سکھ گرو /
  سنت); the silsila column (52 rows) gets a row, its 14 clean order names added to the
  urdu-i18n dictionary (seed 548 → 562). The four survey-prose silsila values and two prose
  figure_types render verbatim / fall back, per RULE 2. **Gotcha:** the route slug for the
  Suharwardi shrine is `shrine-of-abul-faiz-…` — the protected slug list in CLAUDE.md is
  photo-URL keys, not route slugs. Unit 459 → 467; e2e 78 → 79/79.

- **The blank basemap button** (`fdaa98a`, reported from a real phone on production): the
  layers control was a glyphless white square — map.css strips the vendor sprite and
  nothing ever replaced it — parked bottom-left ON TOP of the mobile bottom sheet's brand
  row. Now: a theme-token mask glyph and `position="topright"` (bottom-right holds
  zoom + reset; top-left is the desktop sidebar toggle). Guarded at 390×844. Note the
  fix is on this branch — production keeps the blank square until the branch deploys.
  E2e 79 → 80/80.

---

## 0a″. Session log — 21 August 2026, third session: features until told to stop

Standing instruction: keep improving functionality. Four shipped, each verified
(`npm run verify` + full e2e green before every push):

- **The shrine's almanac slice** (`4d21be0`): shrine pages with a datable observance show
  the next projected window with the approximate flag, deep-linking to the shrine's
  anchored card in /almanac. F5 (silsila metro map) was *rejected* after measurement — the
  KG holds 6 lineage edges across 130 saints; a transit diagram of six connections would
  imply a mapped tradition the archive doesn't have. It waits on lineage extraction.
- **Print-grade shrine pages** (`bfeb47b`) — and the bigger half: tours.css's unscoped
  `body * { visibility: hidden }` print hack meant **every page without an active tour has
  been printing blank**. Now scoped with `:has(.tour-print-itinerary)` and guarded by a
  print-emulation e2e spec.
- **Saved shrines / ziyarat list** (`7572109`): on-device bookmarks + a "Your list" map
  filter (?saved=1). localStorage only — offline-friendly, no account, never leaves the
  device.
- **252 KB gzip off the critical path** (`urdu-content.json` made a lazy chunk): the
  useShrineData chunk went 585 KB → 11 KB. Both merge sites were already async, so nothing
  ever renders unmerged; the Urdu experience is byte-identical.

Unit tests 426 → 447 across the day; e2e 59 (all broken in sandbox) → 66/66 green in ~1 min.

---

## 0a′. Session log — 21 August 2026, second session: Lane A of the plan, executed

All six agent-executable items from `planning/NEXT_STEPS_2026-08-21.md` §2 are done (one
blocked and re-lodged in Lane B). `npm run verify` 437 unit tests green; **e2e 62/62 green
in 51 s** — the suite had never run in this sandbox before today.

- **Urdu search parity fixed** (`24aefe7`): the worker indexed a sheet `Urdu Name` column
  that doesn't exist, so داتا دربار found nothing. It now indexes what the UI displays
  (dictionary names, locations, saints). Unit + e2e pinned.
- **e2e suite hermetic and 8× faster** (`b1a58d4`, `878cd06`): nothing leaves localhost
  now. Root causes written into `docs/FRONTEND_NOTES.md` §9 — pinned-browser mismatch,
  hanging external requests holding the `load` event hostage, and a geolocation test that
  raced the app's own timeout.
- **Review cockpit** (`026eeea`): `python3 urdu-i18n/build_review_queue.py` → priority
  queue + side-by-side EN/UR pages + a hash-pinned `reviewed.json` ledger (edits after a
  review auto-drop the entry to *stale*). **The top-8 packet is ready — this is the
  next thing that needs you.**
- **Cite-this-entry** (`1bc8174`): plain text + BibTeX on every shrine page, both carrying
  the entry's support level; no-leak-safe in Urdu.
- **/almanac and /graph in the axe matrix** (`cbf2600`), green on first run.
- **Auqaf register: blocked, measured** — no register in the repo (it's the pending ask in
  `docs/auqaf_records_brief.md`) and the department's site is egress-blocked from the
  sandbox. Moved to the needs-you queue.

---

## 0a. Session log — 21 August 2026: A8 step 2 finished

**All 74 Urdu deltas are translated. `urdu-i18n/a8-scope.json` now reads 0 delta entries.**
Commits `25150d6` (16 largest), `090b30d` (20), `8b9621e` (the last 38); `npm run verify` green
throughout (426 tests). Every file is **`reviewed=false`** — the Urdu prose still needs a human
reader before any of it counts as done (RULE 2).

**What is left of A8:** step 3 only — the three full translations still waiting on
`docs/EDITORIAL_DECISIONS_PENDING.md` (`darbar-abul-muali-qadri`, `darbar-malik-ahmad-ayaz`,
`darbar-mian-qurban-ali-shah`). That is blocked on a decision, not on work.

**Needs you, and it is the highest-value thing on this list:** *read some of the Urdu.* There
are now 168 Urdu articles in `urdu-i18n/content/`, none of them reviewed by a human. The eight
worth reading first, because they carry the most new prose and the highest traffic:
`shrine-of-mauj-darya-bukhari`, `shrine-of-shah-jamal`, `shrine-of-shah-inayat-qadiri`,
`shrine-of-peer-makki`, `data-darbar`, `shrine-of-bibi-pak-daman`,
`tomb-of-allama-iqbal-mazar-e-iqbal`, `allo-mahar`.

**Three editorial fixes made while in the files** — all cases of the Urdu asserting something
the English no longer says, which is a failure mode a purely additive delta pass would miss:

- `allo-mahar` — the English **retracted** its Faiz-ul-Hassan Shah biography (identification
  unresolved between two figures; bibliography withdrawn as unreliable). The Urdu still carried
  all five sections of the withdrawn biography. Now matches the retraction.
- `gurdwara-tambo-sahib` — told the standing-shadow sakhi as its own; the English attributes it
  to Gurdwara Mal Ji Sahib and calls it "often-conflated."
- `gurdwara-rori-sahib` — stated the Bhai Lalo / Malik Bhago episode flatly; the English ties it
  specifically to Gurdwara Khuhi Bhai Lalo.

**Two mistranslations and one unsourced claim, fixed:** `shrine-of-peer-makki` rendered "Data
Ganj Bakhsh" as **دیوان** گنج بخش throughout (Data, not Diwan; grep confirmed no other file did
it), `loh-temple-lava-temple` wrote the Walled City of Lahore Authority as **واجد** سٹی, and
`kalat-kali-temple` opened with "far from Quetta", which appears nowhere in its English.
`darbar-ghamkol-sharif-zinda-pir` looked like the same class of error — a founder's name the
English never gives — and is not: it is the row's own `principal_figure`. Check the row before
"fixing" a name.

**Two gates added** (`urdu-i18n/build_urdu_content.py` now refuses to write on either):
a `## heading` with no blank line before it — markdown folds it into the previous paragraph, so
the section vanishes from the article and the contents nav with nothing erroring, which happened
five times in one sitting — and an odd number of `*` in a file.

**Tooling:** `pipeline/a8_urdu_delta.py` gained `--snapshot` (the published sheet is unreachable
from the web sandbox: the agent proxy 403s `docs.google.com`, and `--offline`'s CSV is
gitignored, so neither path ran in a fresh clone). It also now names rows the loaded source
dropped in `rows_not_in_source`, and stamps `generated` from the clock only when the buckets
change instead of hardcoding a date. `urdu-i18n/update_log.py` deliberately got *no* snapshot
fallback — its denominator must be the full 171 rows — but now says so instead of raising
`FileNotFoundError`. **`urdu-i18n/TRANSLATION_LOG.md` was therefore not regenerated this
session; run `npm run urdu:build` from a machine that can reach the sheet.** Its numbers are
unchanged (168/171 translated) since the deltas were edits to existing files.

Full detail in `docs/planning/A8_URDU_DELTA_SCOPE.md` (21 August note) and `docs/HANDOVER.md` §9.

---

# To-do — as of 18 August 2026 (superseded above; kept for the record)

> **18 August: the sheet import is DONE.** The live published sheet now serves 171 rows /
> 44 columns with `support_level` populated; §1 below is closed and kept only for the record.
> Verified against `data/shrines_final_import_2026-08-16.csv`: 0 descriptions differ, 0
> ``` fences leaked into any Description, 49 newline-free descriptions → 1. See §0 for what
> the 18 August session did and what is next.

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
