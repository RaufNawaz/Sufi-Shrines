# The trust vocabulary, derived — seven definitions for review

Every entry wears two badges. **31% of entries say "Source-seeded" and nothing on the site says
what that means**, or how it differs from "Source-documented" (58%). A reader is asked to weigh a
claim using a scale whose units are undisclosed. The badges' only affordance is a `title=`
tooltip, and it explains the *dimension* — "how this entry's information was gathered" — never the
values.

Ruled 30 August 2026: derive the definitions from the code, and put them to a human before they
are published. This is that derivation. **Nothing below is authored.** Each line is the archive's
own rule, and the source is named so the wording can be checked against it rather than trusted.

---

## Where these come from

`pipeline/build_sources_registry.py` **computes** both levels from an entry's bibliography — it
is not a hand-assigned label — and states the rules in its own docstring (lines 20–30) and again
as executable code (lines 153–161). `docs/HANDOVER.md` §3 "Provenance layers" gives the same four
support levels in the same order, and opens with the line that matters most: *"Computed from the
bibliography, not asserted by hand."*

That is why these can be published without an editorial decision about *meaning*. The only
decision left is **wording**: whether a reader is told the rule in these words.

---

## `support_level` — how the information was gathered

| Badge | The rule, as the code applies it | Share |
| --- | --- | --- |
| **Field-verified** | An enumerator visited the site; a field survey is cited. | — |
| **Source-documented** | Two or more specific, checkable works are cited. | 58% |
| **Source-seeded** | Exactly one specific work is cited — or one specific work plus generic filler. | 31% |
| **Web-compiled** | Only encyclopaedias, press, registers or generic lines. No specific work. | — |

The distinction the badges turn on, and the one a reader most needs: **a "specific work" is a
book, gazetteer or survey a reader could go and check.** A bibliography line reading *"General
established histories of the Qadiri order in the Punjab"* is a placeholder, not a citation, and
the registry separates the two before counting. Without that separation the badge would be
flattering rather than honest — HANDOVER §3 says so in as many words.

## `info_level` — how much this archive holds, never how important the site is

| Badge | The rule, as the code applies it |
| --- | --- |
| **Full** | The entry is field-verified. |
| **Moderate** | Source-documented or source-seeded, **and** the entry runs to at least 150 words. |
| **Low** | Web-compiled, or very short, or carrying no bibliography at all. |

`src/lib/data/infoLevel.ts` already states the second half of that heading in a code comment —
*"the level describes how much documentation WE hold for a site, never the site's importance"* —
and it is the sentence most worth putting in front of a reader, because it is the reading a badge
saying "Low" on a major shrine will otherwise invite.

---

## What is decided, and what is still open

**Decided** (by the code, years of it): what each value means.

**Open, and yours:**

1. **The wording.** The table above is my compression of the rule. It is a public statement about
   the archive's method, so it should read the way you would say it.
2. **The 150 words.** The Moderate rule has a numeric threshold in it. Publishing the number is
   more honest and invites "why 150?"; omitting it makes the definition vaguer than the code.
3. **The Urdu.** Seven definitions in Urdu is Urdu prose, and RULE 2 puts authoring it beyond an
   agent. This is the reason the glossary is not already on `/about`: shipping it in English only
   would put seven English paragraphs into the Urdu view — the thing i18n rule 7 forbids and the
   thing `/about`'s leak budget is supposed to drive to zero, not up. **The English half is ready
   to ship the moment there is an Urdu half.**

## When the wording is settled

The code around it is small and already has its patterns:

- A definition list under `/about` §6 and §7 with stable anchors (`#support-field-verified`, …),
  the same shape `about#source-…` already uses.
- Each badge becomes a link to its own anchor — the pattern `Built form → /typology#…` already
  establishes on the shrine page.
- `SupportLevelBadge` and `InfoLevelBadge` are the only two components that change.
