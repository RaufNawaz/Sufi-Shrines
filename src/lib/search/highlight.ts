/**
 * Showing a reader *why* a row matched.
 *
 * A result list that returns "Shrine of Baba Shah Chiragh" for the query
 * "chiragh" is doing the right thing and looks, to the reader, like it might not
 * be — the matched run is four words into a name that is mostly not the query.
 * Marking the run answers the question the list otherwise leaves open.
 *
 * **It marks only what is literally there.** The archive's search is MiniSearch
 * with prefix and fuzzy matching, so a row can match a query that does not
 * appear in its name at all — a fuzzy hit, a match on a location, a match on an
 * alternative name. Where that happens this returns no ranges and the name
 * renders unmarked, which is correct: a highlight is a claim about the text, and
 * inventing one to make the list look clever would be inventing content in the
 * one place a reader is checking the archive's work.
 *
 * Offsets come from a case-insensitive regex over the original string rather
 * than from lowercasing it first. Lowercasing can change a string's *length* in
 * some scripts, and every offset after it would then point one character wrong —
 * subtly, and only for certain names.
 */

/** Half-open [start, end) ranges into the original string, merged and ordered. */
export type HighlightRange = readonly [number, number];

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

/** Two characters, so a one-letter query does not stripe the whole list. */
const MIN_TOKEN = 2;

export function highlightRanges(text: string, query: string): HighlightRange[] {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN)
    .map((token) => token.replace(ESCAPE, '\\$&'));
  if (tokens.length === 0 || !text) return [];

  let pattern: RegExp;
  try {
    /* Longest first, so "shah jamal" marks the longer run where both could
       start at the same index. */
    pattern = new RegExp([...tokens].sort((a, b) => b.length - a.length).join('|'), 'giu');
  } catch {
    /* A query is user input and `u` mode rejects some inputs outright (a lone
       surrogate pasted from somewhere). No highlight is a fine answer; a thrown
       exception inside a render is not. */
    return [];
  }

  const found: [number, number][] = [];
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined || match[0].length === 0) continue;
    found.push([match.index, match.index + match[0].length]);
  }
  if (found.length === 0) return [];

  found.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [found[0]!];
  for (const [start, end] of found.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** The text split into alternating plain and matched segments, in order. */
export interface HighlightSegment {
  text: string;
  match: boolean;
}

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const ranges = highlightRanges(text, query);
  if (ranges.length === 0) return [{ text, match: false }];
  const out: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) out.push({ text: text.slice(cursor, start), match: false });
    out.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), match: false });
  return out;
}
