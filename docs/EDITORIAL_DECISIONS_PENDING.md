# Editorial decisions pending — the qa_note backlog

**Written 18 August 2026**, after the consolidated CSV was imported into the live sheet.
Supersedes the summary in `docs/TODO.md` §3, which listed four entries; the real number is
larger and the shape is different.

This document exists because of a specific failure mode. `qa_note` is an internal column —
`INTERNAL_ONLY_KEYS` in `src/lib/data/constants.ts` blocks it from rendering, and
`shrineInfoboxDates.test.tsx` asserts that it never reaches a visitor. That is correct
behaviour and should stay. But it also means **52 entries are now carrying flagged
contradictions that nobody will ever see unless they open the sheet**. The notes are good —
several are the most careful writing in the archive — and they were produced precisely so a
human could rule on them. Left in a hidden column, they become a private archive of doubts.

**Nothing below needs "fixing."** Per RULE 2 these were reported rather than resolved, and
that was the right call. What they need is a ruling on *presentation* — what the archive's
voice does when the source is self-contradictory, or says something that could harm someone.

## How to use this

Each item gives: what the source actually says, what is at stake, and a recommendation.
The recommendations are about presentation policy only. **None proposes resolving a factual
conflict** — where the survey contradicts itself, it stays contradictory.

Decide the four policy questions in §1 and most of §2–§5 follow mechanically.

---

## 0. The measured shape of the backlog

| | count |
|---|---|
| Entries carrying a `qa_note` | 52 |
| …of which the note is a substantial multi-item list (>1,000 chars) | 17 |
| Entries whose note explicitly asks for an editorial decision | 2 |
| Longest notes | Malik Ahmad Ayaz (7.6k), Mian Qurban Ali Shah (5.2k), Abul Muali Qadri (4.7k) |

The three longest are all **field-survey entries** — the ones with the strongest provenance.
That is not a coincidence and it is worth stating plainly: a field survey produces a single
informant's testimony, at length, with no editorial layer. It generates more internal
contradiction than a compiled web entry does, because there is more of it and because nobody
smoothed it first. **A long `qa_note` is a sign of good sourcing, not bad.** Whatever policy
is adopted should not create an incentive to shorten these.

---

## 1. The four policy questions

### 1.1 Should any of this be visible to a reader?

**The question.** Right now the archive tells a reader *how well sourced* an entry is
(`support_level` / `info_level` badges, now live) but never *where its source contradicts
itself*. Bibi Pak Daman is the model precisely because it puts the disagreement in the prose —
but that is disagreement between named published authors, which is comfortable to display.
These notes are disagreement *within one informant's testimony*, which is not.

