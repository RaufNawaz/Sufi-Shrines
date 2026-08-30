/** Type surface for kinExport.mjs — see the .mjs for the mapping and its reasons. */
export interface KinExportMapping {
  /** True where schema.org has the exact term; false where `sufi:` supplies it. */
  schemaOrg: boolean;
  /** The local name of the predicate, without its prefix. */
  term: string;
  /** Emitted from both ends, because Turtle here carries no OWL to infer it. */
  symmetric?: boolean;
}

export interface KinTriple {
  subjectSlug: string;
  predicate: string;
  objectSlug: string;
  schemaOrg: boolean;
}

export const KIN_EXPORT_PREDICATE: Record<string, KinExportMapping>;

/** Throws on a `kinType` with no mapping, rather than dropping the relation. */
export function kinTriples(relations: readonly { type: string; kinType?: string; id: string; subject: string; object: string }[]): KinTriple[];
