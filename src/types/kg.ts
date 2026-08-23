export type KGEntityType = 'saint' | 'order' | 'place' | 'event' | 'source';

export type KGRelationType =
  | 'buried_at' // saint → shrine slug
  | 'disciple_of' // saint → saint (teacher)
  | 'successor_of' // saint → saint (predecessor)
  | 'belongs_to_order' // saint → order
  | 'located_in' // shrine slug → place
  | 'commemorated_by' // saint → event
  | 'attested_in'; // entity/relation id → source

export interface KGEntity {
  id: string; // "{type}:{slug}", e.g. "saint:lal-shahbaz-qalandar"
  type: KGEntityType;
  slug: string;
  name: string; // canonical English name
  nameUr?: string;
  altNames?: string[];
  wikidataQid?: string;
  description?: string;
}

export interface KGSaint extends KGEntity {
  type: 'saint';
  born?: string;
  died?: string;
  era?: string;
  shrines: string[]; // shrine slugs where this saint is commemorated
  /** True for a figure who exists only as a link in someone else's lineage —
   * a teacher named in the prose with no shrine in this archive. They are real
   * graph nodes (without them a lineage stops at the first person who has no
   * shrine here) but they are NOT archive entries, so they must be excluded
   * from any count or list that claims to describe the archive's coverage. */
  lineageOnly?: boolean;
  /** False on a figure introduced by machine extraction and not yet read. */
  reviewed?: boolean;
  /** How precise the born/died values are, as the source expresses it:
   * 'exact-date' | 'year' | 'circa' | 'range' | 'century' | 'disputed' |
   * 'unrecorded'. Kept as a string rather than a union because it comes from
   * data and a new value must not break the build. */
  datePrecision?: string;
  /** Honorifics the sources give, verbatim — 'Sultan al-Aulia', 'Data Ganj
   * Bakhsh', 'Khatib-ul-Islam', 'Shair-e-Mashriq'. */
  titles?: string[];
  /** Dates the sources refuse to agree on. Present rather than resolved: the
   * archive reports contradictions instead of picking a winner (RULE 2). The
   * widest here is a 68-year spread on one death year. */
  disputedDates?: {
    field: string;
    values: string[];
    spreadYears?: number;
    quotes?: string[];
  }[];
  /** False when any born/died/title/altName on this figure came from machine
   * extraction and has not been read. Absent means everything came from the
   * sheet. */
  biographyReviewed?: boolean;
  biographySource?: string;
  /** The dataset's `figure_type`, verbatim. NOT always a Sufi saint: the
   * archive covers six traditions, so this is 'Deity', 'Sikh Guru', 'Sant',
   * 'Historical person', 'Collective' … as often as 'Sufi saint', and two rows
   * answer with a hedged sentence instead of a category. Kept as written
   * (RULE 2) — use figureGroup() in src/lib/data/figureType.ts to bucket it for
   * display, and never assume this entity is a Sufi saint because its KG type
   * is 'saint'. */
  figureType?: string;
}

export interface KGOrder extends KGEntity {
  type: 'order';
  arabicName?: string;
  /** `description` in Urdu, from data/kg-seeds.json. */
  descriptionUr?: string;
  founder?: string; // saint slug
  founded?: string;
  parentOrder?: string; // order slug (for sub-orders)
}

export interface KGPlace extends KGEntity {
  type: 'place';
  city?: string;
  district?: string;
  province?: string;
  country?: string;
}

export interface KGEvent extends KGEntity {
  type: 'event';
  eventType: 'urs' | 'mela' | 'pilgrimage' | 'other';
  shrineSlug?: string;
  saintSlug?: string;
  date?: string;
  frequency?: 'annual' | 'monthly' | 'biannual' | 'one-time';
}

export interface KGSource extends KGEntity {
  type: 'source';
  sourceType: 'book' | 'article' | 'website' | 'oral' | 'inscription';
  author?: string;
  year?: string;
  publisher?: string;
}

export interface KGRelation {
  id: string; // stable ID, e.g. "buried_at:saint:foo:shrine-bar"
  type: KGRelationType;
  subject: string; // entity id or shrine slug (for shrine-as-subject relations)
  object: string; // entity id or shrine slug
  confidence: number; // 0–1
  /** How this edge came to exist. `machine-extracted` means an agent read it out
   * of the archive's own prose and scripts/data/verify-kg-proposals.mjs
   * confirmed the `quote` is verbatim in `source` — so it is provably not
   * fabricated, but nobody has read it. Those carry `reviewed: false`. */
  method: 'human' | 'rule' | 'ml' | 'machine-extracted';
  /** False on anything no human has signed off (RULE 2). Absent means the edge
   * is derived by rule from the sheet and needs no sign-off. */
  reviewed?: boolean;
  source?: string; // citation, e.g. a shrine_entries/*.md file
  quote?: string; // verbatim supporting text from source
  notes?: string;
  /** belongs_to_order only: the sub-order as the source names it
   * ("Naqshbandi-Mujaddidi", "Sarwari Qadiri"). The parent-order edge loses
   * this, and the branch is often the more informative fact. Note two distinct
   * branches share the name "Sarwari" under different parents — never key on
   * this alone. */
  branch?: string;
  /** belongs_to_order only: the sheet's `silsila` cell verbatim (RULE 3). */
  asRecorded?: string;
}

export interface KGReviewItem {
  issue: string;
  entityId?: string;
  details?: string;
}

export interface KGStats {
  saints: number;
  orders: number;
  places: number;
  events: number;
  sources: number;
  relations: number;
  ambiguousMerges: number;
}

export interface KGStore {
  schema_version: string;
  generated: string;
  saints: KGSaint[];
  orders: KGOrder[];
  places: KGPlace[];
  events: KGEvent[];
  sources: KGSource[];
  relations: KGRelation[];
  stats: KGStats;
  reviewNeeded: KGReviewItem[];
}
