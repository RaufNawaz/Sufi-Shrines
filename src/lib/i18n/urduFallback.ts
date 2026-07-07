import { isLikelyUrl } from '../data/fieldAliasing';
import urduSeed from '../../data/urdu-seed.json';

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

/**
 * Best-effort word-level substitution for short structured strings (e.g.
 * "8th century", "Founded 1210 CE"). Never falls back to character-by-
 * character transliteration — an unmapped word stays in Latin script, which
 * signals to translateToUrdu() that the result is incomplete and the raw
 * original should be shown instead (see 3.2 of URDU_IMPLEMENTATION_PLAN.md).
 */
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
      return WORD_URDU_MAP[lower] ?? token;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+،/g, '،')
    .trim() || raw;
}

const TRANSLATION_CACHE_KEY = 'shrines_translation_cache_v4';

function loadSeedTranslations(): Map<string, string> {
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
  const win =
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

  // Seed file wins over stale persisted cache; window can still override in dev.
  return new Map(
    Object.entries({ ...persisted, ...(urduSeed as Record<string, string>), ...win }),
  );
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
  if (generated && generated !== raw && !/[A-Za-z]/.test(generated)) {
    cache.set(raw, generated);
    persistCache();
    return generated;
  }

  // Never emit transliterated letter-soup — an unmapped string stays in its
  // original (readable) script rather than becoming character-level gibberish.
  if (import.meta.env.DEV) console.warn('[urdu] missing translation:', raw);
  return raw;
}
