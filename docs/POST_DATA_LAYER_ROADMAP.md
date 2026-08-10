# Post-Data-Layer Roadmap
## Point-by-point answers to the big-picture comments, and what we do next

**Rauf Nawaz** · 9 August 2026

The data layer is repair work — necessary, but it does not make a single entry better. This document is about what does. Part 1 answers each of your seven comments specifically. Part 2 is the sequence. Part 3 is one thing you did not ask about that I think matters more than any of it.

---

# Part 1 — Your comments, answered

## 1. "Manually check whether transcription → translation → summarising is keeping everything accurate, especially niche words"

**Status: not done. This is the single most important outstanding task, and it is scheduled for September.**

### What I can already tell you

The termbase check gives a partial answer today. Running it across all 163 entries found **116 genuine romanisation violations** — not diacritic style, actual wrong spellings. The clearest example: the site's own entry is titled *"Shrine of Abul Faiz Qalander Ali **Suharwardi**"* — a misrendering of **Suhrawardī** — while the body text of the same entry spells it correctly throughout. Also live: *Chisti* for Chishtī, *Qadri* for Qādirī, *Sind* for Sindh.

So the answer to "are niche words surviving?" is **partly no, and it is now measurable**. A termbase of 349 canonical terms with 1,389 variants is built and will be enforced both at generation time and as a lint check.

### What the full audit actually is

Two shrines, chosen for contrasting source types:

| Shrine | Why | Effort |
|---|---|---|
| **Bibi Pak Daman** | Six dedicated Urdu monographs plus a field survey — our richest sourcing | ~8 hrs |
| **Mian Mir** | Source is a chapter within a broader work — the more common case | ~6 hrs |

**Method — and this is the part that cannot be shortcut.** I read the Urdu source myself and write down every checkable claim: names, dates, lineages, silsila affiliations, quoted verse, ritual practices, institutional facts. Expect 80–120 atomic claims per book. Only then can the live page be scored, in two directions:

- **Precision** — every sentence on the page classed *supported* / *distorted* / *unsupported*. Unsupported is the dangerous category, because it reads exactly as authoritative as the true sentences beside it.
- **Recall** — of the claims in the book, how many reached the page? **This is the check nobody has run, because you must have read the source to run it.** It is precisely the "is it leaving out useful stuff" question, and I expect this is where the pipeline looks worst.
- **Terminology** — every occurrence of a silsila name, office, ritual or architectural term traced back to the source.

**Deliverable: four numbers.** Precision %, recall %, terminology error count, readability. That scorecard becomes the benchmark every future pipeline change is measured against. Without it, "the new version seems better" is all we will ever have.

---

## 2. "Are we using frontier models? Grammar and punctuation off, some repetition. Are we at the limit of what AI can do?"

**Short answer: yes for the writing, no for the step before it — and that is the cause of what you noticed. We are nowhere near the limit.**

### The chain was

```
Urdu scan → OCR → literal English translation → summarise → entry
                          ↑
              the summariser only ever saw flattened English
```

The writing step *is* a frontier model. So the grammar and repetition are not a capability ceiling; they are architecture.

### Diagnosing each thing you noticed

| What you saw | Actual cause |
|---|---|
| **Grammar and punctuation off** | The fingerprint of translated input. The model was smoothing already-degraded English rather than composing from meaning. |
| **Repetition** | Section-by-section generation. Ask for a history section, then a practices section, then a legacy section, and each re-establishes context — so the birthplace and order get restated three times. |
| **Things being left out** | Nobody told it what "complete" means. A summarise instruction optimises for brevity, not coverage. |

### The rebuild — written, not yet run

```
Urdu transcript ──► Pass 1: EXTRACT   → claim list with page anchors
                    Pass 2: COMPOSE   → entry, written only from the claim list
                    Pass 3: VERIFY    → per-sentence supported/unsupported, fresh context
                    Human edit        → publish
```

Four changes, each targeting one of the above:

