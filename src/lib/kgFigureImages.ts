/**
 * Figure slug → a photograph of a site that commemorates them.
 *
 * **A figure has no picture of their own.** The archive holds photographs of
 * *places*, so what this returns is the site where the figure rests, and
 * `shrine` travels with the url so a caller can say which site it is rather than
 * letting the image imply the archive owns a portrait.
 *
 * A deliberate small sibling of `kg-shrine-figures.json`, for the same reason:
 * the knowledge-graph views can draw a picture without importing the 426 KB
 * graph, and the sheet's image columns never reach a route that does not draw
 * them.
 *
 * **Sparse, and callers must handle that.** 118 of 169 rows carry an `Image 1`,
 * so 101 of 191 figures have an entry and 90 do not. A figure without one gets
 * the plain circle the diagram has always drawn — not a placeholder, which would
 * read as an image still loading, and not a silhouette, which would read as a
 * missing portrait of a person rather than an unphotographed building.
 *
 * A url here means *the sheet records one*, never that it resolves: three of the
 * sheet's image urls were dead when `pipeline/check_image_liveness.py` last ran
 * (27 August 2026), and nothing on this path can tell. Render with an error
 * fallback.
 */
export interface FigureImage {
  /** The image url exactly as the sheet records it, unresized. */
  readonly url: string;
  /** The shrine slug the photograph is of. */
  readonly shrine: string;
  /**
   * The shrine's name as the sheet records it.
   *
   * Carried so a caption never has to reconstruct one from the slug:
   * `slugToLabel` title-cases every word and yields "Shrine Of Fariduddin
   * Ganjshakar", which is visibly machine-made in the one line whose job is to
   * say honestly what the picture shows.
   */
  readonly shrineName: string;
}

/*
 * On the wire the figure side stores only a POINTER to a shrine, and the whole
 * index is fetched on demand.
 *
 * Two savings, and the second is the one that matters. Every figure picture is a
 * picture of that figure's shrine, so holding the url on both sides duplicated
 * all 101 of them — 41 KB down to 26 KB by storing a slug and joining here.
 *
 * And 26 KB is still too much to import statically: it put SaintPage 22 KB and
 * GraphPage 7 KB over their bundle budgets, and it is 219 image urls that a
 * reader who never scrolls to the diagram never looks at. So it loads the way
 * `urduFallback` loads the Urdu dictionary, for the same reason and with the
 * same shape — a module-scope promise, at most one request, subscribers told
 * when it lands.
 *
 * Rendering before it arrives is not a defect here: a node without a picture is
 * a node with a plain disc, which is what 90 of 191 figures get permanently. The
 * circle is the same size either way, so nothing moves when the pictures appear.
 */
interface ImageIndex {
  figures: Record<string, string>;
  shrines: Record<string, { url: string; name: string }>;
}

let INDEX: ImageIndex | null = null;
let inflight: Promise<ImageIndex> | null = null;
const listeners = new Set<() => void>();

/** True once the index is in memory. */
export function figureImagesReady(): boolean {
  return INDEX !== null;
}

/** Fetch the index, at most once; concurrent callers share one request. */
export function loadFigureImages(): Promise<ImageIndex> {
  if (INDEX) return Promise.resolve(INDEX);
  if (!inflight) {
    inflight = import('../../data/kg-figure-images.json')
      .then((module) => {
        INDEX = module.default as ImageIndex;
        listeners.forEach((fn) => fn());
        return INDEX;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Subscribe to the index arriving. Returns an unsubscribe. */
export function onFigureImagesLoaded(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The picture for a figure, or undefined when the archive has none — and also
 * undefined before the index has loaded. Callers re-render on arrival via
 * `useFigureImages`.
 *
 * What comes back is a photograph of a *place* — see the module comment. Callers
 * showing it beside a person's name must caption it with `shrineName`.
 */
export function figureImage(figureSlug: string): FigureImage | undefined {
  const shrine = INDEX?.figures[figureSlug];
  if (!shrine) return undefined;
  const picture = INDEX?.shrines[shrine];
  if (!picture) return undefined;
  return { url: picture.url, shrine, shrineName: picture.name };
}

/**
 * A shrine's own photograph, for the graph nodes that are places rather than
 * people. Kept separate from `figureImage` on purpose: a figure's node *borrows*
 * a picture of where they rest and needs a caption saying so, a shrine's node
 * simply has one and does not.
 */
export function shrineImage(shrineSlug: string): string | undefined {
  return INDEX?.shrines[shrineSlug]?.url;
}

/** Coverage, for reporting — not for deciding whether to render. */
export function imageCoverage(): { figures: number; shrines: number } {
  return {
    figures: Object.keys(INDEX?.figures ?? {}).length,
    shrines: Object.keys(INDEX?.shrines ?? {}).length,
  };
}
