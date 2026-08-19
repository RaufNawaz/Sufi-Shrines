// @vitest-environment node
/**
 * `info_level` and `support_level` are different axes — how complete the
 * archive's documentation is, versus how it was gathered (CLAUDE.md, Schema)
 * — and a shrine page renders one badge from each, side by side.
 *
 * In Urdu they collided: `infoLevelModerate` and `supportLevelSourceDocumented`
 * were both 'ماخذات سے دستاویز شدہ', so every Source-documented shrine showed
 * the same badge twice and read as a rendering fault. English was fine
 * ("Documented from sources" vs "Source-documented"), so nothing caught it.
 *
 * The two sets must stay mutually distinct in every language.
 */
import { describe, it, expect } from 'vitest';
import { UI_TEXT } from '../uiStrings';

const INFO_KEYS = ['infoLevelFull', 'infoLevelModerate', 'infoLevelLow'] as const;
const SUPPORT_KEYS = [
  'supportLevelFieldVerified',
  'supportLevelSourceDocumented',
  'supportLevelSourceSeeded',
  'supportLevelWebCompiled',
] as const;

describe.each(['en', 'ur'] as const)('badge labels are distinguishable (%s)', (lang) => {
  const text = UI_TEXT[lang];

  it('no info-level label repeats a support-level label', () => {
    const info: string[] = INFO_KEYS.map((k) => text[k]);
    const support: string[] = SUPPORT_KEYS.map((k) => text[k]);
    const collisions = info.filter((label) => support.includes(label));
    expect(
      collisions,
      'these render as two adjacent badges on a shrine page; identical text ' +
        'makes the pair look like a duplicate rather than two facts',
    ).toEqual([]);
  });

  it('labels within each set are distinct', () => {
    for (const keys of [INFO_KEYS, SUPPORT_KEYS] as ReadonlyArray<
      ReadonlyArray<keyof typeof text>
    >) {
      const labels: string[] = keys.map((k) => String(text[k]));
      expect(new Set(labels).size, `duplicate within ${labels.join(' / ')}`).toBe(labels.length);
    }
  });

  it('no label is empty', () => {
    for (const k of [...INFO_KEYS, ...SUPPORT_KEYS]) {
      expect(text[k]?.trim().length, `${k} is empty in ${lang}`).toBeGreaterThan(0);
    }
  });
});
