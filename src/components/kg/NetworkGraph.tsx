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

const W = 460;
const H = 300;
const CX = W / 2;
const CY = H / 2 - 10;
const OUTER_R = 98;
const NODE_R = 16;
const CENTER_R = 22;
const LABEL_Y = 14;

function clamp(s: string, max = 16): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function NetworkGraph({ center, connected }: Props) {
  const { t } = useLang();

  const positions = useMemo(() => {
    const n = connected.length;
    if (n === 0) return [];
    return connected.map((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        node,
        x: Math.round(CX + OUTER_R * Math.cos(angle)),
        y: Math.round(CY + OUTER_R * Math.sin(angle)),
      };
    });
  }, [connected]);

  const title = `${center.label} — ${t('networkConnections')}`;

  return (
    <div className="network-graph">
      <svg
        className="network-graph-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title}
        focusable="false"
      >
        <title>{title}</title>

        {/* Edges */}
        {positions.map(({ x, y }, i) => (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={x} y2={y}
            className="network-edge"
          />
        ))}

        {/* Connected nodes */}
        {positions.map(({ node, x, y }) => (
          <g key={node.id}>
            <circle
              cx={x} cy={y}
              r={NODE_R}
              className={`network-node network-node--${node.type}`}
            />
            <text
              x={x}
              y={y + NODE_R + LABEL_Y}
              textAnchor="middle"
              className="network-label"
            >
              {clamp(node.label)}
            </text>
          </g>
        ))}

        {/* Center node */}
        <g>
          <circle
            cx={CX} cy={CY}
            r={CENTER_R}
            className={`network-node network-node--${center.type} network-node--current`}
          />
          <text
            x={CX}
            y={CY + CENTER_R + LABEL_Y}
            textAnchor="middle"
            className="network-label network-label--center"
          >
            {clamp(center.label, 18)}
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
