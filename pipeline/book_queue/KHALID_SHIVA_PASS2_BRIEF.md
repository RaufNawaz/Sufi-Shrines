# Pass-2 brief — khalid_in_search_of_shiva (4 Oct 2026, coordinator session_01A3TFE7Vg6AfRsakDYiSRrw, §9.252)

You are ONE of two workers consolidating the 9 Pass-1 chunk notes of this book into ONE takeaways
document, `entries/book_takeaways/khalid_in_search_of_shiva.md`, per `TAKEAWAYS_PROTOCOL.md` "Pass 2".
Each worker writes its assigned SECTIONS as separate files in `/home/claude/p2/out/`. The coordinator
assembles them. All inputs are in `/home/claude/p2/` (extracts in `/home/claude/p2/ext/`, the raw
notes in `/home/claude/p2/notes/` if an extract makes no sense). No Bash. Read, then Write.

## The book (measured at Pass 1, §9.250 + KHALID_SHIVA_WORKER_BRIEF.md — do not re-measure)

Haroon Khalid, *In Search of Shiva: A Study of Folk Religious Practices in Pakistan* (Rupa
Publications India, New Delhi, "First impression 2015", eISBN 978-81-291-3902-3). Route `epub`:
21 EPUB sections, **each `[p. N]` is one EPUB SECTION (≈ one chapter), not a printed page.** Travel
writing / ethnography of folk shrines in Punjab (phallic/fertility shrines, sacred trees, animal
shrines, malang lodges), arguing that pre-Islamic (Shaivite, animistic) practice survives in Sufi
shrine culture, set against orthodoxy, the two-nation theory and identity politics.
- **Section → chapter:** p. 1-7 front matter, Introduction, ch. 1 · p. 8 ch. 2 "Fertility Cult" ·
  p. 9 ch. 3 "Sacred Trees" · p. 10 ch. 4 "Into the Heart of Orthodoxy" · p. 11 ch. 5 "A Mutiny from
  within" · p. 12 ch. 6 "Animistic Cults" · p. 13 ch. 7 "Syncretism in the Mainstream" · p. 14 ch. 8
  "The Two-nation Theory" · p. 15 ch. 9 "The Counter-narrative" · p. 16 ch. 10 "Identity Crisis" ·
  p. 17 ch. 11 "The Changing Landscape" · p. 18 Acknowledgments · p. 19 Notes · p. 20 Bibliography.
- **Citation form — keep it exactly as Pass 1 wrote it:** `(p. N, ch. K, folio not stated)`;
  endnotes `(p. 19, Notes, note N, …)`. No printed page numbers exist. No endnote number may ever
  become a `(p. N)`.
- **Clean born-digital text — no text damage met anywhere.** Fused endnote markers ("worship16",
  "dhoan17") are endnote numbers, never dates.
- **Iqbal Qaiser** (the guide-historian) is NOT Allama Iqbal; `mazar-e-iqbal` was mapped once only
  (p. 12, ch. 6, "Allama Iqbal also once came to see the saint").
- Registers to keep distinct: **reportage** (the author's own observation), **informant** (what a
  named person told him), **book's historical prose**, **author's argument**. Attribute informant
  claims ("according to X, the caretaker").

## Rules (non-negotiable)

- NOTHING enters that is not in the Pass-1 material you were given. No general knowledge, not even a
  well-known date. "(not stated)" rather than fill a gap.
- Every fact keeps its page reference(s); merging duplicates keeps ALL references. Quote the book's
  wording exactly for dates, names and places — and because one `[p. N]` is a whole chapter, keep
  enough quoted wording that a human can find the sentence by search.
- Contradictions are kept SIDE BY SIDE, never resolved. Known ones (§9.250; chapter numbers CORRECTED after worker B found §9.250 had given chunk numbers as chapters): ch. 2 saint's name/grave
  Hanifa vs Faheem, journalists Altaf vs Faheem, "at Pakpattan" vs "near"; ch. 3 Iqbal Qaiser's
  "shisham" vs the author's acacia argument; ch. 5 (p. 11) "Jaffar Qazmi" vs "Jasim Qazmi", Peer Abbas "last
  ten years" vs "thirteen years… in chila"; ch. 6 (p. 12) peacock saint's origin (plaque vs Auqaf informant);
  ch. 9 (p. 15) Sahari Mal Hindu vs Sikh; ch. 10 (p. 16) "20,000 a day" vs the author; endnotes vs bibliography
  (Chisti/Farooqi, Goddess/Goddesses, two Deobandi titles).
- **Ids: only ids that appear verbatim in `shrine_index.tsv` column 1.** Every `### <id> — <name>`
  heading uses the row's `name` from the tsv. Group headings (person-level / place-level) keep ALL
  their ids on ONE physical line as bold ids directly under the heading — never wrap.
- Do NOT reverse any decline (hedges.md) and do NOT add a mapping Pass 1 did not make.
- `calib_excerpt.md` is a Pass-2 output for a DIFFERENT Khalid book: SHAPE only. Its citation form
  `(p. N, folio not stated)` is local to that book; this book uses `(p. N, ch. K, folio not stated)`.

## Judgement mappings §9.250 flagged — keep the material where Pass 1 put it, and say in the
## subsection's first line, in one sentence, that the mapping is a judgement call / thin

- Lahore 35-id head in every chunk except 002 and 009 — several rest on thin material (ch. 1 park /
  consulate / gallows; ch. 10 LUMS). In the consolidated Lahore subsection, group thin items under a
  "thin / incidental" sub-bullet.
- Margalla hills (×2, ch. 5 — material is about Taxila/Dharmarajika); sial-sharif via Sargodha (uncle's
  report; and p. 13); Islamabad/Rawalpindi (one news sentence; one Salman Rashid sentence); Jhelum;
  Multan; Quetta (time marker only); Jhang→garh-maharaja-shorkot and Chiniot→langer-makhdoom (material
  not about those shrines); Phalia→ranmal-sharif, Gujrat→shah-daula, Bhatti gate ×2;
  ram-mandir-saidpur via Rama (Sleeman quote; Ram Navami).
- Person rule extended beyond the Pass-1 brief: Guru Arjan, Guru Hargobind, sharada-peeth for
  Sarasvati (check), Durga (incl. a bare mention), Valmiki, gurdwara-dash-mesh-pita,
  lal-shahbaz-qalandar. Bare-mention person bullets: keep, group compactly, mark "bare mention".
- Unmapped by choice (stay unmapped, go to Figures-not-in-archive / Doubts): Bhera "shivling/shivala",
  Lakshmi, Mai Mufto "Toor in Lahore district", "Shourkot, Jang" and Sargodha as origin mentions,
  the unnamed "national poet", "Fareed Gharib".

Work efficiently: one Read of each input (offset reads for any file over ~900 lines), then Write.
When done, reply with: files written, byte counts, number of subsections/bullets, and any problem
(an id not in the tsv, a fact you could not place, a contradiction you noticed).
