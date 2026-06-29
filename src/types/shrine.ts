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
  location: string;
  founded: string;
  sufiSaint: string;
  imageUrl: string | null;
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
  source: 'csv' | 'cache' | null;
  refresh: () => void;
}
