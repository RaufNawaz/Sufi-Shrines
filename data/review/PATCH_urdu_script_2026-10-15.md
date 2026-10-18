# Urdu-script check of the new material — 15 October 2026 (HANDOVER §9.353)

Rauf, 15 Oct ~05:30Z (§9.351): "make sure the Urdu script is accurate for all of these new things."
**A report and a patch PROPOSAL. Nothing in the import CSV, the md drafts, the new-rows patches or the sheet was changed.**

> **APPLIED 17 October 2026 (HANDOVER §9.358), under Rauf's ruling 13 of §9.357:** lines 1-16 and 18-22 as proposed (line 22 as two exact quotations without سے), plus the image-read fixes of line 17 (سمادہ), line 27 (باداب, with its English) and line 29 (گہوٹنے کیواسطے). Lines 23-26, 28 and 30-36 needed no change (the image checks found the quotations right). Scripts: `pipeline/book_queue/apply_urdu_patch_2026-10-17.py` and `_part2.py`; backups in `out/urdu_apply_2026-10-17*/`. `check_urdu_script.py scan` now exits 0, with the two image-verified runs and the ten legacy verse runs listed in `pipeline/book_queue/urdu_script_exceptions.tsv`.

## How it was checked

`pipeline/book_queue/check_urdu_script.py scan` takes every Arabic-script run (2+ letters) in the 94
rewritten Descriptions (`entries/descriptions/<id>.md`) and in every cell of the 318 proposed new rows
(`data/review/PATCH_new_rows_*.csv`, `_name_ur` above all) and looks for it in the OCR transcriptions
(`out/ocr/*/p001-end_*_transcribed.txt`, Arabic-script text only). Classes, first match wins: `exact`;
`marks` (only diacritics/tatweel differ); `ortho` (only a letter shape: ي/ی, ك/ک, ه/ہ, ۂ/ہ, أ/ا, digits);
`spacing` (only word joins/splits); `gapped` (every word, in order, in one stretch with ≤25 words between
— page breaks, footnote numerals, `قدس سرہ` elided); `partial` (every word somewhere, not together);
`missing` (a word printed nowhere). Full per-run table: `data/review/URDU_SCRIPT_CHECK_2026-10-15_report.tsv`
(7,073 runs). It exits 1 while any `ortho`/`missing` remains.

| | exact | gapped | marks | ortho | spacing | partial | missing |
|---|---|---|---|---|---|---|---|
| Descriptions (6,658 runs, 94 rows) | 6,558 | 12 | 4 | 1 | 15 | 57 | 11 |
| New rows (415 runs, 318 rows) | 384 | 12 | 0 | 0 | 4 | 12 | 3 |

**98.5% of the Descriptions' Urdu/Persian and 92.5% of the new rows' runs are verbatim as transcribed.**
Every non-exact run was then read against the transcription by hand.

## What is wrong — `PATCH_urdu_script_2026-10-15.tsv` (36 lines: 21 proposed, 15 need a page image)

**New rows (17 lines).** Misspelt names: Bibi **راستی** (not رستی), Shaikh **راجن قتّال** (not رجن),
Nur Muhammad Thani **نارووالہ** (not ناروالا), Masjid **پہولیاں** Wali, **صوفی والی** Masjid (not ولی), Pir
Dhal's cell runs two spellings together. Spacing/wording to the printed heading: چونی وال, رنگ ریز,
پاک پٹنی, سعداللہ, "المشہور **بہ** پیر از غیب", فقیر تاج شاہ (تاجے is the editor's list, not the heading),
Ratan Chand's shivala, Rani Lachhmi's thakurdwara, Sadhu Chuhra's well. **One misquotation:**
`miran-sayyid-mubarak-haqqani`'s `figure_died` quotes "بدن کو اوچ میں لا کر دفن کیا", which the book never
prints; it prints "نعش مبارک حضرت کی اوچ میں لے جا کر دفن کی" (Hadiqat transcription L965). The error began in
the Hadiqat takeaways and travelled into the patch CSV and `data/import_2026-10-15.csv`. **Image check:**
Raja Teja Singh's samadh — our سماوہ copies a transcription that is itself unsure (سادہ[OCR?]/سماوہ;
contents سمادہ).

**Descriptions (19 lines).** Changed words inside quotations: Ranmal Sharif نوشہ for printed نوشاہ;
Zakariya's sons علاوٴ الدین [OCR?] for a clean printed علاء الدین (and the printed ordinals dropped without an
ellipsis); Farid روزۂ for روزہ; Garh Maharaja ﷺ for the printed words; Jahaniyan's two list items joined
with a comma. Silent repairs (brief forbids): Ranjit Singh's "سن چودہ سو ستر" where the transcription reads
کس; Farid's "روغنی روٹیاں" where it reads روغنی ردٹی. **ہین/ہیں:** 13 Tareekh-e Lahore quotations in 5 rows
write ہین where the transcription of that passage reads ہیں — one page image says whether the quotes were
archaised or the transcription modernised.

## What is fine (no line in the patch)

- **gapped / spacing / marks**: quotations spanning page or footnote breaks, a dropped `قدس سرہ`, `۴۰۰ھ`
  vs `۴۰۰ ھ`, izafat zer added in Iqbal's verse. Cosmetic.
- **Abridged new-row names** (Mian Kalan, Nizam Shah, Mastan Shah, Shahid Ganj, Haji Jamiat, Walian Wali,
  Bhohre Wala, Nur Jahan, Garhi Shahu's trailing comma, Miani): each word printed, title shortened.
- **Most remaining `partial` Description runs** are Persian Khulasat and Hadiqat quotations broken by the
  transcription's page order (a footnote or folio marker between the halves); each half was found.
- **10 of the 11 `missing` and 19 of the `partial` Description runs are LEGACY** (the 11th missing is Jahaniyan, above): the Punjabi/Sindhi/Persian verse
  (Bulleh Shah, Shah Hussain, Farid, Waris Shah, Ghulam Farid, Sultan Bahu, Bhittai, Lal Shahbaz, Iqbal)
  carried over from the pre-rewrite Description (`data/snapshot_2026-10-08_post-import.csv`). No book in the
  corpus prints them in this script (the English books print translation), so they **cannot be checked
  here** — they are not new, but they are not from a book either. Rauf's call: keep, cite, or drop.

## Other findings

- **74 of 318 `_name_ur` cells contain Latin text** (e.g. "… 's tomb", "(mohalla outside Bhati Gate)"),
  and 9 are empty. `_name_ur` is not in the import CSV, so nothing on the site shows it; fix before it is used.
- `entries/descriptions/{bhit-bhit-shah,shah-noorani-…,shri-panchmukhi-…}.notes.md` each hold one U+FFFD
  (a broken character). The Descriptions themselves have none.

## Questions for Rauf

1. Apply the 21 proposed lines (to the patch CSVs, the md drafts and the import CSV cells)?
2. ہین/ہیں and the five other image checks: look at the page images (cheap: one crop each) before deciding?
3. The legacy verse with no book behind it: keep as is, attribute ("traditionally attributed"), or drop?
