// @vitest-environment node
/**
 * The metric-matched fallback faces, held to their measurement (RULE 4).
 *
 * `/order/qadiriyya` measured CLS 0.2186 because Merriweather and Source Sans 3
 * are not the widths of the faces the page paints before they arrive. The fix is
 * eight `@font-face` rules in global.css carrying numbers that were *measured*
 * — `scripts/measure-font-metrics.mjs`, self-checked, snapshot in
 * `data/font-metrics.json`.
 *
 * Three ways that fix can rot silently, which is why it gets a test rather than
 * a comment:
 *
 * 1. **A number gets hand-edited.** These values look like the sort of thing you
 *    round. A `size-adjust` that is off by a percent re-introduces the shift it
 *    was added to remove, and nothing on screen says so. The stylesheet must
 *    agree with the committed measurement, digit for digit.
 * 2. **The stack gets reordered.** A fallback face wins only if nothing earlier
 *    in the list resolved. Move `Georgia` or `system-ui` ahead of the adjusted
 *    families — which is exactly what a tidy-up would do, since the bare names
 *    read as the "real" fallbacks — and all eight rules become dead code that
 *    still parses, still ships, and does nothing.
 * 3. **The `unicode-range` gets dropped or widened.** `--font-sans` is reachable
 *    from the Urdu view. A Latin fallback face without a range offers itself for
 *    Arabic script ahead of Noto Naskh Arabic, which is a rendering regression
 *    in the language this project has committed to treating as a first edition.
 *
 * This test reads files, not a browser: it cannot tell you the faces *match*,
 * only that what shipped is what was measured. Re-measuring is
 * `node scripts/measure-font-metrics.mjs --check`, which needs the fonts
 * installed and the network, and so is not something CI can do.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GLOBAL_CSS = readFileSync(join(__dirname, '../global.css'), 'utf8');
/* Comments stripped: this file's own rationale and global.css's both write
   `--token: value` and `@font-face` inside prose. */
