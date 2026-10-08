# Working from the Windows PC as well as the MacBook

*Set up 8 October 2026. The two machines share work through **GitHub**, not through Google Drive.*

## The one rule

**On Windows, work in `C:\Users\g16\code\Sufi-Shrines`, never in
`G:\Other computers\My Mac\Desktop\…\Shrines Project`.** That `G:` folder is Google Drive's
backup of the Mac's Desktop: it is the Mac's own working copy. Its `node_modules` holds macOS
binaries (`@esbuild/darwin-arm64`), and `npm ci` there would replace them with Windows ones and
break the Mac. Running git there from Windows rewrites line endings under the Mac. Read from it if
you need something uncommitted, but do not build or commit in it.

Moving between machines:

```bash
# before you stop on one machine
git add … && git commit && git push
# when you start on the other
git pull
```

## What is installed on this PC

| | Version | How |
|---|---|---|
| Node | 20.x (matches `.nvmrc`) | `winget install OpenJS.NodeJS.20` |
| Python | 3.12 | `winget install Python.Python.3.12` |
| `python3.exe` | a copy of `python.exe` in the Python312 folder | the npm scripts call `python3`, which Windows Python does not ship. Without it, the Microsoft Store stub answers instead |
| User `PATH` | Python312 is listed **before** `WindowsApps` | for the same reason |
| `PYTHONUTF8=1` | user environment variable | otherwise Python prints to a cp1252 console and `urdu_content_qa.py` crashes on its first ⚠ or Urdu character |

## Repo-local git config in the clone

```bash
git config core.autocrlf false
git config core.eol lf
```

`.gitattributes` says `* text=auto`, which on Windows checks out **CRLF**. Prettier then fails
`format:check` on 465 files that have nothing wrong with them. With `eol=lf`, the working tree
matches the Mac byte for byte.

## Found while setting this up, and fixed

- `src/lib/data/__tests__/docsIndex.test.ts` ran `git ls-files 'docs/**/*.md'` through
  `execSync`. Under `cmd.exe` single quotes are not quotes, so git matched nothing and the test
  failed on every Windows checkout. It now uses `execFileSync` with an argument array.
- That test then found a real gap: six docs missing from `docs/README.md`, two of them HANDOVER
  append files (§9.223, §9.224) left behind after their sections were merged. The four real ones
  are indexed and the two staging files are removed.
- `pipeline/book_queue/` and the root `RUN_IN_PROGRESS_*.md` logs are now in `.prettierignore`.
  They are agent-written notes, edited live on the Mac. Twenty of them had turned `format:check`
  red, with no site code involved.

## Not yet done on this PC

- Tesseract (`urd`/`fas`) for OCR: follow `BOOK_OCR_WORKFLOW.md` (the Windows one) when needed.
- Playwright browsers for `npm run e2e`: `npx playwright install`.
