import React from 'react';
import { Link } from 'react-router-dom';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { haversineKm, findRelatedShrines } from '../../lib/data/shrineModel';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { ShrineImage } from '../ui/ShrineImage';
import { IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { formatDistance } from '../../lib/i18n/formatDistance';
import { useReaderPreferences } from '../../lib/preferences/ReaderPreferencesContext';
import { publicLocation } from '../../lib/data/publicLocation';
import { useTeamAccess } from '../../lib/projectAccess';
import type { Lang } from '../../types/shrine';

interface Props {
  shrine: Shrine;
  all: Shrine[];
}

export function RelatedShrines({ shrine, all }: Props) {
  const { lang, t, localizeField, fmtNum } = useLang();
  const { units } = useReaderPreferences();
  const teamView = useTeamAccess();

  const related = findRelatedShrines(shrine, all);
  if (related.length === 0) return null;

  return (
    <section
      className="related-shrines article-section"
      id="related"
      aria-labelledby="related-heading"
    >
      <h2 className="article-section-heading" id="related-heading">
        {t('relatedShrines')}
      </h2>
      <div className="related-grid stagger-in">
        {related.map((s) => {
          const name = localizeShrineName(s, lang);
          /* A place name for the public, as every other list of sites shows
             it (publicLocation.ts): the raw cell can be a sixty-word survey
             note, which reached the card verbatim — English prose under an
             Urdu name, read out in full as part of the link (a11y council,
             17 October 2026). The team keeps the cell. */
          const rawLocation = localizeField(s.raw, 'Location') || s.location;
          const location = teamView ? rawLocation : publicLocation(rawLocation, s, lang as Lang);
          const dist = shrine.latLng && s.latLng ? haversineKm(shrine.latLng, s.latLng) : null;

          return (
            <Link key={s.id} to={`/shrine/${s.slug}`} className="related-card hover-lift">
              <ShrineImage
                src={s.imageUrl}
                /* Empty: the name follows inside the same link, and said
                   twice it was the start of every card's accessible name. */
                alt=""
                category={s.category}
                className="related-card-img"
                placeholderClassName="related-card-img-placeholder"
                loading="lazy"
                width={IMAGE_WIDTH.preview}
              />
              <div className="related-card-body">
                <div className="related-card-name">{name}</div>
                <div className="related-card-meta">
                  {/* The Location column often carries a survey qualification
                      rather than a place name, still in English. <bdi> isolates
                      the Latin run inside the RTL card; `data-latin` declares it
                      as untranslated source text so the no-leak guard counts it
                      as debt rather than passing it silently. */}
                  {location && (
                    <span data-latin>
                      <bdi>{location}</bdi>
                      {dist !== null && ' · '}
                    </span>
                  )}
                  {dist !== null && (
                    <span>
                      {formatDistance(dist, units, lang, fmtNum, {
                        style: 'away',
                        below: 'lessThanOne',
                      })}
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
