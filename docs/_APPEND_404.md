### 9.404, 27 October 2026 (~13:00Z to ~13:30Z): Stage = notes. Public descriptions on the PC copy, continued at Rauf's request ("Keep working"): three more rows done (`shrine-of-makhdoom-abdul-rahim-girhori`, `bari-imam`, `ramapir-temple-tando-allahyar`)

**Stage: notes** (same Cowork session as §9.401 to §9.403; same method). Rows taken from the shortest end, unclaimed on the PC; claimed as `pub__<id>` (session `scheduled-pc-2026-10-27T1100Z`), renewed before the Urdu, released at the end. The team notes and the short Urdu articles (`urdu-i18n/content/<id>.md`, and Luari Sharif's for Girhori's master) were staged from the PC first, because the cloud mirror did not hold them. All three are `done`; `check_public_description.py` exits 0 on all three. All 39 files of the batch were staged back from the PC and their md5s compared with the mirror: 0 mismatches.

| row | public / team | Urdu / English | md5 `.md` `.ur.md` `.notes.md` | rounds |
|---|---|---|---|---|
| `shrine-of-makhdoom-abdul-rahim-girhori` | 0.50 | 0.90 | 058bb8eb 42f512f1 1498521b | V1 r1 FAIL (1), fix and three precision notes, r2 PASS; V2 r1 PASS V3 FAIL (14), r2 V2 PASS V3 FAIL (4), r3 confirming PASS |
| `bari-imam` | 0.51 | 0.95 | 15532b86 9a85f860 6b5daf3f | V1 r1 FAIL (2), fixes, r2 PASS; V2 r1 PASS V3 FAIL (18), r2 both PASS |
| `ramapir-temple-tando-allahyar` | 0.50 | 0.98 | 94489d34 8224ab2e ecf73cff | V1 r1 PASS, three precision notes and two restored omissions, r2 PASS; V2/V3 r1 FAIL (1, 14), r2 both PASS |

**V1 failures, both worth knowing:**
- Girhori: "Like Shah Abdul Latif, he often called the perfect mystics Kapari" gave Girhori a habit; in the team version "often" is Shah Abdul Latif's usage and only one saying of Girhori's is attested. Now "In one saying he called ..., as Shah Abdul Latif often did."
- Bari Imam: the writer kept a condensed account of the 1875 notice ("a book on the saints of the Punjab gave a notice to ...", "though none is told there"): source narration under rules 2 and 6, and "a book on the saints of the Punjab" was a description the team version does not give. Now "By 1875 he was counted among the Qadiri saints under the name Shah Latif Bari Qadiri, and his holy tomb was famous", with the hedge in the next sentence ("That Shah Latif is identified with the saint of Nurpur Shahan through a later life of him, *Hayat-e Bari Imam*, and through a meeting with the saint in the Pothohar").

**Consensus choices** (full lists in each `.notes.md`):
- `shrine-of-makhdoom-abdul-rahim-girhori`: his order, basis (a) and (b): "Accounts of Abdul Rahim's order are not unanimous, but he is most often counted a Naqshbandi" (the one Suhrawardi reading not named). His death, 1778 (undisputed), and the shrine's tradition of how he died, basis (a), with "Accounts of his death differ in detail"; Hathungo, the 72 companions and the Shiva temple left out so that two tellings are not merged. His master as Khwaja Muhammad Zaman of Luari Sharif (the shrine's form). Left out: Akbar's birth date (uncertain reading), the damaged saying, Lowari Sharif (the team version never identifies it with Luari Sharif).
- `bari-imam`: death, basis (a): "Accounts of the year of his death differ; established tradition gives 1705" (1706 and the uncertain 994 AH not listed). His masters, basis (d): "There is no settled view of his masters", the two named separately, never as a chain. Hasan Peshawari's meeting kept undated (its year is an uncertain reading); the son's 1116 AH meeting kept.
- `ramapir-temple-tando-allahyar`: when he lived, basis (a): "Accounts of when he lived differ; tradition places him in the fifteenth century" (samadhi 1459). His main temple: Ramdevra, basis (a), with one clause that the temple at Tando Allahyar "has also been called his main temple". The "nationalist utopian ideal" characterisation left out as the rejected variant; the threat to Sindh's Hindus, the 1992 attacks and the temple restorations kept in the Setting, worded so that no claim is made about this temple.

**Verifier points worth knowing:** the Urdu writers of round 2 adapted 19 of the 46 round 1 V3 issues to keep the English and rejected one, and V2 confirmed every one of those choices. Examples: Ramapir's Narayanpur "Ram Pir temple" kept as a separate temple, not merged into رامہ پیر; V3's اپنا ناتا جوڑتی ہیں ("are tied to") refused for "look east towards"; Girhori's "a good writer" kept as اچھے مصنف against V3's "wrote a great deal"; Bari Imam's "a meeting" kept indefinite. V3 was also wrong once and V3 itself said so in round 2: شبہِ قارہ with a zer is correct, since شبہ ends in a sounded ہ.

**For Rauf to read** (asked in the chat as well; none blocks the work):
1. `bari-imam`: the team notes ask whether Lahori's Shah Latif Bari Qadiri (the 1875 notice) should be identified with Bari Imam at all. The public text keeps the team version's own strength: the identification rests on the later life *Hayat-e Bari Imam* and the Pothohar meeting. If the answer is no, the second paragraph of The Saint comes out.
2. `bari-imam`: the Urdu spells Hajrawi as حجروی (no dictionary entry); worth a glance.

**Queue:** 41 of 94 `done`. Batch 6 (six rows at `draft-ur`) unchanged. Next from the short end: `shrine-of-pir-sher-muhammad`, `loh-temple-lava-temple`.

Nothing committed: Rauf must run `git add -A && git commit`. New: the three rows' `.md`, `.ur.md`, `.notes.md`, their 27 files in `entries/descriptions_public/verify/`, their three released claims, and `docs/_APPEND_404.md` (appended to `docs/HANDOVER.md`).
