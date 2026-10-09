// @vitest-environment node
/**
 * `docs/HANDOVER.md` §9 is appended to by more than one writer — a session on
 * this machine, a session on the Windows PC, and the scheduled book-queue
 * worker — and each picks its number by reading the last heading. Twice in two
 * days two writers read the same last heading: §9.268 (Mac and Windows,
 * 8 October 2026) and §9.272 (a session and the worker, 9 October 2026). The
 * second collision survived a commit, because the session committed the whole
 * file with the worker's sections already in it, and sat in history four lines
 * under the note that had renumbered the first one.
 *
 * "Check `grep` before trusting a number" was the note. A note is an intention;
 * this is the invariant (RULE 4). It fails `npm run verify` on any duplicate
 * `### 9.N` heading and names the lines, so the later writer renumbers before
 * the collision is committed rather than after.
 *
 * The first run found two more, both three weeks old and both worker-vs-worker:
 * §9.216 (20 September 2026, twice) and §9.222 (21 September, twice). They are
 * left as they are — each pair is told apart by its heading, and other
 * documents cite the numbers — and held here as the known set, so the check
 * fails on the third collision and not on the two it inherited. Renumber one
 * of them and this list is where to say so.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HANDOVER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../docs/HANDOVER.md',
);

/** Inherited, dated collisions — see the header. */
const KNOWN_COLLISIONS = new Set(['9.216', '9.222']);

describe('HANDOVER §9 section numbers', () => {
  it('are unique — two writers appending must never share a number', () => {
    const lines = readFileSync(HANDOVER, 'utf8').split('\n');
    const seen = new Map<string, number[]>();
    lines.forEach((line, i) => {
      const m = /^### (9\.\d+)\s/.exec(line);
      if (m) seen.set(m[1], [...(seen.get(m[1]) ?? []), i + 1]);
    });
    const dupes = [...seen].filter(([, at]) => at.length > 1).map(([n]) => n);
    const unexpected = dupes.filter((n) => !KNOWN_COLLISIONS.has(n));
    const detail = unexpected.map((n) => `§${n} at lines ${seen.get(n)?.join(', ')}`);
    expect(
      unexpected,
      `duplicate §9 headings in docs/HANDOVER.md — renumber the later one:\n${detail.join('\n')}`,
    ).toEqual([]);
    // And the inherited pair is still exactly two: if one is renumbered, drop it here.
    expect(dupes.filter((n) => KNOWN_COLLISIONS.has(n)).sort()).toEqual(
      [...KNOWN_COLLISIONS].sort(),
    );
    // A regex that silently matched nothing would pass vacuously: 81 distinct
    // headings on 9 October 2026 (the early entries use other heading shapes).
    expect(seen.size).toBeGreaterThan(50);
  });
});
