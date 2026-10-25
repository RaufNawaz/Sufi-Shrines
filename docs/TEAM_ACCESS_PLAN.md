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

## Questions for Rauf

1. A, B or C? If B, where is `spiritualsitespakistan.com`'s DNS hosted?
2. Is the goal only a cleaner public page (presentation), or must some fields become truly private?
