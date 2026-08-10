import { describe, it, expect } from 'vitest';
import { infoLevelKey } from '../infoLevel';
import { siteStatusKey } from '../siteStatus';
import { supportLevelKey } from '../supportLevel';
import { buildShrine } from '../shrineModel';
import { makeShrineRow } from '../../../test/utils';

describe('infoLevelKey', () => {
  it('normalizes the three sheet values case-insensitively', () => {
    expect(infoLevelKey('Full')).toBe('full');
    expect(infoLevelKey('moderate')).toBe('moderate');
    expect(infoLevelKey('LOW')).toBe('low');
  });

  it('returns null for blank or unknown values — nothing renders, never "undefined"', () => {
    expect(infoLevelKey('')).toBeNull();
    expect(infoLevelKey('  ')).toBeNull();
    expect(infoLevelKey('Medium')).toBeNull();
  });
});

describe('siteStatusKey', () => {
  it('normalizes the five sheet values', () => {
    expect(siteStatusKey('Active')).toBe('active');
    expect(siteStatusKey('Occasional')).toBe('occasional');
    expect(siteStatusKey('Heritage')).toBe('heritage');
    expect(siteStatusKey('Ruin')).toBe('ruin');
    expect(siteStatusKey('Destroyed')).toBe('destroyed');
  });

  it('returns null for blank or unknown values', () => {
    expect(siteStatusKey('')).toBeNull();
    expect(siteStatusKey('Closed')).toBeNull();
  });
});

describe('supportLevelKey', () => {
  it('normalizes the four sheet values', () => {
    expect(supportLevelKey('Field-verified')).toBe('field-verified');
    expect(supportLevelKey('Source-documented')).toBe('source-documented');
    expect(supportLevelKey('Source-seeded')).toBe('source-seeded');
    expect(supportLevelKey('Web-compiled')).toBe('web-compiled');
  });

  it('returns null for blank or unknown values — distinct axis from info_level', () => {
    expect(supportLevelKey('')).toBeNull();
    expect(supportLevelKey('Full')).toBeNull();
  });
});

describe('buildShrine with the new sheet columns', () => {
  it('prefers the new `category` column and falls back to legacy `Category`', () => {
    const withNew = buildShrine(
      makeShrineRow({ category: 'Jain Temple', Category: 'Hindu Temple' }),
      0,
    )!;
    expect(withNew.category).toBe('Jain Temple');

    const legacyOnly = buildShrine(makeShrineRow(), 1)!;
    expect(legacyOnly.category).toBe('Muslim Shrine');
  });

  it('builds a legacy row with all new fields blank without throwing', () => {
    const shrine = buildShrine(makeShrineRow(), 0)!;
    expect(shrine.infoLevel).toBe('');
    expect(shrine.status).toBe('');
    expect(shrine.supportLevel).toBe('');
    expect(shrine.statusNote).toBe('');
    expect(shrine.yearBuilt).toBe('');
    expect(infoLevelKey(shrine.infoLevel)).toBeNull();
    expect(siteStatusKey(shrine.status)).toBeNull();
    expect(supportLevelKey(shrine.supportLevel)).toBeNull();
  });

  it('reads support_level, status_note, and the split date fields', () => {
    const shrine = buildShrine(
      makeShrineRow({
        support_level: 'Field-verified',
        status_note: 'Active; deteriorating fabric',
        year_built: '1416 AH',
        year_built_precision: 'uncertain / referent disputed',
        year_built_note: '1416 AH is the survey’s answer to “founded”, not a construction date.',
        figure_born: '1341 AH',
        figure_died: '25 Rabī‘ al-Thānī',
        event_year: '2005',
        event_note: 'Auqaf takeover, per the survey.',
      }),
      0,
    )!;
    expect(shrine.supportLevel).toBe('Field-verified');
    expect(shrine.statusNote).toBe('Active; deteriorating fabric');
    expect(shrine.yearBuilt).toBe('1416 AH');
    expect(shrine.yearBuiltPrecision).toBe('uncertain / referent disputed');
    expect(shrine.yearBuiltNote).toContain('not a construction date');
    expect(shrine.figureBorn).toBe('1341 AH');
    expect(shrine.figureDied).toBe('25 Rabī‘ al-Thānī');
    expect(shrine.eventYear).toBe('2005');
    expect(shrine.eventNote).toBe('Auqaf takeover, per the survey.');
  });
});
