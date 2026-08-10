# Shrines Project — Content Quality, Source Strategy & Field Data Plan

**Prepared by:** Rauf Nawaz
**Date:** 9 August 2026
**In response to:** Adil's big-picture comments on the Sufi Shrines site
**Status:** Internal working plan. Sections 1–4 are what I propose to do; Section 5 is the feedback package for Saifullah; Sections 6–8 are schema, sequencing and cost.

---

## 0. The core argument

Adil's framing is right and it should drive everything: **the LLM-generated history is the product**. The map, the filters, the photo galleries — all of that is scaffolding around a few hundred words of prose per site. If that prose is wrong, thin, or bland, nothing downstream fixes it. And unlike the code, we cannot cheaply redo it later at scale: once a hundred shrine pages are written, reviewed and cited, re-generating them means re-reviewing them.

So the right move now is to **treat content generation as a system to be tested, not a task to be completed**. Concretely that means four things, in this order:

1. **Measure** what the current pipeline actually does to a known source (Section 1).
2. **Upgrade** the pipeline where measurement shows it is losing information (Section 2).
3. **Loosen** the prompt in the right places and tighten it in others (Section 3).
4. **Widen the input** — anthologies, gazetteers, multi-site sources — so that content quality scales beyond the sites we can physically visit (Section 4).

