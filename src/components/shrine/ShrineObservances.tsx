import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { buildAlmanac, type AlmanacEntry } from '../../lib/data/almanac';
import { formatDateWindow, formatSourceDate } from '../../lib/i18n/formatDateWindow';

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

  const next: AlmanacEntry | null = useMemo(() => {
    const almanac = buildAlmanac([shrine], new Date());
    return almanac.dated[0] ?? null;
  }, [shrine]);

  if (!next) return null;

  const { observance, window, approximate } = next;
  const monthOnly = observance.precision === 'month';

  return (
    <aside className="shrine-observances" aria-labelledby="shrine-observances-heading">
      <h2 id="shrine-observances-heading" className="shrine-observances-heading">
        {t('obsHeading')}
      </h2>
      <p className="shrine-observances-next">
        <span className="shrine-observances-date">
          {formatDateWindow(window, lang, fmtNum, { monthOnly })}
        </span>
        {approximate && (
          <span
            className="almanac-flag almanac-flag--approximate"
            title={t('almanacApproximateFull')}
          >
            {t('almanacApproximate')}
          </span>
        )}
      </p>
      <p className="shrine-observances-source">
        {t('almanacSourceLabel')}:{' '}
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
      </p>
      <Link className="shrine-observances-link" to={`/almanac#${shrine.slug}`}>
        {t('obsViewAlmanac')}
      </Link>
    </aside>
  );
}
