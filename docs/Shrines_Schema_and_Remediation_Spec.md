# Shrines Database — Schema Revision & Remediation Spec

**Prepared by:** Rauf Nawaz
**Date:** 9 August 2026
**Scope:** ~135 rows, Sufi Shrines site (now tracked separately from the Auqaf mosque map)
**Basis:** Full read of the current sheet, plus decisions taken 9 Aug on provenance, categories, dates, and images.

---

## 1. The expansion-ratio problem

**What's happening.** The anthology approach is right and should scale. But when a source yields a paragraph on a shrine and the pipeline returns 500 words of sectioned narrative, the difference is filled from the model's own knowledge. The Bibliography names the book honestly; it just doesn't disclose that the book supported perhaps 20% of what's on the page.

This affects roughly 25 entries — the ones whose sources are `Alam Faqri, Tazkirah Awliya-e-Pakistan` plus a generic `General established histories of [X]` line. Representative cases: Sial Sharif, Shergarh, Ranmal Sharif, Darbar Sulaiman Taunsvi, Shah Yusaf Gardez, Syed Musa Pak, Shah Shams Sabzwari, Pir Sher Muhammad, Pir Mangho.

**Why it matters.** The risk is not that Data Darbar's famous facts are wrong. It's the *plausible unverified specific* — "he was the spiritual heir of Khwaja Nur Muhammad Maharvi's line," "initiated in the Chishti-Nizami order," "he died in 1850" — asserted in the same confident register as the sourced material. Lineage claims and dates are what a model confabulates most fluently, and they are exactly what Adil asked to have checked.

**Fix — three parts, none requiring regeneration:**

1. **Add `support_level`** (see §2). These ~25 become `Source-seeded`.
2. **Store the extract.** For every (source × shrine) pair, save the actual OCR'd passage used, in a `Source_Extracts` tab. This is the single cheapest change in this document and it is what makes a real recall audit possible later — without it, checking what the book said that never reached the page means re-reading the book.
3. **Prioritise these ~25 for corroboration**, not rewriting. District gazetteers are the natural second source: English, organised by district, and strong on exactly the institutional facts (*ʿurs* dates, endowments, management) that hagiographic *tazkiras* never supply.

**Going forward:** cap the composition pass at what the extract supports. If a source yields three facts, the entry should be three sentences and tagged `Low`. A short honest entry is better than a long confident one, and the info-level badge makes shortness legible rather than embarrassing.

---

## 2. Revised schema

### Identity

| Column | Type | Notes |
|---|---|---|
| `id` | string | Stable slug, e.g. `bibi-pak-daman`. **Already implicit** in the photo paths — promote it to a real column. Nothing else should be used as a join key. |
| `name` | string | Display name |
| `name_alt` | string, `;`-delimited | Aliases. Essential for anthology work: `Madho Lal Hussain; Shah Hussain; Lal Hussain; Baghbanpura` are one site. Without this, one *tazkira* will silently create four duplicate rows. |
| `name_urdu` | string | Currently absent |

### Classification — three independent axes

Collapsing these into one field is what produced the self-apologising prose ("filed here under 'Hindu Temple' for consistency with the dataset's schema").

**`category`** — religious tradition. Per decision, real categories rather than forced fits:

| Value | Count (approx) |
|---|---|
| Muslim Shrine | ~60 |
| Sikh Gurdwara | ~28 |
| Hindu Temple | ~30 |
| **Nanakpanthi / Udasi Darbar** | ~15 |
| **Jain Temple** | 3 |
| Buddhist Site | 0 (retained per spec) |
| **Secular / Memorial** | ~3 |

*Nanakpanthi note:* covers the Sindhi Hindu–Sikh *sant* darbars — Sain Vali Vilayat Rai, Swami Dharmdas, Bhai Waliram, Bhai Sant Thawan Das, Gurdas Ram, Sant Baba Bhagat Ram, Sant Baba Asudaram, Guru Gurpat, Sant Satram Dham, Bhagat Kanwar Ram, Khatwari Darbar, Sevapanthi Gandava, Sadh Belo (Udasi), Jind Pir, Sach Khand Shikarpur. These sites install the *Guru Granth Sahib* alongside Hindu images and belong to neither existing bucket. Label the filter **"Nanakpanthi (Hindu–Sikh)"** — the communities themselves don't draw a firm confessional line, and the UI shouldn't imply one.

*Secular / Memorial:* Qutbuddin Aibak's tomb (the entry itself says there is no devotional practice), Ustad Nuriya (an architect's tomb), Samadhi of Ranjit Singh. **Mazar-e-Iqbal is a judgement call** — formally secular, but the entry documents Fatiha recitation, chadar-laying, and a folk tradition linking Iqbal to Data Ganj Bakhsh. I'd leave it under Muslim Shrine and let `site_type` carry the nuance.

