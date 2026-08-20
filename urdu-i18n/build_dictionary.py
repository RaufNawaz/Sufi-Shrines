# -*- coding: utf-8 -*-
"""
build_dictionary.py — assembles the Sufi Shrines Urdu dictionary.

Author (human-quality) Urdu is defined below. The script:
  1. Composes the 123 compound location strings from a place-token map.
  2. Flattens everything into a runtime seed map (en -> ur) for
     window.SHRINE_TRANSLATIONS.
  3. Emits a structured, human-readable urdu-dictionary.json.
  4. Validates coverage + flags any value still containing Latin letters.

Modes:
  python3 urdu-i18n/build_dictionary.py          write + validate (default)
  python3 urdu-i18n/build_dictionary.py --check  validate + compare the regenerated
      outputs against the files on disk WITHOUT writing anything; exits non-zero
      when they are stale or validation fails (used by `npm run data:validate`).
"""
import argparse, json, re, os, sys

OUT = os.path.dirname(os.path.abspath(__file__))


def load_rows():
    with open(os.path.join(OUT, "_shrine_rows.json"), encoding="utf-8") as f:
        return json.load(f)

# ─────────────────────────────────────────────────────────────────────────────
# 1. CATEGORIES / TRADITIONS / TOUR FACETS
# ─────────────────────────────────────────────────────────────────────────────
CATEGORIES = {
    "Muslim Shrine": "مسلم مزار",
    "Hindu Temple": "ہندو مندر",
    "Sikh Gurdwara": "سکھ گوردوارہ",
}
TRADITIONS = {"Sufi": "صوفی", "Sikh": "سکھ", "Hindu & Jain": "ہندو اور جین"}
TOUR_REGIONS = {
    "Sindh & Punjab": "سندھ اور پنجاب",
    "Punjab": "پنجاب",
    "Punjab, Sindh & Balochistan": "پنجاب، سندھ اور بلوچستان",
    "Sindh": "سندھ",
    "Khyber Pakhtunkhwa": "خیبر پختونخوا",
}
TOUR_THEMES = {
    "Pilgrimage route": "زیارت کا راستہ",
    "Founding history": "تاریخِ بنیاد",
    "Ancient architecture": "قدیم فنِ تعمیر",
    "Sacred city": "مقدس شہر",
    "Guru's childhood": "گرو کا بچپن",
    "Frontier Sufism": "سرحدی تصوف",
    "Urban pilgrimage": "شہری زیارت",
}
TOUR_ERAS = {
    "8th–20th century": "8ویں–20ویں صدی",
    "15th–20th century": "15ویں–20ویں صدی",
    "7th–15th century": "7ویں–15ویں صدی",
    "12th–19th century": "12ویں–19ویں صدی",
    "13th–15th century": "13ویں–15ویں صدی",
    "16th–20th century": "16ویں–20ویں صدی",
    "18th–20th century": "18ویں–20ویں صدی",
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. PLACE TOKENS (atomic pieces used to compose location strings + power a
#    runtime localizeLocation() composer). Longest keys matched first.
# ─────────────────────────────────────────────────────────────────────────────
PLACE_TOKENS = {
    # provinces / territories
    "Punjab": "پنجاب",
    "Sindh": "سندھ",
    "Balochistan": "بلوچستان",
    "Khyber Pakhtunkhwa": "خیبر پختونخوا",
    "KPK": "خیبر پختونخوا",
    "KP": "خیبر پختونخوا",
    "Islamabad Capital Territory": "اسلام آباد وفاقی دارالحکومت",
    "Azad Kashmir": "آزاد کشمیر",
    "Pakistan": "پاکستان",
    # cities / towns
    "Lahore": "لاہور",
    "Karachi": "کراچی",
    "Multan City": "ملتان شہر",
    "Multan": "ملتان",
    "Peshawar": "پشاور",
    "Islamabad": "اسلام آباد",
    "Rawalpindi": "راولپنڈی",
    "Sialkot": "سیالکوٹ",
    "Sukkur": "سکھر",
    "Rohri": "روہڑی",
    "Hyderabad": "حیدرآباد",
    "Quetta": "کوئٹہ",
    "Sehwan Sharif": "سیہون شریف",
    "Uch Sharif": "اوچ شریف",
    "Bahawalpur": "بہاولپور",
    "Pakpattan": "پاکپتن",
    "Kasur": "قصور",
    "Nankana Sahib": "ننکانہ صاحب",
    "Sargodha": "سرگودھا",
    "Jhang": "جھنگ",
    "Chiniot": "چنیوٹ",
    "Okara": "اوکاڑہ",
    "Gujrat": "گجرات",
    "Gujranwala": "گوجرانوالہ",
    "Jhelum": "جہلم",
    "Chakwal": "چکوال",
    "Khushab": "خوشاب",
    "Mansehra": "مانسہرہ",
    "Nowshera": "نوشہرہ",
    "Kohat": "کوہاٹ",
    "Dera Ghazi Khan": "ڈیرہ غازی خان",
    "Rajanpur": "راجن پور",
    "Khairpur": "خیرپور",
    "Jamshoro": "جامشورو",
    "Dadu": "دادو",
    "Mehar": "مہر",
    "Badin": "بدین",
    "Matiari": "مٹیاری",
    "Tando Allahyar": "ٹنڈو الہ یار",
    "Tando Muhammad Khan": "ٹنڈو محمد خان",
    "Tando Adam": "ٹنڈو آدم",
    "Umerkot": "عمرکوٹ",
    "Tharparkar": "تھرپارکر",
    "Nagarparkar": "ننگرپارکر",
    "Islamkot": "اسلام کوٹ",
    "Shikarpur": "شکارپور",
    "Narowal": "نارووال",
    "Sheikhupura": "شیخوپورہ",
    "Buner": "بونیر",
    "Hasan Abdal": "حسن ابدال",
    "Eminabad": "ایمن آباد",
    "Kartarpur": "کرتارپور",
    "Shakargarh": "شکرگڑھ",
    "Farooqabad": "فاروق آباد",
    "Chuharkana": "چوہڑکانہ",
    "Taunsa Sharif": "تونسہ شریف",
    "Taunsa": "تونسہ",
    "Sharaqpur": "شرقپور",
    "Sial Sharif": "سیال شریف",
    "Chamkani": "چمکنی",
    "Akbarpura": "اکبرپورہ",
    "Hazarkhwani": "ہزار خوانی",
    "Choa Saidanshah": "چوآ سیدن شاہ",
    "Malka Hans": "ملکا ہانس",
    "Sharda": "شاردا",
    "Ghandian": "گھنڈیاں",
    "Bhit": "بھٹ",
    "Aror": "اروڑ",
    "Radhan Town": "رادھن ٹاؤن",
    "Gandawah": "گنداواہ",
    "Gandava": "گنداوا",
    "Hala": "ہالہ",
    "Suraj Miani": "سورج میانی",
    "Dina": "دینہ",
    "Murree": "مری",
    "Pacha Kalay": "پاچا کلے",
    "Ziarat Kaka Sahib": "زیارت کاکا صاحب",
    "Saidpur Village": "سید پور گاؤں",
    "Saidpur": "سید پور",
    "Gulberg 3": "گلبرگ 3",
    "Clifton": "کلفٹن",
    "Shadman Town": "شادمان ٹاؤن",
    "Gadap Town": "گڈاپ ٹاؤن",
    "Saddar Town": "صدر ٹاؤن",
    "Soldier Bazaar": "سولجر بازار",
    "Kabari Bazar": "کباڑی بازار",
    "Shahi Bazar": "شاہی بازار",
    "Old Shahi Bazar": "پرانا شاہی بازار",
    "Jhanda Bazar": "جھنڈا بازار",
    "Dabbi Bazaar": "ڈبی بازار",
    "Manora Island": "منوڑہ جزیرہ",
    "Manora Beach": "منوڑہ ساحل",
    "Anarkali": "انار کلی",
    "Old Anarkali": "پرانی انار کلی",
    "Baghbanpura": "باغبان پورہ",
    "Mozang Chungi": "موزنگ چونگی",
    "Ichhra": "اچھرہ",
    "Samanabad": "سمن آباد",
    "Muslim Town": "مسلم ٹاؤن",
    "Dharampura": "دھرم پورہ",
    "Alam Ganj": "عالم گنج",
    "Chah Miran": "چاہ میراں",
    "Bhati Gate": "بھاٹی دروازہ",
    "Daulat Gate": "دولت دروازہ",
    "Alamgiri Gate": "عالمگیری دروازہ",
    "Talaqi gate": "طلاقی دروازہ",
    "The Mall": "دی مال",
    "Edward Road": "ایڈورڈ روڈ",
    "Queens Road": "کوئنز روڈ",
    "Ravi Road": "راوی روڈ",
    "Naqi Road": "نقی روڈ",
    "Aibak Road": "ایبک روڈ",
    "Embankment Road": "ایمبینکمنٹ روڈ",
    "Masjid Road": "مسجد روڈ",
    "Paris Road": "پیرس روڈ",
    "Ring Road": "رنگ روڈ",
    "M. A. Jinnah Road": "ایم اے جناح روڈ",
    "Lytton Road": "لِٹن روڈ",
    "Aam Khas Bagh": "عام خاص باغ",
    "Hazuri Bagh": "حضوری باغ",
    "Lahore Fort": "قلعہ لاہور",
    "Lahore High Court": "لاہور ہائی کورٹ",
    "Rohtas Fort": "قلعہ روہتاس",
    "Walled City": "اندرونِ شہر",
    "Shalimar Gardens": "شالیمار باغ",
    "Jehangir Kothari Parade": "جہانگیر کوٹھاری پریڈ",
    "Clifton Beach": "کلفٹن ساحل",
    "Native Jetty Bridge": "نیٹو جیٹی پل",
    "Custom House": "کسٹم ہاؤس",
    "Soon Valley": "وادی سون",
    "Neelum Valley": "وادی نیلم",
    "Lahoot Lamakan valley": "لاہوت لامکان وادی",
    "Ghamkol valley": "وادی گھمکول",
    "Salt Range": "نمک کا سلسلہ",
    "Sakesar Mountain": "پہاڑِ سکیسر",
    "Karoonjhar Mountains region": "کارونجھر پہاڑی خطہ",
    "Margalla Hills": "مارگلہ پہاڑیاں",
    "Churrio Hill": "چڑیو پہاڑی",
    "Gor Khatri area": "گورکھتری علاقہ",
    "Hingol Balochistan National Park": "ہنگول بلوچستان نیشنل پارک",
    "Hingol National Park": "ہنگول نیشنل پارک",
    "Hashtnagri": "ہشتنگری",
    "Mohallah Dharowal": "محلہ ڈھڈووال",
    "Mohalla Bukhari": "محلہ بخاری",
    "Bukhari mound": "بخاری ٹیلہ",
    "Shah Jamal": "شاہ جمال",
    "Bulri Shah Karim": "بلڑی شاہ کریم",
    "Daraza": "دڑازہ",
    "Sakhi Sarwar": "سخی سرور",
    "Golra Sharif": "گولڑہ شریف",
    "Allo Mahar": "آلو مہار",
    "Langer Makhdoom": "لنگر مخدوم",
    "Shergarh": "شیر گڑھ",
    "Shamsabad": "شمس آباد",
    "Ranmal Sharif": "رانمل شریف",
    "Purana Bhalwal": "پرانا بھلوال",
    "Bhalwal": "بھلوال",
    "Shah Yousuf": "شاہ یوسف",
    "Shahpur": "شاہ پور",
    "Wadpagga Sharif": "واد پگہ شریف",
    "Eidgah Sharif": "عیدگاہ شریف",
    "Mithankot": "مٹھن کوٹ",
    "Kot Mithan": "کوٹ مٹھن",
    "Garh Maharaja": "گڑھ مہاراجہ",
    "Shorkot": "شورکوٹ",
    "Bhit Shah": "بھٹ شاہ",
    "Bari Imam": "باری امام",
    "Jhok Sharif": "جھوک شریف",
    "Jhok": "جھوک",
    "Fateh Pur Sharif": "فتح پور شریف",
    "Luari Sharif": "لواری شریف",
    "Mohra Sharif village": "موہڑہ شریف گاؤں",
    "Mohra Sharif": "موہڑہ شریف",
    "Pir Jo Goth": "پیر جو گوٹھ",
    "Kingri Taluka": "کنگری تعلقہ",
    "Shaheed Fazil Rahu Taluka": "شہید فاضل راہو تعلقہ",
    "Odero Lal Village": "اوڈیرو لال گاؤں",
    "Odero Lal": "اوڈیرو لال",
    "Gori village": "گوری گاؤں",
    "Chitti Gatti": "چٹی گٹی",
    "Chiti Ghati": "چٹی گھاٹی",
    "Suraj Miani": "سورج میانی",
    "Asha Pura": "آشا پورہ",
    "Sadh Belo Island": "سادھ بیلو جزیرہ",
    "Fort of Multan": "قلعہ ملتان",
    "Sirey Ghat": "سرے گھاٹ",
    "DB-80 Sirey Ghat": "ڈی بی-80 سرے گھاٹ",
    "Data Darbar": "داتا دربار",
    "Khuzdar": "خضدار",
    "Phalia": "پھالیہ",
    "Jandiala Sher Khan": "جنڈیالہ شیر خان",
    "Bhati Gate area": "بھاٹی دروازہ کا علاقہ",
    "Dargah Fateh Pur Sharif": "درگاہ فتح پور شریف",
    "Mazar of Bulleh Shah": "مزارِ بلھے شاہ",
    "formerly Chuharkana": "سابقہ چوہڑکانہ",
    "between Islamkot and Nagarparkar": "اسلام کوٹ اور ننگرپارکر کے درمیان",
    "Muslim Town / Samanabad": "مسلم ٹاؤن / سمن آباد",
    "Shah Jamal/Ichhra": "شاہ جمال/اچھرہ",
    "outside Daulat Gate": "دولت دروازہ کے باہر",
    "Tehsil Mehar": "تحصیل مہر",
    "Under Native Jetty Bridge": "نیٹو جیٹی پل کے نیچے",
    "Shrine of Bahauddin Zakariya": "مزارِ بہاؤالدین زکریا",
    "Sukkur/Rohri": "سکھر/روہڑی",
    "Dina/Jhelum": "دینہ/جہلم",
    "Near Clifton Beach / Jehangir Kothari Parade area":
        "کلفٹن ساحل / جہانگیر کوٹھاری پریڈ کے قریب",
    # generic descriptors
    "District": "ضلع",
    "Tehsil": "تحصیل",
    "Taluka": "تعلقہ",
    "Village": "گاؤں",
    "City": "شہر",
    "Town": "ٹاؤن",
    "Road": "روڈ",
    "Bazar": "بازار",
    "Bazaar": "بازار",
    "Gate": "دروازہ",
    "area": "علاقہ",
    "Fort": "قلعہ",
    "Island": "جزیرہ",
    "Beach": "ساحل",
    "valley": "وادی",
    "Valley": "وادی",
    "Mountain": "پہاڑ",
    "Hill": "پہاڑی",
    "Hills": "پہاڑیاں",
    "National Park": "نیشنل پارک",
    "Bridge": "پل",
    "region": "خطہ",
    "mound": "ٹیلہ",
    "near": "قریب",
    "formerly": "سابقہ",
    "Mohallah": "محلہ",
    "Mohalla": "محلہ",
}

# District names that appear as "<X> District" — ensure the X is known
DISTRICT_STEMS = {
    "Jamshoro": "جامشورو", "Khairpur": "خیرپور", "Bahawalpur": "بہاولپور",
    "Sukkur": "سکھر", "Nowshera": "نوشہرہ", "Kohat": "کوہاٹ", "Buner": "بونیر",
    "Mansehra": "مانسہرہ", "Chakwal": "چکوال", "Khushab": "خوشاب",
    "Sheikhupura": "شیخوپورہ", "Narowal": "نارووال", "Rawalpindi": "راولپنڈی",
    "Dadu": "دادو", "Matiari": "مٹیاری", "Tando Allahyar": "ٹنڈو الہ یار",
    "Tharparkar": "تھرپارکر", "Karachi South": "کراچی جنوبی",
    "Karachi East": "کراچی مشرقی", "Jhal Magsi": "جھل مگسی",
    "Gujranwala": "گوجرانوالہ", "Pakpattan": "پاکپتن",
}
for k, v in DISTRICT_STEMS.items():
    PLACE_TOKENS.setdefault(k, v)

# ─────────────────────────────────────────────────────────────────────────────
# 3. SHRINE NAMES (all 143, in row order)
# ─────────────────────────────────────────────────────────────────────────────
NAME_LIST = [
 "داتا دربار",
 "لعل شہباز قلندر",
 "مزارِ عبداللہ شاہ غازی",
 "مزارِ بہاؤالدین زکریا",
 "مزارِ گنجِ عنایت سرکار",
 "مزارِ شاہ رکنِ عالم",
 "لنگر مخدوم",
 "مزارِ فرید الدین گنج شکر",
 "درگاہ فتح پور شریف",
 "مقبرہ بی بی جاوندی",
 "شیر گڑھ",
 "شاہ یوسف",
 "مزارِ سید موسیٰ پاک",
 "گڑھ مہاراجہ (شورکوٹ)",
 "مزارِ بلھے شاہ",
 "پرانا بھلوال",
 "رانمل شریف",
 "شمس آباد",
 "مزارِ ابو الفیض قلندر علی سہروردی",
 "مزارِ قلندر بابا اولیاء",
 "مزارِ بی بی پاک دامن",
 "گولڑہ شریف",
 "آلو مہار",
 "مزارِ سچل سرمست",
 "سخی سرور",
 "مٹھن کوٹ (کوٹ مٹھن)",
 "مزارِ شاہ یوسف گردیز",
 "واد پگہ شریف",
 "مزارِ امام علی الحق",
 "دربار حضرت خواجہ شاہ محمد سلیمان تونسوی (رحمۃ اللہ علیہ)",
 "سیال شریف",
 "مزارِ پیر شیر محمد",
 "بھٹ (بھٹ شاہ)",
 "باری امام",
 "مزارِ شاہ شمس الدین سبزواری",
 "مزارِ پیر منگھو",
 "عیدگاہ شریف",
 "ضلع جامشورو",
 "گوردوارہ جنم استھان ننکانہ صاحب",
 "گوردوارہ دربار صاحب کرتارپور",
 "گوردوارہ پنجہ صاحب",
 "گوردوارہ ڈیرہ صاحب",
 "گوردوارہ روڑی صاحب",
 "گوردوارہ بھائی جوگا سنگھ",
 "گوردوارہ شہید بھائی تارو سنگھ",
 "گوردوارہ سری کیارہ صاحب",
 "شکتی پیٹھ شری ہنگلاج ماتا مندر",
 "پرنامی مندر",
 "کٹاس راج مندر",
 "شاردا پیٹھ",
 "سادھ بیلو (سادھ بیلو جزیرہ مندر)",
 "شری سوامی نارائن مندر، کراچی",
 "شری پنچمکھی ہنومان مندر (کراچی)",
 "شری ورون دیو مندر",
 "گورکھ ناتھ مندر",
 "عمرکوٹ (امرکوٹ) شیو مندر",
 "گوردوارہ سچا سودا",
 "گوردوارہ پٹی صاحب",
 "گوردوارہ ٹمبو صاحب",
 "گوردوارہ بالیلا صاحب (بال لیلا صاحب)",
 "گوردوارہ مالجی صاحب",
 "گوردوارہ پنجویں چھٹی پاتشاہی",
 "مقبرہ رحمان بابا (رحمان بابا مزار)",
 "مزارِ شاہ نورانی (سید بلاول شاہ نورانی)",
 "مقبرہ وارث شاہ",
 "مزارِ حضرت شاہ دولہ دریائی",
 "درگاہ / روضہ صوفی شاہ عنایت شہید",
 "شیو مندر چٹی گھاٹی",
 "کالی باری مندر",
 "کرشنا مندر (کباڑی بازار)",
 "شاہ والا تیجا سنگھ مندر",
 "کرشنا مندر (راوی روڈ)",
 "والمیک مندر (نقی روڈ)",
 "گرو گرپت مندر (ڈی بی-80 سرے گھاٹ)",
 "سنت بابا بھگت رام دربار مندر",
 "بھائی سنت تھاون داس مندر",
 "جھولے لال مندر",
 "گرداس رام مندر",
 "بھگناری مندر",
 "گوردوارہ بابے دی بیر",
 "گوردوارہ بھائی بیبا سنگھ",
 "گوردوارہ گرو رام داس جی",
 "گوردوارہ شہید گنج سنگھ سنگھنیاں",
 "گوردوارہ بابے نانکی",
 "گوردوارہ سچ کھنڈ صاحب",
 "گوردوارہ دشمیش پِتا",
 "گوردوارہ سنگھ سبھا",
 "مزارِ میاں میر",
 "مزارِ جلال الدین سرخ پوش بخاری (جلال الدین بخاری)",
 "مزارِ مخدوم جہانیاں جہاں گشت",
 "مزارِ حضرت مادھو لال حسین (شاہ حسین دربار)",
 "دربار سخی شاہ چن چراغ",
 "رامہ پیر مندر، ٹنڈو الہ یار",
 "پرہلاد پوری مندر",
 "کالکا غار مندر (استھان کالکا دیوی)",
 "ٹلہ جوگیاں",
 "امب مندر (امب شریف)",
 "چڑیو جبل درگا ماتا مندر",
 "ننگرپارکر جین مندر (ننگرپارکر ثقافتی منظرنامہ)",
 "دریا لال مندر (دریا لال سنکٹ موچن مندر)",
 "شری لکشمی نارائن مندر (نیٹو جیٹی پل)",
 "شری رتنیشور مہادیو مندر، کراچی",
 "درگاہ پیر رتن ناتھ جی",
 "پنج تیرتھ",
 "جگن ناتھ مندر، سیالکوٹ",
 "اوڈیرو لال کا مقام (اُڈیرو لال تیرتھ استھان)",
 "مقبرہ علامہ اقبال (مزارِ اقبال)",
 "مزارِ شاہ جمال",
 "مزارِ موج دریا بخاری",
 "مزارِ پیر مکی",
 "مزارِ میراں حسین زنجانی (زنجانی صاحب)",
 "مزارِ بابا شاہ چراغ",
 "مزارِ شاہ عنایت قادری",
 "سمادھی مہاراجہ رنجیت سنگھ",
 "لوہ مندر (لاوا مندر)",
 "جین مندر، لاہور",
 "مزارِ بابا شاہ کمال",
 "مقبرہ قطب الدین ایبک",
 "مزارِ پیر بابا (سید علی ترمذی)",
 "زیارت کاکا صاحب",
 "دربار گھمکول شریف (زندہ پیر)",
 "موہڑہ شریف (خانقاہ)",
 "گوردوارہ چوآ صاحب",
 "گوردوارہ چکی صاحب",
 "گوردوارہ کھوہی بھائی لالو (بھائی لالو دی کھوہی)",
 "رام مندر، سید پور (رام کنڈ مندر)",
 "مزارِ آخوند پنجو بابا",
 "مزارِ آخوند درویزہ بابا",
 "گوری مندر (گوری جو مندر)",
 "گوردوارہ صاحب سید پور (گرو نانک دیو جی)",
 "مزارِ میاں عمر بابا (چمکنی)",
 "درگاہ پیر محمد راشد (روزے دھنی)، پیر جو گوٹھ",
 "مزارِ حضرت محمد ایوب شاہ بخاری",
 "مزارِ حافظ محمد جمال ملتانی",
 "گوردوارہ باؤلی صاحب (گرو ارجن دیو جی)، لاہور",
 "مزارِ حضرت شاہ علی اکبر (شاہ علی اکبر شمسی)",
 "مقبرہ بہاء الحلیم (اوچ شریف)",
 "مزارِ مخدوم نوح (ہالہ)",
 "مزارِ شاہ عبدالکریم بلڑی",
 "مقبرہ استاد نوریہ",
 "درگاہ خواجہ محمد زمان (لواری شریف)",
 "گوردوارہ چھیویں پاتشاہی، چٹی گٹی",
 "گوردوارہ سری تلگنجی صاحب",
]

# ─────────────────────────────────────────────────────────────────────────────
# 4. SAINTS (keyed by exact English string)
# ─────────────────────────────────────────────────────────────────────────────
SAINTS = {
 "Hazrat Data Ganj Bakhsh (Ali Hujwiri)": "حضرت داتا گنج بخش (علی ہجویری)",
 "Lal Shahbaz Qalandar": "لعل شہباز قلندر",
 "Abdullah Shah Ghazi": "عبداللہ شاہ غازی",
 "Bahauddin Zakariya": "بہاؤالدین زکریا",
 "Ganj e Inayat Sarkar": "گنجِ عنایت سرکار",
 "Shah Rukn-e-Alam": "شاہ رکنِ عالم",
 "Makhdoom Burhan-ud-din": "مخدوم برہان الدین",
 "Fariduddin Ganjshakar": "فرید الدین گنج شکر",
 "Syed Rakhyal Shah Sufi Al Qadri": "سید رکھیل شاہ صوفی القادری",
 "Jalaluddin Surkh-Posh Bukhari": "جلال الدین سرخ پوش بخاری",
 "Daud Bandagi Kirmani": "داؤد بندگی کرمانی",
 "Hazrat Shah Yousuf": "حضرت شاہ یوسف",
 "Syed Musa Pak": "سید موسیٰ پاک",
 "Sultan Bahoo": "سلطان باہو",
 "Bulleh Shah (Abdullah Shah Qadri)": "بلھے شاہ (عبداللہ شاہ قادری)",
 "Shah Sulaimān Nūri": "شاہ سلیمان نوری",
 "Syed Muhammad Noushah Qadiri": "سید محمد نوشہ قادری",
 "Shams Ali Qalandar": "شمس علی قلندر",
 "Abul Faiz Qalander Ali Suharwardi": "ابو الفیض قلندر علی سہروردی",
 "Qalandar Baba Auliya": "قلندر بابا اولیاء",
 "Bibi Pak Daman": "بی بی پاک دامن",
 "Pir Meher Ali Shah": "پیر مہر علی شاہ",
 "Pir Syed Muhammad Channan Shah Nuri": "پیر سید محمد چنن شاہ نوری",
 "Sachal Sarmast (Abdul Wahab Faruqi)": "سچل سرمست (عبدالوہاب فاروقی)",
 "Sultan Sakhi Sarwar": "سلطان سخی سرور",
 "Khwaja Ghulam Farid": "خواجہ غلام فرید",
 "Shah Yusaf Gardez": "شاہ یوسف گردیز",
 "Ghazi Syed Shah Fateh Muhammad Bukhari": "غازی سید شاہ فتح محمد بخاری",
 "Imam Ali-ul-Haq": "امام علی الحق",
 "Khawaja Shah Muhammad Sulaiman Taunsvi": "خواجہ شاہ محمد سلیمان تونسوی",
 "Muhammad Shamsuddin Sialvi": "محمد شمس الدین سیالوی",
 "Pir Sher Muhammad": "پیر شیر محمد",
 "Shah Abdul Latif Bhittai": "شاہ عبداللطیف بھٹائی",
 "Bari Imam (Shah Abdul Latif Kazmi)": "باری امام (شاہ عبداللطیف کاظمی)",
 "Shah Shams-ud-Din Sabzwari": "شاہ شمس الدین سبزواری",
 "Pir Mangho": "پیر منگھو",
 "Pir Abdul-ul-karim": "پیر عبدالکریم",
 "Laki Shah Saddar (Syed Shah Sadaruddin Lakyari)": "لکی شاہ صدر (سید شاہ صدرالدین لکیاری)",
 "Guru Nanak": "گرو نانک",
 "Guru Nanak (First Guru)": "گرو نانک (پہلے گرو)",
 "Guru Nanak (gurdwara-school dedicated to his teachings)":
     "گرو نانک (اُن کی تعلیمات سے منسوب گوردوارہ-مدرسہ)",
 "Guru Arjan Dev": "گرو ارجن دیو",
 "Guru Nanak and Bhai Mardana": "گرو نانک اور بھائی مردانہ",
 "Bhai Joga Singh": "بھائی جوگا سنگھ",
 "Bhai Taru": "بھائی تارو",
 "Hinglaj Mata": "ہنگلاج ماتا",
 "Smadhi of Dya Ram": "سمادھی دیا رام",
 "Shiva (Mahadev)": "شیو (مہادیو)",
 "Goddess Sharada (Saraswati)": "دیوی شاردا (سرسوتی)",
 "Baba Bankhandi Maharaj (Udasi founder)": "بابا بن کھنڈی مہاراج (اداسی بانی)",
 "Bhagwan Swaminarayan": "بھگوان سوامی نارائن",
 "Lord Hanuman (Panchmukhi form)": "بھگوان ہنومان (پنچمکھی روپ)",
 "Varuna (Varun Dev)": "ورونا (ورون دیو)",
 "Guru Gorakhnath": "گرو گورکھ ناتھ",
 "Guru Arjan Dev (5th) & Guru Hargobind (6th)": "گرو ارجن دیو (پنجم) اور گرو ہرگوبند (ششم)",
 "Rahman Baba (Abdur Rahman Mohmand)": "رحمان بابا (عبدالرحمان مہمند)",
 "Syed Bilawal Shah Noorani": "سید بلاول شاہ نورانی",
 "Waris Shah": "وارث شاہ",
 "Hazrat Shah Daula Daryai": "حضرت شاہ دولہ دریائی",
 "Sufi Shah Inayat Shaheed": "صوفی شاہ عنایت شہید",
 "Goddess Kali": "دیوی کالی",
 "Lord Krishna": "بھگوان کرشن",
 "Bhagwan Valmik (Valmiki)": "بھگوان والمیک (والمیکی)",
 "Guru Gurpat": "گرو گرپت",
 "Sant Baba Bhagat Ram": "سنت بابا بھگت رام",
 "Bhai Sant Thawan Das": "بھائی سنت تھاون داس",
 "Jhulelal (Uderolal)": "جھولے لال (اڈیرو لال)",
 "Sant Gurdas Ram": "سنت گرداس رام",
 "Bhai Biba (Beba) Singh (Sikh warrior; gurdwara from era of Guru Gobind Singh)":
     "بھائی بیبا سنگھ (سکھ جنگجو؛ گوردوارہ گرو گوبند سنگھ کے دور سے)",
 "Guru Ram Das (4th)": "گرو رام داس (چہارم)",
 "Sikh women & children martyrs (18th century, Mir Mannu era)":
     "سکھ خواتین و بچوں کے شہداء (اٹھارہویں صدی، میر منو دور)",
 "Bebe Nanaki (elder sister of Guru Nanak)": "بے بے نانکی (گرو نانک کی بڑی بہن)",
 "Guru Gobind Singh (Dashmesh Pita)": "گرو گوبند سنگھ (دشمیش پِتا)",
 "Guru Granth Sahib / Sikh community (Singh Sabha congregation; city assoc. w/ Guru Nanak per Tilganji tradition)":
     "گرو گرنتھ صاحب / سکھ برادری (سنگھ سبھا اجتماع؛ روایتِ تلگنجی کے مطابق شہر گرو نانک سے منسوب)",
 "Mian Mir": "میاں میر",
 "Jahaniyan Jahangasht": "جہانیاں جہاں گشت",
 "Shah Hussain (Madho Lal Hussain)": "شاہ حسین (مادھو لال حسین)",
 "Syed Sakhi Shah Chan Charagh": "سید سخی شاہ چن چراغ",
 "Ramdev Pir (Ramapir)": "رام دیو پیر (رامہ پیر)",
 "Narasimha (named after Prahlada)": "نرسمہا (پرہلاد سے موسوم)",
 "Goddess Kali (Kalka Devi)": "دیوی کالی (کالکا دیوی)",
 "Guru Gorakhnath (Nath yogis)": "گرو گورکھ ناتھ (ناتھ جوگی)",
 "Jain Tirthankaras": "جین تیرتھنکر",
 "Goddess Durga (Mata)": "دیوی درگا (ماتا)",
 "Jhulelal / Daryalal (Zinda Pir)": "جھولے لال / دریا لال (زندہ پیر)",
 "Lakshmi-Narayan (Vishnu & Lakshmi)": "لکشمی نارائن (وشنو اور لکشمی)",
 "Baba Pir Ratan Nath (Nath yogi)": "بابا پیر رتن ناتھ (ناتھ جوگی)",
 "King Pandu (Mahabharata pilgrimage)": "راجا پانڈو (مہابھارت کی زیارت)",
 "Lord Jagannath (Krishna/Vishnu)": "بھگوان جگن ناتھ (کرشن/وشنو)",
 "Sheikh Tahir (also revered as Udero Lal/Jhulelal)":
     "شیخ طاہر (اڈیرو لال/جھولے لال کے طور پر بھی معظّم)",
 "Allama Muhammad Iqbal": "علامہ محمد اقبال",
 "Syed Shah Jamal Uddin Naqvi Bukhari (Baba Shah Jamal)":
     "سید شاہ جمال الدین نقوی بخاری (بابا شاہ جمال)",
 'Hazrat Meeran Muhammad Shah Bukhari ("Mauj Darya")':
     'حضرت میراں محمد شاہ بخاری ("موج دریا")',
 "Hazrat Syed Azizuddin al-Hassani wal-Hussaini (Peer Makki)":
     "حضرت سید عزیز الدین الحسنی والحسینی (پیر مکی)",
 "Syed Miran Hussain Zanjani": "سید میراں حسین زنجانی",
 'Syed Abdul Razzaq ("Shah Chiragh")': 'سید عبدالرزاق ("شاہ چراغ")',
 "Shah Inayat Qadiri (murshid of Bulleh Shah)": "شاہ عنایت قادری (بلھے شاہ کے مرشد)",
 "Maharaja Ranjit Singh": "مہاراجہ رنجیت سنگھ",
 "Lava (Luv), son of Rama and Sita": "لو (لاوا)، رام اور سیتا کے بیٹے",
 "Hazrat Baba Shah Kamal": "حضرت بابا شاہ کمال",
 "Sultan Qutb ud-Din Aibak": "سلطان قطب الدین ایبک",
 "Syed Ali Tirmizi (Pir Baba)": "سید علی ترمذی (پیر بابا)",
 'Kaka Sahib (Syed Kasteer Gul, "Sheikh Rahmkar")':
     'کاکا صاحب (سید کستیر گل، "شیخ رحمکار")',
 'Khwaja Muhammad Qasim ("Zinda Pir")': 'خواجہ محمد قاسم ("زندہ پیر")',
 "Khwaja Muhammad Qasim Sadiq": "خواجہ محمد قاسم صادق",
 "Guru Nanak Dev Ji": "گرو نانک دیو جی",
 "Guru Nanak Dev Ji; associated with Bhai Lalo": "گرو نانک دیو جی؛ بھائی لالو سے منسوب",
 "Dedicated to Lord Rama": "بھگوان رام سے منسوب",
 "Hazrat Syed Abdul Wahab (Akhund Panju Baba)": "حضرت سید عبدالوہاب (آخوند پنجو بابا)",
 "Akhund Darweza Baba (Syed Muhammad, d. 1638)": "آخوند درویزہ بابا (سید محمد، وفات 1638)",
 "Mian Muhammad Umar Chamkani (Naqshbandi Sufi)": "میاں محمد عمر چمکنی (نقشبندی صوفی)",
 'Pir Syed Muhammad Rashid Shah, "Roze Dhani" (founder of the Rashidi order)':
     'پیر سید محمد راشد شاہ، "روزے دھنی" (سلسلہ راشدیہ کے بانی)',
 "Hazrat Muhammad Ayub Shah Bukhari": "حضرت محمد ایوب شاہ بخاری",
 "Hazrat Hafiz Muhammad Jamal Multani (Chishti)": "حضرت حافظ محمد جمال ملتانی (چشتی)",
 "Guru Arjan Dev (fifth Sikh Guru)": "گرو ارجن دیو (پانچویں سکھ گرو)",
 "Hazrat Shah Ali Akbar Shamsi": "حضرت شاہ علی اکبر شمسی",
 "Hazrat Baha'al-Halim (Sayyid Baha al-Din Halim)": "حضرت بہاء الحلیم (سید بہاؤالدین حلیم)",
 "Makhdoom Nooh (Makhdoom Lutufullah / Sarwar Nooh)": "مخدوم نوح (مخدوم لطف اللہ / سرور نوح)",
 "Shah Abdul Karim Bulri": "شاہ عبدالکریم بلڑی",
 "Ustad Nuriya (master-builder)": "استاد نوریہ (معمار)",
 'Khwaja Muhammad Zaman "Sultan al-Aulia" (1713–1775)':
     'خواجہ محمد زمان "سلطان الاولیاء" (1713ء–1775ء)',
 "Guru Hargobind (Sixth Guru)": "گرو ہرگوبند (چھٹے گرو)",
 "Jain temple dedicated to Parshvanatha (23rd Tirthankara)":
     "پرشو ناتھ (23ویں تیرتھنکر) سے منسوب جین مندر",

 # ── Knowledge-graph figures, added 20 August 2026 ────────────────────────────
 # These are figures the knowledge graph names but the sheet's `Sufi Saint`
 # column does not, so the coverage check above never asked for them and the
 # entity pages rendered them in Latin script even in the Urdu view. Their
 # native script IS Perso-Arabic — writing them here restores the original
 # spelling rather than translating it. The three entries carrying a
 # descriptive clause are translated, not transliterated.
 #
 # UNREVIEWED DRAFTS. Confidence is high for the Punjabi/Urdu Muslim names and
 # lower for the Sindhi Hindu ones ("Asudaram", "Satramdas"), where more than
 # one spelling is current. See TRANSLATION_LOG.md and docs/TODO.md §0.
 "Bhai Waliram": "بھائی والی رام",
 "Hazrat Syed Muhammad Khair ul Deen, known as Shah Abul Muali Qadri":
     "حضرت سید محمد خیر الدین، معروف بہ شاہ ابو المعالی قادری",
 "Ghazi Ilm Din Shaheed": "غازی علم دین شہید",
 "Hazrat Khawaja Feroz-ud-Din Gharib Nawaz Chishti Nizami":
     "حضرت خواجہ فیروز الدین غریب نواز چشتی نظامی",
 "Hazrat Tahir Bandagi Qadri": "حضرت طاہر بندگی قادری",
 "Malik Ahmad Ayaz, described in the survey as slave of Mahmud Ghaznavi, "
 "minister, and governor of Lahore":
     "ملک احمد ایاز، سروے کے مطابق محمود غزنوی کے غلام، وزیر اور لاہور کے گورنر",
 "Hazrat Wasif Ali Wasif Awan": "حضرت واصف علی واصف اعوان",
 "Kali": "کالی",
 "Bhai Gurdas Singh, disciple of Guru Gobind Singh":
     "بھائی گرداس سنگھ، گرو گوبند سنگھ کے مرید",
 "Sain Vali Vilayat Rai": "سائیں ولی ولایت رائے",
 'Sant Baba Asudaram "Sakhi Baba"': 'سنت بابا آسودا رام "سخی بابا"',
 "Bhagat Kanwar Ram": "بھگت کنور رام",
 "Satguru Swami Sai Satramdas Sahib": "ستگرو سوامی سائیں ست رام داس صاحب",
 "Bhai Gurdas; veneration of Guru Nanak": "بھائی گرداس؛ گرو نانک کی عقیدت",
 "Makhdoom Abdul Rahim Girhori": "مخدوم عبدالرحیم گرہوڑی",
 "Pir Chhatal Shah Noorani": "پیر چھتل شاہ نورانی",
 "Pir Lakha": "پیر لاکھا",
 "Swami Dharmdas": "سوامی دھرم داس",
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. FOUNDING-DATE PHRASES (only strings containing letters; pure numbers are
#    handled at render time by the Eastern-numeral converter)
# ─────────────────────────────────────────────────────────────────────────────
FOUNDED = {
 "11th Century": "11ویں صدی",
 "13th Century": "13ویں صدی",
 "16th Century": "16ویں صدی",
 "17th Century": "17ویں صدی",
 "13th century": "13ویں صدی",
 "15th century": "15ویں صدی",
 "16th century": "16ویں صدی",
 "17th century": "17ویں صدی",
 "18th century": "18ویں صدی",
 "18th Century": "18ویں صدی",
 "Early 19th Century": "انیسویں صدی کا اوائل",
 "c. 1152 (12th century)": "تقریباً 1152ء (12ویں صدی)",
 "1330 (rebuilt 1779)": "1330ء (دوبارہ تعمیر 1779ء)",
 "1210 (original); rebuilt 1970s": "1210ء (اصل)؛ 1970 کی دہائی میں دوبارہ تعمیر",
 "7th century CE onwards": "ساتویں صدی عیسوی سے آگے",
 "Active c. 6th–12th c. CE; likely commissioned c. 724–760 CE":
     "تقریباً چھٹی–بارہویں صدی عیسوی میں فعال؛ غالباً تقریباً 724–760ء میں تعمیر",
 "1823 (site); 1899 (temple built)": "1823ء (مقام)؛ 1899ء (مندر تعمیر)",
 "around 500 AD": "تقریباً 500 عیسوی",
 "c. 1917-18 (current structure); ancient origins":
     "تقریباً 1917–18ء (موجودہ عمارت)؛ قدیم اصل",
 "ancient; current structure ~early 1900s": "قدیم؛ موجودہ عمارت تقریباً 1900 کی ابتدا",
 "Sikh Empire era (early–mid 19th c.)": "سکھ سلطنت کا دور (انیسویں صدی کا اوائل–وسط)",
 "1930s (present building)": "1930 کی دہائی (موجودہ عمارت)",
 "Mid-19th century": "انیسویں صدی کا وسط",
 "Built 1748 (Diwan Kaura Mal)": "تعمیر 1748ء (دیوان کورا مل)",
 "Built c.1740s (Diwan Kaura Mal), renovated under Ranjit Singh (early 19th c.)":
     "تعمیر تقریباً 1740 کی دہائی (دیوان کورا مل)، رنجیت سنگھ کے دور میں تجدید (انیسویں صدی کا اوائل)",
 "Commemorates Guru Arjan (visited before 1600) and Guru Hargobind (1613 visit)":
     "گرو ارجن (1600 سے قبل آمد) اور گرو ہرگوبند (1613 کی آمد) کی یادگار",
 "1954 (mausoleum constructed)": "1954ء (مقبرہ تعمیر)",
 "15th century (associated with saint active c. 1449)":
     "پندرہویں صدی (تقریباً 1449 میں فعال بزرگ سے منسوب)",
 "1978 (complex completed/opened)": "1978ء (احاطہ مکمل/افتتاح)",
 "early 18th century (burial c. 1718)": "اٹھارہویں صدی کا اوائل (تدفین تقریباً 1718)",
 "1830s (present structure); lingam ~2,000 yrs old":
     "1830 کی دہائی (موجودہ عمارت)؛ لنگم تقریباً 2000 سال پرانا",
 "ancient; heritage accounts ~900-1,000 yrs old":
     "قدیم؛ روایات کے مطابق تقریباً 900–1000 سال پرانا",
 "pre-1947 (colonial era)": "1947 سے قبل (نوآبادیاتی دور)",
 "19th century (built by Natha Singh)": "انیسویں صدی (ناتھا سنگھ کی تعمیر)",
 "Sikh Empire era (early 19th c.)": "سکھ سلطنت کا دور (انیسویں صدی کا اوائل)",
 "1801 (present shrine, Maharaja Ranjit Singh)": "1801ء (موجودہ مزار، مہاراجہ رنجیت سنگھ)",
 "1760s": "1760 کی دہائی",
 "Commemorates Bebe Nanaki (b. c.1464)": "بے بے نانکی کی یادگار (پیدائش تقریباً 1464)",
 "Modern building (built in recent decades)": "جدید عمارت (حالیہ دہائیوں میں تعمیر)",
 "Said to be ~200 years old (early 19th c.)":
     "کہا جاتا ہے تقریباً 200 سال پرانا (انیسویں صدی کا اوائل)",
 "Early 19th century (founded by Hari Singh Nalwa, Ranjit Singh era)":
     "انیسویں صدی کا اوائل (ہری سنگھ نلوہ کی تعمیر، رنجیت سنگھ دور)",
 "Commemorates Guru Nanak's 1521 arrest": "گرو نانک کی 1521 کی گرفتاری کی یادگار",
 "1930s (present building)": "1930 کی دہائی (موجودہ عمارت)",
 "1930s–1940s (present building)": "1930–1940 کی دہائیاں (موجودہ عمارت)",
 "Completed/consecrated 1640": "تکمیل/تقدیس 1640ء",
 "Rebuilt 1670 (site associated with saint d. c.1290)":
     "دوبارہ تعمیر 1670ء (مقام تقریباً 1290 میں وفات پانے والے بزرگ سے منسوب)",
 "Associated with saint (d. 1384)": "بزرگ سے منسوب (وفات 1384)",
 "Associated with Shah Hussain (1538–1599)": "شاہ حسین (1538–1599) سے منسوب",
 "Established 1861 (British Raj)": "قیام 1861ء (برطانوی راج)",
 "Historic; rebuilt/raised 1810; destroyed 1992":
     "تاریخی؛ دوبارہ تعمیر 1810ء؛ 1992ء میں منہدم",
 "1920s (present temple); ancient sacred site":
     "1920 کی دہائی (موجودہ مندر)؛ قدیم مقدس مقام",
 "Founded 9th century CE; abandoned 1947": "نویں صدی عیسوی میں قائم؛ 1947ء میں متروک",
 "Built 9th–10th century CE": "نویں–دسویں صدی عیسوی میں تعمیر",
 "ancient; construction date undocumented": "قدیم؛ تعمیر کی تاریخ غیر مندرج",
 "Buildings date 12th–15th century CE": "عمارتیں بارہویں–پندرہویں صدی عیسوی کی",
 "Approx. 300 years old": "تقریباً 300 سال پرانا",
 "Approx. 200 years old": "تقریباً 200 سال پرانا",
 "c. 18th century (~300+ years old)": "تقریباً اٹھارہویں صدی (~300+ سال پرانا)",
 "British colonial period (19th c.); no exact year":
     "برطانوی نوآبادیاتی دور (انیسویں صدی)؛ کوئی متعین سال نہیں",
 "ancient": "قدیم",
 "2007 (Paris Road temple)": "2007ء (پیرس روڈ مندر)",
 "Completed 1684 CE": "تکمیل 1684ء",
 "1951 (mausoleum; Iqbal d. 1938)": "1951ء (مقبرہ؛ اقبال کی وفات 1938)",
 "16th century (saint died 1583 CE; shrine developed thereafter)":
     "سولہویں صدی (بزرگ کی وفات 1583ء؛ مزار بعد میں ترقی پذیر)",
 "Early 17th century (mausoleum); saint born 1576 CE":
     "سترہویں صدی کا اوائل (مقبرہ)؛ بزرگ کی پیدائش 1576ء",
 "Late 19th century (founder born 1846 CE)": "انیسویں صدی کا اواخر (بانی کی پیدائش 1846ء)",
 "1834 (present structure); commemorates Guru Nanak":
     "1834ء (موجودہ عمارت)؛ گرو نانک کی یادگار",
 "Commemorates events of c. 1520-21; gurdwara built later":
     "تقریباً 1520–21 کے واقعات کی یادگار؛ گوردوارہ بعد میں تعمیر",
 "Commemorates Guru Nanak's stay in the early 16th century; gurdwara built later":
     "سولہویں صدی کے اوائل میں گرو نانک کے قیام کی یادگار؛ گوردوارہ بعد میں تعمیر",
 "16th century (traditionally attributed to Raja Man Singh I)":
     "سولہویں صدی (روایتاً راجا مان سنگھ اول سے منسوب)",
 "Late 16th-early 17th century (Mughal era)":
     "سولہویں صدی کا اواخر–سترہویں صدی کا اوائل (مغل دور)",
 "17th century (saint died 1638)": "سترہویں صدی (بزرگ کی وفات 1638)",
 "1375-1376 CE": "1375–1376ء",
 "Early 20th century": "بیسویں صدی کا اوائل",
 "18th century (saint died 1776)": "اٹھارہویں صدی (بزرگ کی وفات 1776)",
 "Early 19th century (saint died 1818)": "انیسویں صدی کا اوائل (بزرگ کی وفات 1818)",
 "Unknown (traditional Sufi shrine)": "نامعلوم (روایتی صوفی مزار)",
 "Early 19th century (saint died 1811)": "انیسویں صدی کا اوائل (بزرگ کی وفات 1811)",
 "1599 (baoli commissioned by Guru Arjan Dev)":
     "1599ء (باؤلی گرو ارجن دیو کے حکم سے)",
 "1585 CE (993 AH)": "1585ء (993ھ)",
 "14th century (traditionally)": "چودہویں صدی (روایتاً)",
 "16th century (saint d. 1590)": "سولہویں صدی (بزرگ کی وفات 1590)",
 "1741 CE (1154 AH); saint d. 1623": "1741ء (1154ھ)؛ بزرگ کی وفات 1623",
 "15th century (attributed)": "پندرہویں صدی (منسوب)",
 "1737 (khanqah)": "1737ء (خانقاہ)",
 "commemorates Guru Hargobind (r. 1606–1644)":
     "گرو ہرگوبند کی یادگار (دورِ اقتدار 1606–1644)",
 "commemorates Guru Nanak (early 16th century)":
     "گرو نانک کی یادگار (سولہویں صدی کا اوائل)",
 "Commemorates Guru Nanak's stay in the early 16th century; gurdwara built later":
     "سولہویں صدی کے اوائل میں گرو نانک کے قیام کی یادگار؛ گوردوارہ بعد میں تعمیر",
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. LOCATION COMPOSITION
# ─────────────────────────────────────────────────────────────────────────────
# split on Latin/Arabic commas and slashes but keep parenthetical groups
def translate_segment(seg):
    s = seg.strip()
    if not s:
        return ""
    # exact token
    if s in PLACE_TOKENS:
        return PLACE_TOKENS[s]
    # "<X> District" / "<X> Tehsil" / "<X> Taluka" — Urdu puts the class word first
    m = re.match(r"^(.*)\s+(District|Tehsil|Taluka)$", s)
    if m and m.group(1) in PLACE_TOKENS:
        prefix = {"District": "ضلع", "Tehsil": "تحصیل", "Taluka": "تعلقہ"}[m.group(2)]
        return f"{prefix} {PLACE_TOKENS[m.group(1)]}"
    # "near X" — Urdu uses the postposition "<X> کے قریب"
    m = re.match(r"^near\s+(.*)$", s, re.I)
    if m:
        inner = translate_segment(m.group(1))
        if inner is not None:
            return f"{inner} کے قریب"
    # parenthetical: "A (B)"
    m = re.match(r"^(.*?)\s*\((.*)\)$", s)
    if m:
        a = translate_segment(m.group(1))
        b = translate_segment(m.group(2))
        if a is not None and b is not None:
            return f"{a} ({b})"
    return None  # signal: unknown

def translate_location(loc):
    # normalise the one row that already contains an Arabic comma
    loc = loc.replace("،", ",")
    parts = [p for p in re.split(r"\s*,\s*", loc) if p.strip()]
    out, unknown = [], []
    for p in parts:
        t = translate_segment(p)
        if t is None:
            unknown.append(p)
            out.append(p)  # leave English (flagged)
        else:
            out.append(t)
    return "، ".join(out), unknown

# ─────────────────────────────────────────────────────────────────────────────
# 7. SUFI GLOSSARY (reused from data/glossary.csv, en/translit -> ur)
# ─────────────────────────────────────────────────────────────────────────────
import csv


def load_glossary():
    glossary = {}
    # urdu-i18n/ sits at the repo root, so the glossary is at ../data/glossary.csv
    cand = os.path.normpath(os.path.join(OUT, "..", "data", "glossary.csv"))
    if not os.path.exists(cand):
        print(f"NOTE: glossary file not found at {cand} — building without the Sufi glossary.",
              file=sys.stderr)
        return glossary
    with open(cand, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            en = (r.get("english") or "").strip()
            ur = (r.get("urdu") or "").strip()
            if en and ur:
                glossary[en] = ur
    return glossary

# ─────────────────────────────────────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────────────────────────────────────
def build(rows, glossary):
    """Compose the structured dictionary and flat runtime seed from the data above."""
    assert len(NAME_LIST) == len(rows), f"name count {len(NAME_LIST)} != rows {len(rows)}"
    names_map = {rows[i]["name"]: NAME_LIST[i] for i in range(len(rows))}

    # locations
    loc_unique = sorted({r["location"] for r in rows if r["location"]})
    locations_map, loc_unknowns = {}, {}
    for loc in loc_unique:
        ur, unk = translate_location(loc)
        locations_map[loc] = ur
        if unk:
            loc_unknowns[loc] = unk

    # flat runtime seed (en -> ur), everything the app looks up by full string
    seed = {}
    seed.update(CATEGORIES)
    seed.update(TRADITIONS)
    seed.update(TOUR_REGIONS)
    seed.update(TOUR_THEMES)
    seed.update(TOUR_ERAS)
    seed.update(names_map)
    seed.update(SAINTS)
    seed.update(FOUNDED)
    seed.update(locations_map)
    seed.update(glossary)

    # structured dictionary (human-readable source of truth)
    structured = {
        "_meta": {
            "project": "Sufi Shrines of Pakistan",
            "purpose": "Authoritative English->Urdu dictionary for UI data localization.",
            "note": "Numbers are kept in Western digits; convert to Eastern (۰-۹) "
                    "at render time via the numeral toggle. Do not bake Eastern digits here.",
            "counts": {},
        },
        "categories": CATEGORIES,
        "traditions": TRADITIONS,
        "tourRegions": TOUR_REGIONS,
        "tourThemes": TOUR_THEMES,
        "tourEras": TOUR_ERAS,
        "placeTokens": PLACE_TOKENS,
        "shrineNames": names_map,
        "saints": SAINTS,
        "foundedPhrases": FOUNDED,
        "locations": locations_map,
        "sufiGlossary": glossary,
    }
    structured["_meta"]["counts"] = {
        "categories": len(CATEGORIES), "traditions": len(TRADITIONS),
        "tourRegions": len(TOUR_REGIONS), "tourThemes": len(TOUR_THEMES),
        "tourEras": len(TOUR_ERAS), "placeTokens": len(PLACE_TOKENS),
        "shrineNames": len(names_map), "saints": len(SAINTS),
        "foundedPhrases": len(FOUNDED), "locations": len(locations_map),
        "sufiGlossary": len(glossary), "flatSeedEntries": len(seed),
    }
    return structured, seed, names_map, loc_unknowns


def render_outputs(structured, seed):
    """Serialised file contents keyed by filename.

    The generated JSON embeds no timestamps, so --check can compare these
    strings byte-for-byte against the files on disk.
    """
    return {
        "urdu-dictionary.json":
            json.dumps(structured, ensure_ascii=False, indent=2),
        "shrine-translations.seed.json":
            json.dumps(seed, ensure_ascii=False, indent=2, sort_keys=True),
    }


# ─────────────────────────────────────────────────────────────────────────────
# VALIDATE
# ─────────────────────────────────────────────────────────────────────────────
LATIN = re.compile(r"[A-Za-z]")
def leaks(m):
    return {k: v for k, v in m.items() if LATIN.search(v)}


def validate(rows, structured, names_map, loc_unknowns):
    """Print the coverage + Latin-leak report. Returns True when validation FAILED."""
    print("=== COVERAGE ===")
    for k, v in structured["_meta"]["counts"].items():
        print(f"  {k:18} {v}")

    failed = False

    print("\n=== LATIN-LEAK CHECK (values still containing A-Z) ===")
    for label, m in [("names", names_map), ("saints", SAINTS), ("founded", FOUNDED),
                     ("categories", CATEGORIES), ("tourFacets",
                      {**TOUR_REGIONS, **TOUR_THEMES, **TOUR_ERAS})]:
        lk = leaks(m)
        print(f"  {label:12} leaks: {len(lk)}")
        if lk:
            failed = True
        for k, v in list(lk.items())[:10]:
            print(f"      - {k!r} -> {v!r}")

    print(f"\n  locations with unknown tokens: {len(loc_unknowns)}")
    if loc_unknowns:
        failed = True
    for loc, unk in list(loc_unknowns.items())[:40]:
        print(f"      - {unk}  (in: {loc})")

    # saints coverage vs data
    data_saints = sorted({r["saint"] for r in rows if r["saint"]})
    missing_saints = [s for s in data_saints if s not in SAINTS]
    print(f"\n  saint strings in data: {len(data_saints)} | missing from dict: {len(missing_saints)}")
    if missing_saints:
        failed = True
    for s in missing_saints[:40]:
        print(f"      MISSING SAINT: {s!r}")

    # founded coverage vs data (only alphabetic)
    data_founded_alpha = sorted({r["founded"] for r in rows if r["founded"] and LATIN.search(r["founded"])})
    missing_founded = [s for s in data_founded_alpha if s not in FOUNDED]
    print(f"\n  alphabetic founded in data: {len(data_founded_alpha)} | missing: {len(missing_founded)}")
    if missing_founded:
        failed = True
    for s in missing_founded[:60]:
        print(f"      MISSING FOUNDED: {s!r}")

    return failed


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Build (default) or verify (--check) the Urdu data dictionary.")
    ap.add_argument(
        "--check", action="store_true",
        help="Run all validation and compare the regenerated outputs against the "
             "files on disk without writing anything; exit non-zero on any "
             "mismatch or validation failure.")
    args = ap.parse_args(argv)

    rows = load_rows()
    glossary = load_glossary()
    structured, seed, names_map, loc_unknowns = build(rows, glossary)
    outputs = render_outputs(structured, seed)

    if not args.check:
        for filename, text in outputs.items():
            with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
                f.write(text)

    failed = validate(rows, structured, names_map, loc_unknowns)

    if args.check:
        stale = []
        for filename, text in outputs.items():
            try:
                with open(os.path.join(OUT, filename), encoding="utf-8") as f:
                    on_disk = f.read()
            except OSError:
                on_disk = None
            if on_disk != text:
                stale.append(filename)
        for filename in stale:
            print(f"\n[build_dictionary --check] STALE: urdu-i18n/{filename} does not "
                  "match the regenerated output.")
        if stale:
            print("Regenerate with `npm run data:build:urdu` (or `npm run urdu:build`) "
                  "and commit the result.")
        if failed:
            print("\n[build_dictionary --check] FAILED — Latin leakage or missing Urdu "
                  "coverage detected (see above).")
        if failed or stale:
            return 1
        print("\n[build_dictionary --check] OK — outputs up to date, 100% coverage, "
              "zero Latin-script leaks.")
        return 0

    print("\nWROTE: urdu-dictionary.json, shrine-translations.seed.json")
    if failed:
        print("\n[build_dictionary] FAILED — Latin leakage or missing Urdu coverage detected (see above).")
        return 1
    print("\n[build_dictionary] OK — 100% coverage, zero Latin-script leaks.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
