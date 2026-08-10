# Allo Mahar — resolving the figure mismatch

## The problem

| Field | Current value |
|---|---|
| `Sufi Saint` | Pir Syed Muhammad Channan Shah Nuri |
| `Founded/Opened` | 1898 |
| `Description` | ~700 words entirely about **Sayyid Faiz-ul-Hassan Shah** (c. 1911–1984) |

The row's structured fields and its prose describe two different men. Both are real, both are from Allo Mahar Sharif in Daska tehsil, Sialkot — which is exactly why the error is hard to spot and easy to make. Given the village name and a thin source, the model wrote about the more heavily documented of the two and never checked it against its own row.

## Why the obvious fix is the wrong one

The tempting move is to have me write a replacement biography of Channan Shah Nuri. **I've deliberately not done that.** I have no source on him in hand, and generating a confident life-and-legacy entry from model priors is precisely the failure mode this exercise exists to catch. Fixing a hallucination by writing a second one is not a fix.

## Recommended resolution

**Treat this as one row that is probably two sites, and mark it unresolved.**

Replace the description with the short entry below, set `info_level = Low`, `needs_review = figure_unresolved`, and put Allo Mahar on the enumerator list. It is in Sialkot district — well within Saifullah's normal working range — and a single visit settles it: whose tomb is the darbar, is there more than one, and what does the *urs* actually commemorate.

### Proposed replacement description

> ## Overview
>
> Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot District, in the plain between the Chenab and the Kashmir foothills. The suffix *Sharif* — "noble" — marks the sanctity local tradition ascribes to it, and the village is known across Pakistani Punjab as a centre of Naqshbandi devotion associated with a line of *sayyid* families.
>
> ## A note on identification
>
> Two distinct figures are connected with this village, and our records do not yet establish which of them this shrine commemorates.
>
> **Pir Syed Muhammad Channan Shah Nuri** is the figure recorded in our database for this site, in the Naqshbandi tradition.
>
> **Sayyid Faiz-ul-Hassan Shah** (c. 1911–1984), honoured as *Khatib-ul-Islam*, was a celebrated orator of the *Ahl-e-Sunnat* tradition, also from Allo Mahar, who died in 1984 and is buried in the village.
>
> The village contains tombs of more than one member of these *sayyid* households, and a visit to Allo Mahar is understood by pilgrims as homage to a spiritual family rooted in the place rather than to a single figure. **This entry is awaiting a field visit to confirm which tomb the shrine refers to, whether the site should be recorded as more than one entry, and what the annual *urs* commemorates.** Until then we have deliberately left it brief rather than attribute a history to the wrong man.
>
> ## Bibliography
>
> - Pending. Prior source attribution for this entry has been withdrawn as unreliable.

## Field questions for the enumerator

1. Whose grave is the principal tomb of Darbar Allo Mahar Sharif?
2. How many tombs of the *sayyid* family are in the village, and are any separately visited?
3. Is Faiz-ul-Hassan Shah's grave at the same complex or a distinct site?
4. What date is the *urs*, in the Islamic calendar, and whom does it commemorate?
5. Which *silsila* do the current custodians name?
6. Who administers it — Auqaf, or a family *gaddi*?

## Wider lesson

This row is the clearest evidence for two changes already in the spec:

- **A row-internal consistency check.** Any entry whose `principal_figure` never appears in its own description should fail validation. That single rule would have caught this at generation time.
- **Cap output at what the source supports.** A thin source should produce a thin entry. The 700 words are what made a wrong attribution look authoritative.
