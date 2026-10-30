> **WITHDRAWN 18 October 2026 (HANDOVER §9.369).** Rauf: prose is English only; the only Urdu is poetry. Use `docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md` and `check_urdu_out.py`. Kept for the record.

# Brief: original-script quotations out of English sentences, into blocks (HANDOVER §9.366)

**Ruling (Rauf, 18 October 2026, via the question tool): "B everywhere".** Every Urdu, Persian, Punjabi,
Sindhi or Arabic quotation that sits inside an English sentence of a Description moves into an
original-script block under its paragraph, names and single terms included. The English sentence
becomes English only. Pilot and model: `entries/descriptions/mazar-of-bulleh-shah.md` (done 18 Oct).

Why: an RTL quotation inline in an LTR sentence splits the line into two reading directions; the
site also scrambled the punctuation around it (fixed the same day in
`src/components/shrine/inlineFormat.tsx`, but the reading problem stays).

## The shape (binding — the renderer and three checkers read exactly this)

```
English paragraph, with the sense of each quotation in English and the citation as before (Sharib, *Tazkirah Awliya-e Pak o Hind*, p. 343, folio 339).

> آپ کے پیرو مرشد آپ سے کسی بات پر خفا ہو گئے۔ انہوں نے آپ کی ولایت سلب کرلی — (Sharib, *Tazkirah Awliya-e Pak o Hind*, p. 343, folio 339)
> شیخ محمد غوث گوالیاری — (Sharib, *Tazkirah Awliya-e Pak o Hind*, p. 343, folio 339)
```

- The block is its own paragraph (blank line before and after), directly after the prose paragraph
  that renders it. Every line starts `> `; one quotation per line, in the order the English uses them.
- After the quotation: ` — (` + the citation that followed it in the old sentence, copied exactly + `)`.
  Every line carries its citation; the site prints a run of identical citations once.
- The quotation is copied **byte for byte** from the old sentence (spelling as printed, `[OCR?]`,
  `[illegible]`, the ' inside Sharib's quotations, everything). Do not retype Urdu: cut it out of the
  old line by script. A quotation with `…` inside stays one line.
- Verse paragraphs (couplets already set on their own lines), list items and the Bibliography are
  NOT touched. Gurmukhi/Devanagari is not in scope.

## The English

- Where the sentence already glosses the quotation ("…", his pir grew displeased…), delete the
  quotation and keep the gloss, mending the grammar.
- Where it does not, give its sense in plain English **from the quotation itself and the entry's
  words**, as paraphrase, never in quotation marks (the draft checker's Q2 requires every quoted
  English passage to be in the entry; a paraphrase is ours and must not look like a quotation).
  Translate prose plainly and closely; add nothing the Urdu does not say. **Never write your own
  translation of verse** (DESCRIPTION_REWRITE_BRIEF.md): for a verse line quoted inline, say what it
  is about.
- Names and titles: romanise with the spellings the draft and `data/glossary.csv` already use
  (Sayyid Bulleh Shah, Shaikh Muhammad Ghaus Gwaliyari). Headings quoted in Urdu (‘کرامت’) become an
  English rendering in double quotes ("Miracle") — a single word or title, under Q2's six-word floor.
- A printed reading that is uncertain stays uncertain in English ("a place whose printed name,
  perhaps Pandu, cannot be read with certainty"); the `[OCR?]` stays on the Urdu in the block.
- Keep every number, date, citation and italic term of the old sentence.

## Procedure, per row (rows in `check_quote_blocks.py status` order, fewest paragraphs first)

1. `python3 pipeline/book_queue/check_quote_blocks.py begin <id>` (backs the draft up; never skip).
2. Edit the draft by script: for each paragraph listed, build the English from the old line and pull
   each quotation out of the old line by index (see the pilot's script pattern in §9.366).
3. `python3 pipeline/book_queue/check_quote_blocks.py check <id>` → exit 0 (QB1-QB6: no Arabic left in
   English prose; every old quotation in a block of the same section and nothing new; citations and
   numbers kept; headings, verse, lists, Bibliography unchanged).
4. `python3 pipeline/book_queue/check_description_draft.py <id>` → exit 0.
5. `python3 pipeline/book_queue/check_quote_blocks.py rekey <id>` (line-keyed Urdu exceptions follow
   the lines), then `check_urdu_script.py scan` exit 0 (in the cloud, on a bundle — §9.360).
6. `python3 pipeline/book_queue/sync_draft_to_import.py <id>` (the import CSV's Description parts
   follow the draft), then `python3 pipeline/finalize_import.py --date X --dry-run` with no FAILED.
7. `python3 pipeline/book_queue/check_quote_blocks.py done <id>`.

Workers may draft step 2 in the cloud on a staged copy (text only; five at once is safe), but the
coordinator runs steps 3-7 itself (RULE 4) and reads every English rendering it did not write.

## The site

`src/components/shrine/ProseParagraphs.tsx` renders a paragraph whose every line starts with `>`
as `<blockquote class="article-original" dir="rtl">` (one `<p>` per line, the citation as a small
Latin `<cite>` under the last line of a run that shares it); CSS in `src/styles/shrine.css`
(`.article-original*`). **The site change must be live on `1.7` before any import that contains a
block** — the old renderer would print the `>` lines as a run-on paragraph.
