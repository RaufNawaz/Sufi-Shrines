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
import './styles/tabbar.css';
import { initTelemetry } from './lib/telemetry';
import { THEME_STORAGE_KEY } from './lib/storageKeys';
import { applyTextSize, readTextSize } from './lib/textSizePreference';
import { applyMotionPreference, readMotionPreference } from './lib/motionPreference';
import { detectInitialLang } from './lib/i18n/detectLang';
import { ensureUrduSeedForLang } from './lib/i18n/urduFallback';
import { loadUiStrings } from './lib/i18n/uiStrings';

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
