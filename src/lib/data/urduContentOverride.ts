import type { ShrineRow } from '../../types/shrine';
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

/** urdu-content.json is ~250 KB gzipped — all 168 Urdu articles. Loaded as
 * its own lazy chunk so it never sits in any page's critical-path JS: both
 * call sites (CSV parse, snapshot fallback) are already async, and every
 * setShrines happens strictly after the merge, so nothing can render
 * unmerged. Memoized: one import per session, shared by all callers. */
let contentPromise: Promise<Record<string, UrduContentEntry>> | null = null;

function loadUrduContent(): Promise<Record<string, UrduContentEntry>> {
  contentPromise ??= import('../../data/urdu-content.json').then(
    (m) => m.default as Record<string, UrduContentEntry>,
  );
  return contentPromise;
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
 * real entry point, bound to the shipped `urdu-content.json`. */
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

export async function applyUrduContentOverrides(rows: ShrineRow[]): Promise<ShrineRow[]> {
  return mergeUrduContent(rows, await loadUrduContent());
}
