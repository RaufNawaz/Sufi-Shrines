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
    """
    The row universe the dictionary is built and validated against.

    **This must not drift from the app's own dataset.** On 20 August 2026 it held
    143 rows while `src/data/shrines-fallback.json` held 169, so this script
    reported "100% coverage, zero Latin-script leaks" — and `npm run
    data:validate` passed — while 27 shrines had no Urdu name at all, along with
    17 saint strings, 30 founding phrases and 23 rows' worth of place tokens.
    The check was measuring the wrong universe, which is the most expensive kind
    of passing test: it reports a safety it never established.

    So the drift is now an error, not a footnote in the README.
    """
    with open(os.path.join(OUT, "_shrine_rows.json"), encoding="utf-8") as f:
        rows = json.load(f)

    app_snapshot = os.path.normpath(
        os.path.join(OUT, "..", "src", "data", "shrines-fallback.json")
    )
    if os.path.exists(app_snapshot):
        with open(app_snapshot, encoding="utf-8") as f:
            live = json.load(f).get("rows", [])
        snap_names = {r.get("name", "") for r in rows}
        live_names = {r.get("Name", "") for r in live}
        only_live = sorted(live_names - snap_names)
        only_snap = sorted(snap_names - live_names)
        if only_live or only_snap:
            raise SystemExit(
                "[build_dictionary] ERROR — _shrine_rows.json has drifted from the app's\n"
                "dataset, so every coverage number below would be measured against the\n"
                "wrong universe.\n"
                "  in the app but not in this snapshot (%d): %s\n"
                "  in this snapshot but not in the app (%d): %s\n"
                "Refresh urdu-i18n/_shrine_rows.json from src/data/shrines-fallback.json\n"
                "(name/location/category/founded/saint per row), then rerun."
                % (len(only_live), ", ".join(only_live[:8]) or "-",
                   len(only_snap), ", ".join(only_snap[:8]) or "-")
            )
    return rows

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
 # ── Added 20 August 2026 with the row-snapshot refresh (143 → 169).
 # Street, village, mohalla, taluka and district names the older 143-row
 # universe never contained. Unreviewed drafts; the Sindhi and Balochi
 # place names in particular have more than one current spelling.
 "Chak": "چک",
 "Chowmala Mohalla": "چومالا محلہ",
 "inside Bhati Gate": "بھاٹی دروازے کے اندر",
 "Darya Lal Street": "دریا لال اسٹریٹ",
 "Jodia Bazaar": "جوڑیا بازار",
 "Digano Mahesar village": "ڈگانو مہیسر گاؤں",
 "Miro Khan taluka": "میرو خان تعلقہ",
 "Qambar–Shahdadkot District": "قمبر–شہدادکوٹ ضلع",
 "Girhor Sharif": "گرہوڑ شریف",
 "near Pithoro": "پتھورو کے قریب",
 "Umarkot": "عمرکوٹ",
 "Gracy Lines": "گریسی لائنز",
 "Chaklala Cantonment": "چکلالہ کینٹ",
 "Hadiara village": "ہدیارہ گاؤں",
 "Heart of Gandava (Gandawah) town": "گنداوہ شہر کا مرکز",
 "Lasbela District": "لسبیلہ ضلع",
 "Jhalian (Jhalian Dhilwan)": "جھلیاں (جھلیاں ڈھلواں)",
 "near Barki": "برکی کے قریب",
 "Kennedy Market area": "کینیڈی مارکیٹ کا علاقہ",
 "Larkana": "لاڑکانہ",
 "Larkana District": "لاڑکانہ ضلع",
 "Laki (Lakhi)": "لکی (لکھی)",
 "Lalkurti": "لال کرتی",
 "Rawalpindi Cantonment": "راولپنڈی کینٹ",
 "Near Kotra (Moola gorge area)": "کوٹڑہ کے قریب (مولا درہ کا علاقہ)",
 "Near Naulung (Moola gorge)": "نولنگ کے قریب (مولا درہ)",
 "Gandava area": "گنداوہ کا علاقہ",
 "Near the Sukkur–Rohri (Lansdowne/Ayub) railway bridge":
     "سکھر–روہڑی (لینز ڈاؤن/ایوب) ریلوے پل کے قریب",
 "Panno Aqil (Pano Akil)": "پنو عاقل",
 "Mohallah Puran Nagar": "محلہ پران نگر",
 "Raharki (Raherki Sahib)": "راڑھکی (راڑھکی صاحب)",
 "Daharki Taluka": "ڈہرکی تعلقہ",
 "Ghotki District": "گھوٹکی ضلع",
 "Shahi Bazaar": "شاہی بازار",
 "Kalat": "قلات",
 "Shivalo mohalla": "شیوالو محلہ",
 "Kambar (Qambar) town": "کمبر (قمبر) شہر",
 "Temple Road": "ٹیمپل روڈ",
 "Mozang": "موزنگ",
 "Thekrati Bazar": "ٹھیکراتی بازار",
 "old city": "پرانا شہر",
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
SHRINE_NAMES = {
 # Keyed on the exact English Name, not positional.
 #
 # This was a bare list matched to _shrine_rows.json by index, with only a
 # length assertion guarding it — so a reordered sheet would have silently
 # renamed every shrine in the archive, and the build would still have
 # reported "100% coverage". A dict cannot mis-assign.
 #
 # The 27 entries added 20 August 2026 are UNREVIEWED DRAFTS. They are
 # Pakistani place and shrine names whose native script is Perso-Arabic, so
 # writing them here restores the original spelling rather than translating
 # it; conventions follow the existing entries ("Shrine of X" → مزارِ X,
 # Gurdwara → گوردوارہ, Temple/Mandir → مندر, Darbar → دربار). Confidence is
 # lower for the Sindhi Hindu darbars, where more than one spelling is
 # current. See urdu-i18n/README.md and docs/TODO.md §0.
 "Allo Mahar": "آلو مہار",
 "Amb Temples (Amb Sharif)": "امب مندر (امب شریف)",
 "Bari Imam": "باری امام",
 "Bhagnari Mandir": "بھگناری مندر",
 "Bhai Sant Thawan Das Mandir": "بھائی سنت تھاون داس مندر",
 "Bhai Waliram Darbar": "بھائی والی رام دربار",
 "Bhit (Bhit Shah)": "بھٹ (بھٹ شاہ)",
 "Chandragup (Baba Chandragup)": "چندرا گپ (بابا چندرا گپ)",
 "Churrio Jabal Durga Mata Temple": "چڑیو جبل درگا ماتا مندر",
 "Darbar Abul Muali Qadri": "دربار ابو المعالی قادری",
 "Darbar Ghamkol Sharif (Zinda Pir)": "دربار گھمکول شریف (زندہ پیر)",
 "Darbar Ghazi Ilm Din Shaheed": "دربار غازی علم دین شہید",
 "Darbar Hazrat Khawaja Feroz-ud-Din Gharib Nawaz Chishti Nizami":
     "دربار حضرت خواجہ فیروز الدین غریب نواز چشتی نظامی",
 "Darbar Hazrat Khawaja Shah Muhammad Sulaiman Taunsvi (R.A)":
     "دربار حضرت خواجہ شاہ محمد سلیمان تونسوی (رحمۃ اللہ علیہ)",
 "Darbar Hazrat Tahir Bandagi Qadri": "دربار حضرت طاہر بندگی قادری",
 "Darbar Malik Ahmad Ayaz": "دربار ملک احمد ایاز",
 "Darbar Sakhi Shah Chan Charagh": "دربار سخی شاہ چن چراغ",
 "Darbar Wasif Ali Wasif": "دربار واصف علی واصف",
 "Dargah / Roza Sufi Shah Inayat Shaheed": "درگاہ / روضہ صوفی شاہ عنایت شہید",
 "Dargah Fateh Pur Sharif": "درگاہ فتح پور شریف",
 "Dargah of Khwaja Muhammad Zaman (Luari Sharif)": "درگاہ خواجہ محمد زمان (لواری شریف)",
 "Dargah of Pir Muhammad Rashid (Roze Dhani), Pir Jo Goth":
     "درگاہ پیر محمد راشد (روزے دھنی)، پیر جو گوٹھ",
 "Dargah Pir Ratan Nath Jee": "درگاہ پیر رتن ناتھ جی",
 "Darya Lal Mandir (Darya Lal Sankat Mochan Mandir)": "دریا لال مندر (دریا لال سنکٹ موچن مندر)",
 "Data Darbar": "داتا دربار",
 "Eidgah Sharif": "عیدگاہ شریف",
 "Garh Maharaja (Shorkot)": "گڑھ مہاراجہ (شورکوٹ)",
 "Golra Sharif": "گولڑہ شریف",
 "Gorakhnath (Goraknath) Temple": "گورکھ ناتھ مندر",
 "Gori Temple (Gori jo Mandar)": "گوری مندر (گوری جو مندر)",
 "Gurdas Ram Mandir": "گرداس رام مندر",
 "Gurdwara Babay De Ber": "گوردوارہ بابے دی بیر",
 "Gurdwara Babay Nanki": "گوردوارہ بابے نانکی",
 "Gurdwara Balila Sahib (Bal Lila Sahib)": "گوردوارہ بالیلا صاحب (بال لیلا صاحب)",
 "Gurdwara Baoli Sahib (Guru Arjan Dev Ji), Lahore": "گوردوارہ باؤلی صاحب (گرو ارجن دیو جی)، لاہور",
 "Gurdwara Bhai Beba Singh": "گوردوارہ بھائی بیبا سنگھ",
 "Gurdwara Bhai Joga Singh": "گوردوارہ بھائی جوگا سنگھ",
 "Gurdwara Chakki Sahib": "گوردوارہ چکی صاحب",
 "Gurdwara Chhevin Patshahi, Chitti Gatti": "گوردوارہ چھیویں پاتشاہی، چٹی گٹی",
 "Gurdwara Chhevin Patshahi, Jhalian (Jhalian Dhilwan)":
     "گوردوارہ چھیویں پاتشاہی، جھلیاں (جھلیاں ڈھلواں)",
 "Gurdwara Chhevin Patshahi, Mozang": "گوردوارہ چھیویں پاتشاہی، موزنگ",
 "Gurdwara Choa Sahib": "گوردوارہ چوآ صاحب",
 "Gurdwara Chowmala Sahib": "گوردوارہ چومالا صاحب",
 "Gurdwara Darbar Sahib Kartarpur": "گوردوارہ دربار صاحب کرتارپور",
 "Gurdwara Dash Mesh Pita": "گوردوارہ دشمیش پِتا",
 "Gurdwara Dera Sahib": "گوردوارہ ڈیرہ صاحب",
 "Gurdwara Guru Ram Das Ji": "گوردوارہ گرو رام داس جی",
 "Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)":
     "گوردوارہ کھوہی بھائی لالو (بھائی لالو دی کھوہی)",
 "Gurdwara Malji Sahib": "گوردوارہ مالجی صاحب",
 "Gurdwara Panja Sahib": "گوردوارہ پنجہ صاحب",
 "Gurdwara Panjvi Chati Patshahi": "گوردوارہ پنجویں چھٹی پاتشاہی",
 "Gurdwara Patshahi Chhevin (Hadiara), Lahore": "گوردوارہ پاتشاہی چھیویں (ہدیارہ)، لاہور",
 "Gurdwara Patti Sahib": "گوردوارہ پٹی صاحب",
 "Gurdwara Pehli Patshahi (Jind Pir), Sukkur": "گوردوارہ پہلی پاتشاہی (جند پیر)، سکھر",
 "Gurdwara Rori Sahib": "گوردوارہ روڑی صاحب",
 "Gurdwara Sach Khand Sahib": "گوردوارہ سچ کھنڈ صاحب",
 "Gurdwara Sacha Sauda": "گوردوارہ سچا سودا",
 "Gurdwara Sahib Saidpur (Guru Nanak Dev Ji)": "گوردوارہ صاحب سید پور (گرو نانک دیو جی)",
 "Gurdwara Shaheed Bhai Taru Singh": "گوردوارہ شہید بھائی تارو سنگھ",
 "Gurdwara Shaheed Ganj Singh Singhnian": "گوردوارہ شہید گنج سنگھ سنگھنیاں",
 "Gurdwara Singh Sabha": "گوردوارہ سنگھ سبھا",
 "Gurdwara Sri Kiara Sahib": "گوردوارہ سری کیارہ صاحب",
 "Gurdwara Sri Tilganji Sahib": "گوردوارہ سری تلگنجی صاحب",
 "Gurdwara Tambo Sahib": "گوردوارہ ٹمبو صاحب",
 "Guru Gurpat Mandir (DB-80 Sirey Ghat)": "گرو گرپت مندر (ڈی بی-80 سرے گھاٹ)",
 "Gurudwara Janam Asthan Nankana Sahib": "گوردوارہ جنم استھان ننکانہ صاحب",
 "Jagannath Temple, Sialkot": "جگن ناتھ مندر، سیالکوٹ",
 "Jain Mandir, Lahore": "جین مندر، لاہور",
 "Jhollay Lal Mandir": "جھولے لال مندر",
 "Kalat Kali Temple": "قلات کالی مندر",
 "Kali Bari Mandir": "کالی باری مندر",
 "Kalka Cave Temple (Asthan of Kalka Devi)": "کالکا غار مندر (استھان کالکا دیوی)",
 "Katas Raj Temples": "کٹاس راج مندر",
 "Khatwari Darbar, Shikarpur": "کھٹواری دربار، شکارپور",
 "Krishna Mandir (Kabari Bazar)": "کرشنا مندر (کباڑی بازار)",
 "Krishna Mandir (Ravi Road)": "کرشنا مندر (راوی روڈ)",
 "Lal Kurti Temple (Balmiki Mandir), Rawalpindi": "لال کرتی مندر (بالمیکی مندر)، راولپنڈی",
 "Lal Shahbaz Qalandar": "لعل شہباز قلندر",
 "Langer Makhdoom": "لنگر مخدوم",
 "Loh Temple (Lava Temple)": "لوہ مندر (لاوا مندر)",
 "Mausoleum of Waris Shah": "مقبرہ وارث شاہ",
 "Mazar of Bulleh Shah": "مزارِ بلھے شاہ",
 "Mithankot (Kot Mithan)": "مٹھن کوٹ (کوٹ مٹھن)",
 "Mohra Sharif (Khanqah)": "موہڑہ شریف (خانقاہ)",
 "Nagarparkar Jain Temples (Nagarparkar Cultural Landscape)":
     "ننگرپارکر جین مندر (ننگرپارکر ثقافتی منظرنامہ)",
 "Panj Tirath": "پنج تیرتھ",
 "Parnami Mandir": "پرنامی مندر",
 "Prahladpuri Temple": "پرہلاد پوری مندر",
 "Purana Bhalwal": "پرانا بھلوال",
 "Rahman Baba Mausoleum (Rehman Baba Shrine)": "مقبرہ رحمان بابا (رحمان بابا مزار)",
 "Ram Mandir, Saidpur (Ram Kund Mandir)": "رام مندر، سید پور (رام کنڈ مندر)",
 "Ramapir Temple, Tando Allahyar": "رامہ پیر مندر، ٹنڈو الہ یار",
 "Ranmal Sharif": "رانمل شریف",
 "Sadh Belo (Sadh Belo Island Temple)": "سادھ بیلو (سادھ بیلو جزیرہ مندر)",
 "Sain Vali Vilayat Rai Darbar, Kambar": "سائیں ولی ولایت رائے دربار، کمبر",
 "Sakhi Sarwar": "سخی سرور",
 "Samadhi of Maharaja Ranjit Singh": "سمادھی مہاراجہ رنجیت سنگھ",
 "Sant Baba Asudaram Darbar (Panno Aqil)": "سنت بابا آسودا رام دربار (پنو عاقل)",
 "Sant Baba Bhagat Ram Darbar Mandir": "سنت بابا بھگت رام دربار مندر",
 "Sant Bhagat Kanwar Ram Temple (Chak)": "سنت بھگت کنور رام مندر (چک)",
 "Sant Satram Dham, Raharki (Sacho Satram / Devri Sahib)":
     "سنت ست رام دھام، راڑھکی (ساچو ست رام / دیوری صاحب)",
 "Sevapanthi Darbar (Bhai Gurdas), Gandava": "سیوا پنتھی دربار (بھائی گرداس)، گنداوہ",
 "Shah Noorani Shrine (Syed Bilawal Shah Noorani)": "مزارِ شاہ نورانی (سید بلاول شاہ نورانی)",
 "Shah Yousuf": "شاہ یوسف",
 "Shahwala Teja Singh Mandir": "شاہ والا تیجا سنگھ مندر",
 "Shaktipeeth Shri Hinglaj Mata Mandir": "شکتی پیٹھ شری ہنگلاج ماتا مندر",
 "Shamsabad": "شمس آباد",
 "Sharada Peeth": "شاردا پیٹھ",
 "Shergarh": "شیر گڑھ",
 "Shiv Mandir Chiti Ghati": "شیو مندر چٹی گھاٹی",
 "Shree Ratneshwar Mahadev Temple, Karachi": "شری رتنیشور مہادیو مندر، کراچی",
 "Shri Laxmi Narayan Mandir (Native Jetty Bridge)": "شری لکشمی نارائن مندر (نیٹو جیٹی پل)",
 "Shri Panchmukhi Hanuman Mandir (Karachi)": "شری پنچمکھی ہنومان مندر (کراچی)",
 "Shri Swaminarayan Mandir, Karachi": "شری سوامی نارائن مندر، کراچی",
 "Shri Varun Dev Mandir": "شری ورون دیو مندر",
 "Shrine at Odero Lal (Udero Lal Teerath Asthan)": "اوڈیرو لال کا مقام (اُڈیرو لال تیرتھ استھان)",
 "Shrine of Abdullah Shah Ghazi": "مزارِ عبداللہ شاہ غازی",
 "Shrine of Abul Faiz Qalander Ali Suharwardi": "مزارِ ابو الفیض قلندر علی سہروردی",
 "Shrine of Akhund Darweza Baba": "مزارِ آخوند درویزہ بابا",
 "Shrine of Akhund Panju Baba": "مزارِ آخوند پنجو بابا",
 "Shrine of Baba Shah Chiragh": "مزارِ بابا شاہ چراغ",
 "Shrine of Baba Shah Kamal": "مزارِ بابا شاہ کمال",
 "Shrine of Bahauddin Zakariya": "مزارِ بہاؤالدین زکریا",
 "Shrine of Bibi Pak Daman": "مزارِ بی بی پاک دامن",
 "Shrine of Fariduddin Ganjshakar": "مزارِ فرید الدین گنج شکر",
 "Shrine of Ganj e Inayat Sarkar": "مزارِ گنجِ عنایت سرکار",
 "Shrine of Hafiz Muhammad Jamal Multani": "مزارِ حافظ محمد جمال ملتانی",
 "Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)":
     "مزارِ حضرت مادھو لال حسین (شاہ حسین دربار)",
 "Shrine of Hazrat Muhammad Ayub Shah Bukhari": "مزارِ حضرت محمد ایوب شاہ بخاری",
 "Shrine of Hazrat Shah Ali Akbar (Shah Ali Akbar Shamsi)":
     "مزارِ حضرت شاہ علی اکبر (شاہ علی اکبر شمسی)",
 "Shrine of Hazrat Shah Daula Daryai": "مزارِ حضرت شاہ دولہ دریائی",
 "Shrine of Imam Ali-ul-Haq": "مزارِ امام علی الحق",
 "Shrine of Jalaluddin Surkh-Posh Bukhari (Jalaluddin Bukhari)":
     "مزارِ جلال الدین سرخ پوش بخاری (جلال الدین بخاری)",
 "Shrine of Lakhi Shah Saddar": "مزارِ لکھی شاہ سدر",
 "Shrine of Makhdoom Abdul Rahim Girhori": "مزارِ مخدوم عبدالرحیم گرہوڑی",
 "Shrine of Makhdoom Jahaniyan Jahangasht": "مزارِ مخدوم جہانیاں جہاں گشت",
 "Shrine of Makhdoom Nooh (Hala)": "مزارِ مخدوم نوح (ہالہ)",
 "Shrine of Mauj Darya Bukhari": "مزارِ موج دریا بخاری",
 "Shrine of Mian Mir": "مزارِ میاں میر",
 "Shrine of Mian Umar Baba (Chamkani)": "مزارِ میاں عمر بابا (چمکنی)",
 "Shrine of Miran Hussain Zanjani (Zanjani Sahib)": "مزارِ میراں حسین زنجانی (زنجانی صاحب)",
 "Shrine of Peer Makki": "مزارِ پیر مکی",
 "Shrine of Pir Baba (Syed Ali Tirmizi)": "مزارِ پیر بابا (سید علی ترمذی)",
 "Shrine of Pir Chhatal Shah Noorani": "مزارِ پیر چھتل شاہ نورانی",
 "Shrine of Pir Lakha (Aab-e-Shifa), Jhal Magsi": "مزارِ پیر لاکھا (آبِ شفا)، جھل مگسی",
 "Shrine of Pir Mangho": "مزارِ پیر منگھو",
 "Shrine of Pir Sher Muhammad": "مزارِ پیر شیر محمد",
 "Shrine of Qalandar Baba Auliya": "مزارِ قلندر بابا اولیاء",
 "Shrine of Sachal Sarmast": "مزارِ سچل سرمست",
 "Shrine of Shah Abdul Karim Bulri": "مزارِ شاہ عبدالکریم بلڑی",
 "Shrine of Shah Inayat Qadiri": "مزارِ شاہ عنایت قادری",
 "Shrine of Shah Jamal": "مزارِ شاہ جمال",
 "Shrine of Shah Rukn-e-Alam": "مزارِ شاہ رکنِ عالم",
 "Shrine of Shah Shams-ud-Din Sabzwari": "مزارِ شاہ شمس الدین سبزواری",
 "Shrine of Shah Yusaf Gardez": "مزارِ شاہ یوسف گردیز",
 "Shrine of Syed Musa Pak": "مزارِ سید موسیٰ پاک",
 "Sial Sharif": "سیال شریف",
 "Swami Dharmdas Darbar, Larkana (Kennedy Market)": "سوامی دھرم داس دربار، لاڑکانہ (کینیڈی مارکیٹ)",
 "Tilla Jogian": "ٹلہ جوگیاں",
 "Tomb of Allama Iqbal (Mazar-e-Iqbal)": "مقبرہ علامہ اقبال (مزارِ اقبال)",
 "Tomb of Baha'al-Halim (Uch Sharif)": "مقبرہ بہاء الحلیم (اوچ شریف)",
 "Tomb of Javindi Bibi": "مقبرہ بی بی جاوندی",
 "Tomb of Qutbuddin Aibak": "مقبرہ قطب الدین ایبک",
 "Tomb of Ustad Nuriya": "مقبرہ استاد نوریہ",
 "Umarkot (Amarkot) Shiv Mandir": "عمرکوٹ (امرکوٹ) شیو مندر",
 "Valmik Mandir (Naqi Road)": "والمیک مندر (نقی روڈ)",
 "Valmiki Swamiji Mandir (Gracy Lines), Rawalpindi":
     "والمیکی سوامی جی مندر (گریسی لائنز)، راولپنڈی",
 "Wadpagga Sharif": "واد پگہ شریف",
 "Ziarat Kaka Sahib": "زیارت کاکا صاحب",
}

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
 # Both men became figures in their own right on 28 August 2026, when the three
 # rows whose figure cell names two people stopped collapsing to one. Until then
 # Bhai Mardana was not in the knowledge graph at all and Bhai Lalo existed only
 # inside a composite node's name, so neither had a page whose title needed Urdu.
 # Each rendering is lifted from the compound entry directly above/below rather
 # than composed: "گرو نانک اور بھائی مردانہ" and "بھائی لالو سے منسوب".
 "Bhai Mardana": "بھائی مردانہ",
 "Bhai Lalo": "بھائی لالو",
 # Added 28 August 2026 for the same reason: Bibi Jawindi had no node until her
 # tomb stopped being filed under Jalaluddin Surkh-Posh Bukhari, so no page title
 # needed her name in Urdu. Not composed — lifted whole from the already reviewed
 # shrine entry "Tomb of Javindi Bibi" -> "مقبرہ بی بی جاوندی".
 "Bibi Jawindi": "بی بی جاوندی",
 # Added 28 August 2026 with `saintDescriptiveCells`, which shortened five figure
 # cells from "name + description" to the name proper. The long forms were in the
 # dictionary and the short ones were not, so shortening the slug opened a fresh
 # Urdu hole in the same commit that closed a URL one. Each is lifted from the
 # reviewed long entry, never composed:
 #   "ملک احمد ایاز، سروے کے مطابق…"        -> head before the comma
 #   "بھائی گرداس (سیوا پنتھی روایت)؛…"      -> head before the parenthesis
 #   "بھائی گرداس سنگھ (کنہیا لال)،…"        -> head before the parenthesis
 #   "حضرت سید محمد خیر الدین، معروف بہ…"    -> head before the comma
 # and two where only the honorific حضرت comes off, because the English name
 # does not carry it either:
 #   "حضرت داتا گنج بخش"  ->  "داتا گنج بخش"
 #   "حضرت شاہ دولہ دریائی" -> "شاہ دولہ دریائی"
 # NOT added, and left as recorded debt: "Lava". Its reviewed entry reads
 # "لو (لاوا)، رام اور سیتا کے بیٹے" — the Urdu leads with لو (Luv) where the
 # English leads with Lava, and "Loh Temple (Lava Temple)" uses لاوا for the same
 # figure. Which form heads his page is a reviewer's call, not a derivation.
 "Malik Ahmad Ayaz": "ملک احمد ایاز",
 "Bhai Gurdas": "بھائی گرداس",
 "Bhai Gurdas Singh": "بھائی گرداس سنگھ",
 "Hazrat Syed Muhammad Khair ul Deen": "حضرت سید محمد خیر الدین",
 "Data Ganj Bakhsh": "داتا گنج بخش",
 "Shah Daula Daryai": "شاہ دولہ دریائی",
 # The Gori Temple's legacy cell describes the building, not the figure:
 # "Jain temple dedicated to Parshvanatha (23rd Tirthankara)". saintDescriptiveCells
 # now resolves it to the deity. The Urdu here is the one case where the reviewed
 # string LEADS with the name where the English does not —
 # "پرشو ناتھ (23ویں تیرتھنکر) سے منسوب جین مندر" — so the head is the name and
 # the generic derivation, which requires a trailing parenthetical, correctly
 # declines it.
 "Parshvanatha": "پرشو ناتھ",
 # Titles adopted 29 August 2026 under Rauf's epithet ruling — the formal name
 # heads the page, the epithet stays the URL. Only these two of seven could be
 # applied, because only these two have an Urdu form already reviewed; the rest
 # wait in _pending_saintDisplayNames. Both lifted from the parenthetical of the
 # reviewed entry, never composed:
 #   "لکی شاہ صدر (سید شاہ صدرالدین لکیاری)"
 #   "کاکا صاحب (سید کستیر گل، \"شیخ رحمکار\")"
 "Syed Shah Sadaruddin Lakyari": "سید شاہ صدرالدین لکیاری",
 "Syed Kasteer Gul": "سید کستیر گل",
 # Kalka Devi split off from Kali on the same ruling; her Urdu is the
 # parenthetical of "Goddess Kali (Kalka Devi)" = "دیوی کالی (کالکا دیوی)".
 "Kalka Devi": "کالکا دیوی",
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
 # ── Figures the kinship pass named, added 29 August 2026 ─────────────────────
 # Eight people the archive names only as somebody's father, uncle or forebear.
 # They became graph nodes when `familyRelations` landed, and a new lineage-only
 # node with no dictionary entry is a figure page titled in Latin in the Urdu
 # view — the exact regression this block exists to prevent. Adding them here
 # returns the lineage-only Urdu debt to the 58 recorded on 28 August rather
 # than raising the ceiling to 66.
 #
 # Same practice as the block below: the Perso-Arabic spelling is the ORIGINAL
 # for seven of these names, so this restores it rather than translating.
 # "Sri Chand" is the exception — a Punjabi name in its usual Urdu spelling.
 # UNREVIEWED DRAFTS.
 # ── The lineage-only figures, 30 August 2026 ────────────────────────────────
 # 57 people who appear in someone else's recorded lineage and have no shrine in
 # this archive. Each has a page, and each page was titled in Latin script in the
 # Urdu view — the largest single block of Urdu debt left, and the one
 # figureNameUrduParity.test.ts has been holding at a ceiling rather than
 # closing.
 #
 # For all but a handful this is RESTORATION, not translation: the names are
 # Arabic, Persian or Urdu in origin and the Perso-Arabic spelling is the
 # original. Where the recorded name carries an English connective — "of
 # Delhi", "known as", "the princess" — that part is translated, following the
 # same rule as the glossed entries below.
 #
 # UNREVIEWED DRAFTS. Confidence is high across the Muslim names and lower for
 # the second group, where more than one spelling is current; both groups are
 # marked so a reviewer knows where to look first. See TRANSLATION_LOG.md.
 "Abdullah Ansari Sultanpuri": "عبداللہ انصاری سلطان پوری",
 "Abu\u2019l-Fadl Muhammad al-Khuttali": "ابوالفضل محمد الخُتَّلی",
 "Ala Hazrat Ahmad Raza Khan of Bareilly": "اعلیٰ حضرت احمد رضا خان بریلوی",
 "Baba Jango Pir Shah Suhrawardi": "بابا جنگو پیر شاہ سہروردی",
 "Bahadur Baba": "بہادر بابا",
 "Bahlol (Bahlol Daryai)": "بہلول (بہلول دریائی)",
 "Fakhr-ud-Din Iraqi": "فخر الدین عراقی",
 "Haji Tufail": "حاجی طفیل",
 "Hazrat Abu al-Barakat Syed Muhammad Ahmad": "حضرت ابو البرکات سید محمد احمد",
 "Hazrat Ghulam Muhammad Suhrawardi": "حضرت غلام محمد سہروردی",
 "Hazrat Khawaja Sheikh Muhammad Mustafa Chishti-Nizami":
     "حضرت خواجہ شیخ محمد مصطفیٰ چشتی نظامی",
 "Hazrat Mian Fazal Deen": "حضرت میاں فضل دین",
 "Hazrat Mian Qurban Ali Shah Sarkar": "حضرت میاں قربان علی شاہ سرکار",
 "Hazrat Pir Syed Ismail Shah Bukhari (Karman Wali Sarkar)":
     "حضرت پیر سید اسماعیل شاہ بخاری (کرمانوالی سرکار)",
 "Hazrat Shah Niyaz Ahmad Chisti Qadri": "حضرت شاہ نیاز احمد چشتی قادری",
 "Hazrat Shah Raza Qadri Shattari": "حضرت شاہ رضا قادری شطاری",
 "Hazrat Shah Sikandar": "حضرت شاہ سکندر",
 "Hazrat Sufi Peer Syed Gohar Ali Shah (Syed Ali Gohar), known as Shah Gohar Peer":
     "حضرت صوفی پیر سید گوہر علی شاہ (سید علی گوہر)، معروف بہ شاہ گوہر پیر",
 "Hazrat Syedna Tahir Alauddin Qadiri Gilani": "حضرت سیدنا طاہر علاؤالدین قادری گیلانی",
 "Khwaja Abdul Haq": "خواجہ عبدالحق",
 "Khwaja Abul Masakin": "خواجہ ابو المساکین",
 "Khwaja Nizamuddin Aulia of Kahiyan Sharif": "خواجہ نظام الدین اولیاء کہیاں شریف",
 "Khwaja Noor Muhammad Maharvi": "خواجہ نور محمد مہاروی",
 "Khwaja Pir Muhammad Zahid Khan": "خواجہ پیر محمد زاہد خان",
 "Khwaja Qutbuddin Bakhtiar Kaki": "خواجہ قطب الدین بختیار کاکی",
 "Khwaja Shamsuddin Azeemi": "خواجہ شمس الدین عظیمی",
 "Makhdoom of Kasur": "مخدومِ قصور",
 "Maulana Abdul Lateef Sultanpuri": "مولانا عبداللطیف سلطان پوری",
 "Maulana Ghulam Ali Okarvi": "مولانا غلام علی اوکاڑوی",
 "Miraj-ud-Din Gilani Suhrawardi": "معراج الدین گیلانی سہروردی",
 "Muhammad Ali Raza Shattari": "محمد علی رضا شطاری",
 "Mullah Shah Badakhshi": "ملا شاہ بدخشی",
 "Nizamuddin Auliya": "نظام الدین اولیاء",
 "Pir Sayyid Badshah": "پیر سید بادشاہ",
 "Prince Dara Shikoh": "شہزادہ دارا شکوہ",
 "Qazi Abul Aala": "قاضی ابو العلاء",
 "Rasool Shah Gilani Suhrawardi": "رسول شاہ گیلانی سہروردی",
 "Sahibzada Muhammad Umar Naqshbandi": "صاحبزادہ محمد عمر نقشبندی",
 "Sayyid Abdul Rahman of Delhi": "سید عبدالرحمٰن دہلوی",
 "Sayyid Shah Inayat": "سید شاہ عنایت",
 "Shah Maroof Khushabi": "شاہ معروف خوشابی",
 "Shah Saidan Sarmast": "شاہ سیدان سرمست",
 "Shahid Rasool Shah Gilani Suhrawardi": "شہید رسول شاہ گیلانی سہروردی",
 "Shaikh Abdul Latif": "شیخ عبداللطیف",
 "Shaikh Shihab-ud-Din Abu Hafs Umar al-Suhrawardi":
     "شیخ شہاب الدین ابو حفص عمر سہروردی",
 "Shaikh Siyustani": "شیخ سیوستانی",
 "Sheikh Abu al-Fazal Khatil": "شیخ ابو الفضل خطیل",
 "Sheikh Akhuddeen Seljuki": "شیخ اخی الدین سلجوقی",
 "Sheikh Khokar Baig Suhrawardi": "شیخ کھوکھر بیگ سہروردی",
 "Syed Ul Hassan Kabeer": "سید الحسن کبیر",
 "the princess Jahanara": "شہزادی جہاں آرا",
 # Lower confidence — more than one spelling is current for each, and for the
 # Sindhi Hindu sant names in particular. Same caveat the 20 August block
 # records for "Asudaram" and "Satramdas". A reviewer should start here.
 "Guru Amar Das": "گرو امر داس",
 "Matsyendranath": "متسیندر ناتھ",
 "Sai Chanduram": "سائیں چندو رام",
 "Sain Jiwat Singh": "سائیں جیوت سنگھ",
 "Sant Bhai Wasan Shah of Rohri": "سنت بھائی واسن شاہ روہڑی",
 "Vishandas": "وشن داس",

 # Rama's sons, and a case the derivation rule above explicitly cannot reach —
 # it is the reversal the rule's own comment warns about. The reviewed entry is
 # "Lava (Luv), son of Rama and Sita" -> "لو (لاوا)، رام اور سیتا کے بیٹے":
 # English leads with Lava and glosses Luv, the Urdu leads with لو and glosses
 # لاوا. So the bare Urdu for "Lava" is the PARENTHETICAL, not the head, and a
 # rule that strips a tail would title his page لو. Both spellings are in the
 # reviewed entry; both are keyed here, each to its own half.
 "Lava": "لاوا",
 "Luv": "لو",
 "Syed Nasiruddin Mahmud": "سید نصیر الدین محمود",
 "Sayyid Ahmad Tokhta Tirmidhi": "سید احمد تختہ ترمذی",
 "Hazrat Peer Syed Abdullah": "حضرت پیر سید عبداللہ",
 "Sheikh Abdul Qadir Gilani": "شیخ عبدالقادر جیلانی",
 "Syed Ahmad Shah": "سید احمد شاہ",
 "Sri Chand": "سری چند",
 "Hazrat Hafiz Muhammad Abdul Karim": "حضرت حافظ محمد عبدالکریم",
 "Jamal-ud-Din Gilani": "جمال الدین جیلانی",
 # Not a new node — he was already in the graph as Baba Ji's successor at Eidgah
 # Sharif — but the kinship row that now names him reads "‹Latin name› کے والد"
 # in the Urdu view, so the debt was suddenly sitting inside an Urdu sentence
 # rather than beside one. Translating him is a line.
 "Hazrat Hafiz Muhammad Abdur Rahman": "حضرت حافظ محمد عبدالرحمٰن",

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
 # ── Added 20 August 2026, when the row snapshot was refreshed from 143 to
 # 169 rows and the coverage check finally saw the whole archive. Unreviewed
 # drafts; see docs/TODO.md §0.
 "Bhagat Kanwar Ram (1885–1939)": "بھگت کنور رام (1885ء–1939ء)",
 "Bhai Gurdas (Sevapanthi tradition); veneration of Guru Nanak":
     "بھائی گرداس (سیوا پنتھی روایت)؛ گرو نانک کی عقیدت",
 "Bhai Gurdas Singh (Kanhiya Lal), disciple of Guru Gobind Singh":
     "بھائی گرداس سنگھ (کنہیا لال)، گرو گوبند سنگھ کے مرید",
 "Guru Hargobind": "گرو ہرگوبند",
 "Guru Hargobind (Sixth Guru / Chhevin Patshahi)": "گرو ہرگوبند (چھٹے گرو / چھیویں پاتشاہی)",
 "Guru Nanak (First Guru / Pehli Patshahi)": "گرو نانک (پہلے گرو / پہلی پاتشاہی)",
 "Hazrat Wasif Ali Wasif Awan (born Muhammad Wasif Awan; \"Wasif\" was his pen name/takhallus)":
     "حضرت واصف علی واصف اعوان (اصل نام محمد واصف اعوان؛ \"واصف\" اُن کا تخلص تھا)",
 "Kali (deity)": "کالی (دیوی)",
 "Makhdoom Abdul Rahim Girhori (1739–1778)": "مخدوم عبدالرحیم گرہوڑی (1739ء–1778ء)",
 "Malik Ahmad Ayaz (also given as \"Malik Ayaz Ahmad\" and \"Malik Ayaz\"), described in the survey as slave of Mahmud Ghaznavi, minister, and governor of Lahore":
     "ملک احمد ایاز (بعض جگہ \"ملک ایاز احمد\" اور \"ملک ایاز\" بھی درج)، سروے کے مطابق محمود غزنوی کے غلام، وزیر اور لاہور کے گورنر",
 "Pir Chhatal Shah Noorani (Pir Chatta)": "پیر چھتل شاہ نورانی (پیر چھتہ)",
 "Sain Vali Vilayat Rai (b. 1825)": "سائیں ولی ولایت رائے (پیدائش 1825ء)",
 "Sant Baba Asudaram \"Sakhi Baba\" (1895–1960)": "سنت بابا آسودا رام \"سخی بابا\" (1895ء–1960ء)",
 "Satguru Swami Sai Satramdas Sahib (1866–1910)": "ستگرو سوامی سائیں ست رام داس صاحب (1866ء–1910ء)",
 "Shiva (associated deity)": "شیو (متعلقہ دیوتا)",
 "Swami Dharmdas (Nanakpanthi sant)": "سوامی دھرم داس (نانک پنتھی سنت)",
 "Valmiki (Bhagwan Valmik)": "والمیکی (بھگوان والمیک)",
}

