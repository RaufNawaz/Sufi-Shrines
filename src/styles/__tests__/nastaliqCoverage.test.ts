// @vitest-environment node
/**
 * The Urdu reading face must be able to draw the Urdu.
 *
 * `--font-urdu` is `'Mehr Nastaliq Web', 'Noto Nastaliq Urdu', 'Source Sans 3',
 * 'Noto Naskh Arabic', serif`. Mehr is the reading face (see the @font-face
 * block in global.css for the metrics that chose it); Noto Nastaliq sits behind
 * it because Mehr maps 108 codepoints and Noto maps 333.
 *
 * Font fallback is **per glyph**, which is exactly the right behaviour for a
 * Latin URL inside Urdu prose and exactly the wrong one inside an Urdu word:
 * Nastaliq is a connected script, so a single character drawn from a different
 * face breaks the join mid-word — the ligature simply does not form, and the
 * letters sit apart in a line of text where nothing else does. It is not a
 * missing-glyph box; it is subtler than that and therefore easier to ship.
 *
 * Three characters in the archive are in that position today, and all three are
 * in quoted verse — the most typographically exposed content on any page:
 *
 *   U+0768  ݨ  Bulleh Shah's Punjabi:  بُلھیا! کی جاݨاں میں کوݨ
 *   U+066D  ٭  a Persian couplet's hemistich separator
 *   U+0680  ڀ  Shah Abdul Latif's Sindhi:  جي تُو بيت ڀانئين
 *
 * They are accepted, listed here, and recorded in
 * public/fonts/MehrNastaliqWeb-LICENSE.txt. What this file is for is the
 * fourth: an editor adds a Saraiki or Sindhi or Pashto name to a shrine entry,
 * and nothing anywhere would say that one letter of it now renders in a
 * different hand.
 *
 * The cmaps come from pipeline/nastaliq_coverage.json rather than from the
 * fonts, because vitest cannot read WOFF2 (brotli plus the format's own table
 * transform, and the repo carries no font parser). The manifest records each
 * font's SHA-256, and the first test here re-hashes the shipped files — so
 * swapping a face without regenerating fails loudly instead of silently
 * validating the corpus against the wrong font.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(__dirname, '..', '..', '..');
const MANIFEST = join(REPO, 'pipeline', 'nastaliq_coverage.json');

interface FontRecord {
  file: string;
  bytes: number;
  sha256: string;
  codepoints: string[];
}
interface Manifest {
  fonts: Record<string, FontRecord>;
  servedByFallback: { codepoint: string; char: string; name: string }[];
}

const manifest: Manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

const READING_FACE = 'Mehr Nastaliq Web';
const FALLBACK_FACE = 'Noto Nastaliq Urdu';

/** Accepted gaps in the reading face, with the reason each is tolerated. */
const KNOWN_FALLBACK_CHARS = [
  { cp: 0x0768, char: 'ݨ', why: "Punjabi/Saraiki noon+tah — Bulleh Shah's kafi" },
  { cp: 0x066d, char: '٭', why: 'hemistich separator in a Persian couplet' },
  { cp: 0x0680, char: 'ڀ', why: "Sindhi beheh — Shah Abdul Latif's bait" },
];

/** The shipped Urdu that a reader can actually be shown. */
const CORPUS_FILES = [
  'src/data/urdu-seed.json',
  'src/data/urdu-content.json',
  'src/data/shrines-fallback.json',
  'src/lib/i18n/uiStrings.ts',
];

/** Arabic-script ranges plus the bidi/joining controls that travel with them. */
function isArabicScript(cp: number): boolean {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

function corpusCodepoints(): Map<number, number> {
  const used = new Map<number, number>();
  for (const rel of CORPUS_FILES) {
    const path = join(REPO, rel);
    if (!existsSync(path)) continue;
    for (const ch of readFileSync(path, 'utf8')) {
      const cp = ch.codePointAt(0)!;
      if (isArabicScript(cp)) used.set(cp, (used.get(cp) ?? 0) + 1);
    }
  }
  return used;
}

const hex = (cp: number) => cp.toString(16).toUpperCase().padStart(4, '0');

describe('Nastaliq coverage', () => {
  it('the manifest describes the fonts that are actually shipped', () => {
    for (const [family, record] of Object.entries(manifest.fonts)) {
      const bytes = readFileSync(join(REPO, record.file));
      const sha = createHash('sha256').update(bytes).digest('hex');
      expect(
        sha,
        `${family} (${record.file}) has changed since the coverage manifest was built. ` +
          'Re-run: python3 pipeline/build_nastaliq_coverage.py',
      ).toBe(record.sha256);
      expect(bytes.length).toBe(record.bytes);
    }
  });

  it('both Nastaliq faces in --font-urdu are recorded', () => {
    expect(Object.keys(manifest.fonts).sort()).toEqual([FALLBACK_FACE, READING_FACE].sort());
  });

  it('every Arabic-script character in the corpus is covered by one of the two faces', () => {
    const reading = new Set(manifest.fonts[READING_FACE].codepoints);
    const fallback = new Set(manifest.fonts[FALLBACK_FACE].codepoints);
    const uncovered = [...corpusCodepoints().keys()].filter(
      (cp) => !reading.has(hex(cp)) && !fallback.has(hex(cp)),
    );
    expect(
      uncovered.map((cp) => `U+${hex(cp)} ${String.fromCodePoint(cp)}`),
      'these characters would render in Noto Naskh or a system serif, not in Nastaliq',
    ).toEqual([]);
  });

  it('no character beyond the three known ones falls back mid-word', () => {
    /* The real guard. A character the reading face lacks still draws — in the
       other Nastaliq — so nothing looks broken enough to notice, and the join
       to its neighbours is silently lost. */
    const reading = new Set(manifest.fonts[READING_FACE].codepoints);
    const known = new Set(KNOWN_FALLBACK_CHARS.map((k) => k.cp));
    const surprises = [...corpusCodepoints().entries()]
      .filter(([cp]) => !reading.has(hex(cp)) && !known.has(cp))
      .map(([cp, n]) => `U+${hex(cp)} ${String.fromCodePoint(cp)} (${n}x)`);
    expect(
      surprises,
      `${READING_FACE} cannot draw these, so each one breaks the Nastaliq join in the ` +
        'middle of a word. Either accept it in KNOWN_FALLBACK_CHARS here and in ' +
        'public/fonts/MehrNastaliqWeb-LICENSE.txt, or change the text.',
    ).toEqual([]);
  });

  it('the three accepted gaps are still real gaps', () => {
    /* The other direction, so the list cannot rot into folklore: if a future
       face covers one of these, the exception should go rather than sit here
       claiming a problem that no longer exists. */
    const reading = new Set(manifest.fonts[READING_FACE].codepoints);
    const used = corpusCodepoints();
    for (const { cp, char, why } of KNOWN_FALLBACK_CHARS) {
      expect(reading.has(hex(cp)), `${READING_FACE} now covers ${char} — drop the exception`).toBe(
        false,
      );
      expect(used.has(cp), `${char} (${why}) is no longer in the corpus — drop the exception`).toBe(
        true,
      );
    }
  });
});
