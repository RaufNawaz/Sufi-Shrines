# Review gate — the `/ur/*` prerendered routes (task B4)

**For:** Rauf / Adil. **Decision needed:** approve the routing choice, or ask for the
alternative in §5. **Shipped in:** commit `22bca4c`, currently on `main`.

Task B4 in `docs/planning/DELEGATED_EXECUTION_PLAN.md` carried an explicit `[review]` gate:
"human reviews the routing choice before merge." The work is done and verified; this is the
gate. It is the only open review gate across Batches 1–3.

---

## 1. The bug this fixed (worth knowing before judging the fix)

The site already emitted `hreflang` alternates, and the Urdu one pointed at
`…/shrine/<slug>?lang=ur`.

**On a static host that URL is a lie.** GitHub Pages serves files, not query strings — a
crawler fetching `?lang=ur` receives the byte-identical English prerendered file. Language
selection happens later, in JavaScript, from `localStorage`/the query param. So the archive
was telling Google "here is the Urdu version of this page" and serving English.

The consequence is worse than "no Urdu SEO." Duplicate-content signals aside, a bilingual
archive whose Urdu half is structurally invisible to search is not "equally excellent in both
languages" in any sense a reader can reach. This was a real defect, not missing polish.

## 2. What was built

Genuinely separate prerendered files at `/ur/shrine/<slug>`, `/ur/saint/…`, `/ur/order/…`,
and `/ur` — each with:

- `<html lang="ur" dir="rtl">`
- real Urdu `<title>` and meta description from the dictionary
- a **self-referencing canonical** (`/ur/shrine/<slug>` points at itself)
- bidirectional `hreflang`: the English page names the Urdu one, the Urdu page names the
  English one, `x-default` → English
- both variants listed in `sitemap.xml` with `xhtml:link` alternates

## 3. The part that needs your judgement

**`/ur/*` is a crawler-discovery surface only. It is never linked to from inside the app.**

A real browser that lands on `/ur/shrine/data-darbar` runs `UrPrefixNormalizer`
(`src/App.tsx:46`), which sets the language to Urdu and immediately `replaceState`s the URL
back to the app's long-standing scheme — `/shrine/data-darbar?lang=ur`. One effect, on mount,
no flash, no re-render loop.

**Why this shape:** it buys correct per-language indexing without touching `setLang`,
language persistence, share URLs, or the existing e2e suite. Nothing else in the app learns
about `/ur`. The alternative — making `/ur/` the app's real Urdu URL scheme — would have
touched all of those.

**What you are approving:** that the archive has two URL schemes for Urdu — one for machines
(`/ur/shrine/x`, canonical, indexed) and one for humans (`/shrine/x?lang=ur`, what anybody
actually shares). That asymmetry is deliberate and it is the whole decision.

### The honest wrinkle

After normalization the address bar says `/shrine/x?lang=ur` while the DOM's canonical tag
still says `/ur/shrine/x`. Verified this is harmless — no runtime code rewrites canonical
(`grep canonical src/` returns only unrelated hits), so:

- crawler fetches `/ur/shrine/x` → canonical `/ur/shrine/x` → indexed as the Urdu page ✅
- crawler fetches `/shrine/x?lang=ur` → gets the English file → canonical `/shrine/x` →
  consolidates to English, which is correct, since that file *is* English until JS runs ✅

So a shared `?lang=ur` link doesn't compete with the `/ur/` page for indexing. That is the
outcome you want, reached slightly indirectly.

## 4. Verification already run (previous session, recorded in the plan's execution log)

- `npm run verify` — 259 tests green (+8 for `urlLangPrefix`)
- `npm run e2e` — 47/47 green, including 3 new `ur-prefix.spec.ts` cases asserting Urdu
  render, `dir="rtl"`, no Latin in the `<h1>`, and URL normalization
- a `SITE_URL`-set production build, confirming the `/ur/*` files are actually emitted
- the no-English-leak guard still green

**Not re-run for this brief** — the code was read, not rebuilt. If you want a fresh green
run before signing off, say so and it takes one command.

## 5. The alternative, if you don't like it

Make `/ur/` the real Urdu route scheme: Urdu links inside the app point at `/ur/…`, the
language toggle navigates rather than setting state, and `?lang=ur` becomes a redirect.

- **Better:** one scheme, no asymmetry; a shared Urdu link is self-describing and survives
  a cold load with no JS.
- **Worse:** touches `setLang`, persistence, every internal `<Link>`, the share flow and a
  good part of the e2e suite. It is a genuine refactor, not a tweak.

Reasonable either way. The shipped version was chosen because B4's own instructions said
"prefer whichever needs no router change."

## 6. What to actually look at

1. `src/App.tsx:46` — `UrPrefixNormalizer`, ~10 lines. Does the one-time rewrite sit right with you?
2. `src/lib/i18n/urlLangPrefix.ts` — the header comment states the whole design in a paragraph.
3. Load a real Urdu page and watch the address bar change once.

Then: approve, or ask for §5.
