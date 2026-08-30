export type KGEntityType = 'saint' | 'order' | 'place' | 'event' | 'source';

export type KGRelationType =
  | 'buried_at' // saint → shrine slug
  | 'disciple_of' // saint → saint (teacher)
  | 'successor_of' // saint → saint (predecessor)
  | 'belongs_to_order' // saint → order
  | 'located_in' // shrine slug → place
  | 'commemorated_by' // saint → event
  | 'kin_of' // saint → saint (blood or marriage; always junior → senior)
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
  /**
   * True where `description` is background written for this site rather than
   * anything a source in the archive says — which is all five orders that have
   * one. The other four have no summary at all.
   *
   * It is on the entity, and said on the page, because an unsourced sentence
   * sitting alone on an order page in an archive whose distinguishing claim is
   * provenance reads as a finding. The sourced passages the corpus does hold
   * are in `data/kg-order-prose.json`.
   */
  descriptionIsEditorial?: boolean;
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
  /**
   * Two values, and the vocabulary is deliberately this small.
   *
   * `urs` is a Sufi death-anniversary observance and is set only where the
   * record says urs. Everything else is `observance` — a Shivratri, a Gurpurab,
   * a Vaisakhi fair, a daily prakash. Naming those from the site's tradition
   * would be the build script inferring a taxonomy the record does not give it,
   * so the node carries the observance's own recorded name instead.
   *
   * Was `'urs' | 'mela' | 'pilgrimage' | 'other'`, three of which the builder
   * never emitted while it typed all 168 events `urs` — including 86 at Hindu
   * temples and Sikh gurdwaras. A vocabulary the data never uses is a promise
   * the data does not keep.
   */
  eventType: 'urs' | 'observance';
  shrineSlug?: string;
  saintSlug?: string;
  date?: string;
  /** Present only where the record states one. Absent means unstated, never
   *  "assume annual" — that assumption published `repeatFrequency: P1Y` for 83
   *  events on no evidence. */
  frequency?: 'annual' | 'monthly' | 'biannual';
}

export interface KGSource extends KGEntity {
  type: 'source';
  /**
   * Optional, and that is the honest shape.
   *
   * A bibliography line is a sentence — "Alam Faqri, *Tazkirah
   * Awliya-e-Pakistan* (Lahore) — compendium of the saints of Pakistan." —
   * and deciding book-vs-article from it is exactly the inference this project
   * does not make (RULE 2). The builder sets it only where the citation is
   * nothing but a URL, which is the one unambiguous case; otherwise it is
   * absent rather than guessed.
   *
   * `author`, `year` and `publisher` are unset for the same reason: they are
   * all *inside* `name`, unsplit, because splitting a citation reliably needs a
   * parser for a dozen house styles and a wrong split loses the reader their
   * search string.
   */
  sourceType?: 'book' | 'article' | 'website' | 'oral' | 'inscription';
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
  /** kin_of only: which tie, from a closed vocabulary — `son_of`,
   * `daughter_of`, `grandson_of`, `descendant_of`, `nephew_of`,
   * `son_in_law_of`. A string rather than a union for the same reason
   * `datePrecision` is: it comes from data, and a seventh value must not break
   * the build. */
  kinType?: string;
  /** kin_of only: what to call the OBJECT in relation to the subject, and the
   * subject in relation to the object — `father`/`son`, `uncleMaternal`/
   * `nephewMaternal`, and so on. Two labels rather than one predicate because
   * the edge is read from both figures' pages, and a closed vocabulary rather
   * than free text because **Urdu splits what English does not**: a paternal
   * grandfather is دادا and a maternal one نانا, so a single translated
   * "grandfather" would assert a line the source may never state. Where the
   * entry says which side, the specific role is used; where it does not, the
   * `*Unspecified` role keeps both readings. See
   * `data/kg-seeds.json#_comment_familyRelations`.
   */
  elderRole?: string;
  juniorRole?: string;
  /** kin_of only: the junior side is a collective, so its role reads plural.
   * True for exactly one edge — the six women of Bibi Pak Daman. */
  juniorIsPlural?: boolean;
  /** kin_of only: the sources agree on descent and disagree on how many
   * generations. Present rather than resolved (RULE 2). */
  generationDisputed?: boolean;
  /** kin_of only: the entry reports this parentage as one of two competing
   * traditions, not as settled. */
  contested?: boolean;
  /** kin_of only: the source's own phrase for the tie, verbatim — "his own
   * maternal uncle", "the latter's son". English prose, so it is shown only
   * where a verbatim quote may be (i18n rule 7); the translated role labels
   * carry the meaning in both languages. */
  kinWording?: string;
}

/**
 * A passage the archive itself writes about one of its orders, verbatim.
 *
 * In `data/kg-order-prose.json` rather than in `kg.json`: `/order/:slug` is the
 * only page that renders one, and `kg.json` is a static import in
 * `src/lib/kg.ts`, so 10 KB of order prose there would ride onto every route
 * that touches the graph.
 */
export interface KGOrderProse {
  orderSlug: string;
  /** The entry it was read out of — the link under the quote. */
  shrineSlug: string;
  shrineName: string;
  quote: string;
  /** The same passage from the entry's Urdu article, sliced the same way.
   * Required, not optional: an English paragraph standing as the main content
   * of an Urdu order page is an untranslated sentence, which i18n rule 7
   * forbids — and the no-leak guard caught exactly that on seven routes the
   * first time this shipped. `verify-kg-proposals.mjs` fails the build if one
   * is missing, drifts from the Urdu article, or carries a Latin word run. */
  quoteUr: string;
  source: string;
}

/** Family the archive records without naming the relative on the other end.
 * Not a relation — there is no second node to point at — but a recorded fact,
 * and dropping it would lose a real succession. Two of them. */
export interface KGKinNote {
  saintSlug: string;
  wording: string;
  quote: string;
  source: string;
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
  /**
   * Absent from `data/kg.json` on purpose.
   *
   * The source layer — 464 nodes and 533 attestations — lives in
   * `data/kg-sources.json`, because `src/lib/kg.ts` imports the graph
   * statically and putting it in `kg.json` took `/order/:slug` from 600 KB to
   * 769 KB of eager JS for data no page renders. Its consumers are all
   * build-time: the two exporters and the prerenderer's JSON-LD.
   * `stats.sources` still counts them.
   */
  sources?: KGSource[];
  relations: KGRelation[];
  stats: KGStats;
  /**
   * Figure slugs that used to be their own page, mapped to the figure they were
   * joined into. Every figure gets a prerendered page and a sitemap entry, so
   * joining two nodes retires a published URL — and an unknown `/saint/:slug`
   * redirects to the map, which is a soft 404 for anyone holding the old
   * address. `/saint/:slug` consults this first, the way `/coverage` and
   * `/report` survive as redirects into `/about`.
   *
   * Optional so an older `kg.json` still type-checks.
   */
  retiredSlugs?: Record<string, string>;
  /** Optional so an older `kg.json` still type-checks. */
  kinNotes?: KGKinNote[];
  /**
   * Absent from `data/kg.json`, for the same reason `sources` is.
   *
   * These are the build's own follow-up notes — 79 of them, 17.6 KB — and no
   * page has ever read one; the only consumer is
   * `scripts/data/measure-kb-gaps.mjs`, at build time. They live in
   * `data/kg-review-needed.json` now. `stats.ambiguousMerges` still counts them.
   *
   * Optional so an older `kg.json` still type-checks.
   */
  reviewNeeded?: KGReviewItem[];
}
