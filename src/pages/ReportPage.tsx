import React, { useEffect, useMemo, useState } from 'react';
import { EntityPageHeader } from '../components/ui/EntityPageHeader';
import { Link } from 'react-router-dom';
import { useShrineData } from '../hooks/useShrineData';
import { useLang } from '../lib/i18n/LanguageContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFocusHeadingOnMount } from '../hooks/useFocusHeadingOnMount';
import { ScrollToTop } from '../components/ui/ScrollToTop';
import { tFn } from '../lib/i18n/uiStrings';
import type { Lang } from '../types/shrine';
import {
  AUQAF_PUNJAB_REGISTER,
  buildArchiveReport,
  summarizeProvenance,
  type ProvenanceSummary,
} from '../lib/data/archiveReport';
import { SUPPORT_LEVEL_LABEL_KEYS, type SupportLevelKey } from '../lib/data/supportLevel';
import { INFO_LEVEL_LABEL_KEYS, type InfoLevelKey } from '../lib/data/infoLevel';
import { SITE_STATUS_LABEL_KEYS, type SiteStatusKey } from '../lib/data/siteStatus';
import type { UI_TEXT } from '../lib/i18n/uiStrings';
import { categoryDisplayLabel } from '../lib/data/categoryKey';
import reviewedLedger from '../../urdu-i18n/reviewed.json';

import { isRtlLang } from '../lib/i18n/languages';
/** SITE_STATUS_LABEL_KEYS deliberately omits 'active' (badges only mark the
 * exceptional states); the report counts every state, so complete the map. */
const STATUS_LABEL_KEYS: Record<SiteStatusKey, keyof (typeof UI_TEXT)['en']> = {
  active: 'statusActive',
  ...SITE_STATUS_LABEL_KEYS,
};

/**
 * State of the Archive — blue-sky item F10 (DESIGN_VISION.md Part 3): "the
 * archive grading itself in public is the brand; this is its yearly proof."
 * Everything numeric is computed from the dataset this page loaded; the two
 * hand-written sections (corrections, losses) are drawn from the project's
 * committed working documents and each item names its date.
 */

/** The public corrections ledger — HANDOVER.md §9 and the session logs in
 * TODO.md, rewritten in reader voice. Bilingual data, not UI chrome, so it
 * lives here in the TRADITION_LABELS pattern rather than in uiStrings. */
const CORRECTIONS: Array<{ date: string; en: string; ur: string }> = [
  {
    date: '2026-08-18',
    en: 'The map’s "Invalid key" tiles had been misdiagnosed for weeks as an origin restriction. Measured properly, the cause was the tile provider refusing raster tiles of a custom style; the basemap was rebuilt on vector tiles.',
    ur: 'نقشے کی "غلط کلید" والی ٹائلوں کی وجہ ہفتوں تک غلط سمجھی جاتی رہی۔ جب باقاعدہ پیمائش ہوئی تو سبب کچھ اور نکلا، اور بنیادی نقشہ ویکٹر ٹائلوں پر نئے سرے سے بنایا گیا۔',
  },
  {
    date: '2026-08-18',
    en: 'Ten commits of fixes, believed live, had never deployed: the site builds from a version branch the fixes had not reached. The deploy path itself is now documented and checked.',
    ur: 'دس کمٹس کی اصلاحات، جو جاری سمجھی جاتی تھیں، کبھی شائع ہی نہیں ہوئی تھیں: سائٹ ایک ایسی شاخ سے بنتی تھی جہاں وہ پہنچی ہی نہ تھیں۔ اشاعت کا راستہ اب درج اور جانچ میں ہے۔',
  },
  {
    date: '2026-08-19',
    en: 'On laptop-sized screens the shrine list had collapsed to exactly zero height — present for screen readers, invisible to everyone else. Found by tests, not by looking.',
    ur: 'لیپ ٹاپ جتنی اسکرینوں پر مزارات کی فہرست کی اونچائی عین صفر ہو چکی تھی — اسکرین ریڈر کے لیے موجود، باقی سب کے لیے غائب۔ یہ آنکھ نے نہیں، ٹیسٹوں نے پکڑی۔',
  },
  {
    date: '2026-08-21',
    en: 'Searching in Urdu script returned nothing: the index was reading a column that does not exist, while the screen displayed names from the dictionary. The index now carries what the reader sees.',
    ur: 'اردو رسم الخط میں تلاش کچھ نہیں لاتی تھی: اشاریہ ایک ایسا کالم پڑھ رہا تھا جو موجود ہی نہیں، جبکہ اسکرین پر نام لغت سے دکھتے تھے۔ اب اشاریے میں وہی ہے جو قاری دیکھتا ہے۔',
  },
  {
    date: '2026-08-21',
    en: 'Every page without an active tour printed blank, because one print rule hid the whole document. Scoped, fixed, and guarded by a test.',
    ur: 'جس صفحے پر کوئی گائیڈڈ ٹور فعال نہ ہو وہ چھپائی میں خالی نکلتا تھا، کیونکہ ایک ہی قاعدہ پوری دستاویز چھپا دیتا تھا۔ اب یہ محدود، درست اور ٹیسٹ کی نگرانی میں ہے۔',
  },
];

