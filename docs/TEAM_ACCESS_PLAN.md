# Team view: from a URL flag to a real sign-in

Written 25 October 2026 at Rauf's request ("the `?team=1` switch is very basic and shaky; we want
something more professional"). Status: Phase 1 can go ahead now. Phase 2 needs a ruling.

## What exists today

`src/lib/projectAccess.ts`. When a visitor follows `?team=1`, a `localStorage` flag
(`shrines_team_access`) is set. `?team=0` or the switch on `/settings` clears it. Eighteen files call
`hasProjectAccess()` directly.

Why it is shaky, measured in the code as of `d368297`:

1. **It is not reactive.** Each call reads `localStorage` during render. Turning the switch off on
   `/settings` does not update a page that is already mounted, and a second tab never finds out.
   `ReviewPage` even re-reads the flag in an effect, to work around the same problem.
2. **The flag travels with links.** `?team=1` stays in the address bar until some redirect happens
   to drop it. Any link copied and forwarded in that window (a WhatsApp share, say) puts the
   recipient in team view permanently.
3. **It is invisible.** Nothing on the page says you are in team view, so a team member can take a
   screenshot of team-only content for publication without noticing.
4. **No identity.** Anyone who hears about `?team=1` is "team". There is no list of who is.
5. **The public downloads the team's code anyway.** Most team-only UI is bundled for everyone.

There is one constraint no design can remove: **the data is public.** The site is static, and every
field is in a Google Sheet published as CSV. Whatever the gate is, it decides only what a reader is
*shown*. It cannot keep a field secret. That is acceptable because the gate's purpose has always
been presentation, not secrecy (CLAUDE.md, "Public view and team view").

## Phase 1: make the existing gate solid (no decision needed, in progress)

- One `TeamAccessProvider` and one `useTeamAccess()` hook replace the 18 direct reads. The value is
  reactive, and it stays in sync across tabs through the `storage` event.
- `?team=1` and `?team=0` are consumed on load and removed from the URL with
  `history.replaceState`, so a copied link never carries them.
- A small, persistent **"Team view"** badge, with a one-tap exit, appears whenever team view is on.
  Its label lives in `uiStrings` so it works in both languages.
- Team-only surfaces are lazy-loaded, so public readers stop downloading them. `/review` and
  `SourcesProvenance` already are.
- The storage key stays `shrines_team_access`, so existing team browsers and the e2e specs keep
  working unchanged.

## Phase 2: real sign-in (needs Rauf's ruling)

| Option | What the team does | What it buys | Cost | Hosting |
|---|---|---|---|---|
| **A. Google sign-in, email allowlist** | Clicks "Sign in with Google" on `/settings` | Real identity, and only listed emails get team view. Still presentation-only, because the data is public. | Small. Google Identity Services script, a client ID, and an allowlist in the repo. No backend. | Unchanged. |
| **B. Separate team deploy behind Cloudflare Access** | Opens `team.<domain>` and signs in with email (one-time code) | The gate is enforced *before* any byte is served. The public build compiles team code out entirely (`VITE_TEAM_BUILD`). Most professional. | Medium. A second build and deploy, plus DNS on Cloudflare. Free for up to 50 users. | Needs the domain's DNS on Cloudflare. |
| **C. Keep the link, add a passphrase** | Types a shared passphrase once | Stops casual discovery. | Trivial. | Unchanged. It is still a shared secret, and a static site holds it client-side. |

**Recommendation: B.** It is the only option where "team" means something a stranger cannot
reach. It also makes the public bundle smaller, because the compiler deletes team-only code.
If the domain's DNS cannot move to Cloudflare, choose **A**.

Neither option makes the underlying data private. If some fields ever *must* be private (for
example, unpublished field-survey notes), they have to leave the published CSV. That is a separate,
data-level decision.

## Questions for Rauf, and his answers (31 October 2026)

1. A, B or C? **C**, from the options as re-costed in chat on 31 October 2026, where C was "the team build
   encrypted on GitHub Pages, opened with a passphrase". That is not the table above's C, a plain
   passphrase in front of a public bundle, which was rejected because the content would still ship. By
   then there was no custom
   domain (no `CNAME`; the site is `raufnawaz.github.io/Sufi-Shrines`), so B's DNS question had lapsed.
