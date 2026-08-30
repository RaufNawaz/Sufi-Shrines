import type { KinLink } from '../kg';
import type { UiStrings } from '../i18n/uiStrings';

/**
 * The closed vocabulary of kinship roles, and the UI string each renders as.
 *
 * In its own module rather than inside `KinView` because three callers need it —
 * the figure page's chip, the `/graph` roster's note, and the spec that asserts
 * every role has a label in both languages — and a page reaching into a
 * component for its private table is the thing this repo already decided
 * against for `centuryLabel`.
 *
 * Urdu is why the vocabulary is closed rather than free text. It splits what
 * English does not: دادا is a father's father and نانا a mother's, چچا a
 * father's brother and ماموں a mother's. A single translated "grandfather"
 * would assert a line most of these entries never state, so where the entry
 * says which side the specific role is used, and where it does not the
 * `*Unspecified` role keeps both readings. English keeps the plain term for
 * every one of them — it has no ambiguity to resolve, and the source's own
 * sentence is printed directly beneath the row.
 */
export const KIN_ROLE_KEYS: Record<string, keyof UiStrings> = {
  father: 'kinRoleFather',
  son: 'kinRoleSon',
  daughter: 'kinRoleDaughter',
  grandfatherPaternal: 'kinRoleGrandfatherPaternal',
  grandfatherUnspecified: 'kinRoleGrandfatherUnspecified',
  grandsonPaternal: 'kinRoleGrandsonPaternal',
  grandsonUnspecified: 'kinRoleGrandsonUnspecified',
  unclePaternal: 'kinRoleUnclePaternal',
  uncleMaternal: 'kinRoleUncleMaternal',
  uncleUnspecified: 'kinRoleUncleUnspecified',
  nephewPaternal: 'kinRoleNephewPaternal',
  nephewMaternal: 'kinRoleNephewMaternal',
  nephewUnspecified: 'kinRoleNephewUnspecified',
  fatherInLaw: 'kinRoleFatherInLaw',
  sonInLaw: 'kinRoleSonInLaw',
  ancestor: 'kinRoleAncestor',
  descendant: 'kinRoleDescendant',
  /* The symmetric pair. Both ends of a `sibling_of` tie are drawn from these
     two, because the sides are interchangeable and the words are not: two
     brothers read `brother` twice, while Bebe Nanaki reads `sister` and Guru
     Nanak `brother` off the same single stored edge. Urdu has no
     maternal/paternal split to resolve here, unlike چچا/ماموں — بھائی and بہن
     are simply the words. */
  brother: 'kinRoleBrother',
  sister: 'kinRoleSister',
};

/**
 * The string key for what to call the figure at the other end of a tie.
 *
 * The plural form is needed for exactly one edge in the graph: the six women of
 * Bibi Pak Daman are one `Collective` node, and "daughter" would be wrong on
 * their father's page. It rides on a flag rather than a seventeenth role,
 * so the vocabulary stays a list of relationships.
 */
export function kinRoleKey(link: KinLink): keyof UiStrings | undefined {
  if (link.plural && link.role === 'daughter') return 'kinRoleDaughters';
  return KIN_ROLE_KEYS[link.role];
}
