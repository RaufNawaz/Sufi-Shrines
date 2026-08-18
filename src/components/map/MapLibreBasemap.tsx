import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as maplibregl from 'maplibre-gl';
import '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import { localizeStyle, maptilerStyleUrl, type MapStyle } from '../../lib/map/localizeStyle';
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
 */

// The Leaflet plugin reads maplibregl off the global rather than importing it.
(window as unknown as { maplibregl: typeof maplibregl }).maplibregl = maplibregl;

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

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

export function MapLibreBasemap({ isDark, lang, onFailure }: Props) {
  const map = useMap();
  const layerRef = useRef<GlLayer | null>(null);
  // Guards against a slow fetch resolving after the component has moved on.
  const generationRef = useRef(0);

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

      const localized = localizeStyle(style, lang);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the plugin augments L at runtime
      const layer = (L as any).maplibreGL({
        style: localized,
        // Leaflet already renders its own attribution control.
        attributionControl: false,
      }) as GlLayer;

      layer.addTo(map);
      layerRef.current = layer;

      // A style that fetches but cannot render (bad tiles, WebGL refused)
      // must degrade the same way a 403 does.
      layer.getMaplibreMap()?.on('error', (event: { error?: unknown }) => {
        if (import.meta.env.DEV) console.warn('[map] MapLibre error:', event?.error);
      });
    })();

    return () => {
      cancelled = true;
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [map, isDark, lang, onFailure]);

  return null;
}
