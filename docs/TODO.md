# To-do — as of 18 August 2026

> **18 August: the sheet import is DONE.** The live published sheet now serves 171 rows /
> 44 columns with `support_level` populated; §1 below is closed and kept only for the record.
> Verified against `data/shrines_final_import_2026-08-16.csv`: 0 descriptions differ, 0
> ``` fences leaked into any Description, 49 newline-free descriptions → 1. See §0 for what
> the 18 August session did and what is next.

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

**Needs a human:**

1. The **18 figures and 67 shrine labels** still with no Urdu name are genuinely absent from
   the dictionary — not a spelling difference. They want entries in the `urdu-i18n/` pipeline.
   The figure list is short enough to paste: Bhai Waliram · Hazrat Syed Muhammad Khair ul Deen
   (Shah Abul Muali Qadri) · Ghazi Ilm Din Shaheed · Hazrat Khawaja Feroz-ud-Din Gharib Nawaz
   Chishti Nizami · Hazrat Tahir Bandagi Qadri · Malik Ahmad Ayaz · Hazrat Wasif Ali Wasif
   Awan · Kali · Bhai Gurdas Singh · Sain Vali Vilayat Rai · Sant Baba Asudaram "Sakhi Baba" ·
   Bhagat Kanwar Ram · Satguru Swami Sai Satramdas Sahib · Bhai Gurdas · Makhdoom Abdul Rahim
   Girhori · Pir Chhatal Shah Noorani · Pir Lakha · Swami Dharmdas.
2. The **five order descriptions** I translated are machine-quality drafts by the project's own
   standard and want a fluent reader.
3. `valmiki` and `bhagwan-valmik` are **one figure entered twice** in the graph — the first
   duplicate the new collision test caught. There are others it did not (three Guru Nanak
   nodes, a composite "Guru Arjan Dev & Guru Hargobind"), still awaiting the merge rules noted
   in the previous session log.

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
