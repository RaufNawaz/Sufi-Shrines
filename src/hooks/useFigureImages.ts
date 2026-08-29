import { useEffect, useState } from 'react';
import { figureImagesReady, loadFigureImages, onFigureImagesLoaded } from '../lib/kgFigureImages';

/**
 * Loads the graph's picture index and re-renders once it lands.
 *
 * The index is fetched on demand rather than imported, because 26 KB of image
 * urls on SaintPage and GraphPage broke both routes' bundle budgets and a reader
 * who never scrolls to the diagram never looks at any of them.
 *
 * The first render therefore draws every node as a plain disc, which is exactly
 * what 90 of 191 figures get permanently — so the intermediate state is a state
 * the design already has, and the circle is the same size either way, so nothing
 * moves when the pictures arrive.
 *
 * Returns nothing: callers read the index through `figureImage`/`shrineImage`
 * and this hook exists only to make React look again.
 */
export function useFigureImages(): void {
  const [, bump] = useState(0);

  useEffect(() => {
    let alive = true;
    const rerender = () => {
      if (alive) bump((n) => n + 1);
    };
    const unsubscribe = onFigureImagesLoaded(rerender);
    void loadFigureImages().then(() => {
      // Already loaded before this component mounted: no event will fire.
      if (figureImagesReady()) rerender();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
}
