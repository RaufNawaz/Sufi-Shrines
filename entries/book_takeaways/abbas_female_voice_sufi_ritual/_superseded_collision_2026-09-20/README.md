# Superseded chunk notes — abbas_female_voice_sufi_ritual, chunks 001–006

**What these are.** A complete, protocol-conformant set of Pass-1 notes for chunks 001–006 of
`abbas_female_voice_sufi_ritual`, written by the **20:05Z scheduled run** of the cloud book-queue
task on 20 September 2026 and committed to
`entries/book_takeaways/abbas_female_voice_sufi_ritual/` and
`out/ocr/abbas_female_voice_sufi_ritual/chunks/` at **20:08:0xZ**.

**Why they are here and not there.** A *second* firing of the same hourly task overwrote all six
in both locations at **20:19:54–20:20:07Z** with its own notes for the same six chunks. Neither
set is wrong; the two runs simply noted the same chunks in parallel, and the later writer won.
The live files in the two canonical locations are the 20:19Z run's; these are the 20:08Z run's,
kept so that no model work is lost and so the two can be compared.

**Provenance and md5 (as written by the 20:08Z run):**

| file | bytes | md5 |
|---|---:|---|
| chunk_001.notes.md | 48034 | 5bf99ab5cc85f12067885496720b26b3 |
| chunk_002.notes.md | 53109 | bad138efec54603404cf7cf6d70b8958 |
| chunk_003.notes.md | 58076 | b0ecab1015512e46f3ea5df85afeb1b5 |
| chunk_004.notes.md | 52752 | d852b270303bcaad75ab0453b978ee6c |
| chunk_005.notes.md | 55766 | 0eb143f0cdcb0fbffbfb04a6fb9b4340 |
| chunk_006.notes.md | 48939 | 4cab2a7e55988f0848edb651e7275bb7 |

**Do not let a tool read this directory.** `notes-status` and `compile_findings.py` read
`out/ocr/<slug>/chunks/`; `check_note_ids.py` takes explicit file arguments. Neither walks this
subdirectory, and it must stay that way — two notes files for one chunk in a scanned location
would double-count the book.

**What a human should do with them.** Either delete them (the live set is complete and passes
`check_note_ids.py` at exit 0), or, before Pass 2, diff a pair and merge anything the live set
lacks. The 20:08Z set is the smaller of the two (48–58 KB against 60–66 KB), so the live set is
probably the fuller; that is a size comparison, not a quality judgement, and neither set has been
read against the other.

**The underlying defect is not these files.** See `docs/HANDOVER.md` — the notes stage has no
lease. `queue.py` locks `state.json` and leases *page ranges* for the transcription stage, but
nothing records that a book is being noted, so two concurrent runs cannot see each other.
