import { describe, it, expect } from 'vitest';
import { categoryKey, categoryDisplayLabel, CATEGORY_LABELS, CATEGORY_ORDER } from '../categoryKey';

describe('categoryKey', () => {
  it('maps all six sheet category values to their keys', () => {
    expect(categoryKey('Muslim Shrine')).toBe('muslim');
    expect(categoryKey('Hindu Temple')).toBe('hindu');
    expect(categoryKey('Sikh Gurdwara')).toBe('sikh');
    expect(categoryKey('Nanakpanthi / Udasi Darbar')).toBe('nanakpanthi');
    expect(categoryKey('Jain Temple')).toBe('jain');
    expect(categoryKey('Secular / Memorial')).toBe('secular');
  });

  it('never claims a Nanakpanthi site for the Hindu or Sikh key, even when the label mentions both', () => {
    expect(categoryKey('Nanakpanthi (Hindu–Sikh)')).toBe('nanakpanthi');
  });

  it('returns default for blank or unknown values', () => {
    expect(categoryKey('')).toBe('default');
    expect(categoryKey('Something else')).toBe('default');
  });

  it('has a label pair and a canonical-order slot for every non-default key', () => {
    for (const key of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[key].en).toBeTruthy();
      expect(CATEGORY_LABELS[key].ur).toBeTruthy();
      // Urdu labels must be real Urdu — no Latin letters (no-leak guard).
      expect(CATEGORY_LABELS[key].ur).not.toMatch(/[A-Za-z]/);
    }
    expect(new Set(CATEGORY_ORDER).size).toBe(6);
  });

  it('labels Nanakpanthi exactly "Nanakpanthi (Hindu–Sikh)" — implying neither tradition alone', () => {
    expect(categoryDisplayLabel('Nanakpanthi / Udasi Darbar', 'en')).toBe(
      'Nanakpanthi (Hindu–Sikh)',
    );
  });

  it('returns null for values outside the six categories so callers fall back to the raw value', () => {
    expect(categoryDisplayLabel('', 'en')).toBeNull();
    expect(categoryDisplayLabel('Zoo Category', 'ur')).toBeNull();
  });
});
