import { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import {
  buildArticleSections,
  getLeadText,
  parseInlineSections,
} from '../../lib/data/articleParsing';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';

/** Heading → in-page anchor id. Distinct from lib/data/slugify (URL slugs). */
export function anchorSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[؀-ۿ\s]+/g, (m) => (m.trim() ? '-' : ''))
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    || 'section';
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
export function useArticleContent(shrine: Shrine) {
  const { lang, t } = useLang();

  // Lead text: prose before the first heading in Description, language-aware
  const leadText = useMemo(() => getLeadText(shrine.raw, lang), [shrine.raw, lang]);

  // Inline sections: headings authored inside the Description column
  const inlineSections = useMemo(() => {
    const raw =
      lang === 'ur'
        ? getUrduFieldValue(shrine.raw, 'Description') ||
          getFieldValue(shrine.raw, 'Description')
        : getFieldValue(shrine.raw, 'Description');
    return raw ? parseInlineSections(raw) : [];
  }, [shrine.raw, lang]);

  // Dedicated column sections (History, Architecture, …)
  const columnSections = useMemo(
    () => buildArticleSections(shrine.raw, lang),
    [shrine.raw, lang],
  );

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
    return lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') ||
          getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  }, [leadText, inlineSections, uniqueColumnSections, shrine.raw, lang]);

  const navItems = useMemo(() => {
    const items: ArticleNavItem[] = [];
    if (leadText) items.push({ id: 'overview', label: t('overview') });
    for (const s of inlineSections) {
      items.push({ id: anchorSlug(s.heading), label: s.heading });
    }
    for (const s of uniqueColumnSections) {
      items.push({ id: s.id, label: s.title[lang as 'en' | 'ur'] || s.title.en });
    }
    if (shrine.gallery.length > 0) items.push({ id: 'gallery', label: t('gallery') });
    return items;
  }, [leadText, inlineSections, uniqueColumnSections, shrine.gallery, lang, t]);

  return { leadText, inlineSections, uniqueColumnSections, rawFallback, navItems };
}
