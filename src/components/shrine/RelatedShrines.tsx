import React from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { haversineKm, findRelatedShrines } from '../../lib/data/shrineModel';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { ShrineImage } from '../ui/ShrineImage';

interface Props {
  shrine: Shrine;
  all: Shrine[];
}

export function RelatedShrines({ shrine, all }: Props) {
  const { lang, t, localizeField, fmtNum } = useLang();

  const related = findRelatedShrines(shrine, all);
  if (related.length === 0) return null;

  return (
    <section className="related-shrines article-section" id="related" aria-labelledby="related-heading">
      <h2 className="article-section-heading" id="related-heading">
        {t('relatedShrines')}
      </h2>
      <div className="related-grid">
        {related.map((s) => {
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
              />
              <div className="related-card-body">
                <div className="related-card-name">{name}</div>
                <div className="related-card-meta">
                  {location && <span>{location} · </span>}
                  <span>{dist < 1 ? fmtNum('< 1') : fmtNum(Math.round(dist))} {t('distanceKm')}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
