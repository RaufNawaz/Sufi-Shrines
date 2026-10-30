
### 9.412, 28 to 29 October 2026 (interactive, ~18:20Z 28 Oct to ~21:20Z 29 Oct, with a stop of about a day for the usage limit): Stage = notes. Public descriptions: all 94 rows done, the run closed

**Stage: notes.** This closes the run that §9.411 recorded at its midpoint (Rauf, 28 Oct, in chat: "work overnight to finish all the descriptions", "pause the scheduled task and just finish them out", "please save everything to the computer so that nothing is lost"). **Every one of the 94 rows now has its public English, its Urdu and its notes, each passed by V1, V2 and V3:** `public_description_queue.py status` on the mirror reads `rows 41: done 41` (the mirror holds only the rows this stage worked from 25 October on), and the PC folder `entries/descriptions_public/` holds `.md`, `.ur.md` and `.notes.md` for all 94 rows. The scheduled task `Sufi-Shrines book queue (PC): public descriptions` (trig_014oBjhfFfbKY3EFMKgZCq6m) is **still paused**; it has nothing left to do, so it should stay paused (or be deleted) unless Rauf wants it for checking the rows again later.

**The second stop.** At ~19:10Z on 28 Oct the account's five hour usage limit cut off all twenty workers of one wave at once ("resets 10:50pm (UTC)"). Rauf wrote "limit has been reset" at ~19:00Z on 29 Oct, and the session resumed. Before any work: the PC folder was listed, and its newest file was the run's own last commit (19:09Z, 28 Oct), so nothing had changed there; the mirror had nothing newer than that commit either. Of the twenty workers, two had begun reading and one (a Urdu fixer) had written its change list in the scratchpad without applying it; that list was set aside and the twenty were rerun from the start. Nothing was lost, again because every finished step was already on the PC.

**Claims.** The 35 claims of §9.411 were renewed at 18:53Z on 28 Oct and again at ~19:05Z on 29 Oct, after they had expired during the stop (TTL 720 and 900 minutes; the scheduled task being paused, the expiry was harmless). All 35 now read `released` on the PC.

**Done in this section (25 rows):** the seven at `verify-ur` in §9.411, the eight at `verify-en`, and the ten that had not been started (`draft-en`). With §9.411's 69: **94 of 94.** `check_public_description.py` exits 0 on each of the 25; the 75 row files on the PC match the mirror by md5 (staged back at the end), and all 365 verify files of the mirror are on the PC at the same size.

| row | public / team | Urdu / English | md5 `.md` `.ur.md` `.notes.md` | rounds |
|---|---|---|---|---|
| `darbar-hazrat-khawaja-shah-muhammad-sulaiman-taunsvi-r-a` | 0.44 | 0.93 | 10e39e03 73c1cbee 25787f3e | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `gurdwara-chakki-sahib` | 0.40 | 0.96 | 0597e0b9 df9c7c62 e67be97a | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 FAIL, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `gurdwara-dash-mesh-pita` | 0.40 | 0.98 | 41167594 c26a3950 39587258 | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `gurdwara-panjvi-chati-patshahi` | 0.46 | 0.97 | 1e99a576 464edbaf 9f71b077 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `gurdwara-tambo-sahib` | 0.48 | 0.98 | 518efba4 d30d8151 3b8baf4d | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS; V3 r1 FAIL, r2 PASS |
| `katas-raj-temples` | 0.54 | 0.95 | eed9e430 85b8b28c 2930b54c | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `tahir-bandagi-qadri` | 0.42 | 0.88 | 6892cd4b d49d46ff f4ad8e6d | V1 r1 FAIL, r2 PASS, r3 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `darbar-malik-ahmad-ayaz` | 0.45 | 0.93 | 8dca6784 3c4250e5 c378b1b3 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `gorakhnath-goraknath-temple` | 0.50 | 0.94 | 0ba38d3b a2f8e8c3 0b135629 | V1 r1 FAIL, r2 PASS, r3 PASS; V2 r1 PASS, r2 PASS; V3 r1 FAIL, r2 PASS |
| `gurdwara-choa-sahib` | 0.50 | 0.96 | c26451be 21c2290e c0ca5645 | V1 r1 FAIL, r2 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `gurdwara-guru-ram-das-ji` | 0.42 | 0.95 | d5203be6 a7af6b35 e5ca8bc9 | V1 r1 FAIL, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `gurdwara-sacha-sauda` | 0.45 | 0.97 | 44592b3f e4b96372 d9327be9 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `shrine-of-baba-shah-chiragh` | 0.42 | 0.88 | 915b56d1 8a0e90c6 3e1c7c7a | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `shrine-of-hazrat-shah-daula-daryai` | 0.48 | 0.91 | bfabb9ef cbd4cdd8 0faec3a3 | V1 r1 FAIL, r2 PASS, r3 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `tilla-jogian` | 0.53 | 0.94 | 1c39e13b 58866e0a 83f295bc | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 FAIL, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `shri-laxmi-narayan-mandir-native-jetty-bridge` | 0.58 | 0.96 | 6ff99e08 e9fb29ee 39923046 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `peer-makki` | 0.41 | 0.95 | fc683740 14aa3d2a 293f23d2 | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `ram-mandir-saidpur-ram-kund-mandir` | 0.47 | 0.95 | 0b1308f5 787dfa13 0823a094 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `shrine-of-miran-hussain-zanjani-zanjani-sahib` | 0.31 | 0.92 | 0d79cfdf 75d86540 09c015ae | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `guru-gurpat-mandir-db-80-sirey-ghat` | 0.57 | 0.93 | 6fa50cba 6635178a bba586ea | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS, r3 PASS; V3 r1 FAIL, r2 FAIL, r3 PASS |
| `ranmal-sharif` | 0.43 | 0.90 | a84be0af b923a9c7 8e951d26 | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS; V3 r1 FAIL, r2 PASS |
| `sakhi-sarwar` | 0.46 | 0.90 | 6a9873c8 a35321fb 7edade7c | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `tomb-of-qutbuddin-aibak` | 0.41 | 0.99 | 6d1cf840 c6fafba4 3046aac0 | V1 r1 PASS, r2 PASS; V2 r1 FAIL, r2 PASS; V3 r1 FAIL, r2 PASS |
| `gurdwara-chhevin-patshahi-mozang` | 0.42 | 0.97 | 9393cfdc 06d322b9 457001f8 | V1 r1 PASS, r2 PASS; V2 r1 PASS, r2 PASS; V3 r1 FAIL, r2 PASS |
| `dargah-roza-sufi-shah-inayat-shaheed` | 0.44 | 0.94 | e640f065 5b23b144 d9933612 | V1 r1 FAIL, r2 PASS, r3 PASS; V2 r1 PASS, r2 PASS; V3 r1 FAIL, r2 PASS |

