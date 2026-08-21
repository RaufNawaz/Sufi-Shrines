import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  ZoomControl,
  LayersControl,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { Shrine } from '../../types/shrine';
import type { Tour } from '../../lib/tours/tours';
import { DEFAULT_CENTER, DEFAULT_ZOOM, SIDEBAR_WIDTH } from '../../lib/data/constants';
import { ShrineMarkers } from './ShrineMarkers';
import { TourRoute } from './TourRoute';
import { flyToOrSetView } from './mapMotion';
import { useTheme } from '../../lib/i18n/ThemeContext';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
/*
 * The vector basemap is loaded on demand.
 *
 * maplibre-gl is 1035 KB minified — by itself two-thirds of everything the map
 * route used to ship before a reader saw anything, and this archive's readers
 * are overwhelmingly on a phone on a mobile connection. Nothing in the primary
 * interaction needs it: the sidebar, the search, the filters, the era slider
 * and the markers are all Leaflet and React. Only the tiles under them are
 * maplibre's, so only the tiles wait.
 *
 * `check-bundle-budget.mjs` keeps it that way — vendor-maplibre is on the
 * MUST_STAY_LAZY list, so a stray top-level import fails the build rather than
 * quietly putting a megabyte back on the critical path.
 */
const MapLibreBasemap = React.lazy(() =>
  import('./MapLibreBasemap').then((m) => ({ default: m.MapLibreBasemap })),
);
import type { Lang } from '../../types/shrine';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

/** A Map Designer custom style used to be the default basemap, to get consistent
 * English place-name labels (Map Designer > Settings > Worldview > Language =
 * English) instead of OpenStreetMap's mixed Urdu/English tagging in Pakistan —
 * docs/planning/PROJECT_HEAD_FEEDBACK_PLAN.md item 1.
 *
 * That path is dead: MapTiler serves 403 for RASTER tiles of a custom style on
 * this account, from every origin including production, while the same style's
 * style.json and tiles.json return 200 — its tiles.json even advertises the very
 * raster URL that 403s. Measured 18 Aug 2026; see docs/FRONTEND_NOTES.md.
 *
 * The replacement was a built-in style plus `?language=en` on the raster URL.
 * That was also wrong, and stayed wrong in a way nobody could see from the
 * code: **MapTiler's raster endpoint ignores `language` entirely.** Measured
 * 18 Aug 2026 on streets-v2 at 12/2889/1667, `language=en`, `latin`, `local`,
 * `ur` and no parameter at all returned byte-identical PNGs (MD5 001057e5…).
 * The map was rendering OpenStreetMap's raw tagging the whole time — Latin
 * for places carrying a name:en, Urdu for the rest.
 *
 * The basemap is therefore **vector** now (MapLibreBasemap), where the label
 * language is a client-side decision over the name:xx fields the tiles
 * already carry. Raster survives only as the fallback path below.
 *
 * The custom style is still only used if VITE_MAPTILER_CUSTOM_STYLE_RASTER=1
 * explicitly opts in, and a tile error still falls back automatically. */
const MAPTILER_STYLE_ID = import.meta.env.VITE_MAPTILER_STYLE_ID;
const MAPTILER_CUSTOM_RASTER_ENABLED = import.meta.env.VITE_MAPTILER_CUSTOM_STYLE_RASTER === '1';

/** Built-in style used for the raster *fallback* path only. The default
 * basemap is vector (MapLibreBasemap) — see the note above. */
const MAPTILER_DEFAULT_STYLE = 'streets-v2';

const CARTO_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
const MAPTILER_ATTR =
  '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap contributors';

/** Raster tile URL. No `language` parameter: the endpoint ignores it (see the
 * measurement above), and sending it implied a localisation that never
 * happened. Label language is handled by the vector basemap instead. */
function maptilerRasterUrl(styleId: string, key: string): string {
  return `https://api.maptiler.com/maps/${styleId}/{z}/{x}/{y}.png?key=${key}`;
}

/** The MapTiler style the default light basemap should use: the custom style only
 * when explicitly opted into, otherwise the built-in one that actually serves
 * raster tiles. */
function defaultMaptilerStyleId(): string | undefined {
  if (MAPTILER_CUSTOM_RASTER_ENABLED && MAPTILER_STYLE_ID) return MAPTILER_STYLE_ID;
  return MAPTILER_DEFAULT_STYLE;
}

