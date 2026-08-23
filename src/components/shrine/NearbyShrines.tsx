import React from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { haversineKm, findNearbyShrines } from '../../lib/data/shrineModel';
import { SAME_PIN_THRESHOLD_M } from '../../lib/data/sharedGround';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { ShrineImage } from '../ui/ShrineImage';
import { IMAGE_WIDTH } from '../../lib/images/thumbnail';

interface Props {
  shrine: Shrine;
  all: Shrine[];
}

export function NearbyShrines({ shrine, all }: Props) {
  const { lang, t, localizeField, fmtNum } = useLang();

  const nearby = findNearbyShrines(shrine, all);
  if (nearby.length === 0) return null;

  return (
    <section
      className="related-shrines article-section"
      id="nearby"
      aria-labelledby="nearby-heading"
    >
      <h2 className="article-section-heading" id="nearby-heading">
        {t('nearbyShrines')}
      </h2>
      <div className="related-grid stagger-in">
        {nearby.map((s) => {
          const name = localizeShrineName(s, lang);
          const location = localizeField(s.raw, 'Location') || s.location;
          // findNearbyShrines only returns mapped candidates for a mapped
          // subject, so both ends exist here; TS can't see through it.
          const dist = haversineKm(shrine.latLng!, s.latLng!);

          return (
            <Link key={s.id} to={`/shrine/${s.slug}`} className="related-card">
              <ShrineImage
                src={s.imageUrl}
                alt={name}
                category={s.category}
                className="related-card-img"
                placeholderClassName="related-card-img-placeholder"
                loading="lazy"
                width={IMAGE_WIDTH.preview}
              />
              <div className="related-card-body">
                <div className="related-card-name">{name}</div>
                <div className="related-card-meta">
                  {/* Same as RelatedShrines: the Location column is often a
                      survey qualification in English, so <bdi> isolates it and
                      `data-latin` declares it. Two components render the same
                      card shape; fixing one and not the other is how the leak
                      survived. */}
                  {location && (
                    <span data-latin>
                      <bdi>{location}</bdi> ·{' '}
                    </span>
                  )}
                  {/* "< 1 km" covered everything from a shared pin to 900 m.
                      Metres below a kilometre, and for two records that share a
                      recorded position, no distance at all — every
                      identical-pin group in this data is a documented
                      approximation, and printing a number for it would present
                      the archive's uncertainty as a measurement. */}
                  {dist * 1000 <= SAME_PIN_THRESHOLD_M ? (
                    <span title={t('sharedGroundSamePinHelp')}>{t('sharedGroundSamePin')}</span>
                  ) : dist < 1 ? (
                    <span>
                      {fmtNum(Math.round(dist * 1000))} {t('distanceMetres')}
                    </span>
                  ) : (
                    <span>
                      {fmtNum(Math.round(dist))} {t('distanceKm')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