const LOSSES: Array<{ en: string; ur: string }> = [
  {
    en: 'Mauj Darya Bukhari’s twelve photographs and videos are gone from their source — every link verified dead. The shrine needs re-shooting.',
    ur: 'موج دریا بخاری کی بارہ تصاویر اور ویڈیوز اپنے ماخذ سے مٹ چکی ہیں — ہر ربط جانچ کر مُردہ پایا گیا۔ مزار کی دوبارہ عکس بندی درکار ہے۔',
  },
  {
    en: 'The photographs of Data Darbar and Bibi Pak Daman survive only as heavily compressed copies of themselves.',
    ur: 'داتا دربار اور بی بی پاک دامن کی تصاویر صرف اپنی ہی سخت دبی ہوئی نقلوں کی صورت میں باقی ہیں۔',
  },
  {
    en: 'The archive holds no audio recordings yet, against a stated purpose of preserving oral history. The gap is recorded rather than hidden.',
    ur: 'زبانی تاریخ محفوظ کرنے کے اعلان شدہ مقصد کے مقابل، آرکائیو کے پاس تاحال کوئی صوتی ریکارڈنگ نہیں۔ یہ خلا چھپایا نہیں، درج کیا گیا ہے۔',
  },
];

function StatRow({ label, count, total }: { label: string; count: number; total: number }) {
  const { fmtNum } = useLang();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="report-stat-row">
      <span className="report-stat-label">{label}</span>
      <span className="report-stat-count">
        {fmtNum(count)}
        <span className="report-stat-pct"> · {fmtNum(pct)}٪</span>
      </span>
    </li>
  );
}

