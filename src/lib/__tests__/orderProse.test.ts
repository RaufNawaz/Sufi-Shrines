// @vitest-environment node
/**
 * Every order page can now say something the archive stands behind.
 *
 * Before 29 August 2026 an order page showed one summary sentence written for
 * this site — and four of the nine orders had not even that, so their pages
 * opened on a member list with no account of the order at all. The corpus
 * meanwhile carried whole authored sections on the same orders ("The Suhrawardi
 * Way", "The Way of Blame", "The Azeemia Order") that no page could reach.
 *
 * What is asserted here is what the page's honesty rests on, none of which
 * would be visible if it broke:
 *
 *  - **Every order is covered.** The point was the four with nothing; a
 *    regression that quietly drops one puts a page back to a bare member list.
 *  - **Every passage links to an entry that exists.** The citation under a quote
 *    is the reader's way to check it. A dead slug makes it a dead end.
 *  - **The five editorial summaries are still marked.** If the flag is lost, an
 *    unsourced sentence stands on an order page looking like the archive's own
 *    finding, which is the thing this change was about.
 *
 * `verify-kg-proposals.mjs` checks the passages are verbatim, against the
 * corpus. This checks the shipped artefacts the app renders from — a different
 * universe (HANDOVER §9.29, §9.38, §9.39).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKGStore } from '../kg';

const ROOT = join(__dirname, '..', '..', '..');
const prose = JSON.parse(readFileSync(join(ROOT, 'data', 'kg-order-prose.json'), 'utf8')) as {
  passages: {
    orderSlug: string;
    shrineSlug: string;
    shrineName: string;
    quote: string;
    quoteUr: string;
  }[];
};
const shrines = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8')) as {
  rows: Record<string, string>[];
};
const kg = getKGStore();

describe('what the archive says about its orders', () => {
  it('has passages to check', () => {
    expect(prose.passages.length).toBeGreaterThan(10);
  });

  it('covers every order in the taxonomy', () => {
    const covered = new Set(prose.passages.map((p) => p.orderSlug));
    const uncovered = kg.orders.map((o) => o.slug).filter((s) => !covered.has(s));
    expect(uncovered, 'an order with no passage shows a reader nothing about what it is').toEqual(
      [],
    );
  });

  it('names only orders that exist', () => {
    const known = new Set(kg.orders.map((o) => o.slug));
    expect(prose.passages.filter((p) => !known.has(p.orderSlug)).map((p) => p.orderSlug)).toEqual(
      [],
    );
  });

  it('cites an entry the archive still publishes', () => {
    /* The label under each quote is a link. Checked against the dataset rather
       than the graph, because the link goes to /shrine/:slug and it is the
       shrine rows that decide whether that route resolves. */
    const names = new Set(shrines.rows.map((r) => r.Name));
    const missing = prose.passages.filter((p) => !names.has(p.shrineName)).map((p) => p.shrineName);
    expect(missing, 'a citation pointing at an entry that is gone is a dead end').toEqual([]);
  });

  it('never ships an empty passage', () => {
    expect(prose.passages.filter((p) => !p.quote?.trim()).map((p) => p.orderSlug)).toEqual([]);
  });

  it('carries the Urdu passage for every English one', () => {
    /* The failure this prevents is the one that shipped: an order page in Urdu
       whose main content — on four of these pages its ONLY account of the order
       — was an English paragraph. That is an untranslated sentence, not a
       citation, and i18n rule 7 forbids it; the no-leak guard failed on seven
       routes. The archive already held all fifteen passages in Urdu, so there
       was never a reason to fall back. */
    const missing = prose.passages.filter((p) => !p.quoteUr?.trim()).map((p) => p.orderSlug);
    expect(missing, 'an Urdu order page would fall back to English prose').toEqual([]);
  });

  it('never leaves a Latin word run inside an Urdu passage', () => {
    /* A stray Latin word inside `quoteUr` reaches the Urdu view undeclared, and
       the leak guard reports it against a route budget rather than against the
       passage — so it is caught here, where the message names the passage. */
    const leaking = prose.passages
      .filter((p) => /[A-Za-z]{3,}/.test(p.quoteUr ?? ''))
      .map((p) => `${p.orderSlug} ← ${p.shrineSlug}`);
    expect(leaking).toEqual([]);
  });

  it('still marks every unsourced summary as this site’s own words', () => {
    /* Five orders carry a `description`; all five are background written here,
       none is sourced. If one ever loses the flag it reads as an archive claim. */
    const withSummary = kg.orders.filter((o) => o.description);
    expect(withSummary.length).toBeGreaterThan(0);
    const unmarked = withSummary.filter((o) => !o.descriptionIsEditorial).map((o) => o.slug);
    expect(unmarked).toEqual([]);
  });

  it('keeps the order prose out of the graph payload', () => {
    /* It is a separate file precisely so it does not ride kg.json onto every
       route that touches the graph (HANDOVER §9.125). A stray `prose` key on an
       order node would put it back. */
    for (const order of kg.orders) {
      expect(order, order.slug).not.toHaveProperty('prose');
    }
  });
});
