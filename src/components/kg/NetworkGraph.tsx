import React, { useCallback, useMemo, useState } from 'react';
import { Link, useHref, useNavigate } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { thumbnailUrl } from '../../lib/images/thumbnail';

export type NodeType = 'saint' | 'order' | 'shrine' | 'teacher' | 'disciple';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  href: string;
  /**
   * A photograph to draw inside the node, and the place it is of.
   *
   * Optional because the archive is short of pictures: 118 of 169 rows carry an
   * image, so 90 of 191 figures have none. A node without one keeps the plain
   * circle the diagram has always drawn — not a placeholder, which reads as an
   * image still loading, and not a silhouette, which would read as a missing
   * portrait when what is missing is a photograph of a building.
   *
   * `imageOf` is the *place* the photograph shows. It is carried so the preview
   * can say so: the archive has no portraits, and a picture beside a person's
   * name silently claims otherwise unless the caption names the site.
   */
  imageUrl?: string;
  imageOf?: string;
}

interface Props {
  center: GraphNode;
  connected: GraphNode[];
  /** Legend rows, when the caller mixes node types worth distinguishing. */
  legend?: { type: NodeType; label: string }[];
}

const NODE_R = 16;
/* Rendered at 3x the drawn radius so the picture stays sharp where the SVG is
   scaled up on a wide viewport, and because these are the same source images the
   map already fetches — a second, differently-sized request would miss its
   cache. */
