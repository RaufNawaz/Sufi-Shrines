# Generation Pipeline — Prompt Specification

**Version 2.** Replaces the current *OCR → translate → summarise* chain.
Every prompt below is production text: paste as-is, substituting `{{...}}` slots.

---

## Why the shape changed

The old chain had a seam that cost us meaning:

```
Urdu scan → OCR → English translation → summarise → entry
                        ↑
              the summariser only ever saw flattened English
```

Anything the translation blurred was gone before compression began. The new shape keeps the Urdu in context through composition, and adds an adversarial check:

```
Urdu scan → OCR → [Pass 1: EXTRACT]  → claim list with page anchors
                  [Pass 2: COMPOSE]  → entry, written only from the claim list
                  [Pass 3: VERIFY]   → per-sentence supported / unsupported
                  [human edit]       → publish
```

Three structural guarantees follow:

1. **Pass 2 never sees a blank page.** It writes from a fact list, so it cannot pad with priors — the usual source of confident, unsourced sentences.
2. **Pass 3 runs in a fresh context.** Models are poor at auditing output still in their context window and quite good at auditing a document handed to them cold.
3. **Length is capped by the claim count**, so a thin source yields a short entry. That is what stops a paragraph of Urdu becoming 600 words of authoritative-sounding prose.

---

## Shared preamble

Prepend to Passes 1–3.

```
You are working on a public archive documenting religious shrines in Pakistan —
Sufi Muslim shrines, Sikh gurdwaras, Hindu and Jain temples, and Sindhi
Nanakpanthi darbars. Readers include pilgrims, descendants of displaced
communities, and historians. Accuracy matters more than fluency, and an honest
short entry is worth more than a confident long one.

TERMINOLOGY — non-negotiable
Use the canonical romanisation in the termbase below for every term it covers.
Terms marked translate=NO stay transliterated and italicised, with a short gloss
on first use — never rendered into English. Specifically: `silsila` is not
"chain", `sajjada nashin` is not "one who sits on the prayer mat", `urs` is not
"wedding". Terms marked NAME are proper nouns: no italics, no gloss.

{{TERMBASE}}
```

---

## Pass 1 — Extraction

**Input:** OCR'd Urdu/Persian/English source text + shrine name.
**Output:** JSON claim list. No prose.

```
Below is source material about {{SHRINE_NAME}}, transcribed from
{{SOURCE_CITATION}}, pages {{PAGE_RANGE}}.

Extract every checkable factual claim it makes about this shrine or its
associated figure. Do not write prose. Do not summarise. Do not add anything
that is not in the text in front of you.

Return JSON, one object per claim:

  {
    "claim":      "<the assertion, in English, as literally as the text supports>",
    "urdu":       "<the supporting phrase in the original script, verbatim>",
    "page":       "<page number or folio>",
    "type":       "date | lineage | silsila | biography | ritual | architecture |
                   institution | legend | poetry | quantity | other",
    "certainty":  "stated | attributed | hedged",
    "terms":      ["<technical terms appearing in this claim>"]
  }

RULES
- `certainty`: "stated" = the source asserts it directly. "attributed" = the
  source reports it from someone else ("it is said", "according to X").
  "hedged" = the source itself expresses doubt. Never upgrade a hedge.
- Hagiography and miracle accounts ARE claims. Record them with
  certainty="attributed". Do not silently drop them and do not debunk them.
- POETRY: if the source quotes verse, sayings or oral tradition, record the
  FULL quotation verbatim in `urdu`, set type="poetry", and put a literal
  rendering in `claim`. Never paraphrase or compress verse.
- Where the source gives a date in the Hijri or Vikram calendar, record it in
  that calendar and note the era. Do not convert.
- If the source says little, return few claims. Returning 4 claims is a correct
  and useful answer. Do not pad.
- Return [] if the text says nothing about this site.
```

---

## Pass 2 — Composition

**Input:** the Pass 1 claim list (possibly merged across several sources). **The raw source is not supplied.**

