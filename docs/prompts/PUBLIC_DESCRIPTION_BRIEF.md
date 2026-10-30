# Public description brief: the visitor's article, in English and Urdu

**Ruled by Rauf, 24 October 2026, in chat.** He read the rewritten Descriptions
(`DESCRIPTION_REWRITE_BRIEF.md`) and ruled:

1. They read like an encyclopedia. The public page should read like a website that has distilled
   the information.
2. Do not keep citing authors. Parse and synthesise the material into one seamless, coherent,
   informative narrative.
3. Do not present conflicting accounts side by side. Say there is no consensus and give the
   generally cited or established position. The site gives a general overview and understanding,
   not an academic apparatus. **Keep the detailed descriptions for the team; give the public a
   simplified version.**
4. Length: shorter, intelligible to an average reader. Asked how long, he answered: **"scale them
   down to 0.75 of the current ones"**. Shown the Shah Jamal pilot (0.45, everything uncertain and
   every "the book says" removed), he ruled: **"add back family members, everything which is
   obviously important information, but no need to add what authors say"**. So the length is what
   the important information gives, up to about 0.75; it is never made up with source talk.
5. Use verifiers to make sure the Urdu versions are in line with the English and read fluently and
   smoothly.
6. The scheduled task continues this process.

This brief is binding on whoever drafts, a scheduled firing or a worker it briefs. Read it whole.
CLAUDE.md RULE 2 governs every sentence: the public article may simplify, merge and leave out, but
it never says anything its source does not say.

## Two versions of every article

| file | what it is |
|---|---|
| `entries/descriptions/<id>.md` | **TEAM version.** The full article with every citation, doubt and disagreement (`DESCRIPTION_REWRITE_BRIEF.md`). It is the source of the public version and stays the record. **Never edit it in this stage.** |
| `entries/descriptions_public/<id>.md` | **PUBLIC English.** Becomes the sheet's `Description` cell at import. |
| `entries/descriptions_public/<id>.ur.md` | **PUBLIC Urdu.** Becomes `urdu-i18n/content/<slug>.md` at import (`public_description_queue.py view <id>` prints the slug). Never write `urdu-i18n/content/` in this stage: `urdu_content_qa.py` compares that folder with the English the site has now, and a long new Urdu beside the old short English is an over-coverage ERROR. |
| `entries/descriptions_public/<id>.notes.md` | For Rauf and the team: the verifier verdicts (first lines, exact form below), every consensus choice and its basis, what was left out and why. |
| `entries/descriptions_public/verify/<id>.<V>.r<N>.txt` | Every verifier's whole reply, one file per round, saved the moment it arrives. |

