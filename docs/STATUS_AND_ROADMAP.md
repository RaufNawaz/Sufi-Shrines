# Mapping the Shrines of Pakistan
## Status Report & Roadmap

**Rauf Nawaz** · 9 August 2026
Covering everything since the last update on the site fixes and Auqaf cross-link

---

## Where things stand

The last update was about the **site**: map labels, photo hosting, search ranking, filters, the Shrine Facts box, and the Auqaf cross-links. All of that is live.

This one is about the **data underneath it**. I have now audited all 163 entries row by row. The finding, in short: the writing is good, and the structured data around it is not. Categories, dates and figure names are carrying more meaning than they can hold; a handful of errors are visible on the live site today; and until now there was no way to tell a claim drawn from a book from one the model supplied itself.

All of it is fixable at 163 rows. None of it is fixable at a thousand.

---

# Part 1 — What was found

## 1.1 Entries describing the wrong person

The most serious class of error, and the reason for everything that follows.

**Allo Mahar** lists Pir Syed Muhammad Channan Shah Nuri in its saint field, then describes **Sayyid Faiz-ul-Hassan Shah** for seven hundred words. Both men are real; both are from that village. Given a thin source and a place name, the model wrote about whichever was better documented online and never checked it against its own row.

**Tomb of Javindi Bibi** names Jalaluddin Surkh-Posh Bukhari and dates the tomb to 1291. The description is about **Bibi Jawindi**, and the tomb is from around 1493. The coordinates also sit 11 km away from the other Uch Sharif tombs.

Neither has been "fixed" by writing a replacement biography. Correcting a fabrication by generating a second one would defeat the purpose. Allo Mahar has been cut back to a short honest entry naming both men, flagged unresolved, with a question list for an enumerator. It is in Sialkot district — one visit settles it.

## 1.2 Errors currently live on the site

| Site | Problem |
|---|---|
| **Lal Shahbaz Qalandar** | Events reads *"No events scheduled right now"* — beside a description of one of Pakistan's largest urs |
| **Gurdwara Dera Sahib** | Plotted at longitude 74.0000 — roughly 25 km outside Lahore, in farmland |
| **Four entries** | Internal QA notes visible to visitors, including *"flag for a browser-enabled image pass"* and references to spreadsheet row numbers |
| **158 entries** | A separator artefact leaking into the public description field |

The Dera Sahib longitude is a truncation signature rather than a typo, so the same pattern appears elsewhere.

## 1.3 The schema had started to strain

Entries had begun apologising for their own categories **in public-facing text**:

> *"It is filed here under 'Hindu Temple' for consistency with the dataset's schema."* — Chandragup, a mud volcano

> *"entered here under 'Hindu Temple' as the closest of the dataset's three categories"* — Sain Vali Vilayat Rai Darbar

Four categories were holding Jain temples, a natural sacred site, an architect's tomb, a Mughal sultan's mausoleum with no devotional life, and — the significant find — **fourteen Sindhi Nanakpanthi and Udasi darbars** that install the Guru Granth Sahib alongside Hindu images and belong to neither existing bucket.

Two fields were similarly overloaded. `Founded/Opened` variously held the saint's birth, his death, the building date, a commemorated event, or free text. **Bahauddin Zakariya is recorded as founded in 1167 — three years before the saint was born.** `Sufi Saint` held "Shiva (Mahadev)", "Jain Tirthankaras" and "Sikh women and children martyrs".

## 1.4 Content is outrunning its sources

Entries drawn from the *Tazkirah Awliya-e-Pakistan* run to four, five, six hundred words on what was described as small pieces of information per shrine. The book seeded them; the model supplied the rest.

Most of that filler is harmless. Some of it is not — it lands on **silsila affiliations, teacher–student chains and dates**, which are what a language model invents most fluently, and it reads exactly as authoritative as the sourced sentences beside it.

## 1.5 A discovery about the sheet itself

**Google Sheets' TSV export silently strips the line breaks inside cells. The CSV export preserves them.**

Anyone who exports as TSV, edits, and pastes back will flatten the markdown structure across every description in the archive — headings, bibliography bullets, verse line breaks. I nearly did exactly that. All tooling now goes through CSV, and TSV export should be treated as off-limits for this sheet.

---

# Part 2 — What was built

Rather than fix 163 rows by hand, four tools, because the same errors return with the next batch otherwise.

| Tool | What it does |
|---|---|
| **Validator** | 17 integrity checks, exits non-zero on error so it can gate publishing |
| **Cleanup script** | Strips artefacts, lifts internal notes into a private field, de-duplicates citations, normalises spellings |
| **Source registry** | Turns free-text bibliographies into a real provenance layer, then computes support and information levels per shrine |
| **Termbase** | 349 canonical terms, 1,389 variants — the linter's spelling authority *and* a prompt injection so future generation does not render *silsila* as "chain" |

