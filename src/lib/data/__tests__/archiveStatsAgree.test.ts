// @vitest-environment node
/**
 * The archive's account of itself must be the same number wherever it appears.
 *
 * Three surfaces describe what this archive holds — `/about` (the summary),
 * `/coverage` ("What this archive knows") and `/report` ("State of the Archive")
 * — and the last two compute the *same* support-level, info-level and tradition
 * distributions through two entirely separate builders, `buildCoverage` and
 * `buildArchiveReport`. Two implementations of one statistic is two chances to
 * be right, and nothing was checking they landed in the same place. An archive
 * whose distinguishing claim is candour cannot say "14 field-verified" on one
 * page and "13" on another; that is worse than saying neither, because a reader
 * who notices has no way to tell which page lied.
 *
 * They agree today. This file is what makes that a fact rather than a
 * coincidence, and it is deliberately an equality: if a future change makes one
 * builder smarter — folding the sheet's stray "Islam" category into `muslim`,
 * say — this fails until the other learns the same thing or the difference is
 * written down here as intended.
 *
 * A note on how easy it is to measure this wrongly. Both builders read their
 * fields through `getFieldValue`, which resolves the sheet's aliases; handed
 * *raw snapshot rows* instead of `buildShrines(...)` output they both report
 * every support level as zero and all 169 entries as unrecorded. That looks
 * exactly like a live bug on the two pages whose whole purpose is honest
 * self-assessment, and it is an artefact of the harness. Hence `buildShrines`
 * here, and hence this paragraph.
 */
import { describe, it, expect } from 'vitest';
import { buildCoverage } from '../coverage';
import { buildArchiveReport } from '../archiveReport';
import { buildShrines } from '../shrineModel';
import { SUPPORT_KEYS, INFO_KEYS } from '../coverage';
import type { ShrineRow } from '../../../types/shrine';
import snapshot from '../../../data/shrines-fallback.json';

const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);
const coverage = buildCoverage(shrines);
const report = buildArchiveReport(shrines);

describe('the two archive-statistics builders agree', () => {
  it('on how many entries there are', () => {
    expect(coverage.total).toBe(report.totalShrines);
    expect(coverage.total).toBe(shrines.length);
  });

  it('on the support-level distribution, level by level', () => {
    for (const key of SUPPORT_KEYS) {
      expect(coverage.support.counts[key], `support: ${key}`).toBe(report.supportLevels[key]);
    }
    expect(coverage.support.unrecorded, 'entries with no recorded support level').toBe(
      report.supportUnknown,
    );
  });

  it('on the info-level distribution, level by level', () => {
    for (const key of INFO_KEYS) {
      expect(coverage.info.counts[key], `info: ${key}`).toBe(report.infoLevels[key]);
    }
    expect(coverage.info.unrecorded, 'entries with no recorded info level').toBe(
      report.infoUnknown,
    );
  });

  it('on how many entries each distribution accounts for', () => {
    /* The property that makes a distribution readable at all: the bars plus the
       "not recorded" row must be the whole archive, or a percentage is against
       an invented denominator. Checked for both builders because they build the
       "unrecorded" bucket differently — coverage as a field on the
       distribution, report as a sibling count. */
    for (const dist of [coverage.support, coverage.info, coverage.tradition]) {
      const summed = Object.values(dist.counts).reduce((a, b) => a + b, 0) + dist.unrecorded;
      expect(summed).toBe(coverage.total);
    }
    const reportSupport =
      Object.values(report.supportLevels).reduce((a, b) => a + b, 0) + report.supportUnknown;
    expect(reportSupport).toBe(report.totalShrines);
    const reportInfo =
      Object.values(report.infoLevels).reduce((a, b) => a + b, 0) + report.infoUnknown;
    expect(reportInfo).toBe(report.totalShrines);
    expect(report.categories.reduce((a, c) => a + c.count, 0)).toBeLessThanOrEqual(
      report.totalShrines,
    );
  });

  it('on the tradition counts, for every category both of them name', () => {
    /* Not key-for-key: `buildCoverage` works in the schema's closed vocabulary
       and files anything else as unrecorded, while `buildArchiveReport` reports
       the sheet's raw category strings — which is how the stray "Islam" row
       shows up as its own line on /report and inside `unrecorded` on /coverage.
       That is a real difference in what each page is for, so the assertion is
       the one that must hold either way: a tradition both of them recognise
       must carry the same count. */
    const byLabel = new Map(report.categories.map((c) => [c.label.toLowerCase(), c.count]));
    const SCHEMA_LABELS: Record<string, string> = {
      muslim: 'muslim shrine',
      hindu: 'hindu temple',
      sikh: 'sikh gurdwara',
      nanakpanthi: 'nanakpanthi / udasi darbar',
      jain: 'jain temple',
      secular: 'secular / memorial',
    };
    for (const [key, label] of Object.entries(SCHEMA_LABELS)) {
      const fromReport = byLabel.get(label);
      if (fromReport === undefined) continue;
      expect(
        coverage.tradition.counts[key as keyof typeof coverage.tradition.counts],
        `tradition: ${label}`,
      ).toBe(fromReport);
    }
  });

  it('still finds the stray category that makes the two pages differ', () => {
    /* The difference above is only defensible while it is deliberate. When the
       sheet's "Islam" row is finally imported as "Muslim Shrine" — the patch is
       already written, data/patch_data_hygiene_2026-08-21.csv — this fails, and
       the right response is to delete this test and tighten the one above to a
       key-for-key equality. */
    const schema = new Set([
      'muslim shrine',
      'hindu temple',
      'sikh gurdwara',
      'nanakpanthi / udasi darbar',
      'jain temple',
      'secular / memorial',
    ]);
    const stray = report.categories.filter((c) => !schema.has(c.label.toLowerCase()));
    expect(
      stray.map((c) => c.label),
      'no stray category left — tighten the tradition assertion to an equality and delete this test',
    ).not.toEqual([]);
  });
});
