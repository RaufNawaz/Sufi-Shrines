// @vitest-environment node
/**
 * Provenance the archive holds must be provenance the archive shows.
 *
 * Two directions are asserted here, and the second is the one that will
 * actually catch something:
 *
 * 1. The parser and the note builder behave — including the three figures who
 *    are both `lineageOnly` and biographically sourced, where returning one
 *    statement means dropping a true one.
 * 2. **Every `biographySource` in the shipped graph still resolves.** 95 of the
 *    97 point into the shrine dataset by filename, and the filename is
 *    hardcoded in `SHRINE_DATASET_FILES`. If the pipeline ever renames its
 *    export, those 95 stop being links and start being file paths printed at a
 *    reader — silently, because printing the raw reference is the deliberate
 *    fallback. This fails instead (RULE 4).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFigureSource, figureProvenance } from '../figureProvenance';
import { buildSlugs } from '../../../../scripts/data/lib/slugs.mjs';

describe('parsing a biographySource reference', () => {
  it('splits a dataset reference into file and entry slug', () => {
    const ref = parseFigureSource('data/shrines.csv#bari-imam');
    expect(ref).not.toBeNull();
    expect(ref?.file).toBe('data/shrines.csv');
    expect(ref?.fragment).toBe('bari-imam');
    expect(ref?.shrineSlug).toBe('bari-imam');
    expect(ref?.raw).toBe('data/shrines.csv#bari-imam');
  });

  it('refuses to read a fragment as an entry slug when the file is not the dataset', () => {
    /* Two figures cite a drafted entry. That is a real citable location with no
       route behind it, and inventing `/shrine/entry_shah_gohar_peer` would be a
       404 dressed as provenance. */
    const ref = parseFigureSource('entries/entry_shah_gohar_peer.md');
    expect(ref?.file).toBe('entries/entry_shah_gohar_peer.md');
    expect(ref?.fragment).toBeNull();
    expect(ref?.shrineSlug).toBeNull();
  });

  it('treats an empty fragment as no fragment', () => {
    expect(parseFigureSource('data/shrines.csv#')?.shrineSlug).toBeNull();
    expect(parseFigureSource('data/shrines.csv# ')?.shrineSlug).toBeNull();
  });

  it('returns null for nothing recorded', () => {
    expect(parseFigureSource(undefined)).toBeNull();
    expect(parseFigureSource('')).toBeNull();
    expect(parseFigureSource('   ')).toBeNull();
  });
});

describe('the notes a figure carries', () => {
  it('says nothing for a figure typed in from the survey', () => {
    /* 42 figures. Silence here is a claim: it means the value came from the
       archive's own record by hand, which is the best provenance it has. */
    expect(figureProvenance({ lineageOnly: undefined, biographySource: undefined })).toEqual([]);
  });

  it('flags an unreviewed machine-read biography, with its source', () => {
    const notes = figureProvenance({
      biographySource: 'data/shrines.csv#data-darbar',
      biographyReviewed: false,
    });
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe('biography');
    expect(notes[0].kind === 'biography' && notes[0].reviewed).toBe(false);
    expect(notes[0].kind === 'biography' && notes[0].source?.shrineSlug).toBe('data-darbar');
  });

  it('keeps the source once a person has read it, and drops only the flag', () => {
    /* Provenance is not a defect notice. A reviewed biography still came from
       somewhere and the reader is still owed the reference. */
    const notes = figureProvenance({
      biographySource: 'data/shrines.csv#data-darbar',
      biographyReviewed: true,
    });
    expect(notes.map((n) => n.kind)).toEqual(['biography']);
    expect(notes[0].kind === 'biography' && notes[0].reviewed).toBe(true);
  });

  it('flags a biography read without a recorded source', () => {
    /* The review flag, not the citation, is what says a value was machine-read.
       An unreviewed claim with no citation is the one most worth flagging. */
    const notes = figureProvenance({ biographyReviewed: false });
    expect(notes).toHaveLength(1);
    expect(notes[0].kind === 'biography' && notes[0].source).toBeNull();
  });

  it('says a lineage-only figure has no entry here', () => {
    const notes = figureProvenance({ lineageOnly: true, reviewed: false });
    expect(notes.map((n) => n.kind)).toEqual(['lineage-only']);
    expect(notes[0].kind === 'lineage-only' && notes[0].reviewed).toBe(false);
  });

  it('makes both statements about a figure that is both, scope first', () => {
    /* Shah Abul Muali Qadri: no site in the archive, and a full sourced
       biography read out of the archive's own entry for a darbar. Collapsing
       these into one classification has to discard one true sentence. */
    const notes = figureProvenance({
      lineageOnly: true,
      reviewed: false,
      biographySource: 'data/shrines.csv#darbar-abul-muali-qadri',
      biographyReviewed: false,
    });
    expect(notes.map((n) => n.kind)).toEqual(['lineage-only', 'biography']);
  });
});