export default function ReportPage() {
  const { shrines } = useShrineData();
  const { lang, t, fmtNum } = useLang();
  const isRtl = isRtlLang(lang);
  const headingRef = useFocusHeadingOnMount();
  useDocumentTitle(`${t('reportTitle')} — ${t('siteTitle')}`);

  const report = useMemo(() => buildArchiveReport(shrines), [shrines]);

  // provenance.json is a lazy chunk here — this page must not grow the
  // critical path it exists to brag about shrinking.
  const [provenance, setProvenance] = useState<ProvenanceSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('../../data/provenance.json').then((m) => {
      if (!cancelled)
        setProvenance(summarizeProvenance(m.default as Parameters<typeof summarizeProvenance>[0]));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewedCount = Object.keys(reviewedLedger as Record<string, unknown>).length;
  const registerPct =
    report.totalShrines > 0 ? Math.round((report.totalShrines / AUQAF_PUNJAB_REGISTER) * 100) : 0;

  if (shrines.length === 0) return null;

  return (
    <div className="page-enter entity-page-wrapper">
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <EntityPageHeader title={t('reportTitle')} />

      <article
        className="entity-page report-page"
        id="main-content"
        lang={isRtl ? 'ur' : undefined}
        dir={isRtl ? 'rtl' : undefined}
      >
        <ScrollToTop />
        <nav className="shrine-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">{t('mapBreadcrumb')}</Link>
            </li>
            <li aria-current="page">{t('reportTitle')}</li>
          </ol>
        </nav>

        <h1 ref={headingRef} className="entity-title">
          {t('reportTitle')}
        </h1>
        <p className="report-intro">{t('reportIntro')}</p>

        <section aria-labelledby="report-coverage">
          <h2 id="report-coverage" className="report-section-heading">
            {t('reportCoverageHeading')}
          </h2>
          <p className="report-big-number">
            <span className="report-figure">{fmtNum(report.totalShrines)}</span>{' '}
            {t('reportShrinesLive')}
          </p>
          <p className="report-note">{tFn(lang, 'reportRegisterNote', registerPct)}</p>
          <ul className="report-stat-list stagger-in">
            {report.categories.map((c) => (
              <StatRow
                key={c.label}
                label={categoryDisplayLabel(c.label, lang as Lang) ?? c.label}
                count={c.count}
                total={report.totalShrines}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="report-support">
          <h2 id="report-support" className="report-section-heading">
            {t('reportSupportHeading')}
          </h2>
          <p className="report-note">{t('reportSupportNote')}</p>
          <ul className="report-stat-list stagger-in">
            {(Object.keys(report.supportLevels) as SupportLevelKey[]).map((key) => (
              <StatRow
                key={key}
                label={t(SUPPORT_LEVEL_LABEL_KEYS[key])}
                count={report.supportLevels[key]}
                total={report.totalShrines}
              />
            ))}
            {report.supportUnknown > 0 && (
              <StatRow
                label={t('reportUnknownLabel')}
                count={report.supportUnknown}
                total={report.totalShrines}
              />
            )}
          </ul>
        </section>

        <section aria-labelledby="report-info">
          <h2 id="report-info" className="report-section-heading">
            {t('reportInfoHeading')}
          </h2>
          <ul className="report-stat-list stagger-in">
            {(Object.keys(report.infoLevels) as InfoLevelKey[]).map((key) => (
              <StatRow
                key={key}
                label={t(INFO_LEVEL_LABEL_KEYS[key])}
                count={report.infoLevels[key]}
                total={report.totalShrines}
              />
            ))}
            {report.infoUnknown > 0 && (
              <StatRow
                label={t('reportUnknownLabel')}
                count={report.infoUnknown}
                total={report.totalShrines}
              />
            )}
          </ul>
        </section>

        <section aria-labelledby="report-status">
          <h2 id="report-status" className="report-section-heading">
            {t('reportStatusHeading')}
          </h2>
          <ul className="report-stat-list stagger-in">
            {(Object.keys(report.statuses) as SiteStatusKey[]).map((key) => (
              <StatRow
                key={key}
                label={t(STATUS_LABEL_KEYS[key])}
                count={report.statuses[key]}
                total={report.totalShrines}
              />
            ))}
            {report.statusUnknown > 0 && (
              <StatRow
                label={t('reportUnknownLabel')}
                count={report.statusUnknown}
                total={report.totalShrines}
              />
            )}
          </ul>
        </section>

        {provenance && (
          <section aria-labelledby="report-words">
            <h2 id="report-words" className="report-section-heading">
              {t('reportWordsHeading')}
            </h2>
            <p className="report-note">{t('reportWordsNote')}</p>
            <ul className="report-stat-list stagger-in">
              <StatRow
                label={t('reportWithCitations')}
                count={provenance.withCitations}
                total={provenance.tracked}
              />
              <StatRow
                label={t('reportAiResearched')}
                count={provenance.aiResearched}
                total={provenance.tracked}
              />
              <StatRow
                label={t('reportPrimarySource')}
                count={provenance.primarySource}
                total={provenance.tracked}
              />
            </ul>
          </section>
        )}

        <section aria-labelledby="report-urdu">
          <h2 id="report-urdu" className="report-section-heading">
            {t('reportUrduHeading')}
          </h2>
          <ul className="report-stat-list stagger-in">
            <StatRow
              label={t('reportUrduDrafted')}
              count={report.urduDrafted}
              total={report.totalShrines}
            />
            <StatRow
              label={t('reportUrduReviewed')}
              count={reviewedCount}
              total={report.urduDrafted}
            />
          </ul>
          <p className="report-note">{t('reportUrduReviewNote')}</p>
        </section>

        <section aria-labelledby="report-corrections">
          <h2 id="report-corrections" className="report-section-heading">
            {t('reportCorrectionsHeading')}
          </h2>
          <p className="report-note">{t('reportCorrectionsNote')}</p>
          <ul className="report-ledger stagger-in">
            {CORRECTIONS.map((c) => (
              <li key={c.date + c.en.slice(0, 20)} className="report-ledger-item">
                <span className="report-ledger-date">{fmtNum(c.date)}</span>
                <span className="report-ledger-text">{isRtl ? c.ur : c.en}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="report-lost">
          <h2 id="report-lost" className="report-section-heading">
            {t('reportLostHeading')}
          </h2>
          <ul className="report-ledger stagger-in">
            {LOSSES.map((l, i) => (
              <li key={i} className="report-ledger-item">
                <span className="report-ledger-text">{isRtl ? l.ur : l.en}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
