/** Type surface for saintIdentity.mjs — see the .mjs for why the rule is exact. */
export function saintNameKey(name: string): string;
export function findNameKeyCollisions(
  nodes: Array<{ slug: string; name: string }>,
): Map<string, string[]>;
