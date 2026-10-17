import { describe, it, expect } from 'vitest';
import { photoSource } from '../photoSource';

describe('photoSource', () => {
  it('returns nothing for the project’s own photographs', () => {
    expect(photoSource('/photos/data-darbar/01.jpg')).toBeNull();
    expect(photoSource('https://raufnawaz.github.io/Sufi-Shrines/photos/x/1.jpg')).toBeNull();
  });

  it('points a Commons image at its file page, where author and licence are', () => {
    const src = photoSource(
      'https://upload.wikimedia.org/wikipedia/commons/a/ab/Data_Darbar_Lahore.jpg',
    );
    expect(src?.label).toBe('Wikimedia Commons');
    expect(src?.href).toMatch(
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:Data_Darbar_Lahore\.jpg$/,
    );
  });

  it('does not encode an already-encoded Commons name twice', () => {
    expect(
      photoSource(
        'https://commons.wikimedia.org/wiki/Special:FilePath/Ghori_Temple%2C_Tharparkar.jpg',
      )?.href,
    ).toBe('https://commons.wikimedia.org/wiki/File:Ghori_Temple%2C_Tharparkar.jpg');
  });

  it('names the host of any other image', () => {
    expect(photoSource('https://i.dawn.com/large/2020/01/abc.jpg')).toEqual({
      label: 'i.dawn.com',
      href: 'https://i.dawn.com/large/2020/01/abc.jpg',
    });
  });
});
