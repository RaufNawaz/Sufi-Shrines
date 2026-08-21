import React, { useMemo } from 'react';
import type { Shrine } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { t as tGlobal } from '../../lib/i18n/uiStrings';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { buildBibtex, buildPlainCitation } from '../../lib/cite';
import { supportLevelKey, SUPPORT_LEVEL_LABEL_KEYS } from '../../lib/data/supportLevel';
import { useShareLink } from '../../hooks/useShareLink';

interface Props {
  shrine: Shrine;
}

/** One citation format: label, the text itself, and a copy button. The
 * citation strings sit inside <bdi> so the Latin of a URL or a BibTeX entry
 * neither breaks RTL layout nor trips the no-English-leak guard. */
function CiteBlock({ label, text }: { label: string; text: string }) {
  const { t } = useLang();
  const { copy, copied } = useShareLink();
  return (
    <div className="cite-block">
      <div className="cite-block-head">
        <span className="cite-block-label">
          <bdi>{label}</bdi>
        </span>
        <button type="button" className="cite-copy-btn" onClick={() => void copy(text)}>
          {copied ? t('copied') : t('citeCopy')}
        </button>
      </div>
      <pre className="cite-text">
        <bdi>{text}</bdi>
      </pre>
    </div>
  );
}

/**
 * "Cite this entry" — plan item A5 (docs/planning/NEXT_STEPS_2026-08-21.md).
 * Plain-text citation in the reader's language plus BibTeX (always Latin: a
 * machine format). Both carry the entry's support level, so a footnote
 * inherits the archive's honesty about how well the entry is sourced.
 */
export function CiteThisEntry({ shrine }: Props) {
  const { lang, t, fmtNum } = useLang();

  const { plain, bibtex } = useMemo(() => {
    const key = supportLevelKey(shrine.supportLevel);
    const supportLabel = key ? t(SUPPORT_LEVEL_LABEL_KEYS[key]) : '';
    const supportLabelEn = key ? tGlobal('en', SUPPORT_LEVEL_LABEL_KEYS[key]) : '';
    const now = new Date();
    const iso = now.toISOString().slice(0, 10); // YYYY-MM-DD — unambiguous in both languages
    const url =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}${window.location.pathname}`
        : `/shrine/${shrine.slug}`;
    const common = { slug: shrine.slug, url, year: now.getFullYear() };
    return {
      plain: buildPlainCitation(lang, {
        ...common,
        name: localizeShrineName(shrine, lang),
        supportLevelLabel: supportLabel,
        retrieved: fmtNum(iso), // localizeDigits is identity in English / Western mode
      }),
      bibtex: buildBibtex({
        ...common,
        englishName: shrine.name,
        supportLevelLabel: supportLabelEn,
        retrieved: iso,
      }),
    };
  }, [shrine, lang, t, fmtNum]);

  return (
    <details className="cite-entry">
      <summary className="cite-entry-summary">{t('citeTitle')}</summary>
      <CiteBlock label={t('citeTextLabel')} text={plain} />
      <CiteBlock label="BibTeX" text={bibtex} />
    </details>
  );
}
