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
