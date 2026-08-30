import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import type { DescentLink } from '../../lib/kg';
import { langAttr } from '../../lib/i18n/languages';
import { localizeFigureName } from '../../lib/i18n/localizeKgName';
import { renderInlineBold } from '../shrine/inlineFormat';

/**
 * Descent down a spiritual line, at a remove.
 *
 * The archive stated this twice and could record it neither time. Guru Gurpat
 * is "a twelfth-generation descendant, in the Jagiasi lineage, of Guru Nanak";
 * Sant Harnam Das is "an eighth successor in the lineage" of Baba Bankhandi.
 * `successor_of` asserts the seat passed from one to the next, which is false
 * across twelve generations, and `kin_of`'s `descendant_of` asserts blood,
 * which is also false — the same entry calls the Jagiasi Sants "spiritual
 * descendants of Guru Nanak through Baba Sri Chand's Udasi line", and that line
 * runs through an ascetic son. Both were filed as non-relations, in two
 * different files, before the type was added on Rauf's ruling of 30 August 2026.
 *
 * The row asserts only what both sources share — N removes down a spiritual
 * line — and the source's own phrase sits beside the quote, because one entry
 * says *descendant* and the other says *successor* and normalising either into
 * the other would put a word in the archive's mouth (RULE 2).
 */
function DescentItem({ link }: { link: DescentLink }) {
  const { lang, t, fmtNum } = useLang();

  return (
    <li className="lineage-relation-item kin-item">
      <div className="lineage-relation-row">
        {/* Same treatment every figure link gets: through the dictionary, <bdi>
            around what comes back, `data-latin` to declare the debt where it
            comes back unchanged (RULE 2 — no invented Urdu name for a person). */}
        <Link to={`/saint/${link.saint.slug}`} lang={langAttr(lang)} data-latin>
          <bdi>{localizeFigureName(link.saint, lang)}</bdi>
        </Link>
        <span className="lineage-relation-tag">
          {t(link.otherIsElder ? 'descentAncestor' : 'descentDescendant')}
        </span>
        {/* Absent is a different claim from zero — "descended from, distance
            unstated" — so the chip appears only where the source counts.
            fmtNum because a bare 12 in an Urdu page is an English numeral. */}
        {typeof link.generations === 'number' && (
          <span className="kin-caveat">
            <bdi>{fmtNum(String(link.generations))}</bdi> {t('descentRemoves')}
          </span>
        )}
        {/* Dead today — both edges are human-adjudicated seeds — and present for
            the reason KinView's is: the type is new, and the first
            machine-extracted descent must not inherit a seed's authority. */}
        {!link.reviewed && (
          <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
            {t('lineageUnreviewed')}
          </span>
        )}
      </div>
      {link.quote && (
        /* Latin in either language, on the ground i18n rule 7 gives: this
           sentence is the entire basis for the row above it, and an archive
           whose distinguishing claim is provenance must leave the reader an
           exact search string. */
        <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
          {renderInlineBold(link.quote)}
          {link.source && <cite className="graph-lineage-cite">{link.source}</cite>}
        </blockquote>
      )}
    </li>
  );
}

export function DescentView({ links }: { links: DescentLink[] }) {
  const { t } = useLang();
  if (links.length === 0) return null;

  return (
    <>
      <p className="kg-section-note">{t('descentNote')}</p>
      <ul className="lineage-relation-list">
        {/* Keyed on slug AND direction: a figure could in principle stand
            below one figure and above another, and React seeing one key twice
            would drop a recorded fact — the mistake KinView had to fix for the
            row that records two ties at once. */}
        {links.map((link) => (
          <DescentItem key={`${link.saint.slug}:${link.otherIsElder}`} link={link} />
        ))}
      </ul>
    </>
  );
}
