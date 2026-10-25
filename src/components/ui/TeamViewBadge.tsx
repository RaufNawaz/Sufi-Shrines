import { useLang } from '../../lib/i18n/LanguageContext';
import { setProjectAccess, useTeamAccess } from '../../lib/projectAccess';

/**
 * Says, on every page, that the team view is on, with a one-tap way out.
 *
 * The team view shows what the public never reads (qualifiers, the review
 * desk, the self-account on About), and before this nothing on the page said
 * so: a screenshot taken for publication could carry team-only text without
 * anyone noticing. docs/TEAM_ACCESS_PLAN.md, Phase 1.
 */
export function TeamViewBadge() {
  const { t } = useLang();
  const teamView = useTeamAccess();
  if (!teamView) return null;
  return (
    <div className="team-view-badge" role="status">
      <span className="team-view-badge-label">{t('settingsTeamLabel')}</span>
      <button
        type="button"
        className="team-view-badge-exit"
        onClick={() => setProjectAccess(false)}
        aria-label={t('turnOffTeamView')}
        title={t('turnOffTeamView')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
