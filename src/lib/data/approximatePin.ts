import type { Shrine } from '../../types/shrine';
import { getFieldValue } from './fieldAliasing';

/**
 * Phrases with which the archive flags its own coordinates as approximate. Read
 * from the entry's own prose because that is where the survey records it — these
 * are sentences a fieldworker wrote, not a column anyone thought to add.
 *
 * "approximate landmark", not "approximate": the bare word also matched a
 * date ("converts to approximately 1728 CE") and called Shah Inayat Qadiri's
 * pin a guess (17 October 2026).
 */
const APPROXIMATE_PIN =
  /approximate landmark|not the (?:shrine|grave)'s exact position|no coordinates|precise pin/i;

/** Whether the entry says its own pin is not the site's exact position. */
export function pinIsApproximate(shrine: Shrine): boolean {
  return APPROXIMATE_PIN.test(
    [
      getFieldValue(shrine.raw, 'Location'),
      getFieldValue(shrine.raw, 'year_built_note'),
      getFieldValue(shrine.raw, 'status_note'),
    ].join(' '),
  );
}
