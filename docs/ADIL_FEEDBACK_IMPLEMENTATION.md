# Adil's feedback — what was implemented, and where to look

Fourteen items, checked against the code on **14 September 2026**. Every "done" below was
verified in this repository today, not recalled: the file paths and test names are the evidence,
and where a claim rests on an earlier session's report rather than a check made today, it says so.

Two things to read first:

- **Items 3.2 and 4 contradict each other.** 3.2 asks for *"Adil Ahsan and Rauf Nawaz"*; 4 asks
  for *"Rauf Nawaz Adil Ahsan"*. Rauf settled it on 11 September — **Adil first** — and that is
  what ships. Noted again under item 4 so nobody re-opens it by reading the list top to bottom.
- **Item 3.1 (a public version) is built and live.** It is the answer to a question asked
  separately, so it has its own section at the end.

---

## The fourteen

### 1. Push toward features with epistemological value, not gadgets

**Done, and it is now most of the site.** The routes that carry the argument rather than the
interaction all exist and are prerendered: `/order/:slug`, `/chronology`, `/tradition/:slug`,
`/shared-ground`, `/graph`, `/typology`, `/place/:slug`, `/saint/:slug`.

The distinction Adil drew is the one the archive has been built on since: `/shared-ground`
computes that **37% of sites stand within 800 m of another and 40 of those pairings cross a
tradition, over 42 sites with all six traditions represented** — a claim no amount of guided-tour
polish would have produced. `/chronology` and `/order/:slug` are the same shape: the data
arguing with itself in public.

Tours were not removed. They are a small part of the surface now rather than the headline.

### 2. Urdu — spacing, font size, words flowing into one another

**Done, in two passes, and the second one found why the first had not worked.**

- `docs/URDU_TYPOGRAPHY_2026-09-11.md` — the spacing pass. Leading, word-spacing, the
  size scale.
- `docs/URDU_TYPOGRAPHY_2026-09-14.md` — the pass that fixed it, after Rauf reported the
  complaint had survived.

The finding worth repeating to Adil, because it explains the earlier failure: **Noto Nastaliq
Urdu's own content box is 2.500em.** Setting `line-height: 2.05` was therefore *below the face's
natural line* — the ink of one line necessarily entered the box of the next. That is literally
"the words are flowing into one another", and no leading value under 2.5 could have fixed it.

The archive now sets Urdu in **Mehr Nastaliq Web** (the face rekhta.org uses; calligraphy
Nasrullah Mehr, design Zeeshan Nasar, CSaLT at Information Technology University of the Punjab,
Lahore; CC BY 4.0, credited on `/about`). Its box is **1.792em**, so the same leading finally
leaves air. Side effects: the Urdu reader's font payload went from **481 KB to 43 KB**, and the
service-worker precache from 481 KB to 202 KB for *every* visitor.

The furniture went with it — the fact panel de-boxed to hairline rows, the bibliography set as
proper left-to-right hanging-indent entries, the contents rail widened so entries stop wrapping,
the chrome gaps halved.

### 3.1. A public-facing version that hides what is only useful to us

**Done — see "The public/team split" below.**

### 3.2 & 4. Citation: two names and the website, nothing else

**Done.** `PUBLICATION.author` is `'Adil Ahsan and Rauf Nawaz'`
(`src/lib/data/citation.ts`); the page credit reads *"By Adil Ahsan and Rauf Nawaz"*
(`aboutCredit` in `src/lib/i18n/uiStrings.ts`).

No institution and no address appear anywhere public, and that is **enforced rather than
intended**: `src/lib/data/__tests__/citation.test.ts` greps `CITATION.cff`, `codemeta.json`,
`LICENSE-data.md` and `data/datapackage.json` for an institution name and for an e-mail address
and fails the build on either. `CONTACT_EMAIL` is empty until there is a project address that is
not a person's.

