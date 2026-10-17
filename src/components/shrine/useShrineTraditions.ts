import { useEffect, useState } from 'react';
import type { Tradition } from '../../lib/data/traditions';

/**
 * The traditions recorded for a site — plural: three of the eighteen sites
 * that have one have two. Fetched lazily.
 *
 * **Dynamic, and that is the whole reason this hook exists.** `/tradition/:slug`
 * imports `lib/data/traditions` statically — it is that route's subject — but
 * ten of 169 shrine pages want one line from the same file, and `ShrinePage`
 * had 3 KB of eager-JS budget headroom against `data/kg-traditions.json`'s
 * 13 KB. A static import here would have failed the build, and raising the
 * budget would have put a file about six traditions onto all 169 shrine pages
 * to serve ten of them. Vite gives both callers the same chunk, eager for the
 * route whose subject it is and lazy for the pages that merely mention it.
 *
 * Same shape as `SourceNotes`, which loads its table the same way for the same
 * reason. The row simply appears a beat after the rest of the infobox; there is
 * nothing to reserve space for, because 151 of 169 pages will never show one.
 */
export function useShrineTraditions(shrineSlug: string): Tradition[] {
  const [traditions, setTraditions] = useState<Tradition[]>([]);

  useEffect(() => {
    let cancelled = false;
    setTraditions([]);
    void import('../../lib/data/traditions').then((mod) => {
      if (cancelled) return;
      setTraditions(mod.getTraditionsForShrine(shrineSlug));
    });
    return () => {
      cancelled = true;
    };
  }, [shrineSlug]);

  return traditions;
}

/**
 * The traditions recorded for any of several sites, each once, in the order
 * first found. A figure's page asks this of the sites that commemorate the
 * figure; same dynamic import, for the same reason as above.
 */
export function useTraditionsForShrines(shrineSlugs: readonly string[]): Tradition[] {
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const key = shrineSlugs.join('|');

  useEffect(() => {
    let cancelled = false;
    setTraditions([]);
    const slugs = key.split('|').filter(Boolean);
    if (slugs.length === 0) return;
    void import('../../lib/data/traditions').then((mod) => {
      if (cancelled) return;
      const seen = new Map<string, Tradition>();
      for (const slug of slugs) {
        for (const tradition of mod.getTraditionsForShrine(slug)) {
          if (!seen.has(tradition.slug)) seen.set(tradition.slug, tradition);
        }
      }
      setTraditions([...seen.values()]);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return traditions;
}
