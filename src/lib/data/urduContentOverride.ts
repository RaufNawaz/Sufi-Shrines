import type { ShrineRow } from '../../types/shrine';
import { buildStableSlug } from './slugify';
import { getFieldValue } from './fieldAliasing';
import urduContent from '../../data/urdu-content.json';

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

const CONTENT = urduContent as Record<string, UrduContentEntry>;

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

export function applyUrduContentOverrides(rows: ShrineRow[]): ShrineRow[] {
  return mergeUrduContent(rows, CONTENT);
}
