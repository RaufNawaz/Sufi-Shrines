/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isRtlLang } from './languages';
import type { Lang } from '../../types/shrine';
import type { UI_TEXT } from './uiStrings';
import { loadUiStrings } from './uiStrings';
import { t, tFn } from './uiStrings';
import { getUrduFieldValue, getFieldValue } from '../data/fieldAliasing';
import {
  translateToUrdu,
  ensureUrduSeedForLang,
  isUrduSeedLoaded,
  onUrduSeedLoaded,
} from './urduFallback';
import { localizeDigits } from './numerals';
import { LANGUAGE_STORAGE_KEY, NUMERALS_STORAGE_KEY } from '../storageKeys';
import { detectInitialLang } from './detectLang';
import type { ShrineRow } from '../../types/shrine';

export type Numerals = 'eastern' | 'western';

function detectInitialNumerals(): Numerals {
  const stored = localStorage.getItem(NUMERALS_STORAGE_KEY);
  return stored === 'western' ? 'western' : 'eastern';
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
  /** Increments when the Urdu dictionary arrives. Read it only to depend on
   *  it — a component that translates during render needs the re-render, not
   *  the number. */
  dictVersion: number;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);
  const [numerals, setNumeralsState] = useState<Numerals>(detectInitialNumerals);
  /* Bumped when the Urdu dictionary lands. It is in the context value on
     purpose: every component that translates a name reads `useLang()` for the
     language itself, so one changed value re-renders all of them with the
     dictionary in place. Without it, a switch to Urdu mid-session would leave
     already-rendered names in English until something else happened to
     re-render them. */
  const [dictVersion, setDictVersion] = useState(() => (isUrduSeedLoaded() ? 1 : 0));

  const setNumerals = useCallback((next: Numerals) => {
    setNumeralsState(next);
    localStorage.setItem(NUMERALS_STORAGE_KEY, next);
  }, []);

  const fmtNum = useCallback(
    (n: number | string) => localizeDigits(String(n), lang, numerals === 'eastern'),
    [lang, numerals],
  );

  const setLang = useCallback((next: Lang) => {
    /*
     * The strings first, then the switch.
     *
     * A language's interface table is its own chunk now, so switching before it
     * arrives would paint the *new* language's page with the *old* language's
     * words — `t()` falls back to English for a missing table, which on a
     * switch into Urdu is the whole page in English under an Urdu toggle. The
     * URL and the stored preference move with the state, not ahead of it, so a
     * reload during the fetch lands on the language actually being shown.
     *
     * Resolves synchronously when the table is already loaded, which is every
     * switch after the first in each direction, and always for English.
     */
    void loadUiStrings(next).then(() => {
      setLangState(next);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      const params = new URLSearchParams(window.location.search);
      params.set('lang', next);
      /* Carry the hash. Rebuilding from pathname and search alone discards it,
         and this runs on *every* switch — so a reader partway down a long page
         at `/about#site-status` who changed language was silently returned to a
         URL with no anchor in it. Same omission as the `/ur/` normaliser in
         `App.tsx`, and the reason the two are fixed together. */
      const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', url);
    });
  }, []);

  /*
   * The Urdu article payload is **not** requested here any more.
   *
   * It was, on every Urdu visit — and `useShrineData` awaited it before it
   * built a single row, so the gate was on the reader's language and not on
   * whether anything on screen would use the file. Measured on a production
   * build, 30 August 2026: 258,872 gzipped bytes of shrine article prose
   * downloaded on `/almanac`, `/graph`, `/place/:slug`, `/about` and the map
   * front door, none of which renders a word of it.
   *
   * The three surfaces that read a merged Urdu article field now ask for it
   * themselves — `useUrduArticles`, used by `ShrinePreview` when a shrine is
   * selected, `TourPanel` when a tour is running, and `ShrinePage`, which is
   * also prefetched at module scope in `main.tsx` so a direct Urdu shrine link
   * is no slower than it was. `docs/planning/URDU_ARTICLE_PAYLOAD.md` holds the
   * measurements.
   *
   * The mid-session switch this effect existed for still works, and by the same
   * machinery: `onUrduContentLoaded` re-merges the rows already on screen, and
   * every consumer renders a truthful empty rather than English until it lands.
   */

  /* Same arrangement for the dictionary (80 KB): requested when the language is
     Urdu, and never for an English reader. `main.tsx` starts the request before
     first paint for a /ur or ?lang=ur visit; this covers the mid-session
     switch, and the subscription covers the case where either request is still
     in flight when this provider mounts. */
  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: this waits on the Urdu dictionary, a fact about that one file
    if (lang !== 'ur') return;
    if (isUrduSeedLoaded()) {
      setDictVersion((n) => (n === 0 ? 1 : n));
      return;
    }
    const unsubscribe = onUrduSeedLoaded(() => setDictVersion((n) => n + 1));
    void ensureUrduSeedForLang(lang);
    return unsubscribe;
  }, [lang]);

  useEffect(() => {
    const isRTL = isRtlLang(lang);
    document.documentElement.setAttribute('lang', isRTL ? 'ur' : 'en');
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
      // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: getUrduFieldValue reads the sheet's Urdu-only columns
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
      dictVersion,
    }),
    [lang, setLang, localizeField, numerals, setNumerals, fmtNum, dictVersion],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
}
