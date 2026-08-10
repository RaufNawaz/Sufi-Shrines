# Patch addendum — Shaktipeeth Shri Hinglaj Mata Mandir

The 163-vs-162 gap was my omission, not a data problem. This site exists in the sheet
and I missed it when building `shrines_field_patch.tsv`. Below are the values to fill in
by hand after import — one row, seven fields that matter.

## Why it was worth catching

This is not a marginal entry. Hinglaj is one of the fifty-one **Shakti Peethas**, one of
only two in Pakistan, and the **Hinglaj Yatra is the largest Hindu pilgrimage in the
country**. It is also the destination that gives Chandragup — already in the patch — its
entire significance, since Chandragup is a halting-point on the route to it. Leaving the
terminus unclassified while the waypoint is classified would have been an odd gap.

## Values

| Column | Value |
|---|---|
| `id` | `shaktipeeth-shri-hinglaj-mata-mandir` |
| `category` | `Hindu Temple` |
| `site_type` | `Cave shrine` |
| `status` | `Active` |
| `principal_figure` | `Hinglaj Mata (Hingula Devi)` |
| `figure_type` | `Deity` |
| `silsila` | *(blank)* |
| `year_built` | *(blank)* |
| `year_built_precision` | `unknown` |
| `year_built_note` | `Natural cave shrine of unrecorded antiquity; Hinglaj Sheva Mandali temple committee established 1986` |
| `figure_born` | *(blank)* |
| `figure_died` | *(blank)* |
| `event_year` | *(blank)* |
| `event_note` | *(blank)* |
| `events` | `Hinglaj Yatra (April, four days) — the largest Hindu pilgrimage in Pakistan; ritual halts at Chandragup and the Hingol river en route` |
| `flags` | `DATE_CORRECTED;PATCH_ADDENDUM` |
| `needs_review` | *(clear the `unmatched_in_patch` value)* |

## Note on the date

The sheet records `Founded/Opened = 1986`. That is not a construction date — it is the
year the **Hinglaj Sheva Mandali**, the temple committee that organises the pilgrimage,
was established. The shrine itself is a natural cave whose veneration is of unrecorded
antiquity, and the deity is worshipped there not as a carved idol but as a mud-stone form
daubed with sindoor.

So `year_built` is left blank rather than filled with 1986. This is exactly the
`Founded/Opened` overload the split was designed to fix, and it would have gone unnoticed
had the row matched cleanly.

## Tab-separated line

Append to `shrines_field_patch.tsv` if you want the patch file to be complete for future
runs (column order matches the existing header):

```
Shaktipeeth Shri Hinglaj Mata Mandir	shaktipeeth-shri-hinglaj-mata-mandir	Hindu Temple	Cave shrine	Active	Hinglaj Mata (Hingula Devi)	Deity				unknown	Natural cave shrine of unrecorded antiquity; Hinglaj Sheva Mandali temple committee established 1986					Hinglaj Yatra (April, four days) — the largest Hindu pilgrimage in Pakistan; ritual halts at Chandragup and the Hingol river en route	DATE_CORRECTED;PATCH_ADDENDUM
```
