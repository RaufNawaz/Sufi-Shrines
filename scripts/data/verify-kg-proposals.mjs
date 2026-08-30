#!/usr/bin/env node
/**
 * verify-kg-proposals.mjs — re-checks every machine-extracted KG proposal
 * against the source it names.
 *
 * Why this is a separate script and not trust in the extractor: the proposals
 * in data/kg-lineage-proposals.json and data/kg-order-proposals.json were
 * produced by an agent, and this project's whole reason for having gates is
 * that a plausible-looking claim about a saint is exactly what it cannot
 * afford (docs/allo_mahar_resolution.md — a confident 700-word biography of
 * the wrong man). The extractor reported that it verified its own quotes.
 * That is not the same as them being verified.
 *
 * What is mechanically checkable, and therefore checked here:
 *   1. Every `quote` is an exact substring of the file/row its `source` names.
 *   2. Every `source` resolves to something that exists.
 *   3. Relation vocabulary is closed (disciple_of | successor_of).
 *   4. Confidence is one of the two declared tiers.
 *   5. `objectIsNew`/`saintIsNew` agrees with whether the slug is in the graph.
 *   6. No proposal duplicates an edge already in data/kg-seeds.json.
 *   7. No self-loops, and no pair asserting a relation in both directions.
 *   8. `asRecorded` on an order proposal matches the sheet cell byte-for-byte.
 *   9. Every parent order is a real order slug.
 *  10. Every kinship edge in data/kg-seeds.json#familyRelations quotes its
 *      source verbatim, uses a closed `kinType` and a closed pair of role
 *      labels, points at slugs the graph holds, and does not duplicate another
 *      edge of the same type between the same two figures. The role labels get
 *      the same treatment as the relation vocabulary because they are not
 *      cosmetic: `uncleMaternal` renders as ماموں and `unclePaternal` as چچا,
 *      so a wrong one asserts a line the source never states (RULE 2).
 *  11. Every passage in data/kg-seeds.json#orderProse is a verbatim run of the
 *      entry it cites, its order is in the taxonomy, and no two passages on the
 *      same order repeat the same text. These are the sentences an order page
 *      now leads with, and they are quotations — so "verbatim" is the whole of
 *      what they promise. Whitespace is normalised on both sides before
 *      comparing, because the seed stores each passage on one line while the
 *      Description wraps it across paragraphs.
 *  12. Every 3-4 digit year appearing in a date proposal's born/died/floruit
 *      occurs literally in the source it quotes. This one is the sharpest of
 *      the lot and is not mine — the extraction agent invented it for its own
 *      authoring pass and reported it firing twice on real errors. A date is
 *      the easiest thing to get subtly wrong and the most visible when you do,
 *      and a quote can be genuine while the year beside it is a typo.
 *
 * What is NOT checkable here, and must stay a human's job: whether the quote
 * actually means what the proposal says it means, whether two similarly-named
 * people are one person, and which side of a contradiction is right. This
 * script's green line means "nothing is fabricated", never "this is correct".
 *
 * Usage:  node scripts/data/verify-kg-proposals.mjs
 *         node scripts/data/verify-kg-proposals.mjs --reconcile
 * Or:     npm run data:validate:kg-proposals
 *
 * --reconcile rewrites the `isNew` flags to match the current graph and exits.
 * Those flags are *derived* — whether a slug already exists is a fact about
 * data/kg.json, not about the proposal — so they go stale whenever the graph
 * grows, which it does on every dataset refresh. (Six saints appeared between
 * the extraction pass and the next `npm run data:kg`, which is exactly how this
 * came up.) Nothing else is ever rewritten: a quote, a relation or a confidence
 * tier being wrong is a real finding and must be fixed by hand.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const LINEAGE = join(ROOT, 'data', 'kg-lineage-proposals.json');
const ORDERS = join(ROOT, 'data', 'kg-order-proposals.json');
const DATES = join(ROOT, 'data', 'kg-saint-dates-proposals.json');
const KG = join(ROOT, 'data', 'kg.json');
const SEEDS = join(ROOT, 'data', 'kg-seeds.json');
// Proposal `source` strings name data/shrines.csv, but the rows are read from
// data/shrines.json — the same build's JSON mirror of the same rows, verified
// byte-identical in Description for every row it carries. Reading the JSON
// avoids adding a CSV-parser dependency for a validation script, and a
// hand-rolled splitter would be wrong: Descriptions are multi-paragraph quoted
// cells, and splitting on newlines before a quote-aware parser sees them is a
// mistake this repo has already made once (docs/HANDOVER.md §8c).
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');
/* The Urdu articles, for the Urdu half of every order passage. An order page in
   Urdu that falls back to the English paragraph is an untranslated sentence
   standing as the page's main content, which i18n rule 7 forbids — so the Urdu
   is required, and required to be verbatim, exactly as the English is. */
