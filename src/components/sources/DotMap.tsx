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
export function DotMap({ entries }: { entries: readonly Shrine[] }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const base = useHref('/');
  const [, , width, height] = PAKISTAN_OUTLINE.viewBox;
  const placed = entries.filter((s) => s.latLng);
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
        {placed.map((s) => {
          const { x, y } = projectToOutline(s.latLng!.lat, s.latLng!.lng);
          const key = categoryKey(s.category);
          const to = `/shrine/${s.slug}`;
          return (
            <a
              key={s.slug}
              href={`${base.replace(/\/$/, '')}${to}`}
              tabIndex={-1}
              aria-hidden="true"
              onClick={(e) => {
                e.preventDefault();
                navigate(to);
              }}
            >
              <circle
                className={`source-map-dot source-map-dot--${key}`}
                cx={x.toFixed(1)}
                cy={y.toFixed(1)}
                r={2.1}
              >
                <title>{localizeShrineName(s, lang)}</title>
              </circle>
            </a>
          );
        })}
      </g>
    </svg>
  );
}
