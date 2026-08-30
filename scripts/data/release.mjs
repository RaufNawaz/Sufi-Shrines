#!/usr/bin/env node
/**
 * release.mjs — Bundle the canonical dataset into a dist-data/ release archive.
 *
 * Collects data files, provenance, schema, Frictionless descriptor, license
 * texts, citation metadata, and a DATA_DICTIONARY into dist-data/ with the
 * directory structure expected by Zenodo/Dataverse deposits.
 *
 * Prerequisite:  npm run data:validate  (or npm run data:release which chains it)
 * Usage:         node scripts/data/release.mjs
 * Or:            npm run data:release
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist-data');

// ── Files to bundle ───────────────────────────────────────────────────────────

const DATA_FILES = [
  'data/shrines.json',
  'data/shrines.csv',
  'data/provenance.json',
  'data/datapackage.json',
  'data/shrine-schema.json',
  'data/kg.json',
  'data/kg-seeds.json',
];

const EXPORT_FILES = [
  'data/export/graph.jsonld',
  'data/export/graph.ttl',
];

const DOCS_FILES = [
  'docs/DATA_DICTIONARY.md',
  'docs/KG_VOCABULARY.md',
];

const META_FILES = [
  'CITATION.cff',
  'codemeta.json',
  'LICENSE',
  'LICENSE-data.md',
];

// ── Setup ─────────────────────────────────────────────────────────────────────

mkdirSync(join(DIST, 'data'), { recursive: true });
mkdirSync(join(DIST, 'data', 'export'), { recursive: true });
mkdirSync(join(DIST, 'docs'), { recursive: true });

let copied = 0;

function copyFile(relSrc, relDest) {
  const src = join(ROOT, relSrc);
  const dest = join(DIST, relDest ?? relSrc);
  if (!existsSync(src)) {
    console.warn(`  [skip] ${relSrc} — not found`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  ✓ ${relDest ?? relSrc}`);
  copied++;
}

// ── Copy data, docs, and meta files ──────────────────────────────────────────

console.log('\ndata files:');
for (const f of DATA_FILES)   copyFile(f);

console.log('\nexports:');
for (const f of EXPORT_FILES) copyFile(f);

console.log('\ndocs:');
for (const f of DOCS_FILES)   copyFile(f);

console.log('\nmetadata:');
for (const f of META_FILES)  copyFile(f);

// ── VERSION.json ─────────────────────────────────────────────────────────────

const shrinesJson = JSON.parse(readFileSync(join(ROOT, 'data/shrines.json'), 'utf8'));

const version = {
  name:           'sufi-shrines',
  schema_version: shrinesJson.schema_version,
  dataset_version: '2.0.0',
  shrine_count:   shrinesJson.count,
  source_updated: shrinesJson.generated,
};

writeFileSync(join(DIST, 'VERSION.json'), JSON.stringify(version, null, 2) + '\n', 'utf8');
console.log('\n  ✓ VERSION.json');

// ── dist-data/README.md ───────────────────────────────────────────────────────

const releaseReadme = `# Mapping the Shrines of Pakistan — Data Release

## Contents

| File | Description |
|------|-------------|
| \`data/shrines.json\` | Canonical dataset (${shrinesJson.count} shrines, JSON) |
| \`data/shrines.csv\` | CSV mirror, same row order |
| \`data/provenance.json\` | Field-level provenance store |
| \`data/datapackage.json\` | Frictionless Data Package descriptor |
| \`data/shrine-schema.json\` | JSON Schema draft 2020-12 for a single row |
| \`data/kg.json\` | Knowledge graph — figures, orders, places, observances, relations |
| \`data/kg-seeds.json\` | Hand-curated seeds behind the graph, with their adjudications |
| \`data/export/graph.jsonld\` | The graph as JSON-LD (schema.org + the \`sufi:\` vocabulary) |
| \`data/export/graph.ttl\` | The same graph as RDF Turtle |
| \`docs/KG_VOCABULARY.md\` | What each relation and node type in the graph means |
| \`docs/DATA_DICTIONARY.md\` | Human-readable field reference |
| \`CITATION.cff\` | Machine-readable citation (CFF 1.2.0) |
| \`codemeta.json\` | Software metadata (CodeMeta 2.0) |
| \`LICENSE\` | Code license (MIT) |
| \`LICENSE-data.md\` | Dataset license (ODbL-1.0) + attribution notice |
| \`VERSION.json\` | Release version metadata |

## Quick start

\`\`\`js
import shrines from './data/shrines.json';
console.log(shrines.count);     // ${shrinesJson.count}
console.log(shrines.rows[0]);   // first shrine object
\`\`\`

## Citation

See \`CITATION.cff\` for the full citation or use:

> Nawaz, Rauf. *Mapping the Shrines of Pakistan* (v2.0.0). Harvard University, 2026.
> <https://github.com/raufnawaz/sufi-shrines>

## License

- **Dataset** (all files in \`data/\`): [ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/) — see \`LICENSE-data.md\`
- **Code** (web application source): MIT — see \`LICENSE\`

## Rebuilding

This bundle was generated from the source repository:

\`\`\`sh
git clone https://github.com/raufnawaz/sufi-shrines
cd sufi-shrines
npm install --legacy-peer-deps
npm run data:build      # fetch from Google Sheets → data/shrines.json
npm run data:validate   # schema + provenance checks
npm run data:release    # produce dist-data/
\`\`\`
`;

writeFileSync(join(DIST, 'README.md'), releaseReadme, 'utf8');
console.log('  ✓ README.md');

// ── Summary ───────────────────────────────────────────────────────────────────

/*
 * The contents table has to list what the bundle actually contains.
 *
 * It listed 11 rows while the bundle copied 15 files, so `kg.json`,
 * `kg-seeds.json`, both graph exports and `KG_VOCABULARY.md` shipped to Zenodo
 * undocumented — a researcher reading the release's own README would not know
 * the knowledge graph was in their hands. Nothing could notice: the table is a
 * template literal and the file lists are arrays, with no relation between them.
 */
const bundled = [...DATA_FILES, ...EXPORT_FILES, ...DOCS_FILES, ...META_FILES];
const undocumented = bundled.filter((f) => !releaseReadme.includes(`\`${f}\``));
if (undocumented.length > 0) {
  console.error(
    `\n✗ dist-data/README.md documents ${bundled.length - undocumented.length} of ${bundled.length} bundled files.\n` +
      `  Missing from the Contents table: ${undocumented.join(', ')}\n` +
      '  A file shipped to Zenodo and absent from the release\'s own README is a file the\n' +
      '  researcher who downloads it does not know they have.',
  );
  process.exit(1);
}

console.log(`\n✓ dist-data/ ready — ${copied + 2} files (${shrinesJson.count} shrines)`);
console.log('  Next: upload dist-data/ to Zenodo or Dataverse — see docs/DATA_RELEASE.md');
