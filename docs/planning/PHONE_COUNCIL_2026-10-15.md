# Phone council — 15 October 2026

Brief from Rauf: "Keep working to improve the phone experience and integrate more JavaScript
features and development." Run as a lean council (three seats, per the 13 September usage rule),
each seat driving the dev server at iPhone 13 emulation (390×664, CDP touch events) and checking
every finding against the code before reporting. No seat edited files.

| Seat | Lens |
|---|---|
| 1 | Phone interaction, gestures and motion — sheets, tab bar, palette, lightbox, safe areas, iOS quirks |
| 2 | Phone reading and information design — entry, explorer pages, both languages |
| 3 | Purposeful JavaScript capabilities a phone visitor would miss |

## What shipped (all on `cloud-ocr-queue`, not pushed)

| Commit | Finding (seat) | Measured before → after |
|---|---|---|
| `1ae44cc` | Back closes the open sheet, palette or lightbox instead of leaving the page (3, top) | /about → entry → Contents → back landed on /about; now closes the sheet, URL unchanged, and Done leaves no dead history step |
| `82414ce` | Map sheet follows the finger; header row is a grab area (1, top) | sheet sat at 184px through a 300px drag, then jumped to 505px; now tracks 234→384px during the drag |
| `82414ce` | `100vh` declared after `100dvh` on `.map-root`, so it always won (1) | swapped; iOS map no longer runs under the toolbar |
| `82414ce` | Map sheet padded the home-indicator inset the tab bar already covers (1) | ~34px of empty peek on a notched iPhone |
| `48ade58` | Phone fact panel: label and value on one line (2, top) | panel 609→491px (Data Darbar EN), 874→694 (UR), 935→783 (Chowmala) |
| `f47218b` | Stat tiles as one grouped list on phones (2) | /chronology 317→195px, /shared-ground (UR) 450→265px |
| `f47218b` | Chronology axis hairline ran through every kept label, "110\|0" (2, top) | minor ticks drop their line with their digits |
| `f47218b` | Saint/order pages: ~65px blank under the opening lines (2) | first section's margin removed |
| `f47218b` | "< 1 km" broke between "<" and "۱" in Urdu (2) | no-break space; test added |
| `601a886`, `ffc6747` | Lightbox: photo moves under the finger, pull down to close, pinch zooms the photo not the page, double tap 2.5× (1, top) | image x stayed at 16 through a 150px drag; a pinch zoomed the whole page |
| `0726749` | Archive search opens on "Recently viewed" (3, top) | empty state was blank |
| `7dd1f36` | Screen wake lock while a tour autoplays or speaks (3) | — |
| `6326198` | Sheet: pull down to close, and an exit animation (1) | a 320px header drag left it open; it vanished in one frame |
| `fa1b3ef` | Phone page header steps aside on scroll down, returns on scroll up (1) | 69px held for the whole read (24% of the screen with tab bar and pill) |
| `a8124b3` | Page ends clear of the floating pill and scroll-to-top button (2) | the button sat over "Cite this entry" |
| `47f8775` | "Near me" in the map's Spotlight: nearest first, distance per row (3) | geolocation was used only to pick a tour |
| `932c198` | Install offer on /settings; one-time "Ready to use offline" notice (3) | standalone manifest and precache existed; nobody was told |

**Verification caveat.** From `47f8775` onward Rauf asked for no test runs (laptop heat, low
battery). `47f8775` was checked in the browser but its unit tests were not re-run after the
"Near me" chip moved out of the tradition group (the first version failed `MapSidebar.test.tsx`
for exactly that reason, which the move answers). `932c198` was not typechecked, tested or opened
at all. Run `npm run verify` and `npm run build:e2e && npm run e2e` (the Urdu strings make e2e the
definition of done) before pushing.

## Not done

- **Quick-look previews on touch** (seat 3, #5; also Phase 2 of `APPLE_UI_REFINEMENT_PLAN.md`).
  Sketch: a plain tap keeps navigating; a trailing 44px peek control on internal entity links in
  articles opens a half-height `Sheet` with name, tradition, dates, place, lead line, "Open entry"
  and "Show on map". `useBackToClose` now gives it back-to-dismiss for free.
- **A third, half-height snap for the map sheet** (seat 1, #1). The sheet follows the finger
  and settles on peek or full; a middle stop needs `isOpen` widened to a three-state in MapPage.
- **Typology's 11-tile grid** is 684px (909 in Urdu) before the first group on a phone
  (seat 2, #3); the stat-list treatment was applied to `/chronology`, `/shared-ground` and
  `/about` only.
- **The entity fact box at the foot of saint and order pages on phones** (seat 2, #4): seat 2
  measured that every row repeats the opening lines and proposed hiding it under 640px. That
  hides content, so it was asked in the chat rather than done.
