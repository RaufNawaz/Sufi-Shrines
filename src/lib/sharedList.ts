import { getSavedSlugs, toggleSaved } from './savedShrines';

/**
 * Shared ziyarat lists (`?list=slug,slug,…`): the saved list is deliberately
 * on-device (no account, nothing leaves the phone), so sharing travels as a
 * URL instead — the slugs ARE the payload. Receiving one never writes
 * anything by itself; the reader chooses to add it to their own list.
 */

/** Slugs are ASCII kebab-case by the stable-slug contract; anything else in
 * the param is someone else's hand-edited URL and is dropped, not guessed. */
const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

/** Hard cap well above the dataset size — a runaway URL is not a list. */
const MAX_SHARED = 500;

export function parseSharedList(search: string): string[] {
  const raw = new URLSearchParams(search).get('list');
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const slug = part.trim();
    if (SLUG_RE.test(slug)) seen.add(slug);
    if (seen.size >= MAX_SHARED) break;
  }
  return [...seen];
}

export function buildSharedListUrl(slugs: readonly string[], baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('list', slugs.join(','));
  return url.toString();
}

/** Merge shared slugs into the reader's own list, preserving what they
 * already saved and the shared order for newcomers. */
export function importSharedList(slugs: readonly string[]): void {
  const have = new Set(getSavedSlugs());
  for (const slug of slugs) {
    if (!have.has(slug)) toggleSaved(slug);
  }
}
