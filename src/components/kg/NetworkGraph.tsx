import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';

export type NodeType = 'saint' | 'order' | 'shrine';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  href: string;
}

interface Props {
  center: GraphNode;
  connected: GraphNode[];
}

const NODE_R = 16;
const CENTER_R = 22;
const LABEL_GAP = 8;
/* Horizontal room reserved on each side for labels that read outward. Without
   it a label on the 3-o'clock node runs off the viewBox. */
const LABEL_GUTTER = 132;

function clamp(s: string, max = 18): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
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

export function NetworkGraph({ center, connected }: Props) {
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
        className="network-graph-svg"
        viewBox={`0 0 ${geo.w} ${geo.h}`}
        role="img"
        aria-label={title}
        focusable="false"
      >
        <title>{title}</title>

        {/* Edges */}
        {positions.map(({ x, y }, i) => (
          <line key={i} x1={geo.cx} y1={geo.cy} x2={x} y2={y} className="network-edge" />
        ))}

        {/* Connected nodes */}
        {positions.map(({ node, x, y, label }) => (
          <g key={node.id}>
            <circle
              cx={x}
              cy={y}
              r={NODE_R}
              className={`network-node network-node--${node.type}`}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline={label.dominantBaseline}
              className="network-label"
            >
              {clamp(node.label)}
              {/* The visible label is truncated; the full name stays reachable
                  here and in the link list below. */}
              <title>{node.label}</title>
            </text>
          </g>
        ))}

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
            className="network-label network-label--center"
          >
            {clamp(center.label, 22)}
            <title>{center.label}</title>
          </text>
        </g>
      </svg>

      {/* Accessible link list */}
      {connected.length > 0 && (
        <ul className="network-links" aria-label={t('networkConnections')}>
          {connected.map((node) => (
            <li key={node.id} className={`network-link network-link--${node.type}`}>
              <Link to={node.href}>{node.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
