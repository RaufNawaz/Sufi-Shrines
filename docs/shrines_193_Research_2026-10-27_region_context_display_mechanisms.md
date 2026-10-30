# 193: Research note, 27 October 2026. How to link and display information general to a region (not a HANDOVER section)

## 1. The problem this note answers

The public descriptions keep meeting the same material: the Arab conquest of Sindh, British policy towards hereditary *pirs*, the villages of the Chaj Doab, Karachi's growth after Partition, the round of the *faqirs* from Sehwan to Karachi. Under rules 4 and 7 of the brief such material is either cut (it is not about the shrine), or kept with a hedge such as "more generally" so a reader does not take it as the shrine's own story. The same paragraphs recur across rows, and thin rows (Abdullah Shah Ghazi: 9,664 characters of team prose, 4,985 public) look empty because the corpus says little about the saint himself.

The proposal in chat on 27 October was a region layer: a register of regions, a link from each shrine to its regions, region articles in the same three versions as a shrine (team, public, Urdu), and a display that shows regional context beside each shrine. This note surveys how established sites and standards handle the same need and recommends a display.

## 2. What existing systems do

### 2.1 A containment hierarchy shown as a breadcrumb (Wikivoyage)

Wikivoyage arranges every destination article in a geographical hierarchy (Earth, continents, countries, regions, cities), and each level has its own article. A single template on each page names its one parent region; from it the site generates the breadcrumb trail at the top of the page and files the page into a region category automatically, so editors never assign categories by hand and pages missing a parent are listed for repair. Parent articles are expected to link down to the next level. Two lessons matter for us. First, Wikivoyage says plainly that its regions need not match legal boundaries: a region is defined by climate, culture, geography or administration as the case requires. Second, places that straddle two regions are usually attached to the next larger region that contains both. Both apply to the cultural regions our books use (Siwistan, Pothohar, the Chaj Doab), which have no official boundary.

### 2.2 One source of text, shown in many places (Wikipedia excerpts)

Wikipedia's Excerpt template shows the lead section (or a named section) of one article inside another. Its documentation lists the gains: less maintenance, because duplicated text need not be updated in several places; better quality, because editors improve one version instead of several; and collaboration channelled to one page. It also lists the costs: an excerpt does not always blend into the host article's formatting, and editors of the host page are not alerted when the source changes. The lesson for us: regional text should live once, in the region article, and be shown on shrine pages by reference, never copied into each description. The region article's opening paragraph must therefore be written to stand alone, since it will be read out of its own page.

### 2.3 Previews on hover or tap (Wikipedia Page Previews)

Wikipedia shows a short summary and image of a linked article when a reader hovers over the link. The feature was built to spare readers from opening several tabs to understand a term in context. Wikimedia's A/B tests on English and German Wikipedia found fewer pageviews but more distinct pages read, less use of the back button, and very few readers switching the feature off; the earlier tests found readers chose which pages to open more precisely. On Android the equivalent feature raised links clicked per page by about a fifth. For us, previews suit region names and glossary terms inside the prose: a reader who meets "Siwistan" or "the Chaj Doab" can see what it is without leaving the shrine.

Two cautions. Touch screens have no hover, so previews must open on tap as well. And WCAG 2.1 criterion 1.4.13 requires content that appears on hover or focus to be dismissible (for example with Escape), hoverable (the pointer can move into it without it vanishing) and persistent (it stays until dismissed or the trigger loses focus). Essential information must never live only in a preview.

### 2.4 Progressive disclosure and accordions (Nielsen Norman Group and government design systems)

Progressive disclosure shows the essential first and further detail on request; accordions are its commonest form. The design guidance agrees on the limits: hidden content gets less attention than visible content and costs a click, so accordions suit secondary material and are wrong for anything the reader needs; nesting accordions inside accordions should be avoided (the UK government guidance is cited for this); collapsed panels may not print; and all content should remain visible if JavaScript fails. For us this fits exactly: the shrine's own description is primary and stays fully visible, and regional context is secondary, so it may sit in panels, one level deep.

### 2.5 Object first writing (Smarthistory)