/** MapTiler's raster tiles are 512px (zoomOffset -1); CARTO's are 256px — recreate the
 * layer rather than `setUrl` when switching between them so tile size stays correct. */
function getDefaultLayerConfig(
  isDark: boolean,
  keyless = false,
): { url: string; options: L.TileLayerOptions; isMaptiler: boolean } {
  const styleId = defaultMaptilerStyleId();
  if (!keyless && !isDark && MAPTILER_KEY && styleId) {
    return {
      url: maptilerRasterUrl(styleId, MAPTILER_KEY),
      options: { tileSize: 512, zoomOffset: -1, maxZoom: 20, attribution: MAPTILER_ATTR },
      isMaptiler: true,
    };
  }
  return {
    url: isDark ? CARTO_DARK : CARTO_VOYAGER,
    options: { subdomains: 'abcd', maxZoom: 20, attribution: CARTO_ATTR },
    isMaptiler: false,
  };
}

interface Props {
  shrines: Shrine[];
  selectedId: number | null;
  onSelect: (shrine: Shrine | null) => void;
  sidebarOpen: boolean;
  isRTL: boolean;
  activeTour: Tour | null;
  activeTourStop: number;
}

/** How many failed MapTiler tiles before giving up on it for the session.
 * More than one because a single 404 at the edge of coverage is normal; a
 * rejected key / exhausted quota / unavailable style fails *every* tile. */
const MAPTILER_ERROR_BUDGET = 4;

interface TileState {
  layer: L.TileLayer | null;
  userPicked: boolean;
  url: string | null;
  /** Set once MapTiler has failed enough to be abandoned for this session, so a
   * dark/light toggle doesn't reinstate a basemap we already know is broken. */
  maptilerDead: boolean;
}

/**
 * The default basemap: vector when MapTiler is reachable, keyless raster
 * otherwise.
 *
 * `vectorFailed` latches for the session. A basemap that has already failed
 * should not be retried on every theme toggle, and the reader should not
 * watch the map flicker between two providers.
 */
function DefaultBasemap({ isDark, lang }: { isDark: boolean; lang: Lang }) {
  const [vectorFailed, setVectorFailed] = React.useState(false);
  const onFailure = React.useCallback(() => setVectorFailed(true), []);

  // `keyless` matters: if the vector basemap could not load, MapTiler itself
  // is unusable (bad key, quota, outage), so falling back to MapTiler *raster*
  // just fails a second time and leaves the reader with a blank map. Go
  // straight to the keyless provider.
  if (vectorFailed) return <ThemeAwareTileLayer isDark={isDark} keyless />;
  /* No fallback element: the map's own ground shows through for the moment the
     chunk is in flight. A placeholder raster layer would mean watching the
     basemap change under the markers, which is the flicker DefaultBasemap
     exists to avoid. */
  return (
    <React.Suspense fallback={null}>
      <MapLibreBasemap isDark={isDark} lang={lang} onFailure={onFailure} />
    </React.Suspense>
  );
}

