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
