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
 * Five, deliberately, until a sixth was asked for (see the `sources` entry):
 * a tab bar stops being legible past five or six on a phone, and every tab
 * here is an index over the whole archive rather than one entry.
 * `/coverage` and `/report` are not among them because they are no longer
 * pages: both are sections of `/about`, and both routes redirect into it. They
 * stay in `owns` so the Archive tab is already lit during the redirect rather
 * than flashing five unselected tabs on the way through.
 *
 * The order is the reading order of the archive: where things are, who they were,
 * when people gather, what was built, what it rests on, and what the whole
 * thing claims.
 */
export interface TabDefinition {
  /** Stable id, used for the icon and as a React key. */
  id: 'map' | 'explore' | 'almanac' | 'atlas' | 'sources' | 'about';
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
  /* `/shared-ground` belongs to the map, not to the atlas: it is a statement
     about where sites are, and every row on it leads to a shrine page. */
  { id: 'map', path: '/', labelKey: 'tabMap', owns: ['/shrine/', '/place/', '/shared-ground'] },
  /* `/tradition/` sits with the explorer for the same reason `/order/` does:
     both answer "what did this belong to". The orders are the Sufi half of that
     question and the traditions are the other five. */
  {
    id: 'explore',
    path: '/graph',
    labelKey: 'tabExplore',
    owns: ['/saint/', '/order/', '/tradition/'],
  },
  { id: 'almanac', path: '/almanac', labelKey: 'tabAlmanac', owns: [] },
  /* The atlas tab owns `/chronology` as well as its own `/typology`: both are
     ways of seeing the *whole* archive at once rather than one site — by built
     form, and by century. A reader who opens the timeline should not be shown
     five unselected tabs.

     Whether the chronology deserves a tab of its own is a design question and
     not one to settle by adding a sixth item to a five-item bar at midnight; it
     is recorded in docs/planning/TRACK_C_CHRONOLOGY.md instead. */
  { id: 'atlas', path: '/typology', labelKey: 'tabAtlas', owns: ['/chronology'] },
  /* The sixth tab, added 17 October 2026 at Rauf's request, against this
     file's own "five, deliberately". The case for it: what the archive rests on
     is the question its whole claim to provenance invites, and until then the
     only cross-entry view of its sources was a team-only section of /about —
     a public reader could follow a shrine page's "also cited by 3 other
     entries" link and land on nothing. Six still fits: at 320px each tab is
     53px, above the 44px target, and the labels are one short word in both
     languages. `/source/` belongs here as `/saint/` belongs to the explorer. */
  { id: 'sources', path: '/sources', labelKey: 'tabSources', owns: ['/source/'] },
  /* `/settings` sits here for the same reason `/coverage` and `/report` do: it
     is a page *about* the archive rather than a part of its content, it is
     linked from the footer beside "About this archive", and a reader who opens
     it should not be shown five unselected tabs. */
  {
    id: 'about',
    path: '/about',
    labelKey: 'tabAbout',
    owns: ['/coverage', '/report', '/settings'],
  },
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