const URDU_CONTENT = join(ROOT, 'src', 'data', 'urdu-content.json');

const RELATIONS = new Set(['disciple_of', 'successor_of']);
const KIN_TYPES = new Set([
  'son_of',
  'daughter_of',
  'grandson_of',
  'descendant_of',
  'nephew_of',
  'son_in_law_of',
  'sibling_of',
  'spouse_of',
]);
/* The elder label and the junior label a kinType may carry. Pairing them here
   rather than checking two flat lists is the point: `grandson_of` with
   `elderRole: 'father'` passes two independent vocabulary checks and is
   nonsense. */
const KIN_ROLES = {
  /* `mother` joins `father` on 30 August 2026. The vocabulary had no way to say
     it, and the corpus names three: Mata Tripta, Bibi Rasti, Mehtab Bibi. The
     gap was not a decision — nothing in the first 28 edges happened to be a
     mother, so nobody noticed the list was of fathers rather than of parents. */
  son_of: { elder: ['father', 'mother'], junior: ['son'] },
  daughter_of: { elder: ['father', 'mother'], junior: ['daughter'] },
  grandson_of: {
    elder: ['grandfatherPaternal', 'grandfatherUnspecified'],
    junior: ['grandsonPaternal', 'grandsonUnspecified'],
  },
  descendant_of: { elder: ['ancestor'], junior: ['descendant'] },
  nephew_of: {
    elder: ['unclePaternal', 'uncleMaternal', 'uncleUnspecified'],
    junior: ['nephewPaternal', 'nephewMaternal', 'nephewUnspecified'],
  },
  son_in_law_of: { elder: ['fatherInLaw'], junior: ['sonInLaw'] },
  /* The one SYMMETRIC type, and the only one where `elder`/`junior` do not mean
     what they say. Every other tie runs junior → senior and each end reads a
     different word; a sibling tie reads the same relationship from both sides,
     so the fields mean strictly "role of the object" and "role of the subject"
     — which is what `toKinLink` has always done with them (`role` is the
     elder's label seen from the subject's page). The names are kept rather than
     generalised because renaming them would touch six asymmetric types to
     accommodate one symmetric one.

     Both lists are the same pair on purpose: the *sides* are interchangeable,
     the *words* are not. Bebe Nanaki is Guru Nanak's sister and he is her
     brother, so the two ends carry different labels while neither is senior.
     Two brothers carry `brother` twice. What this must never become is a single
     shared role, which would print "sister" on Guru Nanak's page.

     Stored ONCE, never in both directions — see the reverse check below, which
     needs no exception for this type: for an asymmetric tie a reverse edge is a
     contradiction, for a symmetric one it is a duplicate, and either way it must
     not exist. (HANDOVER §9.160.) */
  sibling_of: { elder: ['brother', 'sister'], junior: ['brother', 'sister'] },
  /* The SECOND symmetric type, and it works exactly like `sibling_of`: stored
     once, both sides drawn from the same pair, the two words usually differing
     because the spouses do. The reverse check needs no exception here either.

     Not `wife_of`, which would force the archive to store every marriage from
     the wife's side and make the direction carry a meaning the corpus does not
     assign. `spouse_of` with `wife`/`husband` says who each person is without
     claiming either is the subject of the marriage. */
  spouse_of: { elder: ['wife', 'husband'], junior: ['wife', 'husband'] },
};
const CONFIDENCE_TIERS = new Set([0.95, 0.7]);
const MAX_QUOTE = 200;
/* Order passages are held to a different cap, and the difference is not
   arbitrary. A lineage or date quote is EVIDENCE — the shortest run that shows a
   claim is not fabricated — and 200 characters is generous for that. An
   `orderProse` passage is the archive quoting ITSELF: whole paragraphs its own
   entries wrote about their own orders, republished on the order's page with the
   entry named and linked. There is no third party to be fair to and no claim
   being propped up, so the limit is only "a passage, not an entry" — enough to
   catch a slice that ran away with half a Description, which is exactly what the
   first Shattari pick did. */
