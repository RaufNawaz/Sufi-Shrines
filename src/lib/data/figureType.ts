import type { Lang } from '../../types/shrine';

/**
 * `figure_type` — what kind of figure a site honors. The infobox used to
 * label every principal figure "Saint" / "ولی", which is wrong for a Hindu
 * deity, a Sikh Guru, or a sant — ولی names a Muslim saint specifically.
 * Where the sheet records a figure type, the row label says what the figure
 * actually is; the two survey-prose values fall back to the generic label
 * rather than being paraphrased (RULE 2).
 *
 * Enum label map in the TRADITION_LABELS / CATEGORY_LABELS pattern: sheet
 * values are join keys, these labels are cosmetic.
 */

export type FigureTypeKey =
  | 'sufi-saint'
  | 'deity'
  | 'sikh-guru'
  | 'sant'
  | 'historical-person'
  | 'individual'
  | 'collective';

/** Exact (case-insensitive, trimmed) vocabulary — prose values fall through
 * to null, same contract as siteTypeKey. */
const FIGURE_TYPE_VOCABULARY: Record<string, FigureTypeKey> = {
  'sufi saint': 'sufi-saint',
  deity: 'deity',
  'sikh guru': 'sikh-guru',
  sant: 'sant',
  'historical person': 'historical-person',
  individual: 'individual',
  collective: 'collective',
};

export function figureTypeKey(value: string): FigureTypeKey | null {
  return FIGURE_TYPE_VOCABULARY[(value || '').trim().toLowerCase()] ?? null;
}

export const FIGURE_TYPE_LABELS: Record<FigureTypeKey, { en: string; ur: string }> = {
  'sufi-saint': { en: 'Sufi saint', ur: 'صوفی بزرگ' },
  deity: { en: 'Deity', ur: 'دیوتا' },
  'sikh-guru': { en: 'Sikh Guru', ur: 'سکھ گرو' },
  sant: { en: 'Sant', ur: 'سنت' },
  'historical-person': { en: 'Historical person', ur: 'تاریخی شخصیت' },
  individual: { en: 'Individual', ur: 'شخصیت' },
  collective: { en: 'Figures', ur: 'شخصیات' },
};

/** Row label for the principal-figure infobox row: the figure's actual kind
 * when the sheet records one, or null (caller falls back to the generic
 * saint label). */
