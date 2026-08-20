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
  method: 'human' | 'rule' | 'ml';
  source?: string; // citation, e.g. a shrine_entries/*.md file
  quote?: string; // verbatim supporting text from source
  notes?: string;
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
