# Performance council — 4 September 2026

**Brief from Rauf:** *"the website is not very smooth and a lot of the features feel very slow
and chunky … work deeply on making the website more efficient and smooth — no new features,
just improving the existing ones."*

Five seats, one lens each: React render economy · the Leaflet marker layer · the language
switch and the Urdu/dataset path · route transitions and module evaluation · CSS, animation
and compositing. Councillors verify against the real code, never edit, and rank by what a
reader feels.

---

## 1. What was measured first, and why it is a new instrument

Every performance instrument this repository already has — `measure-lcp.mjs`,
`measure-cls.mjs`, `measure-blocking.mjs`, `check-bundle-budget.mjs` — answers *how fast does
the page arrive*. **None of them answers how it feels to use**, and that is the entire
complaint. The two are optimised against each other: a route can pass every load budget here
and still freeze for two-thirds of a second when the language toggle is pressed, because the
cost is not in the download.

So `scripts/measure-interaction.mjs` (new, `npm run perf:interaction`) drives seven scripted
interactions against a **preview build** at **4× CPU throttle** on a **390×844** viewport and
reports, per interaction: total blocking, the single longest task, the worst frame gap, and
the browser's own event-timing latency.

### The baseline — median of 7 runs, 4 September 2026

| interaction | blocked | longest task | INP | worst frame |
| --- | --- | --- | --- | --- |
| **language toggle** EN→اردو | **810 ms** | **696 ms** | 56 ms | **700 ms** |
| **route nav** map → shrine | 273 ms | **323 ms** | — | **333 ms** |
| select a map marker | 109 ms | 65 ms | 48 ms | 67 ms |
| map pan | 83 ms | 82 ms | 104 ms | 68 ms |
| filter chip press | 0 ms | 0 ms | 72 ms | 33 ms |
| search typing | 0 ms | 0 ms | 32 ms | 18 ms |
| shrine article scroll | 0 ms | 0 ms | — | 18 ms |

**Two interactions carry nearly all of the felt cost**, and three are already clean. Search,
filtering and article scrolling produce no long task at all — so the "slow and chunky"
complaint is not diffuse, and a diffuse response to it would be busy-work.

### Read the spread before believing a row

The instrument prints `min–max` beside every median, and it earns that column. The **first**
run of this script reported the language toggle at 696 ms and the map pan at 81 ms; the
**second** run of the same build reported 140 ms and 159 ms. Both were medians of three. Only
at `--runs 7` did the picture hold still — and the language toggle stayed **bimodal**
(241 ms and 838 ms), which is not noise but two different code paths, and is itself a finding
handed to the seat that owns it.

This is `feedback_measure_before_recording` applied to the instrument written to test it:
**the number to distrust first is your own.**

### Two defects in the instrument, found and fixed before any finding rested on it

1. **It dated its own output in UTC.** `new Date().toISOString().slice(0, 10)` returns
   *tomorrow* when run after 20:00 EDT, and this was written at 23:13 local. A report from it
   would have carried 5 September — a day that has not happened — which is exactly the defect
   `src/test/datedClaims.test.ts` exists for (48 measurements across 23 files, commit
   `0c72998`), and that guard defines "today" from the **local** getters, so it would have
   flagged the file. It now uses the local calendar date, matching the guard.
2. **It must not run beside anything else.** It throttles the CPU to a quarter and then
   measures main-thread busy time; a second copy, a Playwright suite, or a `vite build` beside
   it competes for the cores under measurement and both runs come out wrong in the same
   believable direction. Recorded in the script header rather than left to be rediscovered as
   a mystery.

---

## 2. The number this council corrected, before anything else

**The 696 ms language toggle in the table above is overstated, and the correction
came from the council rather than from the person who published it.**

Seat 3 re-ran the same scenario against the same build at `--runs 9` and got
**blocked 272 ms (241–362), longest 147 ms (131–219)**. Across a further ~45 runs
of its own probes a task over 600 ms appeared **twice** — roughly 1 in 15. So the
honest description is *a ~272 ms interaction with an occasional tail past
600 ms*, and the baseline's 7-run sample happened to land in the tail often
enough to report it as the median. The `241` in the baseline's range is exactly
seat 3's minimum; the `838` is the tail.

Two things follow, and both are more useful than the original number:

1. **This scenario needs ≥9 runs.** Recorded in the script and in the table below.
2. **The spread column did its job.** The bimodality was visible in the baseline
   as `(241–838)` and was flagged as "two code paths, not noise" before anyone
   went looking. It was two code paths. What the median got wrong, the range
   got right — which is the argument for printing both.

---

## 3. Findings, and what was done about them

Ranked by what a reader feels. **Consensus findings — reached independently by two
seats from separate profiles — rank highest**, and there were three.

### Shipped

| # | Finding | Seats | Commit |
| --- | --- | --- | --- |
| 1 | **The route-navigation freeze was the map leaving, not the shrine page arriving.** `maplibregl.Map#remove()` ran synchronously inside React's commit — 330 ms of self time. A counterfactual matrix separated it: map→shrine 340 ms, `/about`→shrine 63 ms, map→`/settings` 267 ms, shrine→shrine 0 ms. | 4, 1 | `726b288` |
| 2 | **A language toggle rebuilt the entire vector basemap** for a change that only affects label text — 27 non-image requests, the basemap blanking and redrawing under the pins ~1 s after the press. Now relabels the live map: 0 style, 0 sprite, 5 requests, all glyph ranges genuinely needed. | 3 | `726b288` |
| 3 | **The archive re-indexed itself once per bibliography line.** `useMemo` is per component *instance*, so `SourceReach`'s memo deduplicated nothing across siblings: a median entry rebuilt the whole-archive source index 3× per navigation, Data Darbar 7×. ~44 ms of a 273 ms navigation, ~85% redundant. | 1, 4 | `892b827` |
| 4 | **Every shrine page parsed its article twice**, and twice again on every language toggle — two `useArticleContent` instances sharing nothing. ~31 ms/navigation, about half duplicate. | 1, 4 | `892b827` |
| 5 | **Selecting a fanned pin silently erased `shrine-dot--fanned`** — the class that says "this pin is not at its own coordinates" — because Leaflet's `_setIconStyles` rewrites `className` wholesale. It also re-created the `<img>`, flashing an empty ring on the marker the reader is looking at. A correctness bug, not only a cost. | 2 | `0b22e3e` |
| 6 | **Every article page re-measured a header height that could not have changed**, forcing layout on a DOM rebuilt milliseconds earlier: 36 ms, the second-heaviest node in a navigation. | 4, 5 | `9a4a8b2` |
| 7 | **One press drew the whole map twice.** The Urdu dictionary was not requested until after the flip rendered, so 169 markers were removed and re-added at +88–210 ms and *again* at +514–612 ms. Plus three Nastaliq faces discovered one at a time, each costing an 89–124 ms full-tree relayout. | 3 | `a6f53d4` |
| 8 | **Four palette animations retained a transform this repo already documents as a hazard** (`both` where `global.css` mandates `backwards`), `palette-row-in` across all 40 rows; three map controls carried `transition: all`. | 5 | `ddbdfd1` |

### Where a council proposal was measured and *not* taken

**Seat 3 proposed awaiting the Urdu dictionary before flipping the language.** It
measured its own proposal, which is why the proposal is trustworthy and why it
was declined: the two marker rebuilds do collapse into one, and blocking got
**worse** (302 → 367 ms median) because the work concentrates into a single
longer task. It would also delay the visible answer to a tap by up to 300 ms —
a regression in precisely the responsiveness this cycle exists to fix. The
request is now *started* at the press and not awaited, which narrows the gap
between the two paints and makes the reader wait for neither.

**Seat 2 proposed halving the marker flight from 0.9 s to 0.45 s.** Its
measurement is solid — one tap fires **34 `zoom` events**, each reaching **170
listeners** (169 markers plus the GL basemap), so ~5,750 `Marker.update()` calls
and 34 unthrottled `jumpTo()` per tap — and halving the duration halves both
fan-outs. **Not taken, because it is Rauf's call and not an agent's.** The
tap-flight motion was deliberately designed and amended by him on 1 September
2026 ("tap flies, depth fans, motion glides"), and quietly halving a motion
constant he tuned last week is a design change wearing a performance argument.
The constant is duplicated at four sites, which is its own defect and is noted
below. **Decision needed.**

### Null results — recorded so they are not re-proposed every council