**On the order:** items 3.2 and 4 disagree. Rauf ruled on 11 September, in the second of two
messages that day, that Adil comes first. The test asserts it, so the order cannot drift.

### 5. Domains and hosting — "Spiritual Sites Pakistan", GoDaddy or otherwise

**Researched, not bought.** `docs/DOMAIN_AND_HOSTING_2026-09-11.md` has the whole thing:
availability checked against RDAP and PKNIC's whois (each instrument verified against a known
answer before its results were recorded), prices tagged **verified** / **third-party** /
**derived** so nobody treats a comparison-site number as a quote.

Recommendation on the page: **`spiritualsitespakistan.org`**, with `sacredsitespakistan.org` as
runner-up, plus the matching `.com` defensively (≈US$11/yr). Against `shrinesof…`, because the
archive outgrew the word "shrines" on 30 August — **88 of 171 sites are not one**.

**Three decisions are Rauf's and still open**: which name, whether to take the `.pk` (the
recommendation is not now), and whether the GitHub URL keeps redirecting.

### 6. Cleaner and more visually appealing everywhere; the About page says too much and nothing

**Done for `/about`; partly done as a general sweep.**

The About page's own source records the verdict and the fix: the merged page ran to twenty-four
sections, and the answer was not to cut them but to split the readers. It is **18 sections, of
which 3 are team-gated**; a visitor reads what the archive is, who made it, what it holds, how to
cite it, the licence, and where to send a correction. The measured self-account — graph counts,
trust ledger, coverage breakdowns, the Urdu mirror's progress, what was lost — is the team's
instrument and is behind the gate. `/coverage` and `/report` redirect into the team sections.

The general sweep has run over the Urdu surfaces (14 September) and over the entity pages
(13 September). **It has not run over the English pages as a redundancy pass** — that is the open
half of this item.

### 7. "Urs Almanac" → "Urs Calendar", and make the calendar not hideous

**Rename done and verified today**: `almanacTitle: 'Urs Calendar'`, and the cross-references read
"See it in the Urs Calendar". The route is still `/almanac` — a URL, not a label, and changing it
would retire a published address for no reader's benefit.

**The calendar revamp shipped on 26 August** per `docs/HANDOVER.md`; I did not re-inspect it
today, so treat "resembles Google Calendar" as reported rather than re-verified.

### 8. "Table of Shrines" → Search; bigger filters and groupings

**Done.** The sidebar button is `tableButton: 'Search'`. The grouping vocabulary is the six
categories in `src/lib/data/categoryKey.ts` (`CATEGORY_ORDER`, `CATEGORY_LABELS`) — Muslim Shrine,
Hindu Temple, Sikh Gurdwara, Nanakpanthi/Udasi Darbar, Jain Temple, Secular/Memorial — bilingual
at the source. `e2e/directory-mode.spec.ts` holds the behaviour in both languages at desktop and
phone.

### 9. Malik Ahmad Ayaz's map preview overflows with more text than the others

**Done, and the cause is in the data rather than the layout.** That row's `Location` cell is a
paragraph of survey qualification — *"Shah Alam Market; the survey places the mazar near Darbar
Ali Hajveri… Ask Saifullah for a precise pin when possible."* — and its figure cell is a
sentence naming three variant spellings. Under RULE 2 the archive prints what the source says,
so the fix had to be typographic.

`.preview-clamp` in `src/styles/map.css` clamps the location and figure rows to two lines with an
ellipsis, and `.preview-description` clamps to four. Both leave a little room below the last line
rather than clipping, because Nastaliq's descenders fall outside the line box.

### 10. Rename the support badges

**Done, exactly as asked.** In `src/lib/i18n/uiStrings.ts`:

| Sheet value (unchanged) | Label shown |
| --- | --- |
| `Field-verified` | **Field documented** |
| `Source-documented` | **Book verified** |
| `Source-seeded` | **Text documented** |
| `Web-compiled` | **Web compiled** |

