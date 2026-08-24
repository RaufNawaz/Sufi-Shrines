export interface EraRange {
  minCentury: number;
  maxCentury: number;
  confidence: 'exact' | 'approx';
}

export const ERA_MIN = 5;
export const ERA_MAX = 21;

const ORDINAL_TO_CENTURY: [RegExp, number][] = [
  [/\b(1st|first)\b/i, 1],
  [/\b(2nd|second)\b/i, 2],
  [/\b(3rd|third)\b/i, 3],
  [/\b(4th|fourth)\b/i, 4],
  [/\b(5th|fifth)\b/i, 5],
  [/\b(6th|sixth)\b/i, 6],
  [/\b(7th|seventh)\b/i, 7],
  [/\b(8th|eighth)\b/i, 8],
  [/\b(9th|ninth)\b/i, 9],
  [/\b(10th|tenth)\b/i, 10],
  [/\b(11th|eleventh)\b/i, 11],
  [/\b(12th|twelfth)\b/i, 12],
  [/\b(13th|thirteenth)\b/i, 13],
  [/\b(14th|fourteenth)\b/i, 14],
  [/\b(15th|fifteenth)\b/i, 15],
  [/\b(16th|sixteenth)\b/i, 16],
  [/\b(17th|seventeenth)\b/i, 17],
  [/\b(18th|eighteenth)\b/i, 18],
  [/\b(19th|nineteenth)\b/i, 19],
  [/\b(20th|twentieth)\b/i, 20],
  [/\b(21st|twenty.first)\b/i, 21],
];

export function parseEra(founded: string | null | undefined): EraRange | null {
  if (!founded?.trim()) return null;
  const text = founded.trim();

  // "Approx. N years old" → reference year 2024
  const ageMatch = text.match(/approx\.?\s*(\d+)\s*years?\s*old/i);
  if (ageMatch) {
    const year = 2024 - parseInt(ageMatch[1], 10);
    const century = Math.ceil(year / 100);
    return { minCentury: century, maxCentury: century, confidence: 'approx' };
  }

  // Collect ordinal century mentions
  const ordinalCenturies: number[] = [];
  for (const [pattern, century] of ORDINAL_TO_CENTURY) {
    if (pattern.test(text)) ordinalCenturies.push(century);
  }

  // Collect 3–4 digit year mentions (100–2100)
  const yearMatches = [...text.matchAll(/\b(\d{3,4})\b/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((y) => y >= 100 && y <= 2100);

  const allCenturies = [
    ...ordinalCenturies,
    ...yearMatches.map((y) => Math.ceil(y / 100)),
  ];

  if (allCenturies.length === 0) return null;

  const minCentury = Math.min(...allCenturies);
  const maxCentury = Math.max(...allCenturies);

  // "exact" when a single 4-digit year with no range text
  const confidence: EraRange['confidence'] =
    yearMatches.length === 1 && ordinalCenturies.length === 0 && !text.match(/[–—-]/) ? 'exact' : 'approx';

  return { minCentury, maxCentury, confidence };
}

const CENTURY_LABELS: Record<number, string> = {
  5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th', 10: '10th',
  11: '11th', 12: '12th', 13: '13th', 14: '14th', 15: '15th', 16: '16th',
  17: '17th', 18: '18th', 19: '19th', 20: '20th', 21: '21st',
};

/** Just the ordinal — "17th", "1st" — without the word "century".
 *
 * Split out so a *range* can name the century once: "12th–20th c." rather than
 * "12th c.–20th c.", and in Urdu "۱۲ویں تا ۲۰ویں صدی" rather than the same noun
 * twice. `formatCentury` is this plus the noun, so single-century callers are
 * unchanged. */
export function centuryOrdinal(century: number): string {
  return CENTURY_LABELS[century] ?? `${century}th`;
}

/** e.g. centuryOrdinalUr(8) → "8ویں". Digits stay Western here — the
 * render-time numeral toggle (fmtNum) converts them, keeping the toggle
 * reversible for stored/formatted text alike. */
export function centuryOrdinalUr(century: number): string {
  return `${century}ویں`;
}

export function formatCentury(century: number): string {
  return `${centuryOrdinal(century)} c.`;
}

/** e.g. formatCenturyUr(8) → "8ویں صدی". */
export function formatCenturyUr(century: number): string {
  return `${centuryOrdinalUr(century)} صدی`;
}
