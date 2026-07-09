// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mergeUrduContent, type UrduContentEntry } from '../urduContentOverride';
import type { ShrineRow } from '../../../types/shrine';

const content: Record<string, UrduContentEntry> = {
  'data-darbar': {
    descriptionUr: '## خلاصہ\n\nداتا دربار لاہور کا مشہور مزار ہے۔',
    sectionsUr: { history: 'گیارہویں صدی میں تعمیر ہوا۔' },
  },
};

const row: ShrineRow = {
  Name: 'Data Darbar',
  Latitude: '31.5564',
  Longitude: '74.3093',
  Description: 'A famous shrine in Lahore.',
  History: 'Built in the 11th century.',
};

describe('mergeUrduContent', () => {
  it('fills in Description Urdu / <Section> Urdu for a slug with an override', () => {
    const [merged] = mergeUrduContent([row], content);
    expect(merged['Description Urdu']).toBe('## خلاصہ\n\nداتا دربار لاہور کا مشہور مزار ہے۔');
    expect(merged['History Urdu']).toBe('گیارہویں صدی میں تعمیر ہوا۔');
    // English fields untouched
    expect(merged.Description).toBe(row.Description);
    expect(merged.History).toBe(row.History);
  });

  it('never overwrites a Description Urdu the sheet already supplies', () => {
    const withSheetUrdu: ShrineRow = { ...row, 'Description Urdu': 'شیٹ کا اپنا اردو متن' };
    const [merged] = mergeUrduContent([withSheetUrdu], content);
    expect(merged['Description Urdu']).toBe('شیٹ کا اپنا اردو متن');
  });

  it('is a no-op for a shrine with no override entry', () => {
    const other: ShrineRow = { Name: 'Some Other Shrine', Latitude: '1', Longitude: '1' };
    const [merged] = mergeUrduContent([other], content);
    expect(merged['Description Urdu']).toBeUndefined();
    expect(merged).toEqual(other);
  });

  it('does not mutate the input row', () => {
    const copy = { ...row };
    mergeUrduContent([row], content);
    expect(row).toEqual(copy);
  });

  it('matches slugs derived the same way buildShrines() would (case/punctuation-insensitive)', () => {
    const withSpacing: ShrineRow = { Name: '  Data   Darbar ', Latitude: '1', Longitude: '1' };
    const [merged] = mergeUrduContent([withSpacing], content);
    expect(merged['Description Urdu']).toContain('خلاصہ');
  });
});
