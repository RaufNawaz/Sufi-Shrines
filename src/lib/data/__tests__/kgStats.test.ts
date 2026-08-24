// @vitest-environment node
/**
 * The numbers `/about` publishes about the graph, checked against the graph.
 *
 * `data/kg-stats.json` exists so a page can state the graph's own state without
 * importing the graph: `src/lib/kg.ts` pulls `kg.json` in statically, so six
 * counts off it would cost 426 KB of eager JS — the trap that took `/order/:slug`
 * to 769 KB when the source layer went in. ~400 bytes instead.
 *
 * A derived stats file is a snapshot, and a snapshot is a thing that goes stale.
 * So every number in it is recomputed here from `kg.json` and required to match.
 * That is the whole point of the file being generated rather than written: if a
 * future pass changes how figures are counted and forgets this artefact, `/about`
 * would keep publishing yesterday's figure with today's confidence — which is
 * exactly the failure the standing findings in this repo are a monument to.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
const layer = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-sources.json'), 'utf8'));
const stats = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-stats.json'), 'utf8'));

interface Saint {
  lineageOnly?: boolean;
  titles?: string[];
  disputedDates?: unknown[];
  biographyReviewed?: boolean;
}
interface Relation {
  type: string;
  reviewed?: boolean;
}
const saints: Saint[] = kg.saints;
const relations: Relation[] = kg.relations;
const documented = saints.filter((s) => !s.lineageOnly);
const lineage = relations.filter((r) => r.type === 'disciple_of' || r.type === 'successor_of');
const memberships = relations.filter((r) => r.type === 'belongs_to_order');

describe('what the graph holds', () => {
  it('counts the figures the archive documents, and the ones it does not', () => {
    expect(stats.figures).toBe(documented.length);
    expect(stats.lineageOnlyFigures).toBe(saints.length - documented.length);
    /* Together the whole graph — the same partition the explorer's two lists
       rest on. */
    expect(stats.figures + stats.lineageOnlyFigures).toBe(saints.length);
  });

  it('counts orders, places and observances', () => {
    expect(stats.orders).toBe(kg.orders.length);
    expect(stats.places).toBe(kg.places.length);
    expect(stats.observances).toBe(kg.events.length);
    expect(stats.ursObservances).toBe(
      (kg.events as { eventType: string }[]).filter((e) => e.eventType === 'urs').length,
    );
  });

  it('counts the source layer that lives in its own file', () => {
    expect(stats.sources).toBe(layer.sources.length);
    expect(stats.citations).toBe(layer.attestations.length);
    expect(stats.sources).toBe(kg.stats.sources);
  });

  it('counts honorifics and lineage links', () => {
    expect(stats.titles).toBe(saints.reduce((n, s) => n + (s.titles?.length ?? 0), 0));
    expect(stats.lineageLinks).toBe(lineage.length);
    expect(stats.orderMemberships).toBe(memberships.length);
  });
});

describe('how well it knows it', () => {
  it('counts the machine-read biographies', () => {
    expect(stats.biographiesMachineRead).toBe(
      documented.filter((s) => s.biographyReviewed === false).length,
    );
  });

  it('counts the unreviewed edges', () => {
    expect(stats.lineageLinksUnreviewed).toBe(lineage.filter((r) => r.reviewed === false).length);
    expect(stats.orderMembershipsUnreviewed).toBe(
      memberships.filter((r) => r.reviewed === false).length,
    );
  });

  it('counts the figures whose sources disagree', () => {
    expect(stats.disputedDateFigures).toBe(saints.filter((s) => s.disputedDates?.length).length);
  });

  it('publishes an unreviewed share worth publishing', () => {
    /*
     * Not a tautology — a floor on candour. Most of this graph's lineage is
     * machine-read (80 of 86 links, 44 of 64 affiliations, 94 biographies), and
     * `/about` says so beside the figures it is proud of. If these ever fell to
     * zero the section would still be correct; the reason to assert them is that
     * a *silent* drop to zero almost certainly means the review flag stopped
     * being written, not that 224 claims got reviewed.
     */
    expect(stats.lineageLinksUnreviewed).toBeGreaterThan(0);
    expect(stats.orderMembershipsUnreviewed).toBeGreaterThan(0);
    expect(stats.biographiesMachineRead).toBeGreaterThan(0);
    expect(stats.lineageLinksUnreviewed).toBeLessThanOrEqual(stats.lineageLinks);
    expect(stats.orderMembershipsUnreviewed).toBeLessThanOrEqual(stats.orderMemberships);
    expect(stats.biographiesMachineRead).toBeLessThanOrEqual(stats.figures);
  });
});
