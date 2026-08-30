# Reviewer KB-3 — Schema hygiene and invariant coverage

*Lens: where the knowledge base can be silently corrupted without any check firing.
Read-only pass, 30 August 2026, on a shared working tree with 24 modified files and
3 untracked paths belonging to another session — so **no gate result in this report is
attributed to the tree's cleanliness**, and nothing here was run through `npm run verify`,
`build`, or `e2e`.*

**Prior art re-verified first.** The orphaned-guard sweep's number is right. Reproduced at
its own commit with its own stated filter:

```
$ git ls-tree -r --name-only 07137d7 -- scripts pipeline \
    | grep -cE "/(check|validate|verify)[-_][^/]*\.(mjs|py|sh)$"
14
```

Fourteen, exactly, and `check-production-base.mjs` really is automated — `deploy-pages.yml:69`
runs `npm run verify:pages` as the last gate before Pages. Today the same glob returns 15;
the extra one is `check-drafted-entries-published.mjs`, committed 15 minutes after the sweep
(`9131491`, 16:23, against the sweep's `07137d7`, 16:08). The sweep is sound and does not need
redoing.

What it could not see is the shape of its own filter, and that is where finding KB3-6 comes
from. Everything else below answers the question the sweep did not ask: **which invariants have
no gate at all.**

---

## Section 1 — Findings

### KB3-1 — `npm run data:validate` validates a file the website does not ship, and `npm run data:build` will not repair the one it does

**Measured.**

```
$ node -e '... rows of data/shrines.json vs src/data/shrines-fallback.json ...'
rows differing: 0
top-level keys canonical: [ 'schema_version', 'generated', 'count', 'rows' ]
top-level keys fallback:  [ 'generated', 'count', 'rows' ]
```

They agree today. Nothing holds them there. Reading each gate's input:

| Gate (all in `data:validate`) | Reads |
| --- | --- |
| `validate.mjs` — **the schema validator** | `data/shrines.json` only |
| `validate-tours.mjs`, `validate-images.mjs`, `build-shrine-index.mjs --check` | `data/shrines.json` only |
| `validate-publication-safety.mjs` | `src/data/shrines-fallback.json` only (first-existing of two candidates) |
| `build-image-shapes.mjs --check` | `src/data/shrines-fallback.json` only |
| `validate-description-structure.mjs` | **both**, deliberately |

And the site is built from the fallback: `scripts/prerender.mjs`, `src/hooks/useShrineData.ts`,
`buildCoverage`, `buildArchiveReport`, and every unit test that pins a number all read
`src/data/shrines-fallback.json`.

The repair path does not repair. `scripts/data/build-dataset.mjs:120-127`:

```js
const newDigest = rowsDigest(valid);
const existingDigest = existing ? rowsDigest(existing.rows ?? []) : null;
if (newDigest === existingDigest) {
  console.log(`✓ ${valid.length} rows — no changes (digest match). Files untouched.`);
  process.exit(0);          // ← exits before writing SNAPSHOT_JSON
}
```

`existing` is `data/shrines.json`. The idempotency guard is on one of the four files it writes.

**How the damage happens silently.** A session hand-edits `src/data/shrines-fallback.json` —
to test a badge, to apply a patch locally, to resolve an iCloud conflict copy — or a partial
`git checkout` restores one file and not the other. `data:validate` reads the canonical, finds
it clean, exits 0. `data:build` is re-run to be safe, sees a digest match on the canonical, and
prints `Files untouched` — the reassuring line — without ever looking at the fallback. Every
prerendered page, every `/about` figure, and every unit test that pins a count is then computed
from a file no validator has read.

The existing guards form a chain with a hole in the middle: `shrinesIndex.test.ts` ties
`shrines-index.json` to `shrines.json`, and `snapshotFidelity.test.ts` ties the newest
`data/snapshot_*.csv` to the **fallback** — but `snapshot-sheet.mjs:50` generates that CSV *from
the fallback*, so the pair moves together. There is no edge between the canonical and the shipped
snapshot.

**Scale.** 169 rows × 44 fields = 7,436 field values, validated in one file and served from
another. Four gates read only the canonical, two read only the shipped file, one reads both.

**Remedy.** A unit test in `src/lib/data/__tests__/` (it can read both files under
`@vitest-environment node`, and vitest is in `verify` *and* in both workflows):

> `data/shrines.json` and `src/data/shrines-fallback.json` must hold the same rows, field for
> field, in the same order. On failure: *"the file the validator reads and the file the site
> ships disagree on N field(s) — run `npm run data:build`, and if that prints 'digest match,
> files untouched' the canonical is the stale one."*

Second, smaller: change `build-dataset.mjs`'s short-circuit to require **all four** outputs to
match before exiting early, so the reassuring line is earned. Both halves are needed — the test
detects, the build-fix repairs.

**Confidence: high.** The behaviour is read out of the source, and the current-agreement figure
is a full field-by-field comparison, not a spot check.

---

### KB3-2 — Three of the four closed vocabularies in CLAUDE.md's schema are enforced by nothing, and one of them already holds prose

**Measured.** Value distributions over all 169 shipped rows:

```
-- status --  "Active":128  "Occasional":17  "Heritage":13  "Ruin":7
              "Active; in use daily, construction ongoing":1
              "Active; physically constrained. Reported as occupying a small area reduced by
               losses in the Sikh era and by market encroachment, …":1
              "Destroyed":1  "":1
-- support_level -- "Source-documented":100 "Source-seeded":53 "Field-verified":14 "Web-compiled":2
-- info_level --    "Moderate":153 "Full":14 "Low":2
```

The full gate run, captured to a file and read whole (13 lines, not piped):

```
$ node scripts/data/validate.mjs > out.txt 2>&1; echo "EXIT=$?"
EXIT=0
[validate] Warnings (10):
  … category "Islam" …
  … year_built_precision "Uncertain — …" ×3 …
  … site_type is 77 chars … ×2 …
[validate] ✓ 169 rows valid (10 warning(s))
```

Not one line about `status`, `support_level` or `info_level`. Broken on purpose against the
schema itself:

```
$ node -e 'validateRow({...base, status:"Blown up last Tuesday",
                        support_level:"Vibes", info_level:"Some"})'
row with junk status/support_level/info_level: PASS (unvalidated)
```

Nothing else covers them either. `pipeline/validate_shrines.py` checks that the *columns exist*
(`if "support_level" not in header`), never their values. `check-live-sheet.mjs:65` lists all
three under `REPORTED_COLUMNS` — counted, not validated — and says why in its header: *"Their
vocabularies live in TypeScript this file cannot import, and hardcoding a copy here would create
a third source of truth."* `siteFacets.test.ts` exercises `siteStatusKey`/`supportLevelKey`/
`infoLevelKey` against hand-written strings and never against the shipped rows.

**How the damage happens silently.** All three normalizers return `null` on anything they do not
recognise (`src/lib/data/siteStatus.ts:11`, `infoLevel.ts:14`, `supportLevel.ts:12`), and every
caller renders nothing rather than the raw value. So `Field verified` without the hyphen, or
`Web compiled`, drops the badge from `ShrinePage` and `ShrinePreview`, drops the row out of the
"Field-verified only" filter in `shrineFilters.ts:74`, and drops it out of both `/about`
builders — and the page still looks finished, because a missing badge looks exactly like a shrine
that has no badge. A sheet edit deploys instantly (RULE 3), so there is no review step either.

**Scale.** 2 rows carry prose in `status` today and 1 is blank, so `/about`'s status distribution
sums to 166 of 169. Both prose values begin `Active;` — the honest count is 130 Active, the page
computes 128. Beyond today: three vocabularies × 169 rows are unguarded, and 14 `Field-verified`
rows are exactly the population a typo would be most expensive on.

The asymmetry is the sharpest part. `validate.mjs` grew a prose-where-a-code-belongs guard for
`year_built_precision` (29 Aug) and one for `site_type` (30 Aug), each firing on the same two or
three rows. `status` has the identical defect, in the identical rows, and was not given one.

**Remedy.** A unit test, not a script — that is what dissolves `check-live-sheet.mjs`'s stated
objection. A vitest file *can* import the TypeScript, so it introduces no fourth enum:

> Run `siteStatusKey`, `supportLevelKey` and `infoLevelKey` over every row of
> `src/data/shrines-fallback.json`. Any non-empty value that normalises to `null` fails, naming
> the row, the column and the value: *"`status` = 'Active; in use daily…' is not one of Active |
> Occasional | Heritage | Ruin | Destroyed. This row loses its status label, its facet and its
> count on /about, and nothing on the page says so. Prose belongs in `status_note`."*
> Blank stays legal — unrecorded is honest, and the empty-field warnings already cover it.

Two rows are red on arrival, so follow `validate-description-structure.mjs`'s precedent exactly:
name them as a dated allowlist with the patch that fixes them, and fail the moment the count
moves. **Do not edit the prose to clear it** — both sentences are real information and belong in
`status_note` (RULE 4's second half).

**Confidence: high.** Measured over the shipped file, confirmed by running the gate and reading
all 13 lines of its output, and confirmed by constructing the damage against the schema.

---

### KB3-3 — The category vocabulary is written down eight times in seven files and gives two different answers; the only place it is a hard error is the stale one, and it would reject the correct fix

**Measured.** Broken on purpose, importing the real schema:

```
$ node --input-type=module -e 'import {validateRow, CATEGORY_VALUES} from "./scripts/data/schema.mjs" …'
Zod CATEGORY_VALUES: ["Muslim Shrine","Hindu Temple","Sikh Gurdwara","Christian Church","Other",""]
  Category="Hindu Temple"                -> PASS
  Category="Jain Temple"                 -> FAIL: Category must be one of: Muslim Shrine, Hindu Temple, Sikh Gurdwara, Christian Church, Other
  Category="Nanakpanthi / Udasi Darbar"  -> FAIL: (same)
  Category="Secular / Memorial"          -> FAIL: (same)
  Category="Christian Church"            -> PASS
  Category="Other"                       -> PASS
row with category="totally made up" (modern col): PASS (unvalidated)
```

The declarations, and what each is worth:

| File | Values | Force |
| --- | --- | --- |
| `src/lib/data/categoryKey.ts` | 6 (current) | app rendering, filters, marker colour |
| `scripts/data/lib/category.mjs` | 6 (current) | **warning** in `validate.mjs` |
| `pipeline/validate_shrines.py:57` | 6 (current) | warn-only in CI (`--fail-on NONE` always exits 0) |
| `scripts/data/schema.mjs:9` | **5, stale** | **hard error**, blocks `data:validate` |
| `data/shrine-schema.json:21` | **5, stale** | published JSON Schema |
| `data/datapackage.json:47` and `:106` | **5, stale** ×2 | published Frictionless descriptor |
| `docs/DATA_DICTIONARY.md:37` | **5, stale** | the dictionary a newcomer reads |

And the legacy column the hard error guards is itself wrong on 20 rows:

```
category / Category: both=162 onlyModern=6 ONLY-LEGACY=1 neither=0
    both present but DISAGREEING: 20
       Bhai Sant Thawan Das Mandir | category="Nanakpanthi / Udasi Darbar" | Category="Hindu Temple"
       Gori Temple (Gori jo Mandar) | category="Jain Temple"               | Category="Hindu Temple"
       Gurdwara Pehli Patshahi (Jind Pir), Sukkur
                                    | category="Nanakpanthi / Udasi Darbar" | Category="Sikh Gurdwara"
       … 17 more
```

**How the damage happens silently — and loudly, in the wrong direction.** Two failure modes from
one cause.

*Silent:* the modern `category` column, the one every consumer actually reads through
`resolveCategory`, is validated only by a **warning**. `validate.mjs` exits 0 with
`category "Islam"` in its output today. A seventh value costs the row its marker colour, its
category filter, and every per-tradition count — the archive under-reports itself by one and the
build is green.

*Loud, and worse:* someone doing the obvious hygiene job — bringing the 20 stale `Category` cells
into line with `category` — makes `npm run data:validate` **exit 1**, with a message naming
`Christian Church` and `Other` as the correct values. This archive holds no Christian church and
abolished `Other`. That is a check punishing the correct action and directing the operator to
un-fix it: the "a poet of note:" pattern RULE 4 was written about, sitting in the schema.

Contrast what the repo already does for smaller vocabularies. `figureTypeVocabulary.test.ts`
reads `FIGURE_TYPE_ENUM` out of `validate.mjs`'s source and holds it equal to `figureType.ts`.
`placesVocabSync.test.ts` does the same for places. `slugsSync.test.ts` for slugs.
`bibliographySync.test.ts` for the citation rule. **The one closed vocabulary with no sync guard
is the most load-bearing one in the archive**, and it is the one that has drifted.

**Scale.** 8 declarations, 7 files, 2 answers. 20 rows disagree between the two columns. 20 rows
(14 Nanakpanthi + 3 Jain + 3 Secular) carry a `category` the stale declarations reject.

**Remedy.** Two changes, one test.

1. Correct `scripts/data/schema.mjs`, `data/shrine-schema.json`, `data/datapackage.json` (both
   occurrences) and `docs/DATA_DICTIONARY.md` to the six values. The Zod rule on the legacy
   `Category` column should accept the union of both vocabularies during migration — legacy rows
   are not corrupt, they are old — and should stop being a hard error on values the archive
   currently uses.
2. `categoryVocabSync.test.ts`, modelled character-for-character on
   `figureTypeVocabulary.test.ts`: read the literal list out of each of the seven files as text
   and assert all seven are the same six strings. Message: *"the category vocabulary is declared
   in 7 files and N disagree — a value outside the enum loses its row the map colour, the filter
   and every tradition count, and the published descriptor is what a downstream consumer
   validates against."*
3. Promote the `category` enum check in `validate.mjs` from warning to error **only after** the
   one `Islam` row is fixed by a sheet import (RULE 3), keeping it a named dated exception until
   then.

**Confidence: high.** The vocabulary lists were read out of all seven files, and the hard-error
behaviour was constructed rather than inferred.

---

### KB3-4 — The archive's published, machine-readable schema describes 11 of its 44 fields, and nothing checks

**Measured.**

```
total data keys: 44
NOT in datapackage (33):
  Image 3 … Image 16 | category | event_note | event_year | figure_born | figure_died
  | figure_type | flags | id | info_level | needs_review | principal_figure | qa_note
  | silsila | site_type | status | support_level | year_built | year_built_note
  | year_built_precision
NOT in shrine-schema.json (33)
in datapackage but not in data: []

population of undocumented fields:
  info_level 169/169 · support_level 169/169 · category 168/169 · figure_type 168/169
  · id 168/169 · principal_figure 168/169 · site_type 168/169 · status 168/169
  · year_built_precision 168/169 · year_built_note 158/169 · flags 146/169
  · year_built 127/169 · figure_died 71/169 · figure_born 66/169 · silsila 52/169
  · qa_note 50/169 · event_note 21/169 · event_year 19/169 · Image 3-10 (9-14 each)
```

26 of the 33 undocumented fields are populated. The seven that are not are `Image 11`–`Image 16`
and `needs_review`'s empties.

These are not internal scratch files. `LICENSE-data.md:4` names `data/datapackage.json` and
`data/shrine-schema.json` as part of the licensed data release; `scripts/data/release.mjs:28`
bundles them; `docs/DATA_DICTIONARY.md` presents itself as the field reference. The only
automated thing that reads `datapackage.json` is `citation.test.ts:83`, and it reads the
`"version"` string.

**How the damage happens silently.** Nobody in this repository consults these files, so nothing
here notices. The reader who does consult them is a downstream data consumer — the exact person
the ODbL release and the CITATION.cff exist for — and they get a descriptor that says the
archive records a shrine's name, location, founding year and saint, and is silent on its
provenance tier, its documentation level, its physical status, its built form, its principal
figure, its silsila, and its split date fields. An archive whose distinguishing claim is
provenance publishes a schema in which the provenance columns do not exist. This is the same
failure class as the standing findings CLAUDE.md keeps struck through rather than deleting: a
true statement that stopped being true, with nothing that recomputes.

**Scale.** 11 of 44 fields described (25%). 26 populated fields undescribed. Two published
artefacts plus one reference document, none of them checked.

**Remedy.** `datapackageCoverage.test.ts`:

> Every key present in any row of `data/shrines.json` must appear as a field in
> `data/datapackage.json`'s two resource schemas and in `data/shrine-schema.json`'s
> `properties`, and vice versa (no ghost fields). Failure: *"the published descriptor describes
> N of M fields — a downstream consumer validating against it will reject or ignore column
> `<name>`, which N of 169 rows populate."*

Same pattern as `siteCountConsistency.test.ts`, which already refuses to let a *number* in
`README.md` and `CITATION.cff` go stale. This does it for the *shape*. Cheap, deterministic,
offline, and it will keep the descriptor honest through the next column the sheet grows.

**Confidence: high.** Both directions of the set difference were computed; there are no ghost
fields, so the finding is one-sided and exact.

---

### KB3-5 — Three builders write shipped artefacts and have no `--check`; nine others have one

**Measured.** `data:validate` runs ten builders in `--check` mode: `build-order-prose`,
`build-traditions`, `build-shrine-index`, `build-image-shapes`, `build-urdu-article-index`,
`export-jsonld`, `export-rdf`, `build-review-worksheet`, `build-figure-identity-worksheet`, and
`build_dictionary.py`. The `--check` pattern is the repo's own answer to artefact drift and it is
applied nearly everywhere.

```
$ grep -n "\-\-check\|argv.includes\|CHECK" scripts/data/build-kg.mjs                 → (nothing)
$ grep -n "\-\-check\|argv.includes\|CHECK" scripts/data/build-provenance.mjs         → (nothing)
$ grep -n "\-\-check\|argv.includes\|CHECK" scripts/data/build-content-provenance.mjs → (nothing)
$ grep -n "check\|argv" urdu-i18n/build_urdu_content.py                               → (nothing)
```

`build-kg.mjs` writes 13 artefacts (`kg.json` 391 KB, plus `kg-stats`, `kg-sources`,
`kg-traditions`, `kg-order-prose`, `kg-shrine-figures`, `kg-search-index`, …).
`build_urdu_content.py` writes `src/data/urdu-content.json` — 1.0 MB, the Urdu reader's entire
article payload.

Both are in sync today. I rebuilt the Urdu one in memory rather than trusting the mtime:

```
md files: 168 · rebuilt slugs: 168 · shipped slugs: 168
in md not shipped: []   in shipped not md: []   bodies differing: 0
```

And the graph, once I had the relation shape right:

```
dataset slugs: 169 · kg located_in shrines: 169
kg-not-dataset: []   dataset-not-kg: []
buried_at shrines: 169 · buried_at-not-dataset: []
```

**169 ↔ 169, exactly, in both directions — and nothing asserts it.** The kg guards that exist
(`kgStats.test.ts`, `kgShrineFigures.test.ts`, `traditions.test.ts`, `validate-kg-identity.mjs`)
all compare kg artefacts to *other kg artefacts*. A stale `kg.json` and a stale
`kg-shrine-figures.json` are stale together and every one of them passes.

**How the damage happens silently.** The sequence `data:build` → `data:kg` → `data:index` is
documented in `docs/SESSION_RESUME.md` and enforced by nothing. Run `data:build` after a sheet
import, commit, skip `data:kg`: `/graph`, `/saint/:slug`, `/order/:slug` and `/shared-ground` all
render from a graph built before the import. For the Urdu half, edit
`urdu-i18n/content/<slug>.md` — which `urdu-i18n/README.md` calls the source of truth — commit
it, and the reader keeps getting the old article until someone remembers `npm run urdu:build`.
`git diff --exit-code -- urdu-i18n` in CI passes: the markdown *is* committed. What is not
checked is that the derived JSON matches it. Compare `urdu-seed.json`, which has two independent
guards (`build_dictionary.py --check` and a CI `cmp`); its 1 MB sibling has none.

Not everything is silent here, and that is worth saying: adding a row to the dataset *does*
redden the build, through `validate.mjs`'s hard error on any slug with no `provenance.json`
entry, and through `snapshotFidelity.test.ts`. The gap is specifically the graph and the Urdu
articles.

**Scale.** 14 generated files with no drift check: `kg.json` + 12 siblings, and
`src/data/urdu-content.json` (1.0 MB, 168 articles). Against 10 artefacts that do have one.

**Remedy.** Two, in order of cost.

1. Cheapest and highest value — a unit test, no new script:
   > Every shrine slug derived from `data/shrines.json` has exactly one `located_in` relation in
   > `data/kg.json`, and every `located_in` subject and `buried_at` object is a slug the dataset
   > holds. Failure: *"the graph knows N shrines and the dataset holds M — run `npm run data:kg`.
   > A shrine missing from the graph gets a `/saint/` page that tells the reader the archive
   > holds no entry for that figure."* That is not hypothetical: it is the exact misstatement
   > `check-drafted-entries-published.mjs` was written for.
2. Give `build_urdu_content.py` a `--check` (its transform is
   `{slug: {descriptionUr: body.strip()}}` — twelve lines) and add it to `data:validate`.
   While there, note that it writes `DEST` *before* running its Latin-leak validation
   (`build_urdu_content.py:64` vs `:69`), so a leaking run still ships the file; the leak is
   caught downstream by `validate-urdu-leak.mjs`, but "refuse to write" is what the docstring
   claims and is not what the code does.
3. A full `--check` for `build-kg.mjs` is the thorough version and is a bigger job (13 outputs,
   non-deterministic ordering to settle first). Recommend 1 now, 3 when someone is already in
   that file.

**Confidence: high** on the absence of `--check` and on the current agreement (both re-derived,
not read off timestamps). **Medium** on whether a full `--check` for `build-kg.mjs` is worth its
cost — that needs someone to confirm the builder is deterministic across runs, which I did not
test because it writes.

---

### KB3-6 — `pipeline/audit_coordinates.py` is a gate with a baseline and an exit code, and nothing runs it

**Measured.**

```
$ git grep -n "audit_coordinates" -- . ':!node_modules'
docs/HANDOVER.md:8666: **The instrument is `pipeline/audit_coordinates.py`**, and it fails non-zero when …
docs/SESSION_RESUME.md:378: `pipeline/audit_coordinates.py` holds the line meanwhile: it fails when the placeholder count …
pipeline/audit_coordinates.py:150: "deliberate, raise BASELINE in pipeline/audit_coordinates.py and say which\n"
```

Three references, all prose. Not in `package.json`, not in `ci.yml`, not in `deploy-pages.yml`.
The script is a real gate — `BASELINE = {"coarse": 12, "shared": 10}` and `return 1` when the
count rises — it reads `src/data/shrines-fallback.json`, it is stdlib-only Python, and it needs
no network.

**Why the sweep missed it, and this is the transferable part.** The sweep filtered on
`check-*`, `validate-*`, `verify-*`. This file is `audit_*`. The filter was chosen from the names
that existed and then used to answer a question about names that might not — so a gate named
anything else is invisible to it by construction. Two more gates are outside the same filter and
happen to be wired anyway: `pipeline/urdu_content_qa.py` (in `data:validate`) and the ten
`build-*.mjs --check` modes, which are gates wearing a builder's name.

**How the damage happens silently.** A patch import, a geocoding pass, or a new shrine adds a
coordinate typed to two decimals — about 1.1 km at this latitude, which in a dense quarter of
Lahore is several hundred buildings. It passes every emptiness check, sits inside the Pakistan
bbox, renders a marker, and is wrong by a neighbourhood. The archive's answer to this is written,
tested, and never executed. The docs say it "holds the line"; it does not hold anything.

**Scale.** 1 orphaned gate. It guards 22 rows already at placeholder grade (12 coarse + 10
sharing a point) — 13% of the archive — and its whole job is to stop that number growing.

**Remedy.** Add `"data:check:coordinates": "python3 pipeline/audit_coordinates.py"` to
`package.json` and put it in `data:validate`. It is green today by construction (the baseline was
set from the current data), stdlib-only Python — the same argument `ci.yml` already makes for
`build_dictionary.py --check` — and offline. Its failure message is already written and is a good
one.

Second, and this is the durable part: re-run the sweep on **behaviour, not names** — every
`.mjs`/`.py`/`.sh` under `scripts/` and `pipeline/` containing `process.exit(1)`, `exit(1)`,
`SystemExit` or a non-zero `return` from `main`, cross-referenced against `package.json` scripts
and both workflows. That query cannot be fooled by a filename.

**Confidence: high.** Absence proved by counting references across the whole repo, not by a
truncated grep, and the exit path was read in the source.

---

### KB3-7 — Nothing checks offline that a self-hosted photograph exists, and the "do not break these" list is seven directories short

**Measured.** Every `Image N` URL under the site's own origin, resolved against `public/photos/`:

```
self-hosted image URLs in dataset: 134
distinct photo dirs referenced: 15
MISSING files in public/photos: 0
dirs on disk: 17 · on disk but unreferenced: [ mian-qurban-ali-shah, shah-gohar-peer ]
```

The two unreferenced directories are the two unpublished shrines, which corroborates the known
171-vs-169 item from a direction nothing had checked it from.

Against CLAUDE.md's protected list:

```
  UNLISTED ghazi-ilm-din-shaheed: 10        LISTED   abul-faiz-qalander-ali-suharwardi: 10
  UNLISTED tahir-bandagi-qadri: 10          LISTED   madho-lal-hussain: 10
  UNLISTED wasif-ali-wasif: 10              LISTED   peer-makki: 10
  UNLISTED shah-inayat-qadri-shattari: 10   LISTED   shah-jamal: 10
  UNLISTED abul-muali-qadri: 9              LISTED   mazar-e-iqbal: 10
  UNLISTED khawaja-feroz-ud-din-gharib-nawaz: 9   LISTED ganj-e-inayat-sarkar: 9
  UNLISTED malik-ahmad-ayaz: 9              LISTED   bibi-pak-daman: 7
                                            LISTED   data-darbar: 1
total dirs: 15 · listed: 8 · unlisted: 7
```

**67 of the 134 self-hosted photographs — exactly half — are served from directories the
operating contract does not name.**

**How the damage happens silently.** Two ways. *The list:* an agent reads "Eight slugs carry live
photo URLs" as the complete set, renames or reorganises one of the other seven, and takes down 67
images. The sentence is a measurement with no date on it, in the section of CLAUDE.md headed
"Do not break these" — the place a careful agent looks precisely so as not to do this.
*The absence of a check:* `public/` is copied wholesale by Vite, so a missing or renamed directory
produces no build error, no test failure, and no console warning. The image 404s on the deployed
site. The only instrument that sees it is `pipeline/check_image_liveness.py` — network, hand-run,
and its own docstring records that it has been wrong about this host class before.

**Scale.** 134 self-hosted URLs across 15 directories; 67 URLs across 7 directories outside the
protected list. Zero currently broken.

**Remedy.** A unit test — the check is a `existsSync` per URL and runs in milliseconds:

> For every `Image N` value beginning `https://raufnawaz.github.io/Sufi-Shrines/photos/`, the
> corresponding file must exist under `public/photos/`. Failure: *"N self-hosted photograph(s)
> point at files this repository does not contain — the site will serve a 404 for each. If a
> directory was renamed, the sheet's URLs must be repatched (RULE 3) before the rename lands."*

And **do not hand-edit CLAUDE.md's list to 15** — the list should say what it is: derive it. The
same test can assert the count and print the current set, so the contract's sentence becomes
"the directories carrying live photo URLs are enumerated by `publishedPhotos.test.ts`" rather
than a number that goes stale. Updating the operating contract is Rauf's call, not an agent's
(the same ruling already recorded for RULE 4's fourth guard).

**Confidence: high** on the counts — every URL was resolved, not sampled, and both directions of
the directory comparison were computed. **Medium** on how likely the rename is: I found no
evidence of a directory rename ever happening, so this is an unguarded invariant rather than an
observed near-miss.

---

## Section 2 — Retractions

Eleven things I suspected and killed by re-measuring. Two of them I had already half-written.

**1. "`data/shrines.csv` is twelve days stale."** Its mtime is 18 August; `data/shrines.json`'s is
30 August. I was about to report the CSV mirror as drifted. Measured instead: 169 rows both
sides, 44 columns both sides, `Name mismatches by index: 0`, **`cell differences: 0`** across all
7,436 values. `data:build` writes both in one pass and skips both on a digest match, so the mtime
records the last *write*, not the last *agreement*. **An mtime is not a measurement** — this is
kind 1 in `MEASUREMENT_FAILURES.md`, a stale artefact read as current, with me as the stale
artefact.

**2. "`verify-kg-proposals.mjs` writes files during `data:validate`."** It contains three
`writeFileSync` calls and runs inside `npm run verify`, which on a shared tree would be a real
problem. Read the code: all three sit behind `--reconcile`, documented in the header as a
deliberate flag for regenerating derived `isNew` flags. `data:validate` invokes it bare.
Retracted entirely.

**3. "The knowledge graph is completely decoupled from the dataset."** My first measurement said
`in dataset but not referenced by kg: 169` — every single shrine. I had assumed relation endpoints
carry a `shrine:` prefix the way saints carry `saint:`. They do not:
`{"type":"buried_at","subject":"saint:…","object":"allo-mahar"}` — the shrine side is a bare slug.
Re-measured with the real shape: 169 ↔ 169, empty in both directions. **A query that returns a
dramatic result and confirms your hypothesis is the one to re-run** (kind 2). The finding survived
in a much weaker and more honest form — the agreement is exact and unasserted, which is a missing
check, not a broken graph.

**4. "`check-production-base.mjs` is orphaned."** It is not in `verify`, not in `ci.yml`, and
`grep` for its filename finds nothing in the workflows — which is exactly the mistake the sweep
documented making. It is in `deploy-pages.yml:69` as `npm run verify:pages`, the last gate before
Pages goes live. The sweep's self-correction was right and I reproduced its error before
reproducing its fix.

**5. "The sweep's count of 14 is wrong; I count 16."** I counted today's tree. Reproduced the
sweep's own filter at its own commit: `git ls-tree -r --name-only 07137d7 | grep -cE
"/(check|validate|verify)[-_][^/]*\.(mjs|py|sh)$"` returns **14**. Today it returns 15, because
`check-drafted-entries-published.mjs` was committed 15 minutes after the sweep. The sweep is
correct as written. What is wrong with it is the filter's shape, not its arithmetic — which is
KB3-6, and a different criticism than the one I started with.

**6. "`src/data/urdu-content.json` has drifted from `urdu-i18n/content/`."** Its mtime is 23
August and content files are newer. Reimplemented the builder read-only — the transform is a
one-liner — and compared: 168 slugs on both sides, no slug on one side only, **0 bodies
differing**. The finding is "there is no guard", which is true and worth fixing, and specifically
not "it is broken today".

**7. "Nothing guards against a bibliography vanishing."** `coverage.test.ts:113` asserts
`c.bibliography.items > 400` and `:114` asserts `withThreeOrMore > 80`, against a current 533 and
107. A guard exists. I would note in passing that the floor tolerates losing 133 citations — 25%
of the archive's provenance — before it fires, but a loose guard is not a missing one, and
tightening a floor is a judgement about how much legitimate movement to allow, not a defect.

**8. "An off-vocabulary `status` is invisible everywhere."** It is invisible on the shrine page,
in the filters and in the marker layer, but `buildArchiveReport` returns `statusUnknown` and
`buildCoverage`'s `tally()` returns `unrecorded`, and both are rendered — `ArchiveState.tsx:130`
and `CoverageStats.tsx:134` draw an "unrecorded" bar. So `/about` does show the damage to a reader
who looks. KB3-2 stands, with its claim narrowed: nothing *exits non-zero*, nothing names the
offending row, and the entry's own page says nothing at all.

**9. "Any dataset change without rebuilding the derivatives is silent."** The general form is
false. Adding or renaming a row changes its slug, which makes it uncovered in
`provenance.json`, which is a **hard error** in `validate.mjs` (not a warning — I checked which
list it is pushed onto). Independently, `snapshotFidelity.test.ts` reddens when the shipped
snapshot moves away from the newest dated CSV. Two real nets. The gap that survives is narrow and
specific: `kg.json` and `urdu-content.json`, which is what KB3-5 now claims.

**10. "`year_built_precision` and `site_type` are unguarded prose columns like `status`."** They
were, and are not — `validate.mjs` grew a guard for each on 29 and 30 August, and both fire today
on exactly the rows that deserve it. I had them on my list from reading the schema and removed
them by reading the validator. The residue is better than the finding I lost: it is *because*
those two were guarded and `status` was not that KB3-2 is an asymmetry rather than a general
absence.

**11. "Some self-hosted photograph URL will not resolve."** I expected at least one, given
`check_image_liveness.py`'s history of finding dead images. All 134 resolve to files present in
`public/photos/`. The 4 dead images in the standing findings are all on *external* hosts, which is
a different population, and I had conflated them. The finding became "no check exists" plus the
protected-list count — both of which I found only because the measurement I expected to confirm
something came back clean and I kept looking at the same data.

---

### One thing I could not check, recorded rather than omitted

I did not break any existing `--check` mode against deliberately damaged data, which
`MEASUREMENT_FAILURES.md` names as the standard for trusting a guard ("two of them turned out to
pass on damage they were written for"). Doing it properly needs a writable copy of the tree, and
this pass is read-only on a tree another session is committing to every few minutes. So: **the
nine `--check` gates are verified as *reached*, and not verified as *effective*.** That is a real
gap in this review and the next person with a scratch clone should close it — the cheapest version
is to copy `data/`, `src/data/` and `scripts/` into a scratch root, corrupt one field, and confirm
each gate exits non-zero and names the field.
