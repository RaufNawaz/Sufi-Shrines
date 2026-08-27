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
export function useArticleContent(shrine: Shrine) {
  const { lang, t } = useLang();

  // Lead text: prose before the first heading in Description, language-aware
  const leadText = useMemo(() => getLeadText(shrine.raw, lang), [shrine.raw, lang]);

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
  const inlineSections = useMemo(() => {
    const english = getFieldValue(shrine.raw, 'Description');
    // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: the Urdu article body is an Urdu-only content file, not a per-language record
    const isUrdu = lang === 'ur';
    const raw = isUrdu ? getUrduFieldValue(shrine.raw, 'Description') || english : english;
    const sections = raw ? parseInlineSections(raw) : [];
    if (!isUrdu || !english || raw === english) return sections;

    const isBibliography = (heading: string) =>
      SOURCES_HEADING_ALIASES.has(heading.trim().toLowerCase());
    if (sections.some((section) => isBibliography(section.heading))) return sections;

    const englishBibliography = parseInlineSections(english).find((section) =>
      isBibliography(section.heading),
    );
    return englishBibliography ? [...sections, englishBibliography] : sections;
  }, [shrine.raw, lang]);

  // Dedicated column sections (History, Architecture, …)
  const columnSections = useMemo(() => buildArticleSections(shrine.raw, lang), [shrine.raw, lang]);

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

  return { leadText, inlineSections, uniqueColumnSections, rawFallback, navItems };
}
