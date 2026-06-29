# Sufi Shrines — Redesign & Bug-Fix Brief for Claude Code

You are acting as the **lead product designer + senior front-end engineer** on this project. The current build feels dated and is functionally broken in several places. Your job is to make it **modern, smooth, calm, and professional** — think the polish of a well-made editorial map product (Airbnb's map view, Apple Maps "place" cards, a National Geographic feature) — while fixing the bugs below. Restraint over decoration: lots of whitespace, soft shadows, one confident accent, fluid motion.

This is a real working repo. Touch only what's needed for these goals. Run `npm run typecheck` and `npm run build` before you're done.

---

## Stack (so you know what you're editing)

- **React 18 + TypeScript + Vite**
- **react-leaflet 4.2 / Leaflet 1.9** for maps (CARTO Voyager tiles, no API key needed)
- **react-router-dom 6** (map page at `/`, detail page at `/shrine/:slug`)
- Styling is **plain CSS with design tokens** — no Tailwind. Tokens live in `src/styles/tokens.css`; page styles in `src/styles/map.css`, `global.css`, `shrine.css`.
- i18n: English + Urdu (RTL). Theme: light + dark via `[data-theme]`. **Both must keep working.**

Key files you'll be in:
- `src/pages/MapPage.tsx` — map page shell + sidebar/map layout state
- `src/components/map/ShrineMap.tsx` — the Leaflet `MapContainer`, tile layers, select→pan logic
- `src/components/map/ShrineMarkers.tsx` — marker dots + click handling
- `src/components/map/MapSidebar.tsx` — search, filter chips, list, detail/preview panel
- `src/components/shrine/LocationMap.tsx` — the per-shrine "Location Map" (currently a Google iframe)
- `src/styles/tokens.css`, `src/styles/map.css`, `src/styles/shrine.css`

---

## PART 1 — CRITICAL BUGS (fix these first; they're the loudest complaints)

### 1. The per-shrine "Location Map" is stuck on "Loading map…" forever
**File:** `src/components/shrine/LocationMap.tsx`
**Cause:** It renders a Google Maps `output=embed` iframe (`https://www.google.com/maps?q=...&output=embed`) inside `sandbox="allow-scripts allow-same-origin allow-popups"`. Google frequently refuses to be framed this way, so the iframe's `onLoad` never fires and the skeleton ("Loading map…") shows permanently.
**Fix:** Replace the Google iframe entirely with a small **Leaflet** map (Leaflet is already a dependency — reuse the same CARTO Voyager tile layer used in `ShrineMap.tsx`). Render a non-interactive-but-zoomable mini map centered on the shrine's coordinates with a single marker matching the site's marker style. Keep the existing "Get Directions", "Copy coordinates", and "Share" actions and the coordinates caption underneath. Remove the now-dead iframe/`iframeLoaded` skeleton code. Make sure it works inside the detail page's two-column layout and respects light/dark mode.

### 2. Clicking a marker / a list result / a search result does NOT zoom in
**File:** `src/components/map/ShrineMap.tsx` (the `useEffect` on `selectedId`)
**Cause:** On selection it calls `mapRef.current.panTo([lat, lng])`. `panTo` only pans — it keeps the current country-level `DEFAULT_ZOOM`, so visually "nothing happens." 
**Fix:** Replace `panTo` with an animated **`flyTo`** that actually zooms in, e.g. `map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.9 })`. Pick a target zoom that frames a single shrine nicely (≈12–14). This single change must make all three paths work: clicking a map marker, clicking a list row, and clicking a search result. Guard for a null map ref and for an offset so the selected marker isn't hidden behind the sidebar (optionally pan with a horizontal pixel offset equal to half the sidebar width on desktop). Respect `prefers-reduced-motion` (use `setView` instead of `flyTo` when reduced motion is on).

### 3. The main map renders gray / half-loaded tiles ("the map never loads")
**File:** `src/components/map/ShrineMap.tsx`
**Cause:** Classic Leaflet-in-a-flex-container bug — the `MapContainer` measures its size before the layout settles (and again when the sidebar opens/closes), so tiles don't fill the container.
**Fix:** Call `map.invalidateSize()` after mount (e.g. `whenReady` + a `requestAnimationFrame`/short timeout) and whenever the sidebar opens/closes or the window resizes. A `ResizeObserver` on the map container is the clean way. Verify tiles fully cover the viewport on first paint and after toggling the sidebar.

### 4. The left panel behaves like a full-screen takeover; text is clipped
**Files:** `src/pages/MapPage.tsx`, `src/components/map/MapSidebar.tsx`, `src/styles/map.css`
**Causes:**
- Layout decisions use `window.innerWidth <= 768` read **once during render** (e.g. the toggle button's inline `display`, the mobile overlay, the close button). This is **not reactive** to resize, so the responsive layout breaks and the sidebar can cover the whole screen. Replace these reads with a reactive `useMediaQuery('(max-width: 768px)')` hook (or a resize listener in state) and drive all responsive branching from it.
- On the breakpoint that's actually rendering, the sidebar overlay is `min(var(--sidebar-width), 88vw)` — on a narrow window that's nearly the full width, which reads as "full screen." The screenshots also show **left-clipped text** ("earch shrines", "09 shrines"), i.e. content overflowing past the sidebar's left edge during/after the slide transition.
**Fix:** Make the sidebar a proper docked panel on desktop (fixed, comfortable width — keep ~360px but consider 380–400px for breathing room) with the map always clearly visible beside it. On tablet/mobile, it should be a clean slide-over of sensible width (e.g. `min(400px, 92vw)`) with a dim backdrop, never clipping its own content. Fix the overflow so no text is ever cut off at the edges. Ensure open/close is a single smooth transform transition with no layout jump.

### 5. Default to the light theme
The warm light palette in `tokens.css` is the intended look, but the app is currently showing **dark mode** (which the client dislikes). Make **light the default** on first load (don't auto-follow `prefers-color-scheme` into dark unless the user explicitly toggles). Keep the dark-mode toggle working, but the out-of-the-box impression must be the bright, airy light theme.

---

## PART 2 — THE AESTHETIC OVERHAUL (the "make it look professional" part)

**Design direction:** *Refined heritage-editorial.* Warm, light, and quiet, with the existing deep-green (`--color-primary`) and gold (`--color-accent`) used sparingly as heritage accents. The serif (`Merriweather`) is for titles only; body stays in the clean sans (`Source Sans 3`). The feeling should be "a beautifully made museum guide," not "a dashboard."

Keep the existing token system — refine values, don't rip it out. Apply these globally so every screen benefits.

### Color & depth
- Lean on the cream/ivory backgrounds already defined; reserve pure white for elevated surfaces (cards, the sidebar) to create gentle layering.
- Soften and unify shadows — prefer the existing `--shadow-sm/md` for most cards; avoid heavy borders where a soft shadow + subtle border-light reads cleaner.
- Tighten the green accent usage: primary green for interactive/active states and the brand mark; gold strictly as a sparing highlight (selected marker, small accents), never large fills.
- Increase contrast where text is currently muted-on-muted so nothing looks washed out.

### Typography & rhythm
- Establish a clear type scale and consistent line-heights using the tokens. Titles in Merriweather with slightly tighter leading; generous body leading for readability (the Urdu line-height token already exists — keep it).
- Add consistent vertical rhythm/spacing between sections. More whitespace overall; let content breathe.

### The search / list panel (called out as "not good looking at all")
**File:** `src/components/map/MapSidebar.tsx` + `src/styles/map.css`
- Redesign the **header**: a cleaner brand lockup, and move the theme + language toggles into tidy, equally-sized icon buttons with hover states.
- Redesign the **search field**: a single soft, rounded, elevated input with a clear search icon, a smooth focus ring (using `--color-primary-pale`), and a clear (×) button that only appears with text. It should feel like one polished control, not a raw input.
- Redesign the **category filter chips**: pill chips with smooth selected/hover transitions; the active chip uses the primary green fill. Make the horizontal scroll feel intentional (fade edges, no visible scrollbar — partially there already).
- Redesign the **list rows**: consistent thumbnail size with a graceful **fallback** when `imageUrl` is missing (don't just hide the image and leave a ragged row — show a subtle category-tinted placeholder tile so every row aligns). Clear name (truncate elegantly), muted location line, hover and selected states with the left accent bar. Add subtle dividers, not heavy lines.
- The **"Table of Shrines" toggle button** is currently styled with a big block of inline styles in the JSX — move it to a real CSS class and make it a clean, modern segmented/ghost button.
- The **empty / welcome state** should feel inviting and on-brand (nice icon, calm copy), not like a placeholder.
- The **detail/preview card** inside the sidebar (`ShrinePreview`): make it a polished mini place-card — image with rounded corners, serif title, tidy meta row, a clear "View full details" affordance.

### The map itself
**Files:** `src/components/map/ShrineMap.tsx`, `ShrineMarkers.tsx`, `src/styles/map.css`
- Keep CARTO Voyager as default (clean, light). Make the layer switcher and zoom controls feel native to the design (rounded, soft-shadowed, consistent with the UI).
- Refine the **marker dots**: smaller, crisper, with a smooth hover scale and a tasteful selected state (the gold pulse ring exists — keep it but make it subtle). Consider a clustered or at least visually calmer presentation when many markers overlap.
- When a shrine is selected, the smooth `flyTo` from Part 1 doubles as the "wow, this is smooth" moment — tune the easing/duration so it feels premium.

### The shrine detail page
**Files:** `src/components/shrine/*` + `src/styles/shrine.css`
- Make it **light and elegant**: a strong hero image, serif title, a clean breadcrumb/eyebrow ("MUSLIM SHRINE" etc.), and an airy two-column body with a sticky, refined "Shrine facts" card.
- Polish the **gallery** (consistent thumb sizes, hover, lightbox feel if present), the **"Shrine facts"** sidebar (clean label/value rows, good spacing), the new **Location Map** (from Part 1), and **Related Shrines** cards (uniform, modern cards with image fallback like the list rows).
- Ensure the page reads beautifully top-to-bottom with consistent section spacing.

### Motion
- Use the existing motion tokens (`--duration-*`, `--easing`, `--easing-spring`). Add smooth, *subtle* transitions on: sidebar open/close, list hover/select, chip select, marker hover, theme toggle, and the map fly-to. Everything should feel fluid, never janky. Honor `prefers-reduced-motion` everywhere.

---

## Constraints & guardrails
- **Do not break** Urdu/RTL or the dark theme — test both. (RTL relies on logical properties and `[dir='rtl']` rules; keep using logical CSS.)
- **No new heavy dependencies.** Use Leaflet (already present) for the detail mini-map. Small, well-justified additions only if truly needed.
- Keep all existing functionality: search, filtering, language toggle, theme toggle, directions/copy/share, routing, data loading from CSV.
- Match the existing code style and token system; don't refactor unrelated code.
- Keep it accessible: focus states, `aria-*` already present should be preserved/improved, keyboard nav for markers and list, color contrast AA.

## Definition of done (verify each)
1. Per-shrine "Location Map" renders an actual map every time — no permanent "Loading map…".
2. Clicking a map marker **and** a list row **and** a search result all smoothly **zoom in** to that shrine.
3. Main map fills its container on first load and after toggling the sidebar (no gray tiles).
4. The left panel is a tasteful docked sidebar on desktop and a clean slide-over on mobile — never an accidental full-screen takeover, and no clipped text at any width (resize the window live to confirm).
5. App loads in the **light** theme by default and looks modern, warm, and professional; dark mode still works.
6. Search panel, list rows (with image fallback), chips, detail page, and markers all visibly upgraded.
7. `npm run typecheck` and `npm run build` pass; Urdu/RTL and dark mode both verified.

Work in small, reviewable commits (bugs first, then visual passes). After the bug fixes, show me the before/after of the sidebar and detail page.
