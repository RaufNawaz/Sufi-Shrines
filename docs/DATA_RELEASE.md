# Data Release Guide

This document explains how to produce and publish a citable data release for
the Sufi Shrines of Pakistan dataset.

## Prerequisites

- Node.js ≥ 20 (`.nvmrc`)
- `npm ci` completed
- Google Sheets CSV accessible (or `data/shrines.json` already present)

## 1. Build and validate the dataset

```sh
npm run data:build      # fetch Google Sheets CSV → data/shrines.json + shrines.csv
npm run data:validate   # schema + provenance validation (exits 1 on errors)
```

`data:build` is idempotent: if the Sheet hasn't changed, no files are rewritten
and git sees no diff.

## 2. Produce the release bundle

```sh
npm run data:release
```

This runs `data:validate` first, then calls `scripts/data/release.mjs` which
writes a self-contained `dist-data/` directory containing:

```
dist-data/
  data/
    shrines.json        canonical dataset
    shrines.csv         CSV mirror
    provenance.json     field-level provenance
    datapackage.json    Frictionless Data Package descriptor
    shrine-schema.json  JSON Schema for a single row
  docs/
    DATA_DICTIONARY.md  field reference
  CITATION.cff          machine-readable citation
  codemeta.json         CodeMeta 2.0 software metadata
  LICENSE               code license (MIT)
  LICENSE-data.md       dataset license (ODbL-1.0) + attribution notice
  VERSION.json          release version metadata
  README.md             release README
```

`dist-data/` is listed in `.gitignore` — it is generated output, not committed
to the repository.

## 3. Mint a DOI on Zenodo

1. Create an account at <https://zenodo.org> (free, no institution required).
2. Click **New Upload** → select **Dataset** as the resource type.
3. Upload the contents of `dist-data/` as a zip archive, or upload individual
   files. Zenodo accepts any file type.
4. Fill in the form:
   - **Title**: Sufi Shrines of Pakistan
   - **Authors**: Rauf Nawaz (Harvard University)
   - **Description**: paste the abstract from `CITATION.cff`
   - **License**: ODbL-1.0 (select from the dropdown or enter the SPDX ID)
   - **Related identifiers**: add the GitHub repository URL
   - **Keywords**: copy from `CITATION.cff`
5. Click **Publish**. Zenodo mints a DOI immediately (format:
   `10.5281/zenodo.<record-id>`).
6. Update `CITATION.cff`:
   - Add `doi: "10.5281/zenodo.<record-id>"` under the `url` field.
   - Update `date-released` if it differs from today.

## 4. Mint a DOI on Harvard Dataverse (alternative / companion)

Harvard affiliates can also deposit on the Harvard Dataverse
(<https://dataverse.harvard.edu>):

1. Log in with your Harvard Key.
2. Create a new dataset under an appropriate dataverse
   (e.g., _Harvard Computational Social Science_).
3. Upload the `dist-data/` files.
4. Set the license to **ODbL-1.0** (listed as "Open Database License").
5. Publish to receive a Handle/DOI from Harvard.

## 5. After minting — update the repository

Once you have a DOI:

```yaml
# CITATION.cff — add these fields
doi: '10.5281/zenodo.<record-id>' # or Harvard Dataverse DOI
```

```sh
git add CITATION.cff codemeta.json
git commit -m "data: add DOI to CITATION.cff and codemeta.json after Zenodo deposit"
git tag -a v1.0.0-data -m "Data release v1.0.0 — DOI: 10.5281/zenodo.<record-id>"
git push && git push --tags
```

## Versioning policy

| Event                               | Version bump                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| New shrines added or corrections    | bump `dataset_version` in `VERSION.json`, re-run `data:release`                                  |
| Schema changes (new/removed fields) | bump `schema_version` in `data/shrines.json`, update `shrine-schema.json` and `datapackage.json` |
| New Zenodo deposit required         | version changes that add/remove rows or fields                                                   |
| Provenance updates only             | no version bump required unless depositing to Zenodo                                             |

## Validation tool

CFF can be validated locally with `cffconvert` (Python):

```sh
pip install cffconvert
cffconvert --validate
```

Or paste `CITATION.cff` into the online validator at
<https://citation-file-format.github.io/cff-initializer-javascript/>.

## Attribution requirements (ODbL)

Any public redistribution or derived database must include:

> Nawaz, Rauf. _Sufi Shrines of Pakistan_ (v1.0.0). Harvard University, 2026.
> <https://github.com/raufnawaz/sufi-shrines>

See `LICENSE-data.md` for the full ODbL terms.
