import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useSearchParams } from 'react-router-dom';

import { LanguageProvider } from './lib/i18n/LanguageContext';
import { ThemeProvider } from './lib/i18n/ThemeContext';

const MapPage = lazy(() => import('./pages/MapPage'));
const ShrinePage = lazy(() => import('./pages/ShrinePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LegacyRedirect() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const lang = params.get('lang') || '';
  const langSuffix = lang ? `?lang=${lang}` : '';
  if (id !== null && id !== '') {
    return <Navigate to={`/shrine/id-${id}${langSuffix}`} replace />;
  }
  return <Navigate to={`/${langSuffix}`} replace />;
}

function PageFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-muted)',
        fontSize: '0.875rem',
      }}
    >
      <span className="spinner" style={{ width: 24, height: 24, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/shrine/:slug" element={<ShrinePage />} />
              {/* Legacy shrine.html?id=N redirect */}
              <Route path="/shrine.html" element={<LegacyRedirect />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
