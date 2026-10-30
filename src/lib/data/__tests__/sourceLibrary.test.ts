// @vitest-environment node
/**
 * The library behind `/sources`: what kind each citation is, which works the
 * lines name, and the books read in full.
 *
 * Run over the shipped snapshot, through `buildShrines`, as `sourceIndex.test.ts`
 * does — a harness that reads raw rows has produced a false bug report here
 * before.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildShrines } from '../shrineModel';
import { sourceType, SOURCE_TYPE_ORDER } from '../sourceType';
import {
  buildLibrary,
  coCited,
  copySearchLinks,
  READING_LIBRARY,
  urlInCitation,
} from '../sourceLibrary';
import { SOURCE_WORKS } from '../sourceWorks';
import { isPlaceholderSource } from '../sourceKind';

const ROOT = join(__dirname, '..', '..', '..', '..');
const snapshot = JSON.parse(readFileSync(join(ROOT, 'src/data/shrines-fallback.json'), 'utf8'));
const shrines = buildShrines(snapshot.rows);
const library = buildLibrary(shrines);

describe('what kind of thing a citation points at', () => {
  it('reads the archive’s own shapes', () => {
    expect(
      sourceType('Iqbal Qaiser, *Historical Sikh Shrines in Pakistan* (Punjabi History Board, 1998), p. 56.'),
    ).toBe('book');
    expect(sourceType('Zulfiqar Ali Kalhoro, "Nanakpanthi Saints of Sindh," *The Friday Times*, 13 April 2018.')).toBe(
      'press',
    );
    expect(sourceType('Evacuee Trust Property Board (Pakistan), Functional Gurdwaras register.')).toBe('record');
    expect(sourceType('Wikipedia, "Darya Lal Mandir" (with cited sources).')).toBe('web');
    expect(
      sourceType('Shrines Project field survey, Darbar Malik Ahmad Ayaz (surveyor: Saifullah), 29 July 2026.'),
    ).toBe('field');
    expect(sourceType('The *Janamsakhi* traditions of Guru Nanak\'s childhood at Rai Bhoi di Talwandi.')).toBe(
      'tradition',
    );
    expect(sourceType('Studies of the cult of Jhulelal and water-veneration among Sindhi Hindus.')).toBe('general');
  });

  it('never calls a placeholder anything but general', () => {
    for (const source of library.sources) {
      if (isPlaceholderSource(source.name)) expect(source.type, source.name).toBe('general');
    }
  });

  it('does not read a newspaper’s italic name as a book title', () => {
    /* The trap measure-source-works.mjs documents: the italic run in a news
       citation is the publication, not the work. */
    for (const source of library.sources) {
      if (/\*(Dawn|The Express Tribune|The Friday Times|The News)\*/.test(source.name)) {
        expect(source.type, source.name).not.toBe('book');
      }
    }
  });

  it('files every declared work’s citations as books or articles', () => {
    /* Except a line the archive's own placeholder rule claims — "Alam Faqri,
       *Tazkirah*, and general histories of…" names a work and a literature at
       once, and the placeholder rule rightly wins. */
    for (const work of library.works) {
      for (const line of work.citations) {
        if (isPlaceholderSource(line.name)) continue;
        expect(['book', 'article', 'record', 'tradition'], line.name).toContain(line.type);
      }
    }
  });

  it('counts every line exactly once', () => {
    const total = SOURCE_TYPE_ORDER.reduce((n, t) => n + library.typeCounts[t], 0);
    expect(total).toBe(library.sources.length);
  });
});

