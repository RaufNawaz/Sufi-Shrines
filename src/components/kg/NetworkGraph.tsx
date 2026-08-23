import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';

export type NodeType = 'saint' | 'order' | 'shrine' | 'teacher' | 'disciple';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  href: string;
}

interface Props {
  center: GraphNode;
  connected: GraphNode[];
  /** Legend rows, when the caller mixes node types worth distinguishing. */
  legend?: { type: NodeType; label: string }[];
}

const NODE_R = 16;
const CENTER_R = 22;
const LABEL_GAP = 8;
/* Horizontal room reserved on each side for labels that read outward. Without
   it a label on the 3-o'clock node runs off the viewBox. Sized from the widest
   label `clamp` can emit (18 characters at ~6px, plus the node offset) — at 132
   a full-length name on the 9-o'clock node lost its first letter. */
const LABEL_GUTTER = 156;

function clamp(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * SVG `<text>` has no `<bdi>`, so a Latin name inside the RTL Urdu page gets
 * reordered against its own punctuation — a truncated one renders its ellipsis
 * on the *left*, reading as though the start of the name were cut off. So every
 * label carries an explicit direction rather than inheriting the page's.
 */
function labelDirection(label: string): 'ltr' | 'rtl' {
  return /[A-Za-z]/.test(label) ? 'ltr' : 'rtl';
}

/**
 * `text-anchor` is *logical*, not physical: under `direction: rtl`, `start`
 * means the right edge. `labelPlacement` below reasons in physical terms — "this
 * label sits to the left of its node, so it must extend leftwards" — so an
 * Arabic-script label needs its anchor flipped or it extends back across the
 * node and prints on top of it. That is exactly what the Urdu graph did: the
 * order's name sat inside the order's square.
 */
function resolveAnchor(anchor: 'start' | 'end' | 'middle', dir: 'ltr' | 'rtl') {
  if (dir === 'ltr' || anchor === 'middle') return anchor;
  return anchor === 'start' ? ('end' as const) : ('start' as const);
}

/**
 * Geometry for a ring of `n` nodes.
 *
 * This used to be four fixed constants, which was fine while an order had four
 * saints. Expanding the graph took Chishtiyya to fourteen, and every label —
 * anchored `middle` directly beneath its node — collided with its neighbours
 * and with the centre label. So the ring now grows with the node count and the
 * labels read radially outward, anchored by which side of the circle they are
 * on: `start` on the right, `end` on the left, `middle` only near the poles
 * where an outward label would otherwise sit on top of the node.
 */
function geometry(n: number) {
  // Each node needs roughly this much arc to keep adjacent outward labels from
  // touching; below ~8 nodes the old radius already had room to spare.
  const r = Math.min(190, Math.max(98, 98 + Math.max(0, n - 6) * 7));
  const w = 2 * (r + LABEL_GUTTER);
  const h = 2 * (r + 46);
  return { r, w, h, cx: w / 2, cy: h / 2 };
}

/** Where a node's label goes, given its angle on the ring. */
function labelPlacement(angle: number, x: number, y: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Near the poles (|cos| small) an outward label would overlap the node, so
  // push it vertically instead and centre it.
  if (Math.abs(cos) < 0.28) {
    return {
      x,
      y: y + (sin >= 0 ? NODE_R + LABEL_GAP + 6 : -(NODE_R + LABEL_GAP)),
      anchor: 'middle' as const,
      dominantBaseline: sin >= 0 ? ('hanging' as const) : ('auto' as const),
    };
  }
  const outward = NODE_R + LABEL_GAP;
  return {
    x: x + (cos > 0 ? outward : -outward),
    y,
    anchor: cos > 0 ? ('start' as const) : ('end' as const),
    dominantBaseline: 'middle' as const,
  };
}

export function NetworkGraph({ center, connected, legend }: Props) {
  const { t } = useLang();

  const geo = useMemo(() => geometry(connected.length), [connected.length]);

  const positions = useMemo(() => {
    const n = connected.length;
    if (n === 0) return [];
    return connected.map((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = Math.round(geo.cx + geo.r * Math.cos(angle));
      const y = Math.round(geo.cy + geo.r * Math.sin(angle));
      return { node, x, y, label: labelPlacement(angle, x, y) };
    });
  }, [connected, geo]);

  const title = `${center.label} — ${t('networkConnections')}`;

  return (
    <div className="network-graph">
      <svg
        data-latin
        className="network-graph-svg"
        viewBox={`0 0 ${geo.w} ${geo.h}`}
        role="img"
        aria-label={title}
        focusable="false"
      >
        <title>{title}</title>

        {/* Edges. Each traces outward from the hub, one after another — a
            silsila is a chain, and drawing it says so better than a static star
            does. `pathLength={1}` normalises every spoke to one dash length so
            a single keyframe serves all of them regardless of real length.
            `--stagger-index` is set here because CSS cannot count siblings. */}
        {positions.map(({ node, x, y }, i) => (
          <line
            key={node.id}
            x1={geo.cx}
            y1={geo.cy}
            x2={x}
            y2={y}
            pathLength={1}
            className="network-edge network-edge--animated"
            style={{ '--stagger-index': i } as React.CSSProperties}
          />
        ))}

        {/* Connected nodes. An order is drawn as a rounded square: it is an
            institution, not a person, and once teachers and disciples share the
            ring, colour alone stopped distinguishing them — the legend claimed a
            difference the diagram did not show. Shape survives greyscale,
            colour-blindness and print. */}
        {positions.map(({ node, x, y, label }, i) => {
          const dir = labelDirection(node.label);
          return (
            <g key={node.id} style={{ '--stagger-index': i } as React.CSSProperties}>
              {node.type === 'order' ? (
                <rect
                  x={x - NODE_R}
                  y={y - NODE_R}
                  width={NODE_R * 2}
                  height={NODE_R * 2}
                  rx={5}
                  className={`network-node network-node--animated network-node--${node.type}`}
                />
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_R}
                  className={`network-node network-node--animated network-node--${node.type}`}
                />
              )}
              <text
                x={label.x}
                y={label.y}
                textAnchor={resolveAnchor(label.anchor, dir)}
                dominantBaseline={label.dominantBaseline}
                direction={dir}
                className="network-label"
              >
                {clamp(node.label)}
                {/* The visible label is truncated; the full name stays reachable
                  here and in the link list below. */}
                <title>{node.label}</title>
              </text>
            </g>
          );
        })}

        {/* Center node. Its label sits *above* the hub: below it collides with
            whichever node lands at 6 o'clock, which happens at every even node
            count. */}
        <g>
          <circle
            cx={geo.cx}
            cy={geo.cy}
            r={CENTER_R}
            className={`network-node network-node--${center.type} network-node--current`}
          />
          <text
            x={geo.cx}
            y={geo.cy - CENTER_R - LABEL_GAP}
            textAnchor="middle"
            direction={labelDirection(center.label)}
            className="network-label network-label--center"
          >
            {clamp(center.label, 22)}
            <title>{center.label}</title>
          </text>
        </g>
      </svg>

      {/* A legend only earns its space once the diagram mixes kinds of thing.
          With order + shrines alone the colours were self-evident from the link
          list below; with teachers and disciples on the same ring they are
          not. */}
      {legend && legend.length > 1 && (
        <ul className="network-legend">
          {legend.map((row) => (
            <li key={row.type} className="network-legend-item">
              <span
                className={`network-legend-swatch network-legend-swatch--${row.type}`}
                aria-hidden="true"
              />
              {row.label}
            </li>
          ))}
        </ul>
      )}

      {/* Accessible link list */}
      {connected.length > 0 && (
        /* `data-latin` on the list, not on each item: a node label is a figure
           or order name straight from the graph, and the ones the dictionary
           does not cover stay in their source script (RULE 2). The SVG above
           carries the same declaration for the same reason — and there <bdi> is
           not even available, which is why labelDirection() exists. */
        <ul className="network-links" aria-label={t('networkConnections')} data-latin>
          {connected.map((node, i) => (
            <li
              key={node.id}
              className={`network-link network-link--${node.type} reveal-rise`}
              style={{ '--stagger-index': i } as React.CSSProperties}
            >
              <Link to={node.href}>{node.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
