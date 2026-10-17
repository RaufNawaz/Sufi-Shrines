import type { Lang, ShrineRow } from '../../types/shrine';
import { buildStableSlug } from './slugify';
import { getFieldValue } from './fieldAliasing';

export interface UrduContentSections {
  history?: string;
  architecture?: string;
  rituals?: string;
  biography?: string;
  events?: string;
  visiting?: string;
  sources?: string;
}

export interface UrduContentEntry {
  descriptionUr?: string;
  sectionsUr?: UrduContentSections;
}

const SECTION_FIELD_MAP: Record<keyof UrduContentSections, string> = {
  history: 'History',
  architecture: 'Architecture',
  rituals: 'Rituals',
  biography: 'Saint Biography',
  events: 'Events & Urs',
  visiting: 'Visiting Info',
  sources: 'Sources',
};

export type UrduContentMap = Record<string, UrduContentEntry>;

/**
 * `urdu-content.json` is loaded on demand, not imported.
 *
 * It holds 168 complete Urdu article Descriptions — 1.0 MB of prose, which is
 * ~40% of the map route's JavaScript. A static import put every byte of it in
 * the same eager chunk as the data hook, so an English-only reader downloaded
 * and parsed the entire Urdu edition before the first tile appeared. Measured
 * before this change: `/` shipped 3506 KB of JS, of which the data-hook chunk
 * was 1000 KB, essentially all of it this file.
 *
 * Nothing reads these fields outside the Urdu view, so the load is gated on
 * the reader's language and the merge is a no-op until the content arrives.
 * `onUrduContentLoaded` exists for the switch-mid-session case: rows already
 * built without overrides have to be rebuilt once the payload lands.
 */
let CONTENT: UrduContentMap | null = null;
let inflight: Promise<UrduContentMap> | null = null;
const listeners = new Set<() => void>();

/**
 * Single articles, fetched one entry at a time (17 October 2026).
 *
 * A shrine page needs its own article and nothing else, and on an Urdu shared
 * link the whole payload — 262 KB gzipped — held the article back to 9.7 s
 * against 5.9 s in English (performance council). Each entry is its own chunk
 * now (`scripts/vite-urdu-articles.mjs`); the page asks for its slug, the
 * article merges into the same rows by the same rule, and the same listeners
 * fire, so `useShrineData`'s re-merge and fingerprint see an ordinary update.
 * `isUrduContentLoaded` keeps its meaning — *every* article — for the surfaces
 * that list many entries.
 */
const ARTICLES: UrduContentMap = {};
/** Slugs whose chunk has resolved — including the one entry with no article. */
const articleLoaded = new Set<string>();
const articleInflight = new Map<string, Promise<void>>();

/** True once this entry's Urdu article (or the whole payload) is in memory. */
export function isUrduArticleLoaded(slug: string): boolean {
  return CONTENT !== null || articleLoaded.has(slug);
}

/** Fetch one entry's Urdu article. Concurrent callers share one request. */
export function loadUrduArticle(slug: string): Promise<void> {
  if (isUrduArticleLoaded(slug)) return Promise.resolve();
  const pending = articleInflight.get(slug);
  if (pending) return pending;
  const request = import('virtual:urdu-article-loaders')
    .then(async ({ default: loaders }) => {
      const load = loaders[slug];
      const entry = load ? ((await load()).default as UrduContentEntry | null) : null;
      if (entry) ARTICLES[slug] = entry;
      articleLoaded.add(slug);
      listeners.forEach((listener) => listener());
    })
    .finally(() => {
      articleInflight.delete(slug);
    });
  articleInflight.set(slug, request);
  return request;
}

/** True once the Urdu article payload is in memory. */
export function isUrduContentLoaded(): boolean {
  return CONTENT !== null;
}

/**
 * Fetch the Urdu article payload, at most once per session.
 *
 * Safe to call repeatedly and from several places at once — concurrent
 * callers share one chunk request.
 */
export function loadUrduContent(): Promise<UrduContentMap> {
  if (CONTENT) return Promise.resolve(CONTENT);
  if (!inflight) {
    inflight = import('../../data/urdu-content.json')
      .then((module) => {
        CONTENT = module.default as UrduContentMap;
        // Notify before resolving, so a subscriber's rebuild is in place by
        // the time the awaiting caller continues.
        listeners.forEach((listener) => listener());
        return CONTENT;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Load the payload only when the reader is actually reading Urdu. */
export function ensureUrduContentForLang(lang: Lang): Promise<void> {
  // eslint-disable-next-line no-restricted-syntax -- Urdu-specific: this loads the Urdu content payload, a fact about that one file
  if (lang !== 'ur') return Promise.resolve();
  return loadUrduContent().then(() => undefined);
}

/** Subscribe to the arrival of the Urdu article payload. Returns an
 * unsubscribe function. Fires once, and only if the payload was not already
 * loaded when the caller subscribed — check `isUrduContentLoaded()` too. */
export function onUrduContentLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: forget the loaded payload so a case can assert the un-loaded
 * behaviour. */
export function resetUrduContentForTests(): void {
  CONTENT = null;
  inflight = null;
  for (const key of Object.keys(ARTICLES)) delete ARTICLES[key];
  articleLoaded.clear();
  articleInflight.clear();
}

/**
 * Fills in "<Field> Urdu" values on rows whose shrine slug has an in-repo
 * Urdu content override, without touching a field the sheet already
 * supplies — a real sheet-authored `*_ur` column always wins over this
 * stopgap. Keyed by the same stable slug buildShrines() derives from the
 * row's Name, so no data-build step is required; getUrduFieldValue()
 * resolves the merged fields with no component changes (see
 * URDU_IMPLEMENTATION_PLAN.md §3.3, "durable path").
 */
/** Exported for tests — takes the content map as a parameter so tests don't
 * need to mock a JSON import. `applyUrduContentOverrides` below is the
 * real entry point, bound to whatever `loadUrduContent()` has fetched. */
export function mergeUrduContent(
  rows: ShrineRow[],
  content: Record<string, UrduContentEntry>,
): ShrineRow[] {
  return rows.map((row) => {
    const slug = buildStableSlug(getFieldValue(row, 'Name'));
    const entry = slug ? content[slug] : undefined;
    if (!entry) return row;

    const next: ShrineRow = { ...row };

    if (entry.descriptionUr && !getFieldValue(next, 'Description Urdu')) {
      next['Description Urdu'] = entry.descriptionUr;
    }

    if (entry.sectionsUr) {
      for (const key of Object.keys(SECTION_FIELD_MAP) as (keyof UrduContentSections)[]) {
        const value = entry.sectionsUr[key];
        if (!value) continue;
        const urField = `${SECTION_FIELD_MAP[key]} Urdu`;
        if (!getFieldValue(next, urField)) next[urField] = value;
      }
    }

    return next;
  });
}

export function applyUrduContentOverrides(rows: ShrineRow[]): ShrineRow[] {
  // A no-op until `loadUrduContent()` has resolved. Deliberate: an English
  // reader never loads the payload, and the fields this would fill are only
  // ever read in the Urdu view.
  if (CONTENT) return mergeUrduContent(rows, CONTENT);
  return Object.keys(ARTICLES).length > 0 ? mergeUrduContent(rows, ARTICLES) : rows;
}
