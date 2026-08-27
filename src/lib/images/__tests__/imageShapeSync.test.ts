// @vitest-environment node
/**
 * Drift guard: the image-shape key exists twice and must stay one thing.
 *
 * `src/lib/images/imageShapeKey.ts` is what the app hashes URLs with at
 * runtime; `scripts/data/lib/imageShapeKey.mjs` is what wrote the keys in
 * `src/data/image-shapes.json`, because the build scripts run under plain node
 * and cannot load TypeScript. Same arrangement as `places.ts`/`places.mjs` and
 * `slugify.ts`/`slugs.mjs`, and the reason that arrangement holds is the guard
 * rather than the good intentions.
 *
 * The failure mode if they drift is quiet and total: every lookup misses, every
 * image loses its reserved box, and `/shrine` goes back to CLS 0.1115 with no
 * test red and nothing in the console. So this does not compare the source of
 * the two functions — it runs both over **every image URL in the shipped
 * snapshot** and then checks that the key each produces is actually the key the
 * committed map is filed under. Two hash functions that read identically can
 * still differ: `hash * 16777619` and `Math.imul(hash, 16777619)` agree on
 * short inputs and diverge once the product leaves a double's exact integer
 * range, which is to say on roughly every URL in this archive.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { imageShapeKey } from '../imageShapeKey';
import { imageShapeKey as mjsImageShapeKey } from '../../../../scripts/data/lib/imageShapeKey.mjs';
import { imageShape } from '../imageShape';
import shapeData from '../../../data/image-shapes.json';

const ROOT = join(__dirname, '..', '..', '..', '..');
const IMAGE_FIELDS = Array.from({ length: 16 }, (_, i) => `Image ${i + 1}`);

function snapshotImageUrls(): string[] {
  const rows = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'shrines-fallback.json'), 'utf8'))
    .rows as Record<string, unknown>[];
  const urls: string[] = [];
  for (const row of rows) {
    for (const field of IMAGE_FIELDS) {
      const value = row[field];
      if (typeof value === 'string' && value.trim().startsWith('http')) urls.push(value.trim());
    }
  }
  return [...new Set(urls)];
}

describe('image shape keys', () => {
  const urls = snapshotImageUrls();

  it('found the snapshot image URLs', () => {
    expect(urls.length).toBeGreaterThan(200);
  });

  it('the TypeScript and .mjs hashes agree on every URL in the snapshot', () => {
    const disagreements = urls.filter((url) => imageShapeKey(url) !== mjsImageShapeKey(url));
    expect(disagreements).toEqual([]);
  });

  it('produces keys of a fixed width, so a short hash cannot be mistaken for a truncation', () => {
    for (const url of urls) expect(imageShapeKey(url)).toHaveLength(7);
  });

  it('every URL in the snapshot is either measured or recorded as unmeasurable', () => {
    /* This is the invariant `build-image-shapes.mjs --check` enforces at the
       data gate, asserted again here so a snapshot rebuild that adds a
       photograph fails the unit suite too — the two run at different times and
       the cheap one should not be the only one watching. */
    const shapes = shapeData.shapes as Record<string, unknown>;
    const unmeasurable = shapeData.unmeasurable as Record<string, unknown>;
    const orphans = urls.filter((url) => {
      const key = imageShapeKey(url);
      return !(key in shapes) && !(key in unmeasurable);
    });
    expect(orphans).toEqual([]);
  });

  it('no two snapshot URLs collide onto one key', () => {
    /* 242 keys in a 36^7 space, so this should never fire — which is exactly
       why it is asserted rather than assumed. A collision would have one
       photograph silently reserving another's box, the bug this map exists to
       remove. */
    const byKey = new Map<string, string>();
    const collisions: string[][] = [];
    for (const url of urls) {
      const key = imageShapeKey(url);
      const owner = byKey.get(key);
      if (owner && owner !== url) collisions.push([key, owner, url]);
      byKey.set(key, url);
    }
    expect(collisions).toEqual([]);
  });
});

describe('imageShape', () => {
  it('returns the measured dimensions for a URL the archive points at', () => {
    const url = snapshotImageUrls().find(
      (candidate) => imageShapeKey(candidate) in shapeData.shapes,
    );
    expect(url).toBeTruthy();
    const shape = imageShape(url!);
    expect(shape).not.toBeNull();
    expect(shape!.width).toBeGreaterThan(0);
    expect(shape!.height).toBeGreaterThan(0);
  });

  it('misses rather than guesses for an unmeasured URL', () => {
    /* The behaviour the whole key design is for: a photograph the sheet has
       changed since the last measurement must get *no* box, not the previous
       picture's box. */
    expect(imageShape('https://example.invalid/a-photograph-nobody-measured.jpg')).toBeNull();
  });

  it('is null for null and empty input rather than throwing', () => {
    expect(imageShape(null)).toBeNull();
    expect(imageShape(undefined)).toBeNull();
    expect(imageShape('')).toBeNull();
  });
});
