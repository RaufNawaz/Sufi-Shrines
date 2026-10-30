### 9.405, 27 October 2026 (scheduled, ~17:00Z to ~17:50Z): Stage = notes. Public descriptions on the PC copy: three rows that two overlapping runs had left mixed up were repaired and finished (`shrine-of-pir-sher-muhammad`, `loh-temple-lava-temple`, `churrio-jabal-durga-mata-temple`)

**Stage: notes** (scheduled firing; cloud session linked to Rauf's PC). The repo folder was not connected at the start, so the run asked for it (granted). No `device_bash` was offered, so the inputs were staged into a cloud mirror, the tools ran there, and every result was written back with `device_commit_files` as soon as it existed (six commits during the work, then the closing one). Only the public description stage ran; the tag file step and the refresh list were not touched.

**What the files showed at the start.** After §9.404 the same Cowork session went on to the next three rows from the short end (claims written 13:36Z, still `active` but expired at 15:06Z) and stopped without a handover section. Its files on the PC were a mix of two runs that had worked on the same rows at once under one session name (`scheduled-pc-2026-10-27T1100Z`):

- from one run (call it B): the public English `.md` and `verify/<id>.V1.r1.txt`, `V1.r2.changes.txt`, `V1.r2.txt`;
- from the other (A): the `.notes.md`, the `.ur.md` and `verify/<id>.V2.r1.txt`, `V3.r1.txt`. A's own English never reached the PC: its notes describe other headings and sentences (churrio's "The Temple Through Time", loh's "The Fort and the Alamgiri Gate"), its V1 summaries do not match the V1 reports on file (B's overwrote A's), and its verdict lines were stamped on that lost English.

So the queue read all three as `verify-en` (V1 stale) and the checker found each Urdu out of step with the English (U6 on churrio, U9 on all three). Trusting the files: B's English is the only English and its V1 reports are on file, so it stays the record.

**Repair, the same for each row:** claimed as `pub__<id>` (session `scheduled-pc-2026-10-27T1700Z`, taking over the expired claims), released at the end. A's notes and Urdu preserved as `verify/<id>.notes.r1.orphan.txt` and `verify/<id>.ur.r1.orphan.txt`. V1 round 3 on the whole English afresh. A new notes body written for B's English by a fresh worker, checked line by line against the file. A new Urdu written from B's English (Urdu round 2), reusing A's Urdu where the English agrees and applying A's round 1 V3 corrections where they still apply. V2 and V3 round 2; a fixer applied the V3 issues as exact OLD/NEW replacements (`verify/<id>.ur.r3.changes.txt`); one confirming worker did V2 and V3 together with a diff against the backup (the brief's late round procedure). Each notes file ends with a "Record of this row" section and the Urdu rounds. All three are `done`; `check_public_description.py` exits 0 on all three.

| row | public / team | Urdu / English | md5 `.md` `.ur.md` `.notes.md` | rounds |
|---|---|---|---|---|
| `shrine-of-pir-sher-muhammad` | 0.50 | 0.90 | 1cb82cd7 5175ddd2 ee37a7a7 | V1 r3 PASS; new Urdu: V2 r2 PASS, V3 r2 FAIL (15), r3 confirming both PASS |
| `loh-temple-lava-temple` | 0.48 | 0.98 | 2fb79cc7 d5570aa7 0d9679c3 | V1 r3 PASS, one precision note applied, r4 confirming PASS; new Urdu: V2 r2 PASS, V3 r2 FAIL (10), r3 V2 PASS V3 FAIL (1), r4 confirming both PASS |
| `churrio-jabal-durga-mata-temple` | 0.44 | 0.94 | c10c15d2 c538c802 7b805109 | V1 r3 PASS; new Urdu: V2 r2 PASS, V3 r2 FAIL (6), r3 confirming both PASS |

**Consensus choices** (full lists in each `.notes.md`):

