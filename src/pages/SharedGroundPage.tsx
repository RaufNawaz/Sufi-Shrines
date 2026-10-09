import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/ui/SiteFooter';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { OfflineDataBanner } from '../components/ui/OfflineDataBanner';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { tFn } from '../lib/i18n/uiStrings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { localizeShrineName } from '../lib/i18n/localizeShrineName';
import { formatDistance } from '../lib/i18n/formatDistance';
import { isRtlLang } from '../lib/i18n/languages';
import { CATEGORY_LABELS } from '../lib/data/categoryKey';
import { useReaderPreferences } from '../lib/preferences/ReaderPreferencesContext';
import {
  buildSharedGroundOverview,
  SHARED_GROUND_RADIUS_M,
  type CrossTraditionAdjacency,
  type TraditionMeeting,
} from '../lib/data/sharedGround';

/**
 * Shared ground, across the whole archive.
 *
 * Track A of `docs/planning/SHARED_GROUND_VISION.md` shipped the per-site
 * section on a shrine page — "who else is within walking distance of *this*
 * one". The archive-wide half of it never did: `crossTraditionAdjacencies()`
 * has been exported and tested since 21 August 2026 and **nothing called it**,
 * so the one fact this phase exists to show — that the traditions this archive
 * documents stand on the same streets — could only be seen one shrine at a
 * time, by a reader who already knew which shrine to open.
 *
 * Two rules this page is built around, both from the vision doc:
 *
 * 1. **No chaining, so no groups.** The obvious layout is a list of complexes.
 *    Single-linking everything within 800 m produces one component of 15 sites
 *    measuring 3,358 m across — central Lahore, presented as a courtyard. The
 *    only units here are a pair with a measured distance and a count of pairs.
 * 2. **A distance the archive did not measure is never shown as one it did.**
 *    Two of the pairs share a recorded pin because the survey gives no separate
 *    position, and they say so instead of printing "0 m".
 *
 * Everything is computed from the loaded data on each render, for the reason
 * `/about` computes its own figures: the count in the vision doc, in
 * `CLAUDE.md` and in two component docstrings said "eight places" for nine days
 * after it stopped being the number. A page cannot go stale the way a note can.
 */

function TraditionName({ tradition }: { tradition: keyof typeof CATEGORY_LABELS }) {
  const { lang } = useLang();
  return (
    <span className={`shared-ground-tradition shared-ground-tradition--${tradition}`}>
      {CATEGORY_LABELS[tradition][lang]}
    </span>
  );
}

/** One crossing: two sites, their traditions, and how far apart the archive
 *  records them. */
function Crossing({
  pair,
  hidden,
  hot,
}: {
  pair: CrossTraditionAdjacency;
  hidden: boolean;
  hot: boolean;
}) {
  const { lang, t, fmtNum } = useLang();
  const { units } = useReaderPreferences();

  return (
    <li
      className={`crossing${hot ? ' is-hot' : ''}`}
      id={`crossing-${pair.a.id}-${pair.b.id}`}
      hidden={hidden}
    >
      {/* The distance leads. It is the claim the row is making — the names are
          what the claim is about — and putting it first means the list reads
          as a scale from "one recorded position" outwards, which is the shape
          of the finding. */}
      {pair.samePin ? (
        <span
          className="crossing-distance crossing-distance--same"
          title={t('sharedGroundSamePinHelp')}
        >
          {t('sharedGroundSamePin')}
        </span>
      ) : (
        <span className="crossing-distance">
          {formatDistance(pair.distanceM / 1000, units, lang, fmtNum, {
            style: 'apart',
            below: 'metres',
          })}
        </span>
      )}

      <span className="crossing-sites">
        {[pair.a, pair.b].map((shrine, i) => (
          <React.Fragment key={shrine.id}>
            {i > 0 && (
              /* A separator, not a word: "and" would be a sentence fragment
                 assembled by this component, and the two sites are not ordered
                 by anything a reader should read as ranking. */
              <span className="crossing-join" aria-hidden="true">
                ·
              </span>
            )}
            <span
              className={`crossing-site shared-ground-tradition--${i === 0 ? pair.traditionA : pair.traditionB}`}
            >
              <span className="crossing-dot" aria-hidden="true" />
              <Link to={`/shrine/${shrine.slug}`} className="shared-ground-name">
                {/* <bdi> because a name with no dictionary entry falls back to
                    Latin, and an unwrapped Latin run inside the RTL page
                    reorders the punctuation around it. */}
                <bdi>{localizeShrineName(shrine, lang)}</bdi>
              </Link>
              <TraditionName tradition={i === 0 ? pair.traditionA : pair.traditionB} />
            </span>
          </React.Fragment>
        ))}
      </span>
    </li>
  );
}