// Manages the raster fallback tile layer and switches it when dark mode changes.
// Backs off (keeps current layer) once user manually picks from LayersControl.
function ThemeAwareTileLayer({ isDark, keyless = false }: { isDark: boolean; keyless?: boolean }) {
  const map = useMap();
  const stateRef = useRef<TileState>({
    layer: null,
    userPicked: false,
    url: null,
    maptilerDead: keyless,
  });

  // Build the managed layer, wiring up the MapTiler failure fallback.
  //
  // Why this exists: MapTiler answers a rejected key or an unavailable style with
  // a 403 whose body is a PNG reading "Invalid key — Get a valid key at
  // www.maptiler.com". Leaflet has no reason to treat that as special, so the map
  // silently tiles itself with that image (see docs/FRONTEND_NOTES.md). Falling
  // back on `tileerror` means a basemap outage degrades to a working keyless map
  // instead of wallpapering the country in an error message.
  const buildLayer = React.useCallback(
    (dark: boolean) => {
      const state = stateRef.current;
      const { url, options, isMaptiler } = getDefaultLayerConfig(dark, state.maptilerDead);
      state.url = url;
      const layer = L.tileLayer(url, options);

      if (isMaptiler) {
        let errors = 0;
        layer.on('tileerror', () => {
          if (state.userPicked || state.maptilerDead) return;
          errors += 1;
          if (errors < MAPTILER_ERROR_BUDGET) return;
          state.maptilerDead = true;
          if (import.meta.env.DEV) {
            console.warn(
              `[map] MapTiler returned errors for ${MAPTILER_ERROR_BUDGET} tiles — falling back ` +
                'to the keyless CARTO basemap. Check the key and whether the plan serves raster ' +
                'tiles for this style (docs/FRONTEND_NOTES.md).',
            );
          }
          const fallback = getDefaultLayerConfig(dark, true);
          state.url = fallback.url;
          state.layer?.remove();
          state.layer = L.tileLayer(fallback.url, fallback.options).addTo(map);
        });
      }

      state.layer = layer.addTo(map);
    },
    [map],
  );

  // Create the initial tile layer on mount
  useEffect(() => {
    const state = stateRef.current;
    buildLayer(isDark);

    const onBaseLayerChange = () => {
      // User picked a layer from LayersControl — stop managing the tile
      state.userPicked = true;
      state.layer?.remove();
      state.layer = null;
    };
    map.on('baselayerchange', onBaseLayerChange);

    return () => {
      map.off('baselayerchange', onBaseLayerChange);
      state.layer?.remove();
      state.layer = null;
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap layer when dark mode changes (only while we still own it). Recreated rather than
  // setUrl'd because the light-mode MapTiler layer and the CARTO layers use different tile
  // sizes/zoom offsets — setUrl alone would leave a mismatched layer.
  useEffect(() => {
    const state = stateRef.current;
    if (!state.layer || state.userPicked) return;
    const { url } = getDefaultLayerConfig(isDark, state.maptilerDead);
    if (url === state.url) return;
    state.layer.remove();
    buildLayer(isDark);
  }, [isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Deselects the active shrine when clicking empty map space.
function MapClickDeselect({ onSelect }: { onSelect: (s: Shrine | null) => void }) {
  useMapEvents({
    click: () => onSelect(null),
  });
  return null;
}

/*
 * Leaflet hardcodes `link.title = 'Layers'` on the layers-control toggle in
 * `_initLayout`, and react-leaflet exposes no prop for it — so on the Urdu map
 * the one control that opens the basemap picker announced itself in English.
 * Setting it after mount is imperative, but the alternative is patching
 * Leaflet's prototype, which is worse.
 */
function LayersControlTitle({ title }: { title: string }) {
  const map = useMap();
  useEffect(() => {
    const apply = () => {
      const toggle = map.getContainer().querySelector('.leaflet-control-layers-toggle');
      if (!toggle) return false;
      toggle.setAttribute('title', title);
      toggle.setAttribute('aria-label', title);
      return true;
    };
    // The control mounts as a sibling, so it may not exist on this tick.
    if (apply()) return;
    const id = window.requestAnimationFrame(() => apply());
    return () => window.cancelAnimationFrame(id);
  }, [map, title]);
  return null;
}

// Reset-view Leaflet control (bottom-right, above zoom)
function ResetViewControl({
  onSelect,
  title,
  label,
}: {
  onSelect: (s: Shrine | null) => void;
  title: string;
  label: string;
}) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/leaflet doesn't type Control.extend()
    const ResetCtrl = (L.Control as any).extend({
      options: { position: 'bottomright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', 'reset-view-btn', container);
        btn.href = '#';
        btn.title = title;
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', label);
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

        L.DomEvent.on(btn, 'click', (e: Event) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          onSelect(null);
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduced) {
            map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
          } else {
            map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.9 });
          }
        });

        return container;
      },
    });

    const ctrl = new ResetCtrl();
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map, onSelect, title, label]);

  return null;
}

// Handles invalidateSize and sidebar-aware flyTo
function MapController({
  shrines,
  selectedId,
  sidebarOpen,
  isRTL,
  tourActive,
}: {
  shrines: Shrine[];
  selectedId: number | null;
  sidebarOpen: boolean;
  isRTL: boolean;
  tourActive: boolean;
}) {
  const map = useMap();

  // Fix gray tiles on resize
  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  // flyTo on selection, offset so selected marker isn't hidden behind sidebar on desktop.
  // Skipped while a tour is active — TourRoute owns the camera then (fitBounds on
  // start, flyTo per stop), so this and TourRoute don't fight over the viewport.
  useEffect(() => {
    if (tourActive) return;
    if (selectedId === null) return;
    const shrine = shrines.find((s) => s.id === selectedId);
    if (!shrine) return;

    const targetZoom = Math.max(map.getZoom(), 13);
    const isDesktop = window.innerWidth > 768;

    let flyTarget: L.LatLng | L.LatLngTuple = [shrine.latLng.lat, shrine.latLng.lng];

    if (isDesktop && sidebarOpen) {
      // Offset the map center so the shrine appears in the visible map area (east of sidebar in LTR)
      const targetPt = map.project([shrine.latLng.lat, shrine.latLng.lng], targetZoom);
      const offsetPx = SIDEBAR_WIDTH / 2;
      // LTR: shift center west (subtract x) so shrine appears right-of-center (visible area)
      // RTL: shift center east (add x) because sidebar is on the right
      const adjustedPt = targetPt.add(L.point(isRTL ? offsetPx : -offsetPx, 0));
      flyTarget = map.unproject(adjustedPt, targetZoom);
    }

    flyToOrSetView(map, flyTarget, targetZoom);
  }, [selectedId, shrines, map, sidebarOpen, isRTL, tourActive]);

  return null;
}

