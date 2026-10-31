/**
 * The team view's strings are their own table, and only team builds load it.
 *
 * `uiStrings.team.ts` holds every interface string that only team-only code
 * renders (docs/TEAM_ACCESS_PLAN.md). The public build never imports it, so a
 * public reader cannot download a word of the review desk or the self-account
 * on /about. Four things keep that true and the team view working, and each
 * fails quietly:
 *
 * - **Parity.** The team table is reviewed bilingual copy like the public one:
 *   every key in both languages, a function in both or a string in both.
 * - **One home per key.** A key in both tables would be shipped to the public
 *   while looking moved, and the merge would hide which value wins.
 * - **Lookup.** `t()`/`tFn()` read a team key exactly like a public one once
 *   the table is registered, and an unregistered team key is an empty string
 *   with a warning rather than a crash.
 * - **Loading.** `main.tsx` reaches the table only through a dynamic import in
 *   the `__TEAM_CODE__` branch, and nothing in app source imports it statically:
 *   one static import folds it back into the public bundle and nothing fails.
 *   `scripts/check-public-bundle.mjs` checks the built output; this checks the
 *   source, so the cause is named before anything is built.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { UI_TEXT_EN, t, tFn } from '../uiStrings';
import { UI_TEXT_UR } from '../uiStrings.ur';
import { TEAM_TEXT, TEAM_TEXT_EN, TEAM_TEXT_UR } from '../uiStrings.team';

const SRC = join(__dirname, '..', '..', '..');

describe('the team string table', () => {
  it('has keys', () => {
    expect(Object.keys(TEAM_TEXT_EN).length).toBeGreaterThan(100);
  });

  it('has every key in both languages', () => {
    expect(Object.keys(TEAM_TEXT_UR).sort()).toEqual(Object.keys(TEAM_TEXT_EN).sort());
  });

  it('has no empty value in either language', () => {
    const empty: string[] = [];
    for (const [lang, table] of Object.entries(TEAM_TEXT)) {
      for (const [key, value] of Object.entries(table)) {
        if (typeof value === 'string' && value.trim() === '') empty.push(`${lang}.${key}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('is what registerTeamStrings is handed, one table per language', () => {
    expect(TEAM_TEXT.en).toBe(TEAM_TEXT_EN);
    expect(TEAM_TEXT.ur).toBe(TEAM_TEXT_UR);
  });

  it('shares no key with the public tables', () => {
    const shared = Object.keys(TEAM_TEXT_EN).filter(
      (key) => key in UI_TEXT_EN || key in UI_TEXT_UR,
    );
    expect(
      shared,
      'a key in both tables still ships to every public reader, and which value wins is ' +
        'decided by merge order rather than by anyone',
    ).toEqual([]);
  });
});

describe('t() and tFn() read team keys', () => {
  /* The test setup registers the team table, as main.tsx does in the app. */
  it('returns the team string in each language', () => {
    expect(t('en', 'reviewTitle')).toBe(TEAM_TEXT_EN.reviewTitle);
    expect(t('ur', 'reviewTitle')).toBe(TEAM_TEXT_UR.reviewTitle);
    expect(t('en', 'reviewTitle')).not.toBe('');
  });

  it('interpolates a team function the same way', () => {
    expect(tFn('en', 'graphFigureFilterCount', 3, 9)).toBe(
      TEAM_TEXT_EN.graphFigureFilterCount(3, 9),
    );
    expect(tFn('ur', 'graphLineageOnlyKinOf', 'بیٹا', 'نام')).toBe(
      TEAM_TEXT_UR.graphLineageOnlyKinOf('بیٹا', 'نام'),
    );
  });

  it('still reads public keys from the public table', () => {
    expect(t('en', 'siteTitle')).toBe(UI_TEXT_EN.siteTitle);
    expect(t('ur', 'siteTitle')).toBe(UI_TEXT_UR.siteTitle);
  });
});

