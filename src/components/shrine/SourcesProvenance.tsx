import React from 'react';
import type { Lang } from '../../types/shrine';
import type {
  ProvenanceStore,
  FieldProvenance,
  ProvenanceMethod,
  ContentTier,
  Citation,
} from '../../types/provenance';
import rawProvenance from '../../../data/provenance.json';
import { t } from '../../lib/i18n/uiStrings';
import { localizeFieldName } from '../../lib/data/fieldLabels';

const provenanceStore = rawProvenance as unknown as ProvenanceStore;

interface Props {
  shrineSlug: string;
  lang: Lang;
}

const METHOD_LABEL: Record<ProvenanceMethod, { en: string; ur: string }> = {
  human: { en: 'human-authored', ur: 'انسان تحریر شدہ' },
  ocr: { en: 'OCR', ur: 'او سی آر' },
  mt: { en: 'machine translated', ur: 'مشین ترجمہ' },
  llm: { en: 'AI-assisted', ur: 'اے آئی کی معاونت سے' },
};

// See docs/planning/DATA_QUALITY_PLAN.md §3.1 for what each tier means.
const CONTENT_TIER_LABEL: Record<ContentTier, { en: string; ur: string }> = {
  'tier1-ocr': { en: 'primary-source research', ur: 'بنیادی مآخذ پر مبنی تحقیق' },
  'tier2-compendium': { en: 'compendium-based research', ur: 'مجموعہ پر مبنی تحقیق' },
  'ai-researched': { en: 'AI-researched draft', ur: 'اے آئی سے تحقیق شدہ مسودہ' },
  'sheet-original': { en: 'pre-existing entry', ur: 'پہلے سے موجود اندراج' },
  unknown: { en: 'origin unknown', ur: 'ماخذ نامعلوم' },
};

const CITATION_TYPE_LABEL: Record<Citation['type'], { en: string; ur: string }> = {
  website: { en: 'website', ur: 'ویب سائٹ' },
  academic: { en: 'academic', ur: 'علمی' },
  gazetteer: { en: 'gazetteer', ur: 'گزٹیئر' },
  book: { en: 'book', ur: 'کتاب' },
  oral: { en: 'oral tradition', ur: 'زبانی روایت' },
};

function isUnreviewed(prov: FieldProvenance): boolean {
  return (prov.method === 'ocr' || prov.method === 'mt' || prov.method === 'llm') && !prov.reviewedBy;
}

function formatPageRef(page: string): string {
  return ', p. ' + page;
}

export function SourcesProvenance({ shrineSlug, lang }: Props) {
  const entry = provenanceStore.shrines.find((s) => s.shrineSlug === shrineSlug);
  if (!entry) return null;

  const fieldEntries = Object.entries(entry.fields);
  if (!fieldEntries.length) return null;

  const heading = t(lang, 'sourcesHeading');

  return (
    <section className="provenance-section" aria-labelledby="provenance-heading">
      <h2 className="provenance-heading" id="provenance-heading">
        {heading}
      </h2>

      <ul className="provenance-list" role="list">
        {fieldEntries.map(([field, prov]) => {
          const unreviewed = isUnreviewed(prov);
          const methodLabel = METHOD_LABEL[prov.method]?.[lang] ?? prov.method;

          return (
            <li key={field} className="provenance-item">
              <span className="provenance-field-name">{localizeFieldName(field, lang)}</span>

              <span className={`provenance-method provenance-method--${prov.method}`}>
                {methodLabel}
              </span>

              {prov.contentTier && (
                <span className={`provenance-tier provenance-tier--${prov.contentTier}`}>
                  {CONTENT_TIER_LABEL[prov.contentTier]?.[lang] ?? prov.contentTier}
                </span>
              )}

              {unreviewed && (
                <span className="provenance-unreviewed" role="img" aria-label="Unreviewed">
                  {t(lang, 'unreviewedLabel')}
                </span>
              )}

              <span className="provenance-source">
                {/* Source citations (Wikimedia, Google Maps, book titles, license
                    names) are external technical metadata, not shrine content —
                    isolate rather than mistranslate a legal/attribution string. */}
                <bdi>
                  {prov.source}
                  {prov.page ? formatPageRef(prov.page) : null}
                </bdi>
              </span>

              {prov.confidence !== undefined && (
                <span className="provenance-confidence">
                  {Math.round(prov.confidence * 100)}
                  {'%'} {t(lang, 'confidenceLabel')}
                </span>
              )}

              {prov.reviewedBy && (
                <span className="provenance-reviewer">
                  {t(lang, 'reviewedByLabel')}: {prov.reviewedBy}
                </span>
              )}

              {prov.notes && (
                // Internal audit notes — same rationale as the source citation above.
                <span className="provenance-notes">
                  <bdi>{prov.notes}</bdi>
                </span>
              )}

              {prov.citations && prov.citations.length > 0 && (
                <div className="provenance-citations">
                  <span className="provenance-citations-label">{t(lang, 'citationsLabel')}:</span>
                  <ul className="provenance-citation-list" role="list">
                    {prov.citations.map((citation, i) => (
                      <li key={i} className="provenance-citation">
                        <bdi>
                          {citation.url ? (
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${t(lang, 'viewSourceLabel')}: ${citation.title}`}
                            >
                              {citation.title}
                            </a>
                          ) : (
                            citation.title
                          )}
                          {citation.author ? ` — ${citation.author}` : null}
                        </bdi>
                        <span className="provenance-citation-type">
                          {CITATION_TYPE_LABEL[citation.type]?.[lang] ?? citation.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
