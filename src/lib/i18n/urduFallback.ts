import { isLikelyUrl } from '../data/fieldAliasing';
import urduSeed from '../../data/urdu-seed.json';

const SPECIAL_URDU_PHRASES: Record<string, string> = {
  'Muslim Shrine': 'مسلم مزار',
  'Sikh Gurdwara': 'سکھ گردوارہ',
  'Hindu Temple': 'ہندو مندر',
  'Annual urs': 'سالانہ عرس',
  'No events scheduled right now': 'فی الحال کوئی تقریب طے نہیں',
  'Qawwali on Thursdays between Zuhr and Asr': 'جمعرات کو ظہر اور عصر کے درمیان قوالی',
  "Annual Akhand Path (unbroken reading of the Guru Granth Sahib) around Guru Hargobind's birth anniversary (Gurpurb); daily congregational worship was recorded here in the pre-1947 period":
    'گرو ہرگوبند کی سالگرہ (گرپورب) کے آس پاس سالانہ اکھنڈ پاٹھ (گرو گرنتھ صاحب کی مسلسل تلاوت)؛ 1947 سے پہلے کے دور میں یہاں روزانہ اجتماعی عبادت درج کی گئی ہے',
  'Annual Hinglaj Yatra (April, four days) — pilgrims halt at Chandragup to fast, keep vigil, and make offerings before continuing to Hinglaj Mata Temple':
    'سالانہ ہنگلاج یاترا (اپریل، چار دن) — زائرین چندرگوپ پر رکتے ہیں تاکہ روزہ رکھیں، رات بھر جاگیں، اور نذرانے پیش کریں، اس سے پہلے کہ ہنگلاج ماتا مندر کی طرف روانہ ہوں',
  'Annual birth-anniversary celebrations (October)': 'سالانہ یوم پیدائش کی تقریبات (اکتوبر)',
  'Annual commemoration (2 November)': 'سالانہ یادگاری تقریب (2 نومبر)',
  'Annual death anniversary (Anant Chaturdashi); continuous sadavrat (free kitchen)':
    'سالانہ برسی (اننت چترتھی)؛ مسلسل سدا ورت (مفت لنگر)',
  'Annual three-day Kali festival held each January, drawing Hindu pilgrims from across Pakistan and from India':
    'ہر جنوری میں منعقد ہونے والا سالانہ تین روزہ کالی میلہ، جو پاکستان بھر اور بھارت سے ہندو زائرین کو کھینچتا ہے',
  'Annual three-day urs; weekly Thursday milad': 'سالانہ تین روزہ عرس؛ ہفتہ وار جمعرات کو میلاد',
  'Annual urs (24–26 Rajab)': 'سالانہ عرس (24 سے 26 رجب)',
  'Annual urs (25th–27th Jamadi al-Thani); zikr, qawwali and langar':
    'سالانہ عرس (25 سے 27 جمادی الثانی)؛ ذکر، قوالی اور لنگر',
  'Annual urs (3rd–5th Rabi al-Thani); weekly Thursday-night dhamal (drum-trance gathering)':
    'سالانہ عرس (3 سے 5 ربیع الثانی)؛ ہفتہ وار جمعرات کی رات دھمال (ڈھول کی صدا پر رقصِ مستی کی محفل)',
  'Annual urs (around 10th Rabi al-Awwal)': 'سالانہ عرس (تقریباً 10 ربیع الاول)',
  'Annual urs (autumn)': 'سالانہ عرس (خزاں میں)',
  'Annual urs (death-anniversary commemoration)': 'سالانہ عرس (برسی کی یاد میں تقریب)',
  'Annual urs / large annual gathering': 'سالانہ عرس / بڑا سالانہ اجتماع',
  'Annual urs on the first Wednesday and Thursday of Rajab (langar served)':
    'رجب کے پہلے بدھ اور جمعرات کو سالانہ عرس (لنگر تقسیم کیا جاتا ہے)',
  'Annual urs; large gatherings of devotees': 'سالانہ عرس؛ معتقدین کے بڑے اجتماعات',
  'Annual urs; regular pilgrimage': 'سالانہ عرس؛ باقاعدہ زیارت',
  'Annual urs; weekly Thursday devotional gathering':
    'سالانہ عرس؛ ہفتہ وار جمعرات کی عقیدت مندانہ محفل',
  'Commemoration of Sain Vali Vilayat Rai; Nanakpanthi worship':
    'سائیں ولی ولایت رائے کی یادگاری تقریب؛ نانک پنتھی عبادت',
  'Death anniversary commemoration (27 June); Vaisakhi pilgrimage season':
    'برسی کی یاد میں تقریب (27 جون)؛ بیساکھی کے موسم میں زیارت',
  'Diwali, Holi': 'دیوالی، ہولی',
  'Diwali, Holi, Raksha Bandhan; daily worship': 'دیوالی، ہولی، رکشا بندھن؛ روزانہ عبادت',
  'Gurpurabs; daily prakash of the Guru Granth Sahib': 'گرپورب؛ گرو گرنتھ صاحب کا روزانہ پرکاش',
  'Heritage site; occasional Jain/Hindu pilgrimage': 'ورثہ کا مقام؛ کبھی کبھار جین/ہندو زیارت',
  'Heritage/tourist site; regular worship discontinued (idols removed)':
    'ورثہ/سیاحتی مقام؛ باقاعدہ عبادت منقطع (بت ہٹا دیے گئے)',
  'Historically an annual Maghi fair (pre-1947)': 'تاریخی طور پر سالانہ ماگھی میلہ (1947 سے پہلے)',
  'Historically an annual fair (pre-1947); now not in regular worship':
    'تاریخی طور پر سالانہ میلہ (1947 سے پہلے)؛ اب باقاعدہ عبادت میں نہیں',
  'Large gatherings of Hur devotees on 27 Rajab and at fixed times of the year; notably, no public urs is observed':
    '27 رجب اور سال کے مقررہ اوقات میں حر معتقدین کے بڑے اجتماعات؛ قابلِ ذکر بات یہ ہے کہ کوئی عوامی عرس نہیں منایا جاتا',
  'No confirmed annual urs date currently documented':
    'سالانہ عرس کی کوئی تصدیق شدہ تاریخ فی الحال دستاویز نہیں',
  'No events documented': 'کوئی تقریب دستاویز نہیں',
  'No events scheduled right now (heritage/tourism site, not a pilgrimage destination)':
    'فی الحال کوئی تقریب طے نہیں (ورثہ/سیاحتی مقام ہے، زیارت گاہ نہیں)',
  'No regular events documented': 'کوئی باقاعدہ تقریب دستاویز نہیں',
  "No scheduled events currently documented; an annual fair around Basant Panchami is recorded in older sources, but its continuation is uncertain given reports that the site's structure no longer survives":
    'فی الحال کوئی طے شدہ تقریب دستاویز نہیں؛ پرانے ماخذ میں بسنت پنچمی کے آس پاس ایک سالانہ میلے کا ذکر ملتا ہے، مگر اس کا تسلسل غیر یقینی ہے کیونکہ اطلاعات کے مطابق مقام کا ڈھانچہ اب باقی نہیں',
  'Pilgrimage to the tomb; visited year-round by devotees':
    'مقبرے کی زیارت؛ معتقدین سال بھر آتے ہیں',
  'Preserved as a heritage site; occasional Sikh visitors. No regular events scheduled.':
    'ورثہ کے مقام کے طور پر محفوظ؛ کبھی کبھار سکھ زائرین۔ کوئی باقاعدہ تقریب طے نہیں۔',
  'Recently restored and reopened to visitors (January 2026); no regular festival calendar documented':
    'حال ہی میں بحال کر کے زائرین کے لیے دوبارہ کھولا گیا (جنوری 2026)؛ کوئی باقاعدہ تہواری تقویم دستاویز نہیں',
  'Reopened for active worship in June 2022 following restoration; no fixed public festival calendar documented':
    'بحالی کے بعد جون 2022 میں فعال عبادت کے لیے دوبارہ کھولا گیا؛ کوئی مقررہ عوامی تہواری تقویم دستاویز نہیں',
  'Reopened for pilgrims; Guru Nanak anniversaries':
    'زائرین کے لیے دوبارہ کھولا گیا؛ گرو نانک کی برسیاں',
  'Sikh and Nanakpanthi festivals': 'سکھ اور نانک پنتھی تہوار',
  'Sikh anniversaries; martyrdom commemoration of Guru Arjan Dev':
    'سکھ برسیاں؛ گرو ارجن دیو کی شہادت کی یاد میں تقریب',
  "Sikh pilgrimage, especially on Guru Nanak's Gurpurab":
    'سکھ زیارت، خاص طور پر گرو نانک کے گرپورب پر',
  "Sikh pilgrimage, especially on Guru Nanak's Gurpurab; part of the Eminabad heritage circuit":
    'سکھ زیارت، خاص طور پر گرو نانک کے گرپورب پر؛ ایمن آباد ورثہ سرکٹ کا حصہ',
  Undocumented: 'غیر دستاویزی',
  'Urs celebrated in Safar (Islamic month)': 'عرس ماہِ صفر (اسلامی مہینہ) میں منایا جاتا ہے',
  'Vaisakhi fair (historically)': 'بیساکھی میلہ (تاریخی طور پر)',
  'Visited year-round by Muslim and Hindu pilgrims (no fixed urs recorded)':
    'مسلم اور ہندو زائرین سال بھر آتے ہیں (کوئی مقررہ عرس درج نہیں)',
  'Year-round pilgrimage; ritual bathing in the hot springs':
    'سال بھر زیارت؛ گرم چشموں میں رسمی غسل',
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
  return (
    tokens
      .map((token) => {
        if (!/[A-Za-z]/.test(token)) return token.replace(/,/g, '،');
        const lower = token.toLowerCase();
        return WORD_URDU_MAP[lower] ?? token;
      })
      .join('')
      .replace(/\s+/g, ' ')
      .replace(/\s+،/g, '،')
      .trim() || raw
  );
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
  return new Map(Object.entries({ ...persisted, ...(urduSeed as Record<string, string>), ...win }));
}

