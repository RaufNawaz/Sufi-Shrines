# Apple UI Refinement Plan — Minimalist, Functional, Professional-Grade Archive

**Date:** 15 October 2026  
**Context:** Direction from Rauf: Elevate the visual UI and interaction across the entire repository to be truly minimalistic, functional, and aligned with how a professional deliverable website from Apple would look and behave, integrating purposeful JavaScript without unnecessary gimmicks.

---

## 1. Core Principles: The "Apple Web" Philosophy for Sufi Shrines

Apple's web interfaces and pro apps (Apple Design Awards winners, Apple Developer, Apple Maps Web, human-interface guidelines) succeed through **ruthless restraint, functional depth, and physical fluidity**.

| Dimension | Apple Deliverable Standard | Implementation in Sufi Shrines |
|---|---|---|
| **Visual Minimalism** | Calm, quiet canvas; hairlines instead of thick borders; soft atmospheric ambient shadows; zero decorative clutter. | Neutral cool-white page (`#f5f5f7`), pure white cards (`#ffffff`), dark `#111110`, hair-thin retina borders (`var(--hairline)`), single accent for interactive chrome (Kashi Cobalt `#2a4d9b`), tradition colors reserved strictly for data badges. |
| **Materiality (Glass)** | Translucent frosted glass (`backdrop-filter: blur(20px) saturate(180%)`) with a 1px top highlight sheen (`inset 0 1px 0 rgba(255,255,255,0.8)`). | Unified glass tokens across floating navigation, spotlight search, map controls, and preview modals. |
| **Typography & Numbers** | Optical tracking (tight display headings, relaxed body), tabular numerals (`font-variant-numeric: tabular-nums`) for all data/dates/stats, full Nastaliq typography in RTL. | Mehr Nastaliq Web with proportional leading; tabular figures on all Hijri/CE dates and counts; tight heading tracking (`-0.025em`). |
| **Purposeful JavaScript** | JavaScript exists to remove friction, provide instant spatial context, and give tactile feedback—never for decoration or slow animations. | Dynamic desktop navigation capsule; Spotlight split-pane preview; Quick-Look peek cards for internal references; reading progress & time estimation; fluid modal lightbox. |
| **Micro-Physics & Easing** | Natural deceleration curves (`cubic-bezier(0.16, 1, 0.3, 1)`) and spring physics; instant response to input; reduced motion compliance. | Replace generic Material cubic-bezier with Apple's signature easing; spring transforms for modals, pills, and toggles; full `@media (prefers-reduced-motion)` isolation. |

---

## 2. Architectural Blueprint & Phased Execution

### Phase 1: Unified Desktop Navigation Capsule
- **Current State**: On mobile, `TabBar.tsx` provides bottom navigation. On desktop, non-map pages only have "← Back to map" on `EntityPageHeader.tsx`, forcing users to return to the map's welcome card to switch between Urs Calendar, Saints & Orders, Chronology, Shared Ground, Built Forms, and About.
- **Apple Solution**:
  - Transform `EntityPageHeader.tsx` on desktop (`min-width: 769px`) into a unified Apple-style floating/sticky navigation capsule.
  - Centered segmented pill group linking the 5 core lenses (`TABS`):
    1. **Map** (`/`)
    2. **Explore / Saints & Orders** (`/graph`)
    3. **Urs Calendar** (`/almanac`)
    4. **Atlas of Built Forms** (`/typology`)
    5. **About the Archive** (`/about`)
  - Smooth active route indicator pill (`activeTabIndicator`) using spring transitions.
  - On article scroll, smoothly collapses to reveal the article title without layout shift.
  - Fully accessible with keyboard navigation (`ArrowLeft` / `ArrowRight` / `Enter` / `Esc`).