1. **Delete the literal translation step.** Go from the Urdu straight to English with a model that reads Urdu natively. **You suggested this in June and I defended the wrong part of the pipeline** — keeping the OCR open-source is right, keeping the *translation* open-source was not.
2. **Separate extraction from composition.** Pass 2 writes from a fact list and never sees a blank page, so it cannot pad from its own knowledge.
3. **Adversarial verification in a fresh context.** Models are poor at auditing output still in their context window and quite good at auditing a document handed to them cold.
4. **Termbase injected into every prompt**, so terminology stops depending on the model remembering.

### On manual editing

You are right that we will want it. I would budget **30–45 minutes per page**, and treat it as designed-in rather than cleanup. At ~160 sites that is 80–120 hours — real, but it is the difference between prose that reads as though written by people who know the material and prose that reads as generated. Two new columns, `content_reviewed_by` and `content_reviewed_date`, now record which pages have had human eyes.

### Will it prove better?

A **blind bake-off**: same shrine, old pipeline versus new, both scored against the September gold standard, names hidden. If the new pipeline does not measurably win, that is worth knowing too — it would mean the ceiling is the source material rather than the method, which changes where effort should go next.

---

## 3. "Keep the instructions broad — poetry and nuance get lost if we are too strict"

**Agreed, and implemented. The distinction I drew is between constraints on *truth* and constraints on *form*.**

### Tight — identical for every site

- Every factual claim traceable to a source, with a page anchor.
- **No importing from the model's own knowledge.** This matters enormously for shrines: the model has absorbed a lot of popular devotional web content ranging from unreliable to sectarian.
- Canonical romanisation per the termbase.
- Hedges carried through. "According to *Tahqīqāt-e-Chishtī*, the shrine was built in…" rather than "the shrine was built in…". Where sources conflict, say so — conflicting hagiographies are interesting, not a defect.
- Never invent dates, lineages or genealogies. These are exactly what a model confabulates most fluently.

### Loose — deliberately open

- **Structure and section order.** A site whose significance is architectural should not be forced into the same skeleton as one whose significance is poetic. No fixed template.
- **Length**, governed by how much the source supports rather than by a target.
- **Poetry, explicitly invited.** The instruction reads: *"Where the source quotes poetry, sayings or oral tradition, reproduce it in the original script with an English rendering, and do not compress it into paraphrase."*
- Anything distinctive the source dwells on — a succession dispute, a colonial court case, a ritual found nowhere else.

The mental model given to the writing pass: *write the entry a knowledgeable local historian would write about this specific place, not the entry a template would produce about a generic shrine.*

### Two losses of exactly the kind you were worried about, already present

- **Sachal Sarmast** — "the poet of seven languages" — has **no verse quoted at all**.
- **Rahman Baba's** famous couplet appears in **English translation only**, with a note admitting it.

Meanwhile Bhittai, Bulleh Shah, Sultan Bahu, Baba Farid, Shah Hussain and Iqbal all have verse preserved in original script. So the instinct is right and the current output is inconsistent. Both are on the fix list.

---

## 4. "Do as much work as we can now to get the best content, since it informs everything going forward"

**Agreed on the principle. I want to push back on the sequencing.**

The instinct is to start improving entries immediately. But **rewriting before measuring means doing it twice.** Every page regenerated before the gold standard exists is a page regenerated again once we know what the pipeline was actually losing.

So: **measure (September) → rebuild (October) → regenerate the nine reference shrines (November) → scale.**

### One concrete policy change that follows from this

**Cap output at what the source supports.** If a book yields three facts, the entry should be three sentences carrying a "Limited information" badge — not four hundred words of confident prose. A short honest entry is better than a long confident one, and the badge makes brevity legible rather than embarrassing.

This is directly relevant to your answer about the *Tazkirah Awliya-e-Pakistan*. You said it carried small pieces on many shrines — which is exactly the right way to use an anthology. But the entries built from it run to four, five, six hundred words. The book seeded them; the model wrote the rest. Most of the filler is harmless; some of it lands on silsila affiliations and dates, which is the worst place for it.

