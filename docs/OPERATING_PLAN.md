# Operating Plan
## Turning the roadmap into scheduled work

**Rauf Nawaz** · from 10 August 2026
Companion to `POST_DATA_LAYER_ROADMAP.md`. That document says *what and why*; this one says *who, when, and how you know it is done*.

---

## How to use this

Every task has an **ID**, an **owner**, an **effort estimate**, a **dependency**, and an **acceptance test**. Nothing is "done" until the acceptance test passes. Tasks marked 🤖 can be handed to an agent with a prompt; everything else needs a person.

**Capacity assumption:** ~12 hrs/week until term begins (three weeks), then ~7 hrs/week. That is the constraint everything below is fitted to, and it is why the mechanical work is front-loaded into August and the slow reading is spread across term.

---

## Roles

| Who | What they own |
|---|---|
| **Rauf** | Everything technical, the gold standard, gazetteer harvest |
| **Adil** | Auqaf relationship, funding, editorial sign-off, the Saifullah session |
| **Saifullah** | Field collection, scanning, oral history recording |
| **Muhammad Rizwan** | Second enumerator — currently only Mian Mir, photos outstanding |
| **Agent** | Data transforms, validation, merges, harvest scaffolding |

---

# The five workstreams

| ID | Workstream | Answers | Runs |
|---|---|---|---|
| **A** | Ship the data layer | #7 | This week |
| **B** | Measure the pipeline | #1, #2 | Aug → Sept |
| **C** | Sources & coverage | #6 | Aug → ongoing |
| **D** | Field & oral history | #5, Part 3 | Aug → ongoing |
| **E** | Rebuild & regenerate | #2, #3, #4 | Oct → Nov |

---

# Week-by-week

## WEEK 0 — 10–16 August · "Ship it and unblock everything slow"

The theme is starting things with long lead times, not finishing things.

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **A1** | Verify `shrines_final.csv`, import to Sheets | Rauf | 1 | 163 rows; Bibi Pak Daman renders `##` headings; Lal Shahbaz Events shows the Sha'ban urs |
| **A2** | Resolve the two open questions from `QUESTIONS.md` | Rauf | 0.5 | Amb Temples dedication flagged; 163rd row identified by name |
| **A3** | 🤖 Front end: 3 new category filters, info badges, `status` display, contribution prompt on Low entries | Agent + review | 3 | Map filters on 6 categories; every pin badged; hard-refresh confirms deploy |
| **C1** | Send the two Auqaf asks — records request + access letter for Saifullah | **Adil** | 0.5 | Sent. Draft is in `auqaf_records_brief.md` |
| **C2** | Order the book scanner | Adil/Rauf | 0.5 | Ordered, shipping to Saifullah |
| **B1** | **Start the Bibi Pak Daman gold standard.** Read 2 hrs, log claims. | Rauf | 2 | ≥25 claims recorded in `gold_standard_bpd.tsv` |
| **C3** | 🤖 Gazetteer harvest scaffolding: locate and download Punjab + Sindh district gazetteers covering our districts | Agent | 2 | ≥10 volumes downloaded, indexed by district in `sources/gazetteers/` |
| **D1** | Build the Saifullah review grid (9 shrines × field categories) | Rauf | 2 | Grid complete with present/partial/missing per cell |
| **D2** | Chase Mian Mir field photos from Muhammad Rizwan | Rauf | 0.25 | Asked |

**Week 0 total: ~12 hrs** (Rauf ~11, Adil ~1)

**Milestone:** the corrected schema is live and visitors see honest badges.

---

## WEEK 1 — 17–23 August · "Field workstream reset"

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **D3** | Joint session with Adil on Saifullah's nine shrines | Rauf + Adil | 1.5 | Agreed list of gaps |
| **D4** | Write **Field Protocol v2** — one consolidated document | Rauf | 3 | Covers shot list, Hijri urs dates, inscriptions, custodianship, visitor practicalities, **and the oral history brief** |
| **D5** | Write the **Oral History Brief** (see detail below) | Rauf | 2 | Equipment, consent script, question set, file naming, upload path |
| **B2** | Gold standard, continued | Rauf | 2 | ≥55 claims cumulative |
| **C4** | 🤖 Index-first manifest pass on the first gazetteer | Agent | 2 | Manifest listing every site, page range, confidence |
| **A4** | Retire legacy `Category` / `Founded/Opened` / `Sufi Saint` columns once new ones verified | Rauf | 1 | Site still renders; validator clean |

