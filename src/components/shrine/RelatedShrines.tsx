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
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt={name}
                  className="related-card-img"
                  loading="lazy"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'related-card-img-placeholder';
                    el.parentElement?.insertBefore(placeholder, el);
                  }}
                />
              ) : (
                <div className="related-card-img-placeholder" aria-hidden="true">
                  <svg className="related-card-img-placeholder-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5l-1.5 3H8a.5.5 0 0 0 0 1h.5v2.3C6.3 8.5 5 10.4 5 12.5h14c0-2.1-1.3-4-3.5-4.7V5.5H16a.5.5 0 0 0 0-1h-2.5L12 1.5zM5.5 14v7h13v-7h-13zm4 2.5h5v2.5h-5V16.5z" />
                  </svg>
                </div>
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