describe('the shipped graph', () => {
  const ROOT = join(__dirname, '..', '..', '..', '..');
  const kg = JSON.parse(readFileSync(join(ROOT, 'data', 'kg.json'), 'utf8'));
  const dataset = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8'));
  const rows = Array.isArray(dataset) ? dataset : dataset.rows;
  const entrySlugs = new Set<string>(buildSlugs(rows) as string[]);

  const sourced = (kg.saints as Record<string, unknown>[]).filter((s) => s.biographySource);

  it('still has figures whose biography was machine-read', () => {
    // A floor, so the assertion below cannot pass by the field disappearing.
    expect(sourced.length).toBeGreaterThan(50);
  });

  it('resolves every dataset reference to an entry that exists', () => {
    const unresolved: string[] = [];
    for (const saint of sourced) {
      const ref = parseFigureSource(saint.biographySource as string);
      if (!ref) continue;
      if (ref.shrineSlug === null) {
        /* Only two shapes are known: a dataset reference with a slug, or a
           drafted entry file. A third shape means the pipeline started writing
           references this UI cannot present. */
        expect(ref.file, `${saint.slug as string} cites ${ref.raw}`).toMatch(/^entries\/.+\.md$/);
        continue;
      }
      if (!entrySlugs.has(ref.shrineSlug)) unresolved.push(`${saint.slug as string} → ${ref.raw}`);
    }
    expect(unresolved).toEqual([]);
  });

  it('has a note for every figure the pages would otherwise present unqualified', () => {
    const flagged = (kg.saints as Record<string, unknown>[]).filter(
      (s) => figureProvenance(s).length > 0,
    );
    /* 98 sourced biographies + 58 lineage-only nodes − 2 that are both. If this
       drops without the graph shrinking, a field stopped reaching the page.

       The total is 154, as it was before 28 August 2026, but every term in it
       changed that day and the arithmetic is the record of what happened:

         97 + 60 − 3   two figures were four nodes. `hazrat-wasif-ali-wasif` and
                       `shah-abul-muali-qadri` were lineage-only twins of
                       shrine-bearing nodes with identical display names, and
                       were joined to them (scripts/data/lib/saintIdentity.mjs).
                       Both counted as lineage-only and one was also sourced.
         97 + 58 − 2   = 153.
         98 + 58 − 2   then the three rows naming two figures stopped collapsing
                       to one, which gave Bhai Lalo a node — and the extractor
                       already held a sourced birth year for him that had
                       nowhere to land (`saintCompositeFigures` in
                       kg-seeds.json). Bhai Mardana gained a node too but the
                       archive records nothing sourced about him, so he adds to
                       neither term.
         99 + 58 − 2   = 155, later the same day. Tomb of Javindi Bibi stopped
                       being filed under Jalaluddin Surkh-Posh Bukhari, whose
                       cell it carried byte-identically
                       (`saintFigureByShrine` in kg-seeds.json). Bibi Jawindi is
                       a new node and the tomb's own entry is her
                       `biographySource` — prose that was already in the archive
                       and was attributed to a man it is not about. He does not
                       drop out of the count: his own shrine still sources him.
                       So this term rises by one and nothing falls.
        100 + 58 − 2  = 156, later still. Five figure cells that were a name plus
                       a description were shortened to the name proper
                       (`saintDescriptiveCells`), the survey's own sentence kept as
                       an altName rather than dropped. Four of the five carried
                       their provenance across unchanged. The extra term is Malik
                       Ahmad Ayaz, and it is not bookkeeping: his date proposal in
                       kg-saint-dates-proposals.json is keyed on the slug
                       `malik-ahmad-ayaz`, while the sheet node was
                       `malik-ahmad-ayaz-described-in-the-survey-as-slave-of-…`.
                       The two never met, so the proposal resolved to nothing and
                       was dropped on the floor every build. Shortening the slug
                       reconnected it, and he gained a biographySource and a date
                       precision the archive had held all along — the same shape
                       as Bhai Lalo's birth year, which had nowhere to land until
                       he had a node. Verified by diffing the node before and
                       after rather than inferred: an earlier draft of this
                       comment blamed a duplicate `bhai-gurdas` node, and no such
                       duplicate ever existed.
        156 + 8       = 164, 29 August 2026. The kinship pass gave nodes to eight
                       people the archive names only as somebody's father, uncle
                       or forebear — Sri Chand, the Qadiriyya's eponym, Baba Ji of
                       Eidgah Sharif and five more. Every one is `lineageOnly`
                       with no dates and no sources of its own, so every one is
                       flagged, and the term is exactly the number of nodes
                       created. That is the honest direction for this count to
                       move: the graph did not learn eight biographies, it learnt
                       eight names it must qualify.
        164 + 9       = 173, 30 August 2026. The second kinship pass, and the
                       same shape again: the archive names nine more people only
                       as somebody's father, son, brother or grandson — Ranjit
                       Singh's sons Kharak and Duleep and his grandson Nau Nihal,
                       Rukn-e-Alam's father Sadr-ud-Din Arif, Mian Mir's father
                       Qazi Sain Datta, Kaka Sahib's son Sheikh Abdul Haleem, Pir
                       Baba's son Syed Habibullah, Miran Hussain Zanjani's
                       brother Musa, and Vali Vilayat Rai's father Pratab Rai.
                       Every one is `lineageOnly` with no dates and no sources of
                       its own, so every one is flagged, and the term is again
                       exactly the number of nodes created.

                       Six of the fifteen new ties cost NO node, because both
                       ends were already figures — Kaka Sahib's own father
                       Bahadur Baba, Bebe Nanaki and Guru Nanak, Shah Kamal and
                       Shah Jamal, Shah Jamal's father, Guru Hargobind and Guru
                       Arjan Dev, Shah Ali Akbar's ancestor. That is worth
                       reading off this number: a kin pass is not priced in new
                       nodes, and the ties this graph was missing between figures
                       it already held were the ones nobody thought to look
                       for.
        173 + 1       = 174, 30 August 2026, later the same day. Guru Angad, the
                       second Sikh Guru — one of only two ties that
                       `scan-lineage-statements.mjs` found missing from the
                       lineage layer across 177 lineage sentences. That layer's
                       extraction pass had documented its own coverage ("all 169
                       rows were swept") and the claim held; the kin pass had
                       not, and did not. The difference between +9 above and +1
                       here is exactly the difference between a pass that wrote
                       down what it read and one that did not.
        174 + 18      = 192, 30 August 2026, the second kin batch. Parents, a
                       wife, a sister and two sons the corpus names and the
                       graph had no node for: Guru Nanak's Mehta Kalu and Mata
                       Tripta, Iqbal's father Sheikh Noor Muhammad and his son
                       Javid, Sultan Bahu's mother Bibi Rasti, Bhai Taru Singh's
                       sister Bibi Tar Kaur, Mauj Darya's wife Syedna Bibi
                       Fatima Sani, and ten more.

                       This batch came from reading the sentences that name
                       NOBODY the graph already held — the half of the kin scan
                       that the first pass skipped because a known figure on one
                       end is the easy signal. It is where the parents were, and
                       it is why the vocabulary gained `mother` and `spouse_of`:
                       nothing in the first 43 edges ran through a mother or a
                       marriage, so the role list read as fathers and nobody
                       noticed it could not say otherwise. */
    expect(flagged.length).toBe(192);
  });
});
