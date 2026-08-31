/**
 * saintIdentity.mjs — the one rule this project will accept as evidence that
 * two figure nodes are the same person.
 *
 * The graph builds figure nodes from two independent sides. The sheet side
 * takes `principal_figure`, runs it through `saintMergeVariants`, and slugifies
 * the result. The proposal side takes the slug an extractor wrote down while
 * reading prose. When those two disagree about the same man, the graph grows a
 * second node for him, and the archive splits his life across two pages: on
 * 28 August 2026, `hazrat-wasif-ali-wasif-awan` held Wasif Ali Wasif's shrine
 * and his ʿurs while `hazrat-wasif-ali-wasif` held his master and both his
 * orders, and no page could show a reader both halves.
 *
 * `saintNameKey` is the join that closes that split: case, punctuation and
 * whitespace are normalised and NOTHING ELSE IS. It is an identical-name test,
 * not a similarity test.
 *
 * ── why it stops there, which is the whole point ──────────────────────────────
 *
 * The obvious improvement is to strip honorifics and name particles (Hazrat,
 * Syed, Shah, Baba, Khwaja, Sarmast…) before comparing, so that near-identical
 * names also join. That was measured on this corpus on 28 August 2026 and it is
 * a trap. A token matcher over honorific-stripped names proposed 21 merges of
 * which **2 were right and 19 were wrong**, and the wrong ones were not random:
 *
 *   - `shaikh-abdul-latif` is Khwaja Muhammad Zaman's father, a Naqshbandi of
 *     Luari Sharif — NOT Shah Abdul Latif Bhittai.
 *   - `sayyid-shah-inayat` is Shah Chan Charagh's maternal uncle — NOT Shah
 *     Inayat Qadiri of Lahore, Bulleh Shah's murshid.
 *   - `shah-saidan-sarmast` is Shah Daula Daryai's Suhrawardi master — NOT
 *     Sachal Sarmast.
 *   - `khwaja-muhammad-qasim` (Zinda Pir of Ghamkol Sharif, 1912–1999) and
 *     `khwaja-muhammad-qasim-sadiq` (Mohra Sharif, b. c. 1846) are pupil and
 *     master.
 *
 * In a corpus of Sufi silsilas the people most likely to share a name are
 * fathers and sons, uncles and nephews, masters and disciples — which is to say
 * that name similarity here correlates with being a DIFFERENT person standing
 * one edge away. A similarity merge does not just make an error; it deletes the
 * relation that made the pair worth recording. So the rule stays exact, the
 * hard cases are recorded as decisions in `kg-seeds.json` (`saintMergeVariants`
 * to join, `saintDoNotMerge` to forbid), and a human makes them.
 *
 * `validate-kg-identity.mjs` enforces both directions, but note where each
 * enforcement has to live. This function is what joins, so a loosening of it is
 * caught by pinning its output in the unit test. The forbidding is enforced
 * against the *built graph* instead: a recorded pair that has become one node
 * fails the build whatever computed the merge — which matters, because the
 * dangerous merge is a similarity score that never calls this function at all.
 */

/**
 * Conservative identity key for a figure's display name.
 * Lowercases, folds curly apostrophes, reduces every other punctuation run to a
 * single space, and collapses whitespace. Honorifics and particles are kept.
 */
export function saintNameKey(name) {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Group slugs by identical name key. Returns only the groups with more than one
 * member — i.e. the places where two nodes claim the same name.
 *
 * Reads `name` only. `findAltNameCollisions` below is the other half.
 *
 * @param {Array<{slug: string, name: string}>} nodes
 * @returns {Map<string, string[]>} name key → slugs, in input order
 */
export function findNameKeyCollisions(nodes) {
  const byKey = new Map();
  for (const node of nodes) {
    const key = saintNameKey(node.name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(node.slug);
  }
  return new Map([...byKey].filter(([, slugs]) => slugs.length > 1));
}

/**
 * The same identical-name test, applied to `altNames` as well as `name`.
 *
 * ## Why this exists separately
 *
 * `findNameKeyCollisions` iterates `node.name` and nothing else, and the rule it
 * enforces — stated in its caller — is *"Identical names are the one signal this
 * project accepts as proof of the same person."* **An `altName` is a name.**
 * With it read, the archive has five cross-node collisions where the gate
 * reported zero, and `saintDoNotMerge` records a decision on none of them:
 *
 *     "bhai gurdas singh"  bhai-gurdas-singh (name)  ·  bhai-gurdas (alt)
 *     "kanhiya lal"        bhai-gurdas-singh (alt)   ·  bhai-gurdas (alt)
 *     "bhai kanya lal"     bhai-gurdas-singh (alt)   ·  bhai-gurdas (alt)
 *     "jhulelal"           jhulelal (name)           ·  sheikh-tahir (alt)
 *     "zinda pir"          khwaja-muhammad-qasim (alt) · jhulelal (alt)
 *
 * ## What it must not do
 *
 * **Decide.** `docs/KG_REVIEW_WORKFLOW.md` records that 19 of 21
 * name-similarity merges attempted here were wrong, and RULE 2 forbids settling
 * an identity from general knowledge. Two nodes sharing three names is a
 * question, not an answer — and the more likely reading is two correct pages
 * each carrying the other's names in its "also known as" list, which is its own
 * defect: a reader at `/saint/bhai-gurdas` sees "Bhai Gurdas Singh" as an alias
 * with no way to learn that a different figure holds it as a name.
 *
 * So this reports a pair for adjudication. The verdict — merge, or a
 * `saintDoNotMerge` entry with a quote and a source — is a person's.
 *
 * @param {Array<{slug: string, name: string, altNames?: string[]}>} nodes
 * @returns {Map<string, Array<{slug: string, value: string, field: 'name'|'altName'}>>}
 */
export function findAltNameCollisions(nodes) {
  const byKey = new Map();
  for (const node of nodes) {
    const claims = [
      { value: node.name, field: 'name' },
      ...(node.altNames ?? []).map((value) => ({ value, field: 'altName' })),
    ];
    for (const { value, field } of claims) {
      const key = saintNameKey(value);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ slug: node.slug, value, field });
    }
  }
  /* Only where two *different* nodes claim the key. One node listing a name and
     a punctuated variant of it — `khwaja-muhammad-qasim` carries both
     `Zinda Pir` and `"Zinda Pir"`, quotes included — is a data-hygiene matter for
     `altNames` and not an identity question. */
  return new Map(
    [...byKey].filter(([, claims]) => new Set(claims.map((c) => c.slug)).size > 1),
  );
}
