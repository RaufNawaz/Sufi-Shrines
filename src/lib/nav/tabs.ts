import type { UI_TEXT } from '../i18n/uiStrings';

/**
 * The archive's top-level destinations.
 *
 * There were none. On a phone the only navigation in the entire app was "Back to
 * map": `/graph`, `/almanac`, `/typology` and `/coverage` were reachable only
 * through links buried inside article bodies, so four of the archive's six
 * surfaces were effectively unreachable for a reader who did not already know
 * they existed. The map is the front door and it opened onto one room.
 *
 * Five, deliberately: a tab bar stops being legible past five on a phone, and
 * every tab here is an index over the whole archive rather than one entry.
 * `/coverage` and `/report` are not among them because they are no longer
 * pages: both are sections of `/about`, and both routes redirect into it. They
 * stay in `owns` so the Archive tab is already lit during the redirect rather
 * than flashing five unselected tabs on the way through.
 *
 * The order is the reading order of the archive: where things are, who they were,
 * when people gather, what was built, and what the whole thing claims.
 */
export interface TabDefinition {
  /** Stable id, used for the icon and as a React key. */
  id: 'map' | 'explore' | 'almanac' | 'atlas' | 'about';
  path: string;
  labelKey: keyof (typeof UI_TEXT)['en'];
  /**
   * The routes this tab owns.
   *
   * A tab bar that highlights nothing on `/shrine/data-darbar` tells a reader
   * they have left the app. Detail routes belong to the index that leads to
   * them: a shrine and a place belong to the map, a figure and an order to the
   * explorer.
   */
  owns: readonly string[];
}

export const TABS: readonly TabDefinition[] = [
  { id: 'map', path: '/', labelKey: 'tabMap', owns: ['/shrine/', '/place/'] },
  { id: 'explore', path: '/graph', labelKey: 'tabExplore', owns: ['/saint/', '/order/'] },
  { id: 'almanac', path: '/almanac', labelKey: 'tabAlmanac', owns: [] },
  { id: 'atlas', path: '/typology', labelKey: 'tabAtlas', owns: [] },
  { id: 'about', path: '/about', labelKey: 'tabAbout', owns: ['/coverage', '/report'] },
];

/**
 * Which tab a path belongs to, or null on a route no tab owns.
 *
 * Null rather than a default, so a 404 does not claim to be somewhere: marking
 * the map tab current on a page the map cannot reach is a lie a screen reader
 * reads out as `aria-current="page"`.
 *
 * The `/ur/` prefix is stripped first. Those routes exist so crawlers get a
 * static Urdu file per page and a real browser is on one for at most one paint
 * (see `UrPrefixNormalizer`), but that paint should not be the one with no tab
 * selected.
 */
export function activeTabId(pathname: string): TabDefinition['id'] | null {
  const path = pathname.replace(/^\/ur(?=\/|$)/, '') || '/';
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;

  for (const tab of TABS) {
    if (normalized === tab.path) return tab.id;
  }
  for (const tab of TABS) {
    if (tab.owns.some((prefix) => normalized === prefix || normalized.startsWith(prefix))) {
      return tab.id;
    }
  }
  return null;
}