describe('the reading library', () => {
  it('is the integrated half of the book queue, no more and no less', () => {
    const state = join(ROOT, 'pipeline/book_queue/state.json');
    /* The queue state is in the repository, but guard so a slim checkout fails
       on a clear message rather than ENOENT. */
    expect(existsSync(state), 'pipeline/book_queue/state.json').toBe(true);
    const books = JSON.parse(readFileSync(state, 'utf8')).books as Record<string, { status: string }>;
    const integrated = Object.entries(books)
      .filter(([, b]) => b.status === 'integrated')
      .map(([id]) => id)
      .sort();
    expect(READING_LIBRARY.map((b) => b.id).sort()).toEqual(integrated);
  });

  it('has unique slugs, none colliding with a declared work unless it says so', () => {
    const slugs = READING_LIBRARY.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const works = new Set(SOURCE_WORKS.map((w) => w.slug));
    for (const book of READING_LIBRARY) {
      if (works.has(book.slug)) expect(book.workSlug, book.slug).toBe(book.slug);
      if (book.workSlug) expect(works.has(book.workSlug), book.workSlug).toBe(true);
    }
  });

  it('carries an Urdu note and year wherever it carries an English one', () => {
    /* Prose may not be Latin in the Urdu view (i18n rule 7). */
    for (const book of READING_LIBRARY) {
      if (book.note) expect(book.noteUr, book.id).toBeTruthy();
      if (book.year) expect(book.yearUr, book.id).toBeTruthy();
      if (book.noteUr) expect(book.noteUr, book.id).not.toMatch(/[A-Za-z]/);
      if (book.yearUr) expect(book.yearUr, book.id).not.toMatch(/[A-Za-z0-9]/);
    }
  });

  it('matches only the citations it should', () => {
    /* Every hit, listed. A `match` that starts catching a line it should not is
       how one book silently absorbs another's entries; this fails first. When
       the pending patches are imported and these books start being cited, this
       list grows — read each new line before accepting it. */
    const hits: Record<string, number> = {};
    for (const work of library.works) {
      if (work.book && !work.book.workSlug && work.citations.length > 0) {
        hits[work.slug] = work.citations.length;
      }
    }
    /* 30 October 2026: the rewritten entries now cite the books read in full.
       Every line below was read against its citation text that day: each is the
       book itself, except Hadiqat's second, "Earlier works cited within the
       above: … *Hadiqat al-Auliya*", the one hit this list accepted before. */
    expect(hits).toEqual({
      'a-white-trail': 4,
      'adventures-of-hir-and-ranjha': 3,
      'as-through-a-veil': 1,
      'bulleh-shah-a-selection': 1,
      'bullhe-shah-sufi-lyrics': 1,
      'chahar-maqala': 1,
      'embodying-charisma': 1,
      'essays-on-islam-and-indian-history': 1,
      'female-voice-in-sufi-ritual': 3,
      'hadiqat-al-awliya': 2,
      'hindu-sufis-of-south-asia': 2,
      'history-of-sufism-in-india-1': 4,
      'in-search-of-shiva': 1,
      'islamic-sufism-unbound': 1,
      'janamsakhis-ageless-stories': 2,
      'khulasat-al-tawarikh': 2,
      'pain-and-grace': 2,
      'queer-companions': 1,
      'risalo-of-shah-abdul-latif': 2,
      'shah-abdul-latif-of-bhit': 2,
      'sufi-martyrs-of-love': 1,
      'sufi-music-of-india-and-pakistan': 1,
      'sufis-and-saints-bodies': 1,
      'tahqiqat-e-chishti': 1,
      'tarikh-e-lahore': 2,
      'tazkirah-awliya-e-pak-o-hind': 1,
      'verses-of-a-lowly-fakir': 1,
      'walking-with-nanak': 1,
    });
  });
});

describe('the shelf', () => {
  it('counts the Tazkirah once, however it is written', () => {
    const tazkirah = library.works.find((w) => w.slug === 'tazkirah-awliya-e-pakistan')!;
    expect(tazkirah.citations.length).toBeGreaterThan(5);
    expect(new Set(tazkirah.entries.map((s) => s.slug)).size).toBe(tazkirah.entries.length);
    /* It led the shelf until 30 October 2026; the books read in full now
       attach to more entries, so its place is no longer asserted. */
  });

  it('puts a read book that is also a declared work on the shelf once', () => {
    expect(library.works.filter((w) => w.slug === 'hinglaj-devi')).toHaveLength(1);
    expect(library.works.find((w) => w.slug === 'hinglaj-devi')!.book).toBeTruthy();
  });

  it('suggests companions that are not the work itself and share its entries', () => {
    const work = library.works.find((w) => w.slug === 'historical-sikh-shrines-in-pakistan')!;
    const companions = coCited(work, library);
    expect(companions.length).toBeGreaterThan(0);
    for (const c of companions) {
      expect(c.work?.slug).not.toBe(work.slug);
      expect(c.shared).toBeGreaterThan(0);
      expect(c.shared).toBeLessThanOrEqual(work.entries.length);
      if (c.source) expect(['general', 'field']).not.toContain(c.source.type);
    }
  });
});

describe('links out', () => {
  it('finds the URL inside a citation without its trailing punctuation', () => {
    expect(
      urlInCitation('"Gori Temple," Heritage of Sindh, https://heritage.eftsindh.com/districts/tharparkar/gori-temple.php.'),
    ).toBe('https://heritage.eftsindh.com/districts/tharparkar/gori-temple.php');
    expect(urlInCitation('Khushwant Singh, *A History of the Sikhs*.')).toBeNull();
  });

  it('searches by short title and surname', () => {
    const [worldcat] = copySearchLinks({
      title: 'Hinglaj Devi: Identity, Change, and Solidification',
      author: 'Jürgen Schaflechner',
    });
    expect(decodeURIComponent(worldcat!.url)).toContain('q=Hinglaj Devi Schaflechner');
    const [poet] = copySearchLinks({
      title: 'Sufi Lyrics',
      author: 'Bullhe Shah; Christopher Shackle (tr.)',
    });
    expect(decodeURIComponent(poet!.url)).toContain('q=Sufi Lyrics Shah');
  });
});
