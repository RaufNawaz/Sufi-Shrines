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

type InMsg =
  | { type: 'init'; docs: ShrineDoc[] }
  | { type: 'search'; query: string; reqId: number };

type OutMsg =
  | { type: 'ready' }
  | { type: 'results'; ids: number[]; reqId: number };

let ms: MiniSearch<ShrineDoc> | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'init') {
    ms = new MiniSearch<ShrineDoc>({
      idField: 'id',
      fields: ['name', 'urduName', 'location', 'saint', 'category', 'description'],
      storeFields: [],
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
    const results = msg.query.trim()
      ? ms.search(msg.query).map((r) => r.id as number)
      : [];
    (self as unknown as Worker).postMessage({ type: 'results', ids: results, reqId: msg.reqId } satisfies OutMsg);
  }
};
