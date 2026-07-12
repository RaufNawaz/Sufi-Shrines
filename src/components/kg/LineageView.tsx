import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { KGOrder, KGSaint } from '../../types/kg';

interface Props {
  order: KGOrder;
  members: KGSaint[];
  currentSlug?: string;
}

export function LineageView({ order, members, currentSlug }: Props) {
  const { lang, t } = useLang();
  const isOrderCurrent = order.slug === currentSlug;

  return (
    <div className="lineage-view" role="tree" aria-label={t('spiritualLineage')}>
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
  );
}
