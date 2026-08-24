import React, { useEffect, useMemo, useState } from 'react';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { hasProjectAccess } from '../lib/projectAccess';
import { isRtlLang } from '../lib/i18n/languages';
import {
  loadVerdicts,
  saveVerdicts,
  isStale,
  verdictsToCsv,
  type VerdictKind,
  type VerdictMap,
  type VerdictRow,
} from '../lib/review/verdicts';

/**
 * The review desk — 218 extracted claims, their evidence, and a verdict.
 *
 * Full reasoning in docs/planning/REVIEW_DESK_2026-08-24.md. The short version:
 * `/about` can state this archive's provenance debt precisely — 94 machine-read
 * biographies, 80 of 86 lineage links, 44 of 64 affiliations — and until now
 * could not reduce it, because reviewing one claim meant opening a 255-row CSV,
 * reading a quote in a spreadsheet cell, and hand-editing a proposals file. The
 * evidence and the verdict lived in different tools.
 *
 * Three things this page deliberately is not:
 *
 * - **Not an editor.** No field here writes a value into the archive. A verdict
 *   is a judgement *about* a claim; the claim's own text is never editable.
 *   Letting a reviewer retype a date would put an unsourced value into a
 *   provenance archive through its provenance tooling.
 * - **Not authenticated.** The gate is `hasProjectAccess()`, which is
 *   visibility and not security, and says so in its own file. The data is a
 *   published CSV; this keeps casual readers out of editorial detail and claims
 *   nothing more.
 * - **Not a queue with an owner.** No assignment, no locking. Two reviewers
 *   working the same claim independently and agreeing is better evidence than
 *   one holding a lock.
 *
 * The queue is loaded by dynamic `import()` so its 78 KB is not in any eager
 * bundle: a public reader never pays for a page they cannot open.
 */

interface QueueItem {
  id: string;
  kind: 'disciple_of' | 'successor_of' | 'belongs_to_order' | 'biography';
  subject: string;
  subjectSlug: string;
  object: string;
  quote?: string;
  source?: string;
  branch?: string;
  born?: string;
  died?: string;
  titles?: string[];
  evidence: string;
}

const CLAIM_KEYS = {
  disciple_of: 'reviewClaimDiscipleOf',
  successor_of: 'reviewClaimSuccessorOf',
  belongs_to_order: 'reviewClaimBelongsToOrder',
  biography: 'reviewClaimBiography',
} as const;

const VERDICT_BUTTONS: {
  kind: VerdictKind;
  labelKey: 'reviewConfirm' | 'reviewReject' | 'reviewUnsure';
}[] = [
  { kind: 'confirm', labelKey: 'reviewConfirm' },
  { kind: 'reject', labelKey: 'reviewReject' },
  { kind: 'unsure', labelKey: 'reviewUnsure' },
];