Plus a **162-row correction patch**: every entry re-catalogued across three independent axes, dates split into proper fields, 66 empty Events filled from information already sitting in the descriptions, and 6 placeholder Events corrected.

**The single most valuable check turned out to be the simplest.** *Any entry whose named figure never appears in its own description fails.* One rule; catches both Allo Mahar and Javindi Bibi; costs nothing.

## Measured result

Running the validator against the live data:

| | Before | After cleanup |
|---|---|---|
| **Errors** | 165 | **8** |

157 of those were the single separator artefact, removed in one pass. The remaining eight are the genuine content problems described above.

---

# Part 3 — Current state

**The Google Sheet is unchanged.** Every correction is prepared, tested and staged in a single file. The next action is one import, which is deliberately a human decision rather than an automated one.

| | Status |
|---|---|
| Audit of all 163 entries | Complete |
| Correction patch, 162 rows | Built and tested |
| Validation tooling | Built, tested against real data |
| Termbase | Complete |
| Rebuilt generation prompts | Written, not yet run |
| **Import to the live sheet** | **Pending** |
| Front-end work for new fields | Not started |

---

# Part 4 — Roadmap

### Immediate — this week

1. **Import the corrected sheet** and verify: row count, markdown intact, Events correct.
2. **Front end** — three new category filters (Nanakpanthi, Jain, Secular/Memorial), information-level badges, and a contribution invitation on thinly documented entries.
3. **Two asks to Auqaf** while the relationship is warm (see below).

### September — measure before rebuilding

Read two Urdu sources end to end by hand and score the current pipeline on precision, recall and terminology. This is roughly eight hours per shrine and cannot be shortcut, but it produces a real answer to *how good is this actually* rather than an impression. It is deliberately scheduled for term, since it suits a few hours a week over months better than a sprint.

### October — rebuild the pipeline

Replace *translate → summarise* with *extract → compose → verify*. The composition pass never sees the raw source, only a claim list, so it cannot pad from its own knowledge; length is capped by claim count, so a thin source produces a short entry. Then a blind comparison against the September baseline.

### November — set the standard

Regenerate and hand-edit the nine field-surveyed shrines. These become the quality bar for everything after.

### Onward — scale

Anthology and gazetteer mining, prioritised by a gap dashboard rather than by convenience.

**Roughly 116 hours in total**, front-loaded so the mechanical work happens now and the slow reading fits around term.

---

# Part 5 — Where the real leverage is

Nine field surveys in several months. **We are never visiting several hundred sites.** Multi-site sources are the only realistic route to national coverage, and one book can do the work of thirty.

**Punjab Auqaf administers 534 shrines.** Our entire archive — five jurisdictions, every religion — is 163 sites, of which 74 are Muslim shrines. Their register alone is more than three times our whole holding. They already publish per-shrine pages we can cite today without asking anyone.

The most underrated source category is **colonial district gazetteers**: English, so no OCR or translation loss; organised by district; and they record *urs* dates, endowments and fair attendance — exactly the institutional detail the devotional *tazkira* literature never supplies. Much is out of copyright and digitised, **so it can be processed from Cambridge without anything being scanned in Pakistan.** That decouples months of progress from any field dependency.

---

# Part 6 — Decisions needed

| # | Ask | Why now |
|---|---|---|
| **1** | **Auqaf records** — shrine register, *urs* calendar in the Hijri calendar, custodianship records | The relationship is warm. These exist nowhere else |
| **2** | **Access letter for Saifullah** on department letterhead | Costs them nothing; materially changes whether khadims and sajjada nashins will sit for recorded interviews |
| **3** | **~$200–400 book scanner** | Gates all anthology work. Phone photos of a 400-page book are OCR-hostile, and bad scans are the one failure the pipeline cannot recover from |
| **4** | **A subject-matter reader** for the Urdu and Persian material | I can edit structure; I cannot validate *tazkira* framing alone |
| **5** | **A view on funding** — the CID appointment ended in May | Determines whether the scale phase is months or a year |

Note that Auqaf is **provincial, not federal**. Sindh — where most of our poet-saints are — needs a separate approach.

---

# Part 7 — Two open questions

Deliberately unresolved rather than guessed:

1. **Amb Temples** is recorded as dedicated to Shiva, and the description never mentions Shiva. Either the dedication is unsourced or the description is incomplete. This needs a source.
2. **One row in the sheet has no match in the correction patch** — 163 against 162. It will be identified by name and location rather than assumed.

---

## The argument in one line

We have 163 entries and a chance to fix the foundation before it carries a thousand.
**Three weeks now, or the project later.**
