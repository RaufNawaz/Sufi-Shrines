// @vitest-environment node
/**
 * Kinship in the graph, and the four ways it could quietly go wrong.
 *
 * The archive stated 28 family ties in its own prose and rendered none of them
 * until 29 August 2026: the relation vocabulary knew `disciple_of` and
 * `successor_of`, so blood and marriage sat in a proposals file where no page
 * could reach them. That is a large enough addition to bring its own failure
 * modes, and these are the ones a reader would never see reported:
 *
 *  - **A silent chip.** One stored edge is read from both figures' pages, so it
 *    carries two role labels. A label with no string in one language renders as
 *    nothing at all — an Urdu reader would see a name and no relationship, and
 *    the page would look finished.
 *  - **A one-way tie.** If only the subject's page resolved the edge, half of
 *    every relationship in the archive would be invisible, and the missing half
 *    is the elder's — the figure a reader is more likely to arrive at.
 *  - **A contradiction.** Both directions of the same tie asserted would print
 *    "father" on one page and "son" on the other for the same pair.
 *  - **An unevidenced claim.** A kin edge with no quote is exactly the thing
 *    docs/allo_mahar_resolution.md is about.
 *
 * `scripts/data/verify-kg-proposals.mjs` checks the seed file. This checks the
 * built graph and the strings the app actually renders from, which is a
 * different universe — the lesson of HANDOVER §9.29, §9.38, §9.39.
 */
import { describe, it, expect } from 'vitest';
import { getKGStore, getKinOf, getKinNotes, getSaintBySlug } from '../kg';
import { KIN_ROLE_KEYS } from '../data/kinRoles';
import { UI_TEXT } from '../i18n/uiStrings';
/* A test may import the Urdu table directly — `uiStringSplit.test.ts` bans the
   static import in app source only, because nothing in a test reaches the
   bundle, and asserting *about* the table is the point here. */
import { UI_TEXT_UR } from '../i18n/uiStrings.ur';

const kg = getKGStore();
const kinEdges = kg.relations.filter((r) => r.type === 'kin_of');

describe('the kinship layer', () => {
  it('has edges to check', () => {
    // A floor, so nothing below can pass by the graph emptying.
    expect(kinEdges.length).toBeGreaterThan(20);
  });

  it('points both ends at figures the graph holds', () => {
    const dangling = kinEdges
      .flatMap((r) => [r.subject, r.object])
      .filter((id) => !getSaintBySlug(id.replace(/^saint:/, '')))
      .sort();
    expect(dangling, 'a kin edge pointing at nobody renders a blank row').toEqual([]);
  });

  it('gives every role a label in both languages', () => {
    /* The one that fails silently. `KIN_ROLE_KEYS` is what the component looks
       a role up in, and a key missing from either table renders an empty chip
       rather than an error. */
    const missing: string[] = [];
    for (const r of kinEdges) {
      for (const role of [r.elderRole, r.juniorRole]) {
        if (!role) {
          missing.push(`${r.id}: a role is absent from the edge`);
          continue;
        }
        const key = KIN_ROLE_KEYS[role];
        if (!key) missing.push(`${role}: not in KIN_ROLE_KEYS`);
        else if (!UI_TEXT.en[key]) missing.push(`${role}: no English string`);
        else if (!UI_TEXT_UR[key]) missing.push(`${role}: no Urdu string`);
      }
    }
    expect([...new Set(missing)].sort()).toEqual([]);
  });

  it('is readable from both figures, with the roles swapped', () => {
    for (const r of kinEdges) {
      const subject = r.subject.replace(/^saint:/, '');
      const object = r.object.replace(/^saint:/, '');

      const fromJunior = getKinOf(subject).find(
        (l) => l.saint.slug === object && l.kinType === r.kinType,
      );
      const fromSenior = getKinOf(object).find(
        (l) => l.saint.slug === subject && l.kinType === r.kinType,
      );
      expect(fromJunior, `${r.id} is invisible on the junior's page`).toBeTruthy();
      expect(fromSenior, `${r.id} is invisible on the senior's page`).toBeTruthy();

      /* The swap, asserted rather than assumed: what one page calls the other
         figure is what the other page calls itself. Getting this backwards
         would print "grandson" on the grandfather's page. */
      expect(fromJunior?.role).toBe(r.elderRole);
      expect(fromJunior?.selfRole).toBe(r.juniorRole);
      expect(fromSenior?.role).toBe(r.juniorRole);
      expect(fromSenior?.selfRole).toBe(r.elderRole);
      expect(fromJunior?.otherIsElder).toBe(true);
      expect(fromSenior?.otherIsElder).toBe(false);
    }
  });

  it('never asserts the same tie in both directions', () => {
    const seen = new Set(kinEdges.map((r) => `${r.subject}|${r.kinType}|${r.object}`));
    const contradictions = kinEdges
      .filter((r) => seen.has(`${r.object}|${r.kinType}|${r.subject}`))
      .map((r) => r.id);
    expect(contradictions).toEqual([]);
  });

  it('never draws a figure as their own relative', () => {
    expect(kinEdges.filter((r) => r.subject === r.object).map((r) => r.id)).toEqual([]);
  });

  it('shows its evidence for every tie', () => {
    /* Not decoration: every one of these was read out of a sentence, and the
       page prints the sentence under the row. An edge without one is a claim
       the archive cannot support. */
    const unevidenced = kinEdges.filter((r) => !r.quote?.trim() || !r.source?.trim());
    expect(unevidenced.map((r) => r.id)).toEqual([]);
  });

  it('only reads a role as plural where the figure really is a collective', () => {
    /* True for one edge — the six women of Bibi Pak Daman, whose figure_type is
       "Collective". Anywhere else it would be the archive inventing siblings. */
    const plural = kinEdges.filter((r) => r.juniorIsPlural);
    for (const r of plural) {
      const subject = getSaintBySlug(r.subject.replace(/^saint:/, ''));
      expect(subject?.figureType, r.id).toBe('Collective');
    }
  });

  it('attaches every unnameable kin note to a figure that exists', () => {
    /* The two ties the archive records without naming the relative. They are
       not edges and would vanish if the page rendered only edges, which is the
       whole reason they are a separate shape. */
    const notes = kg.kinNotes ?? [];
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(getSaintBySlug(n.saintSlug), n.saintSlug).toBeTruthy();
      expect(getKinNotes(n.saintSlug)).toContainEqual(n);
      expect(n.quote?.trim(), n.saintSlug).toBeTruthy();
      expect(n.source?.trim(), n.saintSlug).toBeTruthy();
    }
  });
});

