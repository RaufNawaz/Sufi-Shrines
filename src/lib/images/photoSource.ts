import { commonsFilename } from './thumbnail';

/** Where a photograph came from, as far as its own address proves it. */
export interface PhotoSource {
  /** "Wikimedia Commons", or the host the file is served from. */
  label: string;
  /** The Commons file page (author and licence live there), or the file. */
  href: string;
}

/**
 * The source of a photograph that is not the project's own.
 *
 * 89 of the archive's 242 images come from elsewhere — 84 from Wikimedia
 * Commons, the rest from newspapers, Flickr and blogs — and on the page they
 * looked exactly like the project's field photographs (imagery council,
 * 17 October 2026). The sheet records no credit, so this says only what the
 * URL proves: for Commons, the file page that carries the author and licence;
 * otherwise the host. The project's own photographs (served from this site)
 * return null; how they should be credited is a question asked of Rauf.
 */
export function photoSource(url: string | null | undefined): PhotoSource | null {
  const raw = (url ?? '').trim();
  if (!raw || raw.startsWith('/')) return null;
  const file = commonsFilename(raw);
  if (file) {
    /* Some sheet URLs carry the name already encoded ("Chandragup%20I…"):
       decode first, or the link is to "Chandragup%2520I". */
    let name = file;
    try {
      name = decodeURIComponent(file);
    } catch {
      // A stray % in a name: use it as written.
    }
    return {
      label: 'Wikimedia Commons',
      href: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name.replace(/ /g, '_'))}`,
    };
  }
  let host: string;
  try {
    host = new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (host === 'raufnawaz.github.io') return null;
  return { label: host, href: raw };
}
