// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PAKISTAN_OUTLINE, projectToOutline } from '../outlineProjection';

/** The bounding box of one province's path, in outline units. */
function bbox(code: string) {
  const d = PAKISTAN_OUTLINE.provinces.find((p) => p.code === code)!.d;
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function codeOf(name: string): string {
  return PAKISTAN_OUTLINE.provinces.find((p) => p.name === name)!.code;
}

describe('the outline and the dots agree', () => {
  it('has the seven OCHA units', () => {
    expect(PAKISTAN_OUTLINE.provinces).toHaveLength(7);
  });

  it.each([
    ['Lahore (Data Darbar)', 31.5786, 74.3086, 'Punjab'],
    ['Karachi', 24.86, 67.01, 'Sindh'],
    ['Quetta', 30.18, 66.97, 'Balochistan'],
    ['Peshawar', 34.01, 71.58, 'Khyber Pakhtunkhwa'],
  ])('projects %s inside its province', (_label, lat, lng, province) => {
    const { x, y } = projectToOutline(lat, lng);
    const box = bbox(codeOf(province));
    expect(x).toBeGreaterThanOrEqual(box.minX);
    expect(x).toBeLessThanOrEqual(box.maxX);
    expect(y).toBeGreaterThanOrEqual(box.minY);
    expect(y).toBeLessThanOrEqual(box.maxY);
  });

  it('keeps every projected point inside the viewBox', () => {
    const [, , w, h] = PAKISTAN_OUTLINE.viewBox;
    for (const [lat, lng] of [
      [37.08, 74.5],
      [23.7, 68.2],
      [25.1, 61.7],
    ]) {
      const { x, y } = projectToOutline(lat!, lng!);
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(x).toBeLessThanOrEqual(w + 1);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(y).toBeLessThanOrEqual(h + 1);
    }
  });
});