### Phase 2: Interactive Quick-Look (Peek & Pop) for Scholarly Entities
- **Current State**: Shrines, saints, orders, and places mentioned in articles, timelines, and lists are static links. Clicking navigates completely away, breaking the reader's train of thought.
- **Apple Solution**:
  - Implement a lightweight, zero-dependency `QuickLookCard` portal anchored to hovered/focused entity links.
  - Features:
    - Debounced pointer intent (250ms hover delay so casual cursor movements don't trigger it).
    - Smooth spring scale entrance (`scale(0.96) -> scale(1.0)` with fade).
    - Shows: thumbnail/glyph, bilingual title (English + Nastaliq), tradition badge, dates/century, location, and a quick "Open Entry →" button.
    - Viewport boundary collision detection (automatically flips above, below, or shifts horizontally to stay fully on screen).
    - Keyboard dismiss on `Escape`, outside click dismiss.

### Phase 3: Spotlight Search Experience (Command Palette 2.0)
- **Current State**: `CommandPalette.tsx` opens a single list of results.
- **Apple Solution**:
  - Refine into modern macOS Spotlight layout:
    - **Split-Pane on Desktop**: Left side shows categorized, keyboard-scrubbable results; right side shows an instant live preview card of the highlighted shrine/figure (high-res image, key dates, location map thumbnail, direct action buttons).
    - **Keyboard Hotkeys & Indicator Bar**: Visual badges for `↑` `↓` `↵` `Esc` `Tab`.
    - **Quick Filter Switching**: Cycle traditions via keyboard chip navigation.
    - **Recent Searches**: Persist the last 5 accessed shrines in `localStorage` for instant return.

### Phase 4: Reading Experience & Minimalist Article Polish
- **Current State**: `ShrinePage.tsx` and `ShrineArticle.tsx` have rich markdown, but navigating long texts has room for Apple-grade refinement.
- **Apple Solution**:
  - **Reading Progress Bar**: Subtle hairline progress bar at top of sticky header indicating exact scroll percentage.
  - **Estimated Reading Time**: Calculated dynamically from word count (~200 wpm Latin, ~150 wpm Nastaliq) displayed beside the title/provenance badge.
  - **Active Scroll-Spy on Table of Contents (`ContentsNav.tsx`)**: Fluidly highlights the active reading section as the user scrolls, with smooth indicator pill tracking.
  - **Fluid Lightbox Gallery**: Fullscreen minimal photo viewer with keyboard navigation (`Esc`, `←`, `→`), smooth image preloading, and zoom.

### Phase 5: Interaction Physics & Token Refinement
- **Current State**: Generic Material curve `--easing: cubic-bezier(0.4, 0, 0.2, 1)`.
- **Apple Solution**:
  - Upgrade `--easing` to Apple's signature ease-out: `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Spring easing `--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - Enhanced glassmorphism tokens (`--glass-sheen`, `--glass-blur: blur(20px) saturate(180%)`).
  - Strict preservation of all test invariants: `tokenSplit.test.ts`, `cssTokensDefined.test.ts`, `motion.test.ts`, `hairline.test.ts`, `nastaliqCoverage.test.ts`.

---

## 3. Invariants & Guardrails (Never Violated)
1. **Rule 2**: Never invent dates, coordinates, or figures.
2. **Rule 3**: Do not alter sheet join keys.
3. **Contrast & a11y**: Every text pair >= 4.5:1; zero axe violations on both themes and both languages.
4. **Urdu Parity**: Nastaliq font, logical properties, Eastern numerals when Urdu is selected, no English leak outside Latin bibliography citations and coordinates.
5. **Reduced Motion**: Every transform and keyframe has a zero-motion fallback under `@media (prefers-reduced-motion: reduce)`.
6. **Test Suite**: `npm test` (185 test files, 1558+ tests) must stay 100% green at every step.

---

## 4. What shipped (15 October 2026, continued by Claude Code)

Antigravity drafted this plan and the first four files, then ran out of quota mid-task. The work was picked up, debugged, and extended under Rauf's instructions given during the session (search like Spotlight; open as a bar; show the traditions in the empty bar; translucency; purposeful JavaScript; phone first; performance).

**Header capsule (Phase 1).** The five tab destinations sit in a segmented capsule in the header wherever the phone tab bar is hidden. Fixed from the draft: the capsule started at 769px while the tab bar stops at 640px, leaving 641–768px with no navigation at all; it now starts at 641px, and between 641 and 1099px the header takes its compact form (chevron-only back link, single language button), because the full controls plus the Urdu capsule overflowed the page sideways at 660px. Urdu pills use the UI leading; at the prose leading the bar was 86px tall.

**Spotlight search.** `CommandPalette` opens as a bar: the field, the tradition chips, and an overview of every tradition with its count and its share of the archive as a hairline bar. Typing, choosing a tradition, or setting a filter grows the panel into the result list; on screens 900px and wider a preview pane (`PalettePreview`) shows the highlighted site — photograph, tradition, place, date, principal figure, the lead paragraph, "Read the entry" and "Show on map". The highlighted row is the system selection (solid cobalt). The scrim blurs the map; the panel is glass; it scales in on the spring curve and fades out (`--closing`). This supersedes the 8 October browse-on-open list; the grouping itself is unchanged and is what a chosen tradition shows.

**Phone contents.** Under 640px, where the contents rail is hidden, a floating "Contents" pill opens a sheet of the article's sections (`MobileContents`, lazy-loaded). Fixed from the draft: the pill sat on top of the scroll-to-top button; the jump ran while the sheet still locked scrolling and focus was then returned to the pill; the inline `onClose` re-ran the sheet's focus effect every render.

**Map sheet swipe.** The handle of the map's bottom sheet follows a flick. Fixed from the draft: a short flick also produced a synthetic click, toggling the sheet twice.

**Purposeful JavaScript.**
- `TabLink` (tab bar and header capsule): prefetches the destination's page module on hover, focus or touch start (`lib/nav/routeModules.ts`, the same importers `App.tsx` hands to `React.lazy`), then navigates inside a View Transition (`lib/nav/viewTransition.ts`) so content crossfades under still chrome. Falls back to a plain navigation where the API is missing or reduced motion is on.
- `usePointerSheen`: a rim light that follows the pointer on glass (the palette, the header capsule) — the part of Liquid Glass the web can do; refraction it cannot. Fine pointers only, never under reduced motion, no React state per move.

**Performance.** ShrinePage eager JS 535 → 408 KB (the team-only `SourcesProvenance` had been carrying a 127 KB JSON to every reader). The bundle-budget script was found to skip routes whose manifest key changes, and now fails instead. Lead paragraphs in the preview card and the palette preview render their `*italics*` instead of printing the asterisks.

**Clean-up and performance, later the same day.** `palette.css` was folded from three overriding layers into one rule per selector, verified by diffing the computed style of every palette element in ten states before and after. The layering had broken three things, now fixed: phone tap targets had dropped to 30–32px, the phone panel was capped at 451px, and reduced motion did not stop the panel's entrance or the rows' stagger. The palette itself is lazy-loaded with an idle-time fetch, taking the map route's eager JS from 626 to 616 KB.

**Not done from this plan:** Phase 2 (Quick-Look peek cards) and the recent-searches part of Phase 3. Both are open; neither was asked for again during the session.

**Later, same day — the phone council.** Recent searches (Phase 3) shipped as "Recently viewed"
in the archive search's empty state. Quick-Look (Phase 2) is still open, now with a touch
design sketched in [`PHONE_COUNCIL_2026-10-15.md`](PHONE_COUNCIL_2026-10-15.md), which also
records the other sixteen phone changes and which of them are not yet verified.
