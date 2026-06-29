import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Lang } from '../../types/shrine';
import { t, tFn, UI_TEXT } from './uiStrings';
import { getUrduFieldValue, getFieldValue } from '../data/fieldAliasing';
import { translateToUrdu } from './urduFallback';
import type { ShrineRow } from '../../types/shrine';

const STORAGE_KEY = 'shrines_language';

function detectInitialLang(): Lang {
  const param = new URLSearchParams(window.location.search).get('lang');
  if (param === 'en' || param === 'ur') return param;
  const stored = localStorage.getItem(STORAGE_KEY);
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
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const params = new URLSearchParams(window.location.search);
    params.set('lang', next);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const isRTL = lang === 'ur';
    document.documentElement.setAttribute('lang', isRTL ? 'ur' : 'en');
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.body.classList.toggle('lang-rtl', isRTL);
    document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
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
      isRTL: lang === 'ur',
      setLang,
      t: (key) => t(lang, key),
      tCount: (n) => tFn(lang, 'resultCount', n),
      localizeField,
    }),
    [lang, setLang, localizeField],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
}
