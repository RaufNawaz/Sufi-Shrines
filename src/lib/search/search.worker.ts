import MiniSearch from 'minisearch';

interface ShrineDoc {
  id: number;
  name: string;
  urduName: string;
  location: string;
  urduLocation: string;
  saint: string;
  urduSaint: string;
  category: string;
  urduCategory: string;
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

/**
 * The indexed fields, and the boost each carries — exported so the document
 * builder and this index cannot drift apart. `searchDocs.test.ts` asserts that
 * `buildSearchDocs` emits exactly `id` plus these keys, because the two halves
 * *had* drifted once: production built its documents from a second, inlined
 * copy of the builder (HANDOVER §9.146), and nothing could see the difference.
 * A field listed here and absent from a document is indexed as undefined; a
 * field on a document and missing here is simply never searched. Neither
 * throws.
 */
export const INDEX_FIELDS = [
  'name',
  'urduName',
  'location',
  'urduLocation',
  'saint',
  'urduSaint',
  'category',
  'urduCategory',
  'description',
] as const;

const BOOSTS: Record<(typeof INDEX_FIELDS)[number], number> = {
  name: 4,
  urduName: 4,
  location: 2,
  urduLocation: 2,
  saint: 2,
  urduSaint: 2,
  category: 1,
  urduCategory: 1,
  description: 1,
};

let ms: MiniSearch<ShrineDoc> | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    ms = new MiniSearch<ShrineDoc>({
      idField: 'id',
      /* Both scripts are indexed for every field, always — not one set or the
         other depending on the active language. A reader in the Urdu interface
         may well type a Latin name they saw in a citation, and a reader in the
         English one may paste Urdu. Indexing both costs one pass and removes
         the question. */
      fields: [...INDEX_FIELDS],
      storeFields: [],
      processTerm,
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: BOOSTS,
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
