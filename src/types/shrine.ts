export interface ShrineRow {
  Name?: string;
  Latitude?: string;
  Longitude?: string;
  Category?: string;
  Location?: string;
  Founded?: string;
  'Sufi Saint'?: string;
  'Image Link'?: string;
  Description?: string;
  History?: string;
  Architecture?: string;
  Rituals?: string;
  'Saint Biography'?: string;
  'Events & Urs'?: string;
  'Visiting Info'?: string;
  Sources?: string;
  Slug?: string;
  [key: string]: string | undefined;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GalleryItem {
  imageUrl: string;
  caption: string;
  /** Photo credit/source line for images not from the primary provenance chain
   * (e.g. "Photo: Dawn.com") — shown under the image so non-Commons sources
   * stay attributed. Empty for images that don't need one. */
  credit: string;
  index: number;
}

export interface ArticleSection {
  id: string;
  field: string;
  title: { en: string; ur: string };
  content: string;
}

export interface ParsedArticle {
  leadText: string;
  inlineSections: InlineSection[];
}

export interface InlineSection {
  heading: string;
  content: string;
}

export interface Shrine {
  id: number;
  slug: string;
  name: string;
  /** null when the sheet has no coordinates (22 Aug ruling: such rows get
   * pages and list/search presence, honestly marked unmapped — a fake
   * coordinate would be an invented one). */
  latLng: LatLng | null;
  category: string;
  /** Raw `info_level` sheet value (Full | Moderate | Low), '' when absent. */
  infoLevel: string;
  /** Raw `support_level` sheet value (Field-verified | Source-documented |
   * Source-seeded | Web-compiled), '' when absent. */
  supportLevel: string;
  /** Raw `status` sheet value (Active | Occasional | …), '' when absent. */
  status: string;
  /** Prose explaining a non-vocabulary `status` detail, moved off the
   * controlled-vocabulary column during schema hygiene (e.g. "deteriorating
   * fabric", "reconstructed 2022"). '' when absent. */
  statusNote: string;
  /** Raw `site_type` sheet value — the built form (Khanqah, Gurdwara, Cave
   * shrine, …). Mostly short vocabulary, but two rows carry survey prose;
   * both are rendered as-is when they don't map (RULE 2). '' when absent. */
  siteType: string;
  /** Prose qualifier for `site_type`, '' when absent. */
  siteTypeNote: string;
  /** Raw `figure_type` sheet value — what kind of figure is honored (Sufi
   * saint | Deity | Sikh Guru | Sant | Historical person | Individual |
   * Collective, plus two survey-prose rows). '' when absent. */
  figureType: string;
  /** Raw `silsila` sheet value — the Sufi order, where the survey recorded
   * one (52 rows). Mostly clean order names; four rows carry survey prose
   * that renders verbatim (RULE 2). '' when absent. */
  silsila: string;
  /** Prose qualifier for `silsila` (22 Aug 2026 ruling, §1.2): distinguishes
   * "no silsila recorded" from "recorded as X, uncorroborated". '' when
   * absent — the column reaches the sheet via the pending import patch. */
  silsilaNote: string;
  location: string;
  region: string;
  founded: string;
  /** Split date fields (2026 schema) — take precedence over `founded` when
   * present; '' when the sheet doesn't have them yet for a row. */
  yearBuilt: string;
  yearBuiltPrecision: string;
  yearBuiltNote: string;
  figureBorn: string;
  figureDied: string;
  eventYear: string;
  eventNote: string;
  sufiSaint: string;
  imageUrl: string | null;
  imageCredit: string;
  gallery: GalleryItem[];
  /* No `parsedArticle` / `articleSections` here, deliberately.
   *
   * Both were built for all 169 rows on every page load and **read by nothing**:
   * every real consumer — `useArticleContent`, `ShrinePreview`,
   * `figureBiography` — calls `lib/data/articleParsing` with the row itself,
   * which is the right shape, because article structure is needed on one entry
   * at a time and the map needs none of it.
   *
   * The cost was measured on 27 August 2026: the heading pipeline runs six
   * regexes over every candidate line of every Description, and `parsedArticle`
   * serialised to **1,902 characters per shrine** inside the localStorage cache
   * — about 40% of a 1,891 KB write that happens on every visit. If a consumer
   * ever wants a parsed article on the model, note that the parse belongs
   * behind a getter or a memo keyed on the row, not eagerly on 169 of them. */
  raw: ShrineRow;
}

/** A shrine known to carry coordinates — what map/tour geometry code works
 * with (tour stops resolve through this; unmapped rows never reach them). */
export type MappedShrine = Shrine & { latLng: LatLng };

// Derived from the language metadata table (N4 groundwork) — re-exported
// here because most of the codebase already imports Lang from this module.
export type { Lang } from '../lib/i18n/languages';

export type Theme = 'light' | 'dark';

export interface ShrineDataState {
  shrines: Shrine[];
  loading: boolean;
  error: string | null;
  /**
   * Where the rows on screen came from.
   *
   * `'index'` is the slim map index (`src/data/shrines-index.json`): ten
   * columns, no `Description`, shown while the full sheet is still in flight.
   * A surface that renders article prose must treat it as *not yet loaded* —
   * the rows are real and complete for what they carry, and silent about
   * everything else.
   */
  source: 'csv' | 'cache' | 'snapshot' | 'index' | null;
  /** When source is 'cache' or 'snapshot', when that data was captured (ms
   * since epoch) — drives the "showing cached data from …" banner. Null for
   * a live 'csv' load. */
  sourceTimestamp: number | null;
  /** True once a live CSV fetch has actually failed (vs. the normal
   * instant-cache-then-background-refresh fast path) — gates the "showing
   * cached data" banner so it doesn't flash on every healthy online load. */
  offline: boolean;
  refresh: () => void;
}