export function ShrineMap({
  shrines,
  selectedId,
  onSelect,
  sidebarOpen,
  isRTL,
  activeTour,
  activeTourStop,
}: Props) {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const isDark = theme === 'dark';

  const tourStopSlugs = useMemo(
    () => (activeTour ? activeTour.stops.map((s) => s.shrineSlug) : null),
    [activeTour],
  );

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} zoomControl={false}>
      <DefaultBasemap isDark={isDark} lang={lang} />
      <MapController
        shrines={shrines}
        selectedId={selectedId}
        sidebarOpen={sidebarOpen}
        isRTL={isRTL}
        tourActive={activeTour !== null}
      />
      <ZoomControl
        position="bottomright"
        zoomInTitle={t('mapZoomIn')}
        zoomOutTitle={t('mapZoomOut')}
      />
      <ResetViewControl
        onSelect={onSelect}
        title={t('mapResetView')}
        label={t('mapResetViewLabel')}
      />
      <MapClickDeselect onSelect={onSelect} />

      <LayersControlTitle title={t('mapLayers')} />
      <LayersControl position="bottomleft">
        {/* English labels now come from the built-in style's `language` parameter.
            The custom Map Designer style is only offered when explicitly opted
            into, because MapTiler 403s its raster tiles on this account. */}
        {MAPTILER_KEY && (
          <LayersControl.BaseLayer
            name={tFn(lang, 'mapLayerFrom', t('mapLayerStreetsEnglish'), 'MapTiler')}
          >
            <TileLayer
              url={maptilerRasterUrl(
                defaultMaptilerStyleId() ?? MAPTILER_DEFAULT_STYLE,
                MAPTILER_KEY,
              )}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              attribution={MAPTILER_ATTR}
            />
          </LayersControl.BaseLayer>
        )}

        <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerVoyager'), 'CARTO')}>
          <TileLayer url={CARTO_VOYAGER} subdomains="abcd" maxZoom={20} attribution={CARTO_ATTR} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerDark'), 'CARTO')}>
          <TileLayer url={CARTO_DARK} subdomains="abcd" maxZoom={20} attribution={CARTO_ATTR} />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerStreets'), 'Esri')}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="Tiles &copy; Esri"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerSatellite'), 'Esri')}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerLight'), 'CARTO')}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            attribution={CARTO_ATTR}
          />
        </LayersControl.BaseLayer>

        {MAPTILER_KEY && (
          <LayersControl.BaseLayer
            name={tFn(lang, 'mapLayerFrom', t('mapLayerStreets'), 'MapTiler')}
          >
            <TileLayer
              url={maptilerRasterUrl('streets-v2', MAPTILER_KEY)}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap contributors'
            />
          </LayersControl.BaseLayer>
        )}

        {MAPTILER_KEY && (
          <LayersControl.BaseLayer name={tFn(lang, 'mapLayerFrom', t('mapLayerTopo'), 'MapTiler')}>
            <TileLayer
              url={maptilerRasterUrl('topo-v2', MAPTILER_KEY)}
              tileSize={512}
              zoomOffset={-1}
              maxZoom={20}
              attribution="&copy; MapTiler &copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>
        )}
      </LayersControl>

      <ShrineMarkers
        shrines={shrines}
        selectedId={selectedId}
        onSelect={onSelect}
        tourStopSlugs={tourStopSlugs}
      />

      {activeTour && (
        <TourRoute
          key={activeTour.id}
          tour={activeTour}
          stopIdx={activeTourStop}
          shrines={shrines}
          sidebarOpen={sidebarOpen}
          isRTL={isRTL}
        />
      )}
    </MapContainer>
  );
}
