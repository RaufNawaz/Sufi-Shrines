import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { primaryFigureSlug } from '../../lib/kgShrineFigures';
import { formatDateWindow, formatSourceDate } from '../../lib/i18n/formatDateWindow';
import type { AlmanacEntry } from '../../lib/data/almanac';
import type { Lang } from '../../types/shrine';

/**
 * One observance, as the almanac shows it: what we computed on the left, what
 * the archive recorded underneath, and the caveat that separates the two.
 *
 * Lifted out of `AlmanacPage` when the calendar view arrived, because a second
 * surface listing the same observances must show the same provenance — a
 * reimplemented card is how one of them quietly loses the "approximate" flag
 * (HANDOVER §9.85 is this failure in another place).
 */
export function ObservanceCard({
  entry,
  lang,
  anchorId,
  index = 0,
}: {
  entry: AlmanacEntry;
  lang: Lang;
  /** Set on a shrine's first card in the year listing so /almanac#<slug>
   * (the link on the shrine page) lands here. */
  anchorId?: string | undefined;
  /** Position in its list, for the entrance stagger. */
  index?: number;
}) {
  const { t, fmtNum, localizeField } = useLang();
  const { shrine, observance, window, approximate } = entry;
  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const monthOnly = observance.precision === 'month';
  // An ʿurs is a death anniversary, so the figure it commemorates is the point
  // of the entry — and now that the knowledge graph is populated, the reader
  // can go straight from "whose ʿurs is this week" to that figure's lineage
  // and order. The name comes from the sheet (the reader's own language via
  // localizeField); only the link target comes from the graph, via the 11 KB
  // shrine → figure index rather than the whole graph (see kgShrineFigures.ts).
  const figureName = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const figureSlug = primaryFigureSlug(shrine.slug);

  return (
    <li
      className="almanac-entry reveal-rise"
      id={anchorId}
      style={{ '--stagger-index': index } as React.CSSProperties}
    >
      <div className="almanac-entry-date">
        <span className="almanac-entry-date-main">
          {formatDateWindow(window, lang, fmtNum, { monthOnly })}
        </span>
        {approximate ? (
          <span
            className="almanac-flag almanac-flag--approximate"
            title={t('almanacApproximateFull')}
          >
            {t('almanacApproximate')}
          </span>
        ) : null}
      </div>

      <div className="almanac-entry-body">
        <h3 className="almanac-entry-name">
          <Link to={`/shrine/${shrine.slug}`}>
            <bdi>{localizeShrineName(shrine, lang)}</bdi>
          </Link>
        </h3>
        {location ? (
          /* The CSS clamps this to two lines because several field-survey rows
             carry a paragraph of qualification in the Location column rather
             than a place name. `title` is what makes the clamped remainder
             reachable — without it the qualification, which is the honest part,
             was simply unreadable.

             `data-latin` declares the element, not just its visible run. That
             prose is the survey's own wording and is often still English;
             <bdi> says so for the text, and the same string is repeated in
             `title` where <bdi> cannot reach. The accessible-name guard reads
             `data-latin`, so the attribute has to declare itself the way the
             text already does — otherwise that guard either misses every
             untranslated tooltip or fails on all of them. */
          <p className="almanac-entry-location" title={location} data-latin>
            <bdi>{location}</bdi>
          </p>
        ) : null}

        {figureName ? (
          <p className="almanac-entry-figure">
            <span className="almanac-entry-source-label">{t('almanacFigureLabel')}: </span>
            {figureSlug ? (
              <Link to={`/saint/${figureSlug}`}>
                <bdi>{figureName}</bdi>
              </Link>
            ) : (
              <bdi>{figureName}</bdi>
            )}
          </p>
        ) : null}

        {/* What the archive actually recorded, always shown beside what we
            computed from it — the reader can check our arithmetic. */}
        <p className="almanac-entry-source">
          <span className="almanac-entry-source-label">{t('almanacSourceLabel')}: </span>
          <bdi>
            {formatSourceDate(
              observance.calendar,
              observance.month,
              observance.monthEnd,
              observance.dayStart,
              observance.dayEnd,
              lang,
              fmtNum,
            )}
          </bdi>
          {observance.calendar === 'hijri' ? (
            <span className="almanac-entry-calendar"> ({t('almanacHijriLabel')})</span>
          ) : null}
        </p>

        {observance.ruleBased ? (
          <p className="almanac-entry-caveat">{t('almanacRule')}</p>
        ) : monthOnly ? (
          <p className="almanac-entry-caveat">{t('almanacMonthOnly')}</p>
        ) : null}
      </div>
    </li>
  );
}
