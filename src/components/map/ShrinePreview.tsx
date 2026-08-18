import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Shrine, Lang } from '../../types/shrine';
import { useLang } from '../../lib/i18n/LanguageContext';
import { getUrduFieldValue, getFieldValue } from '../../lib/data/fieldAliasing';
import { localizeShrineName } from '../../lib/i18n/localizeShrineName';
import { resolveFoundedDate } from '../../lib/i18n/urduFallback';
import { extractLeadPreviewText } from '../../lib/data/articleParsing';
import { categoryDisplayLabel } from '../../lib/data/categoryKey';
import { thumbnailUrl, IMAGE_WIDTH } from '../../lib/images/thumbnail';
import { infoLevelKey } from '../../lib/data/infoLevel';
import { supportLevelKey } from '../../lib/data/supportLevel';
import { siteStatusKey, SITE_STATUS_LABEL_KEYS } from '../../lib/data/siteStatus';
import { TOURS, localizeTourTitle } from '../../lib/tours/tours';
import { t as translate } from '../../lib/i18n/uiStrings';
import { ShrineGlyph } from '../ui/ShrineGlyph';
import { InfoLevelBadge } from '../ui/InfoLevelBadge';
import { SupportLevelBadge } from '../ui/SupportLevelBadge';
import { useShareLink } from '../../hooks/useShareLink';

interface ShrinePreviewProps {
  shrine: Shrine;
  lang: string;
  localizeField: (row: Shrine['raw'], field: string) => string;
  toursEnabled: boolean;
  onStartTour: (tourId: string) => void;
}

export function ShrinePreview({
  shrine,
  lang,
  localizeField,
  toursEnabled,
  onStartTour,
}: ShrinePreviewProps) {
  const { fmtNum } = useLang();
  const { copy, copied } = useShareLink({ copiedMs: 2000 });

  const relatedTour = toursEnabled
    ? (TOURS.find((tr) => tr.stops.some((s) => s.shrineSlug === shrine.slug)) ?? null)
    : null;

  const name = localizeShrineName(shrine, lang);

  const location = localizeField(shrine.raw, 'Location') || shrine.location;
  const category =
    categoryDisplayLabel(shrine.category, lang as Lang) ??
    (localizeField(shrine.raw, 'Category') || shrine.category);
  const saint = localizeField(shrine.raw, 'Sufi Saint') || shrine.sufiSaint;
  const founded = resolveFoundedDate(shrine.raw, lang as Lang);

  const statusKey = siteStatusKey(shrine.status);
  const statusLabel =
    statusKey && statusKey !== 'active'
      ? translate(lang as Lang, SITE_STATUS_LABEL_KEYS[statusKey])
      : '';

  const descRaw =
    lang === 'ur'
      ? getUrduFieldValue(shrine.raw, 'Description') || getFieldValue(shrine.raw, 'Description')
      : getFieldValue(shrine.raw, 'Description');
  const leadText = descRaw ? extractLeadPreviewText(descRaw) : '';

  const handleCopyLink = useCallback(() => {
    copy(window.location.href);
  }, [copy]);

  return (
    <div className="preview-card">
      {shrine.imageUrl ? (
        <img
          src={thumbnailUrl(shrine.imageUrl, IMAGE_WIDTH.preview)}
          alt={name}
          className="preview-card-hero"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="preview-card-hero-placeholder" aria-hidden="true">
          <ShrineGlyph className="preview-card-hero-icon" />
        </div>
      )}
      <h2 className="preview-title">
        <Link to={`/shrine/${shrine.slug}`} lang={lang === 'ur' ? 'ur' : undefined}>
          {name}
        </Link>
      </h2>
      <div className="preview-meta-row">
        {category && <span>{category}</span>}
        {location && <span>· {location}</span>}
        {founded && <span>· {fmtNum(founded)}</span>}
      </div>
      {saint && (
        <div className="preview-meta-row">
          <span>🕌 {saint}</span>
        </div>
      )}
      {(infoLevelKey(shrine.infoLevel) || supportLevelKey(shrine.supportLevel)) && (
        <div className="preview-meta-row">
          <InfoLevelBadge level={shrine.infoLevel} />
          <SupportLevelBadge level={shrine.supportLevel} />
        </div>
      )}
      {(statusLabel || shrine.statusNote) && (
        <div className="preview-status-note">
          {statusLabel}
          {statusLabel && shrine.statusNote && ' — '}
          {shrine.statusNote && <bdi>{shrine.statusNote}</bdi>}
        </div>
      )}
      {leadText && <p className="preview-description">{leadText}</p>}
      {relatedTour && (
        <div className="preview-related-tour">
          <span>
            {translate(lang as Lang, 'partOfTour')}: {localizeTourTitle(relatedTour, lang as Lang)}
          </span>
          <button className="preview-related-tour-btn" onClick={() => onStartTour(relatedTour.id)}>
            {translate(lang as Lang, 'viewTour')}
          </button>
        </div>
      )}
      <div className="preview-actions">
        <Link to={`/shrine/${shrine.slug}`} className="preview-view-link">
          {translate(lang as Lang, 'viewFullDetails')}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button
          className={`preview-copy-link${copied ? ' copied' : ''}`}
          onClick={handleCopyLink}
          aria-label={
            copied ? translate(lang as Lang, 'linkCopied') : translate(lang as Lang, 'copyLink')
          }
          title={translate(lang as Lang, 'copyLink')}
        >
          {copied ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )}
          <span>
            {copied ? translate(lang as Lang, 'copied') : translate(lang as Lang, 'share')}
          </span>
        </button>
      </div>
    </div>
  );
}
