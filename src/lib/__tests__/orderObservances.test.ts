// @vitest-environment node
/**
 * The order pages' ʿurs calendar, and the four ways a join like it can lie.
 *
 * `/order/:slug` listed members, dates, sites and lineage and not one of the 77
 * ʿurs the graph holds — although every one of them is keyed by `saintSlug` and
 * `belongs_to_order` joins figure to order. That is the §9.85/§9.99/§9.100
 * pattern: the archive holding data no page renders. Closing it is two joins and
 * a list, and none of the failures it can produce raise anything.
 *
 * 1. **The join drifts.** A figure's events reached through the wrong side of
 *    `commemorated_by`, or an event id the store no longer holds, produces a
 *    shorter list that still renders and still looks complete.
 * 2. **The heading stops being true.** The section is titled "ʿUrs in this
 *    order". Every event reachable through an order membership is an ʿurs
 *    *today*; this archive covers six traditions and an event node's type is
 *    the record's, not the builder's, so an `observance` arriving here means the
 *    heading has to change rather than the data.
 * 3. **The date comes from the wrong field.** `KGEvent.date` is a bare month
 *    lifted from the shrine's `Events` cell and is present on 16 of 149 nodes.
 *    A section that read it would show a date for a sixth of the rows it can
 *    actually date, and nobody would notice the missing five sixths.
 * 4. **Provenance parity is lost.** 44 of 64 memberships are machine-read and
 *    unreviewed. The member list marks them; a second surface listing the same
 *    figures inherits that marking or it quietly launders them (HANDOVER §9.85).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKGStore, getOrderObservances, getSaintsInOrder } from '../kg';
import { buildShrines } from '../data/shrineModel';
import { getFieldValue } from '../data/fieldAliasing';
import { parseObservances } from '../data/ursDates';
import type { ShrineRow } from '../../types/shrine';
import snapshot from '../../data/shrines-fallback.json';

const SRC = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

const store = getKGStore();
const orders = store.orders;
const shrines = buildShrines((snapshot as { rows: ShrineRow[] }).rows);
const shrineBySlug = new Map(shrines.map((s) => [s.slug, s]));

/** Every row the five order pages will render, flattened. */
const allRows = orders.flatMap((order) =>
  getOrderObservances(order.slug).map((row) => ({ order: order.slug, ...row })),
);

describe('getOrderObservances', () => {
  it('finds observances for every order the graph holds', () => {
    for (const order of orders) {
      expect(
        getOrderObservances(order.slug).length,
        `no observance reachable from /order/${order.slug} — the section would hide`,
      ).toBeGreaterThan(0);
    }
  });

  it('resolves every row to an event the store still holds', () => {
    const ids = new Set(store.events.map((e) => e.id));
    for (const row of allRows) {
      expect(ids.has(row.event.id), `dangling event ${row.event.id}`).toBe(true);
    }
  });

  it('never attributes an event to a figure it does not commemorate', () => {
    /* The join walks saint → event. An event carrying its own `saintSlug` is
       the check on that direction: if the two disagree the row names the wrong
       person under the right date, which reads as fact. */
    for (const row of allRows) {
      if (!row.event.saintSlug) continue;
      expect(row.event.saintSlug, `event ${row.event.id} listed under ${row.saint.slug}`).toBe(
        row.saint.slug,
      );
    }
  });

  it('lists only figures the order actually records as members', () => {
    for (const order of orders) {
      const members = new Set(getSaintsInOrder(order.slug).map((s) => s.slug));
      for (const row of getOrderObservances(order.slug)) {
        expect(members.has(row.saint.slug), `${row.saint.slug} is not in ${order.slug}`).toBe(true);
      }
    }
  });

  it('never repeats a figure/event pair', () => {
    for (const order of orders) {
      const keys = getOrderObservances(order.slug).map((r) => `${r.saint.slug}:${r.event.id}`);
      expect(new Set(keys).size, `duplicate row on ${order.slug}`).toBe(keys.length);
    }
  });

  it('carries the membership edge’s reviewed flag, and some are unreviewed', () => {
    const edges = new Map(
      store.relations
        .filter((r) => r.type === 'belongs_to_order')
        .map((r) => [`${r.subject}:${r.object}`, r.reviewed !== false]),
    );
    for (const row of allRows) {
      expect(
        row.membershipReviewed,
        `${row.saint.slug} in ${row.order}: flag does not match the edge`,
      ).toBe(edges.get(`saint:${row.saint.slug}:order:${row.order}`));
    }
    expect(
      allRows.filter((r) => !r.membershipReviewed).length,
      'no unreviewed row left, so the marking on this surface is never exercised',
    ).toBeGreaterThan(0);
  });

  it('reaches only ʿurs, which is what the section is titled', () => {
    const other = allRows.filter((r) => r.event.eventType !== 'urs');
    expect(
      other.map((r) => `${r.event.id} (${r.event.eventType})`),
      'a non-ʿurs observance now reaches an order page — change the heading, not the data',
    ).toEqual([]);
  });
});

describe('the dates the section shows come from the shrine cell', () => {
  const withCellDate = allRows.filter((row) => {
    const shrine = row.event.shrineSlug ? shrineBySlug.get(row.event.shrineSlug) : undefined;
    return shrine ? parseObservances(getFieldValue(shrine.raw, 'Events')).length > 0 : false;
  });
  const withNodeDate = allRows.filter((row) => Boolean(row.event.date));

  it('finds far more dates in the cell than on the event node', () => {
    /* Not a preference. `KGEvent.date` is a month the builder happened to
       match; the cell is the sentence a surveyor wrote, and `ursDates.ts` reads
       day ranges, month ranges, seasons and recurrence rules out of it. */
    expect(withCellDate.length).toBeGreaterThan(withNodeDate.length);
  });

  it('still has rows it cannot date, and says so rather than guessing', () => {
    const undated = allRows.length - withCellDate.length;
    expect(
      undated,
      'every row datable — the "date not recorded" branch is now dead',
    ).toBeGreaterThan(0);
    expect(undated, 'no row datable at all').toBeLessThan(allRows.length);
  });
});

describe('OrderPage renders the join honestly', () => {
  const src = read('pages/OrderPage.tsx');

  it('reads the observances through the graph helper', () => {
    expect(src).toContain('getOrderObservances');
  });

  it('reads dates through the almanac’s parser, not the event node', () => {
    expect(src).toContain('parseObservances');
    // `event.date` is the 16-of-149 field. Reading it here would silently drop
    // the day ranges, month ranges and seasons the cell holds.
    expect(src).not.toMatch(/event\.date\b/);
  });

  it('marks an unreviewed membership on this surface too', () => {
    expect(src).toContain('membershipReviewed');
    expect(src).toContain('lineageUnreviewed');
  });

  it('shows the reader the cell the dates were read out of', () => {
    expect(src).toContain('localizeObservance');
  });

  it('names a season with the same key the almanac does', () => {
    /* Two surfaces render a recorded season now. A second copy of the map is a
       second place for a season to go untranslated. */
    expect(src).toContain('SEASON_LABEL_KEYS');
    expect(read('pages/AlmanacPage.tsx')).toContain('SEASON_LABEL_KEYS');
  });
});