export default function ReviewPage() {
  const { lang, t, fmtNum } = useLang();
  const headingRef = useFocusHeadingOnMount();
  const isRtl = isRtlLang(lang);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictMap>({});

  useDocumentTitle(`${t('reviewTitle')} — ${t('siteTitle')}`);

  /* The gate and the stored session are both browser state, so they are read in
     an effect rather than during render: this route is prerendered like every
     other, and reading localStorage while rendering would make the first paint
     depend on it. */
  useEffect(() => {
    setAllowed(hasProjectAccess());
    setVerdicts(loadVerdicts());
  }, []);

  useEffect(() => {
    if (!allowed || items) return;
    let cancelled = false;
    void import('../../data/kg-review-queue.json').then((module) => {
      if (!cancelled) setItems((module.default as { items: QueueItem[] }).items);
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, items]);

  const record = (item: QueueItem, kind: VerdictKind) => {
    setVerdicts((current) => {
      const existing = current[item.id];
      /* Clicking the recorded verdict again clears it — the same
         press-again-to-undo the filter chips use, and the only way to take back
         a misclick without a fourth button. */
      const next = { ...current };
      if (existing?.verdict === kind && !isStale(existing, item.evidence)) {
        delete next[item.id];
      } else {
        next[item.id] = {
          verdict: kind,
          evidence: item.evidence,
          ...(existing?.note ? { note: existing.note } : {}),
        };
      }
      saveVerdicts(next);
      return next;
    });
  };

  const note = (item: QueueItem, text: string) => {
    setVerdicts((current) => {
      const existing = current[item.id];
      /* A note without a verdict is still worth keeping — "I looked at this and
         could not tell" is the most honest thing a reviewer can leave. */
      const next = {
        ...current,
        [item.id]: {
          verdict: existing?.verdict ?? 'unsure',
          evidence: item.evidence,
          ...(text ? { note: text } : {}),
        },
      };
      saveVerdicts(next);
      return next;
    });
  };

  const claimText = (item: QueueItem) => {
    if (item.kind === 'biography') return `${item.subject} — ${t(CLAIM_KEYS.biography)}`;
    return `${item.subject} ${t(CLAIM_KEYS[item.kind])} ${item.object}`;
  };

  const recorded = useMemo(
    () =>
      (items ?? []).filter(
        (item) => verdicts[item.id] && !isStale(verdicts[item.id], item.evidence),
      ),
    [items, verdicts],
  );

  const download = () => {
    const rows: VerdictRow[] = recorded.map((item) => ({
      id: item.id,
      kind: item.kind,
      claim: claimText(item),
      ...(item.quote ? { quote: item.quote } : {}),
      ...(item.source ? { source: item.source } : {}),
      evidence: item.evidence,
      verdict: verdicts[item.id]!.verdict,
      ...(verdicts[item.id]!.note ? { note: verdicts[item.id]!.note } : {}),
    }));
    const blob = new Blob([verdictsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kg-review-verdicts.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-enter entity-page-wrapper">
      <EntityPageHeader title={t('reviewTitle')} />

      <article
        className="entity-page"
        id="main-content"
        tabIndex={-1}
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <h1 ref={headingRef} className="entity-title">
          {t('reviewTitle')}
        </h1>
        <p className="coverage-intro">{t('reviewIntro')}</p>

        {!allowed ? (
          <p className="about-note">{t('reviewGateNote')}</p>
        ) : items === null ? (
          <p className="about-note">{t('reviewLoading')}</p>
        ) : items.length === 0 ? (
          <p className="about-note">{t('reviewEmpty')}</p>
        ) : (
          <>
            <div className="review-toolbar">
              <p className="review-progress" role="status" aria-live="polite">
                {t('reviewProgress')}: <strong>{fmtNum(recorded.length)}</strong> /{' '}
                {fmtNum(items.length)}
              </p>
              <button
                type="button"
                className="review-download"
                onClick={download}
                disabled={recorded.length === 0}
              >
                {t('reviewDownload')}
              </button>
              <p className="review-download-help">{t('reviewDownloadHelp')}</p>
            </div>

            <ul className="review-list">
              {items.map((item) => {
                const verdict = verdicts[item.id];
                const stale = isStale(verdict, item.evidence);
                return (
                  <li key={item.id} className="review-item">
                    <p className="review-claim">{claimText(item)}</p>

                    {item.branch && (
                      <p className="review-branch" data-latin>
                        <bdi>{item.branch}</bdi>
                      </p>
                    )}

                    {item.kind === 'biography' && (
                      <dl className="review-fields">
                        {item.born && (
                          <>
                            <dt>{t('born')}</dt>
                            <dd data-latin>
                              <bdi>{fmtNum(item.born)}</bdi>
                            </dd>
                          </>
                        )}
                        {item.died && (
                          <>
                            <dt>{t('died')}</dt>
                            <dd data-latin>
                              <bdi>{fmtNum(item.died)}</bdi>
                            </dd>
                          </>
                        )}
                        {item.titles && item.titles.length > 0 && (
                          <>
                            <dt>{t('titlesLabel')}</dt>
                            <dd data-latin>
                              <bdi>{item.titles.join(' · ')}</bdi>
                            </dd>
                          </>
                        )}
                      </dl>
                    )}

                    {item.quote ? (
                      /* Latin in either language, on purpose: the quote is the
                         entire basis for judging the claim, and paraphrasing it
                         would destroy the thing a reviewer is checking against
                         (i18n rule 7). */
                      <blockquote className="graph-lineage-quote" lang="en" dir="ltr" data-latin>
                        {item.quote}
                      </blockquote>
                    ) : (
                      <p className="review-no-quote">{t('reviewNoQuote')}</p>
                    )}

                    {item.source && (
                      <p className="review-source">
                        <span className="review-source-label">{t('reviewEvidence')}:</span>{' '}
                        <bdi data-latin>{item.source}</bdi>
                      </p>
                    )}

                    {stale && <p className="review-stale">{t('reviewStale')}</p>}

                    <div className="review-verdicts" role="group" aria-label={claimText(item)}>
                      {VERDICT_BUTTONS.map(({ kind, labelKey }) => {
                        const active = !stale && verdict?.verdict === kind;
                        return (
                          <button
                            key={kind}
                            type="button"
                            className={`filter-chip review-verdict review-verdict--${kind}${active ? ' active' : ''}`}
                            aria-pressed={active}
                            onClick={() => record(item, kind)}
                          >
                            {t(labelKey)}
                          </button>
                        );
                      })}
                    </div>

                    <label className="review-note-label">
                      <span className="review-note-label-text">{t('reviewNotePlaceholder')}</span>
                      <textarea
                        className="review-note"
                        rows={2}
                        value={stale ? '' : (verdict?.note ?? '')}
                        placeholder={t('reviewNotePlaceholder')}
                        onChange={(event) => note(item, event.target.value)}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </article>

      <ScrollToTop />
    </div>
  );
}
