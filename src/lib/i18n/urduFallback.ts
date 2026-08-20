import {
  getFieldValue,
  getUrduFieldValue,
  isLikelyUrl,
  normalizeFoundedDate,
} from '../data/fieldAliasing';
import urduSeed from '../../data/urdu-seed.json';
import type { Lang, ShrineRow } from '../../types/shrine';

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
  'Annual urs (18-20 Safar); Thursday-evening qawwali and dhamal; daily langar':
    'سالانہ عرس (18 سے 20 صفر)؛ جمعرات کی شام قوالی اور دھمال؛ روزانہ لنگر',
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
  // ── Events wording from the 18 Aug 2026 sheet import ──────────────────
  '*ʿurs* 15–17 Rabi ul Awal (Chadar Poshi, Mela Chiraghan, *mehfil* of *naʿt*, dhol and dhamal, *qawwālī*, Ghusal, *langar*); weekly Thursday observance (drums, gatherings, lamp-lighting, *niyāz*); daily *naʿt* gathering and *langar*; five daily prayers':
    '*عرس* 15 سے 17 ربیع الاول (چادر پوشی، میلہ چراغاں، *نعت* کی *محفل*، ڈھول اور دھمال، *قوالی*، غسل، *لنگر*)؛ ہفتہ وار جمعرات کا معمول (ڈھول، اجتماعات، چراغاں، *نیاز*)؛ روزانہ *نعت* کی محفل اور *لنگر*؛ پانچ وقت کی نماز',
  '*ʿurs*, annually on 12, 13 and 14 Zil Hajj (lamps lit, sheets changed, bathing, food eaten). Daily: five daily prayers at the adjacent mosque; daily offering of *diyas* and *prasād*.':
    '*عرس*، ہر سال 12، 13 اور 14 ذی الحج کو (چراغ روشن کیے جاتے ہیں، چادریں بدلی جاتی ہیں، غسل ہوتا ہے، کھانا کھایا جاتا ہے)۔ روزانہ: ملحقہ مسجد میں پانچ وقت کی نماز؛ روزانہ *دیوں* اور *پرشاد* کا نذرانہ۔',
  "Annual Akhand Path around Guru Hargobind's Gurpurb (historic)":
    'گرو ہرگوبند کے گرپورب کے آس پاس سالانہ اکھنڈ پاٹھ (تاریخی)',
  'Annual Urs (12-14 January): chadar tabdeeli, ghusl, chiraghan, Mehfil-e-Naat Shareef, Mehfil-e-Mushaira':
    'سالانہ عرس (12 سے 14 جنوری): چادر تبدیلی، غسل، چراغاں، محفلِ نعت شریف، محفلِ مشاعرہ',
  "Annual Urs (7th-9th Muharram): Mehfil-e-Naat and langar, deliberately without dhol or dhamal per the current custodians' account of the saint's own wishes. Weekly Mehfil-e-Naat and langar on Thursday nights and Fridays.":
    'سالانہ عرس (7 سے 9 محرم): محفلِ نعت اور لنگر، موجودہ متولیوں کے بیان کے مطابق بزرگ کی اپنی خواہش پر دانستہ ڈھول اور دھمال کے بغیر۔ ہفتہ وار محفلِ نعت اور لنگر جمعرات کی رات اور جمعہ کو۔',
  'Annual death anniversary (Anant Chaturdashi); continuous sadavrat':
    'سالانہ برسی (اننت چترتھی)؛ مسلسل سدا ورت',
  'Annual festival (boat pilgrimage to the island)': 'سالانہ میلہ (جزیرے تک کشتی سے زیارت)',
  'Annual three-day Kali festival (January)': 'سالانہ تین روزہ کالی میلہ (جنوری)',
  'Annual three-day urs (Auqaf-administered); langar':
    'سالانہ تین روزہ عرس (محکمہ اوقاف کے زیرِ انتظام)؛ لنگر',
  'Annual urs (11-12 Rabi al-Awwal); weekly Sunday milad; daily langar':
    'سالانہ عرس (11 سے 12 ربیع الاول)؛ ہفتہ وار اتوار کو میلاد؛ روزانہ لنگر',
  'Annual urs (16-18 March); Friday gatherings at the tomb':
    'سالانہ عرس (16 سے 18 مارچ)؛ جمعہ کو مزار پر اجتماعات',
  'Annual urs (17-19 Rabi al-Awwal); weekly Thursday milad; Mela Chiraagha':
    'سالانہ عرس (17 سے 19 ربیع الاول)؛ ہفتہ وار جمعرات کو میلاد؛ میلہ چراغاں',
  'Annual urs (24-26 Rajab)': 'سالانہ عرس (24 سے 26 رجب)',
  'Annual urs (25-27 Jamadi al-Thani / Jumāda al-Ākhira): zikr, qawwali and langar':
    'سالانہ عرس (25 سے 27 جمادی الثانی): ذکر، قوالی اور لنگر',
  "Annual urs (27-28 Sha'ban); weekly Saturday gathering; langar":
    'سالانہ عرس (27 سے 28 شعبان)؛ ہر ہفتے بروز ہفتہ محفل؛ لنگر',
  'Annual urs (3-5 Rabi al-Thani); weekly Thursday-night dhamal':
    'سالانہ عرس (3 سے 5 ربیع الثانی)؛ ہفتہ وار جمعرات کی رات دھمال',
  'Annual urs (31 October: chadar-changing, gusal, Mehfil-e-Naat, langar, collective prayer); Thursday-night Mehfil; daily lamp-lighting and vow-making':
    'سالانہ عرس (31 اکتوبر: چادر تبدیلی، غسل، محفلِ نعت، لنگر، اجتماعی دعا)؛ جمعرات کی رات محفل؛ روزانہ چراغاں اور منتیں',
  'Annual urs (7 February); Thursday-evening qawwali; daily langar':
    'سالانہ عرس (7 فروری)؛ جمعرات کی شام قوالی؛ روزانہ لنگر',
  'Annual urs (9-11 Rabi al-Awwal); Thursday-night gatherings; dhamal and qawwali':
    'سالانہ عرس (9 سے 11 ربیع الاول)؛ جمعرات کی رات اجتماعات؛ دھمال اور قوالی',
  'Annual urs (Muharram) with the opening of the Bahishti Darwaza; qawwali; langar':
    'سالانہ عرس (محرم) بہشتی دروازہ کھلنے کے ساتھ؛ قوالی؛ لنگر',
  'Annual urs (Safar); nightly Shah jo Raag; daily langar':
    'سالانہ عرس (صفر)؛ ہر رات شاہ جو راگ؛ روزانہ لنگر',
  "Annual urs (Sha'ban); Thursday-evening dhamal and qawwali; daily langar":
    'سالانہ عرس (شعبان)؛ جمعرات کی شام دھمال اور قوالی؛ روزانہ لنگر',
  'Annual urs (date not stated in the survey); recurring mehfil (zikr-e-Ilahi and Naat-e-Rasool) every few days; Thursday lamp-lighting (diyas) and vow-making (manatein)':
    'سالانہ عرس (سروے میں تاریخ درج نہیں)؛ ہر چند دن بعد محفل (ذکرِ الٰہی اور نعتِ رسول)؛ جمعرات کو چراغاں (دیے) اور منتیں',
  'Annual urs (first Wednesday and Thursday of Rajab); langar':
    'سالانہ عرس (رجب کے پہلے بدھ اور جمعرات)؛ لنگر',
  'Annual urs (spring); abyat singing; qawwali; langar':
    'سالانہ عرس (بہار)؛ ابیات خوانی؛ قوالی؛ لنگر',
  'Annual urs (spring); daily langar': 'سالانہ عرس (بہار)؛ روزانہ لنگر',
  'Annual urs and pilgrimage; seasonal banner processions':
    'سالانہ عرس اور زیارت؛ موسمی علم بردار جلوس',
  'Annual urs with mushaira (poetic assembly); rabab recitals': 'سالانہ عرس مع مشاعرہ؛ رباب نوازی',
  'Annual urs; Eid Milad-un-Nabi (principal gathering); langar':
    'سالانہ عرس؛ عید میلاد النبی (سب سے بڑا اجتماع)؛ لنگر',
  'Annual urs; Heer recitation and qawwali': 'سالانہ عرس؛ ہیر خوانی اور قوالی',
  'Annual urs; Muharram tazia procession (9 Muharram); commemorative mach bonfire':
    'سالانہ عرس؛ محرم کا تعزیہ جلوس (9 محرم)؛ یادگاری مچ (الاؤ)',
  'Annual urs; Sheedi Mela (drumming, dance, offerings to the crocodiles)':
    'سالانہ عرس؛ شیدی میلہ (ڈھول، رقص، مگرمچھوں کو نذرانے)',
  'Annual urs; Sufi music and remembrance': 'سالانہ عرس؛ صوفیانہ موسیقی اور ذکر',
  'Annual urs; Thursday-evening qawwali and dhamal': 'سالانہ عرس؛ جمعرات کی شام قوالی اور دھمال',
  'Annual urs; Thursday-night gathering; Muharram observances (peak attendance)':
    'سالانہ عرس؛ جمعرات کی رات محفل؛ محرم کے معمولات (سب سے زیادہ حاضری)',
  'Annual urs; devotional music and langar': 'سالانہ عرس؛ عقیدت مندانہ موسیقی اور لنگر',
  'Annual urs; evening dhamal; qawwali and langar': 'سالانہ عرس؛ شام کو دھمال؛ قوالی اور لنگر',
  'Annual urs; kafi singing through the night': 'سالانہ عرس؛ رات بھر کافی خوانی',
  'Annual urs; kafi singing; qawwali; langar': 'سالانہ عرس؛ کافی خوانی؛ قوالی؛ لنگر',
  'Annual urs; large annual gathering': 'سالانہ عرس؛ بڑا سالانہ اجتماع',
  'Annual urs; naat and qawwali; daily langar': 'سالانہ عرس؛ نعت اور قوالی؛ روزانہ لنگر',
  'Annual urs; poetry, music and dhamal': 'سالانہ عرس؛ شاعری، موسیقی اور دھمال',
  'Annual urs; qawwali and langar': 'سالانہ عرس؛ قوالی اور لنگر',
  'Annual urs; qawwali and naat; daily langar': 'سالانہ عرس؛ قوالی اور نعت؛ روزانہ لنگر',
  'Annual urs; qawwali and naat; langar': 'سالانہ عرس؛ قوالی اور نعت؛ لنگر',
  'Annual urs; qawwali; daily langar': 'سالانہ عرس؛ قوالی؛ روزانہ لنگر',
  'Annual urs; qawwali; langar': 'سالانہ عرس؛ قوالی؛ لنگر',
  'Annual urs; ritual bathing in the Laki hot springs': 'سالانہ عرس؛ لکی کے گرم چشموں میں رسمی غسل',
  'Annual urs; visited by both Muslims and Hindus':
    'سالانہ عرس؛ مسلمان اور ہندو دونوں زیارت کرتے ہیں',
  'Cheti Chand': 'چیٹی چند',
  'Cheti Chand (spring)': 'چیٹی چند (بہار)',
  'Cheti Chand; shared Hindu and Muslim observance year-round':
    'چیٹی چند؛ سال بھر ہندو اور مسلم مشترکہ عقیدت',
  'Community worship; langar-adjacent hospitality': 'اجتماعی عبادت؛ لنگر جیسی مہمان نوازی',
  'Community worship; no fixed festival documented': 'اجتماعی عبادت؛ کوئی مقررہ تہوار دستاویز نہیں',
  'Community worship; no fixed public festival documented':
    'اجتماعی عبادت؛ کوئی مقررہ عوامی تہوار دستاویز نہیں',
  'Daily prakash; continuous langar': 'روزانہ پرکاش؛ مسلسل لنگر',
  'Daily prakash; major Sikh anniversaries': 'روزانہ پرکاش؛ بڑی سکھ برسیاں',
  'Daily prakash; morning and evening worship': 'روزانہ پرکاش؛ صبح اور شام عبادت',
  'Daily worship; Sikh anniversaries': 'روزانہ عبادت؛ سکھ برسیاں',
  'Diwali (principal annual opening)': 'دیوالی (سالانہ کھلنے کا بنیادی موقع)',
  'Diwali; Holi': 'دیوالی؛ ہولی',
  'Diwali; Holi; Raksha Bandhan; daily worship': 'دیوالی؛ ہولی؛ رکشا بندھن؛ روزانہ عبادت',
  'Durga Puja; daily worship': 'درگا پوجا؛ روزانہ عبادت',
  'First Monday of each month; major goddess festivals': 'ہر مہینے کا پہلا پیر؛ دیوی کے بڑے تہوار',
  'Ganesh Chaturthi; Holi; Raksha Bandhan; asthi visarjan rites':
    'گنیش چترتھی؛ ہولی؛ رکشا بندھن؛ استھی وسرجن کی رسومات',
  'Guru Nanak Gurpurab': 'گرو نانک گرپورب',
  'Guru Nanak Gurpurab (November)': 'گرو نانک گرپورب (نومبر)',
  'Guru Nanak Gurpurab (principal Sikh pilgrimage in Pakistan)':
    'گرو نانک گرپورب (پاکستان میں سکھوں کی سب سے بڑی زیارت)',
  'Guru Nanak Gurpurab; jatha pilgrimage': 'گرو نانک گرپورب؛ جتھوں کی زیارت',
  'Guru Nanak anniversaries; daily visa-free pilgrimage via the Kartarpur Corridor':
    'گرو نانک کی برسیاں؛ کرتارپور راہداری کے ذریعے روزانہ بغیر ویزا زیارت',
  'Guru Nanak anniversaries; organised jatha pilgrimage': 'گرو نانک کی برسیاں؛ منظم جتھوں کی زیارت',
  'Guru Ram Das birth anniversary': 'گرو رام داس کا یومِ پیدائش',
  'Hanuman Jayanti; Holi; Diwali': 'ہنومان جینتی؛ ہولی؛ دیوالی',
  'Heritage/tourist site; regular worship discontinued': 'ورثہ/سیاحتی مقام؛ باقاعدہ عبادت منقطع',
  'Hinglaj Yatra halt (April, four days)': 'ہنگلاج یاترا کا پڑاؤ (اپریل، چار دن)',
  'Historically Kartik bathing; not currently observed': 'تاریخی طور پر کارتک کا غسل؛ اب رائج نہیں',
  'Historically a Vaisakhi fair; not currently observed':
    'تاریخی طور پر بیساکھی میلہ؛ اب رائج نہیں',
  'Historically an annual Maghi fair': 'تاریخی طور پر سالانہ ماگھی میلہ',
  'Historically an annual fair at Basant Panchami; continuation uncertain':
    'تاریخی طور پر بسنت پنچمی پر سالانہ میلہ؛ تسلسل غیر یقینی',
  'Historically an annual fair; not in regular worship':
    'تاریخی طور پر سالانہ میلہ؛ باقاعدہ عبادت میں نہیں',
  'Historically an annual mela in Chaitra; not currently observed':
    'تاریخی طور پر چیت میں سالانہ میلہ؛ اب رائج نہیں',
  'Holi; Diwali; Janmashtami': 'ہولی؛ دیوالی؛ جنم اشٹمی',
  'Holi; Diwali; Valmiki Jayanti': 'ہولی؛ دیوالی؛ والمیکی جینتی',
  'Hur gatherings on 27 Rajab and at fixed times; no public urs observed':
    '27 رجب اور مقررہ اوقات پر حر معتقدین کے اجتماعات؛ کوئی عوامی عرس نہیں منایا جاتا',
  'Iqbal Day (9 November); death anniversary (21 April); daily changing of the guard':
    'یومِ اقبال (9 نومبر)؛ برسی (21 اپریل)؛ روزانہ گارڈ کی تبدیلی',
  'Janmashtami; Holi; Diwali': 'جنم اشٹمی؛ ہولی؛ دیوالی',
  'Maha Shivratri': 'مہا شیو راتری',
  'Maha Shivratri (late winter)': 'مہا شیو راتری (اواخر سرما)',
  'Maha Shivratri (principal festival)': 'مہا شیو راتری (سب سے بڑا تہوار)',
  'Maha Shivratri (spring); ash-immersion rites year-round':
    'مہا شیو راتری (بہار)؛ سال بھر راکھ وسرجن کی رسومات',
  'Maha Shivratri (three-day festival)': 'مہا شیو راتری (تین روزہ تہوار)',
  'Maha Shivratri; periodic cross-border pilgrimage':
    'مہا شیو راتری؛ وقتاً فوقتاً سرحد پار سے زیارت',
  'Martyrdom anniversary of Guru Arjan Dev (Jeth, May-June)':
    'گرو ارجن دیو کی شہادت کی برسی (جیٹھ، مئی-جون)',
  'Martyrdom commemoration (1 July)': 'شہادت کی یاد میں تقریب (1 جولائی)',
  'Martyrdom commemoration; pilgrim visits': 'شہادت کی یاد میں تقریب؛ زائرین کی آمد',
  'Mela Chiraghan / annual urs (9-11 Shawwal); Thursday-evening lamp-lighting, dhamal and qawwali':
    'میلہ چراغاں / سالانہ عرس (9 سے 11 شوال)؛ جمعرات کی شام چراغاں، دھمال اور قوالی',
  'No confirmed annual urs date documented': 'سالانہ عرس کی کوئی تصدیق شدہ تاریخ دستاویز نہیں',
  'None - abandoned since 1947': 'کوئی نہیں — 1947 سے متروک',
  'None - abandoned; heritage visitation': 'کوئی نہیں — متروک؛ ورثے کے طور پر آمد',
  'None - derelict; conservation appeals ongoing': 'کوئی نہیں — خستہ حال؛ تحفظ کی اپیلیں جاری',
  'None - destroyed 1992': 'کوئی نہیں — 1992 میں منہدم',
  'None - heritage site, no devotional programme':
    'کوئی نہیں — ورثہ کا مقام، کوئی عبادتی پروگرام نہیں',
  'None - ruin; access restricted near the Line of Control':
    'کوئی نہیں — کھنڈر؛ لائن آف کنٹرول کے قریب رسائی محدود',
  'Not documented': 'دستاویز نہیں',
  'Occasional pilgrimage; Bebe Nanaki commemoration':
    'کبھی کبھار زیارت؛ بے بے نانکی کی یادگاری تقریب',
  'Occasional pilgrimage; historically a Gur Mela': 'کبھی کبھار زیارت؛ تاریخی طور پر گر میلہ',
  'Pilgrimage to the tomb; visited year-round': 'مقبرے کی زیارت؛ سال بھر آمد',
  'Preserved as a heritage site; no regular events':
    'ورثہ کے مقام کے طور پر محفوظ؛ کوئی باقاعدہ تقریب نہیں',
  'Ramapir Mela (1 Bhadva, three days)': 'رام پیر میلہ (1 بھادوا، تین دن)',
  'Recently restored and reopened to visitors; no congregational worship':
    'حال ہی میں بحال کر کے زائرین کے لیے دوبارہ کھولا گیا؛ اجتماعی عبادت نہیں',
  'Reopened for active worship 2022; no fixed public festival calendar':
    '2022 میں فعال عبادت کے لیے دوبارہ کھولا گیا؛ کوئی مقررہ عوامی تہواری تقویم نہیں',
  "Sikh pilgrimage, especially Guru Nanak's Gurpurab": 'سکھ زیارت، خاص طور پر گرو نانک کا گرپورب',
  'Sikh pilgrimage; Guru Nanak Gurpurab': 'سکھ زیارت؛ گرو نانک گرپورب',
  'Two annual urs observances (15 March and 6 September)': 'سال میں دو عرس (15 مارچ اور 6 ستمبر)',
  'Vaisakhi (principal jatha pilgrimage); Saka Panja Sahib commemoration':
    'بیساکھی (جتھوں کی سب سے بڑی زیارت)؛ ساکا پنجہ صاحب کی یادگاری تقریب',
  'Visited year-round by Muslim and Hindu pilgrims; no fixed urs recorded':
    'مسلم اور ہندو زائرین سال بھر آتے ہیں؛ کوئی مقررہ عرس درج نہیں',
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

  // "c. 1165" — an approximate year, and the most common shape of a `founded`
  // value in the knowledge graph's order records. Tokenising it leaves the "c."
  // in Latin, which makes the whole string fail translateToUrdu's
  // no-Latin check and come back untranslated: every order page printed
  // "c. ۱۱۶۵". A pattern rule rather than a WORD_URDU_MAP entry because a bare
  // "c" elsewhere is not necessarily circa.
  const circaMatch = raw.match(/^c(?:a|irca)?\.?\s*(\d{3,4})\s*(?:CE|AD)?$/i);
  if (circaMatch) return `تقریباً ${circaMatch[1]}`;

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

