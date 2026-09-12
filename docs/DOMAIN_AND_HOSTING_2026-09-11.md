# A domain and a host for the archive — options, measured 11 September 2026

Rauf's item 5 (11 September 2026): *"Domains for GoDaddy — Spiritual Sites Pakistan — find suitable
domains and also servers and hosting; what are the options, like GoDaddy or any other options."*

Everything below was checked on **11 September 2026**. Availability came from two instruments,
each verified against a known answer before its numbers were recorded (`feedback_measure_before_recording`):
RDAP for `.com/.org/.net/.info` (`google.com` and `wikipedia.org` both returned 200 = registered;
404 = unregistered) and PKNIC's own whois server for `.pk` (`dargah.pk` returned "Domain is
Registered", the positive control). Prices are tagged **verified** (read from the seller's own page
today), **third-party** (a comparison site, dated where it says), or **derived** (computed from a
registry's published fee). Registrar prices move; re-check at checkout.

---

## Decisions for Rauf

These three are yours. Everything else in this document is a recommendation you can take as-is.

1. **Which name.** Every name in the shortlist is unregistered in `.com`, `.org` and `.pk` today.
   Recommended: **`spiritualsitespakistan.org`** (your own phrase; covers all six traditions the
   archive now holds), with **`sacredsitespakistan.org`** as the neutral runner-up. The `shrinesof…`
   family is available too, but "shrines" is the name the archive outgrew on 30 August, when it
   stopped calling itself *Sufi Shrines* because 88 of 171 sites are not one. Buy the matching
   `.com` at the same time (≈ US$11/yr) so nobody else can.
2. **Whether to register the `.pk` as well.** Cheap insurance for a Pakistani identity signal, but
   two-year minimum, ≈ US$32 for the pair of years from outside Pakistan, and no registrar you
   would otherwise use sells it (Cloudflare and Porkbun do not). It is unlikely to be squatted and
   can be added later. Recommendation: not now.
3. **Whether the GitHub URL keeps working.** Once a custom domain is set, GitHub redirects
   `raufnawaz.github.io/Sufi-Shrines/…` to the new domain automatically, so old links and the
   134 photo URLs in the live sheet keep resolving. Leaving that redirect on costs nothing but
   keeps the username discoverable to anyone who follows an old link. Recommendation: keep it on,
   rewrite the sheet's photo URLs to the new domain with `tools/swap_photo_urls.py`, and revisit.

---

## 1. Names — availability, checked 11 September 2026

Instrument for gTLDs: `curl -sL -o /dev/null -w "%{http_code}" https://rdap.org/domain/<name>`
(404 = unregistered, 200 = registered; 429 = rate-limited, re-run after a pause — every 429 below
was re-checked and resolved). Instrument for `.pk`: `whois -h whois.pknic.net.pk <name>`.

| Name | `.com` | `.org` | `.pk` | Notes |
| --- | --- | --- | --- | --- |
| **spiritualsitespakistan** | free | free | free | Rauf's phrase. Also `.net` and `.info` free. 23 characters. |
| **sacredsitespakistan** | free | free | free (`sacredsites.pk`) | Neutral across traditions. |
| spiritualsitesofpakistan | free | free | — | Longer for no gain. |
| spiritualpakistan | free | free | — | Short; ambiguous (tourism? wellness?). |
| spiritualsitespk | free | — | — | Abbreviation reads oddly. |
| shrinesofpakistan | free | free | free | Also `.net` free. The tradition-narrowing problem above. |
| shrinespakistan / pakistanshrines | free | free | — | Same problem, less grammatical. |
| sufishrinespakistan | free | free | free (`sufishrines.pk`) | The name the archive left behind. |
| mappingtheshrines | free | free | free | The current title, minus "of Pakistan". |
| ziyaratpakistan | free | free | free (`ziyarat.pk`) | Muslim-pilgrimage term; excludes gurdwaras and mandirs. |
| dargahsofpakistan | free | free | **taken** (`dargah.pk`) | `dargah.pk` is the one registered name found. |
| shrinesmap / pakistanshrinemap | free | free | free (`shrinesmap.pk`) | Describes the map, not the archive. |
| shrines / shrinesof | — | `shrinesofpk.org` free | free (`shrines.pk`, `shrinesof.pk`) | `shrines.pk` is the shortest available. |
| spiritualsites | — | — | free (`spiritualsites.pk`, `spiritualsites.com.pk`) | Only sensible as a `.pk`. |

No name on the list is registered in `.com` or `.org`. That is itself information: nobody has
built on this phrase space, and there is no squatter to negotiate with.

---

## 2. Registrars — `.com` and `.org`

What matters for this project, in order: WHOIS privacy included (Rauf does not want to be easy to
find), renewal price rather than first-year price (the archive is meant to outlive a promo),
no upsell pressure, good DNS. All five below now include WHOIS redaction free; that stopped being a
differentiator in 2026.

| Registrar | `.com` first year → renewal | `.org` first year → renewal | Privacy | Notes |
| --- | --- | --- | --- | --- |
| **Cloudflare Registrar** | at cost: **US$10.44** now, **US$11.15** from 1 Nov 2026 (derived: Verisign wholesale $10.26 → $10.97 + $0.18 ICANN) | ≈ **US$11.20** renewal, $8.50 registration (third-party, TLDSpy 26 Aug 2026) | free redaction (verified) | Zero markup by policy; registration = renewal. DNSSEC free. Must use Cloudflare DNS (free; best-in-class). Does **not** sell `.pk`. |
| **Porkbun** | **US$11.08** flat (verified, porkbun.com/tld/com) | **US$7.98** → **US$11.84** (verified, porkbun.com/tld/org) | free (verified) | "Price you see is the price you pay." Any DNS. No `.pk`. |
| **Namecheap** | ≈ US$6.98–8.88 → ≈ US$14.98–15.88 (third-party; sources disagree) | not checked | free for life (third-party) | First-year promo roughly doubles at renewal. Sells `.pk` through PKNIC at a markup. |
| **GoDaddy** | ≈ US$9.99 → ≈ US$21.99 (third-party, StackScored 2026) | ≈ US$9.99 → ≈ US$23.99 (third-party) | now free (third-party + GoDaddy's own domains page) | Renewal ≈ 2× Cloudflare's. "Domain Protection" upsells at $9.99–29.99/yr are separate from privacy and unnecessary. Heavy checkout upsell for hosting/email the site cannot use. |
| **Squarespace Domains** (ex-Google Domains) | ≈ US$12 → **US$20** (third-party) | ≈ US$25 renewal (third-party) | free (third-party) | Highest renewal of the five; nothing gained for a static site. Its own pricing page returned 404 today. |

**Read:** GoDaddy is the name Rauf mentioned, and it is the most expensive way to hold a `.com`
here by roughly two to one at renewal, with the worst upsell. Cloudflare is the cheapest and the
most private by construction, but ties the DNS to Cloudflare. Porkbun is a dollar more and ties
nothing. Either is a good answer; GoDaddy and Squarespace are not.

### `.pk`

- **Registry:** PKNIC. Registered on a **two-year** basis. International registrants (or a
  registrar outside Pakistan) pay **US$15.99 per domain per year**, so **US$31.98 for the first
  two years**; Pakistan-based registrants pay **PKR 2,100/yr** since **1 August 2026** (up from
  PKR 1,800), so PKR 4,200 for two years. (Third-party: creativeON, Truehost PK, tld-list, all 2026.
  PKNIC's own page refused the fetch — verify at pknic.net.pk before paying.)
- **Privacy:** PKNIC's public whois returns only nameservers and dates; registrant name and contact
  are withheld by registry policy. So `.pk` needs no privacy add-on and none is sold.
- **Where to buy:** PKNIC directly, or a Pakistani reseller (creativeON, HosterPK, PK-Domain).
  Namecheap resells it at a markup. Cloudflare and Porkbun do not sell it.

---

## 3. Hosting — what a static site does and does not need

This site is a Vite build: HTML, JS, CSS, fonts, 134 photographs and a service worker. It reads the
Google Sheet as a published CSV from the browser at runtime and calls MapTiler for tiles. **There is
no server-side code**, so there is nothing for a "server" to run. GoDaddy web hosting (cPanel, PHP,
MySQL) would be paying monthly for capabilities the site cannot use. The choice is between static
hosts, all of which have a free tier that this site fits in comfortably.

| Host | Cost | Limits that matter here | Custom domain + HTTPS | Redirects | Already wired? |
| --- | --- | --- | --- | --- | --- |
| **GitHub Pages** (current) | free | site ≤ 1 GB; **soft** 100 GB/month bandwidth; not for commercial sites (verified, GitHub docs) | yes; A/AAAA or CNAME to `raufnawaz.github.io`; enforce-HTTPS toggle appears within 24 h | none server-side — the app's 404.html + `LegacyRedirect` already do this client-side | **yes** — `deploy-pages.yml` builds and deploys `1.7` |
| **Cloudflare Pages** | free | 500 builds/month, 20,000 files, 25 MiB per file, 100 custom domains (verified, Cloudflare docs); no bandwidth cap stated | yes, one click if the domain is on Cloudflare DNS | `_redirects` file, server-side 301s | no — a second deploy path to maintain, or replace the workflow |
| **Netlify** | free | new accounts: 300 credits/month, ≈ 15 GB traffic, **hard** cap that pauses every site when spent (third-party, 2026) | yes | `_redirects` | no |
| **Vercel** | free (Hobby) | 100 GB/month; **non-commercial only** by terms (verified, Vercel docs) | yes | `vercel.json` | no |

**Read:** GitHub Pages is free, already deploying, and the only host whose base-path bugs the repo
has instruments for (`npm run verify:pages`, HANDOVER §9.58/§9.60). The one thing it lacks —
server-side redirects — the app already solves client-side. Netlify's new credit cap is the wrong
shape for an archive that may get a burst of traffic around an ʿurs. Cloudflare Pages is the
upgrade path if the site ever needs edge caching or real 301s, and putting the domain on Cloudflare
DNS now (which the Registrar requires anyway) makes that a later one-afternoon move rather than a
migration.

### The GitHub Pages custom-domain setup, concretely

1. Register the domain; use the registrar's DNS (Cloudflare's, if Cloudflare).
2. DNS: apex `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
   `185.199.111.153`; `AAAA` to `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153`;
   `www` as a `CNAME` to `raufnawaz.github.io`. GitHub creates the apex↔www redirect itself.
   (Verified against GitHub's docs today.) If Cloudflare DNS is proxying, set SSL mode to *Full*.
3. GitHub → repository Settings → Pages → Custom domain. Verify the domain under the account's
   Pages settings first ("to avoid takeover attacks" — GitHub's own recommendation).
4. Wait for the certificate; tick *Enforce HTTPS* when it appears (up to 24 h).
5. A project site on a custom domain is served **at the domain root**: `/Sufi-Shrines/` disappears
   from every URL. That is the change the repository has to absorb — see §4.

---

## 4. What actually changes in this repository

`grep -rIl raufnawaz.github.io` outside `node_modules`, `dist`, `docs`, `media-source` and the
text corpora finds 45 files. Most are data snapshots and pipeline artefacts that record history and
should **not** be edited. The ones that must change, in the order to do them:

**Build and deploy**

- `vite.config.ts` — `base` is `/Sufi-Shrines/` on build unless `VITE_BASE_PATH` is set. Set
  `VITE_BASE_PATH=/` in `.github/workflows/deploy-pages.yml`, or change the default.
- `.github/workflows/deploy-pages.yml` — `SITE_URL: https://raufnawaz.github.io/Sufi-Shrines` →
  the new origin. This feeds every `<link rel="canonical">`, `og:url` and hreflang that
  `scripts/prerender.mjs` writes (lines 234, 361, 584, 691 and onward).
- `public/CNAME` — add, containing the bare domain. Not strictly required with an Actions deploy
  (GitHub keeps the setting), but it documents the intent and survives a re-created Pages config.
- `npm run verify:pages` — asserts the artefact works under `/Sufi-Shrines/`; its expected base
  moves to `/` with the deploy. Run it before pushing `1.7`.
- The PWA manifest and service-worker scope derive from `base` (vite-plugin-pwa) — nothing to
  edit, but install the PWA once from the new origin and confirm offline still works
  (`project_frontdoor_perf_2026-08-27`).

**Publication metadata** (already being edited for the Rauf-and-Adil citation change)

- `src/lib/data/citation.ts` — `PUBLICATION.siteUrl`. `citation.test.ts` holds it to `CITATION.cff`.
- `CITATION.cff` — `url:`. `codemeta.json` — `url` / `codeRepository` are the GitHub repo, unchanged.
- `README.md` — four live-site links (lines 11–15).
- `scripts/make-og-image.mjs` — the footer text of the social image (line 259), then regenerate it.

**Photographs — the part that can break silently**

- The live sheet holds **134 image fields across 15 rows** pointing at
  `https://raufnawaz.github.io/Sufi-Shrines/photos/<slug>/…` (counted from
  `src/data/shrines-fallback.json` today; the fifteen directories are the "do not break these"
  list in `CLAUDE.md`). They keep working through GitHub's redirect from the old URL, but a
  redirect is one more thing that can lapse, and `pipeline/check_image_liveness.py` should be
  re-run against the new origin the day of the switch — it records what it cannot see (§9.145).
- `tools/swap_photo_urls.py` exists for exactly this rewrite. It produces a CSV patch; a human
  imports it (RULE 3 — agents do not write to the sheet; CSV not TSV; conversion OFF).
- `src/lib/data/__tests__/publishedPhotos.test.ts` derives the fifteen-directory set from the data
  and checks each URL resolves to a file in the repo. It will need the new origin, and it will say so.
- `pipeline/check_image_liveness.py`, `pipeline/validate_shrines.py`, `pipeline/build_patch.py`,
  `pipeline/measure_image_shapes.py` — each carries the origin as a string; update or parameterise.

**Tests that mention the origin** — `e2e/shrine.spec.ts`, `src/lib/data/__tests__/internalLinks.test.ts`,
`src/lib/images/__tests__/thumbnail.test.ts`: read each before changing; some assert the *shape*
of a URL rather than its host and need nothing.

**Unaffected, and worth saying:** the Google Sheet CSV fetch and the MapTiler key are
origin-independent (CLAUDE.md: the key is valid from every origin; the 403 was a style, not a
domain). `src/lib/data/mosques.ts` points at the separate Awqaf site and stays as it is.

**Do not edit:** the dated CSV/TSV snapshots under `data/`, `pipeline/*.tsv`, `data/export/*` —
they record what was true when they were written.

---

## 5. Recommendation

- **Name:** `spiritualsitespakistan.org`, plus the `.com` to hold. Runner-up `sacredsitespakistan.org`.
  Skip the `.pk` for now (decision 2).
- **Registrar:** Cloudflare Registrar — at-cost (≈ US$10.44/yr for `.com` today, ≈ US$11.20 for
  `.org`), free WHOIS redaction, no upsell, and its DNS is the one you would want anyway. If you
  would rather not have DNS and registrar in one company, Porkbun at ≈ US$11.08/US$11.84 is the
  alternative with the same privacy and no strings. Not GoDaddy: roughly twice the renewal for
  nothing the archive uses.
- **Hosting:** stay on GitHub Pages, add the custom domain, absorb the `/Sufi-Shrines/` → `/`
  change through §4. Cloudflare Pages is the later upgrade if edge caching or real 301s become
  necessary, and is a short move once the domain is already on Cloudflare DNS.
- **Cost of the whole thing:** about **US$22/yr** for `.org` + `.com` at Cloudflare or Porkbun;
  hosting US$0.

## Sources

- RDAP: `https://rdap.org/domain/<name>`, 11 Sep 2026, verified against google.com / wikipedia.org (200).
- PKNIC whois: `whois -h whois.pknic.net.pk`, 11 Sep 2026, verified against `dargah.pk` (registered).
- Porkbun `.com`/`.org`: porkbun.com/tld/com, porkbun.com/tld/org (fetched 11 Sep 2026).
- Cloudflare Registrar at-cost policy and free redaction: cloudflare.com/products/registrar (fetched 11 Sep 2026);
  `.org` figures TLDSpy (26 Aug 2026), StackScored.
- Verisign `.com` wholesale $10.26 → $10.97 on 1 Nov 2026: Domain Name Wire (23 Apr 2026), OSIR, webhosting.today.
- GoDaddy: StackScored 2026 (`.com` $9.99/$21.99), domainoffer.net (`.org` $9.99/$23.99), NamePros + godaddy.com/domains (privacy free); Domain Protection tiers via startupowl / theprtech.
- Namecheap: StackScored, saveloot, names.center (2026; figures disagree — unverified).
- Squarespace Domains: StackScored, whatsquare.space (2026); domains.squarespace.com/pricing returned 404.
- PKNIC pricing: creativeon.com/blog/domains/pknic-domain-registration, truehost.pk (2026); PKNIC privacy policy via pknic.net.pk/privacy.html summary and hosterpk.com.
- GitHub Pages: docs.github.com — managing a custom domain; about custom domains; GitHub Pages limits (fetched 11 Sep 2026).
- Cloudflare Pages limits: developers.cloudflare.com/pages/platform/limits (fetched 11 Sep 2026).
- Netlify credits model: netli.fyi, flexprice (2026). Vercel Hobby terms: vercel.com/docs/plans/hobby, fair-use guidelines.

---

## Addendum, 12 September 2026 — Rauf's answer, and "the cheapest and best hosting"

Rauf's ruling on the name: **wait for now**, and research where the cheapest and best hosting is.
So the domain purchase is parked; what follows is the hosting answer on its own, for a site that
is a folder of static files (React build + prerendered HTML + photos, no server code, data read
from a published Google Sheet at runtime).

| Option | Monthly cost | Bandwidth / limits that matter here | Custom domain + HTTPS | What it adds over today | Verdict |
| --- | --- | --- | --- | --- | --- |
| **GitHub Pages** (today) | **$0** | 1 GB site, soft 100 GB/month, 10 builds/hour (verified in §3) | yes, free, automatic cert | nothing — it is what runs now, with `verify:pages` already built for it | **Cheapest. Good enough until traffic is measured.** |
| **Cloudflare Pages** | **$0** (Free plan) | unlimited bandwidth and requests; 500 builds/month; 25 MB per file (the largest photo is well under) | yes, free, automatic cert; Cloudflare DNS | edge cache in Karachi/Lahore PoPs, real server-side 301s (`/coverage` → `/about` without a JS hop), `_headers` for cache-control, analytics without a script | **Best for the money, and the money is zero.** |
| Netlify Free | $0 up to a monthly credit cap (≈ 15 GB — §3) | hard cap, site goes dark past it | yes | similar to Cloudflare, smaller free ceiling | fine, but the cap is the wrong shape for a public archive |
| Vercel Hobby | $0 | non-commercial use only; 100 GB | yes | good previews | licence term is the risk, not the price |
| GoDaddy "Web Hosting" (Economy) | ≈ $6–10/month after year one (third-party, unverified) | PHP/MySQL hosting the site cannot use; FTP deploys | yes, cert often paid | nothing this site needs | **Do not buy.** Paying for a server a static site never touches. |
| A small VPS (Hetzner CX22 / DigitalOcean basic) | ≈ $4–6/month | plenty | yes, but you run nginx, certbot, updates | full control | more work, no benefit for a static build |

**Recommendation.** Stay on GitHub Pages while the domain is undecided — nothing to do. When
the domain is bought, put **Cloudflare** in front: register there (at-cost, free WHOIS
redaction, §2), and either keep GitHub Pages as origin with Cloudflare DNS/CDN, or move the
build to **Cloudflare Pages** (free, one GitHub-connected project, `npm run build` as the build
command, `dist/` as the output). Both cost $0/month; the Pages move buys server-side redirects
and Pakistan-local edge caching, which is the one thing GitHub Pages cannot give a reader in
Lahore. The repo checklist for either move is §4 above.

**What still needs measuring before any of this matters:** actual monthly traffic. GitHub's
soft 100 GB/month is roughly 30,000 full page views with photos; there is no analytics on the
site today, so nobody knows whether the archive is at 1% or 90% of that. Cloudflare's free
analytics would answer it without adding a tracking script.