No row went to `rauf`. One row needed the L1 exception: `shrine-of-miran-hussain-zanjani-zanjani-sahib` at 0.31 (see For Rauf). `gurdwara-chakki-sahib` and `gurdwara-dash-mesh-pita` sit at 0.40, on the floor, with V1's omission sweeps finding nothing important missing.

**Method** as in §9.411 (workers in parallel, up to twenty at a time; every fix an exact OLD/NEW replacement applied by script and listed in `verify/<id>.<V1|ur>.r<N>.changes.txt`; every verifier reply saved in `verify/` before its verdict; commits `c21` to `c31`, each from a fresh staging folder). Three additions:

- **Urdu kept in step with a late English change.** Where V1's last precision notes were applied after the Urdu writer had started (`shrine-of-hazrat-shah-daula-daryai`, `gorakhnath-goraknath-temple`, `dargah-roza-sufi-shah-inayat-shaheed`), the coordinator carried the same change into the Urdu before V2 and V3 round 1 and listed it as `verify/<id>.ur.r1.changes.txt`; the confirming V1 round and the Urdu verifiers then ran on matching texts.
- **A fix proposed by both V2 and V3 was applied once** (`tilla-jogian` round 3), and the changes file says so.
- **Notes follow V1's deletions.** Where V1 removed a sentence as source apparatus (Briggs's study on `gorakhnath-goraknath-temple`; Schimmel's article and Boivin's study on `dargah-roza-sufi-shah-inayat-shaheed`), the writer's judgement call in the notes now says so; both works stay in the Bibliography.

The worker briefs and two small helpers (`gen_prompt.py`, which fills a brief for one row and round, and `stage_commit.py`, which prepares the commit lists) are in `docs/prompts/public_description_workers_2026-10-28/`.

**Verifier points worth knowing:**

