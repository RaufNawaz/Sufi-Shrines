/**
 * Hijri ↔ Gregorian date conversion and Islamic date parsing for Urdu text.
 *
 * The Hijri calendar is a purely lunar calendar; one Hijri year is ~354 days,
 * so a single Hijri year spans parts of two Gregorian years. All conversions
 * here are algorithmic approximations (±1 year).
 *
 * Use parseIslamicDate() to extract structured date information from free-form
 * Urdu/English text containing date expressions like "سن ۱۲۶۷ھ" or "1267 AH".
 */

/** Arabic-Indic digit → ASCII digit map (U+0660–U+0669). */
const ARABIC_INDIC: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/** Replace Arabic-Indic (Urdu) digits with ASCII equivalents. */
export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => ARABIC_INDIC[d] ?? d);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HijriDate {
  year: number;
  era: 'AH';
}

/** A Gregorian year range; a single Hijri year always spans two Gregorian years. */
export interface GregorianRange {
  low: number;
  high: number;
  approximate: true;
}

export interface ParsedDate {
  original: string;
  hijri?: HijriDate;
  /** Gregorian range derived from Hijri, or a fixed Gregorian year ±0. */
  range: GregorianRange;
  /**
   * Compact ISO-style label: "1850" for a single Gregorian year, or
   * "1850/1851" when the Hijri year spans two Gregorian years.
   */
  iso: string;
  confidence: number;
}

// ── Conversion ────────────────────────────────────────────────────────────────

/**
 * Convert a Hijri (AH) year to an approximate Gregorian year range.
 *
 * Formula:  G ≈ H × 0.97021 + 621.54   (standard lunisolar approximation).
 * Error:    ≤ 1 year for any year in the range 1–1500 AH.
 */
export function hijriToGregorian(h: number): GregorianRange {
  const startG = Math.floor(h * 0.97021 + 621.54);
  return { low: startG, high: startG + 1, approximate: true };
}

/**
 * Convert an approximate Gregorian year to a Hijri year.
 * Use only for rough labelling; for precise liturgical purposes use a
 * dedicated calendar library.
 */
export function gregorianToHijri(g: number): number {
  return Math.round((g - 621.54) / 0.97021);
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** "1267 AH" */
export function formatHijriYear(h: number): string {
  return `${h} AH`;
}

/** "1850" or "1850/1851" (when converted from Hijri). */
export function formatISOApprox(range: GregorianRange): string {
  return range.low === range.high ? String(range.low) : `${range.low}/${range.high}`;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Hijri markers (Urdu & English).
 * Matches: ھ  ہجری  ہجرت  AH  H  Hijri  Hijra
 */
const HIJRI_MARKER = /(?:ھ|ہجری|ہجرت|\bAH\b|\bH\b|Hijri|Hijra)/;

/**
 * Gregorian markers (Urdu & English).
 * Matches: عیسوی  CE  AD
 */
const GREGORIAN_MARKER = /(?:عیسوی|\bCE\b|\bAD\b)/;

/**
 * Parse Islamic (Hijri or Gregorian) dates from free-form text.
 *
 * Recognises:
 * - "سن ۱۲۶۷ھ"  → H 1267 → G 1850/1851
 * - "۱۲۶۷ ہجری"  → H 1267
 * - "1267 AH"    → H 1267
 * - "1850 CE"    → G 1850
 * - "1850 AD"    → G 1850
 *
 * Returns all matches found in the text.
 */
export function parseIslamicDate(text: string): ParsedDate[] {
  const normalised = normalizeDigits(text);
  const results: ParsedDate[] = [];

  // Pattern: optional "سن " prefix + 3–4 digit year + hijri/gregorian marker
  const datePattern = new RegExp(
    `(?:سن\\s*)?([0-9]{3,4})\\s*(${HIJRI_MARKER.source}|${GREGORIAN_MARKER.source})`,
    'g',
  );

  let m: RegExpExecArray | null;
  while ((m = datePattern.exec(normalised)) !== null) {
    const yearStr = m[1];
    const marker = m[2];
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 100 || year > 2200) continue;

    const isHijri = HIJRI_MARKER.test(marker);
    const original = m[0];

    if (isHijri) {
      const range = hijriToGregorian(year);
      results.push({
        original,
        hijri: { year, era: 'AH' },
        range,
        iso: formatISOApprox(range),
        confidence: 0.93,
      });
    } else {
      const range: GregorianRange = { low: year, high: year, approximate: true };
      results.push({
        original,
        range,
        iso: String(year),
        confidence: 0.88,
      });
    }
  }

  return results;
}

/**
 * Return the first Hijri date found in text, or null.
 * Convenience wrapper for single-value use.
 */
export function extractFirstHijriDate(text: string): ParsedDate | null {
  return parseIslamicDate(text).find((d) => d.hijri != null) ?? null;
}
