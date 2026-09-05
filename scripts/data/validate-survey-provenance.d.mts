/** Types for `validate-survey-provenance.mjs`, whose predicates are unit-tested. */
export declare const CITATION_MARKER: string;
export declare const SURVEYED_SUPPORT_LEVEL: string;
export declare const KNOWN: Map<string, string>;
export declare const NOT_IN_DATASET: Map<string, string>;

export interface SurveyedShrine {
  id: string;
  /** The response's timestamp, as the form wrote it. */
  response: string;
  /** The shrine's name as the surveyor typed it, which is often not the sheet's. */
  name: string;
}

export declare function readSurveyedShrines(text: string): Map<string, SurveyedShrine>;

export interface ProvenanceFailure extends SurveyedShrine {
  /** One line per thing wrong: a missing citation, an under-stated support level, or both. */
  reasons: string[];
}

export declare function findFailures<
  T extends { id?: string; Description?: string; support_level?: string },
>(
  rows: readonly T[],
  surveyed: Map<string, SurveyedShrine>,
): { failures: ProvenanceFailure[]; absent: string[] };
