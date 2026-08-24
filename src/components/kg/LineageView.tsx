import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { KGOrder, KGSaint } from '../../types/kg';
import type { LineageLink } from '../../lib/kg';
import { langAttr } from '../../lib/i18n/languages';
import {
  localizeFigureName,
  localizeOrderName,
  localizeAltName,
} from '../../lib/i18n/localizeKgName';

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

/**
 * One recorded lineage edge, with the evidence for it.
 *
 * The quote, the source file and the reviewed flag were on the link object all
 * along and only `/graph` printed them — so the graph-wide dump held its
 * claims to a higher standard of honesty than the figure's own page, which is
 * where a reader actually reads a lineage. 80 of the archive's 86
 * teacher-disciple edges are unreviewed and all 86 carry a verbatim quote;
 * a page that shows the name and hides both is asserting more than the archive
 * knows.
 */
function LineageLinkItem({ link }: { link: LineageLink }) {
  const { lang, t } = useLang();
  const saint = link.saint;
  const relationLabel = t(
    link.relation === 'successor_of' ? 'successorOfLabel' : 'discipleOfLabel',
  );

  return (
    <li className="lineage-relation-item">
      <div className="lineage-relation-row">
        {/* A figure the dictionary does not cover comes back as its source name
            (RULE 2 — do not invent an Urdu name for a person). <bdi> isolates the
            Latin run; `data-latin` declares the debt for the no-leak guard. */}
        <Link to={`/saint/${saint.slug}`} lang={langAttr(lang)} data-latin>
          <bdi>{localizeFigureName(saint, lang)}</bdi>
        </Link>
        <span className="lineage-relation-tag">{relationLabel}</span>
        {!link.reviewed && (
          <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
            {t('lineageUnreviewed')}
          </span>
        )}
      </div>
      {link.quote && (
        /* Latin on purpose in either language, for the same reason /graph does
           it: this sentence is the entire basis for trusting an unreviewed
           claim, and an archive whose distinguishing claim is provenance must
           leave the reader an exact search string (i18n rule 7). `lang`/`dir`
           keep an English sentence's punctuation inside an RTL page. */
        <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
          {link.quote}
          {link.source && <cite className="graph-lineage-cite">{link.source}</cite>}
        </blockquote>
      )}
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
            {/* Keyed by relation as well as slug. 13 pairs in the graph are
                recorded twice — once `disciple_of`, once `successor_of` — and
                keyed on the slug alone React saw a duplicate and dropped one of
                the two recorded facts. */}
            {teachers.map((link) => (
              <LineageLinkItem key={`${link.saint.slug}:${link.relation}`} link={link} />
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
              {localizeOrderName(order, lang)}
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
                      lang={langAttr(lang)}
                    >
                      {localizeFigureName(saint, lang)}
                      {saint.altNames?.[0] && (
                        /* Same treatment OrderPage already gave this field:
                           through the dictionary, and <bdi> when it comes back
                           unchanged, which for a source alt-name it often does.
                           Rendering the raw string here and the localised one
                           there meant the same datum read differently on two
                           pages of the same archive. */
                        <span className="lineage-member-alt" data-latin>
                          <bdi>{localizeAltName(saint.altNames[0], lang)}</bdi>
                        </span>
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
              <LineageLinkItem key={`${link.saint.slug}:${link.relation}`} link={link} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
