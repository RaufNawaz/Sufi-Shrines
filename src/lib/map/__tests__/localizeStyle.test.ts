// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { localizeStyle, referencesName, labelExpression } from '../localizeStyle';

describe('referencesName', () => {
  it.each([
    ['{name}', true],
    ['{name:en}', true],
    ['{name:latin}', true],
    ['{ref}', false],
    ['{housenumber}', false],
    ['{iata}', false],
  ])('template %s -> %s', (template, expected) => {
    expect(referencesName(template)).toBe(expected);
  });

  it('recognises a coalesce expression over name fields', () => {
    expect(referencesName(['coalesce', ['get', 'name:en'], ['get', 'name']])).toBe(true);
  });

  it('does not claim a non-name expression', () => {
    expect(referencesName(['coalesce', ['get', 'ref'], ['get', 'network']])).toBe(false);
  });

  it('recognises a legacy zoom-stop function', () => {
    expect(
      referencesName({ stops: [[8, ' '], [9, '{iata}'], [12, '{name:en}']] }),
    ).toBe(true);
  });

  it('is false for anything it does not understand', () => {
    // An unfamiliar style must degrade to current behaviour, not to a map
    // with wrong labels.
    expect(referencesName(undefined)).toBe(false);
    expect(referencesName(42)).toBe(false);
    expect(referencesName({ unexpected: true })).toBe(false);
  });
});

describe('localizeStyle', () => {
  const style = {
    layers: [
      { id: 'Public', type: 'symbol', layout: { 'text-field': '{name}' } },
      {
        id: 'River labels',
        type: 'symbol',
        layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']] },
      },
      { id: 'Highway junction', type: 'symbol', layout: { 'text-field': '{ref}' } },
      { id: 'Housenumber', type: 'symbol', layout: { 'text-field': '{housenumber}' } },
      { id: 'Water fill', type: 'fill', paint: { 'fill-color': '#00f' } },
    ],
  };

  it('rewrites every name label to the English preference chain', () => {
    const out = localizeStyle(style, 'en');
    expect(out.layers![0].layout!['text-field']).toEqual([
      'coalesce',
      ['get', 'name:en'],
      ['get', 'name:latin'],
      ['get', 'name'],
    ]);
    expect(out.layers![1].layout!['text-field']).toEqual(out.layers![0].layout!['text-field']);
  });

  it('puts name:ur first for the Urdu view', () => {
    const out = localizeStyle(style, 'ur');
    expect(out.layers![0].layout!['text-field']).toEqual([
      'coalesce',
      ['get', 'name:ur'],
      ['get', 'name'],
      ['get', 'name:latin'],
    ]);
  });

  it('always keeps a bare `name` in the chain so no label goes empty', () => {
    for (const lang of ['en', 'ur'] as const) {
      expect(labelExpression(lang)).toContainEqual(['get', 'name']);
    }
  });

  it('leaves road shields, house numbers and airport codes alone', () => {
    // Rewriting {ref} would replace the M-2 motorway shield with a word.
    const out = localizeStyle(style, 'en');
    expect(out.layers![2].layout!['text-field']).toBe('{ref}');
    expect(out.layers![3].layout!['text-field']).toBe('{housenumber}');
  });

  it('leaves non-symbol layers untouched', () => {
    const out = localizeStyle(style, 'en');
    expect(out.layers![4]).toEqual(style.layers[4]);
  });

  it('does not mutate the input style', () => {
    const before = JSON.stringify(style);
    localizeStyle(style, 'ur');
    expect(JSON.stringify(style)).toBe(before);
  });

  it('survives a style with no layers', () => {
    expect(localizeStyle({}, 'en').layers).toEqual([]);
  });
});