The sheet values are join keys and were deliberately **not** renamed — RULE 3. The rules behind
each badge are in `docs/planning/BADGE_GLOSSARY.md`.

### 11. Remove the extra linkages at the end of the page

**Done, both halves.**

- **Nearby shrines is gone from the page.** `findNearbyShrines` still exists in
  `src/lib/data/shrineModel.ts` and is referenced only by its unit tests — nothing renders it.
- **Related shrines is capped at 4 and ranked the way Adil described**:
  `findRelatedShrines(shrine, all, limit = 4)` scores `same order +4`, `same category +1.5`,
  minus `distance / 150 km` — so the same silsila outranks mere proximity, and proximity breaks
  the tie. That is "the most similar order and the ones that are the closest", in that order.

### 12. Events as bullet points in the shrine facts sidebar

**Done.** `ShrineInfobox.tsx` renders the Events cell as `<ul className="infobox-bullets">`,
one bullet per recorded observance, with the marker in the muted colour and padding rather than a
margin so the disc sits inside the row's own inline edge in both scripts.

### 13. Remove the notes in the founded row

**Done, for the public.** `showQualifiers = hasProjectAccess()` in `ShrineInfobox.tsx` gates both
the precision qualifier and `year_built_note`. A visitor sees the year; the team sees the year,
the qualifier and the source's note. The data is untouched — RULE 2 still holds in the sheet and
in the team view.

### 14. Remove the "approximate" badges from the public view

**Done.** The per-date approximate pill is team-facing from 11 September, in
`ShrineObservances.tsx`, `components/almanac/ObservanceCard.tsx` and `SaintPage.tsx`. A Hijri
projection is still *computed* the same way for everyone; only the qualifier that explains its
imprecision is behind the gate.

---

## The public/team split — item 3.1 in full

**Yes, this is built and it is what most of items 3.1, 6, 13 and 14 are implemented on top of.**

One soft gate, `hasProjectAccess()` in `src/lib/projectAccess.ts`: visit any URL once with
`?team=1` and the flag persists in `localStorage`. Fourteen files consume it —
`ShrinePage`, `AboutPage`, `SaintPage`, `OrderPage`, `PlacePage`, `TraditionPage`, `GraphPage`,
`AlmanacPage`, `ReviewPage`, `ShrineInfobox`, `ShrineObservances`, `LineageView`,
`RecordedObservanceList`.

**Team-only today:** the measured self-account on `/about` (the coverage, trust and graph
ledgers), the founded row's precision qualifier and note, every "approximate" pill on Hijri
projections, `SourcesProvenance`, `/review`, and — since 13 September — the entity pages' review
chips, file-path citations and raw location strings.

**Be clear about what it is not.** The source file says so in its first sentence: this is **not
security**. The site is static and its data is a publicly published Google Sheet fetched at
runtime, so every field is fetchable regardless of what the interface draws. The gate keeps a
casual visitor from stumbling into internal editorial detail. It would not stop anyone who looked.

`e2e/about-merge.spec.ts` and `e2e/entity-team-gate.spec.ts` hold both shapes.

---

## What is still open

1. **The English redundancy sweep** (item 6's second half). The Urdu surfaces and the entity
   pages have been swept; the English pages have not been read for redundant or repetitive
   elements.
2. **Three domain decisions** (item 5): which name, `.pk` or not, and whether the GitHub URL
   keeps redirecting.
3. **The calendar's appearance** (item 7) is reported done and not re-verified since 26 August.
4. **Evidence quotes on the public entity pages** — the English sentence under every lineage, kin
   and membership row is still public. Recommendation on file was to gate it on saint/order/graph
   and keep it on `/tradition/:slug`; awaiting a ruling.
5. **A measured accessibility failure in the English view**: the contents-rail links are 27px
   tall against this project's own 44px minimum. Not Urdu, not new, found while measuring
   something else on 14 September.
