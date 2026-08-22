import React, { useEffect, useState } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import {
  fetchMosques,
  nearbyMosques,
  mosquePageUrl,
  type NearbyMosque,
} from '../../lib/data/mosques';

interface Props {
  shrine: Shrine;
}

/**
 * The shrine's nearby Auqaf mosques, from the companion mosque survey
 * (raufnawaz/Awqaf) — built for one question a pilgrim actually asks:
 * where can women pray? Every line is the survey's answer, attributed as
 * such; distance is the only computed fact. Renders nothing while loading,
 * on fetch failure, or when the survey has nothing within range — a quiet
 * absence, not an empty box.
 */
export function NearbyMosques({ shrine }: Props) {
  const { lang, t, fmtNum } = useLang();
  const [entries, setEntries] = useState<NearbyMosque[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMosques().then((mosques) => {
      if (!cancelled) setEntries(nearbyMosques(shrine, mosques));
    });
    return () => {
      cancelled = true;
    };
  }, [shrine]);

  if (!entries || entries.length === 0) return null;

  const womensLabel = (value: string): string => {
    if (!value) return t('mosquesNotRecorded');
    if (value.toLowerCase() === 'yes') return t('mosquesYes');
    if (value.toLowerCase() === 'no') return t('mosquesNo');
    return value; // free-text survey answer, verbatim
  };

  return (
    <section
      className="nearby-mosques article-section"
      id="mosques"
      aria-labelledby="mosques-heading"
    >
      <h2 className="article-section-heading" id="mosques-heading">
        {t('mosquesHeading')}
      </h2>
      <p className="nearby-mosques-source">{t('mosquesSource')}</p>
      <ul className="nearby-mosques-list">
        {entries.map(({ mosque, distanceKm, isShrinesMosque }) => {
          const womens = womensLabel(mosque.womensPrayerSection);
          const womensIsLatin = /[A-Za-z]/.test(womens);
          return (
            <li key={mosque.id} className="nearby-mosque">
              <div className="nearby-mosque-name">
                {/* Survey names are English source data — sanctioned Latin
                    in the Urdu view, isolated like other source strings. */}
                <a href={mosquePageUrl(mosque)} target="_blank" rel="noopener noreferrer">
                  <bdi lang={lang === 'ur' ? 'en' : undefined}>{mosque.name}</bdi>
                </a>
                {isShrinesMosque && <span className="nearby-mosque-own">{t('mosquesOwn')}</span>}
              </div>
              <div className="nearby-mosque-meta">
                {mosque.city && (
                  <span>
                    <bdi lang={lang === 'ur' ? 'en' : undefined}>{mosque.city}</bdi> ·{' '}
                  </span>
                )}
                <span>
                  {distanceKm < 1 ? fmtNum('< 1') : fmtNum(Math.round(distanceKm * 10) / 10)}{' '}
                  {t('distanceKm')}
                </span>
              </div>
              <div className="nearby-mosque-womens">
                {t('mosquesWomens')}:{' '}
                {womensIsLatin && lang === 'ur' ? <bdi lang="en">{womens}</bdi> : womens}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
