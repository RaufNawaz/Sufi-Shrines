# Mapping the Shrines of Pakistan
## Data Quality Review & Proposal

**Rauf Nawaz** · 9 August 2026
Prepared for discussion with Adil Ahsan

---

## In one paragraph

The archive now holds **162 sites** across Punjab, Sindh, Balochistan, Khyber Pakhtunkhwa and Azad Kashmir, and the writing is good. A full audit of every row surfaced a different problem: the **prose is ahead of the data structure around it**. Categories, dates, and figure names are carrying more meaning than they can hold, a handful of entries contain errors that are visible on the live site today, and there is no way to tell a claim drawn from a book from a claim the model supplied itself. All of this is fixable now, at 162 rows. It is not fixable at a thousand.

---

## What the audit found

### 1. Content is outrunning its sources

About 25 entries cite one anthology plus a generic "general established histories" line. That anthology carried **small pieces** on many shrines — which is exactly the right way to use it. But those entries run 400–600 words with full sections on the saint's life, the shrine's devotional life, and its legacy. The book seeded them; the model wrote the rest.

Most of that filler is harmless. Some of it is not — it lands on *silsila* affiliations, teacher–student chains, and dates, which are the claims a language model invents most fluently and which read exactly as authoritative as the sourced sentences beside them.

> **Example.** The Allo Mahar entry names Pir Syed Muhammad Channan Shah Nuri in its data fields and then describes a different man entirely — Sayyid Faiz-ul-Hassan Shah — for 700 words. Both are real; both are from that village. The model wrote about the better-documented one and never checked it against its own row.

### 2. Errors currently live on the site

| Site | Problem |
|---|---|
| **Lal Shahbaz Qalandar** | Events field reads *"No events scheduled right now"* — beside a description of one of Pakistan's largest *urs* |
| **Gurdwara Dera Sahib** | Plotted at longitude 74.0000 — roughly 25 km outside Lahore, in farmland |
| **Tomb of Javindi Bibi** | Names the wrong saint, gives the wrong century, and is ~11 km off the Uch cluster |
| **Four entries** | Internal QA notes visible to visitors, including *"flag for a browser-enabled image pass"* and references to spreadsheet row numbers |

The Dera Sahib longitude is a truncation signature, not a typo — the same pattern appears elsewhere, so it needs a sheet-wide scan rather than a one-off correction.

### 3. The schema is visibly straining

Entries have begun **apologising for their own categories** in public-facing text:

> *"It is filed here under 'Hindu Temple' for consistency with the dataset's schema."* — Chandragup, a mud volcano
>
> *"entered here under 'Hindu Temple' as the closest of the dataset's three categories"* — Sain Vali Vilayat Rai Darbar

Four categories are being asked to hold Jain temples, Sindhi Nanakpanthi darbars that install the *Guru Granth Sahib* alongside Hindu images, a natural sacred site, an architect's tomb, and a Mughal sultan's mausoleum with no devotional life at all.

Two fields are similarly overloaded. `Founded/Opened` variously holds the saint's birth, his death, the building date, a commemorated event, or free text — *Bahauddin Zakariya is "founded 1167," three years before the saint was born.* `Sufi Saint` holds "Shiva (Mahadev)," "Jain Tirthankaras," and "Sikh women & children martyrs."

---

## What has been done

All of the following is complete and ready to merge.

**Every one of the 162 rows re-catalogued** across three independent axes, replacing the single overloaded category field:

| Category | Sites | | Status | Sites |
|---|---|---|---|---|
| Muslim Shrine | 74 | | Active | 124 |
| Hindu Temple | 35 | | Occasional | 17 |
| Sikh Gurdwara | 33 | | Heritage | 13 |
| **Nanakpanthi / Udasi Darbar** | **14** | | Ruin | 7 |
| **Jain Temple** | **3** | | Destroyed | 1 |
| **Secular / Memorial** | **3** | | | |

The Nanakpanthi group is the significant find: **14 sites** that belong to neither the Hindu nor the Sikh bucket, and whose entries have been quietly flagging the mismatch themselves.

**Dates split into real fields** — `year_built` with a precision qualifier, plus separate birth, death, and commemorated-event years. 78 rows affected; 5 outright corrections.

**66 empty or placeholder Events fields filled** from information already sitting in each description. The festivals were documented all along — they simply weren't in the column the map reads.