- **Confirming rounds again caught faults the fixes introduced, mostly repetition inside one sentence:** زائرین twice (`peer-makki`), روایت twice and نانک پنتھیوں twice (`guru-gurpat-mandir-db-80-sirey-ghat`), and on `tilla-jogian` a joined sentence whose اسی دور pointed back to Guru Nanak's time and reversed the English (that Gorakhnath lived long before Nanak). On `shrine-of-miran-hussain-zanjani-zanjani-sahib` a V3 fix had brought in ان کے بھائی کا اپنا, the calque the brief names; the confirming round replaced it with plain ان کے بھائی کا مزار بھی.
- **Fixers adapted fixes that would have changed meaning, and the confirming workers upheld each:** "grandmother" as جدّہ, not نانی (the English does not say which side; `gurdwara-guru-ram-das-ji`); پیر و مرشد, not دادا, for the seventh Guru's spiritual guide (`gurdwara-chhevin-patshahi-mozang`); "admits" kept as خود اعتراف کرتا ہے (`tilla-jogian`); the قلندر gloss kept (`gorakhnath-goraknath-temple`); ساٹھ لاکھ in words, since the English has no figure 60 (`guru-gurpat-mandir-db-80-sirey-ghat`).
- **V1 round 1 failed six of the 25 rows:** `tahir-bandagi-qadri`, `shrine-of-hazrat-shah-daula-daryai` and `gurdwara-choa-sahib` in the hours §9.411 covers, and since then `gurdwara-guru-ram-das-ji` (merged founding accounts: the 1880s account's process hung under the 1801 tradition), `gorakhnath-goraknath-temple` and `dargah-roza-sufi-shah-inayat-shaheed` (source talk: a modern study named only as further reading). Each passed a later round.

**For Rauf** (none blocks anything; each row's notes end with its own `## For Rauf`, and the questions the team notes raised are listed there row by row). The points from this run:

1. `shrine-of-miran-hussain-zanjani-zanjani-sahib` is at 0.31 under the **L1 exception** (brief: record every such row for Rauf). V1 round 1 swept the team version and found no important omission; the cause, in the notes: 43% of the team version is citations and the disagreement section, and much of the rest is the editor's rival identity for the saint, side by side authorities on Khwaja Muin al Din, a second account of his coming and readings marked uncertain.
2. `tomb-of-qutbuddin-aibak`: the team version (from *Dawn*) and so the public text say the 1972 rebuilding was ordered by **Prime Minister** Zulfiqar Ali Bhutto. V3 noted that Bhutto was President in 1972 and became Prime Minister only in August 1973. Worth a check in the team version.
3. **Informants' names.** `katas-raj-temples` names Shakeel, Prem Gupta and Haroon Sarab Diyal, as its team version does, while `gorakhnath-goraknath-temple` quotes Prem Gupta without his name because *A White Trail*'s author says the names were changed. One ruling for both rows would make them consistent.
4. **Two Saidpurs.** `shri-laxmi-narayan-mandir-native-jetty-bridge` says "In Saidpur, where every shop kept idols, Lakshmi was the most popular of them"; that Saidpur is Eminabad's, not the village of `ram-mandir-saidpur-ram-kund-mandir`. A reader of both pages could confuse them; a word in the Laxmi Narayan text ("Saidpur, near Eminabad") would settle it if the team version allows.
5. **Spellings for the dictionary** (`urdu-i18n/urdu-dictionary.json`): Mozang is written موزنگ in both Mozang rows (a dictionary wide question raised in §9.411); the Zanjani master's name is now ختلی in the article (V3, following the notes' identification with Rizvi's Khattali), while the dictionary's line 704 has خطیل; and several existing short articles still write گرودوارہ and ایویکیو ٹرسٹ پراپرٹی بورڈ where the public articles use گوردوارہ and متروکہ وقف املاک بورڈ.
6. Row level questions that could change a public text if ruled the other way (details in each notes file): where Haji Muhammad Naushah is buried (`ranmal-sharif`: the 1875 editor puts the mazar at Sahnpal Sharif, which may mean the row's location needs review); the thirteenth century of the sheet against the twelfth of the public text (`sakhi-sarwar`); the precision of `year_built` 1801 (`gurdwara-guru-ram-das-ji`); whether Khalid's Port Grand temple is the Laxmi Narayan Mandir (`shri-laxmi-narayan-mandir-native-jetty-bridge`); whether the row is held by location only (`gurdwara-chhevin-patshahi-mozang`); whether Rama, named only in glosses and context, is a handle on the Saidpur row at all (`ram-mandir-saidpur-ram-kund-mandir`).

**Gotchas:** (a) the five hour usage limit stopped this run twice (§9.411 and above); a full row costs about nine workers, so 25 rows meet it at least once. The run survived both stops only because every step was on the PC as it happened; keep doing that. (b) After a long stop, check the PC first (newest mtime in the folder against the last commit) before applying anything from the mirror, and renew claims that expired. (c) A worker cut off mid task may leave a file in the scratchpad (here one fixer's change list) that was never applied; set it aside rather than apply it.

**Queue:** 94 of 94 `done`. The public description stage is finished; the tag file step and the refresh list were not touched by this run.

Nothing committed: Rauf must run `git add -A && git commit`. New or changed since §9.411: for the 25 rows above, their `.md`, `.ur.md` and `.notes.md` (ten rows new in all three); their files in `entries/descriptions_public/verify/` (V1, V2 and V3 reports of every round and the changes files); all 35 claims of the run (released); `docs/prompts/public_description_workers_2026-10-28/` (README updated, `gen_prompt.py`, `stage_commit.py`); and `docs/_APPEND_412.md` (appended to `docs/HANDOVER.md`).
