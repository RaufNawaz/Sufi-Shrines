import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Vendor CSS first — app styles must load after it to win the cascade by source order.
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/motion.css';
import './styles/map.css';
import './styles/tours.css';
// Shared primitives load after map/tours and before shrine.css — see components.css header.
import './styles/components.css';
import './styles/list.css';
// Self-contained `.settings-*` rules; after components.css so its option rows
// win where they overlap the shared control styles.
import './styles/settings.css';
// The command palette is a feature sheet, loaded like map/tours; it must come
// after components.css so its own .palette-* rules win where they overlap.
import './styles/palette.css';
import './styles/shrine.css';
import './styles/kg.css';
import './styles/almanac.css';
import './styles/chronology.css';
import './styles/shared-ground.css';
import './styles/tabbar.css';
import { initTelemetry } from './lib/telemetry';
import { THEME_STORAGE_KEY } from './lib/storageKeys';
import { applyTextSize, readTextSize } from './lib/textSizePreference';
import { applyMotionPreference, readMotionPreference } from './lib/motionPreference';
import { detectInitialLang } from './lib/i18n/detectLang';
import { ensureUrduSeedForLang } from './lib/i18n/urduFallback';
import { ensureUrduContentForLang } from './lib/data/urduContentOverride';
import { loadUiStrings } from './lib/i18n/uiStrings';
import { prefetchCsvText } from './lib/data/csvPrefetch';

// Prevent FOUC by setting data-theme before paint. An explicit choice
// (the moon button) pins the theme; otherwise follow the device — a phone
// in dark mode used to get the light site (seen on a real phone, 22 Aug).
const stored = localStorage.getItem(THEME_STORAGE_KEY);
const theme =
  stored === 'dark' || stored === 'light'
    ? stored
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
document.documentElement.setAttribute('data-theme', theme);

/* Reading size, before paint for the same reason as the theme: applied from an
   effect it is a reflow of every paragraph on the page, which the reader
   watches happen. `medium` writes no attribute, so the default DOM is the
   default preference. */
applyTextSize(readTextSize(), document.documentElement);

/* And the motion preference, for the same reason again: an animation that is
   switched off after it has started is an animation the reader saw. */
applyMotionPreference(readMotionPreference(), document.documentElement);

initTelemetry();

/* The Urdu dictionary (80 KB) is no longer in the eager bundle, so an English
   reader never downloads it. Requested here rather than from an effect inside
   the provider, because `translateToUrdu` runs synchronously during render: at
   module scope the request is already in flight before React's first pass, so
   for an Urdu reader it resolves alongside — usually well before — the shrine
   data fetch it would otherwise be waiting behind. If it does land late,
   `LanguageProvider` re-renders on arrival. */
const initialLang = detectInitialLang();

void ensureUrduSeedForLang(initialLang);

/*
 * The Urdu article payload, on the one route that always needs it.
 *
 * It used to be requested for every Urdu visit, from `LanguageContext`, and
 * awaited by `useShrineData` before it built a single row — so an Urdu reader
 * downloaded 258,872 gzipped bytes of shrine prose to look at the calendar, the
 * graph or the map. The three surfaces that read it now ask for it themselves
 * (`useUrduArticles`), which takes it off every other route.
 *
 * A shrine page, though, needs it to render its main content, and asking from
 * inside the component would put a chunk request behind React's first pass and
 * the route's own lazy chunk. At module scope it is in flight immediately, as
 * it effectively was before — so the page a direct Urdu link opens is no slower
 * than it was, and nothing else pays for it. Same argument, and the same shape,
 * as the CSV prefetch below.
 */
/* `includes`, not an anchored pattern: production serves from `/Sufi-Shrines/`,
   so an expression anchored at `^/shrine/` matches on the dev server and never
   in production — the failure would be invisible locally and permanent live.
   Matching the segment covers `/shrine/x`, `/Sufi-Shrines/shrine/x` and both
   `/ur` mirrors, and its worst case is a payload fetched on a route that did
   not need it, which is the direction that costs a reader nothing. */
if (window.location.pathname.includes('/shrine/')) {
  void ensureUrduContentForLang(initialLang);
}

/*
 * The sheet, requested now rather than when React mounts.
 *
 * The first render is gated on `loadUiStrings` below, so without this line the
 * request for the archive's own data waits behind the interface strings, the
 * Nastaliq faces and the Urdu content payload. Measured on a preview build at
 * 390px, 4× CPU, slow 4G: on `/?lang=ur` the CSV did not start until 3,790ms.
 * `lib/data/csvPrefetch.ts` carries the full measurement, and the reason it is
 * a separate module holding bytes rather than a call into the data hook: the
 * first version imported the hook here and put PapaParse into the entry chunk,
 * which is every route's eager cost.
 */
prefetchCsvText();

/*
 * The interface strings for the reader's language, *awaited* before the first
 * render — the only line in this file that gates paint, and deliberately so.
 *
 * The Urdu table is 42 KB and now its own chunk, so an English reader never
 * fetches it (this resolves synchronously for English: the table is static).
 * For an Urdu reader it has to be in hand before React's first pass, because
 * `t()` falls back to English for a missing table. That fallback is the right
 * safety net and exactly the wrong first frame: 200ms of English chrome tells a
 * reader which language the site thinks is real.
 *
 * There is nothing to hide the fetch behind. `scripts/prerender.mjs` bakes
 * <head> metadata into per-route shells whose body is `<div id="root">` — it is
 * not server rendering (HANDOVER §9.98) — so the alternative to awaiting is a
 * flash, not a rendered page. What keeps the wait from being felt is the
 * `modulepreload` the prerenderer injects into /ur/** pages: the request starts
 * with the document rather than after this bundle parses. Correctness does not
 * depend on that having worked, only the speed does.
 */
void loadUiStrings(initialLang).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
