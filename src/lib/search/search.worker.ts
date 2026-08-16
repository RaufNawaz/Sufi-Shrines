import MiniSearch from 'minisearch';

interface ShrineDoc {
  id: number;
  name: string;
  urduName: string;
  location: string;
  saint: string;
  category: string;
  description: string;
}

type InMsg = { type: 'init'; docs: ShrineDoc[] } | { type: 'search'; query: string; reqId: number };

type OutMsg = { type: 'ready' } | { type: 'results'; ids: number[]; reqId: number };

// Arabic diacritics (harakat, U+064B-U+0652) and the superscript alef
// (U+0670) — carry no lexical distinction for search and would otherwise
// defeat prefix/fuzzy matching. Written as explicit code points because a
// literal range of combining marks is unreliable to type/read.
const HARAKAT_RE = /[ً-ْٰ]/g;
// Zero-width (non-)joiners (U+200C/U+200D) — invisible, but present in some source text.
const ZERO_WIDTH_RE = /[‌‍]/g;
// Arabic-keyboard letter variants folded to their Urdu-keyboard equivalents,
// so a name typed either way still matches (e.g. "علي" -> "علی").
const LETTER_FOLD: Record<string, string> = {
  ي: 'ی', // ي (Arabic yeh) -> ی (Urdu yeh)
  ك: 'ک', // ك (Arabic kaf) -> ک (Urdu kaf)
  ة: 'ہ', // ة (teh marbuta) -> ہ (Urdu heh)
  ه: 'ہ', // ه (Arabic heh) -> ہ (Urdu heh)
  أ: 'ا', // أ -> ا
  إ: 'ا', // إ -> ا
  آ: 'ا', // آ -> ا
  ئ: 'ی', // ئ -> ی
};
const LETTER_FOLD_RE = /[يكةهأإآئ]/g;

/** Applied at both index and search time (MiniSearch's single `processTerm`
 * config governs both) so a name indexed with one spelling variant still
 * matches a query typed with another. Exported for direct unit testing. */
export function processTerm(term: string): string {
  return term
    .replace(HARAKAT_RE, '')
    .replace(ZERO_WIDTH_RE, '')
    .replace(LETTER_FOLD_RE, (ch) => LETTER_FOLD[ch] ?? ch)
    .toLowerCase();
}

let ms: MiniSearch<ShrineDoc> | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    ms = new MiniSearch<ShrineDoc>({
      idField: 'id',
      fields: ['name', 'urduName', 'location', 'saint', 'category', 'description'],
      storeFields: [],
      processTerm,
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { name: 4, urduName: 4, location: 2, saint: 2, category: 1, description: 1 },
        combineWith: 'OR',
      },
    });
    ms.addAll(msg.docs);
    (self as unknown as Worker).postMessage({ type: 'ready' } satisfies OutMsg);
    return;
  }

  if (msg.type === 'search') {
    if (!ms) return;
    const results = msg.query.trim() ? ms.search(msg.query).map((r) => r.id as number) : [];
    (self as unknown as Worker).postMessage({
      type: 'results',
      ids: results,
      reqId: msg.reqId,
    } satisfies OutMsg);
  }
};
