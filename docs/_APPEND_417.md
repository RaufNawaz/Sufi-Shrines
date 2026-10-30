
### 9.417, 30 October 2026 (interactive, ~02:15Z to ~02:45Z): Stage = notes. The 30 October import is in; the live site needs a deploy; documentation for the next session

**Commit.** Rauf committed everything of §9.414 to §9.416 on the PC (`cleanup/perf-stability-security`, 02:12Z, "feat: verse originals in Gurmukhi, restored lines, verse language labels, new Urdu articles"; read from `.git/logs/HEAD`). PowerShell 5.1 refused `&&`, and Git's automatic tidy up then looped on "Deletion of directory '.git/objects/00' failed"; Ctrl+C after the commit was safe. Both are now in `docs/WINDOWS_SETUP.md`.

**Import.** Rauf imported `data/import_2026-10-30.csv`. Checked by reading the published sheet in a browser and hashing it row by row: byte for byte the import file (before the import it was byte for byte `data/import_2026-10-29.csv`).

**"i imported the csv but the poetry still reads like this"** (Rauf, with a screenshot of Bulleh Shah's English article, a rendering set as italic prose with "(translated by Christopher Shackle)"). That is the live site's code, from `1.7`, which knows nothing of the verse figures, the Gurmukhi originals, the language captions or the new Urdu articles; all of that is only on the unpushed branch. Since the import, the live site shows the new English with the old rendering, the Gurmukhi originals as plain left aligned text, and the old Urdu articles. Only a deploy fixes it. A deploy of this branch also ships the October cleanup (`docs/CLEANUP_2026-10.md`), so it is Rauf's decision, asked in the chat. The order (data build and validate, verify and build, commit the snapshot, then into `1.7`) is in `docs/SESSION_RESUME.md`.

**For the next session** (Rauf is opening Claude Code in the project folder): a new top section in `docs/SESSION_RESUME.md` ("30 October 2026, night: start here") holds the state, the deploy steps, the seven unanswered questions, the next verse originals work in order, the tools, and the invariants; `CLAUDE.md` Pointers now sends a reader there first.

Not committed: `docs/SESSION_RESUME.md`, `docs/WINDOWS_SETUP.md`, `CLAUDE.md`, `docs/_APPEND_417.md`, `docs/README.md`, `docs/HANDOVER.md`. Rauf: `git add -A`, then `git commit -m "docs: where things stand on 30 October"` (separate lines in PowerShell).
