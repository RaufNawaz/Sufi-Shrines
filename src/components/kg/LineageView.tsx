import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { KGOrder, KGSaint } from '../../types/kg';
import type { LineageLink } from '../../lib/kg';

interface Props {
  order: KGOrder | undefined;
  members: KGSaint[];
  currentSlug?: string;
  /** This saint's recorded teacher(s)/predecessor(s), hand-sourced from
   * shrine_entries/ — see data/kg-seeds.json#lineageRelations. */
  teachers?: LineageLink[];
  /** Saints recorded as this saint's disciple/successor. */
  disciples?: LineageLink[];
}

function LineageLinkItem({ link }: { link: LineageLink }) {
  const { lang, t } = useLang();
  const saint = link.saint;
  const relationLabel = t(
    link.relation === 'successor_of' ? 'successorOfLabel' : 'discipleOfLabel',
  );

  return (
    <li className="lineage-relation-item">
      <Link to={`/saint/${saint.slug}`} lang={lang === 'ur' && saint.nameUr ? 'ur' : undefined}>
        {lang === 'ur' && saint.nameUr ? saint.nameUr : saint.name}
      </Link>
      <span className="lineage-relation-tag">{relationLabel}</span>
    </li>
  );
}

export function LineageView({ order, members, currentSlug, teachers, disciples }: Props) {
  const { lang, t } = useLang();
  const isOrderCurrent = order?.slug === currentSlug;

  return (
    <div className="lineage-view">
      {teachers && teachers.length > 0 && (
        <div className="lineage-chain-section">
          <h3 className="lineage-chain-heading">{t('teachersHeading')}</h3>
          <ul className="lineage-relation-list">
            {teachers.map((link) => (
              <LineageLinkItem key={link.saint.slug} link={link} />
            ))}
          </ul>
        </div>
      )}

      {order && (
        <div role="tree" aria-label={t('spiritualLineage')}>
          <div className="lineage-root" role="treeitem" aria-expanded="true">
            <Link
              to={`/order/${order.slug}`}
              className={`lineage-node${isOrderCurrent ? ' lineage-node--current' : ''}`}
              aria-current={isOrderCurrent ? 'page' : undefined}
            >
              {order.name}
              {order.arabicName && (
                <span className="lineage-node-alt" lang="ar">
                  {order.arabicName}
                </span>
              )}
            </Link>
          </div>

          {members.length > 0 && (
            <ul className="lineage-members" role="group">
              {members.map((saint) => {
                const isCurrent = saint.slug === currentSlug;
                return (
                  <li
                    key={saint.slug}
                    role="treeitem"
                    className={`lineage-member${isCurrent ? ' lineage-member--current' : ''}`}
                  >
                    <Link
                      to={`/saint/${saint.slug}`}
                      aria-current={isCurrent ? 'page' : undefined}
                      lang={lang === 'ur' && saint.nameUr ? 'ur' : undefined}
                    >
                      {lang === 'ur' && saint.nameUr ? saint.nameUr : saint.name}
                      {saint.altNames?.[0] && (
                        <span className="lineage-member-alt">{saint.altNames[0]}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {disciples && disciples.length > 0 && (
        <div className="lineage-chain-section">
          <h3 className="lineage-chain-heading">{t('disciplesHeading')}</h3>
          <ul className="lineage-relation-list">
            {disciples.map((link) => (
              <LineageLinkItem key={link.saint.slug} link={link} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
