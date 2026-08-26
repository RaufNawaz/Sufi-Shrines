/**
 * Matching figures and orders by the strings a person would actually type.
 *
 * The shrine index is a MiniSearch worker over full entries — description,
 * location, the saint's name — and it stays that. This is deliberately smaller:
 * 201 entities, names and aliases only, matched in the main thread from a 27 KB
 * file fetched the first time someone opens search. A worker for that would cost
 * more to start than the match costs to run.
 *
 * The ranking is four rules rather than a scoring model, because with two
 * hundred names a reader can tell whether the right one came first, and an
 * opaque score is not worth the sentence it would take to explain.
 */
export interface SearchEntity {
  type: 'figure' | 'order';
  slug: string;
  name: string;
  nameUr?: string;
  /** Alt-names and honorifics. "Data Ganj Bakhsh" is a title, not a name, and
   *  it is what most people know him by. */
  aka?: string[];
  /** The order a figure belongs to — context on the row, not a match target. */
  note?: string;
  /** A figure who exists only inside someone else's lineage: a real page, but
   *  not an entry of this archive. Marked so the row cannot imply otherwise. */
  lineageOnly?: boolean;
}

export interface EntityHit {
  entity: SearchEntity;
  /** Higher is better. Exposed so a caller can merge kinds and still sort. */
  score: number;
}

/**
 * Casefold, strip the marks, keep the letters of both scripts.
 *
 * NFD-and-drop-combining-marks drops the harakat from Urdu, which are optional
 * in writing and therefore never safe to match on.
 *
 * The second class is the one that is easy to miss. `ʿ` in "Muʿin al-Din" is
 * U+02BF MODIFIER LETTER LEFT HALF RING — a **letter**, not a mark, so
 * `\p{L}` keeps it and "muin" matched nothing. This archive's transliterations
 * are full of `ʿ` and `ʾ`, and nobody types them. They are **deleted** rather
 * than spaced, because "Muʿin" is one word: turning the ring into a space would
 * make it "mu in" and lose the match a second way.
 *
 * Everything else that is not a letter or a digit becomes a space, so
 * "Bakhsh, Data" and "Data-Ganj Bakhsh" reduce to the same words.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\p{M}\p{Lm}'’‘ʼʻ]/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Every string this entity can be found by, normalized once.
 *
 *  The Urdu name is indexed in both interfaces, not only the Urdu one: a reader
 *  in English may well paste a name they saw in an Urdu citation, and the shrine
 *  worker already makes that promise (`useSearch`). Two search surfaces that
 *  disagree about which scripts they accept is worse than either rule alone. */
function haystacks(entity: SearchEntity): string[] {
  const values = [entity.name, ...(entity.aka ?? [])];
  if (entity.nameUr) values.push(entity.nameUr);
  return values.map(normalizeForSearch).filter(Boolean);
}

/**
 * 4 — the whole string is the name.
 * 3 — the name starts with the query.
 * 2 — a word inside the name starts with the query.
 * 1 — the query appears anywhere in a name or alias.
 *
 * An alias match scores half a step below the same match on the canonical name,
 * so "Chishti" finds the order before it finds the eleven figures whose
 * honorifics contain it.
 */
function scoreOne(hay: string, query: string, isAlias: boolean): number {
  const penalty = isAlias ? 0.5 : 0;
  if (hay === query) return 4 - penalty;
  if (hay.startsWith(query)) return 3 - penalty;
  if (hay.split(' ').some((word) => word.startsWith(query))) return 2 - penalty;
  if (hay.includes(query)) return 1 - penalty;
  return 0;
}

export function matchEntities(
  entities: readonly SearchEntity[],
  rawQuery: string,
  limit = 8,
): EntityHit[] {
  const query = normalizeForSearch(rawQuery);
  if (!query) return [];

  const hits: EntityHit[] = [];
  for (const entity of entities) {
    const hays = haystacks(entity);
    let best = 0;
    for (let i = 0; i < hays.length; i++) {
      best = Math.max(best, scoreOne(hays[i], query, i > 0));
      if (best === 4) break;
    }
    if (best > 0) hits.push({ entity, score: best });
  }

  /* Sorted by score, then by name, never by index order: the index is written
     sorted by type and name, so ties resolved by position would put every
     figure ahead of every order for no reason a reader could see. */
  hits.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
  return hits.slice(0, limit);
}
