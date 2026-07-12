# Data Dictionary — Sufi Shrines of Pakistan

**Dataset:** `data/shrines.json` (canonical) · `data/shrines.csv` (CSV mirror)  
**Schema version:** 1.0.0  
**Frictionless descriptor:** `data/datapackage.json`  
**JSON Schema:** `data/shrine-schema.json`  
**Source:** Google Sheets (published CSV), rebuilt via `npm run data:build`

---

## Fields

| Field              | Type             | Required | Controlled vocab | Notes                                                                                                |
| ------------------ | ---------------- | -------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `Name`             | string           | yes      | —                | Primary English name                                                                                 |
| `Location`         | string           | no       | —                | City/district/province, free-text                                                                    |
| `Category`         | string           | no       | see below        | Faith tradition                                                                                      |
| `Latitude`         | string (decimal) | yes      | range 20–42      | Pakistan bbox                                                                                        |
| `Longitude`        | string (decimal) | yes      | range 55–82      | Pakistan bbox                                                                                        |
| `Founded/Opened`   | string           | no       | —                | Free-text year or century                                                                            |
| `Sufi Saint`       | string           | no       | —                | Name of associated saint                                                                             |
| `Image 1`          | string (URL)     | no       | —                | Primary image, http/https or empty                                                                   |
| `Image 1 Credit`   | string           | no       | —                | Photo credit/source line for Image 1 (column may be absent entirely)                                 |
| `Image 2`          | string (URL)     | no       | —                | Secondary image, http/https or empty                                                                 |
| `Image 2 Credit`   | string           | no       | —                | Photo credit/source line for Image 2 (column may be absent entirely)                                 |
| `Events`           | string           | no       | —                | Annual urs, pilgrimage details                                                                       |
| `Description`      | string           | no       | —                | Main prose description (supports inline `## Heading` sections)                                       |
| `Description Urdu` | string           | no       | —                | Urdu prose description (column may be absent; in-repo overrides from `urdu-i18n/content/` fill gaps) |

### Category — controlled vocabulary

| Value              | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `Muslim Shrine`    | Dargah, mazar, or roza of a Sufi saint or Muslim figure |
| `Hindu Temple`     | Mandir or Hindu sacred site                             |
| `Sikh Gurdwara`    | Gurdwara or Sikh sacred site                            |
| `Christian Church` | Church or Christian sacred site                         |
| `Other`            | Multi-faith or unclassified sacred site                 |
| _(empty)_          | Category not yet assigned                               |

---

## Coordinate system

- Coordinates are stored as **decimal degree strings** (e.g. `"30.123456"`).
- The validator enforces Pakistan bounding box: **lat 20–42, lng 55–82** (generous margin for border regions).
- WGS 84 datum assumed.

---

## Validation rules (enforced by `npm run data:validate`)

| Rule                                             | Severity                    |
| ------------------------------------------------ | --------------------------- |
| `Name` non-empty                                 | Error (blocks build)        |
| `Latitude` numeric and in range [20, 42]         | Error                       |
| `Longitude` numeric and in range [55, 82]        | Error                       |
| `Category` in controlled vocabulary              | Error                       |
| `Image 1` / `Image 2` empty or valid http(s) URL | Error                       |
| Generated slug unique across all rows            | Error                       |
| `count` field matches `rows.length`              | Error                       |
| `schema_version` present                         | Error                       |
| `Description` and `Events` both empty            | Warning (data completeness) |

---

## Provenance and authorship

Coordinates, names, and descriptions were authored by the research team from
primary sources. See `src/types/provenance.ts` (Phase 2 A3) for the
per-claim provenance model.

Image URLs link to Wikimedia Commons or other open-access sources. OCR-derived
content from source books is flagged in the provenance model.

---

## Rebuilding the dataset

```bash
# Fetch latest from Google Sheets and regenerate canonical files
npm run data:build

# Validate the canonical dataset (also runs in CI)
npm run data:validate
```

Re-running `data:build` on an unchanged Sheet produces no git diff (digest-checked).

---

## Licensing

Data content: [Open Database License 1.0 (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/).  
Image URLs are links to externally-hosted content; consult each source's license.  
See `data/datapackage.json` for the machine-readable license descriptor.

---

## Citation

See the root `CITATION.cff` for the formal, machine-readable citation. In prose:

> Nawaz, Rauf. _Sufi Shrines of Pakistan_ (dataset). Harvard University, 2025–2026.  
> `https://github.com/raufnawaz/sufi-shrines`
