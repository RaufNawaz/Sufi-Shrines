import { useHref, useNavigate } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { categoryKey } from '../../lib/data/categoryKey';
import { PAKISTAN_OUTLINE, projectToOutline } from '../../lib/geo/outlineProjection';
import type { Shrine } from '../../types/shrine';

/**
 * Where a set of entries stands, as dots on the country's outline.
 *
 * Hidden from assistive technology as a whole: an image role around links is
 * nested interaction (axe), and the entries list under the map already carries
 * every one of these links, once, in reading order. The caption beneath says
 * what the dots are, for everyone.
 *
 * Static SVG (`pipeline/gis/export_outline_svg.py`): a picture that needs no
 * tiles, no key and no network, and prints. Each dot is a link for a pointer,
 * but hidden from the keyboard and the accessibility tree — the entries list
 * beside the map carries the same links once, in reading order, and a second
 * tab stop per site would double the walk to get past it.
 */
/** Sites closer than this (outline units; ~35 km) share a dot. */
const GROUP_RADIUS = 3.5;
const DOT_R = 2.1;

interface DotGroup {
  x: number;
  y: number;
  sites: Shrine[];
  tradition: string;
}

/**
 * Sites close enough to overlap become one dot with the area of all of them
 * (r ∝ √n) and their count printed on it. One fixed-size dot per site drew six
 * Lahore gurdwaras as a single dot and told the reader each dot was a site, so
 * a book that is mostly about Lahore looked like it was about everywhere
 * (data-viz council, 17 October 2026).
 *
 * Grouped by distance to a group's centre rather than by grid cell: cells split
 * neighbours along their borders, and a lone dot from the next cell then sat on
 * top of the group and hid its count.
 */
function groupSites(entries: readonly Shrine[]): DotGroup[] {
  const groups: { x: number; y: number; sites: Shrine[] }[] = [];
  for (const s of entries) {
    if (!s.latLng) continue;
    const p = projectToOutline(s.latLng.lat, s.latLng.lng);
    const near = groups.find((g) => Math.hypot(g.x - p.x, g.y - p.y) < GROUP_RADIUS);
    if (near) {
      const n = near.sites.length;
      near.x = (near.x * n + p.x) / (n + 1);
      near.y = (near.y * n + p.y) / (n + 1);
      near.sites.push(s);
    } else {
      groups.push({ x: p.x, y: p.y, sites: [s] });
    }
  }
  return groups
    .map((g) => {
      const tally = new Map<string, number>();
      for (const s of g.sites) {
        const k = categoryKey(s.category);
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      return { ...g, tradition: [...tally].sort((a, b) => b[1] - a[1])[0]![0] };
    })
    .sort((a, b) => b.sites.length - a.sites.length);
}

export function DotMap({ entries }: { entries: readonly Shrine[] }) {
  const { lang, fmtNum } = useLang();
  const navigate = useNavigate();
  const base = useHref('/');
  const [, , width, height] = PAKISTAN_OUTLINE.viewBox;
  const groups = groupSites(entries);
  return (
    <svg
      className="source-map"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="source-map-land">
        {PAKISTAN_OUTLINE.provinces.map((p) => (
          <path key={p.code} d={p.d} />
        ))}
      </g>
      <g className="source-map-dots">
        {/* Largest first, so a small dot is never hidden under a big one. */}
        {groups.map((g) => {
          const r = DOT_R * Math.sqrt(g.sites.length);
          const names = g.sites.map((s) => localizeShrineName(s, lang)).join('\n');
          const dot = (
            <circle
              className={`source-map-dot source-map-dot--${g.tradition}`}
              cx={g.x.toFixed(1)}
              cy={g.y.toFixed(1)}
              r={r.toFixed(2)}
            >
              <title>{names}</title>
            </circle>
          );
          if (g.sites.length > 1) {
            /* Not a link: a group would have to pick one of its sites to go
               to. The tooltip names them all; the list below links each. */
            return (
              <g key={g.sites[0]!.slug}>
                {dot}
                <text
                  className="source-map-count"
                  x={g.x.toFixed(1)}
                  y={g.y.toFixed(1)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  /* In the outline's own units, so it scales with the map and
                     stays inside its dot — not with the reading-size setting. */
                  fontSize={3.6}
                >
                  {fmtNum(g.sites.length)}
                </text>
              </g>
            );
          }
          const to = `/shrine/${g.sites[0]!.slug}`;
          return (
            <a
              key={g.sites[0]!.slug}
              href={`${base.replace(/\/$/, '')}${to}`}
              tabIndex={-1}
              aria-hidden="true"
              onClick={(e) => {
                e.preventDefault();
                navigate(to);
              }}
            >
              {dot}
            </a>
          );
        })}
      </g>
    </svg>
  );
}
