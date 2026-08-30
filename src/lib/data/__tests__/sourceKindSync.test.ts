// @vitest-environment node
/**
 * The placeholder rule is written down three times and must give one answer.
 *
 * `pipeline/build_sources_registry.py` owns it — `GENERIC`, applied to the
 * provenance badge. `scripts/data/lib/sourceKind.mjs` mirrors it for the graph
 * build. `src/lib/data/sourceKind.ts` mirrors it for the browser, because
 * `/about` rebuilds its source index client-side from the shipped rows.
 *
 * Three copies is one more than anyone wants. It is the same arrangement
 * `bibliography.ts`/`bibliography.mjs` and `places.ts`/`places.mjs` already
 * have, for the same reason — a build script is plain ESM and cannot import a
 * `.ts`, and neither can import Python — and the guard is what makes it
 * defensible rather than merely tolerated.
 *
 * ## What the rule is for
 *
 * `build_sources_registry.py`'s own docstring: *"One is a citation; the other is
 * a placeholder. Until they are separated you cannot tell a sourced claim from
 * an unsourced one."* The separation was applied to the badge and never to the
 * count, so `/about` reports **464 distinct sources** under *"What the archive
 * rests on"* and **57 of them** are lines this rule defines as placeholders —
 * one of them a notice that a source was withdrawn as unreliable.
 *
 * The rule is not compared abstractly. It is run over **every source name the
 * archive holds**, in all three implementations, and they must agree on all
 * 464. A regex ported by eye is exactly the thing that looks right and is not.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPlaceholderSource as isPlaceholderTs, GENERIC_SOURCE } from '../sourceKind';
import { isPlaceholderSource as isPlaceholderMjs } from '../../../../scripts/data/lib/sourceKind.mjs';

const ROOT = join(__dirname, '..', '..', '..', '..');

const sourceNames = (): string[] => {
  const { sources } = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-sources.json'), 'utf8')) as {
    sources: { name: string; placeholder?: boolean }[];
  };
  return sources.map((s) => s.name);
};

describe('the placeholder rule', () => {
  it('has sources to classify', () => {
    expect(sourceNames().length).toBeGreaterThan(400);
  });

  it('agrees between the TypeScript and the build script on every source name', () => {
    const disagreements = sourceNames().filter(
      (name) => isPlaceholderTs(name) !== isPlaceholderMjs(name),
    );
    expect(
      disagreements.map((d) => `  ${JSON.stringify(d.slice(0, 90))}`),
      'the browser and the graph build would classify the same citation differently',
    ).toEqual([]);
  });

  it('matches the Python that owns the rule, on every source name', () => {
    /* The comparison that matters, and the only one that can catch a regex
       ported by eye. Skipped rather than failed if python3 is unavailable — a
       missing interpreter is not a drifted rule, and pretending otherwise would
       be a false positive of exactly the kind this council was told to avoid. */
    let out: string;
    try {
      out = execFileSync(
        'python3',
        [
          '-c',
          [
            'import json,sys,re,pathlib',
            'src = pathlib.Path("pipeline/build_sources_registry.py").read_text(encoding="utf-8")',
            'ns = {"re": re}',
            'block = src[src.index("GENERIC = re.compile("):src.index("TYPES = [")]',
            'exec(block, ns)',
            'names = json.load(open("data/kg-sources.json", encoding="utf-8"))["sources"]',
            'print(json.dumps([bool(ns["GENERIC"].search(s["name"])) for s in names]))',
          ].join('\n'),
        ],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch {
      return; // python3 unavailable in this environment
    }

    const fromPython = JSON.parse(out.trim()) as boolean[];
    const names = sourceNames();
    expect(fromPython.length, 'the Python probe read a different file').toBe(names.length);

    const disagreements = names
      .map((name, i) => ({ name, ts: isPlaceholderTs(name), py: fromPython[i] }))
      .filter((d) => d.ts !== d.py)
      .map((d) => `  ts=${d.ts} py=${d.py}  ${JSON.stringify(d.name.slice(0, 80))}`);

    expect(
      disagreements,
      disagreements.length === 0
        ? ''
        : `The ported rule disagrees with the Python that owns it on ${disagreements.length} of ` +
            `${names.length} sources:\n${disagreements.join('\n')}\n\n` +
            'Fix the port, not the Python — `build_sources_registry.py` is where this rule is ' +
            'defined and where the provenance badge is computed from it.',
    ).toEqual([]);
  });

  it('tags the same sources in the shipped graph', () => {
    const { sources } = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-sources.json'), 'utf8')) as {
      sources: { name: string; placeholder?: boolean }[];
    };
    const mismatched = sources
      .filter((s) => Boolean(s.placeholder) !== isPlaceholderTs(s.name))
      .map((s) => `  ${JSON.stringify(s.name.slice(0, 80))}`);
    expect(
      mismatched,
      `data/kg-sources.json's \`placeholder\` tags do not match the rule — run \`npm run data:kg\`.`,
    ).toEqual([]);
  });

  it('still finds the withdrawal notice, which is the case that motivated this', () => {
    /* Not a count, a named line. "Pending. Prior source attribution for this
       entry has been withdrawn as unreliable" holds a source id and a slug and
       is counted among the archive's distinct sources. It is also, read plainly,
       one of the most honest sentences in the archive — which is why the answer
       is to count it correctly rather than to delete it. */
    const withdrawal = sourceNames().find((n) => /withdrawn as unreliable/i.test(n));
    expect(withdrawal, 'the withdrawal notice has been edited or removed').toBeDefined();
    expect(isPlaceholderTs(withdrawal!)).toBe(true);
    expect(GENERIC_SOURCE.test('Ahmad, "Tazkirah-e-Awliya-e-Pakistan" (Lahore, 1971)')).toBe(false);
  });
});
