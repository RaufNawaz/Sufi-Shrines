import { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import {
  buildArticleSections,
  getLeadText,
  parseInlineSections,
} from '../../lib/data/articleParsing';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { localizeHeading } from '../../lib/data/headingLabels';
import { SOURCES_HEADING_ALIASES } from '../../lib/data/constants';

/** Heading → in-page anchor id. Distinct from lib/data/slugify (URL slugs). */
export function anchorSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[؀-ۿ\s]+/g, (m) => (m.trim() ? '-' : ''))
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
  if (base) return base;

  // Arabic-script (and other non-Latin) headings strip to '' above — every
  // one would otherwise collide on the same "section" id, breaking
  // ContentsNav's scroll-to-anchor for any article with more than one Urdu
  // heading. Fall back to a stable per-heading hash instead.
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return `section-${hash.toString(36)}`;
}

export interface ArticleNavItem {
  id: string;
  label: string;
}

/**
 * Shared parse of a shrine's article content: lead text, sections, and the
 * table-of-contents items derived from them. Used by both ShrineArticle
 * (which renders the sections) and ShrinePage (which renders the contents
 * nav in a rail outside the article column).
 */
/**
 * The three parses, cached per (entry, language) rather than per hook instance.
 *
 * ## The measurement
 *
 * `useArticleContent` is called **twice on every shrine page** — `ShrinePage`
 * for the contents-nav rail (`ShrinePage.tsx`) and `ShrineArticle` for the
 * sections themselves. `useMemo` is per component *instance*, so the two
 * instances share nothing: `getLeadText`, `parseInlineSections` and
 * `buildArticleSections` each ran twice per navigation, over a Description
 * whose median is 3,403 characters and whose longest is 22,885, and twice
 * again on every language toggle. Two council seats found this independently
 * (4 September 2026); the profiled cost is ~31 ms of self time per navigation
 * in the shared chunk, about half of it duplicate.
 *
 * ## Why a cache here rather than lifting the hook
 *
 * The obvious fix is to call the hook once in `ShrinePage` and pass the parts
 * into `ShrineArticle` as props. That was measured against the diff it needs
 * and rejected: `ShrineArticle` takes `shrine` alone at **20 call sites across
 * three test files**, including the no-English-leak guard, so the prop change
 * is a wide edit to the tests that protect the Urdu edition — a lot of risk
 * around i18n rule 7 for a saving a cache gets without touching a signature.
 *
 * ## Why this key is sound
 *
 * All three functions are pure over exactly `(raw, lang)` — `articleParsing`
 * holds no state of its own — so a hit is indistinguishable from a recompute.
 * `shrine.raw` is the row object the dataset build produced, so its identity
 * changes precisely when the entry's data does, and the `WeakMap` lets a
 * dropped dataset be collected with its parses. The inner map has at most two
 * entries, one per language.
 */
const partsCache = new WeakMap<Shrine['raw'], Map<string, ArticleParts>>();

interface ArticleParts {
  leadText: string;
  inlineSections: ReturnType<typeof parseInlineSections>;
  columnSections: ReturnType<typeof buildArticleSections>;
}

/**
 * Inline sections: headings authored inside the Description column.
 *
 * **And the bibliography an Urdu article does not have.** 98 of the archive's
 * 169 entries carry a bibliography in English and none in Urdu — measured
 * 27 August 2026 — so an Urdu reader on those entries was shown no citations
 * at all. Not fewer: none. On an archive whose distinguishing claim is
 * provenance, that made the Urdu edition unable to show its own working for
 * three entries in five.
 *
 * The fix is what i18n rule 7 was written for. That ruling (20 August 2026)
 * lets a bibliography stay Latin *precisely so* an Urdu reader chasing a
 * source gets the exact search string an English one would — a citation is a
 * search string, not a sentence. So where the Urdu article has no
 * bibliography section and the English Description does, the English one is
 * appended under the Urdu heading `localizeHeading` already gives it.
 *
 * Deliberately narrow. Only the bibliography, only when the Urdu side has
 * none, and only from the Description the entry already carries — no other
 * section falls back, because every other section is prose, and untranslated
 * prose in the Urdu view is the thing rule 7 forbids in the same breath as it
 * permits this.
 */
