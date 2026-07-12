import React from 'react';
import type { Lang } from '../../types/shrine';
import type { ProvenanceStore, FieldProvenance, ProvenanceMethod } from '../../types/provenance';
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

function isUnreviewed(prov: FieldProvenance): boolean {
  return (prov.method === 'ocr' || prov.method === 'mt') && !prov.reviewedBy;
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