2. Presentation or privacy? **"The goal is a clean public view site."** Presentation: the team edition is
   kept out of what the public site serves, but the repository is public (github.com/RaufNawaz/Sufi-Shrines
   answers without sign-in) and so is the sheet's CSV, so nothing here makes a field secret.

## What was built (option C), 31 October 2026

**One code base, three shapes**, chosen at build time (`vite.config.ts`, `define`):

| `VITE_TEAM_GATE` | Gate | Team code | Used for |
|---|---|---|---|
| `public` (default for `vite build`) | constant off | **not emitted** | the deployed site |
| `team` | constant on | emitted | the team edition, published only encrypted |
| `runtime` (dev server, vitest, `build:e2e`) | switchable, `?team=1` as before | emitted | review on localhost and the e2e suites |

- **The public build.** `src/lib/projectAccess.ts` returns the constant false, and every team-only module
  is imported behind `__TEAM_CODE__ ? import(...) : null`. Rollup therefore never emits them:
  - `/review` (it shows the not-found page);
  - `SourcesProvenance` and `data/provenance.json`;
  - `/about`'s team sections (now `src/components/archive/AboutTeamSections.tsx`), `ArchiveKnows` and
    `ArchiveState`;
  - the review queue;
  - the book-figure files;
  - the "Team view" badge;
  - the team strings (`src/lib/i18n/uiStrings.team.ts`).

  `?team=1` on the public site now opens the team edition's passphrase page, so old links still go
  somewhere. Small inline team branches in shared pages remain as dead code. The text they would show
  lives in the team string table, which the public build does not have.
- **The proof.** `scripts/check-public-bundle.mjs` runs inside `npm run build`, and as its own CI step. It
  reads every text file the public build emits and fails on any of these:
  - a team-only chunk;
  - any team interface string, English or Urdu;
  - any string from the team-only data files that public data does not also contain.

  Run against an unencrypted team build with `--expect-hits`, it must find content; that run proves the
  check can see what it is looking for. `check-bundle-budget.mjs` fails if the public build contains
  `ReviewPage`.
- **The team edition** (`scripts/team/`). It is built with base `/Sufi-Shrines/team/`.
  - **Encryption:** every file that differs from the public build is encrypted with AES-256-GCM under a key
    derived from a passphrase. The passphrase is the GitHub secret `TEAM_PASSPHRASE`; it is never in the
    repository.
  - **Publishing:** the encrypted files are published at `dist/team/`. Without the passphrase, a visitor
    sees a passphrase page and opaque blobs.
  - **Unlocking:** a service worker scoped to `team/` decrypts the files in the browser. The key is kept,
    non-extractable, in that browser until **Lock**, the badge's exit button.
  - **Deep links:** they work through the public `404.html`, which forwards `team/…` paths to the
    passphrase page.
  - **Deploy:** `deploy-pages.yml` builds the edition only when the secret is set.

**What this does not do.** It does not make data private: the repository, the sheet's CSV and `data/kg.json`
(which still carries `reviewed` and `source` fields) are public. A visitor without the passphrase can still
learn that a team edition exists, and roughly how many files it has and how large they are. The
passphrase is shared, so removing a person means choosing a new one and redeploying.

**Re-locking (Rauf, 31 October 2026: "pin the salt").** By default every deploy draws a new random salt,
which signs every team browser out. With the optional secret `TEAM_SALT` set (base64 of 16 or more random
bytes: `openssl rand -base64 16`), the key stays the same across deploys, so the team stays unlocked
until the passphrase changes. The cost: offline guessing against one deploy's manifest carries over to
the next. Use a long passphrase, five or six random words.

**To switch it on:** add the repository secrets `TEAM_PASSPHRASE` and, optionally, `TEAM_SALT`
(Settings → Secrets and variables → Actions). The next deploy publishes `/Sufi-Shrines/team/`.
Without the passphrase secret, the deploy is the public site alone and says so in a notice.
