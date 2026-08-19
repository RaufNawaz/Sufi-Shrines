// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { warmDarkStyle, warmColorString } from '../warmDarkStyle';
import type { MapStyle } from '../localizeStyle';

describe('warmColorString', () => {
  it('rotates the navy background to a warm hue and drops its saturation', () => {
    // streets-v2-dark's actual background colour.
    const out = warmColorString('hsl(216, 37%, 24%)');
    expect(out).toBe('hsl(26, 11%, 24%)');
  });

  it('keeps lightness untouched so the style keeps its own contrast order', () => {
    const light = warmColorString('hsl(216, 37%, 40%)');
    const dark = warmColorString('hsl(216, 37%, 12%)');
    expect(light).toContain('40%');
    expect(dark).toContain('12%');
  });

  it('leaves warm and neutral colours alone', () => {
    expect(warmColorString('hsl(0, 0%, 18%)')).toBe('hsl(0, 0%, 18%)');
    expect(warmColorString('hsl(40, 60%, 50%)')).toBe('hsl(40, 60%, 50%)');
  });

  it('leaves non-hsl notations alone', () => {
    expect(warmColorString('#c8890a')).toBe('#c8890a');
    expect(warmColorString('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });

  it('rewrites every colour in a string, not just the first', () => {
    const out = warmColorString('hsl(216, 37%, 24%) hsl(198, 53%, 22%)');
    expect(out).toBe('hsl(26, 11%, 24%) hsl(26, 16%, 22%)');
  });
});

describe('warmDarkStyle', () => {
  const style = {
    layers: [
      { id: 'Background', type: 'background', paint: { 'background-color': 'hsl(216, 37%, 24%)' } },
      { id: 'Crop', type: 'fill', paint: { 'fill-color': 'hsl(198, 55%, 22%)' } },
      { id: 'Water', type: 'fill', paint: { 'fill-color': 'hsl(217, 36%, 14%)' } },
      { id: 'River', type: 'line', paint: { 'line-color': 'hsl(217, 36%, 14%)' } },
      {
        id: 'Road',
        type: 'line',
        paint: {
          'line-color': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6,
            'hsl(216, 30%, 30%)',
            14,
            'hsl(0, 0%, 40%)',
          ],
        },
      },
      { id: 'Label', type: 'symbol', layout: { 'text-field': '{name}' } },
    ],
  } satisfies MapStyle;

  const out = warmDarkStyle(style);
  const byId = (id: string) => out.layers!.find((l) => l.id === id)!;

  it('warms the background and land fills', () => {
    expect(byId('Background').paint!['background-color']).toBe('hsl(26, 11%, 24%)');
    expect(byId('Crop').paint!['fill-color']).toBe('hsl(26, 17%, 22%)');
  });

  it('leaves water cool so rivers and lakes stay legible', () => {
    // Water shares hue 217 with the land; warming it would merge the two.
    expect(byId('Water').paint!['fill-color']).toBe('hsl(217, 36%, 14%)');
    expect(byId('River').paint!['line-color']).toBe('hsl(217, 36%, 14%)');
  });

  it('reaches colours nested inside expressions', () => {
    expect(byId('Road').paint!['line-color']).toEqual([
      'interpolate',
      ['linear'],
      ['zoom'],
      6,
      'hsl(26, 9%, 30%)',
      14,
      'hsl(0, 0%, 40%)',
    ]);
  });

  it('leaves layers with no paint untouched', () => {
    expect(out.layers!.find((l) => l.id === 'Label')).toEqual(style.layers![5]);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(style);
    warmDarkStyle(style);
    expect(JSON.stringify(style)).toBe(before);
  });

  it('survives a style with no layers', () => {
    expect(warmDarkStyle({}).layers).toEqual([]);
  });
});
