import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Vendor CSS first — app styles must load after it to win the cascade by source order.
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/map.css';
import './styles/tours.css';
// Shared primitives load after map/tours and before shrine.css — see components.css header.
import './styles/components.css';
import './styles/shrine.css';
import './styles/kg.css';
import './styles/almanac.css';
import { initTelemetry } from './lib/telemetry';
import { THEME_STORAGE_KEY } from './lib/storageKeys';

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

initTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
