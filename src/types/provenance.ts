/** How a field value was produced. */
export type ProvenanceMethod = 'human' | 'ocr' | 'mt' | 'llm';

/**
 * Which content pipeline a Description originated from — orthogonal to
 * `method` (how the text was technically produced). See
 * docs/planning/DATA_QUALITY_PLAN.md §3.1.
 *
 * - tier1-ocr: from a shrine_entries/*.md Tier 1 file (OCR'd primary texts + field survey).
 * - tier2-compendium: from a shrine_entries/*.md Tier 2 file (Tazkirah Awliya-e-Pakistan compendium).
 * - ai-researched: written by the automated enrichment pipeline (tools/shrines_enrich.py +
 *   Claude-assisted web research), not tied to a primary source.
 * - sheet-original: pre-dates both tracked pipelines; origin not machine-recorded.
 * - unknown: could not be determined — an honest gap, not a guess.
 */
export type ContentTier =
  | 'tier1-ocr'
  | 'tier2-compendium'
  | 'ai-researched'
  | 'sheet-original'
  | 'unknown';

/** Provenance record for a single field on a single shrine. */
export interface FieldProvenance {
  /** Source reference — book title + page, URL, institution, or "maintainer". */
  source: string;
  /** Page number or section within the source (optional). */
  page?: string;
  /** How the value was produced. */
  method: ProvenanceMethod;
  /** Which content pipeline this came from — populated for the Description field. */
  contentTier?: ContentTier;
  /** Confidence 0–1; absent means not assessed. */
  confidence?: number;
  /** Reviewer name or initials; absent means the value has not been reviewed. */
  reviewedBy?: string;
  /** ISO date of review or original data entry (YYYY-MM-DD). */
  date?: string;
  /** Free-text note for caveats, corrections, or next steps. */
  notes?: string;
}

/** All provenance entries for one shrine. */
export interface ShrineProvenance {
  /** Shrine slug — matches the slug column in data/shrines.json. */
  shrineSlug: string;
  /** Field name (as it appears in the CSV row) → provenance for that field. */
  fields: Record<string, FieldProvenance>;
}

/** Root structure of data/provenance.json. */
export interface ProvenanceStore {
  schema_version: string;
  updated: string;
  shrines: ShrineProvenance[];
}