# ─────────────────────────────────────────────────────────────────────────────
# 4b. SILSILAS (keyed by exact `silsila` sheet value). Only the clean order
#     names — the four survey-prose values in that column stay untranslated
#     on purpose and render inside <bdi> like other unreviewed source notes.
# ─────────────────────────────────────────────────────────────────────────────
SILSILAS = {
 "Qadiri": "قادری",
 "Chishti": "چشتی",
 "Suhrawardi": "سہروردی",
 "Naqshbandi": "نقشبندی",
 "Chishti-Nizami": "چشتی نظامی",
 "Naqshbandi-Mujaddidi": "نقشبندی مجددی",
 "Azeemia": "عظیمیہ",
 "Malamati": "ملامتی",
 "Qalandari": "قلندری",
 "Rashidi": "راشدی",
 "Sarwari Qadiri": "سروری قادری",
 "Qadri Shattari": "قادری شطاری",
 "Naushahia Qadiri": "نوشاہیہ قادری",
 "Chishti Nizamia Qadria": "چشتی نظامیہ قادریہ",
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
 # ── Added 20 August 2026 with the snapshot refresh (143 → 169 rows).
 # Several of these are qualifying notes rather than dates — "1024 AH (as
 # given in the form; not a construction date)" — and CLAUDE.md RULE 2 calls
 # that the most honest content in the archive. The hedge is translated, not
 # tidied away. Unreviewed drafts.
 "1024 AH (as given in the form; not a construction date)":
     "1024ھ (فارم میں یہی درج ہے؛ یہ تعمیر کی تاریخ نہیں)",
 "1041 (as given: \"8 August 1041\")": "1041 (جیسا درج ہے: \"8 اگست 1041\")",
 "1359 (site/settlement); present dargah c. 1940 (after Syed Rakhyal Shah's death)":
     "1359 (مقام/آبادی)؛ موجودہ درگاہ تقریباً 1940 (سید رکھیل شاہ کی وفات کے بعد)",
 "1619 (commemorated event); original structure raised under Maharaja Ranjit Singh (early 19th c.); present building rebuilt 1926 by Sardar Mehar Singh":
     "1619 (یادگاری واقعہ)؛ اصل عمارت مہاراجہ رنجیت سنگھ کے عہد میں (اوائل انیسویں صدی)؛ موجودہ عمارت 1926 میں سردار مہر سنگھ نے دوبارہ بنوائی",
 "1630 CE (8 Muharram 1040 AH)": "1630ء (8 محرم 1040ھ)",
 "17th century (Guru Hargobind's visit and Bhai Jiwan's conversion of his house into a gurdwara); hall enlarged 1915":
     "سترہویں صدی (گرو ہرگوبند کی آمد اور بھائی جیون کا اپنے گھر کو گوردوارے میں بدلنا)؛ ہال 1915 میں وسیع کیا گیا",
 "18th century (c. 1725–1750)": "اٹھارہویں صدی (تقریباً 1725–1750)",
 "18th century (c. 1728, per figure's death; a field survey separately gives 1141 AH)":
     "اٹھارہویں صدی (تقریباً 1728، بزرگ کی وفات کے حساب سے؛ ایک فیلڈ سروے الگ سے 1141ھ دیتا ہے)",
 "18th century (saint d. 1778)": "اٹھارہویں صدی (بزرگ کی وفات 1778)",
 "18th–19th century (Sevapanthi foundation; exact date uncertain)":
     "اٹھارہویں–انیسویں صدی (سیوا پنتھی بنیاد؛ متعین تاریخ غیر یقینی)",
 "1931 (present darbar building); Baba Gurpat Sahib active in Hyderabad c. 1830-1877":
     "1931 (موجودہ دربار کی عمارت)؛ بابا گرپت صاحب حیدرآباد میں تقریباً 1830–1877 فعال رہے",
 "1940 (Darbar Sahib established by Sant Asudaram)": "1940 (دربار صاحب سنت آسودا رام نے قائم کیا)",
 "Commemorates Guru Hargobind's 1613 visit; Guru Arjan Dev's association with the site is traditional and undated":
     "گرو ہرگوبند کی 1613 کی آمد کی یادگار؛ گرو ارجن دیو کا اِس مقام سے تعلق روایتی ہے اور غیر مؤرخ",
 "Late 19th–early 20th century (era of Sant Satramdas, 1866–1910)":
     "اواخر انیسویں–اوائل بیسویں صدی (سنت ست رام داس کا زمانہ، 1866–1910)",
 "Late 19th–early 20th century (uncertain)": "اواخر انیسویں–اوائل بیسویں صدی (غیر یقینی)",
 "Mid–late 19th century (founder b. 1825)": "وسط–اواخر انیسویں صدی (بانی کی پیدائش 1825)",
 "Natural site; veneration is of unrecorded antiquity, attested in the living Hinglaj pilgrimage tradition":
     "قدرتی مقام؛ عقیدت کی قدامت درج نہیں، مگر ہنگلاج کی زندہ زیارتی روایت میں اِس کی شہادت موجود ہے",
 "November 27, 1981 CE / 1402 AH": "27 نومبر 1981ء / 1402ھ",
 "Recent (built within the last decade or so, replacing an unlocated pre-Partition gurdwara)":
     "حالیہ (گزشتہ ایک دہائی کے دوران تعمیر، تقسیم سے پہلے کے ایک غیر متعین گوردوارے کی جگہ)",
 "Traditional founding date uncertain/legendary (accounts range from antiquity to the 11th–12th century CE); abandoned 1947":
     "روایتی تاریخِ بنیاد غیر یقینی/روایتی (بیانات قدیم زمانے سے گیارہویں–بارہویں صدی عیسوی تک پھیلے ہیں)؛ 1947 میں متروک",
 "Traditionally linked to Guru Nanak's third udasi (early 16th century)":
     "روایتاً گرو نانک کی تیسری اُداسی سے منسوب (اوائل سولہویں صدی)",
 "Traditionally linked to a visit of Guru Hargobind (early 17th century); present structure colonial-era":
     "روایتاً گرو ہرگوبند کی ایک آمد سے منسوب (اوائل سترہویں صدی)؛ موجودہ عمارت نوآبادیاتی دور کی",
 "Undocumented": "غیر دستاویزی",
 "Unknown": "نامعلوم",
 "Unknown (recorded 1831; traditionally centuries old)":
     "نامعلوم (1831 میں درج؛ روایتاً صدیوں پرانا)",
 "after 1939 (rebuilt 2006)": "1939 کے بعد (2006 میں دوبارہ تعمیر)",
 "c. 1620 (visit of Guru Hargobind); present structure later":
     "تقریباً 1620 (گرو ہرگوبند کی آمد)؛ موجودہ عمارت بعد کی",
 "c. 1661 (mausoleum, built by his son); saint traditionally born 1575 CE, died 1653":
     "تقریباً 1661 (مقبرہ، اُن کے صاحبزادے نے بنوایا)؛ بزرگ کی روایتی پیدائش 1575ء، وفات 1653",
 "c. 1849 (mid-19th century)": "تقریباً 1849 (وسط انیسویں صدی)",
 "traditionally said to be about 1,500 years old (Sewa dynasty, pre-Islamic era); exact date unknown":
     "روایتاً تقریباً 1,500 سال پرانا کہا جاتا ہے (سیوا خاندان، قبل از اسلام دور)؛ متعین تاریخ نامعلوم",
}

