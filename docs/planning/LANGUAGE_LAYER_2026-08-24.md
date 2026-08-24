# The language layer — one refactor, two problems

*Written 24 August 2026. Every number below was measured that day; the commands are given so
they can be re-measured rather than quoted.*

## The claim

**N4's architectural cost and the eager Urdu payload are the same piece of work**, and doing
either one first makes the other harder. `NEXT_STEPS_2026-08-21.md` §4 already says to do N4's
type-level generalisation "now-ish while the i18n code is warm" — this says what that means
concretely, and why the payload finding (HANDOVER §9.89) belongs inside it rather than beside it.

## What is measured

```bash
# the split
node -e "const s=require('fs').readFileSync('src/lib/i18n/uiStrings.ts','utf8');
const i=s.indexOf('\n  ur: {');
console.log('total', Buffer.byteLength(s), '| en-side', Buffer.byteLength(s.slice(0,i)),
            '| ur table', Buffer.byteLength(s.slice(i)))"

# the union type, and the comparisons against a literal
grep -rn "'en' | 'ur'" src/ --include=*.ts --include=*.tsx | wc -l   # 10
grep -rn "lang === 'ur'" src/ --include=*.ts --include=*.tsx | wc -l # 55
```

| | measured 24 Aug 2026 |
|---|---|
| `src/lib/i18n/uiStrings.ts` | 71,508 bytes |
| — everything before the `ur:` key | 29,483 |
| — the `ur:` table alone | 42,025 |
| keys per language | ~460 |
| `'en' \| 'ur'` union declarations | 10 |
| `lang === 'ur'` comparisons | 55 |
| `lang !== 'ur'` comparisons | 11 — **missed by the grep above; see phase 2** |

**Every reader downloads both languages on every route.** 42 KB of Nastaliq interface copy
reaches an English-only reader who will never see a word of it. A third Arabic-script language at
the same density takes the eager cost to roughly **113 KB, a 59% increase**, and a fourth to
155 KB. This is the same shape as the waste `scripts/check-bundle-budget.mjs` was written to
catch — `urdu-content.json`, 1 MB of article prose, was a static import until 20 August — and it
is the reason that script exists at all.

It has already had a visible cost. Eight new interface strings added ~1 KB to *every* route's
eager JS and tripped `ShrinePage`'s budget: a route the change never touched, which happened to
be sitting at 495/495 with an annotation still reading "measured 457". A per-route budget cannot
express "a shared module grew", so the route with the least headroom takes the blame.

## Why the two are one job

Adding a language today means:

1. widening `Lang` in 10 places;
2. finding the right branch in each of **55** `lang === 'ur'` comparisons — and every one of them
   is really asking one of four different questions:
   - *is this script right-to-left?* (`dir`, bidi isolation)
   - *does this need the Nastaliq stack?* (`--font-urdu`, leading, tracking)
   - *should numerals be Eastern?*
   - *is there a translation for this datum at all?* (dictionary lookups, content overrides)
3. shipping a third string table to everyone, eagerly.

(2) is the expensive one and it is invisible in a diff: `lang === 'ur'` is correct today and
becomes silently wrong the moment a second RTL language exists, because half of those 55 sites
mean "RTL" and half mean "Urdu specifically". Nothing distinguishes them. That is a
plausible-assumption-never-cheaply-checked in the exact shape RULE 4 exists for.

And (3) cannot be fixed *after* (1) and (2) without touching all of it again, because the load
boundary is per-language: you cannot lazily load a table whose shape is hardcoded into a union at
55 call sites.

## The plan, in the order that keeps the build green at every step

Each phase ends with `npm run verify` and the Urdu e2e suite green, and is independently
committable. Nothing here changes what a reader sees until phase 3, and phase 3 changes nothing
either — it is the same behaviour expressed once instead of 55 times.

### Phase 1 — a language registry, replacing the union — **partly done before this plan, finished 24 August**

*Correction to this document as first written.* `src/lib/i18n/languages.ts` already existed, with
`LANGUAGES`, `Lang` derived from its keys, `isRtlLang`, `dirAttr` and `langAttr` — committed as
"N4 groundwork" in `5c5326e`. The plan above described phase 1 as undone. It was not; what was
missing was narrower, and worth stating precisely because a plan that overstates the work
remaining is how the same thing gets built twice:

- the table carried only `dir`, so `numerals` and `script` — two of the four questions the 55
  comparisons ask — had nowhere to live and were still being answered by `lang === 'ur'`;
- ten inline `'en' | 'ur'` literals had not been switched to `Lang`.

Both are now done. One record per language, carrying the properties the comparisons are actually
asking about:

```ts
export const LANGUAGES = {
  en: { dir: 'ltr', numerals: 'western', script: 'latin' },
  ur: { dir: 'rtl', numerals: 'eastern', script: 'nastaliq' },
} as const satisfies Record<string, { … }>;
export type Lang = keyof typeof LANGUAGES;
```

Three fields, not the four this document first sketched: `font` was dropped because it is not an
independent question — the type stack follows from `script`, and a second token saying the same
thing is a second thing to get out of step. `script` names the stack (`nastaliq`) rather than the
writing system (`arabic`), because what the code branches on is which metrics and which tracking
rules apply, and a Naskh-set Arabic-script language would want different ones.

`Lang` is *derived* from the registry, so adding a language is one entry and the type follows.
No behaviour change; the ten inline unions collapse to this.

**Done when:** `Lang` has one definition, `npm run verify` green, and a test asserts every
registry entry carries every property (a language missing `numerals` is a silent Western-digit
leak, which i18n rule 5 exists to prevent). **Done 24 August 2026.**

One thing learned while writing that test, worth carrying into phases 2 and 3: a test that checks
each helper against the field it reads is tautological on its own — set `ur: { dir: 'ltr' }` and
helper and table still agree, so everything passes. `languages.test.ts` therefore keeps both
kinds: the loops that prove a helper reads the right field, and flat anchors that pin what the
archive's two published languages actually are. The smaller file this replaced had only the
anchors, and swapping them for tidier loops would have been a downgrade.

### Phase 2 — retire `lang === 'ur'` in favour of what it means

Replace each of the 55 with the property it is testing: `isRtlLang(lang)`,
`usesEasternNumerals(lang)`, `needsNastaliq(lang)`, or a `Record<Lang, …>` lookup where the real
question is "is there a translation for this datum". Mechanical, reviewable one file at a time,
and this is the phase that makes a second RTL language *possible* rather than merely typeable.

Started 24 August: the i18n core is converted — `numerals.ts` (`localizeDigits` now asks
`usesEasternNumerals`, which matters because digit set and direction are genuinely independent)
and `LanguageContext`'s two `isRTL` derivations. Its third comparison is deliberately left as a
literal, with a comment: `if (lang === 'ur') void loadUrduContent()` asks whether *that payload*
applies, which is a fact about one file rather than about direction. Roughly 50 remain, thinly
spread — 1 or 2 per file across 30 files.

**Done when:** only the sites that genuinely mean Urdu specifically remain, each saying why, and
a lint rule blocks new ones. **Done 24 August 2026.**

*Second correction to the measurement.* The count was never 55. `grep "lang === 'ur'"` misses
`lang !== 'ur'`, and there were **11** of those — early-return guards in the dictionary and
content modules. The real total was **66**. The lint rule found them, which is the argument for
the rule over the grep: a selector on the syntax tree cannot miss an operator.

**39 converted, 27 remaining, and the remainder is the interesting part.** Every one of the 27 is
genuinely Urdu-specific, and almost all for the same reason: **the data has an `Ur`-suffixed
sibling rather than a per-language record.** `tour.titleUr`, `order.descriptionUr`,
`saint.nameUr`, the sheet's Urdu-only Description / Visiting Info columns, the Urdu article
content files, the Urdu name dictionary. `lang === 'ur'` there is not a shortcut for "is this
RTL" — it is the honest statement that this datum exists in exactly one other language.

So **phase 2 bottoms out at the data shape**, and that is a finding rather than a stopping point:
adding Punjabi needs `titleUr: string` to become `title: Record<Lang, string>` across the tours
file, the KG seeds, and the sheet's column naming. That is a data migration with a CSV patch and
a human import (RULE 3), not a refactor — which is worth knowing *before* someone budgets phase 4
as an afternoon.

Two conversions found while annotating, both of which the eye had passed over twice:

- `localizeProseDigits` still asked `lang !== 'ur'` while its sibling `localizeDigits` had been
  converted an hour earlier. Two functions in one file, one page apart, disagreeing about what
  they were testing.
