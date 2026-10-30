/**
 * A quote's source may name a frozen copy of the sheet, row by slug:
 * `data/live_sheet_2026-10-15.csv#<shrine-slug>`. That is where the knowledge
 * graph's evidence points when the words it quotes have left the live sheet and
 * the team files do not hold them either (repoint-kg-evidence.mjs, 30 October
 * 2026). The file is read as CSV, row by row, because a raw read would keep CSV's
 * doubled quotation marks and fail every quote containing one.
 *
 * Shared by verify-kg-proposals.mjs and validate-kg-identity.mjs, whose two
 * `sourceText` functions must not drift apart.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { slugify } from './slugs.mjs';

const require = createRequire(import.meta.url);
const Papa = require('papaparse');

export const FROZEN_SHEET = /^data\/live_sheet_\d{4}-\d{2}-\d{2}\.csv#/;

const cache = new Map();

/** Rows of a frozen sheet keyed by slug, or null if the file is missing. */
function frozenRows(root, file) {
  if (!cache.has(file)) {
    const path = join(root, file);
    cache.set(
      file,
      existsSync(path)
        ? new Map(
            Papa.parse(readFileSync(path, 'utf8'), { header: true, skipEmptyLines: true }).data.map((r) => [
              slugify(r.Name),
              r,
            ]),
          )
        : null,
    );
  }
  return cache.get(file);
}

/** `{ ok, text | why }` for a frozen sheet source; null for any other source. */
export function frozenSheetText(root, source) {
  if (!FROZEN_SHEET.test(source)) return null;
  const [file, fragment] = source.split('#');
  const rows = frozenRows(root, file);
  if (!rows) return { ok: false, why: `file not found: ${file}` };
  const row = rows.get(fragment.trim());
  if (!row) return { ok: false, why: `no row with slug "${fragment.trim()}" in ${file}` };
  return { ok: true, text: Object.values(row).join('\n') };
}
