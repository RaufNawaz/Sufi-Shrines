import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { formatSourceDate, SEASON_LABEL_KEYS } from '../../lib/i18n/formatDateWindow';
import { localizeObservance } from '../../lib/i18n/localizeObservance';
import { isRtlLang } from '../../lib/i18n/languages';
import type { Observance } from '../../lib/data/ursDates';
import type { KGEvent } from '../../types/kg';

/** Only where the record states one. 85 of the 149 events do; the other 64 are
 * absent rather than assumed annual — that assumption once published
 * `repeatFrequency: P1Y` for 83 events on no evidence (see KGEvent.frequency). */
const FREQUENCY_KEYS = {
  annual: 'orderUrsAnnual',
  monthly: 'orderUrsMonthly',
  biannual: 'orderUrsBiannual',
} as const satisfies Record<NonNullable<KGEvent['frequency']>, string>;

export interface RecordedObservanceRow {
  /** Stable list key — the (figure, event) pair, since one figure can hold
   * several observances and one observance can sit under several figures. */
  key: string;
  /** The figure this commemorates. Omitted on a page that already is that
   * figure; a row would otherwise repeat the name in the heading above it. */
  figure?: { slug: string; name: string } | undefined;
  /** True when the edge that put this row on this page has not been read by a
   * human. Order membership is the usual one — 44 of 64 are machine-read. */
  unreviewed?: boolean | undefined;
  shrineSlug?: string | undefined;
  /** Already localized by the caller, which holds the shrine dataset. */
  shrineLabel?: string | undefined;
  /** The shrine's `Events` cell, verbatim. */
  recorded: string;
  dates: Observance[];
  frequency?: KGEvent['frequency'] | undefined;
}

/**
 * One observance date, in the words the archive used for it.
 *
 * The almanac's cards carry an "approximate" flag because they print a
 * *projected* Gregorian date that moves with the moon sighting. This list
 * projects nothing — it prints the month and day the source wrote, in the
 * reader's script and numerals — so there is no forecast here to qualify. The
 * Hijri label stays, because which calendar a date is in is part of the date.
 */
function RecordedDate({ observance }: { observance: Observance }) {
  const { lang, t, fmtNum } = useLang();

  /* Six observances in the archive record a season and no month. This refuses
     to turn "spring" into a month for the same reason `centurySpan` refuses to
     place an undated figure on an axis. */
  if (observance.precision === 'season') {
    return observance.season ? <>{t(SEASON_LABEL_KEYS[observance.season])}</> : null;
  }

  const text = formatSourceDate(
    observance.calendar,
    observance.month,
    observance.monthEnd,
    observance.dayStart,
    observance.dayEnd,
    lang,
    fmtNum,
  );
  if (!text) return null;

  return (
    <>
      {text}
      {observance.calendar === 'hijri' && (
        <span className="order-urs-calendar"> ({t('almanacHijriLabel')})</span>
      )}
    </>
  );
}

/**
 * The archive's observances as recorded, for any page that has joined its way to
 * some.
 *
 * Shared by `/order/:slug` (its members' ʿurs) and `/saint/:slug` (the days kept
 * for one figure) on the same argument that moved `ObservanceCard` out of
 * `AlmanacPage`: two surfaces showing the same records must show the same
 * provenance, and a reimplemented row is how one of them quietly loses the
 * "date not recorded" that is the honest half of this feature.
 */
export function RecordedObservanceList({ rows }: { rows: RecordedObservanceRow[] }) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  if (rows.length === 0) return null;

  return (
    <ul className="order-urs-list">
      {rows.map((row, i) => (
        <li
          key={row.key}
          className="order-urs-row reveal-rise"
          style={{ '--stagger-index': i } as React.CSSProperties}
        >
          <div className="order-urs-figure">
            {row.figure ? (
              <Link to={`/saint/${row.figure.slug}`}>{fmtNum(row.figure.name)}</Link>
            ) : (
              /* No figure named, so the shrine is the row's subject. */
              row.shrineSlug &&
              row.shrineLabel && (
                <Link to={`/shrine/${row.shrineSlug}`}>
                  {isRtl && /[A-Za-z]/.test(row.shrineLabel) ? (
                    <bdi data-latin>{row.shrineLabel}</bdi>
                  ) : (
                    row.shrineLabel
                  )}
                </Link>
              )
            )}
            {/* The edge, not the observance, is what is unread — and it is the
                edge that put this row on this page, so the row carries its
                marking. */}
            {row.unreviewed && (
              <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                {t('lineageUnreviewed')}
              </span>
            )}
          </div>

          <div className="order-urs-when">
            {row.dates.length > 0 ? (
              row.dates.map((observance, j) => (
                <span key={`${observance.sourceText}:${j}`} className="order-urs-date">
                  <RecordedDate observance={observance} />
                </span>
              ))
            ) : (
              <span className="order-urs-date order-urs-date--none">{t('orderUrsNoDate')}</span>
            )}
            {row.frequency && (
              <span className="order-urs-frequency">{t(FREQUENCY_KEYS[row.frequency])}</span>
            )}
          </div>

          {/* The cell the dates above were read out of, so the reader can check
              the reading — the almanac's own convention. Semicolon-joined, so
              localizeObservance translates it segment by segment and leaves an
              unknown segment exactly as written; `data-latin` declares whatever
              is left as debt rather than letting it pass as Urdu. */}
          {row.recorded && (
            <p className="order-urs-recorded" data-latin>
              <span className="order-urs-recorded-label">{t('almanacSourceLabel')}: </span>
              <bdi>{fmtNum(localizeObservance(row.recorded, lang))}</bdi>
            </p>
          )}

          {/* Pills, not inline links: this row is Urdu half the time, an
              underline runs through Nastaliq descenders, and colour alone is
              not a link (a11y rule; the lesson is recorded on OrderPage's
              "Also in" row). */}
          <div className="order-urs-links">
            {/* Where the figure is the row's subject, the shrine still needs a
                way in; where the shrine is the subject it is already the title
                above, so it is not repeated. */}
            {row.figure && row.shrineSlug && row.shrineLabel && (
              <Link to={`/shrine/${row.shrineSlug}`} className="entity-saint-shrine-tag">
                {isRtl && /[A-Za-z]/.test(row.shrineLabel) ? (
                  <bdi data-latin>{row.shrineLabel}</bdi>
                ) : (
                  row.shrineLabel
                )}
              </Link>
            )}
            {/* The almanac anchors its year listing on the shrine slug, but only
                for a shrine it could actually place — so an undated row links to
                the page and not to an id that is not there. */}
            <Link
              to={
                row.dates.length > 0 && row.shrineSlug ? `/almanac#${row.shrineSlug}` : '/almanac'
              }
              className="entity-saint-shrine-tag"
            >
              {t('saintNextUrsLink')}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The gap, named. Its own component so both pages phrase it identically. */
export function ObservanceGapNote({ rows }: { rows: RecordedObservanceRow[] }) {
  const { lang, fmtNum } = useLang();
  // Counted here rather than exported as a helper: a component module that also
  // exports functions breaks fast refresh for every consumer of it.
  const undated = rows.filter((row) => row.dates.length === 0).length;
  if (undated === 0) return null;
  return <p className="order-urs-gap">{fmtNum(tFn(lang, 'orderUrsUndatedCount', undated))}</p>;
}