**`site_type`** — built form: `Dargah/Mazar` · `Khanqah` · `Temple` · `Gurdwara` · `Cave shrine` · `Natural sacred site` (Chandragup) · `Mausoleum/Memorial` · `Complex`

**`status`** — devotional condition, orthogonal to tradition:

- `Active` — regular worship
- `Occasional` — festival-only (Nankana Sahib gurdwaras, Katas Raj)
- `Heritage` — preserved, worship discontinued (Ram Mandir Saidpur, Loh Temple, Gurdwara Saidpur)
- `Ruin` — Tilla Jogian, Sharada Peeth, Parnami Mandir, Amb
- `Destroyed` — Prahladpuri

This axis is genuinely useful to visitors and currently exists only buried in prose.

### Dates — split per decision

| Column | Type | Example (Bahauddin Zakariya) |
|---|---|---|
| `year_built` | int, nullable | 1267 |
| `year_built_precision` | enum | `exact` · `circa` · `century` · `range` · `unknown` |
| `year_built_note` | string | "rebuilt after 1848 siege damage" |
| `figure_born` | int, nullable | 1170 |
| `figure_died` | int, nullable | 1267 |
| `event_year` / `event_note` | int / string | For commemorated events: Guru Nanak's 1521 visit, Guru Arjan's 1606 martyrdom |
| `date_display` | computed | What the front end renders |