- the **۱۲۳/123 numerals toggle** was gated on `lang === 'ur'`. It exists because Eastern digits
  are the reader's default and some readers prefer Western — a question about `numerals`. Gated on
  the language, a future Eastern-numeral edition would have silently had no toggle at all, which
  is the exact failure mode this phase is for, sitting in the control that i18n rule 5 is about.

The 25 that stay each carry `// eslint-disable-next-line no-restricted-syntax -- Urdu-specific: …`
with the reason. The rule is scoped to `src/` and excludes `__tests__` and `e2e/`: a spec that
parameterises over `['en', 'ur']` is describing the two editions under test, and forcing it
through the registry helpers would make the tests agree with the code by construction.

### Phase 3 — load a language's strings when that language is used

Follow the pattern already in this repo rather than inventing one: `ensureUrduSeedForLang` /
`onUrduSeedLoaded` in `src/lib/i18n/urduFallback.ts` already load the Urdu *dictionary* on demand
and notify on arrival. The string table gets the same treatment.

**The hard constraint, and it is non-negotiable:** `t()` is synchronous at every call site, and an
English flash in the Urdu view is not an acceptable intermediate state — the mission bar is
"equally excellent in both languages", and a reader whose page reads English for 200ms has been
told which language is the real one.

Two facts make this tractable:

- `detectInitialLang` runs before render, so the *active* language is known at module init and its
  table can be requested immediately.
- every route is already prerendered in both languages (`/ur` mirrors, `scripts/prerender.mjs`),
  so the first paint is server-rendered HTML in the right language regardless.

So the load is gated on the active language only, and the *other* language's table is fetched
lazily on toggle — where a brief pending state is honest, because the reader just asked for a
change and is watching for one.

**Done when:** the English route's eager JS drops by ~40 KB (measured, and `check-bundle-budget.mjs`
budgets lowered to match — a budget that does not fall when the payload does is how "measured 457"
became a page sitting at 495), the Urdu route shows no English at any point in a cold load, and
`e2e/urdu-no-leak.spec.ts` stays green including on a throttled connection.

### Phase 4 — Punjabi in Shahmukhi becomes a content task

Only now. One `LANGUAGES` entry, one string table, and the whole Nastaliq/RTL/Eastern-numeral
stack applies by construction.

**This phase is gated on editorial capacity, not engineering**, and the plan should say so
plainly: 0 of 168 Urdu articles have been read by a human (NEXT_STEPS §0), and that is already
the project's largest queue. A third language triples the reviewing debt while the second
language's debt is untouched. The refactor's value is that Punjabi stops being an *architecture*
decision and becomes a scheduling one — not that it should be scheduled now.

## What this plan deliberately does not do

- **It does not touch `urdu-content.json` or the dictionary.** Both are already lazy. The finding
  is specifically about `uiStrings.ts`, which is not.
- **It does not add Punjabi content.** See phase 4.
- **It does not machine-translate anything.** A Punjabi string table authored by a machine and
  shipped unreviewed would repeat, in a third language, the debt the second one already carries.

## Why this and not N1/N2/N3/N5

Checked against `NEXT_STEPS_2026-08-21.md` §4 rather than chosen by preference:

- **N1 (Ask the Archive)** is explicitly gated behind F7 claim-level provenance, and building it
  first "would launder exactly the uncited prose this project spent August citing".
- **N2 (Wikidata round-trip)** is gated on a media-licence audit — "we push nothing whose rights
  we can't state" — and on network access this sandbox does not have (HANDOVER §9.53).
- **N3 (field-kit PWA)** is for one named surveyor and its value is realised on a trip, not in a
  repo; it also needs decisions about Drive keys that are not an agent's to make.
- **N5 (adopt-a-shrine)** takes money. That is a decision about the project's public commitments,
  not a feature.
- **N7 (typology atlas)** and most of **N6** have shipped — `/typology` and `/report` exist.

This one needs no external service, no editorial decision and no money; it removes a measured
cost from every reader on every route; and it is the prerequisite the project's own plan already
identified for the next language. It is also, bluntly, the piece most likely to be got wrong
later by someone who does not know that half of those 55 comparisons mean "RTL" and half mean
"Urdu".
