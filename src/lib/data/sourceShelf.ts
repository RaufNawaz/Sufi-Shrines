import { SOURCE_WORKS } from './sourceWorks';
import readingLibrary from '../../data/reading-library.json';

/** A book page the reader can be sent to, by the names it can be found under. */
export interface ShelfTitle {
  slug: string;
  title: string;
  titleUr?: string;
  author?: string;
}

/**
 * Every `/source/:slug` page — the declared works, then the books read in full
 * that are not one of them — with only the fields a search needs. The same
 * order and merge `buildLibrary` uses for its shelf (a test holds the two
 * equal), without the citation index, so the archive search can find a book
 * without loading every citation in the archive (search council, 17 October
 * 2026: "Tazkirah" found nothing anywhere but /sources).
 */
export function shelfTitles(): ShelfTitle[] {
  const shelf = new Map<string, ShelfTitle>();
  for (const work of SOURCE_WORKS) {
    shelf.set(work.slug, {
      slug: work.slug,
      title: work.title,
      ...(work.titleUr ? { titleUr: work.titleUr } : {}),
      ...(work.author ? { author: work.author } : {}),
    });
  }
  const books = (
    readingLibrary as unknown as {
      books: { slug: string; workSlug?: string; title: string; author?: string }[];
    }
  ).books;
  for (const book of books) {
    const slug = book.workSlug ?? book.slug;
    if (shelf.has(slug)) continue;
    shelf.set(slug, {
      slug,
      title: book.title,
      ...(book.author ? { author: book.author } : {}),
    });
  }
  return [...shelf.values()];
}
