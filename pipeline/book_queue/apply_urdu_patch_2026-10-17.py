#!/usr/bin/env python3
"""Apply the Urdu-script fixes Rauf approved on 16 Oct 2026 (HANDOVER §9.357 ruling 13).

The 21 `propose` lines of data/review/PATCH_urdu_script_2026-10-15.tsv plus the three image-read
fixes of data/review/URDU_IMAGE_CHECKS_2026-10-16.md (line 17 سمادہ, line 27 باداب, line 29 گہوٹنے).
Targets are the ones the patch named: the new-rows patch CSVs, the md drafts in entries/descriptions/,
and data/import_2026-10-15.csv; line 11 also the takeaways where the misquote began and the row's
shrine entry (so the entry stays contained in the takeaways).

RULE 4: every `old` must occur EXACTLY ONCE in its file or the script refuses and writes nothing.
`--dry-run` checks only. A backup of every touched file goes to out/urdu_apply_2026-10-17/.
After applying, every `new` must occur and every `old` must be gone (re-read from disk).
"""
import hashlib, os, shutil, sys

HR = 'data/review/PATCH_new_rows_hadeeqat_ul_aulia_2026-10-10.csv'
TL = 'data/review/PATCH_new_rows_tareekh_lahore_2026-10-10.csv'
IMP = 'data/import_2026-10-15.csv'
D = 'entries/descriptions/'

def q(s):  # the same text inside a quoted CSV cell
    return s.replace('"', '""')

E = []  # (n, file, old, new)
# --- new rows, _name_ur (whole cell where the cell is exactly the old value)
nr = [
 (1, HR, 'بی بی رستی', 'بی بی راستی'),
 (2, HR, 'شیخ رجن قتال', 'شیخ راجن قتّال'),
 (3, HR, 'پیر ڈہل، ڈھل مجذوب', 'پیر ڈہل مجذوب'),
 (4, HR, 'نور محمد ثانی ناروالا', 'نور محمد ثانی نارووالہ'),
 (5, HR, ',فقیر تاجے شاہ مجذوب,', ',فقیر تاج شاہ مجذوب لاہوری,'),
 (6, HR, 'شیخ علم الدین چونیوال', 'شیخ علم الدین چونی وال'),
 (7, HR, 'شیخ علی رنگریز', 'شیخ علی رنگ ریز'),
 (8, HR, 'سوہن مجذوب اجودھنی پاکپٹنی', 'سوہن مجذوب اجودھنی پاک پٹنی'),
 (9, HR, 'حاجی سعد اللہ وزیر آبادی', 'مولانا حاجی سعداللہ وزیر آبادی'),
 (10, HR, 'پیر غازی المشہور پیر از غیب', 'پیر غازی المشہور بہ پیر از غیب'),
 (12, TL, 'مسجد پہولیان والی', 'مسجد پہولیاں والی'),
 (13, TL, 'صوفی ولی مسجد', 'صوفی والی مسجد'),
 (14, TL, 'شوالہ لالہ / دیوان رتن چند مع تالاب و سرائے', 'شوالہ لالہ رتن چند مع تالاب و سرائے'),
 (15, TL, 'ٹہاکر دوارہ رانی لچہمی', 'رانی لچہمی کا ٹہاکر دوارہ'),
 (16, TL, "سادہو چوہڑا's well and shivala", 'سادہو چوہڑ کا چاہ وشوالہ'),
 (17, TL, 'سماوہ راجہ تیجا سنگہ', 'سمادہ راجہ تیجا سنگہ'),
]
E += nr
# --- line 11, the misquotation in figure_died
o11, n11 = 'بدن کو اوچ میں لا کر دفن کیا', 'نعش مبارک حضرت کی اوچ میں لے جا کر دفن کی'
for f in (HR, IMP, 'entries/book_takeaways/hadeeqat_ul_aulia.md',
          'entries/book_takeaways/hadeeqat_ul_aulia/part_other_figures.md',
          'shrine_entries/miran-sayyid-mubarak-haqqani.md'):
    E.append((11, f, o11, n11))
# --- Description lines: md draft and import CSV
desc = [
 (18, 'ranmal-sharif', 'حضرت حاجی محمد نوشہ گنج بخش کے تھی', 'حضرت حاجی محمد نوشاہ گنج بخش کے تھی'),
 (19, 'shrine-of-bahauddin-zakariya', 'شیخ علاوٴ الدین [OCR?]', 'شیخ علاء الدین'),
 (20, 'shrine-of-fariduddin-ganjshakar', 'روزۂ داؤدی', 'روزہ داؤدی'),
 (21, 'garh-maharaja-shorkot', 'سرور عالم ﷺ کی مطابعت', 'سرور عالم صلی اللہ علیہ وسلم کی مطابعت'),
 (22, 'shrine-of-makhdoom-jahaniyan-jahangasht',
      '"شیخ مکہ امام عبداللہ یافعی، شیخ مدینہ حضرت عبداللہ المطری"',
      '"شیخ مکہ امام عبداللہ یافعی سے" … "شیخ مدینہ حضرت عبداللہ المطری"'),
 (27, 'gurdwara-chhevin-patshahi-mozang',
      '"دو گرنتھ ہین جو اب تمام رکھے ہین اور گرنتھوں کے اوپر ریشمی سائبان تنا ہوا ہے": there are two Granths, now kept complete, with a silken canopy stretched over them',
      '"دو گرنتھہ باداب تمام رکھے ہین اور گرنتھون کے اوپر ریشمی سائبان تنا ہوا ہی": two Granths are kept there with all due reverence, with a silken canopy stretched over them'),
 (29, 'gurdwara-dera-sahib', 'بنگ کوٹنے کے واسطے', 'بنگ گہوٹنے کیواسطے'),
]
for n, rid, o, nw in desc:
    E.append((n, D + rid + '.md', o, nw))
    E.append((n, IMP, q(o), q(nw)))

def md5(p): return hashlib.md5(open(p, 'rb').read()).hexdigest()

dry = '--dry-run' in sys.argv
texts, bad = {}, 0
for n, f, o, nw in E:
    t = texts.setdefault(f, open(f, encoding='utf-8').read())
    c = t.count(o)
    if c != 1:
        print(f'REFUSE line {n}: old occurs {c}x in {f}: {o[:60]}'); bad += 1
    if o != nw and nw in t and o not in nw:
        print(f'note line {n}: new text already occurs elsewhere in {f} (count before: {t.count(nw)})')
if bad:
    print(f'{bad} problem(s); nothing written'); sys.exit(1)
print(f'check ok: {len(E)} edits in {len(texts)} files')
if dry: sys.exit(0)
bk = 'out/urdu_apply_2026-10-17'
for f in texts:
    dst = os.path.join(bk, f); os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(f, dst)
new = dict(texts)
for n, f, o, nw in E:
    new[f] = new[f].replace(o, nw, 1)
for f, t in new.items():
    before = md5(f)
    with open(f, 'w', encoding='utf-8', newline='') as h: h.write(t)
    print(f'{f}: {before} -> {md5(f)}')
# re-read from disk and prove the edits landed
fail = 0
for n, f, o, nw in E:
    t = open(f, encoding='utf-8').read()
    if o in t and o not in nw: print(f'FAIL line {n}: old still in {f}'); fail += 1
    if nw not in t: print(f'FAIL line {n}: new missing in {f}'); fail += 1
print('verify', 'FAILED' if fail else 'ok'); sys.exit(1 if fail else 0)
