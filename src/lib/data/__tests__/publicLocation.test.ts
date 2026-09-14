import { describe, it, expect } from 'vitest';
import type { Shrine } from '../../../types/shrine';
import { publicLocation, LOCATION_MAX_CHARS } from '../publicLocation';

const PARAGRAPH =
  'Shah Alam Market; the survey places the mazar near Darbar Ali Hajveri Ganj Bakhsh (Data Darbar). ' +
  'No city, district, tehsil or province is stated anywhere in the survey for the shrine itself.';

function shrine(location: string, region = ''): Shrine {
  return { slug: 's', name: 'S', location, region } as Shrine;
}

describe('publicLocation — what a list row shows the public for a recorded Location', () => {
  it('shows a short recorded value as recorded', () => {
    expect(publicLocation('Mint Stop, Lahore', shrine('Mint Stop, Lahore'), 'en')).toBe(
      'Mint Stop, Lahore',
    );
  });

  it('resolves a paragraph to the place vocabulary the entry already matches', () => {
    const s = shrine(`Lahore. ${PARAGRAPH}`);
    expect(s.location.length).toBeGreaterThan(LOCATION_MAX_CHARS);
    expect(publicLocation(s.location, s, 'en')).toBe('Lahore');
  });

  it('localizes the derived place name for an Urdu reader', () => {
    const s = shrine(`Lahore. ${PARAGRAPH}`);
    expect(publicLocation(s.location, s, 'ur')).toBe('لاہور');
  });

  it('says nothing when every resolved place is one the page already names', () => {
    const s = shrine(`Lahore. ${PARAGRAPH}`);
    expect(publicLocation(s.location, s, 'en', ['lahore'])).toBe('');
  });

  it('falls back to the recorded region when no place resolves, and to nothing when none is recorded', () => {
    // Malik Ahmad Ayaz's column names a market and another shrine and no city.
    expect(publicLocation(PARAGRAPH, shrine(PARAGRAPH, 'Punjab'), 'en')).toBe('Punjab');
    expect(publicLocation(PARAGRAPH, shrine(PARAGRAPH), 'en')).toBe('');
  });
});
