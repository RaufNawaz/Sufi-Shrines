// @vitest-environment node
/**
 * A hand-seeded order membership has no source, so the sheet is the only thing
 * that can check it.
 *
 * `kg-seeds.json#saintOrders` is 23 figure → order decisions typed by hand.
 * There is no `quote` field and no citation: nothing about the shape of that
 * file can be wrong, so nothing about it was ever checked. Meanwhile the
 * machine-extracted path carries a verbatim quote and renders with an
 * "unreviewed" chip, which means **the archive was marking its unsourced
 * memberships as the trustworthy ones**.
 *
 * Audited against the sheet on 29 August 2026. Six of the 23 figures have a
 * `silsila` cell of their own; three of the six disagreed with the seed, and two
 * were simply wrong — a straight transposition:
 *
 *   - Daud Bandagi Kirmani, seeded `chishtiyya`, cell "Qadiri", and his entry
 *     calls him "a revered Qadiri saint" who "became a shaykh of the Qadiri
 *     order". Nothing in the archive mentions him and the Chishtiyya together.
 *   - Waris Shah, seeded `qadiriyya`, cell "Chishti", entry: "belonged in spirit
 *     to the Chishti Sufi tradition".
 *
 * Both corrected. What is asserted here is that the class cannot come back
 * silently: any seeded order the figure's own cell does not name must be
 * declared in `saintOrdersNotInCell` with its evidence, or it shows up here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKGStore } from '../kg';

const ROOT = join(__dirname, '..', '..', '..');
const reviewNeeded = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'kg-review-needed.json'), 'utf8')) as {
    reviewNeeded: { issue: string; entityId?: string }[];
  }
).reviewNeeded;
const kg = getKGStore();

const seeded = kg.relations.filter((r) => r.type === 'belongs_to_order' && r.method === 'human');

describe('hand-seeded order memberships', () => {
  it('has memberships to check', () => {
    expect(seeded.length).toBeGreaterThan(15);
  });

  it('carries the sheet’s own word wherever the figure has one', () => {
    /* `asRecorded` was absent from every one of these until 29 August 2026 — the
       machine path had kept it since the compound cells turned up and this one
       never did. Two named sub-orders were being thrown away by that: Ranmal
       Sharif's "Naushahia Qadiri" and Garh Maharaja's "Sarwari Qadiri" both
       rendered as a bare Qadiriyya. */
    const withCell = seeded.filter((r) => r.asRecorded);
    expect(withCell.length).toBeGreaterThanOrEqual(20);
    for (const branch of ['Naushahia Qadiri', 'Sarwari Qadiri']) {
      expect(
        seeded.some((r) => r.asRecorded === branch),
        `${branch} is a named sub-order the sheet records`,
      ).toBe(true);
    }
  });

  it('files the two corrected figures where every source in the archive puts them', () => {
    const orderOf = (slug: string) =>
      kg.relations
        .filter((r) => r.type === 'belongs_to_order' && r.subject === `saint:${slug}`)
        .map((r) => r.object.replace('order:', ''))
        .sort();
    expect(orderOf('daud-bandagi-kirmani')).toContain('qadiriyya');
    expect(orderOf('daud-bandagi-kirmani')).not.toContain('chishtiyya');
    expect(orderOf('waris-shah')).toContain('chishtiyya');
    expect(orderOf('waris-shah')).not.toContain('qadiriyya');
  });

  it('leaves exactly one seeded order the sheet does not name, and it is a known question', () => {
    /* Pinned rather than asserted-empty, and both directions are meant to fail.
     *
     * `qalandar-baba-auliya` is seeded into BOTH `qalandariyya` and `azeemia`;
     * the second is his cell, the first is not. The evidence for it is that
     * "Qalandar Baba Auliya" is, as his entry says, "the spiritual title" he is
     * known by — an epithet, not a recorded silsila, and reading an order out of
     * a title is the inference RULE 2 exists to stop. It is left standing and
     * flagged rather than deleted, because that is Rauf's call and not a
     * script's.
     *
     * If this list grows, a new unsourced membership contradicts the sheet. If
     * it empties, the question was answered — say which way, here. */
    const contradictions = reviewNeeded
      .filter((r) => r.issue === 'seeded-order-contradicts-sheet')
      .map((r) => r.entityId)
      .sort();
    expect(contradictions).toEqual(['saint:qalandar-baba-auliya']);
  });
});
