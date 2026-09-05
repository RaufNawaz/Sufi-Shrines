import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as maplibregl from 'maplibre-gl';
import '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  labelExpression,
  localizeStyle,
  maptilerStyleUrl,
  referencesName,
  type MapStyle,
} from '../../lib/map/localizeStyle';
import { warmDarkStyle } from '../../lib/map/warmDarkStyle';
import type { Lang } from '../../types/shrine';

/**
 * The MapTiler basemap, rendered from **vector** tiles.
 *
 * Raster was the problem. MapTiler's raster endpoint ignores `language`
 * entirely — `en`, `latin`, `local`, `ur` and no parameter all returned
 * byte-identical PNGs when measured — so the map rendered OpenStreetMap's
 * raw tagging: Latin for the places that happen to carry a `name:en`, Urdu
 * for the rest. No parameter on a raster URL could ever have fixed that.
 *
 * Vector tiles carry every `name:xx` variant, so the label language becomes a
 * client-side decision. `localizeStyle` rewrites the style's `text-field`
 * expressions per language; this component owns fetching the style, keeping
 * it in sync with the reader's language and theme, and failing over.
 *
 * The plugin draws a MapLibre canvas *underneath* the existing Leaflet panes,
 * so every marker, tour route and control keeps working unchanged — this
 * replaces the basemap, not the map.
 *
 * ## Two constraints that are easy to undo by accident
 *
 * **maplibre-gl is pinned to v5.** On 6.4.1 the basemap renders as a blank
 * background: the style, sprite and TileJSON all load, `transformRequest`
 * fires with correct `.pbf` URLs, the worker spawns and the render loop
 * runs — but not one tile request ever leaves the browser (verified over
 * CDP, which sees worker traffic that page-level listeners miss). Same
 * result in dev and in a production build, on SwiftShader and on a real M4
 * GPU via Metal, and with a plain style URL and no Leaflet involved at all.
 * v5.24.0 fetches its tiles and renders on the first try. Do not bump the
 * major without re-running that check.
 *
 * **No `attributionControl: false` on the layer options.** The plugin already
 * forces it off for the inner GL map; setting it here instead makes its
 * `getAttribution()` return nothing, which silently drops the MapTiler and
 * OpenStreetMap credits from Leaflet's attribution control. That is a
 * licensing requirement, not a cosmetic detail.
 */

// The Leaflet plugin reads maplibregl off the global rather than importing it.
(window as unknown as { maplibregl: typeof maplibregl }).maplibregl = maplibregl;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';

/** Built-in styles that serve vector tiles on this account. */
export const MAPTILER_VECTOR_STYLE = {
  light: 'streets-v2',
  dark: 'streets-v2-dark',
} as const;

interface Props {
  isDark: boolean;
  lang: Lang;
  /** Called when the style cannot be loaded, so the caller can fall back to a
   *  keyless raster basemap rather than showing an empty map. */
  onFailure: () => void;
}

interface GlLayer extends L.Layer {
  getMaplibreMap: () => maplibregl.Map;
}

/**
 * Destroy the GL map *after* the next paint, not inside React's commit.
 *
 * ## The measurement
 *
 * Navigating from the map to a shrine page cost a **323 ms long task and a
 * 333 ms frozen frame** at 4x CPU (performance council, 4 September 2026). A CPU
 * profile put 330 ms of self time in one frame — `maplibregl.Map#remove()` —
 * reached from this effect's cleanup through the plugin's `onRemove`, inside
 * React's commit phase. A counterfactual matrix separated the two halves:
 *
 * | navigation | longest task |
 * | --- | --- |
 * | map -> shrine | 340 ms |
 * | `/about` -> shrine (no map) | 63 ms |
 * | map -> `/settings` (no shrine page) | 267 ms |
 * | shrine -> shrine | 0 ms |
 *
 * So the freeze was never the shrine page arriving. It was **the map leaving** —
 * WebGL context loss, worker termination and painter teardown, all in the frame
 * that should have been painting the article the reader had just asked for.
 *
 * ## Why deferring is safe here
 *
 * On unmount React has already detached this component's DOM, so the canvas is
 * gone from the screen whether or not the GL map has been destroyed; the pane is
 * a detached node and the plugin's `removeChild` still succeeds against it. The
 * layer reference is captured in a local and `layerRef.current` cleared before
 * the handle is scheduled, so a remount that builds a new layer cannot have it
 * torn down by the previous one's pending destroy — and at most two GL contexts
 * are alive, for one frame, well inside every browser's limit.
 *
 * `requestAnimationFrame` then `setTimeout` is the after-paint idiom: the frame
 * callback runs before the paint, the timeout it schedules runs in a task after
 * it. A bare `setTimeout(0)` can still land in the same frame.
 */
function destroyAfterPaint(layer: GlLayer): void {
  const destroy = () => {
    try {
      layer.remove();
    } catch {
      /* The map was already torn down (a remount racing an unmount). Nothing
         to release, and throwing here would surface as an unhandled error in a
         path the reader has already navigated away from. */
    }
  };
  if (typeof requestAnimationFrame !== 'function') {
    destroy();
    return;
  }
  requestAnimationFrame(() => {
    setTimeout(destroy, 0);
  });
}

