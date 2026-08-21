import type { Lang } from '../types/shrine';

/**
 * Citation builders for "Cite this entry" (plan item A5,
 * docs/planning/NEXT_STEPS_2026-08-21.md). Pure functions — the component
 * supplies URL and date so these stay deterministic under test.
 *
 * The support level travels inside every citation on purpose: a reader of
 * someone's footnote should inherit the archive's honesty about how well the
 * entry is sourced, not just its prose.
 */

export interface CiteInput {
  slug: string;
  /** Display name in the citing language. */
  name: string;
  /** Absolute URL of the entry. */
  url: string;
  /** Human-readable support level in the citing language ('' when absent). */
  supportLevelLabel: string;
  /** Retrieval date, already formatted for the citing language. */
  retrieved: string;
  /** Retrieval year (Western digits — BibTeX is machine-read). */
  year: number;
}

const PROJECT_NAME: Record<Lang, string> = {
  en: 'Sufi Shrines of Pakistan',
  ur: 'پاکستان کے صوفی مزارات',
};

/** BibTeX stays Latin regardless of UI language — it is a machine format,
 * and mixed-direction BibTeX breaks the tools that consume it. The English
 * entry name is therefore required here even in the Urdu view. */
export function buildBibtex(input: CiteInput & { englishName: string }): string {
  const note = [
    input.supportLevelLabel && `Support level: ${input.supportLevelLabel}`,
    `Retrieved ${input.retrieved}`,
  ]
    .filter(Boolean)
    .join('. ');
  return [
    `@misc{shrines-${input.slug},`,
    `  title = {${input.englishName}},`,
    `  howpublished = {${PROJECT_NAME.en} (digital archive)},`,
    `  url = {${input.url}},`,
    `  year = {${input.year}},`,
    `  note = {${note}},`,
    `}`,
  ].join('\n');
}

export function buildPlainCitation(lang: Lang, input: CiteInput): string {
  if (lang === 'ur') {
    const support = input.supportLevelLabel ? ` تصدیق کا درجہ: ${input.supportLevelLabel}۔` : '';
    return `"${input.name}"۔ ${PROJECT_NAME.ur} (ڈیجیٹل آرکائیو)۔ ${input.retrieved} کو دیکھا گیا۔${support} ${input.url}`;
  }
  const support = input.supportLevelLabel ? ` Support level: ${input.supportLevelLabel}.` : '';
  return `"${input.name}." ${PROJECT_NAME.en} (digital archive). Retrieved ${input.retrieved}.${support} ${input.url}`;
}
