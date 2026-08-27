# Settings, and the reading preferences behind them

**Written 27 August 2026.** Closes the scoping A11 was waiting for, at the project head's
request: *"substantial depth increasing in the existing features, add more options in the
settings."*

---

## 1. Where settings actually are today

There is no settings surface. There is a popover on the **map sidebar only**, holding exactly
**one** option, and the rest of the reader's preferences are scattered across the chrome or
have no control at all:

| preference | storage key | where the reader changes it | reachable from a shrine page? |
|---|---|---|---|
| Table button destination | `shrines_directory_mode` | the map sidebar's settings popover | **no** |
| Theme | `shrines_theme` | a moon button in the map sidebar | no — the button is map-only |
| Language | `shrines_language` | a toggle in the map sidebar | no |
| Numerals (۱۲۳/123) | `shrines_numerals` | a toggle in the map sidebar | no |
| Guided tours on/off | `shrines_tours` | a switch on the map | no |
| Saved shrines | `shrines_saved` | a star on each shrine page | n/a — data, not a preference |
| Tour progress | `shrines_tour_progress` | n/a | n/a — data, not a preference |

Two things follow, and they are the actual defect rather than "there are not enough options":

1. **Every control lives on the map.** A reader who arrives on `/shrine/data-darbar` from a
   search engine — which is how most readers will arrive, since 169 shrine pages are
   prerendered with their own metadata — cannot change the theme, the language, or the
   numerals without navigating to the map first.
2. **Nothing explains what a preference means.** `shrines_numerals` decides whether the
   archive's dates read ۱۴۱۶ or 1416, which is an editorial matter in a bilingual archive, and
   the only affordance is an unlabelled toggle.

## 2. What this adds

A real `/settings` route, prerendered like every other, linked from `SiteFooter` — which is on
every page but the map (`siteFooter.test.ts` enforces that) — so preferences are reachable from
wherever the reader actually is. The map popover stays, because a reader adjusting the map
should not have to leave it, but it renders the same component.

Then options, each of which deepens a feature the archive already has rather than adding a new
one:

| option | deepens | why it is not decoration |
|---|---|---|
| **Text size** (3 steps) | the article | 169 long-form entries, and `DESIGN_VISION` puts Nastaliq at 1.9 line-height because it is dense. A reader of Urdu prose is the one most likely to need a larger size, and has no way to ask. |
| **Motion** (system / reduced / full) | `styles/motion.css` | the reduced-motion contract exists and is enforced by a test, but it is only reachable through an OS setting. A reader on a borrowed phone cannot turn the animations off. |
| **Distance units** (km / miles) | shared ground, nearby, tours | `SHARED_GROUND_VISION` is built on "within 800 m of another site". Every distance in the archive is metric with no way to read it otherwise. |
| **Calendar** (Gregorian-first / Hijri-first) | the almanac, and every date | the almanac *projects* Hijri observances onto Gregorian dates and says so. Which of the two leads is a reader's question, not the archive's, and for the ʿurs calendar the Hijri date is the real one. |
| **Saved list: export / import / clear** | `savedShrines` | the reader's ziyarat list is localStorage-only, so it is one cleared cache from gone, and cannot move to a phone. |

## 3. Rules this has to hold to

- **i18n rule 1.** Every string goes in `UI_TEXT.en`/`.ur`. No inline `lang === 'ur' ? …` —
  ESLint blocks it. That means every option, every explanation and every unit needs real Urdu.
- **i18n rule 5.** Numbers through `fmtNum()`. A text-size step or a distance is a number.
- **The new route joins the guards, not just the router.** `scripts/prerender.mjs` APP_ROUTES,
  and the `e2e/urdu-no-leak.spec.ts` matrix — the lesson of 27 August was that pointing that
  walker at 23 routes instead of 14 found 7 leaks, so a route that is not in the matrix is a
  route nobody has checked.
- **A preference that changes layout must not shift it.** Applied as a `data-*` attribute on
  `documentElement` before paint, the way `THEME_STORAGE_KEY` already is in `main.tsx`.
- **No preference may be write-only.** If it is stored it must be visible in the UI, and if it
  is in the UI it must reach the feature. A stored key nothing reads is the settings equivalent
  of a badge that is always dark.