/**
 * Honorifics and titles that prefix a name in one record and not in another.
 * Stripped only from the *front* of a string, repeatedly, and only for the
 * name lookup below — never from displayed text.
 */
const NAME_HONORIFICS =
  /^(?:hazrat|hz|shaikh|sheikh|shaykh|syed|sayyid|khwaja|khawaja|pir|peer|baba|makhdoom|mian|sultan|maulana|mawlana|sain|shah)\s+/;

/**
 * A name reduced to the part two records are likely to agree on: lower-cased,
 * parentheticals and quotes dropped, dashes flattened to spaces, punctuation
 * removed, leading honorifics stripped.
 *
 * This exists because the Urdu dictionary is generated from the sheet's own
 * columns while the knowledge graph carries its own canonical names, and the
 * two disagree in predictable, cosmetic ways: the sheet says
 * "Hazrat Data Ganj Bakhsh (Ali Hujwiri)", the graph says "Data Ganj Bakhsh";
 * the sheet says "Shrine of Shah Rukn-e-Alam", a slug label says
 * "Shrine Of Shah Rukn E Alam". 51 of the 69 figures with no Urdu name were
 * this, not a missing translation.
 */
function normalizeNameKey(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/["\u201c\u201d'\u2019]/g, '')
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let previous = '';
  while (previous !== s) {
    previous = s;
    s = s.replace(NAME_HONORIFICS, '');
  }
  return s.trim();
}

let _nameIndex: Map<string, string> | null = null;

function getNameIndex(): Map<string, string> {
  if (!_nameIndex) {
    _nameIndex = new Map();
    for (const [key, value] of getCache()) {
      // Same rule as the lower-cased index: a value that still contains Latin
      // is not a translation, and the first entry for a key wins.
      if (/[A-Za-z]/.test(value)) continue;
      const normalized = normalizeNameKey(key);
      if (normalized && !_nameIndex.has(normalized)) _nameIndex.set(normalized, value);
    }
  }
  return _nameIndex;
}

/**
 * Urdu for a proper noun — a person, a shrine, an order.
 *
 * Deliberately separate from `translateToUrdu`. The normalized match below is
 * right for names and wrong for everything else: applied to a status or a date
 * phrase it would happily equate "Active" with "Active c. 6th-12th c.". Only
 * exact matching is safe there, so `translateToUrdu` keeps exactly the
 * behaviour it had.
 *
 * Matching is exact-after-normalization, never by prefix. That distinction is
 * load-bearing: "Khwaja Muhammad Qasim" and "Khwaja Muhammad Qasim Sadiq" are
 * a master and his pupil, two separate figures in this archive, and prefix
 * matching would silently merge them (HANDOVER §9.24 records the trap).
 *
 * `alsoTry` is for a record's alternative names, which is how a figure the
 * graph calls "Valmiki" reaches the dictionary entry written as
 * "Bhagwan Valmik (Valmiki)".
 */
export function translateNameToUrdu(name: string, alsoTry: readonly string[] = []): string {
  const raw = String(name ?? '').trim();
  if (!raw) return '';
  if (!/[A-Za-z]/.test(raw)) return raw;

  // Exact and case-insensitive first — an authored entry always beats a
  // normalized guess.
  const direct = translateToUrdu(raw);
  if (!/[A-Za-z]/.test(direct)) return direct;

  const index = getNameIndex();
  for (const candidate of [raw, ...alsoTry]) {
    const hit = index.get(normalizeNameKey(candidate));
    if (hit) return hit;
  }
  return raw;
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

/**
 * Resolves the Founded/Opened display value with the qualifier prefix
 * ("Completed/consecrated 1640" -> "1640") stripped BEFORE Urdu translation
 * — not after. The seed dictionary caches whole-string translations of raw
 * sheet values, so translating first would return an already-fluent but
 * still qualifier-laden Urdu phrase (e.g. "تکمیل/تقدیس ١٦٤٠ء") that this
 * function's own normalizer — which only recognizes Latin qualifier words
 * — could never clean up afterwards.
 */
export function resolveFoundedDate(row: ShrineRow, lang: Lang): string {
  const cleanEnglish =
    normalizeFoundedDate(getFieldValue(row, 'Founded/Opened')) ||
    normalizeFoundedDate(getFieldValue(row, 'Founded'));
  if (lang !== 'ur') return cleanEnglish;

  const urduValue = getUrduFieldValue(row, 'Founded/Opened') || getUrduFieldValue(row, 'Founded');
  if (urduValue) return normalizeFoundedDate(urduValue);
  return cleanEnglish ? translateToUrdu(cleanEnglish) : '';
}