**Recommendation: a third thing, narrower than either.** Do not publish `qa_note` (it is
working notes, addressed to an editor, and names the surveyor's lapses). Do not keep hiding
the fact that the source is internally inconsistent either. Instead, where a contradiction
bears on something the entry actually asserts, it should already be in the prose — and in most
of these entries it is. The audit worth running is the reverse of what is assumed:
**for each `qa_note` item, is the doubt it records reflected in the public prose?** Where yes,
the note is doing its job and needs nothing. Where no, that is a real gap.

This is checkable rather than a matter of taste, and it is the one piece of work here that
could be delegated.

### 1.2 What does the archive do with a survey answer that doesn't fit its own field?

**The question.** Three entries answer the `silsila` question with something that is not a
silsila:

- **Abul Muali Qadri** — Q5 gives descent and a personal bond ("Lineage of Hazrat Ali (R.A),
  Kirmani Sadaat, Affiliation with Syed Dawood Bandgi Kirmani"). No order is named anywhere in
  the survey, though the site's own name and the saint's carry "Qadri."
- **Malik Ahmad Ayaz** — Q5 gives "Ghaznavi silsila," a dynastic rather than initiatic
  designation; the account describes political and military service, not spiritual affiliation.
- **Mian Qurban Ali Shah** — Q5 gives "Naqshbandi Majdadi - Ahl e Sunnat," mixing a silsila
  with a sect, and *nothing* in Q8/Q9/Q10/Q11/Q16/Q19 mentions any Naqshbandi chain or
  practice. The field rests on that one line alone.

**Recommendation: keep the current behaviour and make it legible.** All three entries already
decline to infer — Abul Muali Qadri is left "not stated" despite the obvious pull of the name.
That is right, and it is RULE 2 working. What is missing is that a reader cannot tell
"no silsila recorded" from "silsila recorded as X on one line with nothing corroborating it."
Consider a `silsila_note` alongside the existing `*_note` pattern (`year_built_note`,
`status_note`, `site_type_note`) rather than a new convention.

**Explicitly do not** infer Qādirī for Abul Muali Qadri from the shrine's name. The name is
evidence about the name.

### 1.3 Hijri or Gregorian, when the survey doesn't say?

**Malik Ahmad Ayaz, "8 August 1041."** The survey attaches no era marker. Two internal cues
pull Gregorian — the other absolute date in the same answer is marked "993 AD," and the survey
uses Hijri month names where it means Hijri ("12th, 13th and 14th Zil Hajj"), whereas
"8 August" is Gregorian. A Gregorian reading places the death 48 years after the "993 AD"
education, which is internally coherent; a Hijri reading cannot be reconciled with "993 AD"
at all. **1041 AH and 1041 CE are about six centuries apart.**

The note's own conclusion — "the archive should not choose on the survey's authority" — is
correct and should stand. Note also that this is the same shape as the founding-year problem
in three entries (Q6 "year founded" returning what Q9 gives as the death date), which
`year_built_precision` / `year_built_note` already handle.

**Recommendation: no change; this is already right.** But it is the single best candidate in
the whole backlog for an external check — Malik Ayaz is a documented historical figure
(Mahmud of Ghazni's governor of Lahore) with a death date available in published scholarship.
This does not need a decision, it needs one citation. See §6.

### 1.4 Cross-tradition vocabulary

**Malik Ahmad Ayaz, Q12–Q13** record that "diyas and prasad are also given on a daily basis"
at a Muslim shrine, and use "temple" for the site. Whether the enumerator is describing
genuinely syncretic practice or using loose vocabulary for lamp-lighting and *langar* is not
determinable from the survey. "Bathing" in Q13 is likewise unspecified.

**Recommendation: retain the survey's words, and say that they are the survey's words.**
The current entry retains them, which is right — silently substituting *langar* for *prasad*
would be inventing an interpretation, and South Asian shrine practice is genuinely shared often
enough that the syncretic reading is not far-fetched. The improvement is attribution: "the
survey records…" rather than a bare assertion. This is exactly the move the gold standard
praises in Bibi Pak Daman ("field surveys of the shrine record on the order of eight to twelve
thousand visitors…" rather than asserting the number).

**This one genuinely can be closed by asking Saifullah**, and it is a better question than a
ruling: *at this shrine, what is lit and what is distributed, and what do people there call it?*

---

## 2. Sensitive content — the decision that actually matters

Two entries carry claims that could harm a living institution or a named community. Both are
field surveys, and in both the surveyor states these as plain fact.

### 2.1 Darbar Abul Muali Qadri — four flagged items (qa_note item 9)

| Claim | Why it is flagged |
|---|---|
| "Because of him, millions of people entered the fold of Islam" | Mass-conversion claim, no evidence, no date |
| A son "martyred while fighting in a war against the Sikhs" | Names a religious community in a conflict claim; also chronologically odd for a saint who died 1024 AH |
| Land for **Dyal Singh College** "was also given by his descendants" | Property-origin claim about a **named, existing Lahore institution**; undated, unevidenced |
| Shared custodianship between Auqaf and hereditary custodians living on site | Living-authority arrangement of a kind that is frequently disputed |

### 2.2 Darbar Malik Ahmad Ayaz — seven flagged items (qa_note item 13)

Conquest and religious warfare ("almost 17 battles with Hindus," repeated use of "infidels");
temple destruction presented as cleverness rewarded; "instilled the spirit of Islam in the
people"; loss of shrine land attributed to "the Sikh era" and specifically to "Sikh Raja Ranjit
Singh"; enslavement and sale as the narrative's centre; the Mahmud–Ayaz bond characterised as
"love and romance"; present custodianship and reduced grounds.

### Recommendation

**Distinguish three kinds of claim, and treat them differently. They are currently treated the same.**

1. **What the tradition says about itself** — conversions, miracles, spiritual authority,
   the "love and romance" framing, "instilled the spirit of Islam." *Report freely, attributed
   to the tradition.* This is hagiography and the archive's job is to record it as such. It
   requires no evidence because it is not making an evidentiary claim. Attribution does all
   the work: "the shrine's tradition holds that…" No softening, no omission.

2. **Historical claims about events involving named communities** — the 17 battles, the temple
   demolition, the war against the Sikhs, the loss of land under Ranjit Singh. *Report,
   attributed to the survey, and do not adopt the survey's vocabulary as the archive's own.*
   Concretely: "infidels" appears in quotation as the account's word, never in the archive's
   narration. This is not sanitising — the claim stays, in full — it is declining to let one
   informant's register become the archive's register about a community that has its own
   shrines in this same archive.

3. **Verifiable claims about existing institutions and property** — the Dyal Singh College land,
   the extent of current custodianship. **These are different in kind and should be held to a
   different bar.** Dyal Singh College is a real institution, founded on a bequest from a
   named person (Dyal Singh Majithia), with its own documented history. An unevidenced,
   undated claim that a shrine's descendants gave the land is the one item in this entire
   backlog that could produce a concrete complaint. *Recommendation: attribute explicitly and
   narrowly to the survey, or hold it out of the public prose pending one citation.* This is
   the only place in this document recommending that anything be withheld, and it is
   recommended because the claim is checkable and currently unchecked — not because it is
   uncomfortable.

**The through-line:** the archive already knows how to do this. The gold standard's rule is
"name who holds each position, and do not resolve it for the reader." Applied to sensitive
content that means *attribute rather than omit* — with a single carve-out for unevidenced
claims about identifiable third parties.

---

## 3. Contradictions to leave exactly as they are

Recorded here so a later editor does not "tidy" them, which is the specific risk RULE 2 exists
to prevent. Every one of these is correctly handled today and needs **no action**:

- **Abul Muali Qadri** — 980 AH used two incompatible ways; stated lifespan (65 years) not
  matching birth/death (≈63y 3m); three irreconcilable Mughal attachments (death "during the
  reign of Shah Jahan," a wife who is Jahangir's daughter, Dara Shikoh styled "the Mughal
  emperor"); the Hakim visiting a "shrine" while the saint was alive.
- **Malik Ahmad Ayaz** — village vs. Shah Alam Market as the setting; "Raja Maharaja" crediting
  and Ranjit Singh blaming in consecutive clauses; contradictory order of deaths; name form
  varying across answers; poisoning vs. natural death, presented by the survey itself as
  alternatives; a garbled stretch at a zero-width-space that has correctly **not** been guessed at.
- **Mian Qurban Ali Shah** — disciples vs. wealthy notables as builders; a short stay vs. the
  remainder of a life at Mint Stop; one named successor vs. plural disciples; Auqaf vs.
  hereditary management; a book asserted in Q16 and denied in the trailing column; "Shah" as
  earned honorific (Q9) vs. implied Sayyid descent (Q19).
- **Smaller cross-source conflicts** — Akhund Panju Baba's location (Akbarpura, Nowshera vs.
  Misri Pura, Peshawar Sadar); Mian Umar Baba's death date (1119 AH per tazkira vs. 1776 CE on
  file, ~70 years apart); Shah Abdul Karim Bulri's relation to Shah Abdul Latif Bhittai
  (great-grandfather vs. great-great-grandfather).

Two of these deserve a note of appreciation rather than a decision. Mian Qurban Ali Shah's
item 2 observes that the urs dates bracket the stated death day consistently — "the one date
check in this survey that passes cleanly." Item 13 states that qawwali is *absent* at the site
"so that a later editor does not read it as an omission." Recording a clean check and a true
negative is exactly the discipline RULE 4 asks for.

---

## 4. Things that are notes-to-self, not decisions

No ruling needed; listed so they are not mistaken for open questions.

- **Mian Qurban Ali Shah item 12** — Q19 is written in the second person, addressing the saint
  directly; all of it has been converted to third person. A transcription hazard, already handled.
- **Malik Ahmad Ayaz item 7** — a list of genuinely unrecoverable garbled passages, quoted
  as-is and explicitly not interpreted. Correct.
- **Malik Ahmad Ayaz item 14 / Mian Qurban item 7** — Q20/Q21 blank; authors named (Allama
  Iqbal, "Kaniya Lal") with no titles, so the bibliography lists the field survey only. Correct.
- **Tomb of Ustad Nuriya** — approximate coordinates shared with the Uch Sharif mound; included
  under "Muslim Shrine" as part of the ensemble though it is an architect's tomb. Its note also
  records that the entry's new material "rests substantially on a single academic paper of
  uneven editorial quality (a Textile Design department publication, not a specialist history/
  archaeology venue)" — a provenance caveat, not a decision. Worth keeping visible: it is the
  kind of self-assessment `support_level` cannot express.

---

## 5. What this changes about `docs/TODO.md` §3

§3 named four entries. The correction:

- The count is **52 entries carrying notes**, not 4 — but only **2** explicitly ask for a
  decision (Abul Muali Qadri, Malik Ahmad Ayaz), and those same 2 carry the sensitive material.
  Mian Qurban Ali Shah's 13-item note, listed in §3 as needing a call, in fact resolves every
  item itself and asks for nothing.
- **Darbar Hazrat Shah Gohar Peer** was listed in §3's neighbourhood but its 2,016-char note is
  a coordinates-and-gaps note, not a contradiction list. It needs Saifullah (a pin), not an editor.
- The three smaller tazkira conflicts §3 lists are correctly described and belong in §3 above.

---

## 6. What needs someone other than the editor

- **A historian, for one date.** Malik Ayaz is a documented figure — Mahmud of Ghazni's
  governor of Lahore. One published death date settles the AH/CE question in §1.3 and costs a
  citation, not a decision.
- **Saifullah, for one question.** At Malik Ahmad Ayaz: what is lit, what is distributed, and
  what do people there call it? (§1.4.) *Deliberately not added to the current message to him.*
- **Nobody, for the rest.** §3 and §4 are closed. §1.1's audit — does the public prose reflect
  each recorded doubt — is delegable work that needs no new information.

---

## 6. DECIDED — 22 August 2026, by Rauf (in session)

All four policy questions plus the sensitive-content call were answered. Recorded verbatim
so no later session re-litigates them:

| Question | Ruling |
|---|---|
| §1.1 reader visibility of internal contradictions | **Publish a reader-facing version** — a cleaned per-entry "source notes" disclosure summarizing internal contradictions. Not the raw `qa_note` (it stays internal); a reader-addressed summary. Goes further than this doc's recommendation. |
| §2 sensitive content | **Attribute everything, withhold nothing.** Tiers 1–2 as drafted (tradition claims attributed to the tradition; community-history claims attributed to the survey, its vocabulary in quotes). The Dyal Singh College land claim stays public with explicit survey attribution — the hold-pending-citation carve-out was declined. |
| §1.2 non-silsila answers in the silsila field | **Add `silsila_note`** (the `*_note` pattern). Patch to be produced for import; no inference from names. |
| §1.3 Hijri/Gregorian ambiguity | Not re-asked — the doc records it as already right (no change). |
| §1.4 cross-tradition vocabulary | Not re-asked — retained-and-attributed is mechanical once §2 is decided; the clarifying question goes to Saifullah in the updated field message. |

Also decided in the same sitting (Lane B operational items):

- **Oral/video media: no-go for now.** "Ignore oral and video media publishing on the
  website at the moment." F3/F8/F9 stay parked; `docs/DECISION_oral_histories.md` remains
  the reference if reopened.
- **The two coordinate-less rows** (Shah Gohar Peer, Mian Qurban Ali Shah): **show them
  without map pins** — pages, list and search presence, honestly marked unmapped. No
  coordinates invented; no field ask for now.
- **`data/patch_schema_and_truncation.csv`: regenerate against the current snapshot first**
  (it may have drifted since 18 Aug), then Rauf imports. The regenerated patch should carry
  the new `silsila_note` column.
- **Saifullah message: update the 16 Aug draft** (re-shoots + the §1.4 prasad/diya
  question), then Rauf sends.
- **Zenodo DOI and the Auqaf register: parked.** In their place, a new direction:
  **connect shrines with the Auqaf mosques data** (the `RaufNawaz/Awqaf` repo — mosque
  survey with a "Women's prayer section" column and a "Shrine Name" join key), starting
  with women's-prayer access shown from shrine pages.