Seat 5 declined to report `backdrop-filter` on reasoning and ran counterfactuals
instead: 7 paired, interleaved samples per arm against the live preview.
**Turning off `.palette-backdrop`'s blur, `.palette`'s blur, or both, moves
nothing** — INP was exactly 72 ms in all 28 samples across all four arms, which
is frame cadence under a 4× throttle rather than a paint cost. Same null for the
tabbar, sidebar-header, zoom-button and attribution blurs against a map pan.
`palette.css`'s own warning that "stacking backdrop-filters is expensive" is true
in general and **not true here**.

Seat 1 retracted two plausible findings after benchmarking them: the `sr-only`
171-link directory is 43% of the map page's DOM nodes and memoizing it buys
nothing measurable; `parseEra`'s 21 uncached regexes cost 0.174 ms for a full
169-row pass.

### Open, ranked, not yet taken

1. **Every language, filter and lens change destroys all 169 markers and builds
   169 new ones** (seat 2, TOP) — ~2,700 listener registrations and 114 `<img>`
   re-created, measured floor 16.8 ms for the DOM half alone. Only the tooltip
   and three attributes are language-dependent. Wants reconciliation against
   `markerMapRef` rather than a layer-group teardown. The largest remaining item.
2. **The browse directory renders all 171 rows unwindowed and unmemoized**
   (seats 1, 5) — a filter press costs 99–218 ms in table mode against 72 ms with
   the list closed, on a path the reader chooses from `/settings`.
3. **The sidebar animates `width` and `height`**, neither compositable (seat 5,
   TOP) — the phone sheet animates height 184→641 px over 250 ms, re-laying out
   up to 169 rows ~15 times per gesture.
4. **124 KB of provenance JSON ships on every shrine navigation** for a panel
   behind `?team=1` (seat 4). Zero CPU cost — it is bytes, not milliseconds.
5. **Nothing warms the `ShrinePage` chunk** before a tap the marker preview has
   already made unambiguous (seat 4).
6. **38 of 114 marker photographs are fetched at full resolution to paint a 30 px
   circle**; 14 are this repository's own, totalling 4.7 MB (seat 2).
7. **The flight duration is written at four sites** rather than once in
   `mapMotion.ts`. Worth centralising whichever way the duration decision goes.
8. **Zero `contain` / `content-visibility` in 14,145 lines of CSS** (seat 5) —
   explicitly unmeasured, and the list scenario it would affect is not yet in the
   harness.

---

## 4. Instrument notes worth more than most findings

Three, all from seats that hit them the hard way.

- **A V8 CPU profile taken under `Emulation.setCPUThrottlingRate` is useless for
  attribution.** Seven profiles put 1,616–2,184 ms of a ~1,700 ms window into
  `(program)`, because the throttle's busy-pause is charged there. Use
  `Tracing.start` with `devtools.timeline`, which attributes Layout, Commit and
  Paint — where this interaction's time actually is.
- **Filter trace `RunTask` events to the `CrRendererMain` thread.** Unfiltered,
  the largest "tasks" are 646–782 ms `GPUTask` entries on the GPU process, which
  look exactly like the freeze being hunted and are not on the main thread.
- **The harness's own map-pan number is partly an artefact.** It drives the pan
  with `page.mouse`, and the per-marker `mouseover` → `setZIndexOffset` →
  `Marker.update()` that causes does not happen under a finger. The 83 ms is an
  upper bound for a desktop pointer, not a phone measurement.

And the one this cycle re-learned: **two seats and the synthesiser all measured
while other agents were running.** Load average hit 21.5 with 20 node processes;
one arm of a counterfactual read 4,818 ms of blocking. Every number in this
document that moved under contention was re-taken on an idle machine, and the
script now says so in its header.

---

## 3. Found while measuring, out of this council's brief

**A citation can be dated a day that has not happened — the same UTC defect, in the reader's
copy.** `src/components/shrine/CiteThisEntry.tsx:70` and `src/lib/data/citation.ts:71` build
the *accessed* date with `toISOString().slice(0, 10)`. The archive's primary audience is in
Pakistan (UTC+5), where **every visit between 00:00 and 05:00 local cites yesterday**; a
reader in the Americas after 20:00 cites tomorrow. `CiteThisEntry` is worse than inconsistent
— line 70 takes the date in UTC and line 74 takes `now.getFullYear()` in local time, so on
1 January the year and the date in one citation can disagree.

This matters more here than it would elsewhere: the accessed date exists *because* the archive
reads a live sheet and can change under the reader, so it is the one field carrying the
provenance claim. Not fixed in this cycle — it is a correctness defect, not a smoothness one,
and the brief was explicit. Queued rather than folded in.