Smarthistory, Khan Academy's partner for art history, requires its essays to be object based: biography and historical context should flow out of the discussion of the object or monument, not precede it. The equivalent for us is that the shrine stays at the centre of its page. Regional context supports it and comes after it; it never leads the page or swells the description.

### 2.6 Linked place data (World Historical Gazetteer, Pelagios, schema.org)

The World Historical Gazetteer and the Pelagios Network share the Linked Places format, a JSON-LD format built on GeoJSON for historical place records, with names, types, geometry, time spans and relations to other places, and a simpler tab separated variant (LP-TSV) for plain records. Their recent work treats vague and fuzzy boundaries as normal and allows records with approximate geometry, or with none, linked to broader place clusters. That is our case for cultural regions. On the public web, schema.org's `containedInPlace` (inverse `containsPlace`) is the basic containment relation between places, and a shrine page can declare itself a Place that is also a TouristAttraction while naming its containing places, so search engines read the same hierarchy readers see.

### 2.7 The South Asian precedent (district gazetteers)

The colonial *Imperial Gazetteer of India* and the district gazetteers of the Punjab and Sindh already worked this way: province, then district, then tahsil, then place, with general history and economy written once at the higher level and short place notices below. Several of our team versions draw on books in that tradition. A region layer restores that division of labour without its colonial voice.

## 3. Mechanisms compared

| Mechanism | What the reader sees | Strengths | Weaknesses | Verdict |
|---|---|---|---|---|
| Breadcrumb | Pakistan › Sindh › Karachi above the title | Tells where the shrine is at a glance; cheap; automatic from the hierarchy | One parent only; cultural regions need a second line | Use |
| "About the area" panels | After the description, one panel per linked region with its opening paragraph and a link | Single source; clearly separate from the shrine's own text; fills thin pages honestly | Excerpts must be written to stand alone | Use, the core of the design |
| Previews on hover and tap | Card with a region's or term's opening lines when its name is touched | Context without leaving the page; proven to increase exploration | Accessibility rules; needs tap support | Use for region names and glossary terms |
| Region pages | Full region article, map, list of shrines, parent and child regions | Gives regional material a home; browsing by area | New pages to write and verify | Use |
| Map layer | Region outlines on the main map, shrines grouped by region | Shows the spatial logic | Fuzzy borders hard to draw | Later, and only for administrative regions |
| Text merged into the description | Regional paragraphs inside the shrine's prose | Longer descriptions | Duplicated text; readers take regional facts as the shrine's; breaks rules 4 and 7 | Avoid |
| Generated "nearby" text | Automatic sentences about neighbouring shrines | Cheap | Unverified prose in the site's voice | Avoid |

## 4. Recommended design for spiritualsitespakistan.com

### 4.1 Data

A new `data/regions.json`, one record per region, modelled on Linked Places so it can be exported to the World Historical Gazetteer later:

```json
{
  "id": "karachi",
  "name": "Karachi",
  "name_ur": "کراچی",
  "level": "city",
  "parent": "sindh",
  "kind": "administrative",
  "geometry": null,
  "aliases": ["Kolachi"]
}
```

