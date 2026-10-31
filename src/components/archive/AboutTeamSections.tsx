import { useLang } from '../../lib/i18n/LanguageContext';
import { tFn } from '../../lib/i18n/uiStrings';
import { Fact, Stat } from './CoverageStats';
import { ArchiveKnows } from './ArchiveKnows';
import { ArchiveState } from './ArchiveState';
import graph from '../../../data/kg-stats.json';

/**
 * The team's half of /about: the graph's state, how much of it a person has
 * checked, everything `/coverage` and `/report` were, and why the coverage is
 * what it is. Moved out of AboutPage on 31 October 2026 so the public build,
 * which never shows it, never ships it either (docs/TEAM_ACCESS_PLAN.md):
 * AboutPage imports this lazily, and only in builds that have a team view.
 */
export function AboutTeamSections({
  shrines,
  coverage,
}: {
  shrines: React.ComponentProps<typeof ArchiveState>['shrines'];
  coverage: React.ComponentProps<typeof ArchiveKnows>['coverage'];
}) {
  const { lang, t, fmtNum } = useLang();
  return (
    <>
      {/* The graph's own state, from data/kg-stats.json.
      The section above counts the archive's *sites*; this counts the
      people, silsilas and links behind them — and then counts how much
      of that a person has actually checked. An archive that publishes
      "136 figures" and not "94 of their biographies were read out of
      prose by a machine and by no editor" is publishing the flattering
      half. The numbers come from a ~400-byte build artefact rather than
      from the graph itself, because `src/lib/kg.ts` imports kg.json
      statically and six counts are not worth 426 KB. */}
      <section className="about-section" id="graph">
        <h2 className="about-section-heading">{t('aboutGraphHeading')}</h2>
        <p className="about-note">{t('aboutGraphNote')}</p>
        <div className="coverage-stat-grid">
          <Stat value={graph.figures} label={t('aboutGraphFigures')} />
          <Stat value={graph.orders} label={t('aboutGraphOrders')} />
          <Stat value={graph.lineageLinks} label={t('aboutGraphLineageLinks')} />
          <Stat value={graph.observances} label={t('aboutGraphObservances')} />
          <Stat value={graph.sources} label={t('aboutGraphSources')} />
          <Stat value={graph.titles} label={t('aboutGraphTitles')} />
          <Stat value={graph.places} label={t('aboutGraphPlaces')} />
          <Stat value={graph.lineageOnlyFigures} label={t('aboutGraphLineageOnly')} />
        </div>
      </section>

      <section className="about-section" id="trust">
        <h2 className="about-section-heading">{t('aboutTrustHeading')}</h2>
        <p className="about-note">{t('aboutTrustNote')}</p>
        <ul className="coverage-facts">
          <Fact
            value={graph.biographiesMachineRead}
            label={t('aboutTrustBiographies')}
            noun=""
          />
          {/* "80 of 86", not "80 … (86)" — a bare count of unreviewed
          links says nothing without its denominator, and the
          denominator belongs *inside* the sentence: Urdu puts it in a
          different place, which is precisely what tFn is for. The
          ratio is the fact here — most of this graph's lineage is
          machine-read. */}
          <Fact
            value={graph.lineageLinksUnreviewed}
            label={fmtNum(tFn(lang, 'aboutTrustLineage', graph.lineageLinks))}
            noun=""
          />
          <Fact
            value={graph.orderMembershipsUnreviewed}
            label={fmtNum(tFn(lang, 'aboutTrustMemberships', graph.orderMemberships))}
            noun=""
          />
          <Fact
            value={graph.disputedDateFigures}
            label={t('aboutTrustDisputed')}
            noun=""
          />
        </ul>
      </section>

      {/* Everything `/coverage` was. The support and info breakdowns used to
      appear here in summary and again in full one route away; they
      appear once now, in full. */}
      <ArchiveKnows shrines={shrines} coverage={coverage} />

      {/* Everything `/report` was, minus the three breakdowns it drew a
      second time from a second builder. What is left is what only it
      had: the state of the sites, how the prose was made, the Urdu
      mirror's progress, and the two ledgers. */}
      <ArchiveState shrines={shrines} />

      <section className="about-section coverage-why" id="why">
        <h2 className="about-section-heading">{t('coverageWhyHeading')}</h2>
        <p>{t('coverageWhy')}</p>
      </section>
    </>
  );
}
