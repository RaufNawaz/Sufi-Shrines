import VERSE_LANGUAGES from '../../data/verse-languages.json';
import type { UiStringKey } from '../../lib/i18n/uiStrings';

/**
 * The language of a quoted original verse, for the label set above it.
 *
 * Rauf, 30 October 2026: "For the differentiation between the urdu and punjabi
 * make it more obvious". In the Urdu article a Punjabi kafi and its Urdu
 * translation were both Nastaliq, both centred, one above the other, and
 * nothing said which was which. The language of every verse the articles quote
 * is recorded, with the basis for it, in
 * `entries/verse_originals/languages.json`; `pipeline/verse_languages.py
 * --write` turns that into `src/data/verse-languages.json`, keyed by this
 * hash, so the bundle carries 1 KB of keys instead of the verses themselves.
 */
export type VerseLanguage = 'pa' | 'pa-Guru' | 'Guru' | 'fa' | 'ur' | 'sd' | 'skr';

const MAP = VERSE_LANGUAGES as Record<string, VerseLanguage>;

const GURMUKHI_CHAR = /[਀-੿]/;

/** The verse as the record keys it: lines trimmed, blank lines dropped. */
export function verseKeyText(paragraph: string): string {
  return paragraph
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/** 32 bit FNV-1a over UTF-16 code units, as pipeline/verse_languages.py. */
export function verseHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The recorded language of a verse paragraph, or null where none is recorded
 *  (a two word chronogram phrase, a line of mixed language). A Gurmukhi verse
 *  missing from the record is still known by its script. */
export function verseLanguageOf(paragraph: string): VerseLanguage | null {
  const text = verseKeyText(paragraph);
  const recorded = MAP[verseHash(text)];
  if (recorded) return recorded;
  return GURMUKHI_CHAR.test(text) ? 'Guru' : null;
}

/** The label key for a language. */
export const VERSE_LANGUAGE_LABEL: Record<VerseLanguage | 'en', UiStringKey> = {
  pa: 'verseLangPunjabi',
  'pa-Guru': 'verseLangPunjabiGurmukhi',
  Guru: 'verseLangGurmukhi',
  fa: 'verseLangPersian',
  ur: 'verseLangUrdu',
  sd: 'verseLangSindhi',
  skr: 'verseLangSeraiki',
  en: 'verseLangEnglish',
};
