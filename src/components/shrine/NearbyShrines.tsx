import React from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { haversineKm, findNearbyShrines } from '../../lib/data/shrineModel';
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
      <div className="related-grid">
        {nearby.map((s) => {
          const name = localizeShrineName(s, lang);
          const location = localizeField(s.raw, 'Location') || s.location;
          const dist = haversineKm(shrine.latLng, s.latLng);

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
                  {location && <span>{location} · </span>}
                  <span>
                    {dist < 1 ? fmtNum('< 1') : fmtNum(Math.round(dist))} {t('distanceKm')}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