Everything else (tagging, Saifullah's data) supports these.

---

## 1. Fidelity audit: does transcription → translation → summary actually survive the trip?

**Adil's concern:** niche vocabulary — silsila names, Persian/Arabic terms — may be getting mangled or dropped, and we have never checked.

He is almost certainly right that there is loss, and I can name where I expect it before we even look. Our current chain is:

> scanned Urdu book → my open-source OCR → literal English translation → GPT summary → sheet → website

There are **four** lossy steps, and the two in the middle are the dangerous ones:

| Step | Failure mode | Why it hits niche terms hardest |
|---|---|---|
| OCR | Nastaʿlīq ligature errors, missing/misplaced iʿjām (dots), broken diacritics | Proper nouns have no linguistic context to self-correct from. A misread in ordinary prose gets fixed by the sentence around it; a misread in "سہروردی" just becomes a different word. |
| Literal translation | Word-for-word rendering with no contextual understanding — I flagged this to Adil in June | Technical terms get *translated instead of transliterated*. `silsila` → "chain", `sajjāda nashīn` → "one who sits on the prayer mat", `ʿurs` → "wedding". The specialist meaning evaporates. |
| Summarisation | Compression drops what the model does not recognise as important | The model deprioritises unfamiliar tokens. A garbled order name looks like noise and gets cut. |
| Manual sheet entry | Transcription typos, inconsistent romanisation | We already have the Sindh/Sind case as proof this happens. |

**The audit protocol.** I want to do this properly rather than eyeballing it, because eyeballing will find the obvious errors and miss the systematic ones.

Pick **two shrines**, not one: one where we have a dedicated book (I would use Bibi Pak Daman, since it is the page Adil singled out and it is the one going in front of Auqaf), and one where the source is a chapter in a broader work (Mian Mir). Different source types fail differently.

Then, for each:

- **(a) Build a gold-standard reference by hand.** I read the Urdu source myself and write down every checkable fact: names, dates, lineages, silsila affiliations, place names, quoted verse, institutional claims, ritual practices. Expect 60–120 atomic claims from a 100-page book. This is the slow part — roughly a day per shrine — and it is unavoidable, because you cannot measure fidelity without a ground truth.
- **(b) Precision check.** Every sentence on the live page gets mapped to a source claim, or flagged. Three buckets: **supported** / **distorted** (source says something adjacent but different) / **unsupported** (not in the source at all — i.e. hallucinated or imported from the model's priors). Unsupported claims are the most damaging, because they read exactly as authoritative as the true ones.
- **(c) Recall check.** Go the other direction: of the gold-standard claims, how many made it to the page? This is the check Adil specifically asked for — "is it leaving out useful stuff?" — and it is the one nobody ever runs, because you have to have read the source to run it. I expect this to be where the pipeline looks worst.
- **(d) Terminology check.** A targeted pass on exactly the categories he flagged: the four major silsilas (Chishtī, Suhrawardī, Qādirī, Naqshbandī) plus Qalandarī/Malāmatī and any local sub-orders (Chishtī–Niẓāmī, Chishtī–Ṣābirī); honorifics and offices (*sajjāda nashīn*, *khādim*, *mujāwir*, *pīr*, *murshid*, *murīd*, *khalīfa*); ritual vocabulary (*ʿurs*, *dhamāl*, *qawwālī*, *samāʿ*, *dhikr*, *langar*, *chādar*, *ziyārat*); architectural terms (*mazār*, *dargāh*, *khānqāh*, *ḥujra*, *ṣaḥn*, *jālī*). Every occurrence traced back to the source.

**Note on a live error:** the site currently lists a surveyed shrine as *"Abul Faiz Qalander Ali Suharwardi."* "Suharwardi" is a misrendering of **Suhrawardī** — and this is exactly the class of error the audit is designed to catch. It is also a good argument that these errors are already in the data, not hypothetical.

**Deliverable:** a short scorecard — precision %, recall %, terminology error count, with a tagged list of every specific error. That scorecard becomes the benchmark we re-run against any pipeline change. Without it, "the new version seems better" is just a vibe.

---

## 2. Are we using frontier models? No — and that is fixable

**Short answer to Adil's question: partly, and the weakest link is not the summariser.**

Current state:
- **OCR:** my own open-source Urdu model, running locally on GPU. This is genuinely the right tool — Urdu Nastaʿlīq OCR is a narrow task where a purpose-built model beats a general one, and I tested this against GPT's native handling of Urdu PDFs.
- **Translation:** the open-source literal translator. **This is the problem.** It is the Google-Translate-grade step in the middle of the chain, and everything downstream inherits its losses.
- **Summarisation:** GPT. So the writing step *is* frontier — which means the grammar, punctuation and repetition Adil noticed are not a "the model isn't smart enough" problem. They are an architecture problem.

### Why the prose reads the way it does

Adil noticed three things — grammar/punctuation slips, repetition, and possible omissions. Each has a specific structural cause:

- **Repetition** almost always comes from *sectioned generation*. If we ask for a history section, then a practices section, then a significance section, each in a separate call, the model re-establishes context every time — so the saint's birthplace and order get restated three times. The fix is to generate the whole page in one pass with the full source in context, then split it into fields, rather than generating field-by-field.
- **Grammar and punctuation** slips are the fingerprint of translated input. The model is smoothing over an already-degraded English text rather than composing from meaning. Remove the literal-translation step and this largely disappears.
- **Omissions** come from asking for a summary without telling the model what "complete" means. A summary prompt optimises for brevity. We need it to optimise for *coverage of the things we care about*, and then be readable.

### Proposed architecture

```
Urdu book (scan)
  ├─► [my OCR model] ──► verbatim Urdu transcript  ──── archived, never edited
  │                                │
  │                                ▼
  │                    [frontier model, Urdu-native]
  │                       Pass 1: STRUCTURED EXTRACTION
  │                       → claims + page citations, in Urdu-preserving form
  │                                │
  │                                ▼
  │                       Pass 2: COMPOSITION
  │                       → English page, written from the claim set
  │                                │
  │                                ▼
  │                       Pass 3: VERIFICATION (separate call, fresh context)
  │                       → each sentence checked back against transcript
  │                                │
  │                                ▼
  │                          Human edit pass
```

Four changes from today:

1. **Delete the literal translation step.** Go from the Urdu transcript straight to English via a frontier model that reads Urdu natively. This is the single highest-value change and it is what Adil suggested in June — he was right, I was defending the wrong part of the pipeline. Keeping the OCR open-source is correct; keeping the *translation* open-source is not.
2. **Separate extraction from composition.** Pass 1 pulls facts with page anchors and does not write prose. Pass 2 writes prose and is forbidden from adding facts not in Pass 1's output. This is what kills hallucination — the writing step never sees a blank page, only a fact list.
3. **Add an adversarial verification pass** in a *fresh* context window. Models are bad at auditing their own output when the output is still in context; they are quite good at it when handed a document and a source cold. Output: a per-sentence supported/unsupported flag.
4. **Maintain a project termbase.** A single controlled-vocabulary file — canonical romanisation for every silsila, title, ritual and place name, plus known variants to normalise (Suhrawardī not Suharwardi; Sindh not Sind; Chishtī not Chisti). This gets injected into every prompt *and* is enforced by a lint check on the sheet, so consistency does not depend on the model remembering.

### On model choice specifically

I would run a **blind bake-off** on the same audited shrine rather than argue about it: current pipeline vs. proposed pipeline, scored on the Section 1 scorecard. Two or three frontier configurations, same source, same rubric, names hidden. That gives Adil a real answer to "are we at the limit of what AI can do here," instead of both of us guessing. My prediction: recall improves substantially, terminology errors drop by more than half, and the prose problems mostly vanish — but **manual editing stays necessary**, which brings us to the next point.

### Manual editing is not a failure mode, it is part of the design

Adil said he expects we will want manual edits per page. I agree, and I would go further: **we should plan for it rather than treat it as cleanup.** Budget roughly 30–45 minutes of human editing per shrine page. At ~100 sites that is 50–75 hours — real, but tractable, and it is the difference between a site that reads like it was written by people who know the material and one that reads like it was generated. I would also add a `content_reviewed_by` and `content_reviewed_date` column to the sheet so we always know which pages are model-only and which have had human eyes.

---

## 3. Prompting: broad where it matters, strict where it does not

**Adil's point:** keep the instructions broad so each site's uniqueness — poetry, local legend, particular ritual — survives. I strongly agree, and I want to be precise about *what* stays loose, because "broad" applied to the wrong thing produces inconsistency rather than richness.

The distinction I would draw is between **constraints on truth** and **constraints on form**:

**Tight (non-negotiable, identical for every site):**
- Every factual claim must be traceable to the source, with a page anchor.
- No importing knowledge from the model's training data. If it is not in the source, it does not go on the page. (This matters enormously for shrines — the model has absorbed a lot of popular-devotional web content that ranges from unreliable to sectarian.)
- Canonical romanisation per the termbase.
- Uncertainty is stated, not smoothed. "According to *Tahqīqāt-e-Chishtī*, the shrine was built in..." rather than "the shrine was built in...". Where sources conflict, say so — conflicting hagiographies are *interesting*, not a defect to be resolved.
- Never invent dates, lineages, or genealogies. These are precisely what a model will confabulate most fluently.

**Loose (deliberately open, and this is the point):**
- Structure and section order. A site whose significance is architectural should not be forced into the same skeleton as one whose significance is poetic.
- Length. Data Darbar warrants far more than a small neighbourhood mazār, and padding the small one is worse than letting it be short.
- **Poetry and quoted verse — explicitly invited.** For Bulleh Shah, Madho Lal Hussain, Mian Mir, the verse *is* the history. I would add an instruction that reads roughly: *"Where the source quotes poetry, sayings, or oral tradition, reproduce it in the original script with an English rendering, and do not compress it into paraphrase."* Paraphrasing a kāfī is a total loss of the thing.
- Anything distinctive the source dwells on — a miracle narrative, a dispute over succession, a colonial-era court case, a particular ritual found nowhere else — should be surfaced, not normalised away.

The mental model I would give the writing pass: **"write the entry a knowledgeable local historian would write about this specific place, not the entry a template would produce about a generic shrine."**

One addition worth making: an explicit instruction on **how to handle devotional and contested material**. Hagiography, miracle accounts, and rival sectarian claims should be reported *as what the source says* — attributed, neither endorsed nor debunked. That is both better scholarship and, given the audience, safer.

---

## 4. Anthologies and multi-site sources — the biggest leverage in the project

This is the point I am most enthusiastic about, and I think it is worth more than Adil framed it. It is not only an efficiency gain; it changes what the project can be.

**The arithmetic.** A single-shrine book costs us a scan, an OCR run (hours of GPU time for ~100 pages), and a pipeline pass, and yields **one** page. A *tazkira* or a district gazetteer costs roughly the same to process and can yield **twenty to two hundred**. If even a third of those entries clear a usable threshold, one book does the work of thirty.

**It also solves a coverage problem we cannot solve any other way.** Enumerators get 1–2 days per shrine, and Saifullah has completed 9 in months of fieldwork. We are never visiting several hundred sites. Multi-site sources are the only realistic path from "a handful of well-documented Lahore shrines" to genuine national coverage — and they are also the only way to say anything about sites that are remote, in areas that are difficult to travel to, or simply too minor to have their own literature.

### Source categories worth pursuing

*All of these need to be verified for availability and edition before we commit scanning effort — treat this as a search list, not a bibliography.*

1. **Urdu/Persian *tazkira* literature** — the biographical-dictionary tradition, which is the single richest vein. Works in the *Khazīnat al-Aṣfiyā* / *Akhbār al-Akhyār* / *Safīnat al-Auliyā* family, plus later Urdu compilations of *auliyā-e-Pakistan* type. High density, but hagiographic: excellent for lineage, silsila, ritual and legend; unreliable for dates. Our prompt should already handle this via attribution.
2. **Colonial-era district gazetteers and settlement reports (Punjab, Sindh, NWFP).** Underrated and, for our purposes, extremely well-suited: mostly English (no OCR/translation loss at all), systematically organised by district, and they routinely record shrines, *ʿurs* dates, fair attendance, landholdings and endowments. They give us the one thing the *tazkiras* never do — hard institutional and economic detail. Many are out of copyright and digitised.
3. **City and regional histories** — the Lahore literature in particular (Nur Ahmad Chishti's *Tahqīqāt-e-Chishtī* and its successors, Kanhaiya Lal, the various *Tārīkh-e-Lahore*). Dense multi-shrine coverage for exactly the area Saifullah is working.
4. **Auqaf department records.** Given the handover relationship and the presentation, this is worth *asking* for directly. Auqaf administers a large share of the major shrines and holds *ʿurs* calendars, endowment records, and management histories that exist nowhere else. Even a partial share would be a genuine differentiator, and the ask costs us nothing.
5. **Modern scholarship** for framing and cross-checking — Moeen's *Recentering the Sufi Shrine* (I have a relationship there already from the April meeting), plus the Eaton / Gilmartin / Ewing / Malik literature. Not a source for shrine-level facts, but a good check on whether our overall framing is defensible.
6. **Archaeological and heritage surveys** (ASI reports, Punjab/Sindh archaeology departments, Walled City of Lahore Authority) for architecture, dating and conservation status.

### Pipeline change required

Multi-site sources need a genuinely different processing shape:

- **Index first, extract second.** Pass 1 over an anthology should produce a *manifest*: every site mentioned, page range, rough word count, confidence in identification. That manifest is itself a valuable artefact — it tells us what exists before we spend anything on it.
- **Entity resolution is the hard part, and it is harder here than in most projects.** The same shrine appears as the saint's name, a *laqab*, a local nickname, a village name, and in three romanisations. `Mādhō Lāl Ḥusayn` / `Shāh Ḥusayn` / `Lāl Ḥusayn` / `Bāghbānpura` are one site. We need a canonical-ID table with an alias list per site, populated as we go. Without it, one book will silently create four duplicate entries.
- **Multi-source merge.** Once a site has three sources, the page must be composed from all of them with per-claim attribution and explicit flagging of disagreements — not written from one and appended from the others. This is where the archive gets genuinely better than any single book.
- **A source ledger.** One row per (source × site) with page range and extraction status, so we always know what we have mined and what we have not. This also makes the bibliography on each page generate itself.

### Practical note on scanning

Scanning is the bottleneck and it is Pakistan-side. Worth being realistic: photographing a 400-page book on a phone is slow and produces OCR-hostile images (curvature, shadow, skew). If we are going to lean on this strategy, it is worth **buying Saifullah a proper overhead book scanner or a copy stand plus a scanning app**, and giving him a short written protocol (flat pages, consistent lighting, 300dpi equivalent, no shadow across the gutter, capture the title page and colophon for citation). A few hundred dollars of equipment here plausibly saves hundreds of hours of OCR error correction, and bad scans are the one input failure the rest of the pipeline cannot recover from. I would also ask him to record full bibliographic details at capture time — author, publisher, year, edition — because chasing citations retroactively is miserable.

Also worth noting: **library access.** Punjab Public Library, Lahore; the Punjab Archives; university collections; and for out-of-copyright colonial material, Harvard's own holdings and the digitised archives I already have access to. I can process a fair amount of the English-language gazetteer material from here without needing anything scanned in Pakistan at all.

---

## 5. Feedback for Saifullah

Adil's suggestion that we jointly review Saifullah's collected data before giving feedback is right, and overdue — he has 9 shrines done (Data Darbar, Mazar-e-Iqbal, Shah Jamal, Peer Makki, Abul Faiz Qalandar Suhrawardī, Madho Lal Hussain, Ganj-e-Inayat Sarkar, Bibi Pak Daman) and we have never systematically assessed the returns.

**Process:** I will build a review grid — 9 shrines × field categories — scoring each cell present / partial / missing, and pull the actual submitted photos and form responses alongside. Then Adil and I go through it together in one sitting and produce a single consolidated feedback note. Two things matter about the format: it should go to him as **one document, not a trickle of email comments**, and it should be framed as a spec for what "complete" looks like, not a list of complaints. He has been working hard and through Eid; the tone should reflect that.

**What I would assess (and where I suspect gaps):**

*Likely thin already:*
- **Oral history depth** — this is the project's stated purpose and the hardest thing to collect. Are we getting recorded interviews with the *sajjāda nashīn*, *khādims*, and elderly regular visitors, or just facts about the building? A 20-minute recorded conversation with a khadim is worth more than any amount of form-filling, and it is exactly what no book gives us.
- ***ʿUrs* dates in the Islamic calendar**, with the Gregorian equivalent for the current year. Recording only a Gregorian date makes the entry wrong within a year. This is a small fix that prevents a permanent data problem.
- **Event schedules** — which nights *dhamāl*, which nights *qawwālī*, at what time, seasonal variation. Adil already flagged the Mian Mir case; I suspect it is a collection gap, not just a display bug.
- **Inscriptions and epigraphy.** Photographs of foundation inscriptions, grave inscriptions and calligraphic panels are primary sources we can transcribe later and cannot reconstruct remotely. Very high value per minute of field time.
- **Management and institutional status** — Auqaf-administered vs. private/family *gaddi*, who controls it, any litigation or succession dispute. This is the connective tissue to Adil's broader research interest and it is almost certainly not being captured.
- **Practical visitor information** — opening hours, women's access and separate spaces, whether photography is permitted, *langar* timings, accessibility. This is what makes the site useful to the "spiritual seekers" audience Adil described in the original brief, and it is trivially collectable on site.

*Photo quality — a real issue we have already hit:*
- The `_M` / `_I_n` / `_O_n` convention needs to hold; we already lost time to `name_1` / `name_2`. Worth restating once, clearly, with an example.
- Beyond naming: a **shot list**. Exterior with full structure in frame; entrance/gateway; the grave chamber; the courtyard; any inscription, close and legible; the *langar* area; and one wide "sense of place" shot showing people using the space. Right now we get whatever was taken.
- Resolution and orientation — we already had to replace a low-res 2004 hero image for Bibi Pak Daman.

*Verification:*
- **GPS coordinates taken at the site**, not from Google Maps. Rauf's earlier concern about unverified coordinates is resolved for exactly the 9 sites he has visited and unresolved everywhere else — so this should be an explicit checklist item, and it also means each field visit should verify coordinates for any *nearby* sites in our database, not just the target.

**Field realities to design around, not against.** Any feedback we give has to be usable on the ground:

- **Access and permission.** Major shrines are Auqaf-administered; a letter from the department would materially improve access, and given the handover relationship this is a cheap ask that would pay for itself repeatedly. Private/family shrines need the *sajjāda nashīn*'s consent, which takes time and relationship-building.
- **Photography restrictions.** Many shrines restrict photography in the grave chamber; some restrict it entirely. Bibi Pak Daman has women-only spaces where a male enumerator cannot go at all — worth considering whether we need a female enumerator for a subset of sites, since otherwise a systematic part of shrine life is invisible to us.
- **Calendar.** Muharram brings heavy security restrictions and often outright access denial at many sites. *ʿUrs* periods are simultaneously the best time to observe practice and the worst time to get anyone's attention for an interview — worth planning deliberately for both.
- **Season.** Summer heat and monsoon both compress usable field hours, especially in southern Punjab and Sindh.
- **Travel and security.** Lahore and central Punjab are straightforward. Interior Sindh, southern Punjab, KP and Balochistan are progressively harder, slower and in places require permissions or are simply off the table. Coverage outside Punjab will lean much more heavily on the anthology strategy in Section 4, which is another argument for it.
- **Enumerator reliability.** We have already lost a day to no-shows. Worth building slack into any schedule rather than treating the plan as the forecast.
- **Connectivity and power.** Upload lag is normal; periodic internet restrictions and load-shedding are both real. Anything we ask for should work offline-first and sync later.

---

## 6. Completeness tagging

Adil's three-tier proposal is the right shape. I would implement it with one addition.

**Tier (single visible tag, `info_level`):**

| Tag | Definition | Displayed as |
|---|---|---|
| **Full** | Enumerator has visited: verified coordinates, original photos, on-site oral history/interview, event schedule confirmed in person. | Green badge, "Field-verified" |
| **Moderate** | No field visit, but substantive documentary basis — a dedicated book, a solid anthology entry, or well-sourced online material. | Amber badge, "Documented from sources" |
| **Low** | Location and basic identification only; little or no narrative. | Grey badge, "Limited information — help us improve" |

**The addition: keep the tier separate from a structured completeness record.** The tier is what visitors see; underneath it, the sheet should carry booleans for what actually exists (`has_field_visit`, `has_original_photos`, `has_oral_history`, `has_book_source`, `has_verified_coords`, `has_event_schedule`, `content_reviewed_by_human`). Two reasons:

1. The tier can then be **computed** from the booleans rather than assigned by judgement, so it stays consistent as data changes and never goes stale.
2. It gives us a live gap dashboard — "17 sites have a book source but no photos," "31 sites have never had coordinates verified" — which is how we decide where to send enumerators next. That is worth more operationally than the badge is to visitors.

**Two things the tag buys us beyond honesty:**

- It should drive **filtering and prioritisation** on the site — let a visitor see only field-verified sites, and let us sort our own work queue.
- The "Low" badge should carry a **contribution invitation**. A shrine page that openly says "we know little about this site — if you know it, tell us" is how community-contributed archives actually grow, and it converts our biggest weakness into a feature. Given how many sites we will never reach in person, this may end up being significant.

**Editorial point:** the tag should describe *our evidence*, never the site's importance. "Low info" must clearly mean "we have not documented this yet," not "this place is minor." Worth getting the wording right — some of the least-documented sites are locally the most beloved, and a badge that reads as a judgement would be both wrong and offensive.

---

## 7. Sequencing

| Phase | Work | Output |
|---|---|---|
| **1. Audit** (~1 week) | Gold-standard build + precision/recall/terminology scoring for Bibi Pak Daman and Mian Mir. | Baseline scorecard; catalogue of actual errors. |
| **2. Rebuild** (~1 week) | Drop literal translation; implement extract → compose → verify; build termbase; blind bake-off against baseline. | Measured answer to "are we at the AI limit?"; new pipeline. |
| **3. Re-run + edit** (~2 weeks) | Regenerate the 9 field-surveyed shrines through the new pipeline; full human edit pass on each. | 9 pages at publishable quality — the reference standard for everything after. |
| **4. Saifullah review** (parallel, ~3 days) | Review grid, joint session with Adil, consolidated feedback note + revised field protocol + shot list + scanner spec. | One document to Saifullah. |
| **5. Anthology strategy** (~2 weeks, overlapping) | Source scouting; process 1–2 multi-site works end to end as a pilot; entity-resolution table; source ledger. | Proof of the "one book, many sites" model with real numbers. |
| **6. Tagging** (~2 days) | Schema in the sheet, computed tier, badges, filter, contribution prompt. | Live on site. |
| **7. Scale** (ongoing) | Anthology processing at volume; rolling human edit; enumerator visits prioritised by the gap dashboard. | Coverage growth. |

Phases 1–2 are the ones that must happen before anything scales, for the reason at the top: every page we generate under the current pipeline is a page we will eventually re-do.

---

## 8. Open questions for Adil

1. **Auqaf ask.** With the handover happening, are we willing to request shrine records and *ʿurs* calendars from the department, and a general access/permission letter for Saifullah? Both are cheap asks with outsized returns, and the moment is now.
2. **Editorial ownership.** Who is the final editor on shrine prose? I can do the technical and structural editing, but for the Urdu/Persian material and the *tazkira* framing, a subject-matter reader would materially improve accuracy. Prof. Moeen at LUMS is a plausible light-touch reviewer given the existing contact — worth asking whether he would look at a handful of pages.
3. **Scanner budget.** ~$200–400 for a copy stand or overhead scanner for Saifullah. I think this pays for itself in the first anthology.
4. **Female enumerator** for women-only shrine spaces. Currently a systematic blind spot.
5. **Scope beyond Punjab.** Field coverage realistically stays Punjab-centric. Are we comfortable with other provinces being anthology-and-gazetteer-based, tagged "Moderate," for the foreseeable future? I think yes, and the tagging system makes that honest rather than misleading.
6. **Model spend.** Frontier models on full book-length sources cost real money per shrine. Small in absolute terms, non-zero at a few hundred sites. Worth knowing what budget exists before I design around it.
