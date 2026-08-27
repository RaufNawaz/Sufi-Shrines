/**
 * imageShapeKey.mjs — mirror of src/lib/images/imageShapeKey.ts for the build
 * scripts, which run under plain node with no TypeScript loader.
 *
 * The rationale — why the map is keyed by a hash of the URL rather than by the
 * URL or by the slug — is documented once, in the TypeScript copy. Do not
 * restate it here. Edit both together and let
 * src/lib/images/__tests__/imageShapeKeySync.test.ts prove you did: it runs
 * both implementations over every image URL in the shipped snapshot, because
 * two hash functions that look identical can still differ (`*` where the other
 * has `Math.imul` agrees on short inputs and diverges on long ones).
 *
 * Same arrangement as scripts/data/lib/places.mjs and slugs.mjs.
 */
export function imageShapeKey(url) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}