export function figureTypeDisplayLabel(value: string, lang: Lang): string | null {
  const key = figureTypeKey(value);
  return key ? FIGURE_TYPE_LABELS[key][lang] : null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Below: the figure *grouping* layer, merged in 23 Aug 2026.
 *
 * Two branches independently created a file at this path for two different
 * jobs, and both have live consumers, so both APIs are kept:
 *
 * - `figureTypeKey` / `FIGURE_TYPE_LABELS` above name a single figure for the
 *   shrine infobox row ("Deity", not "Saint").
 * - `figureGroup` / `FIGURE_GROUP_LABELS` below bucket figures for the Saints
 *   & Orders explorer and figure search, where the question is which heading a
 *   figure belongs under.
 *
 * They read the same `figure_type` vocabulary and disagree about nothing;
 * keeping them in one file keeps that vocabulary in one place.
 * ──────────────────────────────────────────────────────────────────────────── */
/**
 * Display mapping for the dataset's `figure_type` column.
 *
 * Why this exists: the knowledge graph types every principal figure as
 * `saint`, because that is the only entity type the KG has for a person. But
 * `figure_type` is filled for 168 of 169 rows and says what the figure
 * actually is — 'Sufi saint' (70), 'Deity' (33), 'Sikh Guru' (28), 'Sant'
 * (17), 'Historical person' (11), plus 'Individual', 'Collective' and two rows
 * whose value is a hedged sentence. Ignoring it is how the Saints & Orders
 * Explorer came to list Durga, Kali, Krishna, Guru Nanak and "Jain
 * Tirthankaras" under a heading reading "All saints". For an archive that sets
 * out to cover six traditions honestly that is a terminology failure, not a
 * cosmetic one.
 *
 * Two rules from CLAUDE.md shape the design:
 * - RULE 2: the two prose-valued cells are *correct* content and must not be
 *   tidied into a category. They fall through to `other` and the UI shows the
 *   sentence as recorded rather than a label.
 * - RULE 3: sheet values are join keys; labels are cosmetic. So the keys below
 *   are the sheet's exact strings, and nothing here renames a value in the
 *   sheet to get a nicer label.
 *
 * Follows the TRADITION_LABELS pattern in src/lib/tours/tours.ts.
 */

/** Display buckets, in the order they should be presented. */
export type FigureGroup =
  | 'sufi-saint'
  | 'sikh-guru'
  | 'sant'
  | 'deity'
  | 'historical'
  | 'collective'
  | 'other';

/** Presentation order: the traditions the archive is built around first, then
 * the categories that describe a role rather than a tradition, then the
 * uncategorisable. Not a ranking of importance — a reading order. */
export const FIGURE_GROUP_ORDER: FigureGroup[] = [
  'sufi-saint',
  'sikh-guru',
  'sant',
  'deity',
  'historical',
  'collective',
  'other',
];

export const FIGURE_GROUP_LABELS: Record<FigureGroup, { en: string; ur: string }> = {
  'sufi-saint': { en: 'Sufi saints', ur: 'صوفی اولیا' },
  'sikh-guru': { en: 'Sikh Gurus', ur: 'سکھ گرو' },
  sant: { en: 'Sants', ur: 'سنت' },
  deity: { en: 'Deities', ur: 'دیوی دیوتا' },
  historical: { en: 'Historical figures', ur: 'تاریخی شخصیات' },
  collective: { en: 'Communities & collectives', ur: 'برادریاں اور اجتماعات' },
  other: { en: 'Recorded differently', ur: 'مختلف طور پر درج' },
};

/** Singular label, for an entity page's kicker. */
export const FIGURE_GROUP_LABELS_SINGULAR: Record<FigureGroup, { en: string; ur: string }> = {
  'sufi-saint': { en: 'Sufi saint', ur: 'صوفی ولی' },
  'sikh-guru': { en: 'Sikh Guru', ur: 'سکھ گرو' },
  sant: { en: 'Sant', ur: 'سنت' },
  deity: { en: 'Deity', ur: 'دیوتا' },
  historical: { en: 'Historical figure', ur: 'تاریخی شخصیت' },
  collective: { en: 'Community', ur: 'برادری' },
  other: { en: 'Figure', ur: 'شخصیت' },
};

/** Exact sheet values → bucket. Keys are the sheet's strings verbatim. */
const EXACT: Record<string, FigureGroup> = {
  'Sufi saint': 'sufi-saint',
  Deity: 'deity',
  'Sikh Guru': 'sikh-guru',
  Sant: 'sant',
  'Historical person': 'historical',
  Individual: 'historical',
  Collective: 'collective',
};

/**
 * Bucket a raw `figure_type` for display.
 *
 * Falls back to `other` rather than guessing. The two long prose values in the
 * data do begin with a recognisable word ('Sufi saint / scholar (survey: …)',
 * 'Martyr (Shaheed) -- not a Sufi pir …'), and it would be easy to prefix-match
 * them into a tidy bucket — but the second one's whole point is that it says
 * the figure is *not* a Sufi pir, so prefix-matching the first word would file
 * it under exactly the category it denies. They stay in `other`, where the UI
 * shows the sentence.
 */
export function figureGroup(figureType: string | undefined): FigureGroup {
  const raw = (figureType ?? '').trim();
  if (!raw) return 'other';
  return EXACT[raw] ?? 'other';
}

/** True when the sheet's value is a sentence rather than a category — the UI
 * should render it as recorded text instead of a label. */
export function isProseFigureType(figureType: string | undefined): boolean {
  const raw = (figureType ?? '').trim();
  return raw.length > 0 && !(raw in EXACT);
}

export function figureGroupLabel(group: FigureGroup, lang: 'en' | 'ur'): string {
  return FIGURE_GROUP_LABELS[group][lang];
}

export function figureGroupLabelSingular(group: FigureGroup, lang: 'en' | 'ur'): string {
  return FIGURE_GROUP_LABELS_SINGULAR[group][lang];
}