describe('a team key before the team table is registered', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  /* A fresh copy of the module, which the setup has not registered anything in. */
  async function freshModule() {
    vi.resetModules();
    return import('../uiStrings');
  }

  it('is an empty string and a dev warning, not a crash', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fresh = await freshModule();
    expect(fresh.hasTeamStrings()).toBe(false);
    expect(fresh.t('en', 'reviewTitle')).toBe('');
    expect(fresh.tFn('en', 'graphFigureFilterCount', 1, 2)).toBe('');
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain('reviewTitle');
    // The public table is unaffected.
    expect(fresh.t('en', 'siteTitle')).toBe(UI_TEXT_EN.siteTitle);
  });

  it('becomes the team string once registered, and Urdu follows its table', async () => {
    const fresh = await freshModule();
    fresh.registerTeamStrings(TEAM_TEXT);
    expect(fresh.hasTeamStrings()).toBe(true);
    expect(fresh.t('en', 'reviewTitle')).toBe(TEAM_TEXT_EN.reviewTitle);
    /* The public Urdu table has not loaded in this copy, so Urdu falls back to
       English — the team string, not an empty one. */
    expect(fresh.hasUiStrings('ur')).toBe(false);
    expect(fresh.t('ur', 'reviewTitle')).toBe(TEAM_TEXT_EN.reviewTitle);
    /* And when the Urdu table arrives after the team table, the two are merged. */
    await fresh.loadUiStrings('ur');
    expect(fresh.t('ur', 'reviewTitle')).toBe(TEAM_TEXT_UR.reviewTitle);
    expect(fresh.t('ur', 'siteTitle')).toBe(UI_TEXT_UR.siteTitle);
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('the team string table stays out of the public bundle', () => {
  /** App source: not tests, not the test setup (neither reaches a bundle). */
  const appFiles = walk(SRC).filter((f) => {
    const rel = relative(SRC, f).split('\\').join('/');
    return (
      !rel.includes('__tests__') &&
      !/\.test\.tsx?$/.test(rel) &&
      !rel.startsWith('test/') &&
      rel !== 'lib/i18n/uiStrings.team.ts'
    );
  });

  it('has app source to check', () => {
    expect(appFiles.length).toBeGreaterThan(80);
  });

  it('is never imported statically by app source (types only)', () => {
    const offenders: string[] = [];
    for (const file of appFiles) {
      const body = readFileSync(file, 'utf8');
      for (const match of body.matchAll(
        /^\s*(import|export)\s[^\n]*['"][^'"]*uiStrings\.team['"]/gm,
      )) {
        if (/^\s*import\s+type\s/.test(match[0])) continue;
        offenders.push(`${relative(SRC, file)}: ${match[0].trim()}`);
      }
    }
    expect(
      offenders,
      'a static import puts every team string into the public bundle. Load it the way ' +
        'main.tsx does: a dynamic import behind __TEAM_CODE__, handed to registerTeamStrings.',
    ).toEqual([]);
  });

  it('is loaded by main.tsx only behind __TEAM_CODE__, and awaited before the first render', () => {
    const main = readFileSync(join(SRC, 'main.tsx'), 'utf8');
    const imports = [...main.matchAll(/import\(\s*['"]\.\/lib\/i18n\/uiStrings\.team['"]\s*\)/g)];
    expect(imports, 'main.tsx should import the team table exactly once').toHaveLength(1);
    expect(
      /__TEAM_CODE__\s*\?\s*import\(\s*['"]\.\/lib\/i18n\/uiStrings\.team['"]\s*\)/.test(main),
      'the import must be the true branch of `__TEAM_CODE__ ? … : …`, so the public build ' +
        'drops it as dead code and never emits the chunk',
    ).toBe(true);
    expect(main).toContain('registerTeamStrings(');
    expect(
      /Promise\.all\(\[\s*loadUiStrings\([^)]*\)\s*,\s*teamStrings\s*\]\)\s*\.then\([\s\S]{0,400}createRoot/.test(
        main,
      ),
      'the first render does not wait for the team strings, so a team page can paint its ' +
        'headings as empty strings',
    ).toBe(true);
  });
});
