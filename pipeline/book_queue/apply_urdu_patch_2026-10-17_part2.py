#!/usr/bin/env python3
"""Part 2 of the 17 Oct 2026 Urdu apply (HANDOVER §9.358). Part 1 fixed the md drafts and the import CSV;
check_description_draft.py then failed on 6 drafts (Q1: an Arabic-script run of the draft must occur in the
row's shrine entry), because the shrine entries and the consolidated takeaways they were copied from still
carried the same misreadings. This carries the same approved fixes into those two record files (entry and
takeaways together, so the entry stays contained in the takeaways), and re-quotes line 22 as two exact
printed substrings without سے (the entry's list gives each name without it).
Same contract as part 1: each `old` exactly once per file or nothing is written; backup; re-read verify."""
import hashlib, os, shutil, sys
TZ = 'entries/book_takeaways/tazkirah_awliya_pak_o_hind.md'
HD = 'entries/book_takeaways/hadeeqat_ul_aulia.md'
HD4 = 'entries/book_takeaways/hadeeqat_ul_aulia/part_shrines_4.md'
TL = 'entries/book_takeaways/tareekh_lahore.md'
S = 'shrine_entries/'
IMP = 'data/import_2026-10-15.csv'
D = 'entries/descriptions/'
o27 = '"دو گرنتھ ہین جو اب تمام رکھے ہین اور گرنتھوں کے اوپر ریشمی سائبان تنا ہوا ہے" — **two Granths**, now kept complete, with'
n27 = '"دو گرنتھہ باداب تمام رکھے ہین اور گرنتھون کے اوپر ریشمی سائبان تنا ہوا ہی" — **two Granths**, kept with all due reverence (باداب تمام, read off the page image 16 Oct 2026; the transcription had "جو اب تمام"), with'
E = [
 (18, HD, 'حاجی محمد نوشہ گنج بخش کے تھی', 'حاجی محمد نوشاہ گنج بخش کے تھی'),
 (18, HD4, 'حاجی محمد نوشہ گنج بخش کے تھی', 'حاجی محمد نوشاہ گنج بخش کے تھی'),
 (18, S+'ranmal-sharif.md', 'حاجی محمد نوشہ گنج بخش کے تھی', 'حاجی محمد نوشاہ گنج بخش کے تھی'),
 (19, TZ, 'شیخ علاوٴ الدین [OCR?]', 'شیخ علاء الدین'),
 (19, S+'shrine-of-bahauddin-zakariya.md', 'شیخ علاوٴ الدین [OCR?]', 'شیخ علاء الدین'),
 (20, TZ, 'روزۂ داؤدی', 'روزہ داؤدی'),
 (20, S+'shrine-of-fariduddin-ganjshakar.md', 'روزۂ داؤدی', 'روزہ داؤدی'),
 (21, TZ, 'سرور عالم ﷺ کی مطابعت', 'سرور عالم صلی اللہ علیہ وسلم کی مطابعت'),
 (21, S+'garh-maharaja-shorkot.md', 'سرور عالم ﷺ کی مطابعت', 'سرور عالم صلی اللہ علیہ وسلم کی مطابعت'),
 (27, TL, o27, n27),
 (27, S+'gurdwara-chhevin-patshahi-mozang.md', o27, n27),
 (29, TL, 'ہین بنگ کوٹنے کے واسطے پاس', 'ہین بنگ گہوٹنے کیواسطے پاس'),
 (29, TL, '"بنگ کوٹنے کے واسطے" (p. 206', '"بنگ گہوٹنے کیواسطے" (p. 206'),
 (29, S+'gurdwara-dera-sahib.md', 'ہین بنگ کوٹنے کے واسطے پاس', 'ہین بنگ گہوٹنے کیواسطے پاس'),
 (22, D+'shrine-of-makhdoom-jahaniyan-jahangasht.md', '"شیخ مکہ امام عبداللہ یافعی سے" … "شیخ مدینہ', '"شیخ مکہ امام عبداللہ یافعی" … "شیخ مدینہ'),
 (22, IMP, '""شیخ مکہ امام عبداللہ یافعی سے"" … ""شیخ مدینہ', '""شیخ مکہ امام عبداللہ یافعی"" … ""شیخ مدینہ'),
]
md5 = lambda p: hashlib.md5(open(p, 'rb').read()).hexdigest()
texts, bad = {}, 0
for n, f, o, nw in E:
    t = texts.setdefault(f, open(f, encoding='utf-8').read())
    if t.count(o) != 1: print(f'REFUSE {n}: {t.count(o)}x in {f}: {o[:50]}'); bad += 1
if bad: sys.exit(1)
print(f'check ok: {len(E)} edits in {len(texts)} files')
if '--dry-run' in sys.argv: sys.exit(0)
bk = 'out/urdu_apply_2026-10-17_part2'
for f in texts:
    d = os.path.join(bk, f); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(f, d)
new = dict(texts)
for n, f, o, nw in E: new[f] = new[f].replace(o, nw, 1)
for f, t in new.items():
    b = md5(f); open(f, 'w', encoding='utf-8', newline='').write(t); print(f'{f}: {b} -> {md5(f)}')
fail = sum(1 for n, f, o, nw in E if nw not in open(f, encoding='utf-8').read())
print('verify', 'FAILED' if fail else 'ok'); sys.exit(1 if fail else 0)
