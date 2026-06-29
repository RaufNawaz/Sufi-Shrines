import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, Navigate, useSearchParams, useLocation } from 'react-router-dom';

import { LanguageProvider } from './lib/i18n/LanguageContext';
import { ThemeProvider } from './lib/i18n/ThemeContext';
import { UpdateToast } from './components/ui/UpdateToast';

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
    <div className="page-fallback">
      <span className="spinner spinner--lg" />
    </div>
  );
}

function RouteAnnouncer() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    // Shift focus to main content on navigation so screen readers pick up the new page
    const el = document.getElementById('main-content') as HTMLElement | null;
    if (!el) return;
    if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <a href="#shrine-directory" className="skip-link">Skip to shrine list</a>
          <RouteAnnouncer />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/shrine/:slug" element={<ShrinePage />} />
              {/* Legacy shrine.html?id=N redirect */}
              <Route path="/shrine.html" element={<LegacyRedirect />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <UpdateToast />
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
