import React from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { haversineKm, findRelatedShrines } from '../../lib/data/shrineModel';
import { getUrduFieldValue } from '../../lib/data/fieldAliasing';
import { translateToUrdu } from '../../lib/i18n/urduFallback';

interface Props {
  shrine: Shrine;
  all: Shrine[];
}

export function RelatedShrines({ shrine, all }: Props) {
  const { lang, t, localizeField } = useLang();

  const related = findRelatedShrines(shrine, all);
  if (related.length === 0) return null;

  return (
    <section className="related-shrines article-section" id="related" aria-labelledby="related-heading">
      <h2 className="article-section-heading" id="related-heading">
        {t('relatedShrines')}
      </h2>
      <div className="related-grid">
        {related.map((s) => {
          const name =
            lang === 'ur'
              ? getUrduFieldValue(s.raw, 'Name') || translateToUrdu(s.name)
              : s.name;
          const location = localizeField(s.raw, 'Location') || s.location;
          const dist = haversineKm(shrine.latLng, s.latLng);

          return (
            <Link key={s.id} to={`/shrine/${s.slug}`} className="related-card">
              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt={name}
                  className="related-card-img"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="related-card-body">
                <div className="related-card-name">{name}</div>
                <div className="related-card-meta">
                  {location && <span>{location} · </span>}
                  <span>{dist < 1 ? '< 1' : Math.round(dist)} {t('distanceKm')}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
