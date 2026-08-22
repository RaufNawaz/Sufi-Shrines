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
  latLng: LatLng;
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
  parsedArticle: ParsedArticle;
  articleSections: ArticleSection[];
  raw: ShrineRow;
}

export type Lang = 'en' | 'ur';

export type Theme = 'light' | 'dark';

export interface ShrineDataState {
  shrines: Shrine[];
  loading: boolean;
  error: string | null;
  source: 'csv' | 'cache' | 'snapshot' | null;
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
