/**
 * Saints the archive's books document who have no site in Pakistan (Rauf, 10 October 2026:
 * "for saints … add them to the section which explores saints and orders"; team view until
 * reviewed). Built per book by `pipeline/book_queue/build_book_figures.py` into
 * `data/kg-book-figures-<slug>.json`, verbatim from the book's takeaways.
 *
 * Deliberately NOT part of `data/kg.json`. Those are KG nodes: they are counted, searched,
 * prerendered and listed in the sitemap, and an unreviewed transcription must not reach any of
 * that. These records are loaded on demand, only in the team view, as their own chunk, so the
 * public bundle does not grow by a byte.
 */

export interface BookFigureRecord {
  kind: 'entry' | 'named';
  slug: string;
  name: string;
  nameUr: string;
  died: string;
  entryNo: string;
  region: string;
  line: number;
  /** The takeaways line (or list item) itself, verbatim, with its markdown. */
  text: string;
  /** Set when the figure is one the graph already holds (checked by hand). */
  joinsSaint?: string;
  repeatOf?: number;
}

export interface BookFigure {
  slug: string;
  work: string;
  name: string;
  nameUr: string;
  died: string;
  region: string;
  joinsSaint?: string;
  /** Every place the book's notes name this figure, in file order. */
  records: BookFigureRecord[];
}

interface BookFigureFile {
  work: string;
  figures: BookFigureRecord[];
}

/** The work each file comes from, as the integration stage titles it. */
export const BOOK_FIGURE_WORKS: Record<string, { en: string; ur: string }> = {
  hadeeqat_ul_aulia: {
    en: 'Mufti Ghulam Sarwar Lahori, Hadiqat al-Awliya',
    ur: 'مفتی غلام سرور لاہوری، حدیقۃ الاولیاء',
  },
};

/**
 * The takeaways' region headings, in Urdu. Place names and the two descriptive headings only —
 * a heading not listed here comes back as recorded, declared Latin, never transliterated.
 * `bookFigures.test.ts` fails if a data file carries a region missing from this map.
 */
export const BOOK_FIGURE_REGIONS_UR: Record<string, string> = {
  Lahore: 'لاہور',
  Multan: 'ملتان',
  Uch: 'اوچ',
  Kashmir: 'کشمیر',
  Delhi: 'دہلی',
  'The Deccan': 'دکن',
  'Sirhind, Panipat, Thanesar, Kaithal and Gangoh': 'سرہند، پانی پت، تھانیسر، کیتھل اور گنگوہ',
  'The Hijaz, Arabia and the west': 'حجاز، عرب اور مغرب',
  'Place not stated': 'مقام درج نہیں',
};

/** One figure per slug and work. Repeats are kept as further records, never merged away. */
export function groupBookFigures(files: BookFigureFile[]): BookFigure[] {
  const out = new Map<string, BookFigure>();
  for (const file of files) {
    for (const r of file.figures) {
      const key = `${file.work}:${r.slug}`;
      const seen = out.get(key);
      if (seen) {
        seen.records.push(r);
        // the fuller record (a numbered entry) supplies what a passing mention lacks
        seen.nameUr ||= r.nameUr;
        seen.died ||= r.died;
        if (!seen.joinsSaint && r.joinsSaint) seen.joinsSaint = r.joinsSaint;
        continue;
      }
      out.set(key, {
        slug: r.slug,
        work: file.work,
        name: r.name,
        nameUr: r.nameUr,
        died: r.died,
        region: r.region,
        ...(r.joinsSaint ? { joinsSaint: r.joinsSaint } : {}),
        records: [r],
      });
    }
  }
  return [...out.values()];
}

export async function loadBookFigures(): Promise<BookFigure[]> {
  const modules = import.meta.glob<{ default: BookFigureFile }>(
    '../../data/kg-book-figures-*.json',
  );
  const files = await Promise.all(
    Object.values(modules).map((load) => load().then((m) => m.default)),
  );
  return groupBookFigures(files);
}
