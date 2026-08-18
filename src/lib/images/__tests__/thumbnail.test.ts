// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { thumbnailUrl, commonsFilename, isResizable, IMAGE_WIDTH } from '../thumbnail';

describe('thumbnailUrl — Wikimedia', () => {
  it('rewrites an original upload.wikimedia URL through Special:FilePath', () => {
    expect(
      thumbnailUrl(
        'https://upload.wikimedia.org/wikipedia/commons/f/f2/Shrine_Of_Allo_Mahar_sharif.jpg',
        120,
      ),
    ).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Shrine_Of_Allo_Mahar_sharif.jpg?width=120',
    );
  });

  it('rewrites an existing thumbnail URL to the requested width', () => {
    expect(
      thumbnailUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Data_Durbar.jpg/500px-Data_Durbar.jpg',
        120,
      ),
    ).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Data_Durbar.jpg?width=120');
  });

  it('sets the width on a Special:FilePath URL that has none', () => {
    expect(
      thumbnailUrl('https://commons.wikimedia.org/wiki/Special:FilePath/Amb_sharif.jpg', 400),
    ).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Amb_sharif.jpg?width=400');
  });

  it('preserves percent-encoding rather than double-escaping it', () => {
    // Re-encoding "%20" would produce "%2520" and a 404.
    expect(
      thumbnailUrl(
        'https://commons.wikimedia.org/wiki/Special:FilePath/Chandragup%20I%20Mud%20Volcano.jpg',
        120,
      ),
    ).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Chandragup%20I%20Mud%20Volcano.jpg?width=120',
    );
  });

  it('handles wikipedia projects other than commons', () => {
    expect(
      thumbnailUrl('https://upload.wikimedia.org/wikipedia/en/a/ab/Example.jpg', 800),
    ).toBe('https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg?width=800');
  });
});

describe('thumbnailUrl — everything it must not touch', () => {
  it.each([
    'https://raufnawaz.github.io/Sufi-Shrines/photos/shah-jamal/shah-jamal-01.jpg',
    'https://i.tribune.com.pk/media/images/example.jpg',
    'https://live.staticflickr.com/65535/123456_abcdef_b.jpg',
    'https://blogger.googleusercontent.com/img/x/y.jpg',
    'https://images.squarespace-cdn.com/content/v1/abc/def.jpg',
  ])('passes %s through unchanged', (url) => {
    // Guessing an unknown host's resizing convention yields 404s; a large
    // image beats a broken one.
    expect(thumbnailUrl(url, 120)).toBe(url);
  });

  it('returns empty for empty input', () => {
    expect(thumbnailUrl('', 120)).toBe('');
    expect(thumbnailUrl(null, 120)).toBe('');
    expect(thumbnailUrl(undefined, 120)).toBe('');
  });

  it('never emits a nested thumbnail path', () => {
    const once = thumbnailUrl(
      'https://upload.wikimedia.org/wikipedia/commons/f/f2/A.jpg',
      IMAGE_WIDTH.marker,
    );
    const twice = thumbnailUrl(once, IMAGE_WIDTH.marker);
    expect(twice).toBe(once);
  });

  it('is idempotent at a different width — the last request wins', () => {
    const marker = thumbnailUrl(
      'https://upload.wikimedia.org/wikipedia/commons/f/f2/A.jpg',
      IMAGE_WIDTH.marker,
    );
    expect(thumbnailUrl(marker, IMAGE_WIDTH.hero)).toBe(
      `https://commons.wikimedia.org/wiki/Special:FilePath/A.jpg?width=${IMAGE_WIDTH.hero}`,
    );
  });
});

describe('commonsFilename / isResizable', () => {
  it('extracts the filename from every Wikimedia URL shape in the dataset', () => {
    expect(
      commonsFilename('https://upload.wikimedia.org/wikipedia/commons/6/66/Amb_sharif.jpg'),
    ).toBe('Amb_sharif.jpg');
    expect(
      commonsFilename(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Amb_sharif.jpg/120px-Amb_sharif.jpg',
      ),
    ).toBe('Amb_sharif.jpg');
    expect(
      commonsFilename('https://commons.wikimedia.org/wiki/Special:FilePath/Amb_sharif.jpg'),
    ).toBe('Amb_sharif.jpg');
  });

  it('reports non-Wikimedia hosts as not resizable', () => {
    expect(isResizable('https://raufnawaz.github.io/Sufi-Shrines/photos/a/b.jpg')).toBe(false);
    expect(isResizable('')).toBe(false);
  });
});

describe('coverage against the shipped dataset', () => {
  it('resizes every Wikimedia image and leaves the self-hosted ones alone', async () => {
    const snapshot = (await import('../../../data/shrines-fallback.json')) as unknown as {
      default: { rows: Array<Record<string, string>> };
    };
    const urls: string[] = [];
    for (const row of snapshot.default.rows) {
      for (let i = 1; i <= 16; i++) {
        const url = (row[`Image ${i}`] ?? '').trim();
        if (url) urls.push(url);
      }
    }

    const wikimedia = urls.filter((u) => u.includes('wikimedia.org'));
    const selfHosted = urls.filter((u) => u.includes('raufnawaz.github.io'));

    // Every Wikimedia URL is rewritten…
    expect(wikimedia.length).toBeGreaterThan(0);
    for (const url of wikimedia) {
      expect(isResizable(url), `not resizable: ${url}`).toBe(true);
      expect(thumbnailUrl(url, 120)).toContain('Special:FilePath');
    }
    // …and no self-hosted photo is touched.
    for (const url of selfHosted) {
      expect(thumbnailUrl(url, 120)).toBe(url);
    }
  });
});
