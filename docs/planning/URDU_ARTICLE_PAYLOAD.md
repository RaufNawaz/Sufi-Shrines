# The Urdu article payload — 253 KB on every Urdu route, for three consumers

**Measured 30 August 2026** against a production build served from `vite preview`, phone
viewport, cold context per route. Written before any change, so the numbers below describe the
site as it stands.

---

## The measurement

Every chunk each route actually downloads, largest first. Raw bytes off the wire.

| route | `?lang=ur` total | of which `urdu-content` |
| --- | --- | --- |
| `/` (map) | 3,148 KB | **987 KB** |
| `/shrine/data-darbar` | 1,955 KB | **987 KB** |
| `/saint/data-ganj-bakhsh` | 2,114 KB | **987 KB** |
| `/about` | 1,886 KB | **987 KB** |
| `/almanac` | 1,762 KB | **987 KB** |
| `/graph` | 2,039 KB | **987 KB** |
| `/place/lahore` | 1,752 KB | **987 KB** |

The same file every time: `dist/assets/urdu-content-*.js`, **1,010,913 bytes raw, 258,872
gzipped**. The English column of the same table does not contain it at all — the gate works,
for the axis it was built for.

**So an Urdu reader downloads 253 KB gzipped of shrine article prose in order to look at the
map, the calendar, the graph, or a place page**, none of which render a word of it. On a
metered connection in Pakistan — the archive's primary audience, on phones — that is the single
largest avoidable transfer on the site.

## Why it is like this, which is not carelessness

The load is deliberate and documented in three places, and each reason is sound on its own:

1. **`useShrineData` builds every row exactly once.** `fetchShrines`, `loadIndex` and
   `loadSnapshot` each `await ensureUrduContentForLang(lang)` before building, because the
   search index is built from the rows and an index built before the Urdu lands has an empty
   `urduName` on all 169 documents — the bug `e2e/search-bilingual.spec.ts` exists for.
2. **`LanguageContext` requests it the moment the language becomes Urdu**, so a mid-session
   switch does not leave English prose on screen.
3. **English prose in the Urdu view is forbidden outright** (i18n rule 7), and a row cannot tell
   "there is no Urdu here" from "the Urdu has not arrived" — both read as an empty field. This is
   `useUrduArticlesReady`'s whole subject: measured 28 August 2026, switching to Urdu on the map
   left the entire English lead of the preview card on screen for **4.7 seconds**.

The gate is on **language**. What it is missing is that it is not also on **need**.

## Who actually needs it

Only three surfaces read a merged Urdu article field. Everything else on every route reads names,
locations, dates and observances, which come from the sheet and the 80 KB dictionary.

| consumer | when | already gates on readiness? |
| --- | --- | --- |
| `ShrinePreview` (map sidebar card) | a shrine is selected | **yes** — renders empty, never English |
| `TourPanel` (visiting info) | a tour is running | **yes** |
| `useArticleContent` (the shrine article) | a shrine page is open | **no** — see the risk below |

`urduArticleIndex.ts` answers "does this entry have an Urdu article?" from a **6 KB** slug list
precisely so that nothing else has to load the payload to ask. `/about` uses it. The pattern to
extend is already in the codebase.

## The plan, in stages

### Stage 1 — gate on need as well as language

Move the trigger from `LanguageContext` + `useShrineData` to the three consumers. Rows build
without the articles; `onUrduContentLoaded` already re-merges and re-renders them
(`rebuildWithUrduContent`), which is the same path a mid-session language switch uses today.

Expected effect, to be re-measured rather than assumed: `/almanac`, `/graph`, `/chronology`,
`/typology`, `/place/:slug`, `/tradition/:slug` and `/about` fetch **none** of it. The map fetches
it when the reader first opens a shrine, not on arrival. The shrine page is unchanged.

**The one real risk, and it is not the flash.** `useArticleContent` derives
`urduArticleMissing` — the declaration that an entry has no Urdu article — from an empty field.
With the payload absent that is true of all 168 entries, so the page would tell an Urdu reader
that every entry is untranslated, in English, and mean it. **That is a false claim, not a flash**,
and Stage 1 is not shippable without gating it: the shrine article must render a pending state
while the payload is in flight, exactly as `ShrinePreview` renders nothing rather than English.

### Stage 2 — shard the payload by slug

168 articles, ~6 KB raw each. A shrine page needs **one**. Sharded, the Urdu shrine page goes
from 253 KB gzipped to roughly 1.5 KB, and the preview card fetches one shard on selection.

Requires: a generator beside `build-urdu-article-index.mjs`, a `--check` in `data:validate` (the
same contract that file already holds), and a per-slug readiness signal in place of the global
`isUrduContentLoaded()`.

Stage 2 is worth doing and should not be attempted before Stage 1 is measured, because Stage 1
removes the payload from the routes where it is pure waste and Stage 2 only improves the routes
where it is genuinely needed.

## Out of scope

- **The 80 KB dictionary stays where it is.** Names, places and categories are rendered on every
  route, so it is needed on every route. It is already separate and already language-gated.
- **No Urdu content is written, edited or drafted here** (RULE 2). This is a transport change.
- The two entries with no Urdu article at all remain a content debt; `urduArticleMissing` exists
  to declare it and must keep working.
