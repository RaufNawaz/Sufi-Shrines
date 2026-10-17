/**
 * Vite plugin: the Urdu article payload, one lazily-loaded chunk per entry.
 *
 * `src/data/urdu-content.json` holds every entry's Urdu article — 1,050 KB raw,
 * 262 KB gzipped — and an Urdu shrine page imported all of it to show one. On a
 * shared link, at 1.6 Mbps and 4x CPU, the article appeared at 9.7 s against
 * 5.9 s in English, the 262 KB contending with the sheet for the connection
 * (performance council, 17 October 2026). Data Darbar's own article is ~7 KB.
 *
 * Two virtual modules, built from that one file at build time, so nothing new
 * is committed and the file stays the single source of truth:
 *
 *   virtual:urdu-article-loaders  → { [slug]: () => import('virtual:urdu-article/<slug>') }
 *   virtual:urdu-article/<slug>   → export default <that entry's object>
 *
 * Rollup sees 170 static dynamic imports and emits 170 small chunks; the loader
 * table itself is a few KB and is fetched only when an article is asked for.
 * The whole-file import is untouched for the surfaces that need every article
 * (map preview, palette preview, tours).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOADERS = 'virtual:urdu-article-loaders';
const ARTICLE = 'virtual:urdu-article/';

export function urduArticlesPlugin(root) {
  const source = resolve(root, 'src/data/urdu-content.json');
  const read = () => JSON.parse(readFileSync(source, 'utf8'));
  return {
    name: 'urdu-articles-split',
    resolveId(id) {
      if (id === LOADERS || id.startsWith(ARTICLE)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (id === `\0${LOADERS}`) {
        this.addWatchFile(source);
        const slugs = Object.keys(read()).sort();
        const lines = slugs.map(
          (slug) => `  ${JSON.stringify(slug)}: () => import(${JSON.stringify(ARTICLE + slug)}),`,
        );
        return `export default {\n${lines.join('\n')}\n};\n`;
      }
      if (id.startsWith(`\0${ARTICLE}`)) {
        this.addWatchFile(source);
        const slug = id.slice(`\0${ARTICLE}`.length);
        const entry = read()[slug] ?? null;
        return `export default ${JSON.stringify(entry)};\n`;
      }
      return null;
    },
  };
}
