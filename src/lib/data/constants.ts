export const CSV_URL =
  import.meta.env.VITE_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv';

export const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
export const DEFAULT_ZOOM = 6;

export const IMAGE_KEYS = new Set([
  'Image Link',
  'Image',
  'image',
  'image_url',
  'photo',
  'photo_url',
]);

export const NON_DETAIL_KEYS = new Set(['Latitude', 'Longitude', ...IMAGE_KEYS]);

export const LEAD_PARAGRAPH_KEYS = ['Description', 'About', 'Paragraph', 'Summary'];

export const ARTICLE_SECTION_DEFINITIONS = [
  { id: 'history', field: 'History', title: { en: 'History', ur: 'تاریخ' } },
  { id: 'architecture', field: 'Architecture', title: { en: 'Architecture', ur: 'معماری' } },
  { id: 'rituals', field: 'Rituals', title: { en: 'Rituals', ur: 'رسومات' } },
  {
    id: 'biography',
    field: 'Saint Biography',
    title: { en: 'Saint Biography', ur: 'سوانح حیات' },
  },
  {
    id: 'events',
    field: 'Events & Urs',
    title: { en: 'Events & Urs', ur: 'تقریبات اور عرس' },
  },
  {
    id: 'visiting',
    field: 'Visiting Info',
    title: { en: 'Visiting Info', ur: 'زیارت کی معلومات' },
  },
  { id: 'sources', field: 'Sources', title: { en: 'Sources', ur: 'حوالہ جات' } },
] as const;

export const ARTICLE_SECTION_KEYS = ARTICLE_SECTION_DEFINITIONS.map((d) => d.field);

export const INFOBOX_PRIORITY_KEYS = [
  'Category',
  'Type',
  'Location',
  'District',
  'Province',
  'Region',
  'City',
  'Founded',
  'Sufi Saint',
  'Saint',
];

export const MAX_INFOBOX_ROWS = 8;

export const STRUCTURED_DESCRIPTION_HEADING_ALIASES = [
  'History',
  'Architecture',
  'Rituals',
  'Saint Biography',
  'Biography',
  'Events & Urs',
  'Events and Urs',
  'Events',
  'Urs',
  'Visiting Info',
  'Visiting Information',
  'Visit Info',
  'Sources',
  'References',
  'Citations',
  'تاریخ',
  'معماری',
  'رسومات',
  'سوانح حیات',
  'تقریبات اور عرس',
  'تقریبات',
  'عرس',
  'زیارت کی معلومات',
  'حوالہ جات',
  'حوالے',
];

export const GALLERY_SECTION_TITLE = { en: 'Gallery', ur: 'گیلری' };
