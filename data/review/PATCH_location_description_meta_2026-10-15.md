# Location / Description meta-text clean-up — proposed patch, 15 October 2026

**Status: APPLIED 17 Oct 2026 (HANDOVER §9.360)** as part of `PATCH_location_description_meta_2026-10-17.tsv`, extended with Rauf's rulings 10-12 (§9.357). The text below is the original proposal.

~~**Status: PROPOSED, NOT APPLIED.**~~ Nothing in `data/import_2026-10-15.csv`, `entries/descriptions/*.md` or the sheet was changed.
Rauf's rulings of 15 Oct ~05:30Z (HANDOVER §9.351): (a) a Location cell keeps only the location; (b) the substance of any survey commentary goes into the Description as plain reported fact; (c) no meta-text about what the surveyor uploaded, which sources were or were not supplied, or what the survey omits; (d) readable prose; (e) an Urdu-script accuracy check of the new material (NOT in this patch — next firing).

- Patch: `PATCH_location_description_meta_2026-10-15.tsv` (27 lines, 9 rows; `\n` = newline). Columns `id, field, action, old, new, note`.
- Check: `python3 pipeline/book_queue/check_location_meta.py verify-patch data/review/PATCH_location_description_meta_2026-10-15.tsv` → every `old` occurs exactly once in the import cell (Description parts joined as the site joins them) AND in the row's `entries/descriptions/<id>.md` where one exists (4 rows); after applying in memory the touched rows scan clean. **exit 0.**
- `python3 pipeline/book_queue/check_location_meta.py scan` → 20 hits today (8 Location cells, 9 Description paragraphs, 3 of them also in the md drafts) — exactly the set this patch removes; it exits 1 until the patch is applied, and should then be part of the pre-import checks.
- The 318 new rows: no Location cell carries survey/pin commentary; their Descriptions come from the books, not the survey.

## Location cells (8)

| id | now begins | proposed |
|---|---|---|
| darbar-abul-muali-qadri | "Lahore. The survey places the saint's mosque and seminary near Mochi Darwaza …" | Lahore |
| ghazi-ilm-din-shaheed | "Miani Sahib Graveyard, Lahore. The field survey itself locates the shrine only as …" | Miani Sahib Graveyard, Lahore |
| khawaja-feroz-ud-din-gharib-nawaz | "Miani Sahib Graveyard, Lahore, Punjab. The field survey places the shrine …" | Miani Sahib Graveyard, Lahore, Punjab |
| darbar-hazrat-shah-gohar-peer | "Lahore (no locality, address or coordinates recorded in the survey)." | Lahore |
| tahir-bandagi-qadri | "Miani Sahib Graveyard, Lahore. Per the field survey, this shrine is the oldest seat …" | Miani Sahib Graveyard, Lahore |
| darbar-malik-ahmad-ayaz | "Shah Alam Market; the survey places the mazar near Darbar Ali Hajveri …" | Shah Alam Market, Lahore **(", Lahore" added — question 3)** |
| darbar-mian-qurban-ali-shah | "Mint Stop, Lahore (as given in the survey; …)" | Mint Stop, Lahore |
| wasif-ali-wasif | "Miani Sahib Graveyard, Lahore — the survey gives no street address …" | Miani Sahib Graveyard, Lahore |

Where the Location cell's substance was not already in the prose it is added as reported fact: Ghazi Ilm Din's burial at Miani Sahib (cited to the row's own bibliography item, *The Friday Times*, 20 May 2022) and Tahir Bandagi's graveyard of "some 475 kanals". Everything else (Mochi Darwaza seminary, Dyal Singh College, the graveyard growing round Tahir's tomb, Data Darbar as landmark, the plot beside Miani Sahib) is already in each Description. The pin caveats are NOT dropped: they are appended to the team-only `qa_note` of the same row.

## Description paragraphs (11 edits)

- darbar-abul-muali-qadri: deletes "The surveyor uploaded nine photographs and one audio or video recording; no book or pamphlet was supplied." (Rauf's own example).
- darbar-malik-ahmad-ayaz, peer-makki: delete the one-line "… given here in the account's own terms" paragraphs.
- khawaja-feroz-ud-din-gharib-nawaz: drops "The field survey that is this entry's only source gives no street address … no coordinates — only that" (keeps the fact) and "The survey does not, however, give the calendar date on which the Urs falls …".
- darbar-mian-qurban-ali-shah: the silsila sentence rewritten as reported fact without "the only … information the source gives"; drops "No title is given and no copy was supplied to the surveyor."
- darbar-hazrat-shah-gohar-peer: "The survey also notes that he wrote no book … none is named, and none was available." → "Shah Gohar Peer is said to have written no book himself …".
- ghazi-ilm-din-shaheed: "The field survey that is this entry's only source describes a shrine visited daily … and calls him" → "The shrine is visited daily … and devotees call him"; adds the Miani Sahib burial sentence.
- tahir-bandagi-qadri: adds "The graveyard is reported to cover some 475 kanals."

## Questions for Rauf (asked in chat, RULE 5)

1. **The other ~150 attributions.** 29 rows still name the survey as a source in running prose ("the survey states …", "the account given to the surveyor …", "per the 2026 field survey …"), and the "Where the Sources Disagree" lists of several of them (Abul Muali, Tahir Bandagi, Malik Ayaz, Peer Makki, Shah Inayat, Mauj Darya) set "The survey gives …" beside the books. Rewrite all of these as "It is reported that …" / "the shrine's own account", or keep the attribution where the survey is being weighed against a book?
2. **Two caveats left alone pending your word:** Ghazi Ilm Din's italic note that the blasphemy-case episode is "presented exactly as the field survey states it … not checked here against other historical accounts" (with the heading "The Blasphemy Case, as the Survey Narrates It"), and Wasif Ali Wasif's section "A note on the source wording", which quotes the survey's ungrammatical lineage answer rather than guess at it. Both are about the source, but both guard against stating unverified things as fact (RULE 2). Delete, rewrite, or keep?
3. **Malik Ayaz's Location:** add ", Lahore" (proposed) or keep "Shah Alam Market" alone as the survey gave it?
