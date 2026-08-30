# Brief — the tradition layer is built; it needs a renderer

*Written 29 August 2026 by the knowledge-base session, for whoever is on features.*
*Everything below already exists and is gated. Nothing here asks you to research anything.*

---

## The finding, in one paragraph

The knowledge graph's only affiliation vocabulary is `belongs_to_order`, and every order in it
is Sufi. **90 of the archive's 169 sites are not Muslim shrines, and exactly one of those 90
carries a `silsila` cell.** So for the other 89 the graph knew a tradition only as `category` —
a six-value bucket — while the entries themselves name and describe specific traditions in
dedicated authored sections: *"The Nath Tradition"*, *"The Udasi Tradition and the Island
Complex"*, *"The Pranami Tradition"*, *"The Swaminarayan Tradition"*, *"Sant Baba Bhagat Ram and
the Daduvansi Tradition"*, *"The Shakti Peetha Tradition and the Falling of the Head"*. **No page
could reach one of them.** An archive that covers six traditions was describing five of them in
prose only a shrine page shows.

## What exists now

| | |
|---|---|
| `scripts/data/build-traditions.mjs` | picks + slicer. `--check` runs in `npm run data:validate` |
| `data/kg-seeds.json` | `traditions`, `traditionMemberships`, `traditionNonMemberships` |
| `data/kg-traditions.json` | **the file to render from** — 8 traditions, 21 memberships across 18 sites |
| `src/lib/__tests__/traditions.test.ts` | verbatim, Urdu-present, category-valid, non-memberships kept |

Shape:

```jsonc
{
  "traditions": [{
    "slug": "nath",
    "name": "Nath",
    "nameUr": "ناتھ",
    "alsoKnownAs": ["Nath sampradaya", "Kanphata yogis"],
    "category": "Hindu Temple",        // the six-value bucket it sits inside
    "definition":   "The Naths, who flourished across…",
    "definitionUr": "ناتھ، جو قرون وسطیٰ کے…",
    "definitionShrine": "dargah-pir-ratan-nath-jee",
    "source": "data/shrines.csv#dargah-pir-ratan-nath-jee"
  }],
  "memberships": [{
    "traditionSlug": "nath",
    "shrineSlug": "tilla-jogian",
    "shrineName": "Tilla Jogian",
    "quote": "It became the principal seat of the *Kanphata* yogis…",
    "source": "data/shrines.csv#tilla-jogian"
  }]
}
```

**Updated 29 August 2026, after the brief was first written:** grown from 6 traditions / 10
memberships to **8 / 21**, by adding **Nanakpanthi** (9 sites — the largest, and the tradition
the archive's own category name pairs with Udasi) and **Sevapanthi** (1). The shape did not
change, so anything written against the earlier file still holds. Two rows are worth designing
for: `guru-gurpat-mandir-db-80-sirey-ghat` and `sevapanthi-darbar-bhai-gurdas-gandava` each
carry **two** memberships, because their entries assert two traditions in one sentence — so a
site is not guaranteed to have at most one.

## Four things to get right when you render it

1. **Import it statically inside the route that shows it, never via `src/lib/kg.ts`.** That is
   why it is a separate file: `kg.json` is a static import in `kg.ts`, so anything put there
   rides onto every route that touches the graph. Order prose is the worked example —
   `OrderPage.tsx` imports `data/kg-order-prose.json` directly and only OrderPage's chunk grew
   (HANDOVER §9.125, §9.127).

2. **`definition`/`definitionUr` is the page's account, so the Urdu one is not optional.** Show
   `definitionUr` under `?lang=ur`. Rendering the English there is an untranslated sentence, not
   a citation, and the no-leak guard will fail you on it — it already did, on seven routes, the
   first time the order passages shipped in English behind `data-latin` (§9.128).

3. **`quote` on a membership is evidence and may stay English**, in a `<blockquote lang="en"
   dir="ltr" data-latin>` with its `source` under it — same as `LineageView` and `KinView`. The
   difference from (2) is the whole rule: a quotation supporting a claim the reader already has
   in Urdu is a citation; a paragraph that *is* the account is not.

4. **Run both through `renderInlineBold`.** These are Description prose, so they carry the
   archive's markdown — a raw `*sampradaya*` shows its asterisks to the reader.

## Where it could go — my suggestion, not a decision

- **Cheapest and most useful:** a line in `ShrineInfobox` for the 10 sites that have one, linking
  to the tradition. Ten pages gain a fact they do not currently state.
- **The natural home:** `/typology`, which is already the page about *kinds* of site. Traditions
  are the other axis and the page has no competition for the space.
- **A `/tradition/:slug` route** would mirror `/order/:slug` and could reuse `OrderProse`
  almost unchanged — but it needs prerendering (`scripts/check-routes-prerendered.mjs` fails the
  build otherwise) and it is six thin pages today. Probably later.

## What is deliberately NOT in it

- **Membership by term match.** A scan for these words is mostly false positives and they are
  not obvious: *udasi* is also the word for Guru Nanak's four **journeys** (two gurdwara entries
  say "during his third journey (*udasi*)" and mean travel); Nankana Sahib names Udasi *mahants*
  in an account of the movement to **remove** them; *jogi* catches Ranjha, who becomes one for
  love of Heer in Waris Shah's poem; *Jogiwara* is a street in Peshawar. All seven are recorded
  in `traditionNonMemberships` with the reason, and `traditions.test.ts` fails if one is ever
  also asserted as a membership. **Do not add memberships from a search.**
- **Sufi orders.** They already have `/order/:slug`; this layer is the other five traditions.
- **Anything a site's entry does not say.** Ten memberships is what the corpus actually asserts.
  Hinglaj "features in Nath yogi and Charan bardic traditions" — appearing in someone's lore is
  a real relationship and it is not belonging, so it is a recorded non-membership rather than an
  eleventh row.

## If you extend it

Add a pick to `TRADITIONS` or `MEMBERSHIPS` in `scripts/data/build-traditions.mjs` — a shrine
slug plus the first and last few words of the run — and re-run it. Text is **sliced from the
corpus, never retyped**, so a marker that stops matching fails the script instead of quietly
publishing drifted prose. A new tradition needs an Urdu definition too; every one of the 168
entries has an Urdu article in `src/data/urdu-content.json`, section for section.
