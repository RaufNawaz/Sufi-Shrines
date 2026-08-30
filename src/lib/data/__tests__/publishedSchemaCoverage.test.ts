// @vitest-environment node
/**
 * The published schema must describe the dataset it publishes
 * (RULE 4 — encode invariants, don't rely on intentions).
 *
 * ## The hazard this is for
 *
 * `data/datapackage.json` (Frictionless) and `data/shrine-schema.json` (JSON
 * Schema) are part of the licensed data release: `LICENSE-data.md` names them,
 * `scripts/data/release.mjs` bundles them, and a downstream consumer validates
 * against them. Between them they described **11 of the dataset's 44 columns**,
 * and **27 of the 33 they omitted are populated**:
 *
 *     info_level 169/169 · support_level 169/169 · id 168 · category 168
 *     site_type 168 · status 168 · principal_figure 168 · figure_type 168
 *     year_built_precision 168 · year_built_note 158 · flags 146
 *     year_built 127 · figure_died 71 · figure_born 66 · silsila 52
 *     qa_note 50 · event_note 21 · event_year 19 · Image 3–10 · needs_review 11
 *
 * An archive whose distinguishing claim is provenance published a schema in
 * which **the provenance columns did not exist**. A researcher reading the
 * descriptor is told this dataset records a site's name, location, founding year
 * and saint, and is silent on how well evidenced it is, how complete it is,
 * whether it still stands, what was built, who it is for, and every split date
 * field. They cannot select by evidence, because they were never told evidence
 * was recorded.
 *
 * Nothing in this repository consults these files — `citation.test.ts` reads
 * `datapackage.json` for its `version` string and nothing else — so nothing here
 * noticed. The reader who does consult them is exactly the person the ODbL
 * release and the `CITATION.cff` exist for.
 *
 * ## Why some fields declare an `enum` and some only describe one
 *
 * The second assertion below is the one worth keeping in mind before editing
 * these files: **a published descriptor must never reject the archive's own
 * data.** Declaring `status` as a five-value enum would have been a new wrong
 * answer rather than a fix — two shipped rows carry prose in that column, one
 * carries `Islam` in `category`, and two carry a qualifying phrase in
 * `figure_type` where a short term is expected.
 *
 * Those three name their vocabulary in the `description` and constrain nothing.
 * `support_level` and `info_level` satisfy theirs on all 169 rows and so declare
 * it. When the pending sheet patches land (RULE 3), the other three can be
 * promoted — and this test will keep them honest either way, because it fails
 * the moment a declared enum stops matching the data.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (...p: string[]) => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'));

type Row = Record<string, unknown>;
type Field = { name: string; type?: string; constraints?: { enum?: string[] } };
type Resource = { name: string; schema: { fields: Field[] } };

const rows = (): Row[] => (read('data', 'shrines.json') as { rows: Row[] }).rows;

const datasetColumns = (): string[] => {
  const keys = new Set<string>();
  for (const row of rows()) for (const k of Object.keys(row)) keys.add(k);
  return [...keys].sort();
};

const datapackage = () => read('data', 'datapackage.json') as { resources: Resource[] };
const shrineSchema = () =>
  read('data', 'shrine-schema.json') as {
    properties: Record<string, { description?: string; enum?: string[] }>;
  };

const UNDESCRIBED =
  'A column the descriptor omits is a column a downstream consumer is never told exists — and ' +
  'this archive\'s distinguishing claim is the provenance columns. Add it to both descriptors ' +
  'with a description transcribed from CLAUDE.md\'s Schema section or the script that writes it; ' +
  'do not guess what a field means (RULE 2).';

describe('the published schema describes the published dataset', () => {
  it.each(['shrines', 'shrines-csv'])('datapackage resource %s covers every column', (name) => {
    const resource = datapackage().resources.find((r) => r.name === name);
    expect(resource, `resource "${name}" was renamed or removed`).toBeDefined();
    const declared = new Set(resource!.schema.fields.map((f) => f.name));
    const columns = datasetColumns();

    const missing = columns.filter((c) => !declared.has(c));
    expect(missing, missing.length === 0 ? '' : `${missing.length} undescribed: ${missing.join(', ')}\n${UNDESCRIBED}`).toEqual([]);

    const ghosts = [...declared].filter((d) => !columns.includes(d));
    expect(
      ghosts,
      `the descriptor declares ${ghosts.length} field(s) no row carries: ${ghosts.join(', ')}. ` +
        'A consumer will look for a column that is not there.',
    ).toEqual([]);
  });

  it('shrine-schema.json covers every column', () => {
    const declared = new Set(Object.keys(shrineSchema().properties));
    const columns = datasetColumns();
    const missing = columns.filter((c) => !declared.has(c));
    expect(missing, missing.length === 0 ? '' : `${missing.length} undescribed: ${missing.join(', ')}\n${UNDESCRIBED}`).toEqual([]);
    expect([...declared].filter((d) => !columns.includes(d))).toEqual([]);
  });

  it('never declares a constraint the archive\'s own data violates', () => {
    /* The invariant that decides how these files may be edited. A schema
       stricter than the data it publishes does not describe the archive — it
       rejects it, and the person it fails is the downstream researcher, not us. */
    const all = rows();
    const violations: string[] = [];

    const check = (source: string, field: string, allowed: string[]) => {
      for (const row of all) {
        const value = String(row[field] ?? '');
        if (allowed.includes(value)) continue;
        violations.push(
          `  ${source} · ${field} declares an enum that ${JSON.stringify(String(row.Name ?? ''))} violates with ${JSON.stringify(value.slice(0, 60))}`,
        );
        break; // one example per field is enough to act on
      }
    };

    for (const resource of datapackage().resources) {
      for (const f of resource.schema.fields) {
        if (f.constraints?.enum) check(`datapackage/${resource.name}`, f.name, f.constraints.enum);
      }
    }
    for (const [name, prop] of Object.entries(shrineSchema().properties)) {
      if (prop.enum) check('shrine-schema.json', name, prop.enum);
    }

    expect(
      violations,
      violations.length === 0
        ? ''
        : `${violations.length} published constraint(s) reject the archive's own rows:\n${violations.join('\n')}\n\n` +
            'Either the sheet is wrong and needs a patch (RULE 3), or the constraint is. Do not ' +
            'publish a schema the dataset fails — describe the vocabulary in the field description ' +
            'and constrain nothing until the data satisfies it.',
    ).toEqual([]);
  });

  it('describes every field it declares, in the resource that carries descriptions', () => {
    const resource = datapackage().resources.find((r) => r.name === 'shrines')!;
    const undescribed = resource.schema.fields
      .filter((f) => !(f as { description?: string }).description)
      .map((f) => f.name);
    expect(undescribed, `${undescribed.join(', ')} declared with no description`).toEqual([]);
  });
});