const TOKENS = readFileSync(join(__dirname, '../tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

type Face = {
  fallbackFamily: string;
  webFont: string;
  token: string;
  local: string;
  provenance: string;
  sizeAdjust: string;
  ascentOverride: string;
  descentOverride: string;
  lineGapOverride: string;
};
const SNAPSHOT = JSON.parse(
  readFileSync(join(__dirname, '../../../data/font-metrics.json'), 'utf8'),
) as { unicodeRange: string; faces: Face[] };

/** The body of the `@font-face` rule declaring a given family, or null. */
function faceBlock(family: string): string | null {
  for (const [, body] of GLOBAL_CSS.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    if (
      new RegExp(`font-family:\\s*'${family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(body)
    ) {
      return body;
    }
  }
  return null;
}

/**
 * One descriptor's value from a face block, as a number.
 *
 * Compared numerically rather than as text on purpose. Prettier — which
 * `format:check` enforces on every commit — rewrites `108.0410%` to `108.041%`
 * and `0.0000%` to `0%`, so a string comparison against the snapshot fails on
 * formatting while the stylesheet is perfectly correct. The question this test
 * asks is whether the shipped value *is* the measured value, not how it is
 * spelled.
 */
function descriptor(body: string, name: string): number {
  const match = body.match(new RegExp(`${name}:\\s*([-\\d.]+)%`));
  if (!match) throw new Error(`${name} missing from the face block`);
  return Number.parseFloat(match[1]);
}

/** The unicode-range as a comparable list; prettier wraps it across lines. */
function ranges(body: string): string[] {
  const match = body.match(/unicode-range:\s*([^;]+);/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

/** A custom property's value, whitespace collapsed. */
function token(name: string): string {
  const match = TOKENS.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!match) throw new Error(`token not found in tokens.css: ${name}`);
  return match[1].replace(/\s+/g, ' ').trim();
}

describe('metric-matched font fallbacks', () => {
  it('has a measurement to check against', () => {
    expect(SNAPSHOT.faces.length).toBeGreaterThan(0);
  });

  describe.each(SNAPSHOT.faces)('$fallbackFamily', (face) => {
    it('is declared in global.css', () => {
      expect(faceBlock(face.fallbackFamily)).not.toBeNull();
    });

    it('ships the four descriptors exactly as measured', () => {
      const body = faceBlock(face.fallbackFamily) ?? '';
      // Value for value. A rounded override is a wrong override.
      expect(descriptor(body, 'size-adjust')).toBe(Number.parseFloat(face.sizeAdjust));
      expect(descriptor(body, 'ascent-override')).toBe(Number.parseFloat(face.ascentOverride));
      expect(descriptor(body, 'descent-override')).toBe(Number.parseFloat(face.descentOverride));
      expect(descriptor(body, 'line-gap-override')).toBe(Number.parseFloat(face.lineGapOverride));
    });

    it('sources the local face it was measured against', () => {
      expect(faceBlock(face.fallbackFamily) ?? '').toContain(`src: local('${face.local}');`);
    });

    it('is confined to Latin, so it never outranks Noto Naskh Arabic', () => {
      const body = faceBlock(face.fallbackFamily) ?? '';
      expect(ranges(body)).toEqual(SNAPSHOT.unicodeRange.split(',').map((r: string) => r.trim()));
      // The guard restated as the property it protects, not as a string match:
      // whatever the range is, it must not reach the Arabic block.
      for (const range of ranges(body)) {
        const [lo, hi] = range.replace(/^U\+/i, '').split('-');
        const start = parseInt(lo, 16);
        const end = hi ? parseInt(hi, 16) : start;
        expect(
          start > 0x06ff || end < 0x0600,
          `${range} overlaps the Arabic block U+0600–06FF`,
        ).toBe(true);
      }
    });

    it('is reachable: it precedes the bare family and the generic in its token', () => {
      const stack = token(face.token);
      const adjusted = stack.indexOf(`'${face.fallbackFamily}'`);
      expect(adjusted, `${face.fallbackFamily} is not in ${face.token} at all`).toBeGreaterThan(-1);

      // The bare name, if the token still lists it as the floor. Matched on a
      // word boundary so `Georgia` does not find `Merriweather Fallback Georgia`.
      const bare = stack.search(new RegExp(`(^|[\\s,])${face.local}([\\s,]|$)`));
      if (bare > -1) expect(bare).toBeGreaterThan(adjusted);

      for (const generic of ['system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace']) {
        const at = stack.search(new RegExp(`(^|[\\s,])${generic}([\\s,]|$)`));
        if (at > -1) {
          expect(at, `${generic} precedes ${face.fallbackFamily} in ${face.token}`).toBeGreaterThan(
            adjusted,
          );
        }
      }
    });

    it('comes after its webfont, which must still win when it loads', () => {
      const stack = token(face.token);
      expect(stack.indexOf(`'${face.webFont}'`)).toBeLessThan(
        stack.indexOf(`'${face.fallbackFamily}'`),
      );
    });
  });

  it('declares no fallback face that no token can reach', () => {
    const declared = [...GLOBAL_CSS.matchAll(/font-family:\s*'([^']*\sFallback\s[^']*)'/g)].map(
      (m) => m[1],
    );
    expect(declared.length).toBe(SNAPSHOT.faces.length);
    const stacks = [token('--font-sans'), token('--font-serif')].join(' ');
    for (const family of declared) expect(stacks).toContain(`'${family}'`);
  });

  /**
   * Not about the fallback faces, and here anyway.
   *
   * On 29 August 2026, while this block was being added, all three self-hosted
   * Noto Nastaliq Urdu faces in global.css were found carrying the *Latin*
   * unicode-range instead of their Arabic one. Nothing had committed it and no
   * command in the session reproduced it; the working tree was shared with
   * another agent at the time. What matters is the blast radius: a Nastaliq face
   * restricted to Latin is never selected for Arabic script, so the entire Urdu
   * edition — the half of this project whose standard is "as complete and
   * native-feeling as English" — silently falls back to whatever else is in the
   * stack. Nothing throws. No English route changes. The e2e no-leak guard, which
   * looks for Latin characters under `[dir='rtl']`, would not fire either,
   * because the *text* is still Urdu; only the typeface is wrong.
   *
   * RULE 4: a class of bug that has happened once gets an invariant, whether or
   * not the cause was ever identified.
   */
  describe('the self-hosted Nastaliq faces', () => {
    const NASTALIQ = [...GLOBAL_CSS.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)]
      .map((m) => m[1])
      .filter((body) => /font-family:\s*'Noto Nastaliq Urdu'/.test(body));

    it('are all three still declared', () => {
      expect(NASTALIQ).toHaveLength(3);
      for (const weight of [400, 600, 700]) {
        expect(NASTALIQ.some((b) => new RegExp(`font-weight:\\s*${weight}`).test(b))).toBe(true);
      }
    });

    it('each still cover Arabic script, which is the only reason they exist', () => {
      for (const body of NASTALIQ) {
        const coversArabic = ranges(body).some((range) => {
          const [lo, hi] = range.replace(/^U\+/i, '').split('-');
          const start = Number.parseInt(lo, 16);
          const end = hi ? Number.parseInt(hi, 16) : start;
          return start <= 0x0600 && end >= 0x06ff;
        });
        expect(coversArabic, `a Nastaliq face no longer covers U+0600–06FF`).toBe(true);
      }
    });
  });

  it('keeps a generic family at the end of each stack', () => {
    // Every adjusted face is `local()`-sourced, so a platform with none of them
    // installed reaches nothing at all without this floor.
    expect(token('--font-serif')).toMatch(/serif$/);
    expect(token('--font-sans')).toMatch(/sans-serif$/);
  });
});
