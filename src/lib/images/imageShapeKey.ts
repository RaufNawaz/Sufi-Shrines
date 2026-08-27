/**
 * imageShapeKey — the short, self-invalidating key an image's measured shape is
 * stored under.
 *
 * WHY A HASH AND NOT THE URL. `src/data/image-shapes.json` lets each photograph
 * reserve its own box before it decodes, which is what removes `/shrine`'s
 * CLS 0.1115 without cropping the 31 portrait images a single CSS
 * `aspect-ratio` would crop (measured — `pipeline/measure_image_shapes.py`).
 * That map has to be readable at first paint, so it is eager on every route
 * that renders a `ShrineImage`, which includes the map sidebar.
 *
 * Keyed by URL it is 32 KB, and this repository already paid for that mistake
 * once: `urduFallback.ts` pulled an 80 KB payload into a shared eager chunk and
 * every route shipped it, with the budgets raised twice to accommodate it
 * before anyone noticed (see the header of `scripts/check-bundle-budget.mjs`).
 * The URLs are the whole of the weight — they average about 90 characters and
 * the dimensions are four bytes — so they are hashed to seven, taking the map
 * to about 6 KB.
 *
 * WHY NOT KEY ON THE SLUG, which is short already: because a shape must stop
 * applying the moment the sheet points that field at a different photograph. A
 * slug key would go on reserving 1280×857 for whatever replaced it, and confidently
 * crop or letterbox the new picture. A hash of the URL simply misses, and a
 * miss is today's behaviour — the failure mode is the absence of an
 * improvement, never a wrong box.
 *
 * FNV-1a, 32-bit, base36. Not for cryptography and not for uniqueness at scale:
 * 242 keys in a 36^7 space, with the generator failing on any collision rather
 * than trusting the arithmetic. `scripts/data/lib/imageShapeKey.mjs` mirrors
 * this for the build scripts, which run under plain node, and
 * `src/lib/images/__tests__/imageShapeKeySync.test.ts` runs both over every URL
 * in the shipped snapshot — the same arrangement as `places.ts`/`places.mjs`.
 */
export function imageShapeKey(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    // `Math.imul` rather than `*`: the FNV prime overflows a double's exact
    // integer range, and `hash * 16777619` silently loses low bits — which is
    // the kind of difference that makes the mirror in .mjs disagree with this
    // one on some inputs and not others.
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}