/**
 * The review marker, and the premise that turned out to be false.
 *
 * On 30 August 2026 this was reported to Rauf as an inconsistency: 67 kin edges
 * showed no review marker while 92 of 99 lineage edges showed "unreviewed", and
 * the report said the two rested on identical evidence. **They do not.** Every
 * relation type in this graph follows one rule — `method: 'machine-extracted'`
 * carries `reviewed: false` and is badged; `method: 'human'` omits the flag and
 * is not — and all 67 kin edges are human-adjudicated seeds, exactly like the
 * 7 human `disciple_of`/`successor_of` edges and the 24 human `belongs_to_order`
 * edges that are also, correctly, unbadged. The absence of a marker on kin was
 * the rule working.
 *
 * What was actually wrong is narrower and the opposite shape: `KinLink` had no
 * `reviewed` field at all and `toKinLink` never read it, so kin was the one link
 * type that could not express the distinction. The first machine-extracted kin
 * edge to reach the graph would have rendered with a hand-ruled seed's
 * authority. These tests hold the rule from both ends, so the badge stays dead
 * exactly as long as it should.
 */
describe('kin edges carry the same review marker as every other link type', () => {
  it('the whole graph follows one rule: machine-extracted is flagged, human is not', () => {
    // Floors first. This assertion filters a list, and a filter over an empty
    // list passes while proving nothing — the way the kg-sources check once
    // narrowed 533 rows to none and reported success (HANDOVER §9.60).
    const machine = kg.relations.filter((r) => r.method === 'machine-extracted');
    const human = kg.relations.filter((r) => r.method === 'human');
    expect(machine.length).toBeGreaterThan(50);
    expect(human.length).toBeGreaterThan(50);

    const wrong = kg.relations
      .filter((r) =>
        r.method === 'machine-extracted' ? r.reviewed !== false : r.reviewed === false,
      )
      .map((r) => `${r.type} ${r.subject}->${r.object} method=${r.method} reviewed=${r.reviewed}`);
    expect(wrong, 'a relation whose method and review flag disagree').toEqual([]);
  });

  it('every kin edge today is human-decided, so no badge is the honest render', () => {
    expect(kinEdges.every((r) => r.method === 'human')).toBe(true);
    const links = kinEdges.flatMap((r) => getKinOf(r.subject.replace(/^saint:/, '')));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((l) => l.reviewed)).toBe(true);
  });

  it('KinLink can express an unreviewed tie at all — the hole this closes', () => {
    // Not a tautology: before this field existed the expression below was
    // `undefined`, and KinView had no branch that could ever show the marker.
    const sample = getKinOf(kinEdges[0].subject.replace(/^saint:/, ''))[0];
    expect(sample).toBeDefined();
    expect(typeof sample.reviewed).toBe('boolean');
  });

  it('reuses the lineage marker rather than inventing a second vocabulary', () => {
    // A reader should learn "unreviewed" once. Both languages must have it,
    // because a chip with no string renders as nothing and looks finished.
    expect(UI_TEXT.en.lineageUnreviewed).toBeTruthy();
    expect(UI_TEXT_UR.lineageUnreviewed).toBeTruthy();
    expect(UI_TEXT.en.lineageUnreviewedHelp).toBeTruthy();
    expect(UI_TEXT_UR.lineageUnreviewedHelp).toBeTruthy();
    // The help text must not name lineage, or it lies on a kin row.
    expect(UI_TEXT.en.lineageUnreviewedHelp.toLowerCase()).not.toContain('lineage');
  });
});
