import type { Lang } from '../types/shrine';
import { UI_TEXT } from './i18n/uiStrings';

/**
 * Citation builders for "Cite this entry" (plan item A5,
 * docs/planning/NEXT_STEPS_2026-08-21.md). Pure functions — the component
 * supplies URL and date so these stay deterministic under test.
 *
 * The support level travels inside every citation on purpose: a reader of
 * someone's footnote should inherit the archive's honesty about how well the
 * entry is sourced, not just its prose.
 *
 * Reader-visible words come from UI_TEXT (CLAUDE.md i18n rule 1); only the
 * per-language sentence *order* lives here, because Urdu and English compose
 * the same words differently.
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

/** LaTeX-special characters escaped so one production-sheet edit (the sheet
 * has no review step — RULE 3) cannot ship citations that break the
 * consuming tool. Backslash first, then the rest; braces escaped too, so an
 * unbalanced { in sheet data cannot unbalance the entry. URLs are not passed
 * through this — ours are same-site ASCII paths, and escaping % inside
 * url={} corrupts a URL rather than protecting it. */
const BIBTEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

export function escapeBibtex(value: string): string {
  // Single pass — sequential replaces would re-escape the braces inserted
  // by \textbackslash{} and corrupt the output.
  return value.replace(/[\\&%#_{}$~^]/g, (c) => BIBTEX_ESCAPES[c]);
}

/** BibTeX stays Latin regardless of UI language — it is a machine format,
 * and mixed-direction BibTeX breaks the tools that consume it. Only the
 * English entry name goes in, even in the Urdu view. */
export function buildBibtex(input: Omit<CiteInput, 'name'> & { englishName: string }): string {
  const note = [
    input.supportLevelLabel &&
      `${UI_TEXT.en.citeSupportLevel}: ${escapeBibtex(input.supportLevelLabel)}`,
    `${UI_TEXT.en.citeRetrieved} ${escapeBibtex(input.retrieved)}`,
  ]
    .filter(Boolean)
    .join('. ');
  return [
    `@misc{shrines-${input.slug},`,
    `  title = {${escapeBibtex(input.englishName)}},`,
    `  howpublished = {${escapeBibtex(`${UI_TEXT.en.siteTitle} (${UI_TEXT.en.citeArchive})`)}},`,
    `  url = {${input.url}},`,
    `  year = {${input.year}},`,
    `  note = {${note}},`,
    `}`,
  ].join('\n');
}

export function buildPlainCitation(lang: Lang, input: CiteInput): string {
  const words = UI_TEXT[lang] ?? UI_TEXT.en;
  if (lang === 'ur') {
    const support = input.supportLevelLabel
      ? ` ${words.citeSupportLevel}: ${input.supportLevelLabel}۔`
      : '';
    return `"${input.name}"۔ ${words.siteTitle} (${words.citeArchive})۔ ${input.retrieved} ${words.citeRetrieved}۔${support} ${input.url}`;
  }
  const support = input.supportLevelLabel
    ? ` ${words.citeSupportLevel}: ${input.supportLevelLabel}.`
    : '';
  return `"${input.name}." ${words.siteTitle} (${words.citeArchive}). ${words.citeRetrieved} ${input.retrieved}.${support} ${input.url}`;
}
