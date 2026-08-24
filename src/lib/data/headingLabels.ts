import type { Lang } from '../../types/shrine';
import { ARTICLE_SECTION_DEFINITIONS } from './constants';

/** Common inline "## Heading" labels used across shrine Description prose
 * that aren't one of the dedicated ARTICLE_SECTION_DEFINITIONS columns. */
const GENERIC_HEADING_LABELS: Record<string, string> = {
  overview: 'خلاصہ',
  significance: 'اہمیت',
  'significance today': 'اہمیت',
  bibliography: 'کتابیات',
  references: 'کتابیات',
  legacy: 'ورثہ',
  'the shrine': 'مزار',
};

const SECTION_TITLE_LABELS: Record<string, string> = Object.fromEntries(
  ARTICLE_SECTION_DEFINITIONS.map((def) => [def.title.en.toLowerCase(), def.title.ur]),
);

const HEADING_LABELS: Record<string, string> = {
  ...GENERIC_HEADING_LABELS,
  ...SECTION_TITLE_LABELS,
};

/**
 * Localizes an inline article heading (e.g. a "## Overview" line inside a
 * Description) even when the surrounding body text hasn't been translated
 * to Urdu yet, so the Table of Contents and section headings don't leak
 * English while content is authored in batches (URDU_IMPLEMENTATION_PLAN.md
 * §0.1c). Headings outside this map — and English-mode rendering — pass
 * through unchanged; this never invents a translation.
 */
export function localizeHeading(heading: string, lang: Lang): string {
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: the heading dictionary is Urdu-only
  if (lang !== 'ur') return heading;
  return HEADING_LABELS[heading.trim().toLowerCase()] ?? heading;
}
