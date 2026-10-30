import React from 'react';

export interface PlaceArticleText {
  /** The public English article, markdown, bibliography included. */
  en: string;
  /** The public Urdu article, markdown, no bibliography. */
  ur?: string;
  /** The short article (Rauf, 30 October 2026), with the long one's section
      headings, present only when its own three verifier stamps passed. */
  short?: { en: string; ur?: string };
}

/* One JSON file per place, written by scripts/data/build-place-articles.mjs only
   for articles that passed all three verifiers. Each is its own lazy chunk, so a
   place page downloads its own article and nothing else, and the route's eager
   bundle carries none of them. */
const LOADERS = import.meta.glob<PlaceArticleText>('../../data/place-articles/*.json', {
  import: 'default',
});

function loaderFor(slug: string) {
  return LOADERS[`../../data/place-articles/${slug}.json`];
}

/** The article for one place, or null while loading and when there is none. */
export function usePlaceArticle(slug: string): PlaceArticleText | null {
  const [article, setArticle] = React.useState<PlaceArticleText | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setArticle(null);
    const load = loaderFor(slug);
    if (!load) return;
    void load().then((a) => {
      if (!cancelled) setArticle(a);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return article;
}