- `shrine-of-pir-sher-muhammad`: the saint, his dates (1865 to 1928), his two lineages and the shrine come from the site's own account alone; the team version records no disagreement about them. Waris Shah's annotator and the McLeod and Rizvi exchange are minor and dropped silently. Taunsvi and Taunsawi are one man. Out as uncertain readings: the *jagir*'s sum, the editor's count of 244 Sufis, the 1849 annexation date, Chishti's *qitʿa* on Dalip Singh.
- `loh-temple-lava-temple`: the present building dated, basis (a), to the early nineteenth century, likely during or shortly after Ranjit Singh's taking of the Fort in 1799, with one clause that accounts differ; the founder as Lava, also Luv; twin sons, Kusha credited with Kasur; Lavapuri, with one clause that not every account of the name agrees (Lopur, Loharpur and Lohar Chand not listed). V1 round 3's precision note applied: "the emblem of Mughal power and wealth" became "an emblem of power and wealth", since the team version quotes "their power and wealth" and never says whose.
- `churrio-jabal-durga-mata-temple`: the temple's festival is Maha Shivratri, basis (a); every piece of Durga material is told of Durga at large, never of this temple ("a shrine of Durga"); the tiger as her mount (the lion dropped as a minor variant); Kali and Hinglaj kept as "counted as her forms". Durga material about other sites (Bahawalnagar, Katas Raj, the Kashmir temples, Maryabad, Ram Thamman, Behlol) is not in this English.

**Verifier points worth knowing:**

- On loh, V2's own suggested wording (round 2 note 1, keeping the 1799 clause inside what the historians say) introduced a new fluency fault when applied; the round 3 confirming worker caught it and round 4 fixed it. The confirming round earned its keep again.
- Writers adapted V3's sentences for fidelity eight times, and the confirming workers upheld each: on pir-sher, the pir "represents the local landlord" stays کی حیثیت رکھتا ہے (V3 had "is himself the landlord"), سے چل کر for "spread from" (V3's کے ذریعے made the Khwaja the agent), both name forms of Sayyid Muhammad Ghaus kept; on churrio, the Navratri sentence split so the journey stays one to "a shrine of Durga"; Dewal and Debal kept apart; on loh, the caste left unnamed as in the English, "harder" not "far harder", قدیم kept for "ancient".
- V3 noted on loh that "the early nineteenth century" sits beside 1799, which is in the eighteenth. That is the team version's own wording, so the public texts follow it; worth a glance in the team version.

**For Rauf** (none blocks the work):

1. `shrine-of-pir-sher-muhammad`: this English keeps, in The Setting, the general statements that British policy treated hereditary saints like landlords and that in many cases the local *pir* represents the local landlord, a paragraph after The Shrine says the shrine is kept by the saint's successors. `purana-bhalwal` (and the lost draft of this row) left those lines out so that a reader would not take them as a remark on the shrine's own family. V1 passed both choices. Keep them here, or drop them for consistency?
2. `shrine-of-pir-sher-muhammad`: the whole order frame (Qadiri and Chishti) rests on the site's own account, which the team notes flag as unsourced against a sheet `silsila` of "Qadiri" only; and about seven tenths of the public prose is Punjab context (team notes, decision 2).
3. `churrio-jabal-durga-mata-temple`: the team notes' decision 4, whether the account of the Mughal province of Thatta is too much context for this temple; the public English keeps it.

**Gotchas:** (a) two runs of one session can write the same row at once, and the claim file does not stop it, because both runs carry the same session name ("renewing own claim"). A run that forks or resumes should take a fresh session name. (b) Files staged from the PC arrive read only (mode 444); `chmod u+w` before editing in the mirror. (c) Staging back after a commit worked this time (no hard link refusal).

**Queue:** 44 of 94 `done`. Batch 6 (six rows at `draft-ur`) unchanged. Next from the short end: `langer-makhdoom` (18,518), `shergarh` (18,569), `sadh-belo-sadh-belo-island-temple` (18,781).

Nothing committed: Rauf must run `git add -A && git commit`. New or changed: the three rows' `.md` (loh only), `.ur.md`, `.notes.md`; 29 files in `entries/descriptions_public/verify/` for them (V1 r3, loh's V1 r4 and its changes, V2 and V3 r2 to r4, the Urdu changes files, the six orphan files); their three claims (released); and `docs/_APPEND_405.md` (appended to `docs/HANDOVER.md`).
