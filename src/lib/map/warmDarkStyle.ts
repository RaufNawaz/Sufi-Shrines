import type { MapStyle } from './localizeStyle';

/**
 * Recasting MapTiler's dark basemap to sit beside the archive's dark chrome.
 *
 * Until 12 September 2026 the page ground was a warm near-black (#171310,
 * "lamp-light") and this module rotated the basemap's cool hues to a brick
 * hue at up to 18% saturation to match. The ground is now near-neutral
 * (#151413 — see tokens.css), and the same retint at that strength read as a
 * brown map beside a grey page. The hue is kept (one step of warmth, like the
 * ground) and the saturation ceiling dropped to 6%, which is "not navy"
 * rather than "brick". `streets-v2-dark` itself still does not agree with
 * either ground: its background is `hsl(216, 37%, 24%)` and its landcover
 * fills sit at hue 198–217, a cool navy that reads as a different product
 * sitting next to the sidebar.
 *
 * The other built-in dark styles are no better for this: `basic-v2-dark` and
 * `dataviz-dark` are pure neutral grey (`hsl(0, 0%, 16–17%)`), which loses the
 * road hierarchy streets-v2-dark draws well without gaining any warmth.
 *
 * So the style is retinted rather than swapped: cool hues rotate to a warm
 * brick and lose most of their saturation, while lightness is left alone so
 * the style's own contrast hierarchy — which layer reads above which — is
 * preserved exactly.
 *
 * **Water keeps its blue.** It shares hue 217 with the land fills, so rotating
 * it too would make rivers and lakes vanish into the ground. Left cool, it
 * becomes the map's single cold accent against a warm field, which is how a
 * lamp-lit landscape actually reads.
 */

/** Hues treated as "cool" and rotated. */
const COOL_MIN = 180;
const COOL_MAX = 285;

/** The hue family of --color-bg in dark mode — a step warmer than neutral. */
const WARM_HUE = 26;
/** Cool casts are strong (37–56%); at 12 September 2026's near-neutral ground
 *  anything above a few percent of warmth reads as brown, so the retint keeps
 *  only enough to stop the map from being navy. */
const SATURATION_FACTOR = 0.12;
const SATURATION_CEILING = 6;

/** Layers whose colour must stay cool so water stays legible as water. */
const WATER_LAYER = /water|river|ocean|sea\b|lake|stream|canal|waterway|bathymetry/i;

const HSL = /hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)/g;

/** Rewrites the cool hsl() colours in one string. */
export function warmColorString(value: string): string {
  return value.replace(HSL, (whole, h, s, l) => {
    const hue = Number(h);
    if (hue < COOL_MIN || hue > COOL_MAX) return whole;
    const saturation = Math.min(Number(s) * SATURATION_FACTOR, SATURATION_CEILING);
    return `hsl(${WARM_HUE}, ${Math.round(saturation)}%, ${l}%)`;
  });
}

/** Applies `warmColorString` to every string anywhere inside a paint value,
 *  which may be a bare colour or an arbitrarily nested expression. */
function warmValue(value: unknown): unknown {
  if (typeof value === 'string') return warmColorString(value);
  if (Array.isArray(value)) return value.map(warmValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, warmValue(v)]));
  }
  return value;
}

/** Returns a copy of `style` with its cool cast rotated warm. */
export function warmDarkStyle(style: MapStyle): MapStyle {
  const layers = (style.layers ?? []).map((layer) => {
    const { paint } = layer;
    if (!paint || WATER_LAYER.test(layer.id)) return layer;
    return { ...layer, paint: warmValue(paint) as Record<string, unknown> };
  });
  return { ...style, layers };
}
