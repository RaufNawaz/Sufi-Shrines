/** How a field value was produced. */
export type ProvenanceMethod = 'human' | 'ocr' | 'mt' | 'llm';

/** Provenance record for a single field on a single shrine. */
export interface FieldProvenance {
  /** Source reference — book title + page, URL, institution, or "maintainer". */
  source: string;
  /** Page number or section within the source (optional). */
  page?: string;
  /** How the value was produced. */
  method: ProvenanceMethod;
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