const MAX_PROSE = 1200;

const RECONCILE = process.argv.includes('--reconcile');

const failures = [];
const notes = [];
const reconciled = [];
const fail = (m) => failures.push(m);

/** Mirror of buildStableSlug() in src/lib/data/slugify.ts. */
function slugify(text) {
  let t = (text || '').toLowerCase();
  for (const [ch, rep] of [
    ['&', ' and '],
    ['@', ' at '],
    ['%', ' percent '],
    ['+', ' plus '],
  ]) {
    t = t.split(ch).join(rep);
  }
  t = t.replace(/[^\w\s-]/g, '');
  t = t.replace(/[\s_]+/g, '-');
  t = t.replace(/-+/g, '-');
  return t.replace(/^-|-$/g, '').trim();
}

/**
 * Normalise for substring comparison. Only whitespace and the quote/dash
 * characters that differ between a CSV cell and a JSON string are folded —
 * NOT case, and no words are dropped. A looser normaliser here would defeat
 * the point: it would let a quote that is *nearly* the source pass.
 */
function norm(s) {
  return String(s)
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

if (!existsSync(KG)) {
  console.error('[verify-kg-proposals] data/kg.json missing — run npm run data:kg');
  process.exit(1);
}
const kg = JSON.parse(readFileSync(KG, 'utf8'));
/* Archive figures only — everyone with a shrine here. NOT kg.saints, which is
   circular: build-kg.mjs adds a node for every teacher these proposals name, so
   comparing against the whole saint list would find every `isNew: true`
   proposal "already in the graph" on the run after the first. What the flag
   actually asserts is "this person has no shrine in the archive", which is
   stable, and `lineageOnly` is exactly that distinction. */
const knownSaints = new Set(kg.saints.filter((s) => !s.lineageOnly).map((s) => s.slug));
/* Every figure, lineage-only included. `knownSaints` answers "does this person
   have a site here", which is what `IsNew` means; this answers "is there anybody
   at this slug at all", which is what a date proposal needs. */
const allSaintSlugs = new Set(kg.saints.map((s) => s.slug));

/* A proposal's slug is a *pointer* to a figure, and the graph renames figures.
 *
 * `kg.json.retiredSlugs` already records every rename this build performed —
 * old slug → the slug it became — and the site's `/saint/:slug` route honours it
 * so an old address redirects rather than 404s. This checker did not consult it,
 * so a rename that the published site handles correctly still failed the build
 * here, and the apparent fix was to hand-edit the pointers in three proposal
 * files.
 *
 * That is worth resisting: the proposals are the extractor's record of what it
 * read, and the *name* in them is evidence. The slug is not — it is derived from
 * the name, and derived twice, in two files that nothing recomputes together.
 * Six figure slugs were shortened on 28 August 2026 and seven references here
 * went stale in the same commit; hand-editing them would have left the next
 * rename to find the eighth.
 *
 * So the pointer is resolved, not rewritten. `isNew` is still checked against the
 * resolved slug, because whether a figure already exists is a fact about the
 * graph, and `--reconcile` still exists for the case where the graph simply grew.
 */
const retired = new Map(Object.entries(kg.retiredSlugs ?? {}));
const resolveSlug = (slug) => {
  let s = slug;
  for (let hops = 0; hops < 8 && retired.has(s); hops += 1) s = retired.get(s);
  return s;
};
const knownOrders = new Set(kg.orders.map((o) => o.slug));

const seeds = existsSync(SEEDS) ? JSON.parse(readFileSync(SEEDS, 'utf8')) : {};
const existingEdges = new Set(
  (seeds.lineageRelations ?? []).map((r) => `${r.subjectSlug}|${r.relation}|${r.objectSlug}`),
);

// Shrine rows, keyed by the slug a `data/shrines.csv#<slug>` source refers to.
const rowsBySlug = new Map();
if (existsSync(SHRINES_JSON)) {
  const { rows = [] } = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
  for (const row of rows) rowsBySlug.set(slugify(row.Name), row);
}

/** Resolve a `source` string to the text a quote must appear in. */
function sourceText(source) {
  if (source.startsWith('data/shrines.csv#')) {
    const slug = source.slice('data/shrines.csv#'.length).trim();
    const row = rowsBySlug.get(slug);
    if (!row) return { ok: false, why: `no shrine row with slug "${slug}"` };
    // A quote may come from any cell of the row, not only Description — the
    // silsila and figure_type cells are quoted too.
    return { ok: true, text: Object.values(row).join('\n') };
  }
  const path = join(ROOT, source.split('#')[0]);
  if (!existsSync(path)) return { ok: false, why: `file not found: ${source}` };
  return { ok: true, text: readFileSync(path, 'utf8') };
}

const sourceCache = new Map();
function textFor(source) {
  if (!sourceCache.has(source)) sourceCache.set(source, sourceText(source));
  return sourceCache.get(source);
}

function checkQuote(label, source, quote, maxLength = MAX_QUOTE) {
  if (typeof quote !== 'string' || !quote.trim()) {
    fail(`${label}: missing quote`);
    return;
  }
  if (quote.length > maxLength) {
    fail(`${label}: quote is ${quote.length} chars (max ${maxLength})`);
  }
  const resolved = textFor(source);
  if (!resolved.ok) {
    fail(`${label}: ${resolved.why}`);
    return;
  }
  if (!norm(resolved.text).includes(norm(quote))) {
    fail(`${label}: quote is NOT a substring of ${source} — "${quote.slice(0, 70)}…"`);
  }
}

// ── lineage proposals ────────────────────────────────────────────────────────

let lineageCount = 0;
let lineageDoc = null;
if (existsSync(LINEAGE)) {
  const doc = JSON.parse(readFileSync(LINEAGE, 'utf8'));
  lineageDoc = doc;
  const seen = new Map();
  for (const [i, p] of (doc.proposals ?? []).entries()) {
    const label = `lineage[${i}] ${p.subjectSlug} ${p.relation} ${p.objectSlug}`;
    lineageCount++;

    if (!RELATIONS.has(p.relation)) fail(`${label}: relation "${p.relation}" not in vocabulary`);
    if (!CONFIDENCE_TIERS.has(p.confidence)) fail(`${label}: confidence ${p.confidence} off-tier`);
    if (p.subjectSlug === p.objectSlug) fail(`${label}: self-loop`);

    for (const side of ['subject', 'object']) {
      const slug = p[`${side}Slug`];
      const isNew = p[`${side}IsNew`];
      if (!slug) {
        fail(`${label}: missing ${side}Slug`);
        continue;
      }
      const exists = knownSaints.has(resolveSlug(slug));
      if (isNew === exists) {
        if (RECONCILE) {
          p[`${side}IsNew`] = !exists;
          reconciled.push(`lineage[${i}].${side}IsNew: ${isNew} → ${!exists} (${slug})`);
        } else if (isNew) {
          fail(
            `${label}: ${side} marked new but "${slug}" already exists in the graph ` +
              `— rerun with --reconcile if the graph simply grew`,
          );
        } else {
          fail(`${label}: ${side} "${slug}" not in the graph and not marked new`);
        }
      }
    }

    const key = `${p.subjectSlug}|${p.relation}|${p.objectSlug}`;
    if (existingEdges.has(key)) fail(`${label}: duplicates an edge already in kg-seeds.json`);
    if (seen.has(key)) fail(`${label}: duplicates proposal ${seen.get(key)}`);
    seen.set(key, i);

    // Mutual assertion: A disciple_of B *and* B disciple_of A cannot both hold.
    const mirror = `${p.objectSlug}|${p.relation}|${p.subjectSlug}`;
    if (seen.has(mirror)) {
      fail(`${label}: contradicts proposal ${seen.get(mirror)} — relation asserted both ways`);
    }

    checkQuote(label, p.source, p.quote);
  }
  notes.push(`lineage: ${lineageCount} proposal(s)`);
} else {
  notes.push('lineage: no proposals file');
}

// ── order proposals ──────────────────────────────────────────────────────────

let orderCount = 0;
let orderDoc = null;
if (existsSync(ORDERS)) {
  const doc = JSON.parse(readFileSync(ORDERS, 'utf8'));
  orderDoc = doc;
  for (const [i, p] of (doc.proposals ?? []).entries()) {
    const label = `order[${i}] ${p.saintSlug} → ${p.parentOrder ?? p.parentOrders ?? 'null'}`;
    orderCount++;

    if (!CONFIDENCE_TIERS.has(p.confidence)) fail(`${label}: confidence ${p.confidence} off-tier`);
    const saintExists = knownSaints.has(resolveSlug(p.saintSlug));
    if (Boolean(p.saintIsNew) === saintExists) {
      if (RECONCILE) {
        p.saintIsNew = !saintExists;
        reconciled.push(`order[${i}].saintIsNew: ${!p.saintIsNew} → ${p.saintIsNew} (${p.saintSlug})`);
      } else if (p.saintIsNew) {
        fail(
          `${label}: saint marked new but "${p.saintSlug}" already exists ` +
            `— rerun with --reconcile if the graph simply grew`,
        );
      } else {
        fail(`${label}: saint "${p.saintSlug}" not in the graph and not marked new`);
      }
    }

    for (const slug of [p.parentOrder, ...(p.parentOrders ?? [])].filter(Boolean)) {
      if (!knownOrders.has(slug)) fail(`${label}: "${slug}" is not a known order slug`);
    }

    // asRecorded must be the sheet cell verbatim — this is the RULE 3 guard.
    // A proposal is free to interpret the cell; it is not free to restate it.
    if (p.asRecorded && p.source?.startsWith('data/shrines.csv#')) {
      const slug = p.source.slice('data/shrines.csv#'.length).trim();
      const row = rowsBySlug.get(slug);
      if (row) {
        const cell = String(row.silsila ?? '').trim();
        if (cell && norm(cell) !== norm(p.asRecorded)) {
          fail(`${label}: asRecorded "${p.asRecorded}" != silsila cell "${cell}"`);
        }
      }
    }

    // A cell the extractor itself calls prose must never carry a taxonomy node.
    if (p.isProseNotValue && (p.parentOrder || (p.parentOrders ?? []).length)) {
      fail(`${label}: isProseNotValue but a parent order was assigned anyway`);
    }

    checkQuote(label, p.source, p.quote);
  }
  notes.push(`orders: ${orderCount} proposal(s)`);
} else {
  notes.push('orders: no proposals file');
}

// ── date proposals ───────────────────────────────────────────────────────────

const YEAR = /\b\d{3,4}\b/g;

let dateCount = 0;
let dateDoc = null;
if (existsSync(DATES)) {
  const doc = JSON.parse(readFileSync(DATES, 'utf8'));
  dateDoc = doc;
  const mismatched = new Set((doc.subjectMismatch ?? []).map((m) => m.shrineSlug));
  for (const [i, p] of (doc.proposals ?? []).entries()) {
    const label = `dates[${i}] ${p.saintSlug}`;
    dateCount++;

    if (!CONFIDENCE_TIERS.has(p.confidence)) fail(`${label}: confidence ${p.confidence} off-tier`);

    const saintExists = knownSaints.has(resolveSlug(p.saintSlug));
    if (Boolean(p.saintIsNew) === saintExists) {
      if (RECONCILE) {
        p.saintIsNew = !saintExists;
        reconciled.push(`dates[${i}].saintIsNew: ${!p.saintIsNew} → ${p.saintIsNew} (${p.saintSlug})`);
      } else if (p.saintIsNew) {
        fail(`${label}: saint marked new but "${p.saintSlug}" already exists — rerun with --reconcile`);
      } else {
        fail(`${label}: saint "${p.saintSlug}" not in the graph and not marked new`);
      }
    }

    /* A date must land on somebody, and unlike a kin or lineage proposal it
       cannot mint the somebody. `build-kg.mjs` does `const saint =
       saintMap.get(resolveSaintSlug(p.saintSlug)); if (!saint) continue;` — a
       proposal whose slug resolves to no figure is **silently dropped**, with no
       node created and no warning logged.
       
       That is the right behaviour (a birth year is not a reason for a page) and
       it needs a gate, because `saintIsNew: true` makes a dangling slug legal to
       the check above: the slug resolves to nothing, so "not a known saint" is
       true and the proposal passes while doing nothing at all.

       Found on 30 August 2026 with three of them — `wasif-ali-wasif`,
       `tahir-bandagi-qadri`, `khawaja-feroz-ud-din-gharib-nawaz`, all short forms
       of slugs that exist in longer shapes. Harmless in that instance because the
       sheet already carried every one of those dates, which is exactly why
       nobody had noticed: a dead proposal and an applied one look identical from
       outside. */
    if (!allSaintSlugs.has(resolveSlug(p.saintSlug))) {
      fail(
        `${label}: "${p.saintSlug}" resolves to no figure in the graph, so build-kg drops this ` +
          `proposal silently. A date cannot create the person it belongs to.`,
      );
    }

    checkQuote(label, p.source, p.quote);

    /* Every year asserted must appear literally in the source. A verbatim quote
       proves the sentence exists; it does not prove the year copied out beside
       it is the year the sentence contains. */
    const resolved = textFor(p.source);
    if (resolved.ok) {
      const haystack = norm(resolved.text);
      for (const field of ['born', 'died', 'floruit']) {
        const value = p[field];
        if (typeof value !== 'string') continue;
        for (const year of value.match(YEAR) ?? []) {
          if (!haystack.includes(year)) {
            fail(`${label}: ${field} asserts year ${year}, which does not occur in ${p.source}`);
          }
        }
      }
    }

    /* A row whose prose is about someone other than its recorded figure is the
       allo-mahar failure mode, so dates coming out of one need a reason in
       writing. Note a mismatch contaminates a *field*, not the whole row: at
       Mohra Sharif the successors' death dates are the contaminated ones while
       the founder's birth year is stated of him directly. So the rule is not
       "no dates from these rows" — which would throw away good values — but
       "say why this one is safe", which cannot be satisfied by accident. */
    if (p.shrineSlug && mismatched.has(p.shrineSlug) && (p.born || p.died)) {
      const justification = String(p.subjectMismatchJustification ?? '').trim();
      if (justification.length < 40) {
        fail(
          `${label}: shrine "${p.shrineSlug}" is in subjectMismatch — its prose is partly ` +
            `about a different person. Supplying born/died from it requires a written ` +
            `subjectMismatchJustification saying why this value is the recorded figure's.`,
        );
      }
    }

    // A value the extractor withheld must stay withheld: blockedFields is a
    // decision, and re-promoting one into born/died would silently undo it.
    for (const field of Object.keys(p.blockedFields ?? {})) {
      if (p[field]) {
        fail(`${label}: "${field}" is in blockedFields but also set as a live value`);
      }
      if (!String(p.blockedReason ?? '').trim()) {
        fail(`${label}: blockedFields present without a blockedReason`);
      }
    }
  }
  notes.push(`dates: ${dateCount} proposal(s)`);
} else {
  notes.push('dates: no proposals file');
}

/* ── explicit NON-relations ──────────────────────────────────────────────────
   "This looks like a lineage tie and is not." An Uwaisi saint who names no
   living guide, a court relationship that is not a *silsila*, a contemporary
   who was met but was not a teacher.

   These were unchecked until 30 August 2026, and two things changed that. The
   first is principle: a non-relation makes the same kind of claim about the
   corpus as a relation does — *the entry says this* — and RULE 4 does not care
   which direction the claim runs. The second is that they are now LOAD-BEARING.
   `scan-lineage-statements.mjs` matches these quotes to mark a sentence as read
   and ruled out, so a quote that has drifted from the corpus silently stops
   matching and the sentence returns to the unread pile, where somebody
   re-adjudicates a question that was already settled. That fails quietly, which
   is the kind this repo checks. */
let nonRelCount = 0;
for (const [i, n] of (lineageDoc?.explicitNonRelations ?? []).entries()) {
  const label = `explicitNonRelations[${i}] ${n.subjectName} ↛ ${n.objectName}`;
  nonRelCount += 1;
  if (!n.source) fail(`${label}: missing source`);
  else checkQuote(label, n.source, n.quote);
  if (!String(n.notes ?? '').trim()) {
    fail(`${label}: no notes — a non-relation is only useful if it says WHY`);
  }
}
if (nonRelCount) notes.push(`lineage: ${nonRelCount} explicit non-relation(s)`);

// ── kinship seeds ────────────────────────────────────────────────────────────
/* These are seeds, not proposals — a human decided each slug and each role
   label — but the prose beside them was copied out of the extraction pass, and
   "copied" is a claim a script can check. Everything mechanical about a kin edge
   is checked here for the same reason the lineage proposals are: the failure
   this project cannot afford is a plausible sentence about the wrong man. */
let kinCount = 0;
const kinSeen = new Set();
for (const [i, f] of (seeds.familyRelations ?? []).entries()) {
  const label = `familyRelations[${i}] ${f.subjectSlug} ${f.kinType} ${f.objectSlug}`;
  kinCount += 1;

  if (!KIN_TYPES.has(f.kinType)) {
    fail(`${label}: kinType "${f.kinType}" is outside the closed vocabulary`);
  } else {
    const roles = KIN_ROLES[f.kinType];
    if (!roles.elder.includes(f.elderRole)) {
      fail(`${label}: elderRole "${f.elderRole}" is not one of ${roles.elder.join(' | ')}`);
    }
    if (!roles.junior.includes(f.juniorRole)) {
      fail(`${label}: juniorRole "${f.juniorRole}" is not one of ${roles.junior.join(' | ')}`);
    }
  }

  const subjectSlug = resolveSlug(f.subjectSlug);
  const objectSlug = resolveSlug(f.objectSlug);
  if (subjectSlug === objectSlug) fail(`${label}: self-loop`);
  /* Against the whole saint list, not `knownSaints`: a kin edge is allowed to
     name someone with no shrine here — that is what the eight lineage-only
     nodes it introduced are — and the build creates them from the `IsNew`
     flags. What must not happen is a pointer at nobody. */
  const allSlugs = new Set(kg.saints.map((x) => x.slug));
  for (const [side, slug] of [
    ['subject', subjectSlug],
    ['object', objectSlug],
  ]) {
    if (!allSlugs.has(slug)) fail(`${label}: ${side}Slug "${slug}" is not a figure in the graph`);
  }
  /* `IsNew` means "this person has no site in the archive", the same assertion
     the lineage proposals' flag makes, and it is checked the same way. */
  for (const side of ['subject', 'object']) {
    const slug = resolveSlug(f[`${side}Slug`]);
    const declaredNew = f[`${side}IsNew`] === true;
    if (declaredNew && knownSaints.has(slug)) {
      fail(`${label}: ${side}IsNew is true but "${slug}" has a site in the archive`);
    }
  }

  const key = `${subjectSlug}|${f.kinType}|${objectSlug}`;
  if (kinSeen.has(key)) fail(`${label}: duplicates an earlier edge`);
  kinSeen.add(key);
  /* Both directions of the same tie would render the pair twice on both pages,
     once as elder and once as junior, and each row would contradict the other. */
  if (kinSeen.has(`${objectSlug}|${f.kinType}|${subjectSlug}`)) {
    fail(`${label}: the reverse of this edge is also asserted`);
  }

  if (!f.source) fail(`${label}: missing source`);
  else checkQuote(label, f.source, f.quote);
}
if (kinCount) notes.push(`kinship: ${kinCount} seed edge(s)`);

/* Kin sentences read and deliberately not made edges. Checked for the same
   reason `explicitNonRelations` is: the quote is load-bearing for
   `scan-kin-statements.mjs`, which uses it to mark a sentence read-and-ruled-out.
   A drifted quote stops matching, the sentence rejoins the unread pile, and
   somebody re-decides a settled question — silently. The `kind` field is free
   text on purpose (it says *why* in the reviewer's own words) but must exist,
   because a rejection with no reason is indistinguishable from an oversight. */
let kinRuledOutCount = 0;
for (const [i, n] of (seeds.kinAdjudicated ?? []).entries()) {
  const label = `kinAdjudicated[${i}] ${n.subjectName} ↛ ${n.objectName}`;
  kinRuledOutCount += 1;
  if (!n.source) fail(`${label}: missing source`);
  else checkQuote(label, n.source, n.quote);
  if (!String(n.kind ?? '').trim()) fail(`${label}: missing kind`);
  if (!String(n.notes ?? '').trim()) fail(`${label}: no notes — say why it is not an edge`);
}
if (kinRuledOutCount) notes.push(`kinship: ${kinRuledOutCount} read-and-ruled-out sentence(s)`);

/* The notes are the same claim without a second node, so they get the same
   quote check — a "recorded here so it is not lost" fact that turned out not to
   be in the source would be the worst kind of loss. */
let kinNoteCount = 0;
for (const [i, n] of (seeds.kinNotes ?? []).entries()) {
  const label = `kinNotes[${i}] ${n.saintSlug}`;
  kinNoteCount += 1;
  if (!kg.saints.some((x) => x.slug === resolveSlug(n.saintSlug))) {
    fail(`${label}: saintSlug is not a figure in the graph`);
  }
  if (!n.source) fail(`${label}: missing source`);
  else checkQuote(label, n.source, n.quote);
}
if (kinNoteCount) notes.push(`kinship: ${kinNoteCount} unnameable note(s)`);

// ── order prose ──────────────────────────────────────────────────────────────
/* The passages `/order/:slug` now leads with. They are quotations, and the only
   thing a quotation promises is that the source said it — so that is what is
   checked, on every build, against data/shrines.json.

   `checkQuote` already normalises whitespace on both sides, which is what makes
   a multi-paragraph passage stored on one line comparable to the Description it
   was sliced out of. */
let proseCount = 0;
const proseSeen = new Set();
const urduContent = existsSync(URDU_CONTENT)
  ? JSON.parse(readFileSync(URDU_CONTENT, 'utf8'))
  : null;
for (const [i, p] of (seeds.orderProse ?? []).entries()) {
  const label = `orderProse[${i}] ${p.orderSlug} ← ${p.shrineSlug}`;
  proseCount += 1;

  if (!knownOrders.has(p.orderSlug)) {
    fail(`${label}: "${p.orderSlug}" is not an order in the taxonomy`);
  }
  if (!p.source) {
    fail(`${label}: missing source`);
  } else {
    if (p.source !== `data/shrines.csv#${p.shrineSlug}`) {
      fail(`${label}: source and shrineSlug disagree — "${p.source}"`);
    }
    checkQuote(label, p.source, p.quote, MAX_PROSE);
  }
  if (!p.quoteUr) {
    fail(
      `${label}: no quoteUr. An order page in Urdu cannot lead with an English ` +
        `paragraph (i18n rule 7) — slice the passage out of the Urdu article too.`,
    );
  } else if (p.quoteUr.length > MAX_PROSE) {
    fail(`${label}: quoteUr is ${p.quoteUr.length} chars (max ${MAX_PROSE})`);
  } else if (!urduContent) {
    fail(`${label}: src/data/urdu-content.json missing — cannot verify quoteUr`);
  } else {
    const article = urduContent[p.shrineSlug]?.descriptionUr;
    if (!article) {
      fail(`${label}: no Urdu article for "${p.shrineSlug}"`);
    } else if (!norm(article).includes(norm(p.quoteUr))) {
      fail(
        `${label}: quoteUr is NOT a substring of the Urdu article for ` +
          `"${p.shrineSlug}" — "${p.quoteUr.slice(0, 50)}…"`,
      );
    }
    if (/[A-Za-z]{3,}/.test(p.quoteUr)) {
      fail(`${label}: quoteUr contains a Latin word run — it would leak into the Urdu view`);
    }
  }
  /* Two passages saying the same thing on one order page is a copy-paste, not a
     second source. Keyed on the order too, because one passage legitimately
     serves two orders — the Shamsabad paragraph places its figure in both the
     Qadiriyya and the qalandari tradition. */
  const key = `${p.orderSlug}|${norm(p.quote)}`;
  if (proseSeen.has(key)) fail(`${label}: repeats a passage already on this order`);
  proseSeen.add(key);
}
if (proseCount) notes.push(`order prose: ${proseCount} passage(s)`);

// ── report ───────────────────────────────────────────────────────────────────

for (const n of notes) console.log(`[verify-kg-proposals] ${n}`);

if (RECONCILE) {
  if (lineageDoc) writeFileSync(LINEAGE, `${JSON.stringify(lineageDoc, null, 1)}\n`);
  if (orderDoc) writeFileSync(ORDERS, `${JSON.stringify(orderDoc, null, 1)}\n`);
  if (dateDoc) writeFileSync(DATES, `${JSON.stringify(dateDoc, null, 1)}\n`);
  if (reconciled.length) {
    console.log(`[verify-kg-proposals] reconciled ${reconciled.length} derived isNew flag(s):`);
    reconciled.forEach((r) => console.log(`  · ${r}`));
  } else {
    console.log('[verify-kg-proposals] no isNew flags needed reconciling');
  }
}

if (failures.length) {
  console.error(`\n[verify-kg-proposals] ${failures.length} problem(s):`);
  failures.slice(0, 40).forEach((f) => console.error(`  ✗ ${f}`));
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  `[verify-kg-proposals] ✓ ${lineageCount + orderCount + dateCount} proposal(s) and ` +
    `${kinCount + kinNoteCount} kinship seed(s) and ${proseCount} order passage(s) — every quote verified ` +
    `against its source, vocabulary closed, no duplicate or mutually contradictory edges.`,
);
console.log(
  '[verify-kg-proposals]   This proves nothing is fabricated. It does NOT prove the readings ' +
    'are right — that is still a human review (RULE 2).',
);