const NODE_IMAGE_W = NODE_R * 6;
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
  const navigate = useNavigate();

  /* Which node's preview is showing. Driven by hover *and* focus, deliberately:
     a preview that only appears under a pointer is a preview a keyboard reader
     and a touch reader never see, and this project treats that as a defect
     rather than a limitation (CLAUDE.md — accessibility is a requirement). */
  const [previewId, setPreviewId] = useState<string | null>(null);
  const clearPreview = useCallback(() => setPreviewId(null), []);

  /* SVG has no react-router Link, and a bare <a href> inside the diagram would
     full-page-load out of the SPA. So the anchor stays a real anchor — its href
     is the real URL, so middle-click, right-click and "copy link" all behave —
     and a plain left-click is intercepted and routed. */

  /* ...but "the real URL" is not the route path. The router is mounted with a
     basename and production is served from /Sufi-Shrines/, so a raw
     `href="/saint/foo"` points at raufnawaz.github.io/saint/foo and 404s — in
     production only, which is the whole reason `npm run verify:pages` exists
     (HANDOVER §9.58). It caught this one on the deploy of 31 August 2026: five
     links on /graph and two on every saint page. The three behaviours the
     anchor was kept for — middle-click, right-click, copy link — were exactly
     the three that were broken, and a left-click hid it, because navigate()
     applies the basename itself and so was always right.

     `useHref` is the router's own answer. Called once for the root (rules of
     hooks: one call, not one per node) it yields the prefix every node href
     needs, read from the live basename rather than re-derived from
     import.meta.env. */
  const basePrefix = useHref('/');
  const hrefFor = useCallback(
    (routePath: string) => `${basePrefix.replace(/\/$/, '')}${routePath}`,
    [basePrefix],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent<Element>, href: string) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      navigate(href);
    },
    [navigate],
  );

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

  const preview = previewId ? positions.find((p) => p.node.id === previewId) : undefined;

  return (
    <div className="network-graph">
      {/* The preview card.
          Positioned as a percentage of the viewBox rather than in pixels, because
          the SVG scales with its container and a pixel offset computed at render
          time is wrong the moment the viewport changes. Rendered outside the
          <svg> so it is ordinary HTML — an image and text inside SVG would need
          foreignObject, and the map's preview is HTML too, which is what the
          shared look depends on.
          `aria-hidden`: everything the card shows is already on the node's own
          anchor (its accessible name) and in the link list below, so announcing
          it again would make every node read twice. */}
      {preview && (
        <div
          className={`network-preview network-preview--${
            preview.y < geo.h / 2 ? 'below' : 'above'
          }`}
          aria-hidden="true"
          style={{
            left: `${(preview.x / geo.w) * 100}%`,
            top: `${(preview.y / geo.h) * 100}%`,
          }}
        >
          {preview.node.imageUrl && (
            <img
              className="network-preview-image"
              src={thumbnailUrl(preview.node.imageUrl, 240) || preview.node.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          <div className="network-preview-body">
            <span className="network-preview-name" dir={labelDirection(preview.node.label)}>
              <bdi>{preview.node.label}</bdi>
            </span>
            {/* Names the *place* the photograph shows. The archive holds no
                portraits, and a picture beside a person's name claims one unless
                the caption says whose shrine it is. */}
            {preview.node.imageOf && (
              <span className="network-preview-site">
                <bdi data-latin>{preview.node.imageOf}</bdi>
              </span>
            )}
          </div>
        </div>
      )}
      <svg
        data-latin
        className="network-graph-svg"
        viewBox={`0 0 ${geo.w} ${geo.h}`}
        /* Was role="img" with a single label, which was right while the diagram
           was decorative and the link list below carried the content. The nodes
           are links now, so a role that flattens it to one image would hide
           them from assistive tech entirely. `group` keeps the accessible name
           and lets the anchors inside be reached. */
        role="group"
        aria-label={title}
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
          const clipId = `clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          const shape =
            node.type === 'order' ? (
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
            );
          return (
            <a
              key={node.id}
              href={hrefFor(node.href)}
              className="network-node-link"
              /* The accessible name, as an attribute rather than an SVG <title>.
                 A <title> is a text node, so it put a second copy of every node
                 label into the DOM — and the Urdu no-leak guard walks text nodes,
                 so a Latin figure name that was declared once was suddenly
                 undeclared twice. An attribute names the link just as well and
                 adds nothing for the walker to find. */
              aria-label={node.label}
              style={{ '--stagger-index': i } as React.CSSProperties}
              onClick={(e) => onNodeClick(e, node.href)}
              onMouseEnter={() => setPreviewId(node.id)}
              onMouseLeave={clearPreview}
              onFocus={() => setPreviewId(node.id)}
              onBlur={clearPreview}
            >
              {shape}
              {/* The photograph, clipped to the node. Drawn *after* the shape so
                  the shape's fill is the ground an image with transparency sits
                  on, and drawn only where one exists — see GraphNode.imageUrl on
                  why a missing picture gets no placeholder. `pointer-events:
                  none` in CSS keeps the anchor, not the image, as the hit
                  target. */}
              {node.imageUrl && (
                <>
                  <clipPath id={clipId}>
                    {node.type === 'order' ? (
                      <rect
                        x={x - NODE_R}
                        y={y - NODE_R}
                        width={NODE_R * 2}
                        height={NODE_R * 2}
                        rx={5}
                      />
                    ) : (
                      <circle cx={x} cy={y} r={NODE_R} />
                    )}
                  </clipPath>
                  <image
                    href={thumbnailUrl(node.imageUrl, NODE_IMAGE_W) || node.imageUrl}
                    x={x - NODE_R}
                    y={y - NODE_R}
                    width={NODE_R * 2}
                    height={NODE_R * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipId})`}
                    className="network-node-image"
                  />
                  {/* Redrawn on top: the clipped image covers the shape's stroke,
                      and without the ring back the node loses the outline that
                      distinguishes a saint from an order at a glance. */}
                  {node.type === 'order' ? (
                    <rect
                      x={x - NODE_R}
                      y={y - NODE_R}
                      width={NODE_R * 2}
                      height={NODE_R * 2}
                      rx={5}
                      className={`network-node-ring network-node--${node.type}`}
                    />
                  ) : (
                    <circle
                      cx={x}
                      cy={y}
                      r={NODE_R}
                      className={`network-node-ring network-node--${node.type}`}
                    />
                  )}
                </>
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
            </a>
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