export function MapLibreBasemap({ isDark, lang, onFailure }: Props) {
  const map = useMap();
  const layerRef = useRef<GlLayer | null>(null);
  // Guards against a slow fetch resolving after the component has moved on.
  const generationRef = useRef(0);
  /* Read by the build effect, which must not re-run when the language changes
     (see relabelling below) but must still localize to whatever language is
     current at the moment its style fetch resolves. */
  const langRef = useRef<Lang>(lang);
  langRef.current = lang;

  useEffect(() => {
    if (!MAPTILER_KEY) {
      onFailure();
      return;
    }

    const generation = ++generationRef.current;
    let cancelled = false;
    const styleId = isDark ? MAPTILER_VECTOR_STYLE.dark : MAPTILER_VECTOR_STYLE.light;

    (async () => {
      let style: MapStyle;
      try {
        const response = await fetch(maptilerStyleUrl(styleId, MAPTILER_KEY));
        if (!response.ok) throw new Error(`style.json ${response.status}`);
        style = (await response.json()) as MapStyle;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[map] MapTiler style unavailable, falling back to raster:', error);
        }
        if (!cancelled) onFailure();
        return;
      }
      if (cancelled || generation !== generationRef.current) return;

      // Dark mode is lamp-light, not a cool UI dark; the built-in dark style
      // is navy and clashes with the warm page ground. See warmDarkStyle.
      const buildLang = langRef.current;
      const localized = isDark
        ? warmDarkStyle(localizeStyle(style, buildLang))
        : localizeStyle(style, buildLang);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the plugin augments L at runtime
      const layer = (L as any).maplibreGL({
        style: localized,
        // Stated once, explicitly. Left to the plugin, it concatenates the
        // attribution of every source in the style — and this style has two
        // (maptiler_planet and an attribution-only pseudo-source) carrying
        // the same credit, so the control renders it twice.
        attributionControl: { customAttribution: MAPTILER_ATTRIBUTION },
      }) as GlLayer;

      layer.addTo(map);
      layerRef.current = layer;
      // A DEV-only handle on the layer. Diagnosing a blank basemap means
      // asking the GL map whether its style and source actually loaded, and
      // there is no other way to reach it from a test harness.
      if (import.meta.env.DEV) {
        const w = window as unknown as { __glLayer?: unknown; __glErrors?: string[] };
        w.__glLayer = layer;
        w.__glErrors = [];
        layer.getMaplibreMap()?.on('error', (e: { error?: { message?: string } }) => {
          w.__glErrors!.push(String(e?.error?.message ?? e));
        });
      }

      // A style that fetches but cannot render (bad tiles, WebGL refused)
      // must degrade the same way a 403 does.
      layer.getMaplibreMap()?.on('error', (event: { error?: unknown }) => {
        if (import.meta.env.DEV) console.warn('[map] MapLibre error:', event?.error);
      });
    })();

    return () => {
      cancelled = true;
      const layer = layerRef.current;
      layerRef.current = null;
      if (layer) destroyAfterPaint(layer);
    };
    /* `lang` is deliberately not a dependency — see the relabelling effect. */
  }, [map, isDark, onFailure]);

  /**
   * A language change relabels the live map; it does not rebuild it.
   *
   * ## The measurement
   *
   * `lang` used to sit in the build effect's dependencies, so pressing the
   * language toggle destroyed the GL map and re-fetched everything: style.json,
   * tiles.json, the sprite sheet and its JSON, all six vector tiles and five
   * glyph ranges. Observed in 8 of 8 runs at +127 to +1064 ms after the press.
   * An A/B over 7 runs each, identical but for aborting `api.maptiler.com` so
   * the raster fallback stood in, isolated the cost (performance council,
   * 4 September 2026):
   *
   * | arm | blocked | non-image requests after the toggle |
   * | --- | --- | --- |
   * | rebuilding the vector basemap | 187 ms (183–218) | 27 |
   * | MapTiler aborted | 101 ms (81–140) | 6 |
   *
   * What the reader saw: the basemap blanked and redrew underneath the pins,
   * six hundred to a thousand milliseconds after a press whose only real effect
   * is the language of the label text.
   *
   * ## Why relabelling is enough
   *
   * The language decision is entirely `text-field`, and it is already expressed
   * as data — `localizeStyle` rewrites each symbol layer's `text-field` to a
   * `coalesce` chain over `name:xx` fields that the vector tiles already carry.
   * Nothing else in the style is language-dependent, so setting the new
   * expression on the layers that have one is the whole change. The tiles
   * already in memory are re-labelled from fields they already hold; only the
   * glyphs for a script not yet drawn are fetched, which is unavoidable and
   * correct.
   *
   * `referencesName` is reused rather than a list of layer ids being hardcoded:
   * it is the same predicate that decided which layers to rewrite in the first
   * place, and it recognises the `coalesce` expression it produced. A style
   * whose layers it does not recognise is left alone, which is the same
   * conservative failure this module already chose.
   */
  useEffect(() => {
    const glMap = layerRef.current?.getMaplibreMap();
    if (!glMap) return;

    const expression = labelExpression(lang);
    const relabel = () => {
      for (const layer of glMap.getStyle().layers ?? []) {
        if (layer.type !== 'symbol') continue;
        const textField = (layer as { layout?: Record<string, unknown> }).layout?.['text-field'];
        if (!referencesName(textField)) continue;
        glMap.setLayoutProperty(layer.id, 'text-field', expression);
      }
    };

    /* `setLayoutProperty` throws on a style that has not finished arriving, and
       it can be mid-flight here: this effect and the build effect race on the
       first render after a language change. Returning early would be wrong
       rather than merely cautious — a reader who switches to Urdu while the
       basemap is still loading would be left with an English map, which is
       exactly the half-translated view i18n rule 1 exists to prevent. So wait
       for the style instead of skipping. */
    if (glMap.isStyleLoaded()) {
      relabel();
      return;
    }
    glMap.once('styledata', relabel);
    return () => {
      glMap.off('styledata', relabel);
    };
  }, [lang]);

  return null;
}
