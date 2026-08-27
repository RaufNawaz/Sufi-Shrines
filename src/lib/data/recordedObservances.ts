/**
 * Reading a site's observances the way both the order pages and the figure
 * pages need them: what the archive recorded, and whatever date can honestly be
 * read out of it.
 *
 * One function rather than two call sites doing the same three steps, because
 * the three steps encode a decision. The knowledge graph's event node carries a
 * `date`, and it is tempting — it is right there, typed, on the object you
 * already have. It is a bare month, present on 16 of 149 nodes, matched by the
 * builder out of the same cell this reads. A page that used it would show a date
 * for a sixth of the rows it can actually date, look complete, and be short by
 * exactly the day ranges, month ranges and seasons nobody counted.
 *
 * So the date comes from the shrine's own `Events` cell through `ursDates.ts`,
 * the almanac's reader, and the cell comes back with it — a surface that shows a
 * date the archive did not print must show the sentence it read the date out of.
 */
import type { Shrine } from '../../types/shrine';
import { getFieldValue } from './fieldAliasing';
import { parseObservances, type Observance } from './ursDates';

export interface RecordedObservances {
  /** The `Events` cell verbatim, '' when the record has none. */
  recorded: string;
  /** Every dated observance readable from it, best precision first. Empty is
   * the common case — roughly two thirds of the archive's observances name no
   * date, and a surface must say so rather than place them. */
  dates: Observance[];
}

/**
 * `undefined` is a real case, not defensive coding: the graph knows shrine slugs
 * the sheet has since dropped, and two sheet rows are dropped from the app for
 * having no coordinates. Either way the answer is "nothing recorded", which is
 * what the display already handles.
 */
export function readRecordedObservances(shrine: Shrine | undefined): RecordedObservances {
  const recorded = shrine ? getFieldValue(shrine.raw, 'Events') : '';
  return { recorded, dates: parseObservances(recorded) };
}
