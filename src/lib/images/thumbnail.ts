/**
 * Requesting images at the size they are actually displayed.
 *
 * ## The measurement that prompted this
 *
 * A cold load of the map transferred **41 MB across 141 requests**. The
 * largest single resource was a 12.6 MB Wikimedia photograph — fetched at
 * full resolution to be painted as a **30-pixel map marker**. Seven more
 * multi-megabyte originals followed it. The JavaScript bundle, the obvious
 * suspect, was under 250 KB over the wire. Images were ~99% of the payload.
 *
 * ## Why Special:FilePath and not a hand-built thumb URL
 *
 * Wikimedia thumbnails live at predictable-looking addresses
 * (`/thumb/f/f2/Name.jpg/320px-Name.jpg`), and constructing them directly is
 * the obvious move. Measured, it does not work: requesting a width that has
 * not already been rendered returns **HTTP 400**, not a freshly generated
 * image. Of the widths tried against one real file — 96, 120, 320, 400, 640,
 * 800 — only 120 succeeded, and only because a prior request had caused that
 * rendition to exist.
 *
 * `Special:FilePath/Name.jpg?width=N` is the supported entry point: it
 * triggers rendition generation and redirects to whichever bucket the file
 * actually has (a request for 320 landed on 330px). It costs one redirect
 * hop, which browsers cache, and it always resolves. So every Wikimedia URL
 * — original, existing thumbnail, or FilePath — is normalised through it.
 *
 * ## What this cannot fix
 *
 * The 134 self-hosted field photos under `public/photos/` (~51 MB, ~330 KB
 * each) have exactly one rendition on disk; shrinking them needs a build-time
 * image step, not a URL rewrite. Other hosts (news sites, Flickr, Blogger)
 * are passed through unchanged: guessing an unknown CDN's resizing
 * convention produces 404s, and a broken image is worse than a large one.
 *
 * Anything unrecognised returns unchanged. That is the invariant — this
 * function never emits a URL it is not confident resolves.
 */

/** Display widths, named for the surface rather than the number. */
export const IMAGE_WIDTH = {
  /** 30px map marker, sized for a 3x display. */
  marker: 120,
  /** Sidebar preview and related-shrine cards. */
  preview: 400,
  /** Gallery grid tile. */
  gallery: 800,
  /** Article hero. */
  hero: 1280,
} as const;

const COMMONS_FILEPATH = /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/i;
const UPLOAD_THUMB =
  /^https?:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/thumb\/[^/]+\/[^/]+\/([^/]+)\/[^/?#]+$/i;
const UPLOAD_ORIGINAL =
  /^https?:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)$/i;

/** The Commons filename a Wikimedia URL refers to, or '' for other hosts. */
export function commonsFilename(url: string | null | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  for (const pattern of [COMMONS_FILEPATH, UPLOAD_THUMB, UPLOAD_ORIGINAL]) {
    const match = raw.match(pattern);
    if (match) return match[1];
  }
  return '';
}

/**
 * A URL for `url` rendered at about `width` pixels wide, or `url` unchanged
 * when the host has no known rendition API.
 */
export function thumbnailUrl(url: string | null | undefined, width: number): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';

  const filename = commonsFilename(raw);
  if (!filename) return raw;

  // The filename is already percent-encoded in the source URL; re-encoding
  // would double-escape it.
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=${width}`;
}

/** True when `url` is one this module can resize. Useful for reporting
 *  coverage; call sites should just call `thumbnailUrl` unconditionally. */
export function isResizable(url: string | null | undefined): boolean {
  return commonsFilename(url) !== '';
}
