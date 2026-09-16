#!/usr/bin/env python3
"""Build pipeline/book_queue/manifest.json from the Drive listing plus a curated table.

The Drive listing (drive_listing_<date>.json) is the raw fact: what was uploaded to the
field survey form's book folder, by whom, how big. This script adds the editorial layer
that the queue needs and that the listing cannot know:

  slug            stable ASCII id used for out/ocr/<slug>/ and every state entry
  group           urdu_shrine | urdu_other | english
  language        arabic | latin   (dominant BODY script; same vocabulary as finalize_books.py)
  route           vision      = page images read by Claude in-session (Nastaliq scans)
                  text_probe  = try the PDF's own text layer first, fall back to vision
                  epub        = unpack the EPUB, no OCR at all
  priority        queue order (lower first). Small high-value shrine books lead so the
                  pilot and the first entries land early; Masnavi last by Rauf's scoping.
  target_shrines  ids from data/shrines.json this book is expected to inform. A starting
                  hypothesis, corrected once the text is read. [] = cross-cutting or none.

Duplicates: three Drive files are byte-identical re-uploads (same title, same size). The
earliest upload is kept as the canonical id; the others are recorded under `duplicates`.

Re-run any time; output is deterministic. Never edit manifest.json by hand.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LISTING = HERE / "drive_listing_2026-09-14.json"
OUT = HERE / "manifest.json"

# slug -> curated fields. `match` is a substring of the Drive title, used to attach ids.
CURATED: dict[str, dict] = {
    # ── Urdu primary sources that feed shrine entries ──────────────────────────
    "sawaneh_shah_jamal": dict(match="Sawaneh Mubarak Hazrat Syed Shah Jamal", group="urdu_shrine", language="arabic",
        route="vision", priority=10, short_title="Sawaneh Mubarak Hazrat Syed Shah Jamal ul Bahr",
        author="(biography, author to confirm from title page)", year=None,
        target_shrines=["shah-jamal"],
        notes="Biography of Shah Jamal of Ichhra. Smallest Urdu book; pilot candidate (modern print)."),
    "hadeeqat_ul_aulia": dict(match="HADEEQAT-UL-AULIA", group="urdu_shrine", language="arabic",
        route="vision", priority=20, short_title="Hadiqat al Awliya",
        author="Mufti Ghulam Sarwar Lahori (to confirm)", year="1875 original; edition to confirm",
        target_shrines=["data-darbar", "shrine-of-mian-mir", "madho-lal-hussain", "shah-jamal", "shrine-of-mauj-darya-bukhari",
                        "bibi-pak-daman", "peer-makki", "shrine-of-shah-inayat-qadiri", "darbar-abul-muali-qadri",
                        "shrine-of-miran-hussain-zanjani-zanjani-sahib", "shrine-of-baba-shah-chiragh", "shrine-of-baba-shah-kamal"],
        notes="Tazkira of Punjab saints, Lahore heavy. Expect many Lahore rows; refine map on reading."),
    "tahqiqat_chishti": dict(match="Tahqiqaat-Chishti", group="urdu_shrine", language="arabic",
        route="vision", priority=30, short_title="Tahqiqat e Chishti",
        author="Noor Ahmad Chishti (to confirm)", year="1867 original; DLI scan 2015.315235",
        target_shrines=["data-darbar", "shrine-of-mian-mir", "madho-lal-hussain", "shah-jamal", "shrine-of-mauj-darya-bukhari",
                        "bibi-pak-daman", "peer-makki", "shrine-of-miran-hussain-zanjani-zanjani-sahib", "tomb-of-qutbuddin-aibak",
                        "shrine-of-baba-shah-chiragh", "loh-temple-lava-temple", "samadhi-of-maharaja-ranjit-singh"],
        notes="History of Lahore's monuments and shrines. Digital Library of India scan; older typeface, pilot candidate (lithograph style)."),
    "tareekh_lahore": dict(match="Tareeq-Lahore", group="urdu_shrine", language="arabic",
        route="vision", priority=40, short_title="Tarikh e Lahore",
        author="Kanhaiya Lal Hindi (to confirm)", year="1884 original; DLI scan 2015.398396",
        target_shrines=["data-darbar", "shrine-of-mian-mir", "madho-lal-hussain", "shah-jamal", "shrine-of-mauj-darya-bukhari",
                        "bibi-pak-daman", "tomb-of-qutbuddin-aibak", "samadhi-of-maharaja-ranjit-singh", "gurdwara-dera-sahib",
                        "loh-temple-lava-temple"],
        notes="Lahore monuments incl. Sikh and Hindu sites. Digital Library of India scan."),
    "tazkirah_awliya_pak_o_hind": dict(match="Tazkirah-Awliya-e-Pak-o-Hind", group="urdu_shrine", language="arabic",
        route="vision", priority=50, short_title="Tazkirah Awliya e Pak o Hind",
        author="(to confirm from title page)", year=None,
        target_shrines=[],
        notes="Compendium of saints across Pakistan and India; cross-cutting like the Tazkirah Awliya e Pakistan already used for Tier 2 entries."),
    "khulasat_ut_tawarikh": dict(match="Khulasat Ut Tawarikh", group="urdu_shrine", language="arabic",
        route="vision", priority=190, short_title="Khulasat ut Tawarikh",
        author="Sujan Rai Bhandari (1695); the scan is the PERSIAN text (pilot, p. 60 = printed 529), not an Urdu translation", year=None,
        target_shrines=["shrine-of-bahauddin-zakariya", "shrine-of-shah-rukn-e-alam", "shrine-of-fariduddin-ganjshakar", "data-darbar",
                        "shrine-of-mian-mir", "shrine-of-jalaluddin-surkh-posh-bukhari-jalaluddin-bukhari", "shrine-of-makhdoom-jahaniyan-jahangasht"],
        notes="Mughal era gazetteer and chronicle in Persian. Shrine content is incidental (suba descriptions); moved behind the English books on 14 Sep 2026 pending Rauf's call on whether 610 Persian pages are worth full transcription."),
    "wasif_qatra_qatra_qulzam": dict(match="Qatra Qatra Qulzam", group="urdu_shrine", language="arabic",
        route="vision", priority=70, short_title="Qatra Qatra Qulzam",
        author="Wasif Ali Wasif", year=None, target_shrines=["wasif-ali-wasif"],
        notes="Wasif's own writings (aphorisms). Source for a 'The Writings' section on his darbar entry, not shrine history. UrduShairi.com PDF may carry a text layer."),
    "wasif_dil_darya_samundar": dict(match="Dil Darya Samunder", group="urdu_shrine", language="arabic",
        route="text_probe", priority=71, short_title="Dil Darya Samundar",
        author="Wasif Ali Wasif", year=None, target_shrines=["wasif-ali-wasif"], notes="As above."),
    "wasif_kiran_kiran_sooraj": dict(match="Kiran Kiran Sooraj", group="urdu_shrine", language="arabic",
        route="text_probe", priority=72, short_title="Kiran Kiran Suraj",
        author="Wasif Ali Wasif", year=None, target_shrines=["wasif-ali-wasif"], notes="As above."),
    "wasif_wasifyat": dict(match="Wasifyat", group="urdu_shrine", language="arabic",
        route="text_probe", priority=73, short_title="Wasifiyat",
        author="Wasif Ali Wasif", year=None, target_shrines=["wasif-ali-wasif"], notes="As above."),

    # ── English scholarship (text layer expected; extraction not OCR) ──────────
    "shackle_risalo_shah_abdul_latif": dict(match="The Risalo of Shah Abdul Latif", group="english", language="latin",
        route="text_probe", priority=100, short_title="The Risalo of Shah Abdul Latif (Shackle tr.)",
        author="Shah Abdul Latif; Christopher Shackle (tr.)", year="2025", target_shrines=["bhit-bhit-shah"], notes="Murty Classical Library."),
    "sorley_shah_abdul_latif_of_bhit": dict(match="Sorley - Shah Abdul Latif", group="english", language="latin",
        route="text_probe", priority=101, short_title="Shah Abdul Latif of Bhit",
        author="H. T. Sorley", year="1940 (1967 reprint)", target_shrines=["bhit-bhit-shah"], notes="Life, times and shrine of Latif; 1940 scholarship, check for a text layer."),
    "schimmel_pain_and_grace": dict(match="Pain and Grace", group="english", language="latin",
        route="text_probe", priority=102, short_title="Pain and Grace",
        author="Annemarie Schimmel", year="1976 (1997)", target_shrines=["bhit-bhit-shah"], notes="Two writers: Shah Abdul Latif and Mir Dard (Delhi)."),
    "shackle_bulleh_shah_sufi_lyrics": dict(match="Sufi Lyrics_ Selections", group="english", language="latin",
        route="text_probe", priority=103, short_title="Bullhe Shah: Sufi Lyrics (Shackle tr.)",
        author="Bullhe Shah; Christopher Shackle (tr.)", year="2021", target_shrines=["mazar-of-bulleh-shah"], notes="Murty Classical Library selection."),
    "rafat_bulleh_shah_selection": dict(match="Taufiq Rafat - Bulleh Shah", group="english", language="latin",
        route="text_probe", priority=104, short_title="Bulleh Shah: A Selection (Rafat tr.)",
        author="Taufiq Rafat (tr.)", year="1982", target_shrines=["mazar-of-bulleh-shah"], notes="Scan of a 1982 Vanguard edition; text layer uncertain."),
    "waris_shah_hir_ranjha": dict(match="The Adventures of Hir and Ranjha", group="english", language="latin",
        route="text_probe", priority=105, short_title="The Adventures of Hir and Ranjha",
        author="Waris Shah; Charles Frederick Usborne (tr.)", year="2004", target_shrines=["mausoleum-of-waris-shah"], notes="Usborne's prose rendering."),
    "madho_lal_hussein_verses_lowly_fakir": dict(match="Verses of a Lowly Fakir", group="english", language="latin",
        route="text_probe", priority=106, short_title="Verses of a Lowly Fakir",
        author="Madho Lal Hussein; Naveed Alam (tr.)", year="2015", target_shrines=["madho-lal-hussain"], notes="Kafis in translation with introduction."),
    "kugle_sufis_and_saints_bodies": dict(match="Sufis and Saints' Bodies", group="english", language="latin",
        route="text_probe", priority=107, short_title="Sufis and Saints' Bodies",
        author="Scott A. Kugle", year="2007", target_shrines=["madho-lal-hussain"], notes="Chapter on Shah Hussayn of Lahore; other chapters outside Pakistan."),
    "eaton_essays_islam_indian_history": dict(match="Essays on Islam and Indian History", group="english", language="latin",
        route="text_probe", priority=108, short_title="Essays on Islam and Indian History",
        author="Richard M. Eaton", year="2000 (2003)", target_shrines=["shrine-of-fariduddin-ganjshakar"],
        notes="Includes the Baba Farid shrine essay (political and religious authority) and Sufi folk literature essay."),
    "ernst_lawrence_sufi_martyrs_of_love": dict(match="Sufi Martyrs of Love", group="english", language="latin",
        route="text_probe", priority=109, short_title="Sufi Martyrs of Love",
        author="Carl W. Ernst and Bruce B. Lawrence", year="2002",
        target_shrines=["shrine-of-fariduddin-ganjshakar", "darbar-hazrat-khawaja-shah-muhammad-sulaiman-taunsvi-r-a", "sial-sharif", "golra-sharif"],
        notes="Chishti order across South Asia; Pakistan chapters on Taunsa, Sial and Golra lineages to confirm."),
    "rizvi_history_of_sufism_india_1": dict(match="A History of Sufism in India 1", group="english", language="latin",
        route="text_probe", priority=110, short_title="A History of Sufism in India, vol. 1",
        author="Saiyid Athar Abbas Rizvi", year="1978",
        target_shrines=["shrine-of-fariduddin-ganjshakar", "shrine-of-bahauddin-zakariya", "shrine-of-shah-rukn-e-alam", "data-darbar",
                        "shrine-of-jalaluddin-surkh-posh-bukhari-jalaluddin-bukhari", "shrine-of-makhdoom-jahaniyan-jahangasht", "lal-shahbaz-qalandar"],
        notes="92 MB scan; text layer uncertain. Early Chishti and Suhrawardi saints of Multan, Uch, Pakpattan, Lahore."),
    "kasmani_queer_companions": dict(match="Queer Companions", group="english", language="latin",
        route="text_probe", priority=111, short_title="Queer Companions",
        author="Omar Kasmani", year="2022", target_shrines=["lal-shahbaz-qalandar"], notes="Ethnography of Sehwan Sharif fakirs."),
    "boivin_hindu_sufis_south_asia": dict(match="The Hindu Sufis of South Asia", group="english", language="latin",
        route="text_probe", priority=112, short_title="The Hindu Sufis of South Asia",
        author="Michel Boivin", year="2019", target_shrines=["lal-shahbaz-qalandar", "shrine-at-odero-lal-udero-lal-teerath-asthan", "jhollay-lal-mandir"],
        notes="Sindhi shrine culture across Partition."),
    "schaflechner_hinglaj_devi": dict(match="Hinglaj Devi", group="english", language="latin",
        route="text_probe", priority=113, short_title="Hinglaj Devi",
        author="Jurgen Schaflechner", year="2017", target_shrines=["shaktipeeth-shri-hinglaj-mata-mandir"], notes="Monograph on the Hinglaj pilgrimage. Row id to confirm (blank id in shrines.json)."),
    "werbner_basu_embodying_charisma": dict(match="Embodying Charisma", group="english", language="latin",
        route="text_probe", priority=114, short_title="Embodying Charisma",
        author="Pnina Werbner and Helene Basu (eds.)", year="1998", target_shrines=["darbar-ghamkol-sharif-zinda-pir"],
        notes="Werbner's Zindapir (Ghamkol Sharif) chapter; other chapters India."),
    "abbas_female_voice_sufi_ritual": dict(match="The Female Voice in Sufi Ritual", group="english", language="latin",
        route="text_probe", priority=115, short_title="The Female Voice in Sufi Ritual",
        author="Shemeem Burney Abbas", year="2002", target_shrines=["lal-shahbaz-qalandar", "bhit-bhit-shah", "data-darbar"],
        notes="Practices (qawwali, dhamal, women's participation) across Pakistani shrines."),
    "qureshi_sufi_music_qawwali": dict(match="Sufi Music of India and Pakistan", group="english", language="latin",
        route="text_probe", priority=116, short_title="Sufi Music of India and Pakistan",
        author="Regula Burckhardt Qureshi", year="1986 (1995)", target_shrines=[], notes="Qawwali; mostly Nizamuddin Auliya (Delhi). Practices background only."),
    "rozehnal_islamic_sufism_unbound": dict(match="Islamic Sufism Unbound", group="english", language="latin",
        route="text_probe", priority=117, short_title="Islamic Sufism Unbound",
        author="Robert Rozehnal", year="2007", target_shrines=[], notes="Chishti Sabiri order in Pakistan; institutional background."),
    "schimmel_as_through_a_veil": dict(match="As Through a Veil", group="english", language="latin",
        route="text_probe", priority=118, short_title="As Through a Veil",
        author="Annemarie Schimmel", year="1982", target_shrines=["mazar-of-bulleh-shah", "bhit-bhit-shah", "garh-maharaja-shorkot"],
        notes="Chapter on Sufi poetry in regional languages (Sindhi, Punjabi)."),
    "schimmel_mystical_dimensions_of_islam": dict(match="Mystical Dimensions of Islam", group="english", language="latin",
        route="text_probe", priority=119, short_title="Mystical Dimensions of Islam",
        author="Annemarie Schimmel", year="1975 (2011)", target_shrines=[], notes="Reference background; Indo-Muslim chapter."),
    "khalid_walking_with_nanak": dict(match="Walking with Nanak", group="english", language="latin",
        route="text_probe", priority=120, short_title="Walking with Nanak",
        author="Haroon Khalid", year="2016",
        target_shrines=["gurudwara-janam-asthan-nankana-sahib", "gurdwara-darbar-sahib-kartarpur", "gurdwara-panja-sahib", "gurdwara-dera-sahib", "gurdwara-babay-de-ber"],
        notes="146 MB; likely image heavy. Travel account of Nanak sites in Pakistan."),
    "dhillon_janamsakhis": dict(match="Janamsakhis", group="english", language="latin",
        route="text_probe", priority=121, short_title="Janamsakhis: Ageless Stories, Timeless Values",
        author="Harish Dhillon", year="2015", target_shrines=["gurudwara-janam-asthan-nankana-sahib", "gurdwara-panja-sahib", "gurdwara-darbar-sahib-kartarpur"],
        notes="Retold janamsakhi stories; use for the legend layer of gurdwara entries, flagged as tradition."),
    "khalid_a_white_trail": dict(match="A WHITE TRAIL", group="english", language="latin",
        route="text_probe", priority=122, short_title="A White Trail",
        author="Haroon Khalid", year="2013", target_shrines=["katas-raj-temples", "shaktipeeth-shri-hinglaj-mata-mandir", "krishna-mandir-ravi-road"],
        notes="Religious minorities' sites; confirm which rows appear."),
    "khalid_in_search_of_shiva": dict(match="In Search of Shiva", group="english", language="latin",
        route="epub", priority=123, short_title="In Search of Shiva",
        author="Haroon Khalid", year="2015", target_shrines=[], notes="EPUB; folk shrines of Punjab, mostly small sites. Check against rows."),

    # ── Urdu texts with no shrine to attach (Abshaar corpus) ───────────────────
    "masnavi_01": dict(match="Masnavi_01 -", group="urdu_other", language="arabic", route="vision", priority=200,
        short_title="Masnavi (Urdu), daftar 1", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[],
        notes="Pilot 14 Sep 2026: page for page the same edition as masnavi_01_text (p. 50 identical) at lower resolution. SKIP; transcribe masnavi_01_text instead."),
    "masnavi_01_text": dict(match="Masnavi_01_text", group="urdu_other", language="arabic", route="vision", priority=201,
        short_title="Masnavi (Urdu), daftar 1 (second scan)", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[],
        notes="Possibly text only edition of daftar 1; decide after page inspection whether both scans are needed."),
    "masnavi_02": dict(match="Masnavi_02", group="urdu_other", language="arabic", route="vision", priority=202,
        short_title="Masnavi (Urdu), daftar 2", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[], notes=""),
    "masnavi_03": dict(match="Masnavi_03", group="urdu_other", language="arabic", route="vision", priority=203,
        short_title="Masnavi (Urdu), daftar 3", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[], notes=""),
    "masnavi_04": dict(match="Masnavi_04", group="urdu_other", language="arabic", route="vision", priority=204,
        short_title="Masnavi (Urdu), daftar 4", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[], notes=""),
    "masnavi_05": dict(match="Masnavi_05", group="urdu_other", language="arabic", route="vision", priority=205,
        short_title="Masnavi (Urdu), daftar 5", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[], notes=""),
    "masnavi_06": dict(match="Masnavi_06", group="urdu_other", language="arabic", route="vision", priority=206,
        short_title="Masnavi (Urdu), daftar 6", author="Jalaluddin Rumi; Urdu translator to confirm", year=None, target_shrines=[], notes=""),
    "nizami_revised_translation": dict(match="revisedtranslati00nizauoft", group="urdu_other", language="latin", route="text_probe", priority=210,
        short_title="Revised translation (Nizami), Univ. of Toronto scan", author="to confirm; archive.org id revisedtranslati00nizauoft",
        year=None, target_shrines=[], notes="Probably an English translation of a Persian classic (Browne's Chahar Maqala?). Identify from the title page before spending effort."),
}


def main() -> int:
    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    files = listing["files"]
    books: dict[str, dict] = {}
    claimed: set[str] = set()
    for slug, cur in CURATED.items():
        hits = [f for f in files if cur["match"] in f["title"]]
        if not hits:
            print(f"ERROR: no Drive file matches {slug!r} ({cur['match']!r})", file=sys.stderr)
            return 1
        hits.sort(key=lambda f: f["created"])  # earliest upload is canonical
        canon, dups = hits[0], hits[1:]
        for d in dups:
            if d["bytes"] != canon["bytes"]:
                print(f"WARNING: {slug}: duplicate {d['id']} differs in size", file=sys.stderr)
        for h in hits:
            claimed.add(h["id"])
        entry = {
            "slug": slug,
            "short_title": cur["short_title"],
            "author": cur["author"],
            "year": cur["year"],
            "group": cur["group"],
            "language": cur["language"],
            "route": cur["route"],
            "priority": cur["priority"],
            "drive_id": canon["id"],
            "drive_title": canon["title"].strip(),
            "uploader": canon["uploader"],
            "bytes": canon["bytes"],
            "duplicates": [d["id"] for d in dups],
            "target_shrines": cur["target_shrines"],
            "notes": cur["notes"],
        }
        books[slug] = entry
    unclaimed = [f for f in files if f["id"] not in claimed]
    if unclaimed:
        print("ERROR: Drive files not covered by CURATED:", file=sys.stderr)
        for f in unclaimed:
            print("   ", f["id"], f["title"], file=sys.stderr)
        return 1
    ordered = sorted(books.values(), key=lambda b: (b["priority"], b["slug"]))
    manifest = {
        "generated_from": LISTING.name,
        "book_count": len(ordered),
        "drive_file_count": len(files),
        "groups": {g: sum(1 for b in ordered if b["group"] == g) for g in ("urdu_shrine", "english", "urdu_other")},
        "total_bytes": sum(b["bytes"] for b in ordered),
        "books": ordered,
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(HERE.parent.parent)}: {len(ordered)} books, "
          f"{manifest['total_bytes']/1e6:.0f} MB, groups={manifest['groups']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
