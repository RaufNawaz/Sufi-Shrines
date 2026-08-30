import React, { useMemo } from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { t as tGlobal } from '../../lib/i18n/uiStrings';
import { buildBibtex, buildPlainCitation, type CiteKind } from '../../lib/cite';
import { supportLevelKey, SUPPORT_LEVEL_LABEL_KEYS } from '../../lib/data/supportLevel';
import { useShareLink } from '../../hooks/useShareLink';

interface Props {
  /** Which entity family this page belongs to — namespaces the BibTeX key. */
  kind: CiteKind;
  slug: string;
  /** The entry's name in English. BibTeX stays Latin whatever the reader's
   *  language, so this is required even in the Urdu view. */
  englishName: string;
  /** The entry's name in the reader's language, already localized by the page
   *  that owns it — each family localizes names differently (`localizeFigureName`,
   *  `localizeOrderName`, `localizeRecordedName`, a tradition's own `nameUr`),
   *  and this component has no business knowing which. */
  localizedName: string;
  /** The sheet's support level, when the entity has one. **Only shrines do** —
   *  support level is a property of a surveyed site, not of a person, an order,
   *  a place or a tradition, and inventing one for them would be RULE 2. */
  supportLevel?: string;
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
          <bdi data-latin>{label}</bdi>
        </span>
        <button type="button" className="cite-copy-btn" onClick={() => void copy(text)}>
          {copied ? t('copied') : t('citeCopy')}
        </button>
      </div>
      <pre className="cite-text">
        <bdi data-latin>{text}</bdi>
      </pre>
    </div>
  );
}

/**
 * "Cite this entry" — plan item A5 (docs/planning/NEXT_STEPS_2026-08-21.md).
 * Plain-text citation in the reader's language plus BibTeX (always Latin: a
 * machine format). Both carry the entry's support level where there is one, so
 * a footnote inherits the archive's honesty about how well the entry is sourced.
 *
 * Shrine-only until 30 August 2026, which left **169 of the 459 entity pages
 * this archive publishes** citable — the other 290 being 244 saints, 29 places,
 * 9 orders and 8 traditions. A `/saint/` page carries the archive's
 * "what it does not record" section, which is among the most citable things
 * here, and offered no way to cite it. The component lives under
 * `components/shrine/` for history rather than for scope.
 */
export function CiteThisEntry({ kind, slug, englishName, localizedName, supportLevel }: Props) {
  const { lang, t, fmtNum } = useLang();

  const { plain, bibtex } = useMemo(() => {
    const key = supportLevel ? supportLevelKey(supportLevel) : null;
    const supportLabel = key ? t(SUPPORT_LEVEL_LABEL_KEYS[key]) : '';
    const supportLabelEn = key ? tGlobal('en', SUPPORT_LEVEL_LABEL_KEYS[key]) : '';
    const now = new Date();
    const iso = now.toISOString().slice(0, 10); // YYYY-MM-DD — unambiguous in both languages
    const url =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}${window.location.pathname}`
        : `/${kind}/${slug}`;
    const common = { kind, slug, url, year: now.getFullYear() };
    return {
      plain: buildPlainCitation(lang, {
        ...common,
        name: localizedName,
        supportLevelLabel: supportLabel,
        retrieved: fmtNum(iso), // localizeDigits is identity in English / Western mode
      }),
      bibtex: buildBibtex({
        ...common,
        englishName,
        supportLevelLabel: supportLabelEn,
        retrieved: iso,
      }),
    };
  }, [kind, slug, englishName, localizedName, supportLevel, lang, t, fmtNum]);

  return (
    <details className="cite-entry">
      <summary className="cite-entry-summary">{t('citeTitle')}</summary>
      <CiteBlock label={t('citeTextLabel')} text={plain} />
      <CiteBlock label="BibTeX" text={bibtex} />
    </details>
  );
}
