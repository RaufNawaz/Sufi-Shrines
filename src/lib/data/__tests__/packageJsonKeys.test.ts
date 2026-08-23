// @vitest-environment node
/**
 * No duplicate keys in package.json (RULE 4).
 *
 * `JSON.parse` silently keeps the last of two identical keys, and npm resolves
 * scripts through the same parse — so a script added under a name that already
 * exists is *unreachable*, with no error anywhere. I did exactly that: added
 * `data:snapshot` for the CSV restore point when `data:snapshot` was already an
 * alias for `build-dataset.mjs`. Mine came first in the file, so it lost.
 *
 * It went unnoticed for a whole commit because I ran the script directly
 * (`node scripts/data/snapshot-sheet.mjs`) rather than through npm, while
 * `data/SNAPSHOTS.md` documented the npm name. The command in the docs would
 * have fetched the sheet instead of writing a snapshot — and in an offline
 * environment, simply failed. esbuild did warn, in the middle of unrelated
 * output, and I scrolled past it.
 *
 * So: parse the text, not the object. Each top-level section is checked
 * separately, because `storybook` legitimately appears in both `scripts` and
 * `devDependencies` — the first version of this check flagged that as a
 * duplicate, which would have been a false positive taught as a rule.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const TEXT = readFileSync(join(ROOT, 'package.json'), 'utf8');

/**
 * Keys per top-level section, read from the raw text so duplicates survive.
 *
 * Tracks brace depth: a key at depth 2 belongs to the section opened by the
 * most recent depth-1 key.
 */
function keysBySection(json: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let depth = 0;
  let section = '';
  let inString = false;
  let escaped = false;
  let buffer = '';
  const lineKeys: { depth: number; key: string }[] = [];

  for (let i = 0; i < json.length; i++) {
    const ch = json[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') {
        inString = false;
        // A string followed (after whitespace) by ':' is a key.
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j]!)) j++;
        if (json[j] === ':') lineKeys.push({ depth, key: buffer });
      } else buffer += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      buffer = '';
    } else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }

  for (const { depth: d, key } of lineKeys) {
    if (d === 1) {
      section = key;
      const list = out.get('(root)') ?? [];
      list.push(key);
      out.set('(root)', list);
    } else if (d === 2 && section) {
      const list = out.get(section) ?? [];
      list.push(key);
      out.set(section, list);
    }
  }
  return out;
}

describe('package.json has no duplicate keys', () => {
  const sections = keysBySection(TEXT);

  it('parsed something to check', () => {
    // A parser that found nothing would make the assertion below vacuous.
    expect(sections.get('scripts')?.length ?? 0).toBeGreaterThan(20);
    expect(sections.get('scripts')).toContain('verify');
  });

  it.each([...sections.keys()])('%s has unique keys', (section) => {
    const keys = sections.get(section)!;
    const seen = new Set<string>();
    const duplicates = keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(
      [...new Set(duplicates)],
      `duplicate key(s) in "${section}". JSON.parse keeps the last one silently, so the ` +
        'earlier definition is unreachable and nothing errors.',
    ).toEqual([]);
  });
});