Levels: province, division or district, city, and cultural region. `kind` separates administrative regions (which can be assigned automatically from each shrine's coordinates against boundary data) from cultural regions (Siwistan, Pothohar, the Chaj Doab, the Indus delta, Thar, Makran), which are assigned by hand and may have no geometry, as the gazetteer projects allow.

Each shrine gets a `region_ids` column, most specific first (`karachi;sindh`), plus an optional `cultural_region_ids` column. A shrine that straddles two regions is attached to the smallest region containing both, following Wikivoyage.

The page carries schema.org JSON-LD: the shrine as a Place and TouristAttraction, with `containedInPlace` pointing to its region pages.

### 4.2 Content

Region articles live in `entries/regions/<id>.md` (team version), `entries/regions_public/<id>.md` and `<id>.ur.md`, and pass through the same brief and the same three verifiers as the shrine descriptions, with three added rules:

1. The opening paragraph (80 to 150 words) must stand alone, because it is what shrine pages show.
2. The prose never makes a claim about a particular shrine; region pages list their shrines automatically instead.
3. The Urdu opening paragraph is verified as a unit in its own right, since it too is shown out of context.

The first drafts can be built from material already in the repo: paragraphs the public description notes mark as general ("never said of this shrine", "more widely", "more generally") and the Setting sections of the team versions, collected by region.

### 4.3 Display on a shrine page

In order, from top to bottom:

1. **Breadcrumb** above the title: Pakistan › Sindh › Karachi. If the shrine has a cultural region, a second quiet line: "Also in the historic region of Siwistan". In Urdu the trail runs right to left.
2. **The description**, unchanged and fully visible. The shrine is the subject of the page.
3. **About the area**, a clearly headed block after the description, styled differently (a tinted band or a bordered card) so no reader mistakes it for the shrine's own account. One panel per linked region, at most three, most specific first. Each panel shows the region's opening paragraph in full, then "Read more about Sindh". Not accordions by default: the opening paragraphs are short enough to show, and showing them is what makes a thin page feel complete. On phones, panels after the first may collapse, one level only, with "Expand all" for printing.
4. **Previews**: region names and glossary terms inside the description and the panels open a small card on hover, keyboard focus or tap, built to WCAG 1.4.13 (Escape closes it, the pointer can enter it, it does not time out).

### 4.4 Region pages

Each region page shows its public article, a map of its shrines, a list of them grouped by type, its parent region in the breadcrumb, and links to the regions it contains. This is also where the team version can sit behind the Team view, as planned for shrines.

### 4.5 What it changes in the current pipeline

If adopted, the public description brief gains one rule: general regional context is not written into a shrine's Setting section when its region has an article; the Setting keeps only what ties the region to this shrine. The 50 finished rows would be trimmed of duplicated regional paragraphs once the region articles exist, not before.

## 5. What to avoid

Merging regional text into description prose to make descriptions longer; any context that appears only on hover; accordions inside accordions; more than three region panels on one page; and automatically generated sentences in the site's voice.

## 6. Questions for Rauf

1. Which levels to use: province and district only at first, or cities and cultural regions too?
2. The first list of cultural regions, and who rules on doubtful assignments.
3. Whether the public "Setting" sections stop carrying general regional material now (saves rework on the remaining 44 rows) or after the region articles exist.
4. Whether to extend the same mechanism to Sufi orders and practices (Chishti, Suhrawardi, *dhamal*, *ʿurs*, *langar*) as topic pages with previews.

## 7. Sources

- Wikivoyage, Geographical hierarchy: https://en.wikivoyage.org/wiki/Geographical_hierarchy
- Wikivoyage, Template:IsPartOf documentation: https://en.wikivoyage.org/wiki/Template:IsPartOf/doc
- Wikivoyage, Region categories: https://en.wikivoyage.org/wiki/Wikivoyage:Region_categories
- Wikivoyage, What is an article?: https://en.wikivoyage.org/wiki/NOT
- Wikipedia, Template:Excerpt (documentation, mirrored): https://techinfodepot.shoutwiki.com/wiki/Template:Excerpt
- MediaWiki, Page Previews: https://www.mediawiki.org/wiki/Page_Previews and https://www.mediawiki.org/wiki/Hovercards
- W3C, Understanding SC 1.4.13 Content on Hover or Focus: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus
- Nielsen Norman Group, Accordions Are Not Always the Answer for Complex Content on Desktops (Hoa Loranger, 2014): https://www.nngroup.com/articles/accordions-complex-content/
- California Courts design system, Accordions: https://webservices.courts.ca.gov/design-system/component-library/accordions
- Parallel, summary of accordion guidance (NN/g, UK government): https://www.parallelhq.com/blog/what-accordion-website
- Smarthistory, contributor guidelines: https://smarthistory.org/?p=20694
- World Historical Gazetteer documentation: https://whgazetteer.org/documentation
- World Historical Gazetteer, Linked Places format announcement: https://blog.whgazetteer.org/2018/09/11/lp-format/
- ISHI and WHG, Linking Knowledge Through Place (December 2025): https://ishi.pitt.edu/sites/default/files/assets/Linking%20Knowledge%20Through%20Place_Agenda_Summary.pdf
- schema.org, TouristAttraction and Place: https://schema.org/TouristAttraction and https://schema.org/Place
