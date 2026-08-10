import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { supportLevelKey, SUPPORT_LEVEL_LABEL_KEYS } from '../../lib/data/supportLevel';

interface Props {
  /** Raw `support_level` sheet value — renders nothing when blank or unknown. */
  level: string;
  className?: string;
}

/** Provenance badge: how the underlying information was gathered (a field
 * survey, a cited source, a web compilation) — distinct from InfoLevelBadge,
 * which describes how complete our writeup is. Together they let a visitor
 * tell a field-verified entry from a web-compiled one. */
export function SupportLevelBadge({ level, className = '' }: Props) {
  const { t } = useLang();
  const key = supportLevelKey(level);
  if (!key) return null;

  return (
    <span
      className={`support-level-badge support-level-badge--${key}${className ? ` ${className}` : ''}`}
      title={t('supportLevelTooltip')}
    >
      {t(SUPPORT_LEVEL_LABEL_KEYS[key])}
    </span>
  );
}
