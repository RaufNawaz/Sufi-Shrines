import type { UiStrings } from './uiStrings';

/** The oblique/possessed form of a kinship role, for "‹possessor› ‹role›"
 * constructions. See `graphLineageOnlyKinOf` below for why this cannot be the
 * same string as the `kinRole*` chip. */
const KIN_GENITIVE: Record<string, string> = {
  بیٹا: 'کے بیٹے',
  بیٹی: 'کی بیٹی',
  بیٹیاں: 'کی بیٹیاں',
  پوتا: 'کے پوتے',
  'پوتا/نواسا': 'کے پوتے/نواسے',
  بھتیجا: 'کے بھتیجے',
  بھانجا: 'کے بھانجے',
  'بھتیجا/بھانجا': 'کے بھتیجے/بھانجے',
  'اولاد میں سے': 'کی اولاد میں سے',
};

function kinGenitive(role: string): string {
  return KIN_GENITIVE[role] ?? `کے ${role}`;
}

/**
 * The Urdu interface strings — 42 KB, in their own module so an English reader
 * never downloads them.
 *
 * They were siblings of the English table inside `uiStrings.ts`, which meant
 * every reader on every route fetched both languages: 42,025 of that file's
 * 71,508 bytes are this table, and an English-only reader will never see a word
 * of it. That is the same waste `scripts/check-bundle-budget.mjs` was written to
 * catch when 1 MB of Urdu article prose was a static import, and the reason a
 * third language would have pushed the eager cost to ~113 KB.
 *
 * **Nothing may import this statically.** A single static import collapses the
 * split and silently restores the 42 KB to every route — `uiStringSplit.test.ts`
 * fails the build if one appears. The only sanctioned path is
 * `loadUiStrings('ur')` in `uiStrings.ts`, which `main.tsx` awaits *before* the
 * first render so an Urdu reader never sees an English frame (the prerendered
 * HTML is a `<div id="root">` shell — HANDOVER §9.98 — so there is no
 * server-rendered paint to fall back on).
 *
 * Typed as `UiStrings`, the shape of the English table, so a missing or renamed
 * key is a compile error here rather than an English word appearing in the Urdu
 * view at runtime.
 */
