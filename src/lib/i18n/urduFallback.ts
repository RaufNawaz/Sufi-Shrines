import { isLikelyUrl } from '../data/fieldAliasing';

const SPECIAL_URDU_PHRASES: Record<string, string> = {
  'Muslim Shrine': 'مسلم مزار',
  'Sikh Gurdwara': 'سکھ گردوارہ',
  'Hindu Temple': 'ہندو مندر',
  'Annual urs': 'سالانہ عرس',
  'No events scheduled right now': 'فی الحال کوئی تقریب طے نہیں',
  'Qawwali on Thursdays between Zuhr and Asr': 'جمعرات کو ظہر اور عصر کے درمیان قوالی',
};

const WORD_URDU_MAP: Record<string, string> = {
  active: 'فعال',
  and: 'اور',
  annual: 'سالانہ',
  around: 'تقریباً',
  asr: 'عصر',
  associated: 'منسوب',
  balochistan: 'بلوچستان',
  between: 'کے درمیان',
  capital: 'دارالحکومت',
  ce: 'عیسوی',
  century: 'صدی',
  city: 'شہر',
  completed: 'مکمل',
  complex: 'کمپلیکس',
  constructed: 'تعمیر شدہ',
  commissioned: 'تعمیر کروایا گیا',
  district: 'ضلع',
  dargah: 'درگاہ',
  early: 'اوائل',
  eidgah: 'عیدگاہ',
  events: 'تقریبات',
  founded: 'تاسیس',
  ghazi: 'غازی',
  gurdwara: 'گردوارہ',
  hindu: 'ہندو',
  islamabad: 'اسلام آباد',
  island: 'جزیرہ',
  karachi: 'کراچی',
  kashmir: 'کشمیر',
  khyber: 'خیبر',
  lahore: 'لاہور',
  likely: 'غالباً',
  location: 'مقام',
  mausoleum: 'مقبرہ',
  month: 'مہینہ',
  mosque: 'مسجد',
  multan: 'ملتان',
  muslim: 'مسلم',
  name: 'نام',
  national: 'قومی',
  near: 'قریب',
  no: 'نہیں',
  now: 'اب',
  of: 'کا',
  on: 'کو',
  onwards: 'سے آگے',
  opened: 'افتتاح',
  pakhtunkhwa: 'پختونخوا',
  pakistan: 'پاکستان',
  paragraph: 'پیراگراف',
  park: 'پارک',
  peshawar: 'پشاور',
  punjab: 'پنجاب',
  qawwali: 'قوالی',
  road: 'روڈ',
  saint: 'بزرگ',
  scheduled: 'طے شدہ',
  sharif: 'شریف',
  shrine: 'مزار',
  sikh: 'سکھ',
  sindh: 'سندھ',
  site: 'جگہ',
  sufi: 'صوفی',
  temple: 'مندر',
  territory: 'علاقہ',
  thursdays: 'جمعرات',
  tomb: 'مقبرہ',
  urs: 'عرس',
  valley: 'وادی',
  with: 'کے ساتھ',
  zuhr: 'ظہر',
};

const DIGRAPH_URDU_MAP: Record<string, string> = {
  aa: 'ا',
  ae: 'ی',
  ai: 'ے',
  ay: 'ے',
  bh: 'بھ',
  ch: 'چ',
  dh: 'دھ',
  gh: 'غ',
  kh: 'خ',
  oo: 'و',
  ou: 'او',
  ow: 'اؤ',
  ph: 'ف',
  sh: 'ش',
  th: 'تھ',
  zh: 'ژ',
};

const CHAR_URDU_MAP: Record<string, string> = {
  a: 'ا',
  b: 'ب',
  c: 'ک',
  d: 'د',
  e: 'ے',
  f: 'ف',
  g: 'گ',
  h: 'ہ',
  i: 'ی',
  j: 'ج',
  k: 'ک',
  l: 'ل',
  m: 'م',
  n: 'ن',
  o: 'و',
  p: 'پ',
  q: 'ق',
  r: 'ر',
  s: 'س',
  t: 'ت',
  u: 'و',
  v: 'و',
  w: 'و',
  x: 'کس',
  y: 'ی',
  z: 'ز',
};

function transliterateWord(word: string): string {
  if (!word) return '';
  const lower = word.toLowerCase();
  let i = 0;
  let result = '';
  while (i < lower.length) {
    const digraph = lower.slice(i, i + 2);
    if (DIGRAPH_URDU_MAP[digraph]) {
      result += DIGRAPH_URDU_MAP[digraph];
      i += 2;
    } else {
      result += CHAR_URDU_MAP[lower[i]] || word[i] || '';
      i += 1;
    }
  }
  return result;
}

export function buildUrduFallback(rawText: string): string {
  const raw = String(rawText ?? '').trim();
  if (!raw) return '';
  if (!/[A-Za-z]/.test(raw)) return raw;

  const special = SPECIAL_URDU_PHRASES[raw];
  if (special) return special;

  const centuryMatch = raw.match(/^(\d+)(st|nd|rd|th)\s+century$/i);
  if (centuryMatch) return `${centuryMatch[1]}ویں صدی`;

  const tokens = raw.match(/[A-Za-z]+|\d+|[^A-Za-z\d]+/g) || [];
  return tokens
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) return token.replace(/,/g, '،');
      const lower = token.toLowerCase();
      return WORD_URDU_MAP[lower] ?? transliterateWord(token);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+،/g, '،')
    .trim() || raw;
}

const TRANSLATION_CACHE_KEY = 'shrines_translation_cache_v3';

function loadSeedTranslations(): Map<string, string> {
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
  const seed =
    w.SHRINE_TRANSLATIONS && typeof w.SHRINE_TRANSLATIONS === 'object'
      ? (w.SHRINE_TRANSLATIONS as Record<string, string>)
      : {};

  let persisted: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') persisted = parsed;
    }
  } catch {
    // ignore
  }

  return new Map(Object.entries({ ...persisted, ...seed }));
}

let _cache: Map<string, string> | null = null;
function getCache(): Map<string, string> {
  if (!_cache) _cache = loadSeedTranslations();
  return _cache;
}

function persistCache() {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(getCache())));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

export function translateToUrdu(text: string): string {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  if (isLikelyUrl(raw)) return raw;
  if (!/[A-Za-z]/.test(raw)) return raw;

  const cache = getCache();
  const exact = cache.get(raw);
  if (exact && !/[A-Za-z]/.test(exact)) return exact;

  // Case-insensitive lookup
  const lower = raw.toLowerCase();
  for (const [k, v] of cache.entries()) {
    if (k.toLowerCase() === lower && !/[A-Za-z]/.test(v)) return v;
  }

  const generated = buildUrduFallback(raw);
  if (generated && generated !== raw) {
    cache.set(raw, generated);
    persistCache();
    return generated;
  }

  return raw;
}