**Week 1 total: ~11.5 hrs**

---

## WEEK 2 — 24–30 August · "Last high-capacity week"

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **D6** | Send Field Protocol v2 + Oral History Brief to Saifullah; walk through on a call | Rauf | 1.5 | He has read it and asked questions |
| **B3** | Gold standard, continued | Rauf | 3 | Bibi Pak Daman claim list complete (~100 claims) |
| **C5** | 🤖 Extract gazetteer entries for the 52 sites currently with no bibliography | Agent | 3 | ≥20 sites gain a real citation |
| **C6** | Alias table population for the top 40 multi-name sites | Rauf | 2 | `name_alt` filled; no duplicate risk on the next anthology |
| **E1** | Fix the two known content gaps: Sachal Sarmast verse, Rahman Baba couplet | Rauf | 1.5 | Both entries carry original-script verse with translation |

**Week 2 total: ~11 hrs**

**Milestone:** first gold standard complete. Field workstream reset and briefed.

---

## SEPTEMBER — term begins, ~7 hrs/week

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **B4** | Score Bibi Pak Daman: precision / recall / terminology | Rauf | 4 | Four numbers in `scorecard_v1.md` |
| **B5** | Mian Mir gold standard + score | Rauf | 8 | Second scorecard; comparison across source types |
| **B6** | Write the findings memo for Adil | Rauf | 2 | Answers "is it leaving things out" with a number |
| **C7** | Gazetteer mining at volume | Rauf + agent | 8 | ≥40 sites upgraded from Low to Moderate |
| **D7** | First oral history recordings arrive | Saifullah | — | ≥3 shrines with ≥15 min audio each |
| **D8** | 🤖 Audio pipeline: transcribe → translate → summarise, same chain as books | Agent | 4 | One interview end-to-end, published on its shrine page |

**September total: ~26 hrs Rauf**

**Decision gate:** the scorecard tells us whether the rebuild is worth it. If precision and recall are already high, redirect that effort to coverage instead.

---

## OCTOBER — rebuild

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **E2** | Implement extract → compose → verify from `pipeline_prompts.md` | Rauf | 6 | Runs end-to-end on one shrine |
| **E3** | Wire `Source_Extracts` capture so every run persists what it read | Rauf | 3 | Extract stored per (source × shrine) |
| **E4** | **Blind bake-off**: old vs new on both audited shrines | Rauf | 3 | Scored against gold standard, names hidden |
| **E5** | Decide: adopt, adjust, or keep current pipeline | Rauf + Adil | 1 | Documented with numbers |
| **C8** | Auqaf register merged, if received | Rauf | 6 | Register reconciled against our 74; new sites queued |

**October total: ~19 hrs**

---

## NOVEMBER — set the standard

| ID | Task | Owner | Hrs | Accept |
|---|---|---|---|---|
| **E6** | Regenerate the 9 field-surveyed shrines through the new pipeline | Rauf | 4 | 9 drafts |
| **E7** | Human edit pass, 45 min each | Rauf | 7 | `content_reviewed_by` set on all 9 |
| **E8** | Publish; these become the reference standard | Rauf | 1 | Live |
| **D9** | Second oral history batch | Saifullah | — | ≥10 shrines with audio |
| **C9** | Corroborate the source-seeded entries against gazetteers | Rauf | 8 | Expansion ratio down; support levels re-computed |

**November total: ~20 hrs**

---

# The Oral History Brief — task D5 in detail

This is the piece with a real clock on it, so it gets specified rather than left as an aspiration.

**Scope:** 3 shrines to start — **Data Darbar, Bibi Pak Daman, Madho Lal Hussain.** All Lahore, all already surveyed, all with Auqaf administration so the access letter helps.

**Who to record**
1. The *sajjāda nashīn* or shrine administrator — institutional history, succession, management.
2. A senior *khādim* — daily practice, what has changed, what was different before Partition.
3. A long-standing regular visitor, ideally elderly — what the shrine means to ordinary devotees.
4. A *qawwāl* or musician where one is attached — repertoire, lineage, what is sung and when.