The only source of the public version is the team version (and, for a term's gloss, `data/glossary.csv`;
for Urdu spellings, `urdu-i18n/urdu-dictionary.json` and the row's existing `urdu-i18n/content/<slug>.md`).
Do not go back to the books, the entry or the web. If the team version does not say it, the public
article does not say it.

## Voice: a website that distils, not an encyclopedia

- **Reader:** an interested visitor, student or pilgrim with no background in Sufism, Sikh or Hindu
  tradition, or Lahore's history. Warm, clear, confident, plain English. British spelling, as the
  archive uses.
- **Lead with the place.** The first paragraph stands on its own as the summary a visitor reads on the
  map card: what the site is, where it is, whose it is, and why people go there. Two to four sentences.
- **Tell it as a story.** Life, shrine, practice, legends and setting flow as narrative, each paragraph
  leading into the next. Short paragraphs (three to six sentences). No lists in the prose.
- **Explain every term** the first time it appears, in a few words, in the sense `data/glossary.csv`
  gives (*ʿurs*, the yearly commemoration of the saint's death; *langar*, the free communal kitchen;
  *chilla*, a retreat of forty days in seclusion), or for a term the glossary lacks, its plain
  dictionary sense (*chadar*, the sheet of cloth laid over the grave). A gloss is a definition, never a
  fact about this site. Keep italics for such terms.
- **No em dashes or en dashes** in the prose (Rauf's standing rule; rephrase). Do not coin
  hyphenated words of our own ("a nineteenth century account", "a retreat of forty days"); a hyphen
  that belongs to a name's established spelling (Surkh-Posh, Rabi-ul-Sani, Ganj-Bakhsh) stays exactly
  as the team version spells it.

## What changes from the team version

1. **No citations in the text.** No "(Surname, *Title*, p. N)", no page or folio numbers. The
   `## Bibliography` stays at the end, **every item of the team version's bibliography, verbatim, in
   the same order**, so a reader still has the sources.
2. **Do not narrate the sources.** Not "Lahori writes", "Chishti records", "according to Kugle",
   "Kanhaiya Lal's history lists", "the shrine's account holds", "the books know the site well". State
   the content. Where the date of a description matters, anchor it in time, not in an author ("By the
   1870s …", "In the late nineteenth century …"), and only as precisely as the book's bibliography
   item allows: Lahori 1875 and Kanhaiya Lal 1884 are firm, but Chishti's 1867 is marked "the date
   unconfirmed", so Chishti's material is "in the nineteenth century", never "the 1860s" (V1 caught
   this on both pilots). A source may be
   named only where the source is itself part of the story: a poet's own verse, a celebrated text the
   site is known for. A quotation of a person may stay ("as one historian of Lahore's saints put it,
   …"), without the surname.
3. **Legends stay legends.** "Tradition holds", "it is said", "devotees tell". Never in the narrator's
   own voice as fact. Field and survey material stays plain reported fact as the team version gives
   it; do not open every sentence with "It is reported that".
4. **No side by side disagreements.** No `## Where the Sources Disagree` section and no listing of
   variants anywhere. Take each disagreement the team version records and decide:
   - **It matters to a visitor** (a birth or death year, a founding date, a lineage, an order, an
     identification): give the established position and, in one clause, that accounts differ. "Accounts
     of the year of his death differ; the year the shrine keeps is 1671." "There is no settled view of
     his order; he is most often counted a Suhrawardi." Say "most often" only when most sources do.
   - **Choosing the established position**, in this order: (a) the position the shrine itself keeps
     (the current site text, the custodians' account, the date the *ʿurs* follows), unless the team
     version shows every other source against it; (b) otherwise the position most of the team
     version's sources give; (c) otherwise the earliest account devoted to this site; (d) where none of
     these settles it, say there is no consensus and give the range ("between 1649 and 1671") without
     choosing. Never invent a verdict, never average, never give a date no source gives.
   - **It is minor** (how many storeys sank, a day's difference, a variant spelling, which of two
     words a phrase used): give the commonly told version and drop the variant silently.
   - **Never merge two chains or two accounts into one.** If the shrine names one master and the only
     clear chain of masters starts from another, give the shrine's master and say where the line is
     most often traced; do not hang the second chain under the first (V1 caught this on the pilot).
   - Record every choice and its basis in the notes file (`- Death year: 1671, basis (a) …`).
5. **Nothing about the printed text reaches the public.** No `[OCR?]`, "illegible", "uncertain in
   print", "the copy consulted", "a damaged passage", "a reading uncertain in the printed text". If a
   fact rests on an uncertain reading, leave it out of the public version (the team version keeps it).
   In a list of names (a chain of masters, a family, a set of places), drop the uncertain names, and
   keep the line only if its point still stands.
6. **No archive or process talk, and no embellishment.** No "this archive", "this entry", "the sources
   consulted here", "set out below", "told below", "what follows", "is not recorded in the sources
   consulted", "the books". No evaluative or connective additions the team version does not make
   ("a tender story", "curiously", "has a long history", "busy with", "not forgotten", "best known"),
   no counts it does not give ("two of his disciples"), no "near" for "in".
7. **Keep every piece of obviously important information** (Rauf, on the pilot). The life, family and
   teaching; **the family members by name** (parents, brothers, descendants, the keepers and their
   households, the sweepers' family where the team version names them); the disciples; the chain of
   masters link by link where the team version gives it clearly; the building and its parts, its
   measurements, its inscriptions and who raised them, how it changed; endowments and offerings;
   the places of retreat; the festivals and weekly practice; the legends; the poetry; the setting;
   the legacy. Write names and lists into sentences, not bullet lists. What goes is only the source
   apparatus: citations, who said what, side by side variants, and readings the team version marks
   uncertain or illegible (rule 5). A name the team version flags (`[OCR?]`, "uncertain in print") is
   left out of a list rather than given as certain.

## Verse

- Keep the team version's verse paragraphs **exactly** (original script, one hemistich or line per
  line, nothing else in the paragraph: `src/components/shrine/ProseParagraphs.tsx` renders that shape
  as a verse block), with their English rendering in italics as the next paragraph. Introduce each
  verse with a sentence that tells the reader why it matters. Add no verse the team version lacks.
- In the rendering paragraph, replace the citation with the translator's credit only, for a published
  translation: `(translated by Christopher Shackle)`. A gloss or plain statement of the verse's subject
  takes no credit.
- **Originals (Rauf, 30 October 2026).** "The original needs to be there": every verse quoted in
  English rendering should stand under its original, and where the original is not Urdu it is quoted as
  written (Gurmukhi for Guru Nanak) with the Urdu translation under it in the Urdu article. The one
  exception to "add no verse the team version lacks": an original recorded, with its source, in
  `entries/verse_originals/registry.json`, inserted above its rendering in both languages by
  `pipeline/apply_verse_originals.py`, which also adds its source to the bibliography and moves the
  verdict stamps only when the rest of the text is byte for byte what passed. A writer does not add
  originals by hand; add them to the registry (see `entries/verse_originals/README.md`).

## Shape

Markdown, the same formatting invariants as the team version (`check_description_draft.py` F1 to F4,
F6): one paragraph per line with a blank line between, `## ` headings only, balanced asterisks, no
HTML, footnotes or tables, no `## ` section over 45,000 characters.

Fewer, reader facing headings, renamed to fit the tradition (The Gurdwara, The Temple, The Goddess,
The Guru's Visit):

`## Overview` · `## The Saint` (life, family, teaching, death) · `## The Shrine` (founding, the building
through time, keepers) · `## Devotion and Festivals` · `## Legends` · `## Poetry` (only if the verse is
not better placed in the narrative) · `## The Setting` · `## Legacy` · `## Bibliography`

Use only the headings the material fills; three to seven before the bibliography is usual. No
`## Where the Sources Disagree`, and no thin sections of one paragraph that belong in a neighbour.

## Length

**Up to about three quarters (0.75) of the team version, as the important information allows**,
measured on the prose before `## Bibliography` (characters, both sides). The checker accepts 0.40 to
0.85 (L1). Measured on the two pilots (24 October): the citations and the disagreement section are about
30% of a team version, and the "who said what" framing and the uncertain readings most of the rest, so
rows rich in uncertain readings land low (Shah Jamal 0.44, Baba Shah Kamal 0.46, both with every
important fact kept, as V1 confirmed) and rows whose books are clean land higher. The length comes from
keeping every important fact (rule 7) and explaining it to a general reader, never from padding,
repetition or source talk. Under 0.40, important information has almost certainly been cut: restore it.
Over 0.85, the draft is still narrating sources.

**The one exception (25 October, bibi-pak-daman).** A team version that is mostly rival accounts can fall
below 0.40 with nothing important lost: there, two fifths of the text was a second identity for the six
women, which rule 4 removes. Never keep side by side material, pad, or restore rejected variants to reach
0.40. Instead, when a V1 report has swept the team version and found no important omission, add to the
notes the line `L1 exception (V1 round N): <the cause, in one sentence>`; the checker then accepts down
to 0.30. Below 0.30, assume something important has been cut. The only further step (26 October,
shrine-of-jalaluddin-surkh-posh-bukhari): when a V1 sweep states in plain words that the honest length is
under 0.30 and every omission it judges important is restored, the coordinator writes
`L1 exception below 0.30 (V1 round N): <the cause, in one sentence>` and the checker accepts down to 0.25.
Record every such row for Rauf in the run record.

## The Urdu version

Write `entries/descriptions_public/<id>.ur.md`, a full Urdu article of the public English:

- **The same sections in the same order**, headings in Urdu (for example `## تعارف`, `## حیات و
  تعلیمات`, `## مزار`, `## عقیدت اور عرس`, `## روایات`, `## شاعری`, `## ماحول`, `## ورثہ`), the
  same facts, **nothing more and nothing less**. No bibliography section: the site shows the English
  bibliography to Urdu readers (CLAUDE.md, Internationalization rule 7).
- **Native, fluent, educated Urdu**, the register of a good Urdu magazine or reference work for the
  general reader, never a word for word rendering of the English: natural Urdu word order, idiomatic
  connectives, correct gender and number agreement, correct postpositions and izafat, sentences of a
  comfortable length.
- **Names and terms** as `urdu-i18n/urdu-dictionary.json` spells them (SHRINE_NAMES, SAINTS,
  PLACE_TOKENS) and as the row's existing `urdu-i18n/content/<slug>.md` spells them; honorifics as
  `data/glossary.csv` gives them (حضرت، پیر، خواجہ، سیّد، شاہ، بابا); religious formulae such as
  رحمۃ اللہ علیہ sparingly, as the existing Urdu article uses them.
- **No Latin letters** anywhere in the file. **Numbers in Western digits** (1671, 4): the site converts
  them. Only figures the English has (`urdu_content_qa.py` warns on any other).
- **No em or en dashes**; Urdu punctuation (، ۔ ؟).
- **Glosses are for the English reader.** An Urdu reader knows خانقاہ، مدرسہ، چلہ، قوالی، لنگر، سجادہ
  نشین، عرس، چادر، گز; do not carry the English article's glosses of such words into the Urdu. Keep a
  gloss only for a term unfamiliar to an Urdu reader (چڑھت، قلندر), and never place it between a noun and
  its postposition. V2 does not count a dropped gloss of a familiar word as an omission.
- **Write it as Urdu, not as translated English** (the first V3 pass on the pilot found these): avoid
  the calques یاد کیا جانا / کے طور پر یاد کیا جاتا ہے ("remembered as"), کے لیے جانا جاتا ہے ("known
  for"), تب سے اب تک ("has since"), کبھی نصب ("once set up"); do not set a name between commas English
  style so that it is cut off from its postposition; resolve every ان / انہوں نے to a clear person,
  naming the person again where English uses "his" across sentences; split sentences of more than three
  clauses; vary repeated verbs (سنایا جاتا تھا, مانا جاتا ہے); and do not paraphrase a couplet in prose
  just before quoting it, since the Urdu reader reads the couplet itself. English "by the 1880s" is a
  perfect in Urdu (… تک گر چکی تھی، شہرت پا چکے تھے): تک with a plain past (… تک شہرت تھی) reads as
  "until" (V3 caught this on the pilot). "Remembered as" is مانے جاتے ہیں، مشہور ہیں، بتایا جاتا ہے,
  not یاد کیا جاتا ہے.
- **Italics** only on a term an Urdu reader would not take as ordinary Urdu (دمدمہ، دھمال، چڑھت، ختمِ
  خواجگان); not on عرس، لنگر، قوالی، چادر، مرید، مدرسہ، گز، سلسلہ, which the English italicises for its
  own readers. Remove both asterisks of a pair.
- **What V2 and V3 kept finding in batch 1** (25 October; four rows took three or four Urdu rounds, with
  46 to 75 fluency issues in each first draft). Check every draft for these before handing it over:
  - *Hedges must govern the whole claim.* "X is probably linked to Y through Z" is not
    غالباً X کا Y سے تعلق Z کی وجہ سے ہے (the link becomes a given); write غالباً Z کے سبب X، Y سے وابستہ ہیں.
  - *English articles.* Drop a calqued ایک for "a"; and never introduce a person the English already
    knows as نامی ایک شخص or ان کے ایک دوست (it makes him a stranger); "much of" is بڑا حصہ, not بیشتر.
  - *English possessives and parentheses.* "X's own" is خود X کا, not X کا اپنا; "it is said" set off by
    commas mid sentence, and long relative clauses between commas, become plain Urdu order.
  - *Words that mislead:* منظرنامہ means scenario (use جغرافیہ or سرزمین); آئینہ دکھانا means to confront
    with an unflattering truth; عزت کی قیمت پر means by sacrificing honour; اسلام لانا means to convert
    (to bring Islam is اسلام لے کر آنا); صحبت is the company of the living (burial near a saint is
    جوار); یکے بعد دیگرے is adverbial, not an adjective; a woman scholar is عالمہ; جانا (knew) next to
    براہِ راست reads as "went"; موری is a drain, not Moorish (اندلسی).
  - *Agreement* with the noun a relative stands for (سارنگی ... جو ... سمجھی جاتی ہے); جانب is feminine.
  - *Referents across paragraphs:* "the saint's tomb" after a paragraph about another man's tomb, "this
    century" after a paragraph set in another century: name the person or the century again.
  - *Repetition* of a word inside one sentence (روایت twice, امام three times, بزرگ three times).
- **Verse paragraphs are copied byte for byte** from the English file (they are already in the original
  script). Where the English has an italic rendering paragraph after the verse, give its meaning in Urdu
  as one short italic paragraph, no credit line (Latin is not allowed and the English page carries the
  credit); where the English has none, add none. Exception: a verse already in Urdu needs no Urdu
  meaning (the reader reads the couplet itself), so add the meaning paragraph only for Persian, Arabic,
  Punjabi, Sindhi or other verse an Urdu reader may not follow.
- **Length:** the Urdu prose is 0.85 to 1.15 times the English prose in characters
  (`urdu_content_qa.py` allows 0.75 to 1.20 and errors above 1.20).
- Asterisks balanced; a blank line before every heading (`build_urdu_content.py` refuses either fault).

## Verification: the verifiers Rauf asked for

Every row passes **three independent verifiers**, each a fresh worker that did not write the text and is
given only the files it needs. Each returns `PASS` or `FAIL` with numbered issues, each issue quoting the
sentence and proposing the exact fix. The prompts are at the end of this brief: use them as written.

- **V1 English fidelity** (team version + public English): every statement in the public English is
  supported by the team version (no new fact, date, number, count, name or relationship; no
  embellishment; legends still framed as legends); every consensus choice follows rule 4 (no merged
  chains, no more certainty than the team version allows); nothing rests on an uncertain reading; no
  citation, attribution, signposting, uncertainty or archive language survives; time anchors are firm;
  nothing obviously important has been dropped (lists what was).
- **V2 Urdu fidelity** (public English + Urdu): paragraph by paragraph, the Urdu says the same thing.
  Flags every omission, addition, changed number, date, name, title, relationship or certainty, and any
  legend turned into fact. Dropped glosses of familiar words are not omissions.
- **V3 Urdu fluency** (the Urdu ONLY, read as a native Urdu editor would read a magazine proof): flags
  literal calques and English word order, agreement errors, wrong postpositions or izafat, unidiomatic
  collocations, register slips, overlong or tangled sentences, ambiguous pronouns, glosses of familiar
  words, and inconsistent spellings, and gives a corrected sentence for each. It passes only when the
  whole article reads smoothly and naturally; matters of taste go under NOTES and do not fail it.

**Order** (measured on the pilots): V1 until it passes, THEN write the Urdu, THEN V2 and V3 together.
Writing the Urdu before the English had settled cost the pilots three Urdu rewrites.

**Fixing.** The writer applies every issue (or records in the notes why an issue is rejected: never
because it is inconvenient), then re-runs the verifier that failed on the new text. Applying a
verifier's optional NOTES is allowed, but any change to a file makes the verdicts on that file stale,
so the verifier runs again (on the pilots, an applied note once introduced a new fault). A verifier
that has failed four rounds leaves the row for Rauf (`rauf` in the queue).

**Stopping, so polish does not loop** (batch 1, 25 October: every PASS came with optional notes). After
the FIRST pass of a verifier, apply its optional notes that correct meaning or precision (an attribution,
an ambiguous referent, a word the source does not have), each in the verifier's own wording; skip pure
taste. Then run that verifier once more as a CONFIRMING round: give it the list of changed sentences
(old and new) and the team version (or the English, for V2), and ask only whether each change is
supported and introduces no fault. The confirming round's own optional notes are recorded in the notes
file and NOT applied, unless one names an unsupported fact, which is then an issue and FAILs the round.
The V1 confirming round can run alongside V2 and V3 when the Urdu already carries the same changes.

**Late rounds, measured on batch 2 (25 October).** Round 1 of V2 and V3 on a long article returns dozens of
issues and goes back to the writer. When a later round returns only a handful, each with the verifier's
corrected sentence, the coordinator may apply them itself in that wording (a script that replaces each
exact OLD string once and writes `verify/<id>.ur.r<N>.changes.txt`), then run ONE confirming worker that
does V2 and V3 together on the changed sentences only, diffing against a backup to prove nothing else
moved. Two of 36 such edits in batch 2 were themselves faulty (a gender left unchanged, a doubled phrase),
and the confirming round caught both: never skip it. Rounds count as usual (four at most).

**Recording, so that any firing can resume** (Rauf, 25 October: "even if limits run out it can pick
up later at each run"). The moment a verifier answers: (1) save its whole reply as
`entries/descriptions_public/verify/<id>.<V1|V2|V3>.r<round>.txt` on the Mac; (2) run
`python3 pipeline/book_queue/public_description_queue.py verdict <id> <V> PASS|FAIL <round>`, which
rewrites that verdict's line at the top of `<id>.notes.md`, stamped with the md5 of the file(s) the
verifier read:

    V1 English fidelity: PASS (round 3) en:47a5be5b
    V2 Urdu fidelity: PASS (round 4) en:47a5be5b ur:18d680d1
    V3 Urdu fluency: PASS (round 4) ur:18d680d1

A stamp that no longer matches its file is stale and counts as not passed, so a verdict can never
outlive an edit. Both the queue and the checker read these stamps.

## The checker

`python3 pipeline/book_queue/check_public_description.py <id> [<id> …]` must exit 0. It checks:

- F1 to F4, F6: the shape (shared with `check_description_draft.py`).
- P1 no inline citations, page or folio references. P2 no narration of a cited author ("Lahori writes",
  "according to Kugle", "Chishti's account"). P3 no uncertainty, process or archive vocabulary. P4 no
  `## Where the Sources Disagree` (or any heading with "Disagree"). P5 no em or en dash in the prose.
- L1 length: public prose / team prose between 0.40 and 0.85 (from 0.30 with a V1-backed `L1 exception` line in the notes; from 0.25 with `L1 exception below 0.30`).
- Q1 every Arabic script run of three or more words occurs verbatim in the team version. Q2 every English
  quotation of six or more words occurs in the team version.
- B1 the bibliography is the team version's, item for item, in order.
- U1 to U7 the Urdu file: present; no Latin letters; no dash; balanced asterisks; a blank line before each
  heading; as many `## ` headings as the English has before its bibliography; prose ratio 0.75 to 1.20;
  every verse paragraph of the English present verbatim; no figure the English lacks.
- V the three PASS lines at the top of the notes file, each stamped with the md5 of the CURRENT file(s)
  and each with its report saved in `verify/`.

If it fails, fix the draft, not the check (RULE 4), unless the check is wrong; then fix the check and say
so in the run record.

## The queue, and resuming after a firing is cut off

`python3 pipeline/book_queue/public_description_queue.py status | next N | view <id> | resume <id> | verdict …`

Scope: the 94 rows in `data/review/descriptions_approved.txt` (the rows with a team version). The two
pilot rows (`shah-jamal`, `shrine-of-baba-shah-kamal`) were done interactively on 24 and 25 October 2026
and are the house style: read one of them (all four files) before drafting.

Every row moves through five steps, and the queue reads which step it is at from the files alone:
`draft-en` → `verify-en` (V1) → `draft-ur` → `verify-ur` (V2, V3) → `done` (or `rauf`). `next` lists rows
already under way first, then new rows shortest first. So **a firing that the usage limit cuts off loses
at most the step it was in**: the next firing runs `next`, sees the row at that step, and carries on. For
that to hold:

- **Write every result to the Mac as soon as it exists**: each draft, each Urdu file, each verifier
  report and verdict, each fix. Never hold work in the cloud container to write back at the end.
- **Claim before work, and only for the step**: `notes_claim.py claim pub__<id> --session <session>`
  (the claim expires after 90 minutes, so a dead firing's claim frees itself); skip a row a sibling
  holds; release it when the step's files are on the Mac.
- **Never trust the previous firing's report over the files.** `resume <id>` says what is next.
- If the bridge drops, keep drafting in the cloud and write a pending section to the project, as earlier
  firings did; the next firing with a bridge appends it and writes the files.

## One firing

1. Read the last 3-4 HANDOVER §9 sections and any pending project doc, then
   `public_description_queue.py status` and `next 3`.
2. For each row in that order, run its next step, writing each result to the Mac as it lands:
   - `draft-en`: one writer worker (this brief, the team version, `data/glossary.csv`, both pilot rows)
     writes `<id>.md` and `<id>.notes.md` (consensus choices, left out); the coordinator runs
     `check_public_description.py <id> --english-only` (exit 0). A team version over 60,000 characters of
     prose is split by section between writers and joined by the coordinator.
   - `verify-en`: V1; save, `verdict`; on FAIL apply the fixes, check, run V1 again.
   - `draft-ur`: one writer (this brief's Urdu section, the public English, `urdu-i18n/urdu-dictionary.json`,
     the row's existing Urdu article, the pilots' Urdu for shared names) writes `<id>.ur.md`; the
     coordinator runs `--no-verdicts` (exit 0).
   - `verify-ur`: V2 and V3 in parallel; save, `verdict`; on FAIL apply, check, re-run what failed.
3. Up to three rows a firing, fewer for long ones; stop cleanly between steps when the budget is low.
4. The coordinator re-runs `check_public_description.py` on every row it touched (RULE 4), md5s every file
   it wrote, releases the claims, and writes the §9 run record (`Stage: notes`): rows advanced and to
   which step, each finished row's consensus choices, any verifier issue rejected and why, rows left for
   Rauf.

Workers read text only, so they can run in the cloud on a staged bundle (the tarball method of
`DESCRIPTION_REWRITE_BRIEF.md`, "Running the workers in the cloud"); bring the files back through
`/mnt/user-data/outputs/` and `device_commit_files` under fresh names, md5 on the Mac.

## When all 94 are done: ask Rauf, do not build

The import needs three things Rauf decides (RULE 5, ask in chat): (a) the public English into
`Description` and its continuation columns; (b) the team version into a team only column that only the
site's Team view shows (`hasProjectAccess()`, CLAUDE.md "Public view and team view"), which needs a small
site change in `src/` before any import, because an unknown sheet column otherwise shows up as an infobox
field (`fieldAliasing.ts`); (c) the Urdu files into `urdu-i18n/content/<slug>.md`. Then ask before widening
to rows without a team version. Never build an import, push or touch the sheet in this stage.

## Appendix: the verifier prompts (use as written; fill in the paths and round)

**V1.** "You are an independent fact checking verifier (V1, English fidelity) for a heritage website. You
did not write the text. Be rigorous; do not rubber stamp, but do not invent problems. Read in full: the
rules, docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md; the source, entries/descriptions/<id>.md (the team
version, the ONLY allowed source of facts); the text under review, entries/descriptions_public/<id>.md;
[from round 2: the previous round's report, verify/<id>.V1.r<N-1>.txt, whose issues were applied]. Check
sentence by sentence: (1) every statement, number and count is supported by the team version, with no
embellishment (definitional glosses allowed); (2) legends and traditions stay framed as such; (3)
disagreements per rule 4: established position, one clause that accounts differ where it matters, no side
by side variants, no merged chains, no more certainty than the source; (4) nothing resting on a reading
the team version marks uncertain, illegible or [OCR?]; (5) no citation, page reference, narration of
sources, signposting, archive or process language, and time anchors only where the source date is firm;
(6) no important omission (Rauf: keep family members and everything obviously important). Do not edit
any file. Reply exactly: VERDICT: PASS or FAIL / ISSUES: numbered, [type] quote -> problem -> exact fix,
or 'ISSUES: none' / NOTES: minor points. FAIL only for an unsupported claim, uncertain reading as fact,
source talk, merged chains, or an important omission."

**V2.** "You are an independent bilingual verifier (V2, Urdu fidelity) for a heritage website. You did not
write either text. Read in full: the English (the authority), entries/descriptions_public/<id>.md, ignoring
its Bibliography; the Urdu under review, <id>.ur.md; the section 'The Urdu version' of
docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md (dropped glosses of familiar words, a dropped prose paraphrase of a
couplet and removed italics on ordinary words are deliberate, not omissions). Go paragraph by paragraph:
every fact, name, title, number, date, place, relationship and qualifier ('it is said', 'tradition holds',
'accounts differ', 'most often', 'about') present with the same meaning; nothing added (no extra facts,
identifications or certainty; conventional honorifics such as حضرت are fine); legends stay legends;
pronouns and names refer to the same people; headings correspond; verse identical. Do not edit any file.
Reply exactly: VERDICT: PASS or FAIL / ISSUES: numbered, [omission / addition / changed fact / changed
certainty / wrong reference] English | Urdu -> problem -> corrected Urdu, or 'ISSUES: none' / NOTES:
style only."

**V3.** "You are a senior native Urdu editor (V3, Urdu fluency) proofreading an article for a Pakistani
heritage website before publication. Read ONLY the Urdu text, entries/descriptions_public/<id>.ur.md; do
not consult any English version. Standard: polished, natural, educated Urdu prose for general readers, as
in a good Urdu magazine or reference work. Flag: literal calques and English word order (e.g. یاد کیا
جانا for 'remembered as', کے لیے جانا جاتا ہے for 'known for', names set between commas and cut off from
their postposition); agreement errors; wrong postpositions or izafat; unidiomatic collocations; register
slips; overlong, tangled or ambiguous sentences and pronouns; repetition; glosses of familiar words;
inconsistent spellings; punctuation (Urdu ، ۔ ؟, no em or en dashes). Fixes must not add or remove facts,
must keep Western digits, no Latin letters, balanced asterisks, and verse paragraphs exactly as they are.
Do not edit the file. Reply exactly: VERDICT: PASS or FAIL / ISSUES: numbered, [type] quote -> what is
wrong -> corrected sentence, or 'ISSUES: none' / NOTES: taste. PASS when the article reads smoothly and
naturally to a native reader and what remains is taste; FAIL for genuine errors."