function articleParts(raw: Shrine['raw'], lang: string): ArticleParts {
  let byLang = partsCache.get(raw);
  if (!byLang) {
    byLang = new Map();
    partsCache.set(raw, byLang);
  }
  const hit = byLang.get(lang);
  if (hit) return hit;

  const leadText = getLeadText(raw, lang as Parameters<typeof getLeadText>[1]);

  const english = getFieldValue(raw, 'Description');
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: the Urdu article body is an Urdu-only content file, not a per-language record
  const isUrdu = lang === 'ur';
  const source = isUrdu ? getUrduFieldValue(raw, 'Description') || english : english;
  let inlineSections = source ? parseInlineSections(source) : [];
  /* The Urdu bibliography fallback (i18n rule 7) — unchanged in substance from
     the `useMemo` this replaced, only moved. */
  if (isUrdu && english && source !== english) {
    const isBibliography = (heading: string) =>
      SOURCES_HEADING_ALIASES.has(heading.trim().toLowerCase());
    if (!inlineSections.some((section) => isBibliography(section.heading))) {
      const englishBibliography = parseInlineSections(english).find((section) =>
        isBibliography(section.heading),
      );
      if (englishBibliography) inlineSections = [...inlineSections, englishBibliography];
    }
  }

  const columnSections = buildArticleSections(
    raw,
    lang as Parameters<typeof buildArticleSections>[1],
  );

  const parts: ArticleParts = { leadText, inlineSections, columnSections };
  byLang.set(lang, parts);
  return parts;
}

export function useArticleContent(shrine: Shrine) {
  const { lang, t } = useLang();

  /* One cached parse for all three, shared with the other instance of this
     hook on the same page. See `articleParts` above. */
  const parts = useMemo(() => articleParts(shrine.raw, lang), [shrine.raw, lang]);
  const leadText = parts.leadText;

  /* Lead, inline sections and column sections all come from the one cached
     parse; the Urdu bibliography fallback that used to live here is documented
     at `articleParts` above, with the logic. */
  const inlineSections = parts.inlineSections;

  // Dedicated column sections (History, Architecture, …)
  const columnSections = parts.columnSections;

  // Deduplicate: skip column sections already covered by inline sections
  const inlineHeadings = useMemo(
    () => new Set(inlineSections.map((s) => s.heading.toLowerCase())),
    [inlineSections],
  );
  const uniqueColumnSections = useMemo(
    () =>
      columnSections.filter(
        (s) =>
          !inlineHeadings.has(s.title.en.toLowerCase()) &&
          !inlineHeadings.has(s.title.ur.toLowerCase()),
      ),
    [columnSections, inlineHeadings],
  );

  // Last-resort fallback: raw Description when nothing else has content
  const rawFallback = useMemo(() => {
    if (leadText || inlineSections.length || uniqueColumnSections.length) return '';
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: the Urdu article body is an Urdu-only content file, not a per-language record
    return lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') || getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  }, [leadText, inlineSections, uniqueColumnSections, shrine.raw, lang]);

  /**
   * True when this entry has no Urdu article and the reader is reading Urdu.
   *
   * Two of the archive's 169 entries — Darbar Abul Muali Qadri and Darbar Malik
   * Ahmad Ayaz — have no row in `src/data/urdu-content.json`, so every part of
   * the article falls back: the lead, the headings, the prose, the table of
   * contents. An Urdu reader gets an entirely English page with nothing saying
   * why, which is the one failure this archive's own standard ("as complete and
   * native-feeling as English") should never produce silently.
   *
   * It cannot be fixed here — writing the Urdu is content work, and RULE 2 puts
   * it out of an agent's hands. What can be fixed is the silence: the page says
   * so, and the prose beneath is declared, so the debt is counted rather than
   * passing as translated.
   */
  const urduArticleMissing = useMemo(() => {
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: asks whether the Urdu-only content file has this entry at all
    if (lang !== 'ur') return false;
    return (
      !getUrduFieldValue(shrine.raw, 'Description') && !!getFieldValue(shrine.raw, 'Description')
    );
  }, [shrine.raw, lang]);

  const navItems = useMemo(() => {
    const items: ArticleNavItem[] = [];
    if (leadText) items.push({ id: 'overview', label: t('overview') });
    for (const s of inlineSections) {
      items.push({ id: anchorSlug(s.heading), label: localizeHeading(s.heading, lang) });
    }
    for (const s of uniqueColumnSections) {
      items.push({ id: s.id, label: s.title[lang] || s.title.en });
    }
    if (shrine.gallery.length > 0) items.push({ id: 'gallery', label: t('gallery') });
    return items;
  }, [leadText, inlineSections, uniqueColumnSections, shrine.gallery, lang, t]);

  return {
    leadText,
    inlineSections,
    uniqueColumnSections,
    rawFallback,
    navItems,
    urduArticleMissing,
  };
}
