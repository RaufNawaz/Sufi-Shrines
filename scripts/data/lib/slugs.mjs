/**
 * slugs.mjs — Shared slug generation for the data/prerender scripts.
 *
 * Mirrors src/lib/data/slugify.ts (slugify + buildStableSlug semantics) and
 * the buildShrines collision logic in src/lib/data/shrineModel.ts: SLUG_SUBS
 * for &@%+, strip non-word chars, collapse dashes; an explicit Slug column is
 * honored verbatim; otherwise name → +location → +saint disambiguation with a
 * numeric-suffix fallback. Guarded against drift from the app's TypeScript
 * implementation by src/lib/data/__tests__/slugsSync.test.ts.
 */

const SLUG_SUBS = { '&': 'and', '@': 'at', '%': 'percent', '+': 'plus' };

export function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[&@%+]/g, (c) => ` ${SLUG_SUBS[c] ?? c} `)
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

/**
 * One slug per raw sheet row, in row order. An explicit `Slug` column wins;
 * generated slugs disambiguate collisions with location, then saint, then a
 * numeric suffix — the same order the app uses, so script-side slugs always
 * match the app's URLs.
 */
export function buildSlugs(rows) {
  const seen = new Map();
  return rows.map((row, i) => {
    const explicit = String(row['Slug'] ?? '').trim();
    if (explicit) {
      seen.set(explicit, (seen.get(explicit) ?? 0) + 1);
      return explicit;
    }
    const name = String(row['Name'] ?? '').trim();
    const location = String(row['Location'] ?? '').trim();
    const saint = String(row['Sufi Saint'] ?? '').trim();
    const base = slugify(name) || `shrine-${i}`;
    const withLoc = base && location ? `${base}-${slugify(location)}` : base;
    const withSaint = withLoc && saint ? `${withLoc}-${slugify(saint)}` : withLoc;

    let chosen = base;
    for (const candidate of [base, withLoc, withSaint]) {
      if (candidate && !seen.has(candidate)) { chosen = candidate; break; }
    }
    if (seen.has(chosen)) {
      let n = 2;
      while (seen.has(`${chosen}-${n}`)) n++;
      chosen = `${chosen}-${n}`;
    }
    seen.set(chosen, (seen.get(chosen) ?? 0) + 1);
    return chosen;
  });
}
