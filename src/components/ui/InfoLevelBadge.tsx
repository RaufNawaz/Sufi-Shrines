import React from 'react';
import { useLang } from '../../lib/i18n/LanguageContext';
import { infoLevelKey, INFO_LEVEL_LABEL_KEYS } from '../../lib/data/infoLevel';

interface Props {
  /** Raw `info_level` sheet value — renders nothing when blank or unknown. */
  level: string;
  className?: string;
}

/** Evidence badge: how much documentation WE hold for a site (Full →
 * "Field-verified", Moderate → "Documented from sources", Low → "Limited
 * information"). It must never read as a judgement on the shrine itself —
 * some of the least-documented sites are locally the most revered. */
export function InfoLevelBadge({ level, className = '' }: Props) {
  const { t } = useLang();
  const key = infoLevelKey(level);
  if (!key) return null;

  return (
    <span
      className={`info-level-badge info-level-badge--${key}${className ? ` ${className}` : ''}`}
      title={t('infoLevelTooltip')}
    >
      {t(INFO_LEVEL_LABEL_KEYS[key])}
    </span>
  );
}
