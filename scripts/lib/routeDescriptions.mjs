/**
 * What each app route says it is, in both languages.
 *
 * ## The measurement
 *
 * Seven prerendered routes shipped the *homepage's* description verbatim —
 * "An interactive map of shrines, temples, gurdwaras and darbars across
 * Pakistan" — on `/almanac`, `/graph`, `/chronology`, `/shared-ground`,
 * `/typology`, `/settings` and `/review`, and on every one of their Urdu
 * mirrors. A search result for the lineage graph described the map.
 *
 * Two of those seven already *had* a description. `STATIC_PAGES` in
 * `prerender.mjs` carried `descEn` for `/graph` and `/almanac`, written for
 * exactly this purpose — and the `APP_ROUTES` loop, which runs afterwards and
 * never set a description at all, overwrote both files. **The bug was not a
 * missing description; it was a second writer silently discarding the first.**
 * The two entries have been removed from `STATIC_PAGES` rather than left there
 * looking effective.
 *
 * ## Why the text is the page's own intro, and not new copy
 *
 * Every one of these pages already opens with a sentence saying what it is,
 * reviewed, in both languages, in `uiStrings.ts` and `uiStrings.ur.ts`. Writing
 * seven new descriptions would have meant writing seven new Urdu sentences —
 * which an agent may not do (RULE 2) — and would have created a second place
 * where the archive describes the same page, free to drift from the first.
 *
 * So this file holds the intros **verbatim**, and
 * `routeDescriptions.test.ts` asserts character-for-character equality with
 * the UI strings. Edit the page's intro and the test tells you this needs the
 * same edit; it cannot silently disagree with what the page says.
 *
 * `leadSentences()` in `prerender.mjs` is what shortens these for a `<meta>`
 * tag. The full text lives here so the equality check has something to check.
 */

/** Route path → the `uiStrings` key its description is taken from, and the
 *  text of that string in both languages. */
export const ROUTE_DESCRIPTIONS = {
  almanac: {
    key: 'almanacIntro',
    en: 'When the shrines gather. An ʿurs is the death anniversary of a saint, kept as a festival of union — and for most of these places it is the one day of the year the whole community returns.',
    ur: 'جب مزارات پر اجتماع ہوتا ہے۔ عرس بزرگ کے وصال کا دن ہے، جو وصل کے جشن کے طور پر منایا جاتا ہے — اور ان میں سے اکثر مقامات کے لیے یہی سال کا وہ دن ہے جب پورا حلقہ لوٹ کر آتا ہے۔',
  },
  graph: {
    key: 'graphExplorerIntro',
    en: 'Browse the Sufi orders and the figures behind these shrines, and how they connect to one another.',
    ur: 'ان مزارات کے پیچھے صوفی سلسلوں اور شخصیات کو دیکھیں، اور جانیں کہ وہ ایک دوسرے سے کیسے جڑے ہیں۔',
  },
  chronology: {
    key: 'chronologyIntro',
    en: 'Every dated place in the archive, drawn across the centuries and banded by tradition. A bar’s width is the archive’s uncertainty, not a building’s lifetime: an exactly dated place is a tick, a place known only to its century is a hundred years wide. Places the archive cannot date are counted below, not guessed at.',
    ur: 'آرکائیو کے وہ تمام مقامات جن کا سنِ تعمیر معلوم ہے، صدیوں پر پھیلے ہوئے اور روایت کے اعتبار سے الگ الگ۔ لکیر کی چوڑائی عمارت کی عمر نہیں بلکہ آرکائیو کی بے یقینی ظاہر کرتی ہے: جس مقام کا سن متعین ہے وہ ایک باریک نشان ہے، اور جس کی صرف صدی معلوم ہے وہ پوری صدی پر پھیلا ہوا۔ جن مقامات کی تاریخ معلوم نہیں، اُن کی گنتی نیچے دی گئی ہے — اندازہ نہیں لگایا گیا۔',
  },
  'shared-ground': {
    key: 'sharedGroundPageLede',
    en: 'This archive documents six traditions and gives every site a page of its own. Its coordinates say something no single page can. For much of Punjab and Sindh these communities did not build in separate places — they built on the same streets, and they still stand there together.',
    ur: 'یہ آرکائیو چھ روایات کو درج کرتا ہے اور ہر مقام کو اس کا اپنا صفحہ دیتا ہے۔ اس کے درج شدہ مقامات وہ بات کہتے ہیں جو کوئی ایک صفحہ نہیں کہ سکتا۔ پنجاب اور سندھ کے بڑے حصے میں یہ برادریاں الگ الگ جگہوں پر آباد نہیں ہوئیں — وہ ایک ہی گلی کوچے میں بسیں، اور آج بھی وہیں ساتھ کھڑی ہیں۔',
  },
  typology: {
    key: 'typologyIntro',
    en: 'Every place in the archive, grouped by what actually stands there — khanqah, gurdwara, cave shrine. The labels are the survey’s own vocabulary; where the survey described a form in prose, the prose is kept as it was written.',
    ur: 'آرکائیو کا ہر مقام، اِس اعتبار سے کہ وہاں فی الواقع کیا تعمیر کھڑی ہے — خانقاہ، گردوارہ، غار کا مزار۔ یہ خانے سروے کی اپنی اصطلاحیں ہیں؛ جس صورت کو سروے نے نثر میں بیان کیا، اُس کی نثر جوں کی توں رکھی گئی ہے۔',
  },
  settings: {
    key: 'settingsIntro',
    en: 'These choices are kept in this browser only. Nothing is sent anywhere, and clearing your browsing data resets them.',
    ur: 'یہ انتخاب صرف اسی براؤزر میں محفوظ رہتے ہیں۔ کچھ بھی کہیں نہیں بھیجا جاتا، اور براؤزر کا ڈیٹا صاف کرنے پر یہ دوبارہ طے شدہ حالت پر آ جاتے ہیں۔',
  },
  review: {
    key: 'reviewIntro',
    en: 'The claims this archive has extracted and no person has read yet, with the evidence each was read from. A verdict here is a judgement about a claim — nothing on this page edits the archive.',
    ur: 'وہ دعاوی جو اِس آرکائیو نے متن سے نکالے اور ابھی کسی شخص نے نہیں پڑھے، ہر ایک کے ساتھ وہ شہادت جس سے وہ نکالا گیا۔ یہاں دیا گیا فیصلہ دعوے کے بارے میں ایک رائے ہے — اِس صفحے پر کوئی چیز آرکائیو میں تبدیلی نہیں کرتی۔',
  },
};

/* Deliberately absent:
 *
 * - `/report`, which has redirected to `/about` since 24 August 2026. Its
 *   canonical already points there, so a crawler is told which document this
 *   is; giving a redirect stub a description of its own would be describing a
 *   page nobody lands on.
 * - `/about` and `/coverage`, whose English descriptions live in
 *   `STATIC_PAGES` and are not built from a UI string. Both still ship that
 *   English text to an Urdu reader, which is the same open question as
 *   `siteMetaDescription` and is Rauf's under the same ruling — recorded in
 *   `docs/SESSION_RESUME.md` rather than guessed at here.
 */