# ─────────────────────────────────────────────────────────────────────────────
# 5b. OBSERVANCES (the `Events` column, segment by segment)
# ─────────────────────────────────────────────────────────────────────────────
# Why segments rather than whole cells: the column is semicolon-joined, so 318
# occurrences reduce to 190 distinct segments, and the 29 below account for 157
# of them. The almanac splits on ';' and looks each part up, which is why the
# keys here have no trailing punctuation.
#
# Why not compose from tokens: "urs" + "annual" + "spring" would let this file
# decide Urdu word order, which is exactly the bug that made the almanac's
# coverage line read "169 places out of 32" (HANDOVER §9.52). A whole segment is
# translated once, by hand, or not at all.
#
# These are DRAFTS. Same standing as the shrine-name and founding-phrase
# additions: written carefully, not signed off by a fluent speaker. What is not
# here stays in English and is counted as declared debt by
# e2e/urdu-no-leak.spec.ts, which is the honest way round — a wrong Urdu
# observance would be worse than a visibly untranslated one.
OBSERVANCES = {
    # ── ʿurs and Sufi programme ──────────────────────────────────────────────
    "Annual urs": "سالانہ عرس",
    "Annual urs (spring)": "سالانہ عرس (بہار)",
    "langar": "لنگر",
    "daily langar": "روزانہ لنگر",
    "qawwali": "قوالی",
    "qawwali and naat": "قوالی اور نعت",
    "naat and qawwali": "نعت اور قوالی",
    "qawwali and langar": "قوالی اور لنگر",
    "Thursday-evening qawwali and dhamal": "جمعرات کی شام قوالی اور دھمال",
    "large annual gathering": "بڑا سالانہ اجتماع",
    # ── Hindu observances ────────────────────────────────────────────────────
    "Holi": "ہولی",
    "Diwali": "دیوالی",
    "Janmashtami": "جنم اشٹمی",
    "Maha Shivratri": "مہا شیو راتری",
    "Raksha Bandhan": "رکشا بندھن",
    "Cheti Chand": "چیٹی چنڈ",
    # ── Sikh observances ─────────────────────────────────────────────────────
    "Guru Nanak Gurpurab": "گرو نانک گرپورب",
    "Guru Nanak anniversaries": "گرو نانک کی برسیاں",
    "Sikh anniversaries": "سکھ برسیاں",
    "Sikh pilgrimage": "سکھ زیارت",
    "Sikh pilgrimage, especially Guru Nanak's Gurpurab":
        "سکھ زیارت، خاص طور پر گرو نانک کا گرپورب",
    "Daily prakash": "روزانہ پرکاش",
    # ── Generic practice ─────────────────────────────────────────────────────
    "Community worship": "اجتماعی عبادت",
    "Daily worship": "روزانہ عبادت",
    "daily worship": "روزانہ عبادت",
    "Occasional pilgrimage": "کبھی کبھار زیارت",
    "heritage visitation": "ورثہ کے طور پر آمد",
    "five daily prayers": "پنج وقتہ نماز",
    # ── Absences. The archive says "we do not know" and "there is none" in
    #    different words on purpose; the Urdu keeps them apart. ──────────────
    "Not documented": "درج نہیں",
    "not currently observed": "اِس وقت نہیں منایا جاتا",
    "None - abandoned": "کوئی نہیں — متروک",
    "None - heritage site, no devotional programme":
        "کوئی نہیں — ورثہ مقام، کوئی عبادتی پروگرام نہیں",
    "no fixed public festival documented": "کوئی مقررہ عوامی تہوار درج نہیں",
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

# A Location that is a paragraph rather than an address. Six rows are like
# this, because a field survey that can only place a shrine as "Lahore" says so
# at length — deliberate, honest content (CLAUDE.md RULE 2) that must not be
# edited. Their commas are sentence commas, so comma-splitting them yields
# sentence fragments, not place names. `extractRegion` in
# src/lib/data/shrineModel.ts had exactly this bug and surfaced
# "not the grave's exact position." as a map filter option.
#
# Detected structurally rather than by a hardcoded list of rows: a place name is
# short and carries no sentence punctuation. These are reported separately and
# never counted as missing place tokens — a token dictionary is the wrong tool
# for a paragraph, and pretending otherwise would either fail the build forever
# or fill the dictionary with half-sentences.
def is_prose_location(loc):
    if len(loc) > 160:
        return True
    return bool(re.search(r"[.;](?:\s|$)", loc)) and len(loc.split()) > 12


def translate_location(loc):
    # normalise the one row that already contains an Arabic comma
    loc = loc.replace("،", ",")
    if is_prose_location(loc):
        # Left in English; the UI wraps it in <bdi> so the RTL page renders it
        # correctly. Translating it belongs to the article-content pipeline,
        # not to a place-token map.
        return loc, []
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
    unnamed = [r["name"] for r in rows if r["name"] not in SHRINE_NAMES]
    if unnamed:
        raise SystemExit(
            "[build_dictionary] ERROR — no Urdu name for %d shrine(s):\n  %s\n"
            "Add them to SHRINE_NAMES in this file. (The dictionary used to be a\n"
            "positional list validated against a stale 143-row snapshot, so 27\n"
            "shrines had no Urdu name while the build reported 100%% coverage.)"
            % (len(unnamed), "\n  ".join(unnamed))
        )
    names_map = {r["name"]: SHRINE_NAMES[r["name"]] for r in rows}

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
    seed.update(SILSILAS)
    seed.update(FOUNDED)
    seed.update(OBSERVANCES)
    # Place tokens were in the *structured* dictionary but not the flat runtime
    # seed, so `translateToUrdu('Lahore')` missed even though the dictionary has
    # had لاہور all along — only whole location strings ("…, Lahore, Punjab,
    # Pakistan") were looked up. A place rendered on its own, which is what the
    # /place/:slug pages do, had no Urdu at all. Measured before adding: 0 of the
    # 25 densest place names resolved. 282 entries, zero collisions with an
    # existing seed key, zero Latin-script values.
    seed.update(PLACE_TOKENS)
    seed.update(locations_map)
    seed.update(glossary)

    # The bare name behind a glossed entry.
    #
    # The dictionary is keyed on whole recorded strings, because that is what the
    # sheet holds: "Shiva (Mahadev)", "Jhulelal (Uderolal)", "Bulleh Shah
    # (Abdullah Shah Qadri)". The knowledge graph, on the other hand, names its
    # figure nodes with the *bare* name — the parenthetical is a gloss and
    # build-kg strips it. So a figure page asked the dictionary for "Shiva",
    # which was not a key, and rendered a Latin title on an Urdu page. Measured
    # 28 August 2026: 105 of 191 figures had no Urdu name, and 42 of them were
    # this exact miss — the Urdu existed and was reviewed, just under a longer key.
    #
    # Derived rather than hand-listed, so it keeps working as figures arrive.
    # Bibi Jawindi is the reason it is not: she was hand-added hours earlier from
    # "Tomb of Javindi Bibi" -> "مقبرہ بی بی جاوندی", and a rule that only fires
    # on "<name> (<gloss>)" cannot reach her — her name is a *suffix* of a shrine
    # title, not the head of a glossed entry. That case stays manual.
    #
    # Deliberately narrow, because the loose version is wrong. The English key
    # must be exactly "<name> (<gloss>)" AND the Urdu must itself end in a
    # parenthetical, or there is no way to say which part of the Urdu is the
    # name. Both guards earn their place on real rows:
    #   · "Jain temple dedicated to Parshvanatha (23rd Tirthankara)" reverses in
    #     Urdu — "پرشو ناتھ (23ویں تیرتھنکر) سے منسوب جین مندر" — so the
    #     parenthetical is in the middle and stripping a tail would take the
    #     wrong words. The Urdu-side guard rejects it.
    #   · A substring match instead of a prefix match pairs "Guru Gobind Singh"
    #     with an entry about Bhai Biba Singh, and takes "Bhagwan Valmik" as the
    #     Urdu for "Valmiki". Requiring the name at the *head* of the key finds
    #     the right hosts for both.
    # An ambiguous bare name — two glossed entries disagreeing about its Urdu —
    # is skipped rather than guessed.
    derived, ambiguous = {}, set()
    trailing_paren = re.compile(r"^(?P<head>.*?)\s*\([^()]*\)\s*$")
    for key, val in list(seed.items()):
        m_en = trailing_paren.match(key)
        if not m_en:
            continue
        bare = m_en.group("head").strip()
        if not bare or bare in seed:
            continue
        m_ur = trailing_paren.match(val)
        if not m_ur:
            continue
        ur = m_ur.group("head").strip()
        if not ur or LATIN.search(ur):
            continue
        if bare in derived and derived[bare] != ur:
            ambiguous.add(bare)
            continue
        derived[bare] = ur
    for bare in ambiguous:
        derived.pop(bare, None)
    seed.update(derived)

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
        "silsilas": SILSILAS,
        "foundedPhrases": FOUNDED,
        "observances": OBSERVANCES,
        "locations": locations_map,
        "sufiGlossary": glossary,
        "derivedBareNames": dict(sorted(derived.items())),
    }
    structured["_meta"]["counts"] = {
        "categories": len(CATEGORIES), "traditions": len(TRADITIONS),
        "tourRegions": len(TOUR_REGIONS), "tourThemes": len(TOUR_THEMES),
        "tourEras": len(TOUR_ERAS), "placeTokens": len(PLACE_TOKENS),
        "shrineNames": len(names_map), "saints": len(SAINTS),
        "silsilas": len(SILSILAS),
        "foundedPhrases": len(FOUNDED), "observances": len(OBSERVANCES),
        "locations": len(locations_map),
        "sufiGlossary": len(glossary), "derivedBareNames": len(derived),
        "flatSeedEntries": len(seed),
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
    for label, m in [("names", names_map), ("saints", SAINTS), ("silsilas", SILSILAS),
                     ("founded", FOUNDED),
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
