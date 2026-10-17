// @vitest-environment node
/**
 * A Latin run isolated in the Urdu view says what language it is.
 *
 * `data-latin` tells the no-leak guard a run is allowed to be Latin (i18n rule
 * 7) — and tells assistive technology nothing. A screen reader picks its voice
 * from `lang`, so on `/sources?lang=ur` every book title was read with Urdu
 * phonetics: 66 English runs on that page alone (a11y council, 17 October
 * 2026). Every `<bdi data-latin>` therefore carries `lang="en"` as well.
 *
 * Scoped to `<bdi>`, the element that isolates a run. `data-latin` also sits on
 * containers — a bibliography line, a whole article fallback — that can hold
 * Urdu beside the Latin, where `lang="en"` would be its own mistake.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', '..');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('Latin runs in the Urdu view', () => {
  it('declare their language wherever they are isolated', () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        /* Any `lang=`: NearbyMosques sets it per view, which is also right. */
        if (/<bdi\b[^>]*\bdata-latin\b/.test(line) && !/\blang=/.test(line)) {
          offenders.push(`${file.slice(SRC.length + 1)}:${i + 1}`);
        }
      });
    }
    expect(offenders, '<bdi data-latin> without a lang').toEqual([]);
  });
});
