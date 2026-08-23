import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { findSharedGround } from '../../lib/data/sharedGround';
import { categoryDisplayLabel } from '../../lib/data/categoryKey';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';

/**
 * The sites standing within walking distance of this one — and how many belong
 * to another tradition.
 *
 * This archive documents six traditions and, until now, showed each site as an
 * island. Its own coordinates say otherwise: 62 of 169 sites are within 800 m
 * of another, and in eight places the neighbour belongs to a different
 * tradition. Data Darbar is 222 m from Gurdwara Chowmala Sahib. Dargah Pir
 * Ratan Nath is 100 m from Gurdwara Bhai Beba Singh, 208 m from Panj Tirath and
 * 411 m from the Gorakhnath Temple. For much of Punjab and Sindh that adjacency
 * *is* the heritage. See `docs/planning/SHARED_GROUND_VISION.md`.
 *
 * Distinct from `NearbyShrines`, which lists the five nearest sites wherever
 * they are. This section appears only when there is genuinely shared ground,
 * and it is about the traditions rather than the distances.
 */
export function SharedGround({ shrine, all }: { shrine: Shrine; all: Shrine[] }) {
  const { lang, t, fmtNum } = useLang();

  const { neighbours, otherTraditions } = useMemo(
    () => findSharedGround(shrine, all),
    [shrine, all],
  );

  if (neighbours.length === 0) return null;

  const intro =
    otherTraditions.length > 0
      ? tFn(
          lang,
          'sharedGroundIntro',
          neighbours.length,
          neighbours.filter((n) => n.otherTradition).length,
        )
      : tFn(lang, 'sharedGroundIntroSame', neighbours.length);

  return (
    <section
      className="article-section shared-ground"
      id="shared-ground"
      aria-labelledby="shared-ground-heading"
    >
      <h2 className="article-section-heading" id="shared-ground-heading">
        {t('sharedGroundHeading')}
      </h2>
      <p className="shared-ground-intro">{fmtNum(intro)}</p>

      <ul className="shared-ground-list">
        {neighbours.map((n) => {
          const label = categoryDisplayLabel(n.shrine.category, lang) ?? n.shrine.category;
          return (
            <li
              key={n.shrine.id}
              className={`shared-ground-item${n.otherTradition ? ' shared-ground-item--other' : ''}`}
            >
              <Link to={`/shrine/${n.shrine.slug}`} className="shared-ground-name">
                {/* <bdi> because a name the dictionary has no entry for falls
                    back to Latin, and an unwrapped Latin run inside the RTL
                    page reorders the punctuation around it. */}
                <bdi>{localizeShrineName(n.shrine, lang)}</bdi>
              </Link>
              <span className={`shared-ground-tradition shared-ground-tradition--${n.tradition}`}>
                {label}
              </span>
              {/* A distance the archive did not measure must never be shown as
                  one it did. Every identical-pin group in this data is a
                  documented approximation — the four Miani Sahib darbars share
                  a pin because the survey gives no position within the
                  graveyard. */}
              {n.samePin ? (
                <span
                  className="shared-ground-distance shared-ground-distance--same"
                  title={t('sharedGroundSamePinHelp')}
                >
                  {t('sharedGroundSamePin')}
                </span>
              ) : (
                <span className="shared-ground-distance">
                  {fmtNum(n.distanceM)} {t('distanceMetres')}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="shared-ground-note">{fmtNum(t('sharedGroundNote'))}</p>
    </section>
  );
}