type Tradition = TraditionMeeting['traditions'][number];
const meetingKey = (a: Tradition, b: Tradition) => [a, b].sort().join('+');
const CAT_VAR: Record<Tradition, string> = {
  muslim: 'var(--color-cat-muslim)',
  hindu: 'var(--color-cat-hindu)',
  sikh: 'var(--color-cat-sikh)',
  nanakpanthi: 'var(--color-cat-nanakpanthi)',
  jain: 'var(--color-cat-jain)',
  secular: 'var(--color-cat-secular)',
};

/**
 * Which traditions stand together, drawn: the traditions on a ring, and a curve
 * between two of them as thick as the number of pairings they share. A picture
 * of the table beside it, which stays the accessible version — the ring is
 * `aria-hidden`, and choosing a curve does exactly what choosing its row does.
 */
function MeetingsRing({
  traditions,
  meetings,
  selected,
  onChoose,
}: {
  traditions: Tradition[];
  meetings: TraditionMeeting[];
  selected: string | null;
  onChoose: (key: string) => void;
}) {
  const { lang } = useLang();
  const size = 320;
  const c = size / 2;
  const r = 104;
  const max = Math.max(1, ...meetings.map((m) => m.pairs));
  const at = (i: number) => {
    const angle = (i / traditions.length) * 2 * Math.PI - Math.PI / 2;
    return { x: c + r * Math.cos(angle), y: c + r * Math.sin(angle), angle };
  };
  const pos = new Map(traditions.map((key, i) => [key, at(i)]));

  return (
    /* Wider than the ring by a label's length each side: the names sit outside
       the circle, and "Nanakpanthi (Hindu–Sikh)" is long. */
    <svg className="sg-ring" viewBox={`-120 0 ${size + 240} ${size}`} aria-hidden="true">
      {meetings.map((m) => {
        const a = pos.get(m.traditions[0]);
        const b = pos.get(m.traditions[1]);
        if (!a || !b) return null;
        const key = meetingKey(m.traditions[0], m.traditions[1]);
        const dim = selected !== null && selected !== key;
        return (
          <path
            key={key}
            className={`sg-ring-link${selected === key ? ' is-selected' : ''}${dim ? ' is-dim' : ''}`}
            d={`M ${a.x} ${a.y} Q ${c} ${c} ${b.x} ${b.y}`}
            strokeWidth={2 + (m.pairs / max) * 12}
            onClick={() => onChoose(key)}
          />
        );
      })}
      {traditions.map((key) => {
        const p = pos.get(key)!;
        const lx = c + (r + 22) * Math.cos(p.angle);
        const ly = c + (r + 22) * Math.sin(p.angle);
        const anchor =
          Math.abs(Math.cos(p.angle)) < 0.2 ? 'middle' : Math.cos(p.angle) > 0 ? 'start' : 'end';
        return (
          <g key={key}>
            <circle
              cx={p.x}
              cy={p.y}
              r={9}
              style={{ fill: CAT_VAR[key] }}
              className="sg-ring-node"
            />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={isRtlLang(lang) ? 21 : 14}
              className="sg-ring-label"
            >
              {CATEGORY_LABELS[key][lang]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Every crossing on one scale: a dot per pair at the distance between its two
 * sites, half in each tradition's colour, from 0 to the 800 m radius. Dots that
 * would overlap stack. Pairs that share a recorded pin are not drawn at "0 m" —
 * the archive never measured that distance — but in a bin of their own before
 * the scale, hollow.
 */
function CrossingStrip({
  pairs,
  selected,
  onPoint,
}: {
  pairs: CrossTraditionAdjacency[];
  selected: string | null;
  onPoint: (pair: CrossTraditionAdjacency) => void;
}) {
  const { lang, t, fmtNum } = useLang();
  const { units } = useReaderPreferences();
  const [hover, setHover] = useState<{
    pair: CrossTraditionAdjacency;
    x: number;
    y: number;
  } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  /* The strip's drawn width, so dots stack by how close they are on screen
     rather than by a fixed number of metres: 22 m is two dots apart on a
     laptop and the same dot on a phone. */
  const [fieldWidth, setFieldWidth] = useState(800);
  React.useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setFieldWidth(entry.contentRect.width || 800));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const ROW = 16;
  const GAP_M = (14 / Math.max(fieldWidth, 1)) * SHARED_GROUND_RADIUS_M;
  const same = pairs.filter((p) => p.samePin);
  const measured = pairs.filter((p) => !p.samePin);
  const ends: number[] = [];
  const rows = measured.map((p) => {
    let row = ends.findIndex((end) => end + GAP_M < p.distanceM);
    if (row === -1) {
      row = ends.length;
      ends.push(p.distanceM);
    } else ends[row] = p.distanceM;
    return row;
  });
  const depth = Math.max(1, ends.length, same.length);
  const ticks = [0, 200, 400, 600, 800].filter((m) => m <= SHARED_GROUND_RADIUS_M);
  const fill = (p: CrossTraditionAdjacency) =>
    `linear-gradient(90deg, ${CAT_VAR[p.traditionA]} 50%, ${CAT_VAR[p.traditionB]} 50%)`;
  const dim = (p: CrossTraditionAdjacency) =>
    selected !== null && meetingKey(p.traditionA, p.traditionB) !== selected;
  const show = (event: React.PointerEvent, pair: CrossTraditionAdjacency) => {
    const box = boxRef.current?.getBoundingClientRect();
    const dot = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box) return;
    setHover({
      pair,
      x: Math.min(Math.max(dot.left + dot.width / 2 - box.left, 110), box.width - 110),
      y: dot.top - box.top,
    });
  };

  return (
    <div className="sg-strip" ref={boxRef} onPointerLeave={() => setHover(null)}>
      <div className="sg-strip-plot" aria-hidden="true">
        {same.length > 0 && (
          <div className="sg-strip-same" style={{ blockSize: `${depth * ROW}px` }}>
            {same.map((p, i) => (
              <span
                key={`${p.a.id}-${p.b.id}`}
                className={`sg-strip-dot sg-strip-dot--same${dim(p) ? ' is-dim' : ''}`}
                style={{ insetBlockEnd: `${i * ROW}px` }}
                onPointerEnter={(e) => show(e, p)}
                onPointerDown={(e) => show(e, p)}
                onClick={() => onPoint(p)}
              />
            ))}
          </div>
        )}
        <div className="sg-strip-scale">
          <div className="sg-strip-field" ref={fieldRef} style={{ blockSize: `${depth * ROW}px` }}>
            {ticks.map((m) => (
              <span
                key={m}
                className="sg-strip-grid"
                style={{ insetInlineStart: `${(m / SHARED_GROUND_RADIUS_M) * 100}%` }}
              />
            ))}
            {measured.map((p, i) => (
              <span
                key={`${p.a.id}-${p.b.id}`}
                className={`sg-strip-dot${dim(p) ? ' is-dim' : ''}`}
                style={{
                  insetInlineStart: `${(p.distanceM / SHARED_GROUND_RADIUS_M) * 100}%`,
                  insetBlockEnd: `${rows[i] * ROW}px`,
                  background: fill(p),
                }}
                onPointerEnter={(e) => show(e, p)}
                onPointerDown={(e) => show(e, p)}
                onClick={() => onPoint(p)}
              />
            ))}
          </div>
          <div className="sg-strip-axis">
            {ticks.map((m, i) => (
              <span
                key={m}
                className={`sg-strip-tick${i === ticks.length - 1 ? ' sg-strip-tick--end' : ''}${i % 2 === 1 ? ' sg-strip-tick--minor' : ''}`}
                style={
                  i === ticks.length - 1
                    ? undefined
                    : { insetInlineStart: `${(m / SHARED_GROUND_RADIUS_M) * 100}%` }
                }
              >
                {m === 0
                  ? fmtNum(0)
                  : formatDistance(m / 1000, units, lang, fmtNum, {
                      style: 'bare',
                      below: 'metres',
                    })}
              </span>
            ))}
          </div>
        </div>
      </div>
      {same.length > 0 && <p className="sg-strip-same-label">{t('sharedGroundSamePin')}</p>}
      {hover && (
        <div className="sg-strip-tip" aria-hidden="true" style={{ left: hover.x, top: hover.y }}>
          <span>
            <bdi>{localizeShrineName(hover.pair.a, lang)}</bdi>
          </span>
          <span>
            <bdi>{localizeShrineName(hover.pair.b, lang)}</bdi>
          </span>
          <span className="sg-strip-tip-distance">
            {hover.pair.samePin
              ? t('sharedGroundSamePin')
              : formatDistance(hover.pair.distanceM / 1000, units, lang, fmtNum, {
                  style: 'apart',
                  below: 'metres',
                })}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SharedGroundPage() {
  const { shrines, loading, offline, sourceTimestamp } = useShrineData();
  const { t, lang, fmtNum } = useLang();
  const { units } = useReaderPreferences();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('sharedGroundPageTitle')} — ${t('siteTitle')}`);

  const overview = useMemo(() => buildSharedGroundOverview(shrines), [shrines]);
  /* One choice drives the ring, the table, the strip and the list: a pair of
     traditions, or none. */
  const [selected, setSelected] = useState<string | null>(null);
  const [hotPair, setHotPair] = useState<string | null>(null);
  const choose = (key: string) => setSelected((current) => (current === key ? null : key));
  const pointTo = (pair: CrossTraditionAdjacency) => {
    const id = `crossing-${pair.a.id}-${pair.b.id}`;
    setSelected(null);
    setHotPair(id);
    window.requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };
  const maxPairs = Math.max(1, ...overview.meetings.map((m) => m.pairs));
  const selectedMeeting = overview.meetings.find(
    (m) => meetingKey(m.traditions[0], m.traditions[1]) === selected,
  );

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('sharedGroundPageTitle')} />

      <article
        className="entity-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label={t('ariaBreadcrumb')}>
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li className="shrine-breadcrumb-current" aria-current="page">
              {t('sharedGroundPageTitle')}
            </li>
          </ol>
        </nav>

        <h1 className="entity-title" ref={headingRef} tabIndex={-1}>
          {t('sharedGroundPageTitle')}
        </h1>
        <OfflineDataBanner offline={offline} sourceTimestamp={sourceTimestamp} />
        <p className="sg-lede">{t('sharedGroundPageLede')}</p>

        {loading && shrines.length === 0 ? (
          <p className="coverage-loading page-loading-reserve">{t('loading')}</p>
        ) : overview.crossTradition.length === 0 ? (
          <p className="sg-empty">{t('sharedGroundEmpty')}</p>
        ) : (
          <>
            {/* The numbers, in the order the argument is made: how much of the
                archive is adjacent at all, then how much of that adjacency
                crosses a tradition. `sharedGroundStatPairs` counts every
                neighbouring pair, not only the crossings, because the second
                number means nothing without the first. */}
            <dl className="sg-stats">
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.sitesWithNeighbours)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatAdjacent')}</dd>
              </div>
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.pairs)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatPairs')}</dd>
              </div>
              <div className="sg-stat">
                <dt className="sg-stat-value">{fmtNum(overview.crossTraditionSites)}</dt>
                <dd className="sg-stat-label">{t('sharedGroundStatCrossSites')}</dd>
              </div>
            </dl>
            <p className="sg-headline">
              {fmtNum(
                tFn(
                  lang,
                  'sharedGroundCrossOfPairs',
                  overview.crossTradition.length,
                  overview.pairs,
                ),
              )}
            </p>

            <section className="sg-section" aria-labelledby="sg-meetings-heading">
              <h2 className="sg-section-heading" id="sg-meetings-heading">
                {t('sharedGroundMeetingsHeading')}
              </h2>
              <p className="sg-section-note">{t('sharedGroundMeetingsNote')}</p>
              <div className="sg-meetings-layout">
                <MeetingsRing
                  traditions={overview.traditions}
                  meetings={overview.meetings}
                  selected={selected}
                  onChoose={choose}
                />
                <ul className="sg-meetings">
                  {overview.meetings.map((meeting) => {
                    const key = meetingKey(meeting.traditions[0], meeting.traditions[1]);
                    return (
                      <li
                        className={`sg-meeting${selected === key ? ' is-selected' : ''}`}
                        key={meeting.traditions.join('+')}
                      >
                        {/* The row is the control: it shows only this pair's
                            crossings below, and again to show them all. */}
                        <button
                          type="button"
                          className="sg-meeting-btn"
                          aria-pressed={selected === key}
                          onClick={() => choose(key)}
                        >
                          <span className="sg-meeting-pair">
                            <TraditionName tradition={meeting.traditions[0]} />
                            <span className="crossing-join" aria-hidden="true">
                              ·
                            </span>
                            <TraditionName tradition={meeting.traditions[1]} />
                          </span>
                          <span className="sg-meeting-bar" aria-hidden="true">
                            <span
                              style={{
                                inlineSize: `${(meeting.pairs / maxPairs) * 100}%`,
                                background: `linear-gradient(90deg, ${CAT_VAR[meeting.traditions[0]]}, ${CAT_VAR[meeting.traditions[1]]})`,
                              }}
                            />
                          </span>
                          <span className="sg-meeting-count">
                            {fmtNum(tFn(lang, 'sharedGroundMeetingPairs', meeting.pairs))}
                          </span>
                          {/* Through the same formatter the rows below use, and
                              on the reader's own units; a shared pin says so
                              rather than printing a distance the archive never
                              measured. */}
                          <span
                            className={
                              meeting.nearestSamePin
                                ? 'sg-meeting-nearest sg-meeting-nearest--same'
                                : 'sg-meeting-nearest'
                            }
                            title={
                              meeting.nearestSamePin ? t('sharedGroundSamePinHelp') : undefined
                            }
                          >
                            {t('sharedGroundNearestLabel')} ·{' '}
                            {meeting.nearestSamePin
                              ? t('sharedGroundSamePin')
                              : formatDistance(meeting.nearestM / 1000, units, lang, fmtNum, {
                                  style: 'apart',
                                  below: 'metres',
                                })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="sg-section" aria-labelledby="sg-crossings-heading">
              <h2 className="sg-section-heading" id="sg-crossings-heading">
                {t('sharedGroundPairsHeading')}
              </h2>
              <p className="sg-section-note">{t('sharedGroundStripNote')}</p>
              <CrossingStrip
                pairs={overview.crossTradition}
                selected={selected}
                onPoint={pointTo}
              />
              {selectedMeeting && (
                <div className="sg-filter-bar">
                  <span className="sg-meeting-pair">
                    <TraditionName tradition={selectedMeeting.traditions[0]} />
                    <span className="crossing-join" aria-hidden="true">
                      ·
                    </span>
                    <TraditionName tradition={selectedMeeting.traditions[1]} />
                  </span>
                  <button type="button" className="action-btn" onClick={() => setSelected(null)}>
                    {t('sharedGroundShowEvery')}
                  </button>
                </div>
              )}
              {/* Every row stays in the document; a chosen pair of traditions
                  hides the others rather than removing them, so the headline's
                  count and the rows' count stay the same number. */}
              <ul className="sg-crossings">
                {overview.crossTradition.map((pair) => {
                  const id = `crossing-${pair.a.id}-${pair.b.id}`;
                  return (
                    <Crossing
                      key={id}
                      pair={pair}
                      hidden={
                        selected !== null &&
                        meetingKey(pair.traditionA, pair.traditionB) !== selected
                      }
                      hot={hotPair === id}
                    />
                  );
                })}
              </ul>
              {/* Straight into the lens, not just the map: a reader who has
                  read forty crossings should land on the view that draws them,
                  and `?lens=` is in the URL precisely so this link can exist. */}
              <p className="sg-map-link">
                <Link to="/?lens=shared-ground">{t('sharedGroundToMap')}</Link>
              </p>
            </section>

            <section className="sg-section sg-method" aria-labelledby="sg-method-heading">
              <h2 className="sg-section-heading" id="sg-method-heading">
                {t('sharedGroundMethodHeading')}
              </h2>
              <p>{fmtNum(t('sharedGroundMethodRadius'))}</p>
              <p>{t('sharedGroundMethodStraight')}</p>
              <p>{fmtNum(t('sharedGroundMethodNoClusters'))}</p>
              <p>{t('sharedGroundMethodSamePin')}</p>
            </section>
          </>
        )}

        <SiteFooter />
      </article>
    </div>
  );
}