```
Below is a verified claim list about {{SHRINE_NAME}}, extracted from
{{N_SOURCES}} source(s). Write the archive entry for this site.

ABSOLUTE CONSTRAINT
Every factual statement you write must trace to a claim in this list. You may
not add dates, lineages, silsila affiliations, teacher-student relationships,
place names, or institutional details from your own knowledge. If you find
yourself about to write something the list does not contain, leave it out.
This applies even where you are confident and even where the omission leaves
the entry short.

LENGTH
Governed by the claim list, not by a target:
   under 8 claims  → 100-200 words, no section headers
   8-20 claims     → 250-500 words, 2-3 sections
   over 20 claims  → as long as the material genuinely supports

STRUCTURE — deliberately open
Choose sections that fit THIS site. A shrine whose significance is architectural
should not be forced into the same skeleton as one whose significance is poetic.
Do not use a fixed template. Write the entry a knowledgeable local historian
would write about this specific place — not the entry a template would produce
about a generic shrine.

WHAT TO FOREGROUND
- Poetry and quoted verse: reproduce in the original script with an English
  rendering beneath. Never compress verse to paraphrase — for Bulleh Shah,
  Madho Lal Hussain, Bhittai or Sultan Bahu the verse IS the history.
- Anything distinctive the source dwells on: a succession dispute, a colonial
  court case, a ritual found nowhere else, a local legend. Surface it; do not
  normalise it away.
- Where sources disagree, say so. Conflicting hagiographies are interesting,
  not a defect to be resolved.

ATTRIBUTION
- certainty="stated"     → assert plainly.
- certainty="attributed" → attribute ("According to <source>, ...",
                           "Local tradition holds that ...").
- certainty="hedged"     → carry the hedge through.
Never present a legend as documented history, and never editorialise about
whether a miracle occurred. Report what the tradition says.

TONE
Clear, warm, factual. Avoid the reflexive hedging formula "should be treated
with caution" — vary it or, better, attribute precisely instead. Do not write a
"Legacy" section that merely restates the entry.

OUTPUT
Markdown. Then a `## Bibliography` section listing only the works supplied to
you, with page ranges. Nothing else.
```

---

## Pass 3 — Verification

**Fresh context. Supply the composed entry and the claim list, nothing else.**

```
Below are (A) an archive entry and (B) the claim list it was supposed to be
written from. You did not write this entry. Audit it.

For every sentence in (A) containing a factual assertion, return:

  {
    "sentence":  "<verbatim>",
    "verdict":   "supported | distorted | unsupported",
    "claim_ref": "<index in (B), or null>",
    "note":      "<what differs, if anything>"
  }

  supported   — a claim in (B) carries it
  distorted   — (B) says something adjacent but materially different: a shifted
                date, a hardened hedge, an assumed causal link, a changed name
  unsupported — nothing in (B) supports it

Be strict about: dates, lineage and teacher-student chains, silsila
affiliations, personal names, place names, and any number.

Then answer separately:
  1. RECALL — which claims in (B) never reached the entry? List the indices and
     say whether each omission is reasonable compression or a real loss.
  2. FIGURE CHECK — does the person named as this shrine's principal figure
     actually appear in the entry? If the entry is largely about a different
     person, say so explicitly and name both.
  3. TERM CHECK — any technical term rendered into English rather than kept
     transliterated, or romanised off-termbase?
```

> Item 2 exists because of Allo Mahar, where a row named one saint and described
> another for 700 words. It costs one line of prompt and catches the single most
> damaging error class we have found.

---

## Pass 0 — Anthology indexing

Run **before** extraction on any multi-site work. Index first, extract second: this tells us what a book contains before we spend anything mining it, and the manifest is itself a valuable artefact.

```
This is {{SOURCE_CITATION}}, a work covering many shrines. Do not extract
detail yet. Produce an index.

For every distinct shrine, saint or sacred site mentioned, return:

  {
    "site_name":     "<as printed>",
    "site_name_urdu":"<original script>",
    "aliases":       ["<other names the text uses for the same site>"],
    "location":      "<place as given>",
    "page_range":    "<pages>",
    "approx_words":  <int>,
    "confidence":    "certain | probable | uncertain",
    "content_types": ["biography","dates","silsila","ritual","poetry",
                      "architecture","institution"]
  }

Be generous with `aliases`. The same shrine appears under the saint's name, a
laqab, a local nickname, and the village name — Madho Lal Hussain / Shah
Hussain / Lal Hussain / Baghbanpura are one site. Missing an alias creates a
duplicate entry later, which is far more expensive to fix than to prevent.

Do not merge sites you are unsure are identical. Two rows with a note beats one
wrong merge.
```

---

## Operating notes

**Merging sources.** When a site has several sources, merge claim lists before Pass 2, keeping `source_id` on each claim. Where two sources conflict, keep both and let Pass 2 report the disagreement — do not silently prefer one.

**Persist everything.** Store the Pass 1 claim list and the OCR extract in `Source_Extracts`. This is what makes a recall audit possible later without re-reading the book. It is the cheapest insurance in the pipeline.

**Gazetteers skip Pass 1's translation burden.** They are already English, so extraction is faster and lossless — and they carry the institutional detail (*ʿurs* dates, endowments, fair attendance) that devotional *tazkira* literature never supplies. Pair them with a *tazkira* on the same site and the entry gets both the legend and the ledger.

**Then run the linter.** `validate_shrines.py` catches what the prompts miss — coordinate drift, artefacts, off-termbase spellings, figure mismatches. Prompts and linter are complementary: one prevents, the other detects.

---

## Bake-off protocol

Before adopting this pipeline wholesale, prove it beats the current one.

1. Pick the two shrines with hand-built gold standards (Bibi Pak Daman, Mian Mir).
2. Generate each through the old chain and the new one.
3. Strip identifying markers; score both blind against the gold standard on
   **precision**, **recall**, **terminology errors**, and **readability**.
4. Report all four numbers, including any where the new pipeline loses.

If the new pipeline does not measurably win, that is worth knowing too — it would mean the ceiling is the source material rather than the method, which changes where the next effort should go.
