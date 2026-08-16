# Web-research pass — results summary (16 August 2026)

All 40 targets in `targets.tsv` researched; one file per site, verified against `ls`. Verdict
tally:

| Verdict | Count |
|---|---|
| STRONG (≥2 independent verified sources) | 23 |
| PARTIAL (1 verified source, or verified but incomplete) | 14 |
| NOTHING RELIABLE FOUND | 3 |

## Nothing reliable found

- **Allo Mahar** — every lead traced to unreachable sources (dead `nrb.gov.pk` domain, expired
  cert, 403s); two Sialkot gazetteers (1894-95, 1920) fetched in full and searched — genuinely
  negative.
- **Gurdwara Malji Sahib** — the sheet's site (Nankana Sahib) has only wiki/blog coverage. A
  different, well-documented Gurdwara Malji Sahib exists in Kanganpur, Kasur District (~65 km
  away) — do not use that one as this entry's citation.
- **Sant Baba Asudaram Darbar (Panno Aqil)** — every mention traces to devotee sites
  (shivsakhi.org, sindhiwiki.org) below the reliability bar; six established-press/academic
  pieces on the same regional milieu were checked directly and none mention this site.

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
  - "Gurdwara Malji Sahib" (Nankana Sahib vs. Kanganpur/Kasur) — see above.
  - "Gurdwara Patshahi Chhevin" — a widely-reported July 2026 reopening "after 79 years"
    belongs to a *different* Lahore-district site (Amar Sidhu), not the sheet's Hadiara entry.
  - "Ayub Shah Bukhari" — the dataset's Gandava/Jhal Magsi shrine vs. a distinctly-located
    Karachi Gadap Town shrine of the same name (tied to a 2014 killing) found on Wikipedia,
    unverified. Left as an open question — needs a human call on same-saint-or-namesake.
- Full per-site verdicts, sources, and conflicts are in each site's own file; see
  `/tmp/verdicts.tsv`-style tally reproduced above from a fresh grep of all 40 files.

## Status

Research phase complete. Nothing committed yet — these are draft findings for editorial
review, not sheet content. See docs/TODO.md for the next-step decision (fold STRONG/PARTIAL
findings into a `data/patch_web_research.csv` now, vs. hold until Saifullah's books arrive for
one combined pass).
