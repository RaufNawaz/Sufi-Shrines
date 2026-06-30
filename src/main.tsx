import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/map.css';
import './styles/shrine.css';
import './styles/kg.css';
import { initTelemetry } from './lib/telemetry';

// Prevent FOUC by setting data-theme before paint
const stored = localStorage.getItem('shrines_theme');
const theme = stored === 'dark' || stored === 'light' ? stored : 'light';
document.documentElement.setAttribute('data-theme', theme);

initTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
