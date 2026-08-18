import type { Lang } from '../../types/shrine';

/**
 * Rewriting a MapTiler vector style so place labels render in one script.
 *
 * ## Why this is necessary at all
 *
 * MapTiler's **raster** tiles ignore the `language` parameter. Measured
 * 18 August 2026 against `streets-v2` at 12/2889/1667: `language=en`,
 * `latin`, `local`, `ur` and no parameter at all returned byte-identical
 * PNGs (MD5 `001057e5…`). The standing note that the built-in styles "take a
 * `language` parameter that produces the same English labels" is true of the
 * vector style and false of the rasterised output, which is what Leaflet was
 * loading. That is why the map showed Sheikhupura in Latin and every
 * surrounding village in Urdu — nothing was localising anything; the mixture
 * was OpenStreetMap's own tagging showing through.
 *
 * The style JSON tells the same story: of its label layers, **12 use a bare
 * `"{name}"`** — the local name, whatever script that happens to be — and
 * only 7 use `name:en` with a fallback.
 *
 * ## What this does
 *
 * Vector tiles carry the alternatives (`name:latin` and `name:nonlatin` are
 * both present in MapTiler's planet tiles, along with ~50 `name:xx` fields),
 * so the fix is to rewrite every symbol layer's `text-field` to a preference
 * chain and let MapLibre pick per feature.
 *
 * English readers get `name:en` where OSM has it and the transliterated
 * `name:latin` everywhere else, so the map is Latin throughout. Urdu readers
 * get `name:ur`, then the local name — which in Pakistan is usually already
 * Urdu — so the Urdu view stops being an English map with Urdu chrome. That
 * second half is the mission ("equally excellent in both languages") applied
 * to the basemap, and it comes free with the same mechanism.
 *
 * `name` stays as the last resort in both chains: a place with no localised
 * tag should render under the name it has, never as an empty label.
 */

/** Fields tried in order, per language. */
const LABEL_PREFERENCE: Record<Lang, string[]> = {
  en: ['name:en', 'name:latin', 'name'],
  ur: ['name:ur', 'name', 'name:latin'],
};

/** A MapLibre `coalesce` expression over the preference chain. */
export function labelExpression(lang: Lang): unknown[] {
  return ['coalesce', ...LABEL_PREFERENCE[lang].map((field) => ['get', field])];
}

/** Minimal shape of the bits of a style spec this module touches. */
interface StyleLayer {
  id: string;
  type?: string;
  layout?: Record<string, unknown>;
}
export interface MapStyle {
  layers?: StyleLayer[];
  [key: string]: unknown;
}

/**
 * Returns a copy of `style` whose symbol layers label in `lang`.
 *
 * Layers whose `text-field` is not a name lookup are left exactly as they
 * are. That matters: `{ref}` is a road shield ("M-2"), `{housenumber}` is a
 * house number, `{iata}` is an airport code. Rewriting those to a name would
 * replace the motorway shields with words.
 */
export function localizeStyle(style: MapStyle, lang: Lang): MapStyle {
  const expression = labelExpression(lang);

  const layers = (style.layers ?? []).map((layer) => {
    const textField = layer.layout?.['text-field'];
    if (textField === undefined || !referencesName(textField)) return layer;
    return {
      ...layer,
      layout: { ...layer.layout, 'text-field': expression },
    };
  });

  return { ...style, layers };
}

/**
 * True when a `text-field` resolves a place *name* — as a `{name}` /
 * `{name:en}` template, or as a `["get", "name…"]` inside any expression.
 *
 * Deliberately conservative. Anything it cannot recognise is left untouched,
 * so an unfamiliar style degrades to today's behaviour rather than to a map
 * with missing or wrong labels.
 */
export function referencesName(textField: unknown): boolean {
  if (typeof textField === 'string') return /\{name(:[\w-]+)?\}/.test(textField);
  if (Array.isArray(textField)) {
    if (textField[0] === 'get' && typeof textField[1] === 'string') {
      return textField[1] === 'name' || textField[1].startsWith('name:');
    }
    return textField.some((part) => referencesName(part));
  }
  if (textField && typeof textField === 'object') {
    // Legacy zoom-stop functions: { stops: [[8, " "], [12, "{name:en}"]] }.
    const stops = (textField as { stops?: unknown }).stops;
    if (Array.isArray(stops)) {
      return stops.some((stop) => Array.isArray(stop) && referencesName(stop[1]));
    }
  }
  return false;
}

/** Style URL for a MapTiler built-in style. */
export function maptilerStyleUrl(styleId: string, key: string): string {
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
}
