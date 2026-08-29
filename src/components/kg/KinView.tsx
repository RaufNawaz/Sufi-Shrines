import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { KinLink } from '../../lib/kg';
import type { KGKinNote } from '../../types/kg';
import { langAttr } from '../../lib/i18n/languages';
import { localizeFigureName } from '../../lib/i18n/localizeKgName';
import { renderInlineBold } from '../shrine/inlineFormat';
import { kinRoleKey } from '../../lib/data/kinRoles';

/**
 * The family ties an entry states, on the figure's own page.
 *
 * The archive had these all along and rendered none of them: the graph's
 * relation vocabulary knew `disciple_of` and `successor_of` and nothing else,
 * so 28 kin ties an extraction pass had already quoted verbatim sat in
 * data/kg-lineage-proposals.json where no page could reach them. In this corpus
 * that is not a footnote — thirteen of the 28 are a *sajjada nashin*'s seat
 * passing from father to son, and Bibi Jawindi's only tie to anything else in
 * the graph is a line of descent from Jahaniyan Jahangasht.
 *
 * Same evidence discipline as LineageView, for the same reason: the row states
 * a relationship, and the sentence it was read from sits underneath it, so a
 * reader can judge the claim without leaving the page.
 */

function KinItem({ link }: { link: KinLink }) {
  const { lang, t } = useLang();
  const key = kinRoleKey(link);

  return (
    <li className="lineage-relation-item kin-item">
      <div className="lineage-relation-row">
        {/* Same treatment every figure link on this page gets: through the
            dictionary, <bdi> around what comes back, and `data-latin` to
            declare the debt where it comes back unchanged (RULE 2 — no invented
            Urdu name for a person). */}
        <Link to={`/saint/${link.saint.slug}`} lang={langAttr(lang)} data-latin>
          <bdi>{localizeFigureName(link.saint, lang)}</bdi>
        </Link>
        {key && <span className="lineage-relation-tag">{t(key)}</span>}
        {link.generationDisputed && (
          <span className="kin-caveat" title={t('kinGenerationDisputedHelp')}>
            {t('kinGenerationDisputed')}
          </span>
        )}
        {link.contested && (
          <span className="kin-caveat" title={t('kinContestedHelp')}>
            {t('kinContested')}
          </span>
        )}
      </div>
      {link.quote && (
        /* Latin in either language, on the same ground LineageView stands on:
           this sentence is the entire basis for the row above it, and an archive
           whose distinguishing claim is provenance must leave the reader an
           exact search string (i18n rule 7). `lang`/`dir` keep an English
           sentence's punctuation inside an RTL page. */
        <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
          {renderInlineBold(link.quote)}
          {link.source && <cite className="graph-lineage-cite">{link.source}</cite>}
        </blockquote>
      )}
    </li>
  );
}

interface Props {
  links: KinLink[];
  notes: KGKinNote[];
}

export function KinView({ links, notes }: Props) {
  const { t } = useLang();

  return (
    <>
      {/* The note describes the rows. Two figures reach this section with no
          rows at all — the archive records their family succession and names
          nobody in it — and printing "with the sentence each was read from"
          above nothing but a caveat reads as a bug. */}
      {links.length > 0 && <p className="kg-section-note">{t('kinNote')}</p>}
      {links.length > 0 && (
        <ul className="lineage-relation-list">
          {/* Keyed by the kin type as well as the slug: one row of the archive
              records two ties at once — Shah Abul Muali is both nephew and
              son-in-law of Daud Bandagi — and keyed on the slug alone React
              would see a duplicate and drop one of two recorded facts. The same
              mistake LineageView had to fix for the 13 pairs recorded both
              `disciple_of` and `successor_of`. */}
          {links.map((link) => (
            <KinItem key={`${link.saint.slug}:${link.kinType}`} link={link} />
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <div className="lineage-chain-section kin-notes">
          <h3 className="lineage-chain-heading">{t('kinNotesHeading')}</h3>
          <p className="kg-section-note">{t('kinNoteUnnamed')}</p>
          <ul className="lineage-relation-list">
            {notes.map((note) => (
              <li key={note.quote} className="lineage-relation-item">
                <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
                  {renderInlineBold(note.quote)}
                  <cite className="graph-lineage-cite">{note.source}</cite>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
