export const CSV_URL =
  import.meta.env.VITE_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSmsEsQclqJuEioIHxQa6ZaTf1SmSuKhM-B3RcfEQyK8Ewqy4-c_xe7DOgBWdhMUyvtrzThIVl9Y9df/pub?gid=0&single=true&output=csv';

export const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
export const DEFAULT_ZOOM = 6;

/** Desktop sidebar width in px — used to keep the map's point of interest
 * clear of the sidebar when flying/fitting the view. */
export const SIDEBAR_WIDTH = 380;

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
  'Events',
];

export const MAX_INFOBOX_ROWS = 8;

/** Inline "## Heading" names that should render as a bulleted source list
 * (bold-title parsing + one <li> per line), same treatment as the dedicated
 * Sources column — shrine prose today cites sources under "## Bibliography"
 * far more often than "## Sources" (no dedicated Sources column exists yet
 * in the live sheet), so both need to land on the same rendering. */
export const SOURCES_HEADING_ALIASES = new Set(
  ['Sources', 'Bibliography', 'References', 'Citations', 'Works Cited', 'حوالہ جات', 'کتابیات', 'حوالے'].map(
    (h) => h.toLowerCase(),
  ),
);

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
