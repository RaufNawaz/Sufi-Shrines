import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { buildAlmanac, type AlmanacEntry } from '../../lib/data/almanac';
import { buildIcs, isCalendarable } from '../../lib/data/almanacIcs';
import { downloadIcsFile } from '../../lib/data/icsDownload';
import { observanceDateDisplay } from '../../lib/i18n/observanceDates';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';
import { useTeamAccess } from '../../lib/projectAccess';

interface Props {
  shrine: Shrine;
}

/**
 * The shrine's own slice of the Urs Almanac, on its page. The infobox already
 * shows the raw Events text; this block adds what the almanac machinery can
 * *compute* from it — the next projected window, at the precision the data
 * actually has. A Hijri projection is flagged approximate, exactly as on
 * /almanac (RULE 2 applies to calendars too). Renders nothing when the
 * archive records no observance — a quiet absence, not an empty box.
 */
export function ShrineObservances({ shrine }: Props) {
  const { lang, t, fmtNum } = useLang();

  const dated: AlmanacEntry[] = useMemo(() => buildAlmanac([shrine], new Date()).dated, [shrine]);
  const next = dated[0] ?? null;
  /* Above the early return: hooks run in the same order on every render, and
     this component returns null for a shrine with no dated observance. */
  const { calendar } = useReaderPreferences();
  /* The per-date "approximate" pill is team-facing since 11 September 2026
     (same rule as the calendar page); the public reads the projected dates and
     the calendar page's single moon-sighting caveat. */
  const showFlags = useTeamAccess();

  if (!next) return null;

  const downloadShrineIcs = () => {
    // All of this shrine's projected windows in the horizon — a Hijri urs
    // can genuinely fall twice in one Gregorian year, and the reader's
    // calendar should carry both. The approximation warnings travel inside
    // the file (see almanacIcs.ts).
    const ics = buildIcs(dated, {
      lang,
      baseUrl: `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, ''),
      now: new Date(),
    });
    downloadIcsFile(ics, `urs-${shrine.slug}.ics`);
  };

  // `window` renamed on destructure: the DateWindow would otherwise shadow
  // globalThis.window inside downloadShrineIcs above.
  const { observance, window: dateWindow, approximate } = next;
  /* Same formatter as the almanac's card, on purpose: this panel and that card
     print the same pair of dates, and the reason the decision is centralised is
     that a reimplemented pair is how one of them loses the approximate flag. */
  const dates = observanceDateDisplay(observance, dateWindow, approximate, lang, fmtNum, calendar);

  return (
    <aside
      className="shrine-observances"
      id="observances"
      aria-labelledby="shrine-observances-heading"
    >
      <h2 id="shrine-observances-heading" className="shrine-observances-heading">
        {t('obsHeading')}
      </h2>
      <p className="shrine-observances-next">
        <span className="shrine-observances-date">
          <bdi>{dates.lead}</bdi>
        </span>
        {dates.calendarNoteOn === 'lead' && (
          <span className="almanac-entry-calendar"> ({t('almanacHijriLabel')})</span>
        )}
        {showFlags && dates.leadIsProjection && (
          <span
            className="almanac-flag almanac-flag--approximate"
            title={t('almanacApproximateFull')}
          >
            {t('almanacApproximate')}
          </span>
        )}
      </p>
      <p className="shrine-observances-source">
        {t(dates.secondaryLabelKey)}: <bdi>{dates.secondary}</bdi>
        {dates.calendarNoteOn === 'secondary' && (
          <span className="almanac-entry-calendar"> ({t('almanacHijriLabel')})</span>
        )}
        {showFlags && dates.secondaryIsProjection && (
          <span
            className="almanac-flag almanac-flag--approximate"
            title={t('almanacApproximateFull')}
          >
            {t('almanacApproximate')}
          </span>
        )}
      </p>
      {/* The public reads projected dates without the per-date pill, and the
          calendar page's caveat explaining them was a page away — so this
          panel printed "14 March" for a day nobody can know in advance
          (epistemic council, 17 October 2026). The team sees the pills. */}
      {!showFlags && (dates.leadIsProjection || dates.secondaryIsProjection) && (
        <p className="shrine-observances-caveat">{t('obsProjectedCaveat')}</p>
      )}
      <div className="shrine-observances-actions">
        {/* Only when there is a day to put in a calendar: a month-only or
            rule-based observance downloaded as an empty file. */}
        {dated.some(isCalendarable) && (
          <button type="button" className="action-btn" onClick={downloadShrineIcs}>
            {t('almanacDownloadIcs')}
          </button>
        )}
        <Link className="shrine-observances-link" to={`/almanac#${shrine.slug}`}>
          {t('obsViewAlmanac')}
        </Link>
      </div>
    </aside>
  );
}

/**
 * The next computed date, for the infobox's Events row. "When is the ʿurs?" was
 * answered by the panel above, which sits after the whole article — 12.9 phone
 * screens down on Data Darbar, 21.9 in Urdu — while the infobox showed only
 * "Annual urs (18-20 Safar)", which a reader on the Gregorian calendar cannot
 * turn into a day (calendar council, 17 October 2026). One line, marked when it
 * is a projection, linking down to the panel with the caveat and the calendar
 * button.
 */
export function NextObservanceLine({ shrine }: Props) {
  const { lang, t, fmtNum } = useLang();
  const { calendar } = useReaderPreferences();
  const teamView = useTeamAccess();
  const next = useMemo(() => buildAlmanac([shrine], new Date()).dated[0] ?? null, [shrine]);
  if (!next) return null;
  const dates = observanceDateDisplay(
    next.observance,
    next.window,
    next.approximate,
    lang,
    fmtNum,
    calendar,
  );
  return (
    <a href="#observances" className="infobox-next-observance">
      {t('obsNextLabel')}: <bdi>{dates.lead}</bdi>
      {/* The pill is the team's (11 September 2026 ruling); the public reads
          the caveat on the panel this links to. */}
      {teamView && dates.leadIsProjection && <> ({t('almanacApproximate')})</>}
    </a>
  );
}
