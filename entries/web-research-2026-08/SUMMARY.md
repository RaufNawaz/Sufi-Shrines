# Web-research pass — results summary (16 August 2026, updated same day)

All 40 targets in `targets.tsv` researched; one file per site, verified against `ls`. A
follow-up pass the same day chased three specific acquisition leads (see
`ACQUISITION_LIST.md`) and upgraded one entry. Current verdict tally:

| Verdict | Count |
|---|---|
| STRONG (≥2 independent verified sources) | 23 |
| PARTIAL (1 verified source, or verified but incomplete) | 15 |
| NOTHING RELIABLE FOUND | 2 |

## Nothing reliable found

- **Allo Mahar** — every lead traced to unreachable sources (dead `nrb.gov.pk` domain, expired
  cert, 403s); two Sialkot gazetteers (1894-95, 1920) fetched in full and searched — genuinely
  negative.
- **Sant Baba Asudaram Darbar (Panno Aqil)** — every mention traces to devotee sites
  (shivsakhi.org, sindhiwiki.org) below the reliability bar; six established-press/academic
  pieces on the same regional milieu were checked directly and none mention this site; a
  follow-up check of the *Gazetteer of the Province of Sind, "B" Volume III — Sukkur District*
  (1919) also came back clean negative.

## Upgraded after the initial pass

- **Gurdwara Malji Sahib** — was "nothing reliable found": the sheet's Nankana Sahib site had
  only wiki/blog coverage, and the one strong citable source found (Iqbal Qaiser's 1998 book)
  covered a different, same-named gurdwara at Kanganpur, Kasur District (~65 km away). A
  follow-up check of Khan Mohammad Waliullah Khan's 1962 Department of Archaeology register
  (found late in the original pass, after this entry had already been researched) turned up a
  genuine, distinct, verbatim-quotable entry for the Nankana Sahib site — now **PARTIAL**, and
  folded into `data/patch_web_research.csv`. See the file's own updated Verified findings.

## Notable findings beyond individual site facts

- **Shared source, high value**: Khan Mohammad Waliullah Khan, *Sikh Shrines in West Pakistan*
  (Dept. of Archaeology, 1962; full text on archive.org) independently covers at least 4 of
  the 10 gurdwara targets — a strong acquisition-list candidate alongside Iqbal Qaiser's
  *Historical Sikh Shrines in Pakistan* (1998), which covers even more.
- **Wrong-location catches**: "Gurdwara Sri Tilganji Sahib" and "Tomb of Ustad Nuriya" are
  Quetta and Uch Sharif respectively in the sheet, not Lahore as their names might suggest —
  agents verified against the sheet's actual coordinates before researching, avoiding
  misattribution.
- **Same-name, different-site traps found and NOT conflated**:
  - "Gurdwara Malji Sahib" (Nankana Sahib vs. Kanganpur/Kasur) — see "Upgraded after the
    initial pass" above; the 1962 register itself distinguishes the two.
  - "Gurdwara Patshahi Chhevin" — a widely-reported July 2026 reopening "after 79 years"
    belongs to a *different* Lahore-district site (Amar Sidhu), not the sheet's Hadiara entry.
  - "Ayub Shah Bukhari" — the dataset's Gandava/Jhal Magsi shrine vs. a distinctly-located
    Karachi Gadap Town shrine of the same name (tied to a 2014 killing) found on Wikipedia,
    unverified. Left as an open question — needs a human call on same-saint-or-namesake.
- Full per-site verdicts, sources, and conflicts are in each site's own file; see
  `/tmp/verdicts.tsv`-style tally reproduced above from a fresh grep of all 40 files.

## Status

Research phase complete; per direction, folded into `data/patch_web_research.csv` (38 rows) and
merged into `data/shrines_final_import_2026-08-16.csv` by `pipeline/build_final_import.py` —
see `docs/TODO.md` §1. `ACQUISITION_LIST.md` consolidates every book/gazetteer lead for
Saifullah, and records which of the highest-value shared sources have already been checked.
