import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  readSurveyedShrines,
  findFailures,
  CITATION_MARKER,
  SURVEYED_SUPPORT_LEVEL,
  KNOWN,
  NOT_IN_DATASET,
} from '../../../../scripts/data/validate-survey-provenance.mjs';
import shrines from '../../../data/shrines-fallback.json';

/**
 * The guard that a surveyed shrine says it was surveyed.
 *
 * Nineteen entries in this archive rest on a field-survey response. On
 * 5 September 2026 three of them published that survey's content with no
 * citation of it, at `support_level: Source-seeded` — while the sixteen beside
 * them carried the citation and read `Field-verified`. Nothing was broken:
 * every page rendered and every gate passed while the archive presented a named
 * fieldworker's account as though it came from nowhere. A missing citation has
 * no symptom, which is exactly why it gets a check (RULE 4).
 *
 * These test the predicate rather than the script's output, because the script
 * is the gate and the gate's own logic is the thing that must not quietly
 * invert. In particular: a check that returns "nothing wrong" for a dataset it
 * never read is indistinguishable from a passing archive, so the last case here
 * is that the real map and the real dataset still produce the failures we think
 * they do.
 */

const MAP_PATH = join(__dirname, '../../../../pipeline/survey_response_map.tsv');
const mapText = readFileSync(MAP_PATH, 'utf8');
const rows = (shrines as { rows?: Record<string, string>[] }).rows ?? [];

const cited = (id: string) => ({
  id,
  Description: `Body.\n\n## Bibliography\n\n- ${CITATION_MARKER}, X responses, 2026.`,
  support_level: SURVEYED_SUPPORT_LEVEL,
});

describe('the survey response map', () => {
  it('maps every live response to a shrine id', () => {
    const surveyed = readSurveyedShrines(mapText);
    expect(surveyed.size).toBe(19);
    for (const entry of surveyed.values()) expect(entry.id).toMatch(/^[a-z0-9-]+$/);
  });

  it('ignores responses marked Delete', () => {
    const text = [
      'timestamp\tshrine_name_as_written\tsurveyor\tstatus\tshrine_id',
      '01/01/2026\tA\tS\tDelete\tsuperseded-draft',
      '02/01/2026\tA\tS\tlive\tthe-shrine',
    ].join('\n');
    const surveyed = readSurveyedShrines(text);
    expect([...surveyed.keys()]).toEqual(['the-shrine']);
  });

  it('refuses a live response with no shrine id rather than skipping it', () => {
    const text = [
      'timestamp\tshrine_name_as_written\tsurveyor\tstatus\tshrine_id',
      '01/01/2026\tA\tS\tlive\t',
    ].join('\n');
    expect(() => readSurveyedShrines(text)).toThrow(/no shrine_id/);
  });
});

describe('what counts as a failure', () => {
  const surveyed = readSurveyedShrines(
    ['timestamp\tshrine_name_as_written\tsurveyor\tstatus\tshrine_id', '01/01/2026\tA\tS\tlive\tx'].join(
      '\n',
    ),
  );

  it('passes a row with both the citation and the level', () => {
    expect(findFailures([cited('x')], surveyed).failures).toHaveLength(0);
  });

  it('fails a row that has the level but no citation', () => {
    const row = { ...cited('x'), Description: 'Body with no bibliography line.' };
    expect(findFailures([row], surveyed).failures[0].reasons).toEqual([
      'no field-survey citation in Description',
    ]);
  });

  it('fails a row that has the citation but not the level — the interesting case', () => {
    const row = { ...cited('x'), support_level: 'Source-seeded' };
    expect(findFailures([row], surveyed).failures[0].reasons).toEqual([
      'support_level is "Source-seeded", not Field-verified',
    ]);
  });

  it('reports a mapped shrine that is not in the dataset as absent, not as failing', () => {
    const { failures, absent } = findFailures([], surveyed);
    expect(failures).toHaveLength(0);
    expect(absent).toEqual(['x']);
  });
});

describe('against the shipped data', () => {
  it('still finds exactly the three rows the allowlist records', () => {
    const surveyed = readSurveyedShrines(mapText);
    const { failures, absent } = findFailures(rows, surveyed);
    expect(failures.map((f) => f.id).sort()).toEqual([...KNOWN.keys()].sort());
    expect(absent.sort()).toEqual([...NOT_IN_DATASET.keys()].sort());
  });

  it('finds sixteen surveyed shrines already carrying their provenance', () => {
    const surveyed = readSurveyedShrines(mapText);
    const { failures, absent } = findFailures(rows, surveyed);
    expect(surveyed.size - failures.length - absent.length).toBe(14);
    // 19 live responses − 3 failing − 2 not shipped. The other two of the
    // sixteen that pass in the sheet are the unshippable rows, which cannot be
    // counted here because they are not in the dataset at all.
  });
});
