# schimmel_pain_and_grace — the abbreviations key, recovered from the page image

*Recovered 18 September 2026 by re-reading the page image of PDF p. 4, after the chunk notes
established that this page's siglum column was lost entirely in the tesseract OCR (it survives in
`p001-end_2026-09-14_2309_transcribed.txt` only as the stray lines "MOY OPER" and "™"), and that no
abbreviations list, key or glossary exists anywhere else in the book. Until this recovery, **every
Part I quotation cited by siglum was uncitable.** Extracted with
`pdftoppm -f 4 -l 4 -gray -png -r 300` from
`books/incoming-2026-09-11-english/06_Annemarie-Schimmel-Pain-and-Grace_-A-Stu.pdf`, whose
`sha256_head` matches the `c7bd0bfb1e1ca94c` recorded in `state.json`. Page image kept at
`out/ocr/schimmel_pain_and_grace/pages/p0004_toppm-004.png` (gitignored). Reviewed: no.*

## Dard's works — the complete list, PDF p. 4 (folio not stated)

The page's own preamble, transcribed as printed:

> In order to facilitate the printing we have avoided the diacritical marks in proper names; they
> appear only in the indices in full scientific transcription. The footnotes, too, have been reduced
> as much as possible. Instead, the main works of Mir Dard and Shah Abdul Latif are mentioned in
> abbreviations in the text. Books by and about Dard are quoted as follows:

| siglum | work, as printed | imprint, as printed |
|---|---|---|
| **K.** | *ʿIlm ul-kitāb* | Delhi 1310 h/1892-3. |
| **N.** | *Nāla-yi Dard* | Bhopal 1310 h/1892-3. |
| **A.** | *Ah-i sard* | Bhopal 1310 h/1892-3. |
| **D.** | *Dard-i dil* | Bhopal 1310 h/1892-3. |
| **S.** | *Shamʿ-i maḥfil* | Bhopal 1310 h/1892-3. |
| **U.** | *Urdu Dīwān*, ed. Khalil ur-Rahman Daʾudi | Lahore 1961. |
| **P.** | *Diwān-i fārsī* | Delhi 1309/1891-2. |
| **NA.** | *Nāla-yi ʿAndalīb* | Bhopal 1308/1890-1, 2 vols. |
| **F.** | Nāṣir Nadhīr Firāq, *Maikhana-yi Dard* | Delhi 1344/1925. |

Notes on the page as printed, so nothing here is over-read:

- **N, A, D and S share one imprint**, joined on the page by a single brace against "Bhopal 1310
  h/1892-3."; they are not four separate imprints. The table above repeats it rather than
  reproducing the brace.
- **F is a book *about* Dard, not by him** — Firāq's *Maikhana-yi Dard*. The preamble's wording is
  "Books by and about Dard", and F is the "about". A quotation cited `F` is Firāq's testimony, not
  Dard's own words, and the two must not be merged at consolidation.
- **The list has nine sigla and no M.** So the `M` in `(M II 493 f.)` (chunk 007, p. 120) and
  `Mathnawi Il 1347` (chunk 011) is **not a Dard work**; on the second of those it is spelled out as
  Mathnawi, i.e. Rumi. This resolves chunk 007's doubt 4 and chunk 008's loose end, both of which
  listed M among the unexpanded Dard sigla. Recorded as strongly indicated rather than certain: the
  expansion is evidenced at chunk 011's page, not on p. 4.
- `U` is the only siglum with a named editor, and `U` and `P` are the two that appear in the Dard
  verse appendix's locator block at p. 276 (chunk 015).
- The diacritics above follow the printed page. Note the page's own statement that **the text avoids
  diacritics and the indices carry "full scientific transcription"** — which is a reason to prefer an
  index spelling of a name over a body-text spelling, and partly redeems the index despite the
  two-column collapse recorded in chunk 016.

## The Sur abbreviations — where the key actually is

The same page closes:

> The titles of the thirty *Surs* (chapters) in *Shāh jō Risālō*, ed. Kalyan Adwani, Bombay, 1957,
> are abbreviated from the list given on pp. 154 ff.

Three things follow, and they settle open questions in the chunk notes:

1. **The edition behind every Sur citation in this book is Adwani, Bombay 1957, thirty Surs.** This
   answers chunk 009's doubt 2: the "thirty chapters, Sur" of "the excellent Bombay edition" (p. 154)
   is the citation base. The 36-name sequence in **footnote 5 on p. 154 is the Hyderabad 1974
   edition** and is *not* what the sigla abbreviate — the footnote says so itself ("Some of the
   chapters are not found in the other editions"). **Any Sur count taken from this book must name its
   edition.**
2. **pp. 154 ff. is a prose walk-through, not a printed list of abbreviations.** Schimmel names each
   Sur in sequence and discusses it; the sigla are ordinary truncations of those names. So the key is
   *derivable* from pp. 154–161 but is nowhere tabulated, which is why no chunk found it.
3. The Bombay sequence as the prose gives it, pp. 154–158 (chunk 009), in order: **Kalyan · Yaman
   Kalyan · Khanbhat · Sarirāg · Samundi · Sohni · the Sassui cycle of five — Abri, Maʿdhuri, Dēsi,
   Kōhyari, Husaini · Lila Chanesar · Mumal Rano · Marui · Kamōd · Ghatu · Sorathi** … continuing
   past p. 158. Completing it needs pp. 159–161 read for sequence, which is chunk 009's own text.

### Sur pairings that are evidenced on a page

Only pairings with a page behind them are listed. Everything else stays unresolved.

| siglum | Sur | evidence |
|---|---|---|
| `Abri` | Abri (Sassui cycle) | named and then cited as `(Abri II 9)`, p. 156 |
| `Mar.` | Marui | `(Mar. VI 1)` inside Sur Marui, p. 157 |
| `Karayil` | Karayil | `(Karayil II)`, p. 156; the Sur appears in fn. 5's list as "Kara? il" |
| `Dah.` | Dahar | named beside the abbreviation in prose (chunk 014) |
| `Sar.` | Sarang | named beside the abbreviation in prose (chunk 014) |
| `Bil.` | Bilawal | named beside the abbreviation in prose (chunk 014) |
| `BS.` | Barvo Sindhi | named beside the abbreviation in prose (chunk 014) |
| `Sor.` | Sorathi | via "Sērathi" spelled out (chunk 014) |

**`Sr.` is probably Sarirāg and is deliberately not asserted.** `(Sr. VI.11)` at p. 155 falls in a
passage covering both Sarirāg and Samundi, so the attribution is context, not statement. **It also
means `Sr.` and `Sar.` are different Surs** — Sarirāg and Sarang — which is a trap for anyone
normalising these strings.

**Still unresolved, and they matter:** `Kal.`, `Ram.`, `Asa`, `Pur.`, `Sohn.`, `Kohy.`, `Y.`/`YK`,
`Ma‘dh.`. `Kal.` carries several of the heaviest citations in the commentary chapters (chunks 011,
013). Each is an obvious truncation of a name in the sequence above, but **an obvious truncation is
not a statement by the book (RULE 2)**, so they are left open. Reading pp. 159–161 for the rest of
the sequence, then matching against the sigla actually used, would close them on evidence.

## Standing caveat

Every verse locator in this book is numerically unreliable: Roman numerals are the worst damage class
in the tesseract output (`Kal. HI 6`, `Sar. HII 20`, `Mathnawi Il 1347`, `Asa 117`, `wa 72`). **This
key resolves which work or Sur a siglum names. It does nothing for the numbers after it**, and no
locator from this book should enter a shrine entry without the page image being read.