export const UI_TEXT_UR: UiStrings = {
  /* ── ترتیبات کا صفحہ (/settings) ───────────────────────────────────── */
  settingsIntro:
    'یہ انتخاب صرف اسی براؤزر میں محفوظ رہتے ہیں۔ کچھ بھی کہیں نہیں بھیجا جاتا، اور براؤزر کا ڈیٹا صاف کرنے پر یہ دوبارہ طے شدہ حالت پر آ جاتے ہیں۔',
  settingsLanguageSection: 'زبان اور اعداد',
  settingsLanguageLabel: 'مطالعے کی زبان',
  settingsLanguageHelp:
    'آرکائیو اردو یا انگریزی میں پڑھا جا سکتا ہے۔ دونوں مکمل ہیں: اندراجات، فلٹر، تاریخیں اور تلاش۔',
  settingsNumeralsLabel: 'اعداد',
  settingsNumeralsHelp:
    'اعداد مشرقی صورت میں دکھائے جائیں یا مغربی۔ عرضِ بلد و طولِ بلد بہر صورت مغربی رہتے ہیں، کیونکہ انہیں دوسرے آلات میں نقل کیا جاتا ہے۔',
  settingsNumeralsEastern: 'مشرقی (۱۲۳)',
  settingsNumeralsWestern: 'مغربی (123)',
  settingsNumeralsUrduOnly: 'اردو ایڈیشن پر لاگو ہوتا ہے۔',
  almanacProjectedLabel: 'اندازاً',
  settingsAppearanceSection: 'ظاہری شکل',
  settingsTextSizeLabel: 'مطالعے کا حجم',
  settingsTextSizeHelp:
    'اندراجات اور فہرست صفحات کی تحریر کا حجم۔ نقشہ اور رہنما فہرست اپنے حجم پر رہتے ہیں، جنہیں براؤزر کا زوم پہلے ہی بدل دیتا ہے۔',
  settingsTextSizeScaleMark: 'ا',
  settingsTextSizeXsmall: 'سب سے چھوٹا',
  settingsTextSizeSmall: 'چھوٹا',
  settingsTextSizeMedium: 'درمیانہ',
  settingsTextSizeLarge: 'بڑا',
  settingsTextSizeXlarge: 'سب سے بڑا',
  settingsTextSizeSample: 'مزار وہاں ہے جہاں راستہ دریا کی طرف مڑتا ہے۔',
  settingsMotionLabel: 'حرکت',
  settingsMotionHelp:
    'آرکائیو حصوں کو آتے ہوئے دھیرے سے نمایاں کرتا ہے اور سلسلوں کے خاکوں میں حرکت دکھاتا ہے۔ اگر آپ کا آلہ پہلے ہی کم حرکت کا تقاضا کرتا ہے تو آرکائیو اس کی پیروی کرتا ہے۔',
  settingsMotionSystem: 'میرے آلے کی پیروی کریں',
  settingsMotionReduced: 'حرکت کم کریں',
  settingsThemeLabel: 'رنگ',
  settingsThemeHelp: 'جب تک آپ یہاں خود انتخاب نہ کریں، آرکائیو آپ کے آلے کی پیروی کرتا ہے۔',
  settingsThemeLight: 'روشن',
  settingsThemeDark: 'تاریک',
  settingsSavedSection: 'آپ کے محفوظ مقامات',
  settingsSavedFileLabel: 'فہرست بطور فائل',
  settingsSavedHelp:
    'جن مقامات کو آپ نے نشان زد کیا ہے وہ صرف اسی براؤزر میں محفوظ ہیں، کہیں اور نہیں۔ کچھ اپ لوڈ نہیں ہوتا، اور اسی لیے کسی اور جگہ محفوظ بھی نہیں رہتا — فہرست کو باہر محفوظ کر لیں یا کسی دوسرے آلے پر منتقل کر لیں۔',
  settingsSavedCount: (n: string) => `${n} محفوظ`,
  settingsSavedEmpty: 'ابھی کچھ محفوظ نہیں۔ کسی مزار کے صفحے پر ستارہ دبانے سے وہ یہاں آ جاتا ہے۔',
  settingsSavedExport: 'فہرست محفوظ کریں',
  settingsSavedImport: 'فہرست درآمد کریں',
  settingsSavedClear: 'فہرست خالی کریں',
  settingsSavedClearConfirm: 'تمام محفوظ مقامات مٹا دیے جائیں؟ یہ واپس نہیں ہو سکتا۔',
  settingsSavedImported: (n: string) => `فائل سے ${n} شامل ہوئے`,
  settingsSavedImportedNone: 'اس فائل میں سب کچھ پہلے ہی محفوظ تھا۔',
  settingsSavedImportFailed: 'یہ فائل اس آرکائیو کی محفوظ مقامات کی فہرست نہیں ہے۔',
  settingsSavedMergeNote:
    'درآمد موجودہ فہرست میں اضافہ کرتی ہے، اسے بدلتی نہیں، تاکہ ایک آلے سے دوسرے پر منتقلی میں کوئی فہرست ضائع نہ ہو۔ بالکل ویسی نقل چاہیے ہو تو پہلے فہرست خالی کر لیں۔',
  settingsDistanceSection: 'فاصلے',
  settingsUnitsLabel: 'پیمانہ',
  settingsUnitsHelp:
    'مقامات کے درمیان فاصلے، مزارات کے صفحات پر اور رہنما دوروں کے ساتھ۔ آرکائیو عرض بلد و طول بلد درج کرتا ہے اور فاصلے میٹرک میں شمار کرتا ہے؛ یہاں سے صرف پڑھنے کے لیے تبدیل ہوتے ہیں۔',
  settingsUnitsKm: 'کلومیٹر',
  settingsUnitsMi: 'میل',
  settingsDatesSection: 'تاریخیں اور ایامِ عرس',
  settingsCalendarLabel: 'کون سی تقویم پہلے',
  settingsCalendarHelp:
    'ہجری تقویم میں درج عرس کی کوئی عیسوی تاریخ نہیں ہوتی، صرف اندازہ ہوتا ہے: مہینہ چاند دیکھنے پر شروع ہوتا ہے۔ دونوں تاریخیں ہمیشہ دکھائی جاتی ہیں — یہاں سے صرف یہ طے ہوتا ہے کہ پہلے کون سی لکھی جائے۔',
  settingsCalendarGregorian: 'پہلے عیسوی',
  settingsCalendarHijri: 'پہلے ہجری',
  settingsCalendarNote:
    'جو دن آرکائیو نے عیسوی تاریخ کے طور پر درج کیا ہے وہ ویسا ہی رہتا ہے، کیونکہ اس کی کوئی ہجری تاریخ درج نہیں اور خود سے نکالنا تاریخ گھڑنا ہوگا۔',
  settingsMapSection: 'نقشہ اور رہنما دورے',
  settingsDirectoryLabel: 'مزارات کی فہرست',
  settingsDirectoryHelp: 'نقشے پر فہرست کا بٹن کیا کھولے۔',
  settingsToursLabel: 'رہنما دورے',
  settingsToursToggle: 'نقشے پر دورے دکھائیں',
  settingsAllOptions: 'تمام ترتیبات',
  settingsToursHelp:
    'آرکائیو میں سے منتخب راستے۔ طے شدہ طور پر بند ہیں — نقشے کا اپنا موضوع خود یہ مقامات ہیں۔',
  /* NOT renamed alongside the English on 30 August 2026, deliberately.
     'پاکستان کے صوفی مزارات' says "Pakistan's Sufi shrines" and carries exactly
     the same problem the English rename fixed — but an archive's name in Urdu
     is Urdu content, and RULE 2 plus the i18n rules put authoring it beyond an
     agent. Left saying the wrong thing rather than guessed at, and recorded in
     SESSION_RESUME.md as waiting on a fluent speaker. The two editions disagree
     about the archive's name until then, and that is the honest state.

     **All three strings below, not only the name.** `siteMetaDescription` is a
     claim about *contents* rather than a name — it says "an interactive map of
     Sufi shrines across Pakistan", where its English twin was corrected on the
     same day to enumerate shrines, temples, gurdwaras and darbars. It is the
     more clearly wrong of the two and equally out of reach: correcting a
     factual claim in Urdu still means writing Urdu. Same ruling, same reason,
     stated here so the next reader does not conclude that only the name was
     considered. An agent may apply a ruling; it may not extend one. */
  title: 'صوفی مزارات',
  siteTitle: 'پاکستان کے صوفی مزارات',
  siteMetaDescription:
    'پاکستان بھر کے صوفی مزارات کا انٹرایکٹو نقشہ۔ تاریخ، طرزِ تعمیر، رسومات، اور زائرین کی معلومات اردو اور انگریزی میں دیکھیں۔',
  loading: 'ڈیٹا لوڈ ہو رہا ہے...',
  loadingShrine: 'مزار کی تفصیلات لوڈ ہو رہی ہیں...',
  noSelection: 'ابھی کوئی مزار منتخب نہیں ہوا۔ تفصیل کے لیے مارکر پر کلک کریں۔',
  exploreTitle: 'مزارات دریافت کریں',
  exploreHint: 'مزارات کی مکمل فہرست دیکھنے کے لیے اوپر والا بٹن استعمال کریں۔',
  tableButton: 'مزارات کی فہرست',
  settings: 'ترتیبات',
  directoryModeLabel: 'مزارات کی فہرست کا بٹن کھولے',
  directoryModeSpotlight: 'فوری تلاش',
  directoryModeTable: 'مزارات کی روایتی فہرست',
  /* ── Command palette (⌘K search) — drafts, not reviewed by a fluent
       speaker ─────────────────────────────────────────────────────────────── */
  paletteTitle: 'آرکائیو میں تلاش',
  paletteOpen: 'تلاش اور چھانٹ',
  filtersLabel: 'چھانٹ',
  paletteHintMove: 'حرکت کے لیے',
  paletteHintOpen: 'کھولنے کے لیے',
  ariaOpenPalette: 'آرکائیو میں تلاش اور چھانٹ',
  paletteClose: 'تلاش بند کریں',
  searchGroupDays: 'ایام',
  searchGroupSites: 'مقامات',
  searchPlaceholder: 'مزار تلاش کریں...',
  noMatches: 'کوئی نتیجہ نہیں ملا۔',
  uncategorized: 'غیر زمرہ بند',
  descriptionMore: 'مزید',
  backToMap: 'نقشے پر واپس جائیں',
  /* ── ٹیب بار (فون) ───────────────────────────────────────────────────── */
  tabMap: 'نقشہ',
  tabExplore: 'شخصیات',
  tabAlmanac: 'تقویم',
  tabAtlas: 'اقسام',
  tabAbout: 'آرکائیو',
  tabBarLabel: 'آرکائیو کے حصے',
  share: 'شیئر',
  copied: 'کاپی ہو گیا',
  openFullMap: 'پورا نقشہ کھولیں',
  viewMapSection: 'نقشے والے حصے پر جائیں',
  copyCoordinates: 'کوآرڈینیٹس کاپی کریں',
  coordinatesCopied: 'کوآرڈینیٹس کاپی ہو گئے',
  coordinatesLabel: 'کوآرڈینیٹس',
  imageExpand: 'تصویر کھولیں',
  closeImage: 'تصویر بند کریں',
  photoCredit: 'تصویر',
  contents: 'مندرجات',
  overview: 'خلاصہ',
  descriptionSection: 'توضیح',
  descriptionUrduLabel: 'اردو ترجمہ',
  details: 'تفصیلات',
  locationMap: 'موقع کا نقشہ',
  getDirections: 'راستہ حاصل کریں',
  relatedShrines: 'متعلقہ مزارات',
  nearbyShrines: 'قریبی مزارات',
  sharedGroundHeading: 'مشترکہ زمین',
  sharedGroundIntro: (sites: number, traditions: number) =>
    `پیدل فاصلے پر ${sites} دیگر مقامات، جن میں سے ${traditions} کسی اور روایت سے تعلق رکھتے ہیں۔`,
  sharedGroundIntroSame: (sites: number) => `پیدل فاصلے پر ${sites} دیگر مقامات۔`,
  sharedGroundNote:
    'اِس مقام سے 800 میٹر کے اندر درج مقامات۔ پنجاب اور سندھ کے بڑے حصے میں یہ برادریاں ایک ہی گلی کوچے میں آباد رہیں۔',
  sharedGroundSamePin: 'ایک ہی درج مقام',
  sharedGroundSamePinHelp:
    'سروے اِن کے لیے الگ مقام نہیں دیتا، اِس لیے یہ ایک ہی نشان رکھتے ہیں۔ اِن کے درمیان فاصلہ درج نہیں۔',
  distanceAwayMetres: (value: string) => `${value} میٹر کے فاصلے پر`,
  shrineFacts: 'مزار کی اہم باتیں',
  distanceAwayKm: (value: string) => `${value} کلومیٹر دور`,
  distanceAwayMi: (value: string) => `${value} میل دور`,
  distanceBareKm: (value: string) => `${value} کلومیٹر`,
  distanceBareMi: (value: string) => `${value} میل`,
  /* «کے فاصلے پر» is "away from" — it wants a vantage point. A pair has none,
     so these read as a plain measurement between the two. */
  distanceApartMetres: (value: string) => `${value} میٹر کا فاصلہ`,
  distanceApartKm: (value: string) => `${value} کلومیٹر کا فاصلہ`,
  distanceApartMi: (value: string) => `${value} میل کا فاصلہ`,
  noImage: 'تصویر نہیں ملی۔ اپنی شیٹ میں "Image Link" شامل کریں۔',
  imageLoadFailed: 'تصویر لوڈ نہیں ہوئی۔',
  notFound: 'مزار نہیں ملا۔',
  errorLoadingData: 'ڈیٹا لوڈ نہیں ہوا۔',
  offlineDataBanner: 'محفوظ شدہ ڈیٹا دکھایا جا رہا ہے، تاریخ:',
  retry: 'دوبارہ کوشش کریں',
  appErrorMessage: 'کچھ غلط ہو گیا۔ براہ کرم صفحہ دوبارہ لوڈ کریں۔',
  appErrorReload: 'دوبارہ لوڈ کریں',
  filterAll: 'سب',
  resultCount: (n: number) => `${n} مزار`,
  /* "X میں سے Y" — the total comes first in Urdu. Built in the English order
       it would read "169 out of 12", which is a false number, not clumsy
       phrasing (the same trap as almanacCoverageTotal). */
  paletteResultCount: (shown: number, total: number) =>
    shown === total ? `${total} مقامات` : `${total} میں سے ${shown} مقامات`,
  tourCount: (n: number) => `${n} سفر`,
  /* ── Order pages — drafts, not reviewed by a fluent speaker ──────────── */
  orderWhereHeading: 'یہ سلسلہ کہاں ہے',
  orderWhereNote: 'ہر اُس مقام کے خانے سے گنا گیا جہاں اِس سلسلے کے کسی بزرگ کی یادگار ہے۔',
  orderSitesHeading: 'اِس سلسلے کے مقامات',
  orderUrsHeading: 'اِس سلسلے کے عرس',
  orderUrsNote:
    'ہر وہ تقریب جو آرکائیو اُن مقامات پر درج کرتا ہے جہاں اِس سلسلے کی کسی شخصیت کی یادگار ہے۔ تاریخ بعینہٖ اُسی طرح دی گئی ہے جیسے لکھی گئی تھی؛ یہاں کسی تاریخ کو عیسوی تقویم پر منتقل نہیں کیا گیا — یہ کام عرس تقویم کرتی ہے، اور وہ ساتھ یہ بھی بتاتی ہے کہ نتیجہ کتنا تقریبی ہے۔',
  orderUrsUndatedCount: (n: number) => `${n} کی تاریخ درج نہیں`,
  orderUrsNoDate: 'تاریخ درج نہیں',
  orderUrsAnnual: 'سالانہ',
  orderUrsMonthly: 'ماہانہ',
  orderUrsBiannual: 'سال میں دو بار',
  saintObservancesHeading: 'اِس شخصیت کے دن',
  saintObservancesNote:
    'ہر وہ تقریب جو آرکائیو اُس مقام پر درج کرتا ہے جہاں اِس شخصیت کی یادگار ہے — صرف وہ نہیں جن کی تاریخ درج ہے۔ تاریخیں بعینہٖ اُسی طرح دی گئی ہیں جیسے لکھی گئی تھیں۔',
  saintPlaceHeading: 'یہ شخصیت کہاں آرام فرما ہے',
  saintPlaceNote:
    'جگہ کا نام مقام کے اپنے درج شدہ محلِ وقوع سے آیا ہے، جو نیچے بعینہٖ دیا گیا ہے — بشمول اُس صورت میں جہاں وہ بتاتا ہے کہ سروے نے کیا درج نہیں کیا۔',
  saintBiographyHeading: 'اندراج میں درج حالاتِ زندگی',
  saintBiographyNote:
    'یہ تحریر کسی مقام کے اندراج کا حصہ ہے، اِس ہستی کی مستقل سوانح نہیں — یہاں اِس لیے دی گئی ہے کہ یہ اُنہی کے بارے میں ہے۔ ہر اقتباس وہی عنوان رکھتا ہے جو اندراج نے دیا تھا، اور یہ بھی بتاتا ہے کہ کس اندراج سے آیا ہے۔',
  saintBiographyFrom: (entry: string) => `${entry} کے اندراج سے`,
  saintGapsHeading: 'آرکائیو کیا درج نہیں کرتا',
  saintGapsNote:
    'خالی صفحہ چھوڑنے کے بجائے صاف بتا دیا گیا ہے۔ ہر سطر ریکارڈ میں ایک خلا ہے، یہ دعوٰی نہیں کہ ایسی کوئی بات موجود ہی نہیں — اور ہر ایک کو کوئی ماخذ یا میدانی دورہ پُر کر سکتا ہے۔',
  saintGapDates: 'تاریخِ ولادت یا وصال درج نہیں۔',
  saintGapOrder: 'سلسلہ درج نہیں۔',
  saintGapTeachers: 'کوئی مرشد درج نہیں۔',
  saintGapDisciples: 'کوئی مرید یا جانشین درج نہیں۔',
  saintGapObservance: 'کسی قسم کی تقریب درج نہیں۔',
  saintGapPhoto: 'مقام کی کوئی تصویر نہیں۔',
  saintGapBiography: 'مقام کے اپنے اندراج کے سوا کوئی سوانحی تحریر نہیں۔',
  activeFiltersCount: (n: number) => `${n} فلٹرز فعال`,
  nearMe: 'میرے قریب',
  switchToUrdu: 'اردو',
  switchToEnglish: 'English',
  darkMode: 'ڈارک موڈ',
  lightMode: 'لائٹ موڈ',
  skipToContent: 'مواد پر جائیں',
  skipToShrineList: 'مزارات کی فہرست پر جائیں',
  gallery: 'گیلری',
  scrollToTop: 'اوپر جائیں',
  openInMaps: 'نقشے میں کھولیں',
  sufiOrder: 'صوفی سلسلہ',
  sufiOrders: 'صوفی سلسلے',
  spiritualLineage: 'روحانی سلسلہ',
  orderSpan: (from: string, to: string) => `${from} تا ${to} صدی`,
  orderSpanOne: (century: string) => `${century} صدی`,
  orderUndated: (n: number) => `${n} بلا تاریخ`,
  orderUndatedHelp:
    'وہ شخصیات جنہیں ریکارڈ صرف ہجری سن میں رکھتا ہے، یا کسی سن میں نہیں۔ اُن کے لیے مدت شمار نہیں کی جاتی \u2014 یہاں ہجری سن کو تبدیل کرنا اِس آرکائیو کی طرف سے تاریخ گھڑنا ہوگا۔',
  orderTimelineHeading: 'یہ شخصیات کب زندہ تھیں',
  orderTimelineNote:
    'ہر سلاخ اُس سن سے شروع ہوتی ہے جو ریکارڈ میں ولادت کا ہے اور اُس سن پر ختم ہوتی ہے جو وفات کا ہے؛ ہر نقطہ وہ شخصیت ہے جس کے لیے ریکارڈ میں صرف ایک سن موجود ہے۔ جگہ کا تعین انہی سنوں سے ہوتا ہے \u2014 یہاں کچھ بھی ہجری سے تبدیل نہیں کیا گیا، اور خود تاریخیں، اُن تمام قیود کے ساتھ جو مآخذ نے لکھیں، نیچے فہرست میں موجود ہیں۔',
  orderTimelinePointHelp:
    'ریکارڈ اِس شخصیت کے لیے صرف ایک سن دیتا ہے۔ نشان وہی سن ہے، پوری مدتِ حیات نہیں \u2014 سلاخ کھینچنا دوسرے سرے کو گھڑنا ہوتا۔',
  orderTimelineUnplacedLabel: 'محور پر نہیں',
  orderTimelineContradictoryHelp:
    'اِس شخصیت کے لیے درج دونوں سن بیک وقت درست نہیں ہو سکتے \u2014 ولادت وفات کے بعد آتی ہے۔ آرکائیو اُن میں سے کسی ایک کو چننے یا خاموشی سے اُلٹ دینے کے بجائے دونوں کو محور پر نہیں دکھاتا۔',
  orderCompareHeading: 'سلسلے ایک نظر میں',
  orderCompareNote:
    'نیچے دی گئی ہر تعداد، صدی اور جگہ صفحہ کھلتے وقت گراف سے شمار کی جاتی ہے، اِس لیے یہ جدول اُس طرح پرانا نہیں ہو سکتا جیسے کوئی جملہ ہو جاتا ہے۔ ہر سطر یہ بتاتی ہے کہ آرکائیو کے پاس کیا ہے، یہ نہیں کہ سلسلہ کیا ہے۔',
  orderCompareFigures: 'شخصیات',
  orderCompareSpan: 'صدیوں کا دورانیہ',
  orderCompareSites: 'مقامات کی تعداد',
  /* ── What the archive says about an order (OrderPage) ──────────────
     The passages themselves stay in English: they are quotations with a
     citation, which is what i18n rule 7 permits Latin for. The framing around
     them must not be. */
  orderProseHeading: 'آرکائیو کیا کہتا ہے',
  orderProseNote:
    'اسی آرکائیو کے اپنے اندراجات سے اقتباسات، لفظ بہ لفظ، اور ہر اقتباس کے ساتھ وہ اندراج جس سے وہ لیا گیا۔ جہاں دو اندراج ایک ہی بات مختلف الفاظ میں کہتے ہیں، وہاں دونوں رکھے گئے ہیں۔',
  orderProseFrom: 'اندراج:',
  orderDescriptionEditorial:
    'یہ تعارف اسی ویب سائٹ کے لیے لکھا گیا ہے۔ آرکائیو کا کوئی ماخذ اسے بیان نہیں کرتا — نیچے دیے گئے اقتباسات کے برعکس، جو اندراجات سے لفظ بہ لفظ نقل کیے گئے ہیں۔',
  orderAsRecorded: 'ماخذ میں درج',
  orderAsRecordedHelp:
    'سلسلہ بعینہٖ اُن الفاظ میں جو اِس شخصیت کے اپنے ریکارڈ میں لکھے ہیں، بشمول اُس صورت کے جہاں ریکارڈ خود اپنی نفی کرتا ہے۔ یہ اوپر دیے گئے کسی ایک سلسلے کے بجائے خود شخصیت کو بیان کرتا ہے، اِس لیے ایک ہی بار دکھایا جاتا ہے۔',
  teachersHeading: 'اساتذہ',
  disciplesHeading: 'شاگرد و جانشین',
  lineageChainHeading: 'سلسلۂ ارادت',
  lineageChainNote:
    'ایک وقت میں ایک ہی مرشد کے حساب سے، جہاں تک ریکارڈ بغیر قیاس کے لے جاتا ہے۔ قریب ترین پہلے۔',
  lineageChainRoot: 'اِس سے آگے ریکارڈ کسی اُستاد کا نام نہیں لیتا۔',
  lineageChainForks: (n: number) =>
    `یہاں ریکارڈ ${n} اساتذہ کے نام لیتا ہے، اِس لیے سلسلہ ایک ہی لڑی کی صورت آگے نہیں بڑھتا۔`,
  lineageChainCycle: 'یہاں ریکارڈ خود اپنی طرف لوٹ آتا ہے۔',
  lineageChainRemove: (n: number) => `${n} واسطے`,
  discipleOfLabel: 'شاگرد',
  successorOfLabel: 'جانشین',
  /* ── Family (SaintPage) ───────────────────────────────────────────
     This is the half of the pair that earns the closed vocabulary. Where the
     entry says which line the tie runs down, the exact term is used; where it
     does not, both readings are kept rather than one guessed. */
  kinHeading: 'ریکارڈ شدہ رشتہ داری',
  kinNote:
    'خون اور رشتۂ ازدواج کے تعلقات، جیسے اس آرکائیو کے اپنے اندراجات میں درج ہیں، اور ساتھ وہ جملہ جس سے ہر رشتہ اخذ کیا گیا۔ اس ذخیرے میں گدی جتنی بار سلسلۂ بیعت سے منتقل ہوتی ہے، کم از کم اتنی بار خاندان میں بھی۔',
  kinRoleFather: 'والد',
  kinRoleMother: 'والدہ',
  kinRoleSon: 'بیٹا',
  kinRoleDaughter: 'بیٹی',
  kinRoleDaughters: 'بیٹیاں',
  kinRoleGrandfatherPaternal: 'دادا',
  kinRoleGrandfatherUnspecified: 'دادا/نانا',
  kinRoleGrandsonPaternal: 'پوتا',
  kinRoleGrandsonUnspecified: 'پوتا/نواسا',
  kinRoleUnclePaternal: 'چچا',
  kinRoleUncleMaternal: 'ماموں',
  kinRoleUncleUnspecified: 'چچا/ماموں',
  kinRoleNephewPaternal: 'بھتیجا',
  kinRoleNephewMaternal: 'بھانجا',
  kinRoleNephewUnspecified: 'بھتیجا/بھانجا',
  kinRoleFatherInLaw: 'سسر',
  kinRoleSonInLaw: 'داماد',
  kinRoleAncestor: 'جدِ امجد',
  kinRoleDescendant: 'اولاد میں سے',
  kinRoleBrother: 'بھائی',
  kinRoleSister: 'بہن',
  kinRoleWife: 'بیوی',
  kinRoleHusband: 'شوہر',
  kinGenerationDisputed: 'نسل کے شمار پر مآخذ مختلف ہیں',
  kinGenerationDisputedHelp:
    'مآخذ نسب پر متفق ہیں اور اس پر مختلف کہ وہ کتنی پشتوں پر محیط ہے۔ دونوں شمار رکھے گئے ہیں، کسی ایک کو منتخب نہیں کیا گیا۔',
  kinContested: 'دو روایتوں میں سے ایک',
  kinContestedHelp:
    'اندراج اس نسب کو ایک ہی شخصیت کے بارے میں دو متقابل روایتوں میں سے ایک کے طور پر بیان کرتا ہے، طے شدہ امر کے طور پر نہیں۔',
  kinNotesHeading: 'ریکارڈ شدہ، مگر بے نام',
  kinNoteUnnamed:
    'آرکائیو اس خاندانی جانشینی کو درج کرتا ہے مگر دوسری طرف کسی کا نام نہیں لیتا، اس لیے یہاں جوڑنے کے لیے دوسری کوئی شخصیت موجود نہیں۔',
  orderMembers: 'اس سلسلے کے ولی',
  orderMemberCount: (n: number) => `${n} ولی`,
  orderBranchCount: (n: number) => `${n} شاخ`,
  orderBranchesLabel: 'شاخیں',
  orderMembersLabel: 'ارکان',
  orderAlsoIn: 'دیگر سلسلے',
  orderMultiCount: (n: number) => `${n} شخصیات ایک سے زیادہ سلسلوں میں`,
  orderMultiHelp:
    'ایک ہی بزرگ بیک وقت کئی سلسلوں سے وابستہ ہو سکتے ہیں۔ یہاں ہر وابستگی اپنے الگ ماخذ اور اقتباس کے ساتھ درج ہے، کسی دوسری وابستگی سے نکالی گئی نہیں۔',
  orderBranchHelp:
    'شاخ کسی سلسلے کے اندر ایک ذیلی لڑی ہوتی ہے۔ ایک ہی نام کی شاخ دو مختلف سلسلوں میں ہو سکتی ہے، اس لیے شاخ کا مطلب اپنے سلسلے کے ساتھ ہی واضح ہوتا ہے۔',
  shrinesAssociated: 'متعلقہ مزارات',
  alsoKnownAs: 'دیگر نام',
  born: 'پیدائش',
  died: 'وفات',
  era: 'دور',
  floruitLabel: 'دورِ فعالیت',
  floruitHelp:
    'وہ عرصہ جس میں یہ شخصیت متحرک بتائی جاتی ہے، اُن صورتوں میں جہاں مآخذ نہ سنِ پیدائش دیتے ہیں نہ سنِ وفات۔',
  arabicName: 'عربی نام',
  founded: 'قیام',
  notFoundSaint: 'ولی نہیں ملے۔',
  /* ── جانچ ڈیسک (/review, ٹیم کے لیے) ─────────────────────────────────── */
  reviewTitle: 'جانچ ڈیسک',
  reviewIntro:
    'وہ دعاوی جو اِس آرکائیو نے متن سے نکالے اور ابھی کسی شخص نے نہیں پڑھے، ہر ایک کے ساتھ وہ شہادت جس سے وہ نکالا گیا۔ یہاں دیا گیا فیصلہ دعوے کے بارے میں ایک رائے ہے — اِس صفحے پر کوئی چیز آرکائیو میں تبدیلی نہیں کرتی۔',
  reviewGateNote: 'یہ صفحہ منصوبے کی ٹیم کے لیے ہے۔ قطار دیکھنے کے لیے ٹیم کا ربط استعمال کریں۔',
  reviewEmpty: 'جانچ کے لیے کچھ باقی نہیں۔',
  reviewLoading: 'قطار لائی جا رہی ہے…',
  reviewClaimDiscipleOf: 'کو اِن کا مرید درج کیا گیا ہے:',
  reviewClaimSuccessorOf: 'کو اِن کا جانشین درج کیا گیا ہے:',
  reviewClaimBelongsToOrder: 'کو اِس سلسلے میں درج کیا گیا ہے:',
  reviewClaimBiography: 'یہ تاریخیں اور القاب متن سے نکالے گئے',
  reviewEvidence: 'ماخذ',
  reviewConfirm: 'تصدیق',
  reviewReject: 'رد',
  reviewUnsure: 'مزید کام درکار',
  reviewNotePlaceholder: 'شہادت کس بات کی تائید کرتی ہے اور کس کی نہیں…',
  reviewProgress: 'درج شدہ فیصلے',
  reviewDownload: 'فیصلے ڈاؤن لوڈ کریں (CSV)',
  reviewDownloadHelp:
    'یہ CSV جانچ ورک شیٹ کے اپنے کالموں میں ہے۔ اِسے ہاتھ سے درآمد کریں — یہ صفحہ شیٹ میں کبھی نہیں لکھتا۔',
  reviewClear: 'میرے فیصلے صاف کریں',
  reviewStale:
    'اِس دعوے کی شہادت فیصلہ درج ہونے کے بعد بدل گئی، اِس لیے وہ فیصلہ اب اِس پر لاگو نہیں۔',
  reviewNoQuote:
    'اِس دعوے کے لیے کوئی اقتباس محفوظ نہیں ہوا۔ اِسے ماخذ کے مقابل جانچیں، یا «مزید کام درکار» کا نشان لگائیں۔',
  notFoundOrder: 'سلسلہ نہیں ملا۔',
  aboutThisSaint: 'اس ولی کے بارے میں',
  viewOrder: 'روحانی سلسلہ دیکھیں',
  networkConnections: 'نیٹ ورک روابط',
  description: 'توضیح',
  graphExplorerTitle: 'اولیاء اور سلسلے',
  graphExplorerIntro:
    'ان مزارات کے پیچھے صوفی سلسلوں اور اولیاء کو دیکھیں، اور جانیں کہ وہ ایک دوسرے سے کیسے جڑے ہیں۔',
  graphExplorerOrders: 'صوفی سلسلے',
  graphExplorerAllFigures: 'آرکائیو کی شخصیات',
  graphFigureFilterLabel: 'شخصیت تلاش کریں',
  graphFigureFilterPlaceholder: 'نام، لقب یا روایت…',
  graphFigureFilterClear: 'صاف کریں',
  graphFigureFilterCount: (shown: number, total: number) => `${total} میں سے ${shown}`,
  graphFigureFilterEmpty: 'اس سے مطابقت رکھنے والی کوئی شخصیت نہیں۔',
  graphCenturyFilterLabel: 'صدی',
  graphCenturyAll: 'کوئی بھی',
  graphCenturyUndated: 'بلا تاریخ',
  graphCenturyUndatedHelp:
    'وہ شخصیات جنہیں ریکارڈ صرف ہجری تقویم میں رکھتا ہے، یا کسی سن میں نہیں رکھتا۔ ہجری سن کو یہاں صدی میں بدلنا آرکائیو کی طرف سے تاریخ گھڑنا ہوتا، اِس لیے اُنہیں قیاس کے بجائے الگ گروہ میں رکھا گیا ہے — اور یہ آرکائیو کی تقریباً نصف شخصیات ہیں۔',
  graphLineageOnlyHeading: 'سلسلے میں نامزد، یہاں دستاویز نہیں',
  graphLineageOnlyNote:
    'وہ اساتذہ اور مشائخ جن کے نام کسی دوسری شخصیت کے درج شدہ سلسلۂ ارادت میں آتے ہیں اور جن کا کوئی مقام اِس آرکائیو میں درج نہیں۔ اُنہیں آرکائیو کے اندراجات میں شمار نہیں کیا جاتا — وہ یہاں اِس لیے ہیں کہ سلسلہ پہلے ہی ایسے مرشد پر نہ رُک جائے جن کا مزار پاکستان میں درج نہیں۔ اب تک اُن تک پہنچنے کا واحد راستہ وہی زنجیر تھی جس میں اُن کا نام آتا ہے۔',
  graphLineageOnlyTeacherOf: (name: string) => `${name} کے اُستاد`,
  graphLineageOnlyTeacherOfMore: (name: string, n: number) => `${name} اور ${n} دیگر کے اُستاد`,
  graphLineageOnlyDiscipleOf: (name: string) => `${name} کے شاگرد`,
  graphLineageOnlyDiscipleOfMore: (name: string, n: number) => `${name} اور ${n} دیگر کے شاگرد`,
  /* Urdu puts the possessor first and the relation after it — "‹name› کے
     والد", not English's "father of ‹name›" — and the relation then has to
     agree with it. That is not a کے/کی coin-flip: a masculine noun ending in
     -ا goes oblique, so «گرو نانک کے بیٹا» is simply wrong and the form is
     «کے بیٹے». The honorific plural is used throughout rather than the
     singular «کا بیٹا», which is both grammatical and the right register for
     figures the archive venerates — and it is the form the project's own
     dictionary already uses («رام اور سیتا کے بیٹے»).

     Kept as a table keyed by the finished role label rather than composed,
     because the chip on a figure's page needs the nominative («بیٹا») and this
     needs the oblique, and one string cannot be both. A role missing from the
     table falls back to کے + the label, which is correct for every invariant
     noun in the set (والد، دادا، چچا، ماموں، سسر، داماد، جدِ امجد). */
  graphLineageOnlyKinOf: (role: string, name: string) => `${name} ${kinGenitive(role)}`,
  graphLineageOnlyKinOfMore: (role: string, name: string, n: number) =>
    `${name} اور ${n} دیگر ${kinGenitive(role)}`,
  graphCenturyNote:
    'صدی شخصیت کے درج شدہ سنِ وفات سے لی گئی ہے، اور جہاں وفات درج نہیں وہاں سنِ پیدائش سے۔ ہجری تقویم سے کوئی تبدیلی نہیں کی گئی۔',
  lineageUnreviewed: 'غیر نظر ثانی شدہ',
  titlesLabel: 'القاب و خطابات',
  disputedDatesLabel: 'مآخذ متفق نہیں',
  disputedVersus: 'بمقابلہ',
  yearsApart: 'برس کا فرق',
  lineageUnreviewedHelp:
    'اِس آرکائیو کے اپنے مآخذ سے نکالا گیا اور اقتباس کی جانچ ہو چکی ہے، مگر ابھی کسی مدیر نے نہیں پڑھا۔',
  /* ── شخصیت کا ماخذ (SaintPage) ───────────────────────────────────────── */
  figureBiographyNote:
    'اوپر دی گئی تاریخیں، القاب اور دیگر نام ہاتھ سے درج نہیں کیے گئے بلکہ نیچے دیے گئے ماخذ سے نکالے گئے ہیں۔',
  figureProvenanceReadFrom: 'ماخذ',
  figureLineageOnly: 'سلسلے میں نامزد، یہاں اندراج نہیں',
  figureLineageOnlyHelp:
    'اِس شخصیت کا کوئی مقام اِس آرکائیو میں درج نہیں، اِس لیے اُنہیں آرکائیو کے اندراجات میں شمار نہیں کیا جاتا۔ وہ گراف میں اِس لیے موجود ہیں کہ کسی دوسری شخصیت کے درج شدہ سلسلے میں اُن کا نام آتا ہے — ورنہ سلسلۂ ارادت پہلے ہی ایسے مرشد پر رُک جاتا جن کا مزار یہاں درج نہیں۔',
  figureLineageOnlyNote:
    'اِس شخصیت کا اپنا کوئی اندراج اِس آرکائیو میں نہیں۔ نیچے جو کچھ ہے وہ دوسری شخصیات کے ریکارڈ اُن کے بارے میں جو کہتے ہیں، اُس سے آیا ہے۔',
  graphLineageNote: 'درج شدہ استاد و مرید کے رشتے:',
  graphExplorerFiguresNote:
    'ہر شخصیت کو اُس کے مطابق درجہ بند کیا گیا ہے جو ریکارڈ اُس کے بارے میں کہتا ہے۔ یہ آرکائیو چھ روایات کا احاطہ کرتا ہے، اِس لیے یہاں ہر شخصیت صوفی ولی نہیں۔',
  graphLineageHeading: 'استاد و شاگرد کے تعلقات',
  graphLineageScopeOrder: (order: string, n: number) => `${order} میں (${n})`,
  graphLineageScopeAll: (n: number) => `تمام درج شدہ رشتے (${n})`,
  graphLineageScopeLabel: 'کون سے رشتے دکھائے جائیں',
  graphLineageUnaffiliated: (n: number) =>
    `اِن میں سے ${n} رشتے کسی ایسے سلسلے سے تعلق نہیں رکھتے جو یہ آرکائیو درج کرتا ہے — سکھ یا ہندو روایت میں تعلیم کی لڑی ہوتی ہے، سلسلہ نہیں، اور زنجیر میں نامزد کچھ صوفی اساتذہ کا سلسلہ یہاں درج نہیں۔`,

  // ── عرس تقویم ──────────────────────────────────────────────────────────
  welcomeExploreMore: 'آرکائیو میں مزید',
  articleUrduMissing:
    'اِس اندراج کا اردو متن ابھی نہیں لکھا گیا۔ نیچے دیا گیا مضمون انگریزی میں ہے — روکنے کے بجائے جوں کا توں دکھایا گیا ہے۔',
  almanacTitle: 'عرس تقویم',
  almanacIntro:
    'جب مزارات پر اجتماع ہوتا ہے۔ عرس بزرگ کے وصال کا دن ہے، جو وصل کے جشن کے طور پر منایا جاتا ہے — اور ان میں سے اکثر مقامات کے لیے یہی سال کا وہ دن ہے جب پورا حلقہ لوٹ کر آتا ہے۔',
  almanacHonestyHeading: 'یہ تقویم کیا بتا سکتی ہے اور کیا نہیں',
  almanacApproximateNote:
    'ہجری تاریخوں کے ساتھ عیسوی تاریخ تخمینی طور پر دی گئی ہے۔ عرس کا آغاز مقامی رویتِ ہلال پر ہوتا ہے، اس لیے اصل دن ایک دو دن آگے پیچھے ہو سکتا ہے۔ سفر سے پہلے مزار سے تصدیق کر لیں۔',
  filterByPlace: 'مقام',
  ariaFilterByPlace: 'مقام کے اعتبار سے چھانٹیں',
  almanacMorePlaces: (n: number) => `${n} مزید`,
  almanacFewerPlaces: 'کم دکھائیں',
  almanacFilterEmpty: 'اِن شرائط پر آرکائیو کا کوئی مقام پورا نہیں اترتا۔',
  almanacUpcoming: 'آنے والے',
  almanacNext12Months: 'آئندہ بارہ مہینے',
  almanacApproximate: 'تخمینی',
  almanacApproximateFull: 'تخمینی — رویتِ ہلال سے متعین',
  almanacExactDate: 'مقررہ تقویمی تاریخ',
  almanacHijriLabel: 'ہجری',
  almanacSeasonalHeading: 'صرف موسم درج ہے',
  almanacSeasonalNote:
    'ان تقریبات کے لیے آرکائیو میں موسم درج ہے، مہینہ نہیں — اس لیے انہیں تقویم پر نہیں رکھا جا سکتا۔',
  almanacUndatedHeading: 'تقریب ہوتی ہے، مگر تاریخ درج نہیں',
  almanacUndatedNote:
    'ان مزارات پر عرس یا سالانہ تقریب ہوتی ہے۔ کسی نے یہ نہیں لکھا کہ کب۔ یہ اس تقویم کا سب سے بڑا خلا ہے، اور اسے پُر کرنا سب سے آسان بھی ہے۔',
  almanacNoObservanceHeading: 'کوئی تقریب درج نہیں',
  almanacCoverageHeading: 'احاطہ',
  almanacCoverageDayPrecision: 'دن اور مہینے کے ساتھ',
  almanacCoverageMonthPrecision: 'صرف مہینے کے ساتھ',
  almanacCoverageSeasonal: 'صرف موسم کے ساتھ',
  almanacCoverageUndated: 'تقریب ہوتی ہے، تاریخ درج نہیں',
  almanacCoverageNone: 'کوئی تقریب درج نہیں',
  /* "X میں سے Y" reads "Y out of X" — the total comes first. Built from the
       English order ("32" + "میں سے" + "169" + "مقامات") it said "169 places
       out of 32", which is not clumsy phrasing but a false number. */
  almanacCoverageTotal: (dated: number, total: number) => `${total} میں سے ${dated} مقامات`,
  /* ── Places (Track B) — drafts, not reviewed by a fluent speaker ──────── */
  placeFiguresHeading: 'یہاں جن ہستیوں کی یاد منائی جاتی ہے',
  placeFiguresNote:
    'ہر ہستی یہاں اِس لیے درج ہے کہ اِس مقام کے کسی مقام و مزار کے ریکارڈ میں اُن کی یادگاری موجود ہے۔ جہاں ایک ہی ہستی کی یاد ایک سے زیادہ مقامات پر منائی جاتی ہے، وہاں نام ایک بار آتا ہے اور مقامات اُس کے ساتھ درج ہوتے ہیں۔',
  placeObservancesHeading: 'یہاں منائے جانے والے دن',
  placeObservancesNote:
    'اِس مقام کے مزارات پر آرکائیو میں درج ہر تقریب — صرف وہ نہیں جن کی تاریخ معلوم ہے۔ تاریخیں بعینہٖ اُسی طرح دی گئی ہیں جیسے لکھی گئی تھیں؛ یہاں کچھ بھی گریگورین تقویم پر منتقل نہیں کیا گیا۔',
  placesTitle: 'مقامات',
  placeKicker: 'مقام',
  placeIntro:
    'ایک مقام پر آرکائیو کیا درج کرتا ہے — کون سے مزارات، کون سی روایات، اور جو تاریخیں پڑھی جا سکتی ہیں اُن کا دورانیہ۔',
  placeSitesHeading: 'یہاں درج مزارات',
  placeTraditionsHeading: 'روایات',
  placeSpanHeading: 'درج تاریخیں',
  placeSpanNone: 'یہاں کسی مزار کی ایسی تاریخ درج نہیں جو یہ آرکائیو پڑھ سکے۔',
  placeNotFound: 'اِس نام کا کوئی مقام درج نہیں۔',
  placesIntro:
    'آرکائیو کہاں ہے — ہر اندراج کے مقام کے خانے سے گنا گیا۔ ایک مزار شہر اور اُس کے ضلع، دونوں کے تحت آ سکتا ہے، کیونکہ وہ دونوں میں ہے۔',
  placeSiteCount: (n: number) => `${n} مزارات`,
  placeSpan: (from: number, to: number) => `${from}ء–${to}ء`,
  placesUnplaced: (n: number) => `${n} مزارات کا ایسا مقام درج ہے جسے یہ آرکائیو پہچان نہیں سکتا۔`,
  /* ── Accessible names ─────────────────────────────────────────────────
       Drafted here, not reviewed by a fluent speaker. Same standing as the
       dictionary drafts: usable and honest about being a draft. */
  ariaBreadcrumb: 'صفحہ راستہ',
  ariaShrineBrowser: 'مزارات کی فہرست اور چھانٹ',
  ariaExpandSheet: 'مزارات کی فہرست کھولیں',
  ariaCollapseSheet: 'مزارات کی فہرست بند کریں',
  ariaShrineList: 'مزارات کی فہرست',
  ariaFiltersActive: 'فلٹرز فعال',
  ariaClearSearch: 'تلاش صاف کریں',
  ariaFilterByCategory: 'روایت کے مطابق چھانٹیں',
  ariaFilterByRegion: 'علاقے کے مطابق چھانٹیں',
  ariaFilterByProvenance: 'ماخذ کے مطابق چھانٹیں',
  ariaReadingProgress: 'مطالعے کی پیش رفت',
  ariaPreviousImage: 'پچھلی تصویر',
  ariaNextImage: 'اگلی تصویر',
  ariaInteractiveMap: 'مزارات کا متحرک نقشہ',
  ariaOpenSidebar: 'فہرست کھولیں',
  swUpdateAvailable: 'نیا نسخہ دستیاب ہے',
  mapZoomIn: 'قریب کریں',
  mapZoomOut: 'دور کریں',
  mapLayers: 'نقشے کی تہیں',
  mapResetView: 'نظر بحال کریں',
  mapResetViewLabel: 'نقشے کو ابتدائی نظر پر بحال کریں',
  mapLayerStreetsEnglish: 'سڑکیں، انگریزی نام',
  mapLayerVoyager: 'وائجر',
  mapLayerDark: 'تاریک',
  mapLayerLight: 'روشن',
  mapLayerStreets: 'سڑکیں',
  mapLayerSatellite: 'سیٹلائٹ',
  mapLayerTopo: 'نقشۂ ارضی',
  mapLayerFrom: (name: string, provider: string) => `${name} (${provider})`,
  ariaCategoryOf: (category: string) => `روایت: ${category}`,
  ariaMapShowing: (name: string) => `${name} کے مقام کا نقشہ`,
  ariaExternalMapShowing: (name: string) => `گوگل میپس پر ${name} کا مقام`,
  galleryImageLabel: (index: number, action: string) => `تصویر ${index}: ${action}`,
  almanacSourceLabel: 'اندراج',
  almanacFigureLabel: 'یادگار',
  almanacJumpToMonth: 'مہینے پر جائیں',
  aboutTitle: 'اِس آرکائیو کے بارے میں',
  aboutLede:
    'پاکستان بھر کے مقدس مقامات کا ایک عوامی، دو لسانی ریکارڈ — مسلم مزارات، ہندو مندر، سکھ گوردوارے، نانک پنتھی و اُداسی دربار، جین مندر اور سیکولر یادگاریں — اِس نیت سے مرتب کیا گیا کہ اِس کا حوالہ دیا جا سکے، اور یہ بھی صاف بتایا جا سکے کہ ابھی کیا معلوم نہیں۔',
  aboutStateHeading: 'اِس آرکائیو کے پاس کیا ہے',
  aboutStateNote:
    'اِس حصے کا ہر عدد اُسی ڈیٹا سے شمار ہوتا ہے جو ابھی اِس صفحے نے پڑھا ہے، اِس لیے یہ آرکائیو سے اُس طرح جدا نہیں ہو سکتا جیسے کوئی جملہ ہو جاتا ہے۔ ہر عدد بتاتا ہے کہ آرکائیو میں کیا درج ہے \u2014 یہ اندازہ نہیں کہ باہر کیا موجود ہے۔',
  aboutStateSites: 'مقامات',
  aboutStateSources: 'حوالہ شدہ مآخذ',
  aboutStatePhotos: 'تصاویر',
  aboutStateTraditions: 'روایات',
  aboutKnowsHeading: 'یہ جو کہتا ہے وہ کیسے جانتا ہے',
  aboutKnowsNote:
    'ہر اندراج کے ساتھ درج ہے کہ اُس کے پیچھے کس قسم کی شہادت ہے۔ میدانی دورہ اور ویب سے مرتب کردہ معلومات، دونوں دیانت دار ہیں مگر ایک جیسے نہیں، اِس لیے آرکائیو دونوں کو برابر کیے بغیر بتاتا ہے کہ کون سی ہے۔',
  aboutThinHeading: 'یہ کہاں کمزور ہے',
  aboutThinNote: 'خلا، اعداد کی صورت میں۔ کوئی آرکائیو اُتنا ہی کارآمد ہے جتنا اپنی حدود کا بیان۔',
  aboutScopeHeading: 'دائرہ',
  aboutScopeBody:
    'ہر اندراج وہی درج کرتا ہے جو ماخذ کہتا ہے، اور ماخذ کا نام بھی۔ ہر اندراج پر یہ درج ہے کہ وہ کس بنیاد پر قائم ہوا — میدانی تصدیق سے لے کر ویب سے ترتیب تک — تاکہ قاری صفحہ چھوڑے بغیر اُس کا وزن جانچ سکے۔',
  aboutMethodHeading: 'یہ کیسے بنتا ہے',
  aboutMethodSheet:
    'اندراجات ایک اسپریڈ شیٹ میں رکھے جاتے ہیں اور یہ سائٹ اُنہیں لوڈ کے وقت پڑھتی ہے، اِس لیے کوئی تصحیح فوراً قاری تک پہنچتی ہے۔',
  aboutMethodProvenance:
    'ہر دعوے کا کسی ماخذ تک پہنچنا مقصود ہے۔ جہاں ماخذ آپس میں مختلف ہوں، آرکائیو خود فیصلہ کرنے کے بجائے اختلاف درج کرتا ہے۔',
  /* ── یہ آرکائیو کیا جانتا ہے (/about) ─────────────────────────────────── */
  aboutGraphHeading: 'یہ آرکائیو کیا جانتا ہے',
  aboutGraphNote:
    'اوپر کے اندراجات آرکائیو کے مقامات ہیں۔ یہ اُس کا گراف ہے — اُن کے پیچھے کی شخصیات، سلسلے، مقامات اور تقاریب، اور اُن کے باہمی رشتے۔ یہ سب گراف ہی سے شمار کیے جاتے ہیں۔',
  aboutGraphFigures: 'شخصیات جن کا مقام یہاں درج ہے',
  aboutGraphLineageOnly: 'سلسلے میں نامزد، جن کا مقام یہاں درج نہیں',
  aboutGraphOrders: 'صوفی سلسلے',
  aboutGraphPlaces: 'مقامات',
  aboutGraphObservances: 'درج شدہ تقاریب',
  aboutGraphSources: 'الگ الگ مآخذ',
  aboutGraphTitles: 'القاب و خطابات',
  aboutGraphLineageLinks: 'درج شدہ استاد و شاگرد کے رشتے',
  aboutTrustHeading: 'اور کتنے یقین سے جانتا ہے',
  aboutTrustNote:
    'وہی گراف، اِس اعتبار سے گنا گیا کہ اُس کا کتنا حصہ کسی شخص نے واقعی جانچا ہے۔ مشین سے نکالے گئے دعاوی کے ساتھ وہ اقتباس بھی موجود ہے جس سے وہ نکالے گئے، اور جہاں بھی آئیں اُن پر «غیر نظر ثانی شدہ» کا نشان ہوتا ہے؛ اُن میں سے کوئی چھپایا نہیں گیا، اور کوئی طے شدہ بھی نہیں بتایا گیا۔',
  aboutTrustBiographies:
    'شخصیات جن کی تاریخیں اور القاب مشین نے متن سے نکالے، مدیر نے ابھی نہیں پڑھے',
  aboutTrustLineage: (total: number) =>
    `درج شدہ ${total} استاد و شاگرد کے رشتوں میں سے غیر نظر ثانی شدہ`,
  aboutTrustMemberships: (total: number) =>
    `درج شدہ ${total} سلسلہ وابستگیوں میں سے غیر نظر ثانی شدہ`,
  aboutTrustDisputed: 'شخصیات جن کے مآخذ متضاد تاریخیں دیتے ہیں — جو حل کیے بغیر درج کی گئی ہیں',
  aboutMethodUrdu:
    'اردو ایڈیشن ایک مکمل ایڈیشن ہے، ترجمے کی تہہ نہیں۔ مشینی ترجمے اُس وقت تک مسودہ شمار ہوتے ہیں جب تک کوئی اہلِ زبان اُن کی تصدیق نہ کر دے۔',
  aboutMethodGaps: 'آرکائیو جو نہیں جانتا، وہ بھی اُس کے ساتھ شائع کیا جاتا ہے جو جانتا ہے۔',
  aboutLicenceHeading: 'لائسنس اور دوبارہ استعمال',
  aboutLicenceData: 'ڈیٹا سیٹ',
  aboutLicenceCode: 'سائٹ اور پائپ لائن کا کوڈ',
  aboutLicenceAttributionLabel: 'ڈیٹا دوبارہ استعمال کرتے وقت لازمی حوالہ',
  aboutCiteHeading: 'حوالہ کیسے دیں',
  aboutCiteArchive: 'مکمل آرکائیو',
  aboutCiteEntry: 'کوئی ایک اندراج',
  aboutCiteNote:
    'وہ تاریخ بھی شامل کریں جس دن آپ نے صفحہ دیکھا۔ یہ آرکائیو ایک زندہ ماخذ سے پڑھتا ہے، اِس لیے اندراج آپ کے حوالے کے بعد بھی بدل سکتا ہے۔',
  aboutCorrectionsHeading: 'تصحیحات',
  aboutCorrectionsBody:
    'تصحیحات کا خیر مقدم ہے اور اُن کا اعتراف کیا جاتا ہے۔ اگر یہاں کچھ غلط ہے — کوئی تاریخ، محلِ وقوع، سلسلہ یا نام — تو براہِ کرم بتائیں۔',
  aboutCopyDone: 'نقل ہو گیا',
  aboutCopy: 'نقل کریں',
  coverageIntro:
    'اِس صفحے کا ہر عدد شائع شدہ ڈیٹا سے شمار کیا گیا ہے، اندازہ نہیں۔ جہاں آرکائیو خاموش ہے، وہاں یہ بات بھی درج ہے۔',
  coverageSupportHeading: 'ہر اندراج کی بنیاد',
  coverageInfoHeading: 'ہر اندراج کی گہرائی',
  coverageTraditionHeading: 'شامل روایات',
  coverageSourcesHeading: 'حوالے',
  coverageEntriesNoun: (_n: number) => 'اندراجات',
  coverageSourcesWithAny: 'کتابیات رکھنے والے',
  coverageSourcesWithThree: 'تین یا زیادہ حوالے دینے والے',
  coverageSourcesWithNone: 'کوئی حوالہ نہ دینے والے',
  coverageSourcesItems: 'کل حوالے',
  /* ── آرکائیو کس پر قائم ہے (/coverage) ────────────────────────────────── */
  coverageRestsHeading: 'یہ آرکائیو کس پر قائم ہے',
  coverageRestsNote:
    'اِس کے حوالے دوسری طرف سے گنے گئے ہیں — یہ نہیں کہ ہر اندراج کے پاس کتنے حوالے ہیں، بلکہ یہ کہ کتنے اندراج ایک ہی ماخذ پر ٹیکے ہوئے ہیں۔ یہاں کے ہر عدد کی طرح یہ بھی ہر بار شائع شدہ ڈیٹا سے شمار ہوتا ہے۔',
  coverageRestsDistinct: 'الگ الگ مآخذ',
  coverageRestsShared: 'مآخذ جو ایک سے زیادہ اندراجات میں درج ہیں',
  coverageRestsSingle: 'اندراجات جو ایک ہی ماخذ پر قائم ہیں',
  coverageRestsEvery: 'تمام مآخذ، مکمل فہرست',
  coverageRestsEveryNote: (n: number) =>
    `باقی ${n} مآخذ میں سے ہر ایک صرف ایک اندراج میں استعمال ہوا ہے۔ اِنہیں گنتی میں سمیٹنے کے بجائے نام بہ نام دیا گیا ہے: جو دعویٰ ایسے مأخذ پر کھڑا ہو جسے آرکائیو میں اور کہیں استعمال نہیں کیا گیا، اُسے دیکھ سکنا اہم ہے۔`,
  coverageRestsShow: 'سب دکھائیں',
  coverageRestsHide: 'چھپائیں',
  sourceAlsoCitedBy: (n: number) => `${n} دیگر اندراجات میں بھی درج`,
  coverageWorksHeading: 'کتاب کے اعتبار سے شمار',
  coverageWorksNote:
    'نیچے دی گئی فہرست حوالوں کو گنتی ہے، اور یہی وہ چیز ہے جو کوئی اندراج دراصل نقل کرتا ہے۔ مگر اُن کے پیچھے موجود کتابوں کے اعتبار سے گنیں تو آرکائیو چند کتابوں پر اُس سے کہیں زیادہ انحصار کرتا ہے جو کوئی ایک سطر دکھا سکے — ایک کتاب دس مختلف حوالوں کے تحت آتی ہے۔',
  coverageWorksRecords: (n: number) => `${n} حوالوں میں`,
  coverageRestsTop: 'وہ مآخذ جن پر اِس کا بڑا حصہ قائم ہے',
  coverageRestsEntryCount: (n: number) => `${n} اندراج`,
  coverageRestsTail: (n: number) =>
    `${n} مزید مآخذ ایسے ہیں جن کا حوالہ صرف ایک ایک اندراج میں آتا ہے؛ وہ یہاں درج نہیں۔`,
  coverageRestsCaveat:
    'کسی ماخذ کا کئی اندراجات میں آنا کمزوری نہیں — ایک بنیادی حوالہ بار بار آنا ہی چاہیے۔ دیکھنے کی بات یہ ہے کہ اِس سے پتہ چلتا ہے کہ ایک غلطی کہاں تک پھیل سکتی ہے۔',
  coveragePhotosHeading: 'عکس بندی',
  coveragePhotosWithNone: 'بغیر تصویر والے',
  coveragePhotosItems: 'کل تصاویر',
  coverageDatesHeading: 'تاریخیں',
  coverageDatesWithYear: 'سنِ تعمیر درج کرنے والے',
  coverageDatesExact: 'اِن میں سے جنہیں آرکائیو خود متعین کہتا ہے',
  coverageDatesHedged: 'جن کی تاریخ کے ساتھ تحریری تحفظ درج ہے',
  coverageLocationHeading: 'متعین مقام',
  coverageLocationApprox: 'جن کی اپنی تحریر پن کو تخمینی بتاتی ہے',
  coverageObservancesHeading: 'عرس اور میلے',
  coverageObservancesWithText: 'عرس یا میلہ درج کرنے والے',
  coverageObservancesWithNone: 'کوئی عرس درج نہ رکھنے والے',
  coverageUnrecorded: 'درج نہیں',
  coverageWhyHeading: 'یہ کیوں شائع کیا گیا',
  coverageWhy:
    'کوئی آرکائیو اُتنا ہی کارآمد ہے جتنا اپنی حدود کا بیان۔ ریپازٹری میں لکھا نوٹ پرانا ہو جاتا ہے؛ ڈیٹا سے شمار ہونے والا صفحہ نہیں ہو سکتا۔ اگر یہاں کوئی عدد کم لگے تو وہی خلا ہے، صاف صاف بیان کیا گیا۔',
  saintNextUrs: 'اگلا عرس',
  saintNextUrsLink: 'تقویم دیکھیں',
  almanacNothingUpcoming: 'آئندہ بارہ مہینوں میں کوئی متعین تاریخ والی تقریب نہیں۔',
  almanacSeasonSpring: 'بہار',
  almanacSeasonSummer: 'گرما',
  almanacSeasonAutumn: 'خزاں',
  almanacSeasonWinter: 'سرما',
  almanacContribute:
    'کیا آپ ان میں سے کوئی تاریخ جانتے ہیں؟ تصحیح اور اضافے کا خیرمقدم ہے — یہاں درج ہر تاریخ کسی جاننے والے ہی سے آئی ہے۔',
  almanacDownloadIcs: 'تقویم میں شامل کریں',
  almanacDownloadIcsHint:
    'متعین تاریخ والی تقریبات ڈاؤن لوڈ ہوتی ہیں۔ ہجری تاریخوں کے ساتھ ان کی تخمینی نوعیت نوٹ میں درج ہوتی ہے۔',
  almanacRule: 'تکرار درج ہے، مقررہ تاریخ نہیں',
  almanacMonthOnly: 'مہینہ درج ہے، دن درج نہیں',
  /* ── تقویمی منظر — مسودہ، کسی روانی رکھنے والے نے نہیں دیکھا ──────────── */
  almanacViewList: 'فہرست',
  almanacViewCalendar: 'تقویم',
  ariaAlmanacView: 'اگلے بارہ مہینے کس طرح دکھائے جائیں',
  almanacCalendarNote:
    'خانہ ایک دن ہے، اِس لیے خانے پر صرف وہ تقریب آتی ہے جس کا دن آرکائیو میں درج ہے۔ جن کا صرف مہینہ درج ہے وہ جدول کے نیچے، بغیر کسی خانے کے، دی گئی ہیں — اُنہیں پہلی یا پندرہ تاریخ پر رکھنا اِس آرکائیو کی طرف سے تاریخ گھڑنا ہوگا۔',
  almanacCalendarCaption: 'وہ تقاریب جن کا دن درج ہے',
  almanacCalendarPrev: 'پہلے',
  almanacCalendarNext: 'بعد',
  /* تقریب / تقاریب — the broken plural, which Urdu does mark even though it
     has no -s. A bare "۱ تقاریب" reads as a typo to a native eye. */
  almanacCalendarPlaced: (n: number) =>
    n === 1 ? 'اِس مہینے ۱ تقریب کا دن درج ہے' : `اِس مہینے ${n} تقاریب کا دن درج ہے`,
  almanacCalendarDayCount: (n: number) => (n === 1 ? '۱ تقریب' : `${n} تقاریب`),
  almanacCalendarShowMonth: 'پورا مہینہ دکھائیں',
  almanacCalendarNoDays: 'اِس مہینے کسی تقریب کا دن درج نہیں۔',
  almanacCalendarUnplacedHeading: 'اِس مہینے میں، دن درج نہیں',
  almanacCalendarUnplacedNote:
    'آرکائیو اِن کا مہینہ درج کرتا ہے، دن نہیں، اِس لیے یہ جدول پر نہیں بلکہ اُس کے ساتھ دی گئی ہیں۔ ہجری مہینہ دو عیسوی مہینوں پر پھیلتا ہے، اِسی لیے ایک تقریب دونوں کے نیچے آ سکتی ہے۔',
  tourTotalDistance: 'کل فاصلہ',
  tourEstDriveTime: 'ڈرائیو کا تخمینی وقت',
  tourNextStopDistance: 'اگلے مقام تک',
  tourPreviewTitle: 'دورے کا خلاصہ',
  tourStartButton: 'دورہ شروع کریں',
  tourBackButton: 'واپس',
  hoursAbbrev: 'گھ',
  minutesAbbrev: 'م',
  resumeTourPrompt: 'جہاں چھوڑا تھا وہاں سے جاری رکھیں',
  resumeButton: 'جاری رکھیں',
  dismiss: 'بند کریں',
  tourCompletedBadge: 'مکمل',
  tourInProgressBadge: 'جاری',
  audioPlay: 'آواز چلائیں',
  audioPause: 'آواز روکیں',
  audioStop: 'آواز بند کریں',
  audioStatusPlaying: 'چل رہا ہے',
  audioStatusPaused: 'رکا ہوا',
  autoplayLabel: 'خودکار چلانا',
  autoplayPause: 'خودکار چلانا روکیں',
  autoplayResume: 'خودکار چلانا دوبارہ شروع کریں',
  locationUnavailable: 'مقام دستیاب نہیں',
  nearestToYou: 'آپ کے قریب ترین',
  relatedToursHeading: 'یہ بھی دیکھیں',
  partOfTour: 'رہنما دورے کا حصہ',
  viewTour: 'دورہ دیکھیں',
  printItinerary: 'دورے کا پروگرام پرنٹ کریں',
  filterByTradition: 'روایت',
  filterByRegion: 'علاقہ',
  filterByTheme: 'موضوع',
  filterByEra: 'دور',
  categoryLabel: 'زمرہ',
  locationLabel: 'مقام',
  saintLabel: 'ولی',
  districtLabel: 'ضلع',
  provinceLabel: 'صوبہ',
  cityLabel: 'شہر',
  eventsLabel: 'تقریبات',
  nameLabel: 'نام',
  latitudeLabel: 'عرض بلد',
  longitudeLabel: 'طول بلد',
  imageLabel: 'تصویر',
  footerCredit: 'پاکستان کے صوفی مزارات · ہارورڈ ریسرچ پراجیکٹ',
  citeTitle: 'اس اندراج کا حوالہ',
  citeTextLabel: 'متن',
  citeCopy: 'کاپی کریں',
  citeArchive: 'ڈیجیٹل آرکائیو',
  citeRetrieved: 'کو دیکھا گیا',
  citeSupportLevel: 'تصدیق کا درجہ',
  obsHeading: 'عرس اور تقریبات',
  obsViewAlmanac: 'عرس تقویم میں دیکھیں',
  fieldSiteType: 'تعمیری صورت',
  locationNotRecorded: 'محلِ وقوع درج نہیں — یہ اندراج ابھی نقشے پر نہیں ہے۔',
  srcNotesHeading: 'جہاں ماخذ خود اپنے بیان سے ٹکراتا ہے',
  srcNotesIntro:
    'آرکائیو اپنے ماخذ کو ویسا ہی درج کرتا ہے جیسا وہ ہے — تضادات سمیت۔ نیچے کچھ بھی حل یا حذف نہیں کیا گیا — ہر شق سروے کا اپنا بیان ہے، بحوالہ۔',
  mosquesHeading: 'قریبی اوقاف مساجد',
  mosquesSource: 'اوقاف مساجد سروے سے — خواتین کی نماز کی سہولت ویسی ہی درج ہے جیسی سروے نے لکھی۔',
  mosquesWomens: 'خواتین کے لیے نماز کی جگہ',
  mosquesYes: 'ہاں',
  mosquesNo: 'نہیں',
  mosquesOwn: 'سروے میں اِس مزار کی مسجد درج',
  mosquesNotRecorded: 'درج نہیں',
  fieldSilsila: 'سلسلہ',
  typologyTitle: 'تعمیری صورتوں کا اٹلس',
  typologyIntro:
    'آرکائیو کا ہر مقام، اِس اعتبار سے کہ وہاں فی الواقع کیا تعمیر کھڑی ہے — خانقاہ، گردوارہ، غار کا مزار۔ یہ خانے سروے کی اپنی اصطلاحیں ہیں؛ جس صورت کو سروے نے نثر میں بیان کیا، اُس کی نثر جوں کی توں رکھی گئی ہے۔',
  typologyAsDescribed: 'جیسا سروے نے بیان کیا',
  typologyNotRecorded: 'تعمیری صورت درج نہیں',
  typologySiteCount: 'مقامات',
  typologySiteCountOne: 'مقام',
  reportIntro:
    'جو آرکائیو بھروسے کی طلب گار ہو، اُسے اپنا حساب برسرِعام دینا چاہیے۔ اِس صفحے کا ہر عدد اُسی ڈیٹا سے شمار ہوتا ہے جو صفحے نے خود لوڈ کیا — کوئی عدد ہاتھ سے نہیں لکھا گیا — اور جو شمار نہیں ہو سکتا اُس کا حوالہ پروجیکٹ کی اپنی دستاویزات میں دیا گیا ہے۔',
  reportCoverageHeading: 'احاطہ',
  reportShrinesLive: 'اندراجات اِس سائٹ پر موجود',
  reportRegisterNote: (pct: number) =>
    `صرف پنجاب کا محکمہ اوقاف 534 مزارات کا انتظام کرتا ہے (اُس کے اپنے عوامی صفحے کے مطابق، 2026)۔ یہ آرکائیو فی الحال اُس ایک صوبائی رجسٹر کے تقریباً ${pct}٪ کا احاطہ کرتی ہے — سندھ، خیبر پختونخوا اور بلوچستان کا شمار اِس سے الگ ہے۔`,
  reportSupportHeading: 'ہر اندراج کی تصدیق کس درجے کی ہے؟',
  reportSupportNote:
    'تصدیق کا درجہ یہ بتاتا ہے کہ معلومات کیسے جمع ہوئیں — کسی مقام کی اہمیت کبھی نہیں۔',
  reportInfoHeading: 'ہر اندراج کتنا بتاتا ہے؟',
  reportStatusHeading: 'خود مقامات کا حال',
  reportWordsHeading: 'یہ تحریریں کیسے بنیں',
  reportWordsNote:
    'آرکائیو ہر اندراج کے لیے درج رکھتی ہے کہ اُس کا مضمون کیسے تیار ہوا۔ طریقۂ کار کے بارے میں دیانت داری، حوالہ بننے کی قیمت ہے۔',
  reportWithCitations: 'مضامین جن میں کم از کم ایک حوالہ موجود ہے',
  reportAiResearched: 'مضامین جو اے آئی سے تحقیق شدہ مسودے ہیں',
  reportPrimarySource: 'مضامین جو بنیادی مآخذ (چھپے تذکروں کے او سی آر) سے تحقیق ہوئے',
  reportUrduHeading: 'اردو آئینہ',
  reportUrduDrafted: 'اندراجات جن کا مکمل اردو مضمون موجود ہے',
  reportUrduReviewed: 'اِن میں سے جنہیں کسی انسانی قاری نے پڑھ کر منظور کیا',
  reportUrduReviewNote:
    'مشینی ہوں یا ہاتھ کے لکھے، سب تراجم اُس وقت تک مسودے ہیں جب تک کوئی شخص اُنہیں پڑھ نہ لے۔ اوپر کا عدد اِس آرکائیو کا سب سے سچا عدد ہے۔',
  reportCorrectionsHeading: 'برسرِعام درستی',
  reportCorrectionsNote:
    'ہر سنجیدہ آرکائیو سے غلطیاں ہوتی ہیں۔ یہ آرکائیو اُنہیں لکھ رکھتی ہے۔ پروجیکٹ کے درستی نامے سے ایک انتخاب:',
  reportLostHeading: 'جو ضائع ہوا',
  reportUnknownLabel: 'درج نہیں',
  saveShrine: 'محفوظ کریں',
  saveShrineFull: 'اپنی زیارت کی فہرست میں محفوظ کریں (اسی آلے پر رہتی ہے)',
  savedLabel: 'محفوظ ہے',
  savedFilterLabel: 'آپ کی فہرست',
  savedOnlyFilter: 'محفوظ شدہ مزارات',
  ziyaratPackPrint: 'فہرست چھاپیں',
  ziyaratPackTitle: 'میری زیارت کی فہرست',
  ziyaratPackNote: 'مزاراتِ پاکستان آرکائیو سے چھاپی گئی فہرست۔',
  ziyaratShareLink: 'فہرست کا لنک نقل کریں',
  sharedListBannerTitle: 'مشترکہ زیارت کی فہرست',
  sharedListBannerBody:
    'کسی نے اپنی فہرست آپ کے ساتھ بانٹی ہے — نیچے دیے گئے مزارات اُنہی کے ہیں۔ جب تک آپ شامل نہ کریں، کچھ محفوظ نہیں ہوتا۔',
  sharedListAdd: 'میری فہرست میں شامل کریں',
  sharedListDismiss: 'بند کریں',
  reportCorrection: 'غلطی کی نشاندہی کریں',
  sourcesHeading: 'مصادر اور ماخذ',
  unreviewedLabel: 'غیر جانچا گیا',
  confidenceLabel: 'اعتماد',
  reviewedByLabel: 'جانچا',
  citationsLabel: 'حوالہ جات',
  viewSourceLabel: 'ماخذ دیکھیں',
  pageNotFoundTitle: 'صفحہ نہیں ملا',
  pageNotFoundMessage: 'آپ جو صفحہ ڈھونڈ رہے ہیں وہ دستیاب نہیں ہے۔',
  shrineDirectoryLabel: 'مزارات کی فہرست',
  mapBreadcrumb: 'نقشہ',
  guidedTourAriaLabel: 'رہنما دورہ',
  guidedTours: 'رہنما دورے',
  guidedToursHint: 'ایک دورہ شروع کریں اور نقشے پر مزارات کی سیر کریں',
  turnOnTours: 'رہنما دورے چالو کریں',
  turnOffTours: 'رہنما دورے بند کریں',
  endTourAriaLabel: 'دورہ ختم کریں',
  endTour: 'ختم کریں',
  previousStopAriaLabel: 'پچھلا مقام',
  previousButton: 'پچھلا',
  nextStopAriaLabel: 'اگلا مقام',
  finishTourAriaLabel: 'دورہ مکمل کریں',
  nextButton: 'اگلا',
  finishButton: 'مکمل ✓',
  stopsLabel: 'مقامات',
  clearFilters: 'فلٹر ہٹائیں',
  viewFullDetails: 'مکمل تفصیل دیکھیں',
  copyLink: 'لنک کاپی کریں',
  linkCopied: 'لنک کاپی ہو گیا',
  switchToWesternNumerals: 'مغربی ہندسوں پر جائیں',
  switchToEasternNumerals: 'مشرقی ہندسوں پر جائیں',
  selectLanguage: 'زبان منتخب کریں',
  resetEraFilterAriaLabel: 'دور فلٹر ہٹائیں',
  resetButton: 'ہٹائیں',
  allErasLabel: 'تمام ادوار',
  earliestCenturyLabel: 'شروع کی صدی',
  latestCenturyLabel: 'آخری صدی',
  moreFiltersLabel: 'مزید فلٹرز',
  infoLevelFull: 'مکمل طور پر دستاویز شدہ',
  infoLevelModerate: 'جزوی طور پر دستاویز شدہ',
  infoLevelLow: 'محدود معلومات',
  infoLevelTooltip:
    'یہ نشان بتاتا ہے کہ ہم نے اس مقام کو اب تک کس حد تک دستاویز کیا ہے۔ اس کا تعلق صرف ہمارے ریکارڈ سے ہے — مقام کی اہمیت سے ہرگز نہیں۔',
  infoLevelFilterLabel: 'معلومات کی سطح',
  provenanceFilterLabel: 'ماخذ',
  supportLevelFieldVerified: 'میدانی تصدیق شدہ',
  supportLevelSourceDocumented: 'ماخذات سے دستاویز شدہ',
  supportLevelSourceSeeded: 'ماخذ سے شروع کردہ',
  supportLevelWebCompiled: 'ویب سے مرتب شدہ',
  supportLevelTooltip:
    'یہ نشان بتاتا ہے کہ اس اندراج کی معلومات کیسے حاصل کی گئیں — میدانی سروے، حوالہ شدہ ماخذ، یا ویب سے مرتب کردہ۔ اس کا تعلق صرف ہمارے تحقیقی عمل سے ہے — مقام کی اہمیت سے ہرگز نہیں۔',
  verifiedOnlyFilter: 'صرف میدانی تصدیق شدہ',
  statusActive: 'فعال',
  statusOccasional: 'صرف تہواروں پر',
  statusHeritage: 'ورثہ مقام — عبادت منقطع',
  statusRuin: 'کھنڈر',
  statusDestroyed: 'منہدم',
  sourceNoteLabel: 'نوٹ',
  figurePrecisionHelp:
    'ریکارڈ اِس شخصیت کی تاریخوں کے بارے میں کتنا متعین ہے۔ یہ وہاں دکھایا جاتا ہے جہاں تاریخیں خود نہیں بتاتیں — ورنہ ایک سادہ سن، جسے آرکائیو تخمینہ جانتا ہے، حتمی معلوم ہوتا ہے۔',
  precisionExact: 'متعین',
  precisionCirca: 'تقریباً',
  precisionCentury: 'صدی',
  precisionRange: 'حدود',
  precisionUnknown: 'نامعلوم',
  /* ── زمانی صفحہ (/chronology) ───────────────────────────────────────── */
  chronologyTitle: 'صدیوں میں آرکائیو',
  chronologyIntro:
    'آرکائیو کے وہ تمام مقامات جن کا سنِ تعمیر معلوم ہے، صدیوں پر پھیلے ہوئے اور روایت کے اعتبار سے الگ الگ۔ لکیر کی چوڑائی عمارت کی عمر نہیں بلکہ آرکائیو کی بے یقینی ظاہر کرتی ہے: جس مقام کا سن متعین ہے وہ ایک باریک نشان ہے، اور جس کی صرف صدی معلوم ہے وہ پوری صدی پر پھیلا ہوا۔ جن مقامات کی تاریخ معلوم نہیں، اُن کی گنتی نیچے دی گئی ہے — اندازہ نہیں لگایا گیا۔',
  chronologyDated: 'مقامات لکیر پر',
  chronologyUndated: 'مقامات کی تاریخ درج نہیں',
  chronologyLegendHeading: 'لکیر کو کیسے پڑھیں',
  chronologyLegendWidth:
    'لکیر جتنی چوڑی، معلومات اتنی ہی کم۔ ’تقریباً‘ والی تاریخ درج شدہ سن کے گرد پچاس سال کے وقفے کے طور پر دکھائی جاتی ہے — یہ دکھانے کا طریقہ ہے، ماخذ کا بیان نہیں۔',
  chronologyRangeNote:
    'جن دو مقامات کی تاریخ ’حدود‘ کے طور پر درج ہے، اُن دونوں میں ایک ہی سن دیا گیا ہے، اس لیے حدود کی وسعت اعداد و شمار میں موجود نہیں؛ اُنہیں ’تقریباً‘ جتنی چوڑائی میں دکھایا گیا ہے۔',
  chronologyUndatedHeading: 'لکیر سے باہر',
  chronologyUndatedIntro:
    'یہ مقامات آرکائیو میں موجود ہیں مگر اِن کی کوئی لکیر نہیں۔ یہاں کچھ بھی اندازے سے نہیں: جس مقام کی تاریخ سروے میں درج نہیں وہ غیر مؤرخ ہی رہتا ہے، اور جس تاریخ پر سروے نے شبہ ظاہر کیا وہ اپنے شبہے سمیت درج ہے۔',
  chronologyNoYear: 'سن درج نہیں',
  chronologyUnknownYear: 'نامعلوم درج ہے',
  chronologyQualified: 'درج تاریخ مشروط ہے',
  chronologyEmptyBand: 'کوئی مؤرخ مقام نہیں',
  chronologySpan: (from: string, to: string) => `${from}–${to}`,
  eventYearLabel: 'تقریب کا سال',
  contributePrompt:
    'ہم اس مقام کے بارے میں بہت کم جانتے ہیں۔ اگر آپ اسے جانتے ہیں تو ہم آپ سے سننا چاہیں گے۔',
  contributeAction: 'ہمیں لکھیں',
  stopOf: (current: number, total: number) => `${current} / ${total}`,
  nextIn: (seconds: number) => `اگلا مقام ${seconds} سیکنڈ میں`,
  photoOf: (current: number, total: number) => `تصویر ${current} از ${total}`,

  /* ── مشترکہ زمین، پورے آرکائیو میں (/shared-ground) ───────────── */
  sharedGroundPageTitle: 'مشترکہ زمین',
  sharedGroundPageLede:
    'یہ آرکائیو چھ روایات کو درج کرتا ہے اور ہر مقام کو اس کا اپنا صفحہ دیتا ہے۔ اس کے درج شدہ مقامات وہ بات کہتے ہیں جو کوئی ایک صفحہ نہیں کہ سکتا۔ پنجاب اور سندھ کے بڑے حصے میں یہ برادریاں الگ الگ جگہوں پر آباد نہیں ہوئیں — وہ ایک ہی گلی کوچے میں بسیں، اور آج بھی وہیں ساتھ کھڑی ہیں۔',
  sharedGroundStatAdjacent: 'مقامات کسی دوسرے مقام سے پیدل فاصلے پر',
  sharedGroundStatPairs: 'پڑوسی مقامات کے جوڑے',
  sharedGroundStatCrossSites: 'مقامات کسی دوسری روایت کے پہلو میں',
  sharedGroundCrossOfPairs: (cross: number, pairs: number) =>
    `ان ${pairs} جوڑوں میں سے ${cross} دو مختلف روایات کو ملاتے ہیں۔`,
  sharedGroundMeetingsHeading: 'کون سی روایات ساتھ کھڑی ہیں',
  sharedGroundMeetingsNote:
    'اس آرکائیو میں درج ہر روایت کہیں نہ کہیں کسی دوسری روایت سے پیدل فاصلے پر موجود ہے۔ یہ نیچے دیے گئے جوڑوں سے گنا گیا ہے، فرض نہیں کیا گیا۔',
  sharedGroundMeetingPairs: (n: number) => `${n} ${n === 1 ? 'جوڑا' : 'جوڑے'}`,
  sharedGroundNearestLabel: 'قریب ترین',
  sharedGroundPairsHeading: 'ہر ملاپ، قریب ترین پہلے',
  sharedGroundMethodHeading: 'یہ کیسے ناپا گیا',
  sharedGroundMethodRadius:
    'دو مقامات یہاں مشترکہ زمین پر شمار ہوتے ہیں جب ان کے درج شدہ مقامات ایک دوسرے سے 800 میٹر کے اندر ہوں — یعنی تقریباً دس منٹ کی پیدل مسافت۔',
  sharedGroundMethodStraight:
    'فاصلہ دو درج شدہ نقطوں کے درمیان سیدھی لکیر ہے۔ یہ پیدل راستہ نہیں، اور ان کے درمیان کسی گلی کی جانچ نہیں کی گئی۔',
  sharedGroundMethodNoClusters:
    'یہاں کوئی زنجیر نہیں بنائی گئی۔ جوڑا جوڑا ہی رہتا ہے؛ آرکائیو ایسے مقامات کو ایک ہی احاطے میں نہیں جوڑتا جہاں پہلا دوسرے سے 800 میٹر اور دوسرا تیسرے سے 800 میٹر پر ہو۔ ایک بار ایسا کرنے پر 15 مقامات کا ایک ہی گروہ 3358 میٹر پر پھیل گیا تھا — پورا اندرون لاہور، جسے ایک صحن کہا جا رہا تھا۔',
  sharedGroundMethodSamePin:
    'چند اندراجات کے لیے سروے الگ مقام نہیں دیتا، اس لیے وہ ایک ہی درج مقام رکھتے ہیں اور انہیں اسی طرح دکھایا گیا ہے۔ جو فاصلہ اس آرکائیو نے نہیں ناپا، اسے کبھی ناپے ہوئے فاصلے کے طور پر نہیں دکھایا جاتا۔',
  sharedGroundEmpty: 'مختلف روایات کے دو مقامات پیدل فاصلے پر درج نہیں۔',
  sharedGroundToMap: 'نقشہ کھولیں',
  sharedGroundFromShrine: 'پورے آرکائیو کی مشترکہ زمین',
  sharedGroundLensNote:
    'جو مقامات کسی دوسری روایت کے پہلو میں ہیں وہ روشن رہتے ہیں، باقی مدھم پڑ جاتے ہیں۔ ان کے درمیان کے رابطے 800 میٹر سے کم ہیں، اس لیے انہیں دیکھنے کے لیے قریب جائیں۔',

  /* ── روایت کے صفحات (/tradition/:slug) ────────────────────────────── */
  searchGroupTraditions: 'روایات',
  traditionKicker: 'روایت',
  traditionSiteCount: (n: number) => `${n} مقامات`,
  traditionDefinitionHeading: 'آرکائیو کیا کہتا ہے',
  traditionFromEntry: 'ماخذ اندراج:',
  traditionSitesHeading: 'اس روایت میں درج مقامات',
  traditionSitesNote:
    'یہ وہ مقامات ہیں جن کے اپنے اندراج انہیں اس روایت میں رکھتے ہیں، ساتھ وہ جملہ بھی درج ہے جو یہ کہتا ہے۔',
  traditionScopeHeading: 'اس میں کیا شامل نہیں',
  traditionScopeNote:
    'صرف وہی مقامات درج ہیں جن کے اندراج میں اس روایت کا نام آتا ہے۔ کسی مقام کو محض لفظ ملنے پر شامل نہیں کیا جاتا: یہی الفاظ دوسرے معنوں میں بھی آتے ہیں — ایک سکھ اندراج میں ’اداسی‘ گرو نانک کے سفروں کے لیے ہے، اور ’جوگی‘ رانجھے کے بارے میں ایک نظم میں آتا ہے — اور ان میں سے ہر ایک کو گنا نہیں گیا بلکہ باقاعدہ استثنا کے طور پر درج کیا گیا ہے۔',
  traditionLabel: 'روایت',
};