let _cache: Map<string, string> | null = null;
// Lowercased-key companion index so case-insensitive lookups are O(1)
// instead of a per-render scan over every seed entry.
let _lowerCache: Map<string, string> | null = null;
// Strings known to have no translation — cached so permanent misses don't
// redo the fallback work (or re-warn) on every render.
const _misses = new Set<string>();

function getCache(): Map<string, string> {
  if (!_cache) {
    _cache = loadSeedTranslations();
    _lowerCache = new Map();
    for (const [k, v] of _cache) {
      // Mirror the old linear scan's semantics: first entry wins, and values
      // still containing Latin letters are never served.
      if (/[A-Za-z]/.test(v)) continue;
      const lk = k.toLowerCase();
      if (!_lowerCache.has(lk)) _lowerCache.set(lk, v);
    }
  }
  return _cache;
}

let _persistScheduled = false;

/** Persist off the render path — translateToUrdu runs while rendering, and a
 * synchronous JSON.stringify of the whole dictionary would block paint. */
function schedulePersistCache() {
  if (_persistScheduled) return;
  _persistScheduled = true;
  const flush = () => {
    _persistScheduled = false;
    try {
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(getCache())));
    } catch {
      // Ignore storage failures (private mode / quota).
    }
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(flush);
  else queueMicrotask(flush);
}

export function translateToUrdu(text: string): string {
  const raw = String(text ?? '').trim();
  if (!raw) return '';
  if (isLikelyUrl(raw)) return raw;
  if (!/[A-Za-z]/.test(raw)) return raw;

  const cache = getCache();
  const exact = cache.get(raw);
  if (exact && !/[A-Za-z]/.test(exact)) return exact;

  if (_misses.has(raw)) return raw;

  // Case-insensitive lookup
  const lower = _lowerCache!.get(raw.toLowerCase());
  if (lower) return lower;

  const generated = buildUrduFallback(raw);
  if (generated && generated !== raw && !/[A-Za-z]/.test(generated)) {
    cache.set(raw, generated);
    const lk = raw.toLowerCase();
    if (!_lowerCache!.has(lk)) _lowerCache!.set(lk, generated);
    schedulePersistCache();
    return generated;
  }

  // Never emit transliterated letter-soup — an unmapped string stays in its
  // original (readable) script rather than becoming character-level gibberish.
  _misses.add(raw);
  if (import.meta.env.DEV) console.warn('[urdu] missing translation:', raw);
  return raw;
}
