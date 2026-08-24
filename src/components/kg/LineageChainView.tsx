import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import type { LineageChain } from '../../lib/kg';
import { localizeFigureName } from '../../lib/i18n/localizeKgName';

import { isRtlLang } from '../../lib/i18n/languages';
/**
 * A figure's chain of transmission, drawn as a chain.
 *
 * The page already listed a figure's immediate teachers, which for a tradition
 * defined by an unbroken line of descent is the least interesting hop of it.
 * This renders the rest, nearest first, and — the part that makes it honest —
 * says why it stopped: the record ran out, or it named several teachers and the
 * chain is no longer one line. `getLineageChain` refuses to pick between four
 * recorded masters, so the "forks" note is not a limitation of this component,
 * it is a fact about the sources.
 *
 * Each remove carries its own relation tags and its own unreviewed marker,
 * because they are separate claims from separate sentences: a chain three deep
 * where the second link is unreviewed is not a chain you can trust three deep,
 * and averaging that into a single badge at the top would say the opposite.
 * The quotes are not repeated here — every one of them is already printed under
 * `Teachers` on the same page, and a chain of four with four blockquotes
 * interleaved stops reading as a chain.
 */
export function LineageChainView({ chain }: { chain: LineageChain }) {
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);

  if (chain.steps.length === 0) return null;

  return (
    <div className="lineage-chain">
      <p className="kg-section-note">{t('lineageChainNote')}</p>
      <ol className="lineage-chain-list">
        {chain.steps.map((step, i) => (
          <li key={step.saint.slug} className="lineage-chain-step">
            {/* The remove, not a generation: "2 removed" is a count of recorded
                links, and the archive does not claim these are consecutive
                generations of anything. */}
            <span className="lineage-chain-remove" aria-hidden="true">
              {fmtNum(tFn(lang, 'lineageChainRemove', i + 1))}
            </span>
            <div className="lineage-chain-body">
              {/* A figure the dictionary does not carry comes back as its source
                  name (RULE 2). <bdi> isolates the Latin run inside RTL text;
                  `data-latin` declares it for the no-leak guard. */}
              <Link
                to={`/saint/${step.saint.slug}`}
                className="lineage-chain-name"
                lang={isRtl ? 'ur' : undefined}
                data-latin
              >
                <bdi>{fmtNum(localizeFigureName(step.saint, lang))}</bdi>
              </Link>
              {step.links.map((link) => (
                <span key={link.relation} className="lineage-relation-tag">
                  {t(link.relation === 'successor_of' ? 'successorOfLabel' : 'discipleOfLabel')}
                </span>
              ))}
              {/* Per link, not per chain. One unreviewed step in the middle is
                  the thing a reader needs to see, and it is invisible in any
                  summary. */}
              {step.links.some((link) => !link.reviewed) && (
                <span className="lineage-unreviewed" title={t('lineageUnreviewedHelp')}>
                  {t('lineageUnreviewed')}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="lineage-chain-stop">
        {chain.stop === 'forks' && fmtNum(tFn(lang, 'lineageChainForks', chain.forks))}
        {chain.stop === 'root' && t('lineageChainRoot')}
        {chain.stop === 'cycle' && t('lineageChainCycle')}
      </p>
    </div>
  );
}
