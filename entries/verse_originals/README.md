# Verse originals

Rauf, 30 October 2026: "the idea is that verses should be original and if they are not available in urdu or something than just quote the original and have an urdu translation so you can have the gurmukhi and then an urdu translation, so the original needs to be there".

So every verse the public descriptions quote in English rendering should stand under its original. This folder records the originals, one entry per distinct rendering, and `pipeline/apply_verse_originals.py` puts each found original into the articles.

## What an article shows

- **English article:** the original, as its own paragraph, directly above the italic rendering; the site sets the two as one figure (`ProseParagraphs.tsx`), the original centred above, the rendering under it, the translator's credit under both.
- **Urdu article:** the same original, byte for byte, above the Urdu translation that already stands there.
- **Script:** as the original is written. Arabic script (Persian, Urdu, Punjabi in Shahmukhi, Sindhi) is set right to left in Nastaliq; Gurmukhi (Guru Nanak, and Baba Farid as the Guru Granth Sahib keeps him) is set left to right in Noto Sans Gurmukhi, self hosted (`public/fonts/NotoSansGurmukhi-400.woff2`, OFL).
- **Extent:** exactly what the rendering renders. Where the English renders part of a line, the original gives that part and ends with `…`. Verse numbers and the Rahau mark are left off.
- **Bibliography:** the source of the original is added once (`- *Sri Guru Granth Sahib*, Ang 4, 350, … (Gurmukhi text as given by BaniDB, banidb.com).`).

## registry.json

Each entry: `id`, `status` (`found` or `open`), `rows` (where the rendering is quoted), `translator`, `rendering_starts` and `rendering_md5` (the first forty characters and the md5 of the exact rendering, which is how the script finds it; the full English stays in the articles only), `rendering_cited_to` (the page the team version cites for it). A `found` entry adds `poet`, `language`, `script`, `original` (one string per line), `source` (work, place in it, where the text was taken from) and `match` (why this is the line rendered). A `group` joins two renderings of one original: where a row quotes both one after the other, the original stands once, above the first. An `open` entry may carry a `note` on where its original is likely to be.

## Running it

```
python3 pipeline/apply_verse_originals.py          # insert, move the verdict stamps, check
python3 pipeline/apply_verse_originals.py --check  # the invariant only; exit 1 on a gap
```

The check fails if a `found` original is missing above its rendering in either language or its source is missing from the bibliography. The stamps: a public file's V1/V2/V3 lines carry the md5 of the text that passed, and the import builder refuses a stale stamp. The script moves a stamp only after proving that the new text, with the inserted paragraphs and the bibliography item taken out, is byte for byte the passed text. The checkers know the two additions: `check_description_draft.is_verse` counts Gurmukhi as verse, and `check_public_description.py` allows the one bibliography item.

## State on 30 October 2026

10 of 179 distinct renderings found: Guru Nanak's lines in the fifteen gurdwara rows (Angs 4, 350, 417 to 418, 471, 663, 722 to 723, 729) and Baba Farid's "Ajj na suti" (Ang 1379), all from BaniDB, which the SikhiToTheMax site serves (the API answers from a browser; the cloud sandbox cannot reach it). One Guru Nanak rendering is open: "God is One, / The Path is One" (Khalid p. 144), not found in the Granth.

The open 169, counted by the book the English comes from (measured from `registry.json`):

| Source of the English | Open | Where the original is |
| --- | --- | --- |
| Bulleh Shah, Shackle's *Sufi Lyrics* | 36 | not in the corpus: the Drive PDF is the 2021 English only paperback; where Rafat translates the same kafi, his versos have it |
| Bulleh Shah, Rafat's *A Selection* | 10 | in the corpus: Shahmukhi on the facing versos of the Drive PDF, not yet read |
| Shah Abdul Latif, Sorley and Shackle's *Risalo* | 23 | a Risalo edition; Shackle's 2025 PDF not yet checked for the Sindhi |
| Shah Hussain, Naveed Alam, Kugle, Anwar | 23 | Alam's book not yet checked; otherwise an edition of the kafis |
| Schimmel (Shah Abdul Latif, Sachal Sarmast, Persian) | 25 | often a transliteration or a verse number in her notes |
| Waris Shah, Usborne | 17 | an edition of *Hir*; none in the corpus |
| Songs recorded by Abbas, Qureshi, Kasmani | 19 | often given in romanization in the article itself |
| Others (Rizvi, Kugle, Khalid, Browne, Nicholson) | 16 | the texts the translators used; one is Khalid's "God is One" |

## languages.json: what language each original is in

Rauf, 30 October 2026: "For the differentiation between the urdu and punjabi make it more obvious". The site sets a small caption between hairlines above each original naming its language, and another above the translation naming the translation's ("پنجابی" over Shah Hussain's kafi, "اردو" over its Urdu translation; "Punjabi" and "English" in the English article). It shows only where the original is not in the language of the article, so an Urdu couplet in the Urdu article carries none.

`languages.json` records every distinct verse paragraph the articles quote (67 on 30 October 2026), its language and the basis for it: the article naming it ("a Persian chronogram", "his Punjabi kafis") or its grammar. Codes: `pa` Punjabi, `pa-Guru` Punjabi in Gurmukhi (Farid, whose article says his Punjabi survives in that script), `Guru` Gurmukhi by script alone (Guru Nanak: one gurdwara article calls his verse Hindi, so the label names the script, not the language), `fa` Persian, `ur` Urdu, `sd` Sindhi, `skr` Seraiki, and `null` where no language can be named with certainty (two chronogram phrases of two or three words, a mixed line of Guru Arjan's), which sets no caption. 27 Persian, 14 Punjabi, 10 Urdu, 9 Gurmukhi, 1 each Punjabi in Gurmukhi, Sindhi and Seraiki, 4 unlabelled.

```
python3 pipeline/verse_languages.py --write --check data/import_2026-10-30.csv
```

`--write` writes `src/data/verse-languages.json`, the hash of each verse to its code, which the site reads (`src/components/shrine/verseLanguage.ts`, 1.2 KB in the bundle instead of the verses). `--check` fails on any verse paragraph in a sheet export or in `src/data/urdu-content.json` that the record lacks, so a new verse cannot reach the page without someone deciding its language. `verseLanguage.test.tsx` holds the map equal to the record.