## 4. Order of work

1. Preferences foundation + `/settings` page, consolidating what already exists. No new
   behaviour — the surface first, so each option after it is a small commit.
2. Text size.
3. Motion.
4. Distance units.
5. Calendar preference.
6. Saved-list export / import / clear.

Each commit: the option, its wiring into the feature, unit tests, both languages, and
`npm run verify` green.

---

## 5. Done, 27 August 2026 — all six, and what each one turned out to cost

| | |
|---|---|
| **`/settings`** | Linked from `SiteFooter`. Four of this repo's guards caught real gaps on the first `verify`: a 1px separator that should be `var(--hairline)`, a doc missing from `docs/README.md`, three files git did not have, and `/settings` owned by no tab — a reader opening it would have seen five unselected tabs. It sits under **Archive**, with `/coverage` and `/report`. |
| **Reading size** | Scoped to `.shrine-page`/`.entity-page`, never `:root`, so the chrome keeps its measured sizes. Prose 15/16/18px; tab bar 10px at all three. The container needs its own `font-size` or the tokens reach nothing — `body` sets `font-size: var(--text-base)` resolved against `:root` and prose *inherits* the computed pixels. First version measured 16px at every setting. |
| **Motion** | `system` / `reduced`, and **no `full`** — restoring motion against the OS setting would mean un-disabling twelve escapes across eight stylesheets. The attribute path is a universal reset rather than a mirror, deliberately asymmetric. 0.01ms not 0s, because a zero-duration animation never fires `animationend` and the tour autoplay sequences on it. |
| **Distance units** | Nine call sites were assembling `number + "km away"` in the component — the exact construction `noSentenceFragments.test.ts` exists to prevent. Five whole-phrase entries replace three fragments. Under a mile, miles gets a decimal rather than an invented unit. `mi` not `miles`, because the value reaching the string is already localized and a plural rule would have to parse Eastern digits. |
| **Calendar** | The archive's own editorial position, offered to the reader. Two labels have to follow the value they describe rather than its position, and **both were wrong before they were measured in a browser** — the approximate flag belongs to the projection, the "(Hijri)" note to the recorded date, and the first version rendered "Projected: 22–24 July 2027 (Hijri)". A Gregorian-recorded observance is left alone (RULE 2). |
| **Saved list** | Export / import / clear. Slugs and no names, because a slug is the stable identity and a name is editorial. Import **merges**, so moving a list between devices never deletes the other one. The parser keeps a slug the archive no longer has — the archive gains entries, and an import must not silently delete a reader's record. |

**Measured rather than asserted, in each case before the tests were written:** the
reading-size scale in the browser at three settings and two languages, zero overflow at 390px
in Urdu at the largest size across six routes; the calendar swap in all four combinations; the
distance phrases in all four; the saved-list round trip including a malformed file; the motion
reset including the spinner still turning.

**Guards the new route joined in the same commits, not later:** `scripts/prerender.mjs`
APP_ROUTES, the `e2e/urdu-no-leak.spec.ts` matrix (budget **2** — `EN` in the masthead segment
and `English` as the name of the English option, zero undeclared), `e2e/a11y.spec.ts` in both
the light suite and the nine-route dark matrix. axe is clean on `/settings` in both languages
and both themes, re-measured after the page grew to six sections.

### Not done, and why

**Map label language** was on the original list and is not here. `MapLibreBasemap` rewrites the
style's `text-field` expressions per language, so the machinery exists — but the map is the most
delicate component in the app (two constraints in its header are documented as "easy to undo by
accident", and the MapTiler 403 diagnosis took two attempts), and a label-language option needs
a build and a real look at the tiles rather than a unit test. It is the obvious next one.

### One thing the next session should know

There are now **nine** persisted preferences. `storageKeys.ts` is the list, and the rule from §3
holds: *no preference may be write-only.* Two of the nine live in
`ReaderPreferencesContext` because they are read while rendering (calendar, units); two are
`data-*` attributes on the document set before paint (reading size, motion); the rest are read
once by the surface that owns them. The docstring on the context explains which is which —
adding a tenth should start there rather than by reaching for the provider.
