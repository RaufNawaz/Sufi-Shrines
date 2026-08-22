/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '../../types/shrine';
import type { UI_TEXT } from './uiStrings';
import { t, tFn } from './uiStrings';
import { getUrduFieldValue, getFieldValue } from '../data/fieldAliasing';
import { translateToUrdu } from './urduFallback';
import { localizeDigits } from './numerals';
import { LANGUAGE_STORAGE_KEY, NUMERALS_STORAGE_KEY } from '../storageKeys';
import { isRtlLang } from './languages';
import { isUrPrefixedPath } from './urlLangPrefix';
import type { ShrineRow } from '../../types/shrine';

export type Numerals = 'eastern' | 'western';

function detectInitialNumerals(): Numerals {
  const stored = localStorage.getItem(NUMERALS_STORAGE_KEY);
  return stored === 'western' ? 'western' : 'eastern';
}

function detectInitialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'en' || param === 'ur') return param;
  // A /ur/* prerendered route (see urlLangPrefix.ts) is as explicit a signal
  // as ?lang=ur — checked before localStorage so a shared /ur/shrine/<slug>
  // link never flashes the wrong language before App.tsx's normalizer runs.
  if (isUrPrefixedPath(window.location.pathname)) return 'ur';
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'en' || stored === 'ur') return stored;
  if (navigator.language?.toLowerCase().startsWith('ur')) return 'ur';
  return 'en';
}

interface LangContextValue {
  lang: Lang;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  t: (key: keyof (typeof UI_TEXT)['en']) => string;
  tCount: (n: number) => string;
  localizeField: (row: ShrineRow, field: string) => string;
  numerals: Numerals;
  setNumerals: (numerals: Numerals) => void;
  fmtNum: (n: number | string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);
  const [numerals, setNumeralsState] = useState<Numerals>(detectInitialNumerals);

  const setNumerals = useCallback((next: Numerals) => {
    setNumeralsState(next);
    localStorage.setItem(NUMERALS_STORAGE_KEY, next);
  }, []);

  const fmtNum = useCallback(
    (n: number | string) => localizeDigits(String(n), lang, numerals === 'eastern'),
    [lang, numerals],
  );

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    const params = new URLSearchParams(window.location.search);
    params.set('lang', next);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    // Direction derives from the language metadata table (languages.ts) —
    // a third RTL language must not require touching this effect.
    const isRTL = isRtlLang(lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.body.classList.toggle('lang-rtl', isRTL);
    document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    // Site-wide meta description/OG tags and the PWA install title — page
    // components (ShrinePage, SaintPage, …) own document.title themselves.
    const description = t(lang, 'siteMetaDescription');
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', t(lang, 'siteTitle'));
    document
      .querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute('content', t(lang, 'title'));
  }, [lang]);

  const localizeField = useCallback(
    (row: ShrineRow, field: string) => {
      if (lang !== 'ur') return getFieldValue(row, field);
      const urduValue = getUrduFieldValue(row, field);
      if (urduValue) return urduValue;
      return translateToUrdu(getFieldValue(row, field));
    },
    [lang],
  );

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      isRTL: isRtlLang(lang),
      setLang,
      t: (key) => t(lang, key),
      tCount: (n) => fmtNum(tFn(lang, 'resultCount', n)),
      localizeField,
      numerals,
      setNumerals,
      fmtNum,
    }),
    [lang, setLang, localizeField, numerals, setNumerals, fmtNum],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
}
