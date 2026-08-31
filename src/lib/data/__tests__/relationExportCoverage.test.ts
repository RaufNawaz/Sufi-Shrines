// @vitest-environment node
/**
 * Every relation the graph holds reaches the data release — counted edge by
 * edge, not type by type.
 *
 * ## The hazard this is for, and why an existing guard did not catch it
 *
 * `kinExportCoverage.test.ts` was written after `kin_of` shipped and sat absent
 * from both exports for a day. Its lesson was about **addition**: a new relation
 * type arrives and nobody invites it into the exporters. So it asserts that
 * every `kinType` in the graph has an export mapping, and
 * `scripts/data/lib/relationExport.mjs` generalised the same idea to the type
 * level.
 *
 * That is the right check for the failure it was written for, and it is blind to
 * this one. `belongs_to_order` **was** invited: it had a mapping, both exporters
 * emitted it, and `schema:memberOf` appeared 54 times in a graph holding 67
 * edges. The type was covered; thirteen of its edges were not, because both
 * exporters read
 *
 *     const orderRel = (…).find((r) => r.type === 'belongs_to_order');
 *
 * and `.find()` returns the first. The thirteen it discarded were precisely the
 * **compound silsilas** — eleven figures whose affiliation the archive went to
 * the trouble of recording as two or three orders. Syed Shah Jamal Uddin Naqvi
 * Bukhari is Suhrawardi, Qadiri *and* Chishti in the graph, and was a plain
 * Suhrawardi in the release.
 *
 * Nothing reported it. Both exporters' `--check` modes exited 0, because a
 * `--check` compares the file to what the builder would write and the builder
 * was the thing that was wrong. `getOrderMemberships` in `src/lib/kg.ts` returns
 * all of them and its docstring exists to say so, so `/order/chishtiyya` listed
 * Pir Sher Muhammad while the release did not. A scholar downloading the ODbL
 * data and asking which figures joined the Qadiri and Chishti ways got the wrong
 * answer, and the sentence the archive read the edge out of was unrepresented.
 *
 * ## So this counts edges
 *
 * For each exported relation type: the number of edges in `data/kg.json` must
 * equal the number of statements in `graph.ttl` and the number of values in
 * `graph.jsonld`. Derived on both sides rather than pinned, so adding a
 * relation does not fail this test — only adding one that does not come out the
 * far end. That is the sentence `kinExportCoverage.test.ts` uses about kin, and
 * this is the half of it that applies to every other type.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

type Relation = { type: string; subject: string; object: string };
const kg = JSON.parse(read('data', 'kg.json')) as { relations: Relation[] };
const ttl = read('data', 'export', 'graph.ttl');
const jsonld = JSON.parse(read('data', 'export', 'graph.jsonld')) as unknown;

/** Count how many times a key appears as a value-bearing property, arrays counted per element. */
function countJsonldValues(root: unknown, key: string): number {
  let n = 0;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === key) n += Array.isArray(v) ? v.length : 1;
        walk(v);
      }
    }
  };
  walk(root);
  return n;
}

/**
 * Relation types with a one-statement-per-edge export, and the predicate each
 * becomes.
 *
 * Only types whose export really is per-edge belong here. `located_in` and
 * `buried_at` are deliberately absent: both are folded into the *shrine* node
 * rather than emitted per relation, so an edge count would not be the right
 * comparison and pretending otherwise would make this test lie in the
 * reassuring direction.
 */
const PER_EDGE = [
  { type: 'belongs_to_order', ttlPredicate: 'schema:memberOf', jsonldKey: 'memberOf' },
  { type: 'disciple_of', ttlPredicate: 'sufi:discipleOf', jsonldKey: 'sufi:discipleOf' },
  { type: 'successor_of', ttlPredicate: 'sufi:successorOf', jsonldKey: 'sufi:successorOf' },
] as const;

describe('relations reach the data release edge by edge', () => {
  it('has a graph to compare against', () => {
    expect(kg.relations.length).toBeGreaterThan(500);
    expect(ttl.length).toBeGreaterThan(10000);
  });

  it.each(PER_EDGE)('$type — every edge becomes a statement', ({ type, ttlPredicate, jsonldKey }) => {
    const edges = kg.relations.filter((r) => r.type === type).length;
    expect(edges, `no ${type} edges in the graph — this row is measuring nothing`).toBeGreaterThan(0);

    /* Anchored on the two-space indent that marks a *statement* inside a
       subject block. Counting bare occurrences also counts the `# ── Vocabulary`
       declaration at column 0, which made this test read edges+1 the moment
       `sufi:discipleOf` was finally declared — a fix reported as a regression. */
    const inTtl = (
      ttl.match(new RegExp(`^ {2}${ttlPredicate.replace(':', '\\:')}\\b`, 'gm')) ?? []
    ).length;
    const inJsonld = countJsonldValues(jsonld, jsonldKey);

    const explain =
      `the graph holds ${edges} ${type} edge(s). A missing one is a relation the site shows and ` +
      'the release does not — and a `--check` will not see it, because --check compares the file ' +
      'to what the builder writes and the builder is what drops the edge. If a figure legitimately ' +
      'has more than one, the exporter needs `.filter()` rather than `.find()`. Then run ' +
      '`npm run data:export`.';

    expect(inTtl, `graph.ttl has ${inTtl} ${ttlPredicate} statements; ${explain}`).toBe(edges);
    expect(inJsonld, `graph.jsonld has ${inJsonld} ${jsonldKey} values; ${explain}`).toBe(edges);
  });

  it('keeps the compound silsilas whole, which is what went missing', () => {
    /* Named rather than left implicit: these eleven figures are the reason the
       count was 54 and not 67, and a regression would take exactly them again. */
    const bySubject = new Map<string, string[]>();
    for (const r of kg.relations.filter((r) => r.type === 'belongs_to_order')) {
      bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r.object]);
    }
    const compound = [...bySubject].filter(([, orders]) => orders.length > 1);
    expect(
      compound.length,
      'no figure in the graph now holds more than one order. That is either a real change in the ' +
        'data or the merge that produced 54 memberships from 67 edges — check the graph before ' +
        'relaxing this.',
    ).toBeGreaterThanOrEqual(11);

    for (const [subject, orders] of compound) {
      const slug = subject.replace(/^saint:/, '');
      const block = new RegExp(`^saint:${slug}\\n[\\s\\S]*?\\n\\n`, 'm').exec(ttl);
      expect(block, `saint:${slug} is not in graph.ttl at all`).not.toBeNull();
      const emitted = (block![0].match(/schema:memberOf/g) ?? []).length;
      expect(
        emitted,
        `${slug} belongs to ${orders.length} orders in the graph (${orders.join(', ')}) and ` +
          `graph.ttl gives it ${emitted}. A compound silsila flattened to its first order is the ` +
          'archive contradicting its own source sentence.',
      ).toBe(orders.length);
    }
  });
});