This single change resolves: Bahauddin Zakariya "founded 1167" (before his birth); Shamsabad 1966 (the saint's death); Langar Makhdoom 1245 (also a death); Panja Sahib 1521 (an event); Amb "Built 9th–10th century CE" (free text in a numeric field); Chandragup (an entire sentence); and Mian Mir's persistent "Completed/consecrated 1640".

### Principal figure

Rename `Sufi Saint` — it currently holds "Shiva (Mahadev)", "Jain Tirthankaras", "Sikh women & children martyrs", and "Ustad Nuriya (master-builder)".

- `principal_figure` — name
- `figure_type` — `Sufi saint` · `Sikh Guru` · `Sant` · `Deity` · `Historical person` · `Collective` · `None`
- `silsila` — controlled vocabulary, canonical romanisation: `Chishti` · `Chishti-Nizami` · `Chishti-Sabiri` · `Suhrawardi` · `Qadiri` · `Naqshbandi` · `Naqshbandi-Mujaddidi` · `Qalandari` · `Sarwari Qadiri` · `Naushahia` · `Rashidi` · `Azeemia`

**Enforce this as a lint check.** The `name` column currently reads *"Abul Faiz Qalander Ali Suharwardi"* — a misrendering of **Suhrawardī** — while the body prose spells it correctly throughout. That's the exact class of error the termbase prevents.

### Images — per decision, field photos first, web photos as placeholders

| Column | Type |
|---|---|
| `image_N_url` | string |
| `image_N_source` | enum: `field` · `commons` · `web` |
| `image_N_credit` | string |
| `image_N_replace` | bool — computed: true where source = `web` |

Current state: 8 shrines have self-hosted enumerator photos (Data Darbar, Abul Faiz, Bibi Pak Daman, Ganj-e-Inayat, Madho Lal Hussain, Mazar-e-Iqbal, Peer Makki, Shah Jamal). About 40 rows hotlink third parties — Dawn, Tribune, The News, Medium, Blogger, Flickr, squarespace-cdn, a Times of India CDN, and several private blogs.

Two things worth doing even under the "replace later" approach:

- **Mirror the web images locally.** Hotlinks break without warning and several of these hosts block cross-origin requests. Local copies with `image_N_source = web` keep the site working while the replacement queue drains.
- **Mian Mir has a field survey but no field photos.** The bibliography credits surveyor **Muhammad Rizwan** — a second enumerator, distinct from Saifullah. Worth chasing those photos; it's one of the most significant shrines on the site and still running on a Wikimedia image.

### Provenance

| Column | Type |
|---|---|
| `support_level` | `Field-verified` · `Source-documented` · `Source-seeded` · `Web-compiled` |
| `info_level` | `Full` · `Moderate` · `Low` — computed, visitor-facing |
| `source_ids` | `;`-delimited refs into a `Sources` tab |
| `content_reviewed_by` / `content_reviewed_date` | string / date |

Plus two new tabs:

- **`Sources`** — one row per work: `source_id`, author, title, title_urdu, publisher, year, language, type (*tazkira* / gazetteer / monograph / press / register / field survey), scan location, OCR status.
- **`Source_Extracts`** — one row per (source × shrine): `source_id`, `shrine_id`, page range, the extracted passage, extraction date. This is the audit substrate.

---

## 3. Errata — specific rows to fix

**Content errors**

1. **Allo Mahar** — `Sufi Saint` says Pir Syed Muhammad Channan Shah Nuri (founded 1898); the description is entirely about Sayyid Faiz-ul-Hassan Shah (c. 1911–1984). Both are real figures from that village. Decide which shrine this row is, then rewrite or re-field the other.
2. **Tomb of Javindi Bibi** — `Sufi Saint` says Jalaluddin Surkh-Posh Bukhari, `Founded` 1291; the description is Bibi Jawindi, tomb c. 1493. Also coords 29.14 / 71.04, ~11 km off the Uch cluster (should be ≈ 29.238 / 71.064).
3. **Dargah Fateh Pur Sharif** — `Founded` 1359 vs. saint d. 1940. The prose already flags this; the field still doesn't.
4. **Bahauddin Zakariya** — `Founded` 1167 precedes the saint's birth (c. 1170). Likely a mis-entered birth year.
5. **Sachal Sarmast** — "poet of seven languages," no verse quoted. **Rahman Baba** — couplet given in English translation only. Both are gaps against the standing instruction to preserve poetry in original script.

**Front-end-visible**

6. **Lal Shahbaz Qalandar** — `Events` reads "No events scheduled right now," beside a description of the Sha'ban urs and Thursday dhamal. Same placeholder on Gurdwara Sri Tilganji Sahib and Qutbuddin Aibak.
7. **Mian Mir** — still displays "Completed/consecrated 1640".
8. **Gurdwara Dera Sahib** — 31.3523 / **74.0000**, roughly 25 km southwest of Lahore in farmland. True position ≈ 31.588 / 74.313.
9. **Gurdwara Khoohi Bhai Lalo** — 32.0415 / **74.0000**; Eminabad is ≈ 74.25. Same truncated-longitude signature as #8 — worth a sheet-wide scan for `.0000` longitudes.
10. **Coordinate precision** ranges from 2 dp (≈1 km error) to 8 dp (sub-millimetre). Normalise to 5 dp and record `coord_source` (`field GPS` / `gazetteer` / `web`).
11. **Sevapanthi Gandava** and **Ayub Shah Bukhari** share identical coordinates (28.617 / 67.483) with no note explaining it — unlike the Chitti Gatti pair, which is documented.

**Pipeline artefacts leaking into public text**

12. **Internal NOTEs in the description field** — Luari Sharif ("coordinates are those of Luari Sharif town"), Chitti Gatti ("adjacent to the Shiv Mandir Chiti Ghati (row 69)"), Tilganji Sahib ("distinct from row 88"), Ustad Nuriya ("the same mound as rows 11, 90, 91 and 138… flag for a browser-enabled image pass"). Row numbers and QA instructions are visitor-facing. Move all of it to `qa_note`.
13. **Duplicated bibliography line** — "Shrines Project field survey, [X] responses, 2026" appears twice in Data Darbar, Bibi Pak Daman, Madho Lal Hussain, Ganj-e-Inayat, Abul Faiz, Mian Mir, Mazar-e-Iqbal.
14. **`=====` separator** terminates most description cells but not all (missing on Bhai Waliram, Chandragup, Kalat Kali, Chowmala, Mozang, Bhai Sant Thawan Das). Strip everywhere.

---

## 4. Order of work

1. **Backup + `id` column.** Nothing else is safe until rows have stable keys.
2. **Errata §3** — items 6–14 are mechanical and visitor-facing; do them first.
3. **Classification migration** — three axes, ~135 rows, mostly derivable from existing prose. Then delete the self-apologising sentences.
4. **Date split** — the largest migration; requires reading each entry to work out what the existing number meant.
5. **Provenance tabs + `support_level`** — backfill the ~25 as `Source-seeded`; start `Source_Extracts` from the next book onward rather than retroactively.
6. **Images** — mirror web images locally, tag sources, build the replacement queue.
7. **`info_level` computed + badges live.**
8. **Corroboration pass** on the `Source-seeded` entries, gazetteers first.

Steps 1–4 are prerequisites for scale: every row added before the schema settles is a row to migrate twice.

---

## 5. One pipeline note

Current chain is OCR → Claude translates → Claude summarises. That's already better than the literal-translation model it replaced. The remaining loss is the translate-then-summarise seam: the summariser reads English prose rather than the Urdu, so anything the translation flattened is gone before compression starts.

Going from the Urdu transcript straight to an English entry — one pass, source in context — preserves more, and it removes the step where *silsila*, *sajjāda nashīn* and *ʿurs* get rendered as "chain," "one who sits on the prayer mat," and "wedding." Keep the literal translation as an archived artefact for verification; just don't let it be what the writing pass sees.