**The fix is not to rewrite them blindly.** It is to (a) tag them honestly now, (b) store the extracted passage alongside each entry so recall can be checked later, and (c) corroborate against gazetteers rather than regenerate from nothing.

---

## 5. "Go through what Saifullah has collected and give him comments"

**Ready to do this jointly. Grid built, one sitting needed with you.**

Nine shrines: Data Darbar, Mazar-e-Iqbal, Shah Jamal, Peer Makki, Abul Faiz Qalandar, Madho Lal Hussain, Ganj-e-Inayat Sarkar, Bibi Pak Daman, and Mian Mir.

**Format matters:** one consolidated document, not a trickle of email comments, and framed as a spec for what "complete" looks like rather than a list of complaints. He has been working hard, including through Eid.

### Where I expect the gaps

| Gap | Why it matters |
|---|---|
| **Recorded oral history** | See Part 3. This is the big one. |
| **Urs dates in the Hijri calendar** | We record Gregorian dates that are wrong within a year. Small fix, permanent problem prevented. |
| **Event schedules** | Which nights dhamāl, which nights qawwālī, at what time. Your Mian Mir flag was a collection gap, not just a display bug. |
| **Inscriptions and epigraphy** | Foundation and grave inscriptions are primary sources we can transcribe later and cannot reconstruct remotely. Very high value per minute of field time. |
| **Management and institutional status** | Auqaf-administered versus family *gaddi*, succession disputes. Connective tissue to your own research, almost certainly not being captured. |
| **Visitor practicalities** | Opening hours, women's access, photography permission, langar timings. What makes the site useful to the audience you described. |

### Two immediate items

- **Mian Mir has a field survey but no field photos.** The bibliography credits surveyor **Muhammad Rizwan** — a second enumerator. Worth chasing; it is one of our most significant shrines and still running on a Wikimedia image.
- **A shot list.** Exterior with full structure; entrance; grave chamber; courtyard; any inscription, close and legible; the langar area; one wide shot showing people using the space. Currently we get whatever was taken.

### Field realities the feedback must respect

Photography is restricted in many grave chambers. **Bibi Pak Daman has women-only spaces a male enumerator cannot enter at all** — a systematic blind spot that only a female enumerator solves. Muharram brings access restrictions; urs periods are the best time to observe practice and the worst to secure an interview. Summer heat and monsoon compress usable field hours.

---

## 6. "Use the same book for multiple shrines; scan books covering many sites"

**This is the highest-leverage idea in your list, and it is now measurable.**

### The arithmetic

A single-shrine book costs a scan, an OCR run and a pipeline pass, and yields **one** page. A *tazkira* or district gazetteer costs roughly the same and can yield **twenty to two hundred**.

### The number that reframes it

**Punjab Auqaf administers 534 shrines.** Our entire archive — five jurisdictions, every religion — is 163 sites, of which 74 are Muslim shrines. One provincial register is more than three times our whole holding.

### The most underrated source category

**Colonial district gazetteers.** English, so no OCR or translation loss at all. Organised by district. And they systematically record *urs* dates, endowments, landholdings and fair attendance — precisely the institutional detail devotional *tazkira* literature never supplies. Much is out of copyright and digitised, **so I can process it from Cambridge with nothing scanned in Pakistan.** That decouples months of progress from any field dependency, and it is how sites outside Punjab get documented at all.

### What the pipeline needs

- **Index first, extract second.** A manifest pass listing every site, page range and confidence *before* spending anything on extraction. The manifest is itself valuable — it tells us what a book contains before we mine it.
- **Entity resolution.** The same shrine appears as the saint's name, a *laqab*, a nickname and the village name. *Madho Lal Hussain / Shah Hussain / Lal Hussain / Baghbanpura* are one site. An alias column now exists; missing an alias creates a duplicate that is far more expensive to fix than to prevent.
- **Multi-source merge** with per-claim attribution, so a page built from three sources reports where they disagree.

### The scanner

Photographing a 400-page book on a phone produces OCR-hostile images — curvature, shadow across the gutter, skew. **~$200–400 for a copy stand or overhead scanner**, plus a written capture protocol, plausibly saves hundreds of hours of error correction. Bad scans are the one input failure the rest of the pipeline cannot recover from.