**A cleanup script** that strips separator artefacts, lifts internal QA notes into a private field, removes row-number references, de-duplicates repeated citations, and normalises spellings — *Suharwardi → Suhrawardī*, *Chisti → Chishti*, *Sind → Sindh*. Tested, idempotent, and it logs every change it makes.

**Photo URLs preserved.** The eight field-surveyed shrines keep their existing slugs, so no enumerator image breaks.

---

## What I recommend we decide today

### 1. Cap output at what the source supports

If a book yields three facts, the entry should be three sentences and carry a "Low information" badge. A short honest entry is better than a long confident one — and the badge makes brevity legible rather than embarrassing. It also turns our biggest weakness into an invitation: *we know little about this site; if you know it, tell us.*

### 2. Add a support-level flag, and keep the extracts

Four values — `Field-verified`, `Source-documented`, `Source-seeded`, `Web-compiled` — so we always know which is which. And from the next book onward, **store the actual OCR'd passage** alongside each entry. This is the cheapest change on the list and the only thing that makes it possible, later, to check what a source said that never reached the page.

### 3. Two validation rules

- Any entry whose named figure never appears in its own description **fails**. That one rule catches Allo Mahar at generation time.
- Any coordinate outside its stated district **fails**.

### 4. Go straight from Urdu to English

We currently translate, then summarise. The summariser therefore reads flattened English rather than the source. One pass with the Urdu in context preserves more, and removes the step where *silsila*, *sajjāda nashīn* and *ʿurs* become "chain," "one who sits on the prayer mat," and "wedding."

---

## What I need from this meeting

| # | Ask | Why now |
|---|---|---|
| **1** | **Auqaf records** — shrine registers, *ʿurs* calendars, and an access letter for our enumerator | The relationship is warm today. These records exist nowhere else and would be a genuine differentiator |
| **2** | **~$200–400 for a book scanner** for Saifullah | Gates all anthology work. Phone photos of a 400-page book are OCR-hostile, and bad scans are the one input failure the pipeline cannot recover from |
| **3** | **A subject-matter reader** for the Urdu/Persian material — Prof. Moeen at LUMS is a plausible light-touch ask | I can edit structure; I can't validate *tazkira* framing alone |
| **4** | **A view on funding** — the CID appointment ended in May | Determines whether the scale phase is months or a year |
| **5** | **Allo Mahar on the enumerator list** | Sialkot district, well within normal range; one visit resolves it |

---

## Where the real leverage is

Saifullah has completed nine field surveys in several months. **We are never visiting several hundred sites.** Multi-site sources are the only realistic path to national coverage — and one book can do the work of thirty.

The most underrated category is **colonial district gazetteers**: English, so no OCR or translation loss at all; organised by district; and they systematically record *ʿurs* dates, endowments, and fair attendance — precisely the institutional detail the devotional *tazkira* literature never supplies. Much of it is out of copyright and digitised, which means **I can process it from Cambridge without anything being scanned in Pakistan.**

That matters strategically: it decouples months of progress from any Pakistan-side dependency, and it is how sites outside Punjab get documented at all.

---

## Proposed sequence

| | Phase | Focus |
|---|---|---|
| **August** | Repair & migrate | Errata, schema migration, front-end filters. Mechanical, scriptable, fits around a full-time job |
| **September** | Measure | Read two sources end to end by hand; score the current pipeline on precision, recall, and terminology. A real answer to *"how good is this actually?"* |
| **October** | Rebuild | Single-pass composition; validation rules; blind comparison against the September baseline |
| **November** | Set the standard | Regenerate and hand-edit the nine field-surveyed shrines. These define the bar |
| **Onward** | Scale | Anthology and gazetteer mining, prioritised by a gap dashboard rather than by convenience |

**Roughly 116 hours of work.** Front-loaded deliberately: the mechanical work goes into August because it survives a distracted schedule, and the slow reading goes into term because it suits a few hours a week over months.

---

## The argument in one line

We have 162 entries and a chance to fix the foundation before it carries a thousand. **The cost of doing this now is three weeks. The cost of doing it at a thousand rows is the project.**

---

### Attachments

- `shrines_field_patch.tsv` — 162 rows × 17 columns, ready to merge
- `apply_description_fixes.py` — tested cleanup script with change log
- `allo_mahar_resolution.md` — worked example of the mismatch fix
- `Shrines_Schema_and_Remediation_Spec.md` — full schema and 14-item errata list
- `Shrines_Execution_Plan.md` — detailed workstreams, dependencies, and risks
