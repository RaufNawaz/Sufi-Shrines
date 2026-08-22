import { describe, it, expect } from 'vitest';
import type { Shrine } from '../../../types/shrine';
import {
  siteTypeKey,
  siteTypeDisplayLabel,
  SITE_TYPE_LABELS,
  groupBySiteType,
} from '../siteType';

function shrine(siteType: string, name = 'X'): Shrine {
  return { siteType, name, id: Math.random() } as Shrine;
}

describe('siteTypeKey', () => {
  it('maps the full sheet vocabulary, case-insensitively', () => {
    expect(siteTypeKey('Temple')).toBe('temple');
    expect(siteTypeKey('Dargah/Mazar')).toBe('dargah-mazar');
    expect(siteTypeKey('  gurdwara  ')).toBe('gurdwara');
    expect(siteTypeKey('Mausoleum/Memorial')).toBe('mausoleum-memorial');
    expect(siteTypeKey('KHANQAH')).toBe('khanqah');
    expect(siteTypeKey('Tomb-shrine')).toBe('tomb-shrine');
    expect(siteTypeKey('Cave shrine')).toBe('cave-shrine');
    expect(siteTypeKey('Natural sacred site')).toBe('natural-sacred-site');
    expect(siteTypeKey("Martyr's grave/shrine")).toBe('martyrs-grave');
    expect(siteTypeKey('Complex')).toBe('complex');
  });

  it('refuses to claim survey prose that merely contains vocabulary words (RULE 2)', () => {
    expect(
      siteTypeKey('Shrine complex (tomb, mosque, graveyard; originated as a mosque and seminary)'),
    ).toBeNull();
    expect(
      siteTypeKey('Tomb shrine (*mazār*/*darbār*) with an associated mosque in its vicinity'),
    ).toBeNull();
    expect(siteTypeKey('')).toBeNull();
  });

  it('has a bilingual label for every key', () => {
    for (const labels of Object.values(SITE_TYPE_LABELS)) {
      expect(labels.en.length).toBeGreaterThan(0);
      expect(labels.ur.length).toBeGreaterThan(0);
      // Urdu labels must actually be Urdu — no Latin leaks.
      expect(labels.ur).not.toMatch(/[A-Za-z]/);
    }
    expect(siteTypeDisplayLabel('Khanqah', 'ur')).toBe('خانقاہ');
    expect(siteTypeDisplayLabel('not a vocabulary value', 'en')).toBeNull();
  });
});

describe('groupBySiteType', () => {
  it('lands every shrine in exactly one group: vocabulary by size, prose verbatim, blank last', () => {
    const groups = groupBySiteType([
      shrine('Temple'),
      shrine('Temple'),
      shrine('Khanqah'),
      shrine('Some prose the survey wrote'),
      shrine(''),
    ]);

    expect(groups.reduce((n, g) => n + g.shrines.length, 0)).toBe(5);
    expect(groups[0]).toMatchObject({ key: 'temple', anchor: 'temple' });
    expect(groups[0]!.shrines).toHaveLength(2);
    expect(groups[1]).toMatchObject({ key: 'khanqah' });
    expect(groups[2]).toMatchObject({
      key: null,
      rawValue: 'Some prose the survey wrote',
      anchor: 'as-described-1',
    });
    expect(groups[3]).toMatchObject({ key: null, rawValue: '', anchor: 'not-recorded' });
  });

  it('breaks count ties by English label so the order is stable', () => {
    const groups = groupBySiteType([shrine('Khanqah'), shrine('Complex')]);
    expect(groups.map((g) => g.key)).toEqual(['complex', 'khanqah']);
  });

  it('omits the not-recorded group when nothing is blank', () => {
    const groups = groupBySiteType([shrine('Temple')]);
    expect(groups.some((g) => g.anchor === 'not-recorded')).toBe(false);
  });
});