**Equipment:** a phone is adequate if used correctly. External lapel mic (~$25) improves it enormously in a courtyard. Record in a quiet corner, not beside the langar.

**Consent — non-negotiable.** A short spoken script at the start of every recording: who we are, that this will be published freely online, that they may decline any question or stop at any time, and their name and permission on tape. No consent, no publication.

**Question set** — open, not a form. Roughly: How long have you been here? How did you come to be? What happens on an ordinary day? What happens at the urs? What did your predecessor tell you about this place? What has changed in your lifetime? What do you wish visitors understood? Is there a story about this shrine that you think should not be forgotten?

That last question is the whole point of the exercise.

**Handling:** `<shrine-slug>_<role>_<YYYYMMDD>.m4a`, uploaded to a dedicated Drive folder. The existing OCR → translate → summarise chain works on a transcript just as well as on a book, so the pipeline already exists.

**Target:** 15–30 minutes per interview. Four interviews per shrine. Three shrines by end of September.

---

# What an agent can run unattended

| Task | Prompt exists |
|---|---|
| A3 · Front-end filters and badges | Needs writing — **review this one, do not auto-approve; it touches what visitors see** |
| C3 · Gazetteer download and indexing | Needs writing |
| C4/C5 · Manifest pass and extraction | `pipeline_prompts.md` Pass 0 and Pass 1 |
| D8 · Audio transcription chain | Reuse the book chain |
| Any re-validation | `validate_shrines.py` |

Everything in workstream **B** is human-only by definition. The gold standard is a person reading a book; that is what makes it a standard.

---

# Recurring cadence

| Frequency | What |
|---|---|
| **Weekly** | Run the validator against the live sheet. 5 minutes. Catches drift before it accumulates. |
| **Fortnightly** | Saifullah check-in — collection count, blockers, upload status |
| **Monthly** | Regenerate the gap dashboard; decide where the next field visits go |
| **Monthly** | Update Adil with numbers, not prose |

---

# Milestones

| Date | Milestone |
|---|---|
| **16 Aug** | Corrected schema live; honest badges on every entry |
| **30 Aug** | First gold standard complete; field workstream re-briefed |
| **30 Sept** | Pipeline measured. A number, not an impression. First interview published. |
| **31 Oct** | Rebuild decision made on evidence |
| **30 Nov** | Nine reference-standard pages; ten shrines with audio |

---

# Risks, and what to cut

| Risk | Response |
|---|---|
| **Term load worse than expected** | Cut C9 (corroboration). Tag those entries honestly and move on. Do **not** cut B — skipping measurement is what produces a hundred pages needing redoing. |
| **Auqaf says no** | Gazetteers need no permission and cover the same institutional ground. C-track survives intact. |
| **Saifullah tied up** | D slips. B and C are unaffected — both run from Cambridge. |
| **Scanner does not arrive** | Gazetteers are already digitised. Anthology work slips, not the whole source track. |
| **Gold standard shows recall is poor** | Expected. Budget more E-track time; it strengthens rather than weakens the case. |
| **Rauf unavailable** | The real single point of failure. See below. |

---

# The thing to fix before it becomes urgent

One engineer, no funding since May, no documentation of how any of it fits together, and a 2028 graduation date.

**Three cheap steps, ~4 hours total, worth doing in September:**

1. A `README` in the repo explaining the sheet → site pipeline well enough for a stranger to run it.
2. Shared ownership of the Google Sheet and Drive folders, so nothing is tied to one account.
3. A named second contributor, even a light one — a Harvard undergraduate on the same CID matching scheme would do.

None of this is urgent. All of it gets harder the longer it waits.

---

## Total effort

| Phase | Hours |
|---|---|
| August (weeks 0–2) | ~35 |
| September | ~26 |
| October | ~19 |
| November | ~20 |
| **Total to 30 Nov** | **~100** |

Fitted to the stated capacity with roughly 15% slack. If funding resumes, the constraint moves from Rauf's hours to Saifullah's field time, and the plan compresses by about a month.
