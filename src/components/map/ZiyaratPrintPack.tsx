import React, { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { categoryDisplayLabel } from '../../lib/data/categoryKey';
import { buildAlmanac } from '../../lib/data/almanac';
import { formatDateWindow } from '../../lib/i18n/formatDateWindow';
import type { Lang } from '../../types/shrine';

interface Props {
  /** The reader's saved shrines, in list order. */
  shrines: Shrine[];
}

/**
 * The printable half of the ziyarat list (blue-sky item F6): hidden on
 * screen, it becomes the whole page under @media print via the same
 * :has-scoped visibility pattern as the tour itinerary (tours.css). One
 * entry per saved shrine — name, place, category, coordinates (Western
 * digits by the numerals rule), and the next projected observance window
 * where the archive can compute one, approximate flag included (RULE 2
 * applies on paper too).
 */
export function ZiyaratPrintPack({ shrines }: Props) {
  const { lang, t, fmtNum, localizeField } = useLang();

  const nextWindows = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of shrines) {
      const next = buildAlmanac([s], new Date()).dated[0];
      if (!next) continue;
      const monthOnly = next.observance.precision === 'month';
      const when = formatDateWindow(next.window, lang as Lang, fmtNum, { monthOnly });
      map.set(s.id, next.approximate ? `${when} (${t('almanacApproximate')})` : when);
    }
    return map;
  }, [shrines, lang, fmtNum, t]);

  return (
    <div className="ziyarat-print-pack">
      <h1>{t('ziyaratPackTitle')}</h1>
      <p>{t('ziyaratPackNote')}</p>
      <ol>
        {shrines.map((s) => {
          const location = localizeField(s.raw, 'Location') || s.location;
          const category = categoryDisplayLabel(s.category, lang as Lang) ?? s.category;
          const when = nextWindows.get(s.id);
          return (
            <li key={s.id}>
              <h2>{localizeShrineName(s, lang)}</h2>
              <p>
                {location && <span>{location} · </span>}
                <span>{category}</span>
              </p>
              {/* Coordinates stay Western digits in every language;
                  unmapped rows print without a coordinate line. */}
              {s.latLng && (
                <p className="ziyarat-print-coords">
                  <bdi>
                    {s.latLng.lat.toFixed(4)}, {s.latLng.lng.toFixed(4)}
                  </bdi>
                </p>
              )}
              {when && (
                <p>
                  {t('obsHeading')}: {when}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
