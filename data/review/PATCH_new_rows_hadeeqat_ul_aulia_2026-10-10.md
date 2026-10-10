# New rows from *Hadiqat al-Awliya*, 10 October 2026

**153 proposed rows** (152 on the first run; one added on 10 October when the Shah Chiragh hold was lifted, §9.313), one per grave or shrine, built by `pipeline/book_queue/build_new_rows.py`
from the takeaways' "Figures and sites not in the archive", the lines marked `[PK]` (a burial place in
present-day Pakistan). Ruled by Rauf on 10 October 2026 (HANDOVER §9.286). **Do not import this file
on its own.** Under the scope ruling of 8 October, it goes into the consolidated import, which is built
once all 31 books are integrated. That build must **drop every column whose name starts with `_`**,
because those columns are not in the sheet.

## What is in each row

Only what the book's own line says (RULE 2): `Name` (the English head up to the first "b."),
`principal_figure` (the whole head), `Location` (the city only; the book's street address is in the
row's `shrine_entries/<id>.md`), `silsila` where the line names one order, or where the Lahore group
heading names one (basis in `silsila_note`), and `figure_died` **exactly as printed**, disagreements
and `[OCR?]` flags kept. `category` Muslim Shrine, `site_type` Dargah/Mazar, `support_level`
Source-seeded, `info_level` Low, `flags` `NEW_FROM_BOOK_HADEEQAT_UL_AULIA`.
**Blank on purpose:** `Latitude`/`Longitude` (research agents later, per the ruling), `Description`
(still waits for the Description ruling), `status`. The front end already keeps a named row without
coordinates as an unmapped page. `validate_shrines.py` will report `coord_missing` on every one of
them, which is expected.

Location: Lahore 104, (blank) 18, Uch 7, Multan 6, Peshawar 5, Chunian 2, Wazirabad 2, Satghara 1, Hujra 1, Jarwa 1, Sharaqpur 1, Gujrat 1, Gujranwala 1, Sialkot 1, Bahawalpur 1.

## Lines that did not become rows (6, recorded in `pipeline/book_queue/new_rows_decisions/hadeeqat_ul_aulia.json`)

- line 3524 (**released 10 Oct, §9.313**: joined to Tarikh-e Lahore's `shaikh-abd-al-razzaq-makki-nila-gumbad`): held: entangled with the shrine-of-baba-shah-chiragh identity question (Doubt I3, a held item)
- line 3534 (**released 10 Oct, §9.313**: now row `mazar-chiragh-shah`, flagged against the archive's Shah Chiragh): held: Chiragh Shah, the same held question (Doubt I3)
- line 3575: already an archive row: the editor equates Aziz al-Din Makki with peer-makki (Doubt B21), whose entry carries this material
- line 3592: already an archive row by the notes' own tentative identification with darbar-malik-ahmad-ayaz (contradiction 12), whose entry carries it
- line 3630: not a grave or shrine: the relic collections
- line 3644: no name: the subject of entry no. 106 is unnamed in the transcription
- two unnumbered `[PK]` lines with no bold name: Mian Kalan's parents' graves in district Gujrat (both
  names and both villages OCR-flagged), and a list of Peshawar libraries.

## Rows carrying a review flag (35)

The `_review` column says why. A flagged name must be checked on the page before the row is used.
Lines that may be one person are **kept as separate rows and flagged, never merged**.

- `shaikh-mir-muhammad-yaqub-lahori`: death date disputed on the line itself; both readings kept
- `shaikh-haji-muhammad-saeed-lahori`: death date disputed on the line itself; both readings kept
- `shaikh-ladhe-shah-lahori`: name carries an OCR flag: check the page before the row is used
- `miran-sayyid-ghulam-muhyi-al-din`: the notes keep these Ghulam Muhyi al-Dins distinct (Doubt I16): do not merge (see hazrat-ghulam-muhi-al-din-qasuri-mujaddidi, maulana-ghulam-muhyi-al-din-qasuri)
- `shah-ismail-muhaddith`: may be one person: two Ismail Muhaddiths of Lahore (see shaikh-muhammad-ismail-muhaddith-wa-mufassir-lahori)
- `shaikh-khair-al-din-known-as-khair-shah-chishti-lahori`: death date disputed on the line itself; both readings kept
- `shaikh-sadi-mujaddidi-lahori`: name carries an OCR flag: check the page before the row is used; death date disputed on the line itself; both readings kept
- `shaikh-musa-ahangar-lahori`: death date disputed on the line itself; both readings kept
- `shaikh-hasan-kunjadgar-famous-as-hassu-teli-lahori`: death date disputed on the line itself; both readings kept
- `shaikh-karam-shah-qureshi-harithi`: name carries an OCR flag: check the page before the row is used
- `shaikh-muhammad-ismail-muhaddith-wa-mufassir-lahori`: may be one person: two Ismail Muhaddiths of Lahore (see shah-ismail-muhaddith)
- `mufti-muhammad-taqi`: may be one person: two Muhammad Taqis of the Mufti family (see hafiz-muhammad-taqi)
- `hafiz-muhammad-taqi`: may be one person: two Muhammad Taqis of the Mufti family (see mufti-muhammad-taqi)
- `bahle-shah-majzub-lahori`: name carries an OCR flag: check the page before the row is used
- `shah-naushahi`: name carries an OCR flag: check the page before the row is used; death date disputed on the line itself; both readings kept
- `sayyid-muhammad-muqim-entitled-muhkam-al-din`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"; may be one person: two Muhammad Muqim Muhkam al-Dins of the Hujra family (see sayyid-muhammad-muqim-muhkam-al-din)
- `sayyid-muhammad-muqim-muhkam-al-din`: death date disputed on the line itself; both readings kept; may be one person: two Muhammad Muqim Muhkam al-Dins of the Hujra family (see sayyid-muhammad-muqim-entitled-muhkam-al-din)
- `pir-sayyid-kamal-known-as-pir-jahanian`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `sayyid-abd-al-karim-famous-as-pir-bhawan-shah`: name carries an OCR flag: check the page before the row is used; location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `hazrat-ghulam-muhi-al-din-qasuri-mujaddidi`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"; the notes keep these Ghulam Muhyi al-Dins distinct (Doubt I16): do not merge (see miran-sayyid-ghulam-muhyi-al-din, maulana-ghulam-muhyi-al-din-qasuri)
- `shaikh-ghulam-murtaza-qasuri`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `haji-hafiz-qari-abd-al-malik`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `maulana-ghulam-muhyi-al-din-qasuri`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"; the notes keep these Ghulam Muhyi al-Dins distinct (Doubt I16): do not merge (see miran-sayyid-ghulam-muhyi-al-din, hazrat-ghulam-muhi-al-din-qasuri-mujaddidi)
- `abdullah-khweshgi`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `shaikh-nur-qasuri`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `sayyid-fazl-shah-of-mauza-sanda`: location unresolved within "Satghara, Hujra, Jarwa, Chunian, Sharaqpur and the Bari Doab"
- `pir-muhammad-sachiar-naushahi`: death date disputed on the line itself; both readings kept
- `sayyid-shah-ismat-allah-hamza-pahalwan-naushahi`: location unresolved within "Gujrat, Gujranwala, Wazirabad and Sialkot"
- `makhdum-shah-alam-sadr-jahan`: location unresolved within "Gujrat, Gujranwala, Wazirabad and Sialkot"
- `haji-fath-ali-muttaqi-sialkoti`: location unresolved within "Gujrat, Gujranwala, Wazirabad and Sialkot"
- `shaikh-nur-muhammad-chishti-famous-as-nur-muhammad-maharvi`: name carries an OCR flag: check the page before the row is used; location unresolved within "Bahawalpur, Maharan and the south"
- `nur-muhammad-thani-naruwala`: location unresolved within "Bahawalpur, Maharan and the south"
- `khwaja-hafiz-abd-al-khaliq-uwaisi`: location unresolved within "Bahawalpur, Maharan and the south"
- `sultan-bala-din-uwaisi`: location unresolved within "Bahawalpur, Maharan and the south"
- `sohan-majzub-ajodhani-pakpattani`: location unresolved within "Bahawalpur, Maharan and the south"