---

## 7. "A tag for level of info — Full / Moderate / Low"

**Done. Live once the sheet is imported.**

Implemented with one addition: the tier is **computed, not assigned**, so it cannot go stale as data changes.

| Badge | Basis |
|---|---|
| **Full — Field-verified** | An enumerator visited; field survey cited |
| **Moderate — Documented from sources** | Real, checkable works cited |
| **Low — Limited information** | Only encyclopaedias, press or placeholder lines |

Underneath sits a structured record — `has_field_visit`, `has_original_photos`, `has_oral_history`, `has_book_source`, `has_verified_coords`, `content_reviewed_by` — which gives us a **gap dashboard**: *"31 sites have never had coordinates verified", "17 have a book source but no photos."* That is how we decide where to send enumerators next, and it is worth more operationally than the badge is to visitors.

**Two things the tag buys beyond honesty:** filtering, so a visitor can see only field-verified sites; and a **contribution invitation** on Low entries — *"We know little about this site. If you know it, tell us."* Given how many sites we will never reach in person, that may end up mattering a great deal.

**Editorial point:** the badge describes *our evidence*, never the site's importance. Some of the least-documented sites are locally the most beloved.

---

# Part 2 — The sequence

| When | Work | Answers |
|---|---|---|
| **This week** | Import corrected sheet. Front end: three new category filters, info badges, `status`, contribution prompt. | #7 |
| **This week** | Two asks to Auqaf: records, and an access letter for Saifullah. Long lead time — start now. | #6 |
| **This week** | Saifullah review: grid, one sitting with you, one consolidated document. | #5 |
| **Now → September** | Gold standard, Bibi Pak Daman then Mian Mir. Slow burn, no dependencies, **start today**. | #1, #2 |
| **From now** | Gazetteer harvest from Cambridge. No Pakistan dependency. | #6 |
| **September** | Score both shrines. Baseline scorecard. | #1, #2 |
| **October** | Rebuild pipeline. Blind bake-off against baseline. | #2, #3 |
| **November** | Regenerate + hand-edit the nine field-surveyed shrines. Reference standard. | #4 |
| **Onward** | Anthology and gazetteer mining at volume, prioritised by the gap dashboard. | #4, #6 |

**Three things start this week and finish late** — the gold standard, the gazetteer harvest, and the Auqaf asks. None blocks on anything; all block something important later. Starting them matters more than finishing them quickly.

---

# Part 3 — The thing not on your list

Your original brief was to *"map sufi shrines and provide their **oral histories**, so that spiritual seekers can find out about the history of saints, spiritual practices, upcoming events like qawwali."*

Measured against that:

- **163 written entries.**
- **9 field visits.**
- **Zero published recordings.**

The site was built to hold audio and video specifically for this. The survey form asks for them. Nothing has come through. What exists is a written encyclopaedia compiled from books; what was described is an oral history archive. Those are different projects, and the gap has widened while the attention went to the text.

**This reframes the field workstream.** A twenty-minute recorded conversation with a khādim at Data Darbar is worth more than any amount of *tazkira* extraction — it is the one thing no book will ever contain, and the one thing that disappears when the person dies. The elderly custodians who remember pre-Partition practice are not going to be around indefinitely. Everything else on this roadmap can wait a year without loss. That cannot.

**If I could change one line in the next brief to Saifullah, it would be: stop filling in the form's text boxes and start recording the answers.** The transcription and translation pipeline we are building for books works just as well on an interview, and the recording itself becomes a primary source that outlives all of us.

### One more, briefly

The project has **one engineer, no funding since May, and no succession plan.** I graduate in 2028 and the archive is meant to outlast that. Worth a conversation about documentation, a second contributor, or an institutional home — not urgent, but it gets harder to solve the longer it waits.

---

## In one line

The data layer made the archive **trustworthy**. The next phase has to make it **true** — measured, not assumed — and then make it **heard**.
