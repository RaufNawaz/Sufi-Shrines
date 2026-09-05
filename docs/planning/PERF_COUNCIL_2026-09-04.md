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

## 2. Findings

*(filled in as the seats report)*

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
