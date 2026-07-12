# Shrines Project — To-Do List

_Last updated: 2026-07-12. Snapshot: **163 data rows**, **0 missing descriptions**, **51 missing Image 1** (exhaustively searched — see `_image_unverified.md`; these have no discoverable, appropriately-licensed Commons photo). Note: the enriched `Shrines_with_Descriptions.xlsx` (Founded/Events/Images/Description Urdu) has **not yet been synced to the live Google Sheet** the app actually reads from — `data/shrines.json` still reflects the pre-enrichment Sheet state (e.g. only 6/163 rows have an Image 2). Syncing the Sheet is the highest-priority open item; see the root project plan._

This is a working checklist for the shrines research dataset (`Shrines_with_Descriptions.xlsx`) and the map web app. Items are ordered by priority within each section. Enrichment mechanics live in `ENRICHMENT_RUNBOOK.md`; run `python3 tools/shrines_enrich.py --status` any time for live counts.

---

## 1. Data-quality fixes — RESOLVED 2026-07-10 (M1 pass)

All five standing data-quality flags are now resolved (see `_ENRICHMENT_LOG.md`, run 2026-07-10):

- [x] **Row 106 "Jagannath Temple, Sialkot" vs row 72 "Shahwala Teja Singh Mandir."** Re-researched: the Wikipedia redirect connecting the two is unsourced and the underlying fact-sets don't overlap (different locality — Paris Road/Mohallah Puran Nagar vs. Mohallah Dharowal — different founding story: a 2007 provincial-grant temple vs. an ancient temple sealed in 1947 and reopened 2019). Treated as genuinely distinct; row 106 now has its own hedged description and a specific Location.
- [x] **Row 78 "Jhollay Lal Mandir, Karachi" vs row 101 "Darya Lal Mandir."** Confirmed genuinely distinct: a separately-documented Jhulelal shrine on Darya Lal Street, Jodia Bazaar (Lasi community), several km from the Darya Lal Mandir near Custom House. Described; Location updated to the Jodia Bazaar address.
- [x] **Row 39 "Jamshoro District"** — already renamed to "Shrine of Lakhi Shah Saddar" in the 2026-07-06 21:31 run; description written.
- [x] **Row 10 "Dargah Fateh Pur Sharif" founding-date conflict** — Founded/Opened cell clarified to "1359 (site/settlement); present dargah c. 1940 (after Syed Rakhyal Shah's death)" rather than a bare, apparently-contradictory "1359."
- [x] **Row 13 "Shah Yousuf" (Sargodha)** — confirmed a genuinely distinct, if thinly documented, local shrine (listed under Punjab Auqaf's Sargodha zone), unrelated to Shah Yusuf Gardezi of Multan (row 28). Description written, heavily hedged given thin sourcing.

## 2. Descriptions — CLEARED 2026-07-10

All 158 rows now have a Description. The last 5 gaps (75, 77, 79, 86, 87 — the Dadu/Mehar/Shikarpur/Sukkur Nanakpanthi cluster) were closed by re-searching against Pakistan's Evacuee Trust Property Board official "Functional Mandirs"/"Functional Gurdwaras" registers (`etpb.gov.pk/shrines/`), a source prior passes hadn't consulted. See `_enrichment_queue.md` ("M2 description backlog — CLEARED 2026-07-10") for what was found for each. Three (77, 79, 87) remain short, heavily-hedged entries since the eponymous sants themselves are still genuinely undocumented — that's a real sourcing limit, not something to revisit without a new primary source.

## 3. Images

**Replace disallowed image links** (Facebook / Flickr are barred by the image rules; CDN links expire):

- [ ] Row 6 — Ganj-e-Inayat: Image 1 is a **Facebook page URL** (not even a photo). Replace or clear.
- [ ] Row 8 — Langer Makhdoom: Image 1 is a **Flickr** link. Replace or clear.
- [ ] Row 11 — Tomb of Bibi Jawindi: Image 1 is a **Flickr** link. Replace with a Commons file (many exist for Uch Sharif).
- [ ] Row 20 — Abul Faiz Qalander: Image 1 is a **Facebook CDN** link that will expire. Replace.
- [ ] _(Weak, optional)_ Row 49 Parnami (WordPress blog), rows 12 & 33 (Blogger/googleusercontent) — swap for Commons where possible.

**Spot-check the auto-sourced Commons images** (added by filename-match only, never visually verified — see `_image_unverified.md`). Open each and confirm it depicts the exact site, or clear the cell:

- [ ] Row 68 — Sufi Shah Inayat Shaheed: likely a **portrait/painting**, not the shrine building. Verify/replace.
- [ ] Row 133 — Pir Muhammad Rashid (Roze Dhani): image shows the **entrance gate**, not the tomb. Verify.
- [ ] Row 138 — Baha'al-Halim (Uch): confirm it's Baha'al-Halim's tomb, **not the adjacent Bibi Jawindi tomb**.
- [ ] Rows 101, 120, 122, 123, 132, 137 — confirm each photo matches its site.

_2026-07-11 spot-check run (see `_ENRICHMENT_LOG.md`) re-verified 36 candidates by fetching each source page's caption: 35 confirmed correct, 1 cleared (row 124 Gurdwara Choa Sahib's photo was actually Rohtas Fort — cleared, no replacement found). Row 29 (Wadpagga Sharif)'s Image 1 was separately confirmed mislabeled (depicted Uch Sharif's Jalaluddin Bukhari shrine) and cleared. The rows above are not yet part of that verified set — still open._

**Fill missing Image 1 (51 rows).** Most sit inside Commons _category_ pages whose file lists need a rendered browser. Best closed in one **Claude-in-Chrome image pass** (the browser would not connect in recent runs — see §5). Known high-confidence browser leads:

- [ ] Row 141 — Tomb of Ustad Nuriya → Commons category "Shrine of Nuriya, Uch Sharif".
- [ ] Row 118 — Baba Shah Kamal (Lahore) → "Category:Shrine of Hazrat Shah Kamal, Lahore" (avoid the Kasur files).
- [ ] Row 124 — Gurdwara Choa Sahib → "Category:Gurdwara Chowa Sahib".
- [ ] Row 94 — Ramapir Temple, Tando Allahyar → "Category:Ramapir Temple, Tando Allahyar".
- [ ] Row 135 — Hafiz Muhammad Jamal Multani → "Category:Shrine of Hazrat Hafiz Muhammad Jamal, Multan".
- [ ] Rows 64, 70, 88, 96, 105 — Rahman Baba, Kali Bari (Peshawar), Singh Sabha (Quetta), Kalka Cave, Panj Tirath — notable, likely on Commons; confirm exact filenames in a browser.

## 4. New shrines to add (from `_enrichment_queue.md`)

- [ ] Gurdwara Sri Guru Nanak Sahib, Shikarpur (keep separate from row 86).
- [ ] Shrine of Abdul Rahim Girhori — Girhor Sharif, Sindh (chief khalifa of Khwaja Muhammad Zaman, row 142).
- [ ] Makhdoom lineage of Hala — e.g. Makhdoom Muhammad Zaman "Talibul Moula" (verify distinct notable tombs vs row 139).
- [ ] Darbar/Samadhi of Sant Bhagat Kanwar Ram (1885–1939) — verify a surviving shrine in Pakistan before adding.
- [ ] Sant Baba Asudaram — verify a specific site.
- [ ] Kahiyan Sharif (Neelam Valley, AJK) — deferred pending verified coordinates.

## 5. Web app & pipeline

- [ ] After any sheet edits, refresh the committed dataset + snapshot: `npm run data:build`, then commit `data/` and `src/data/shrines-fallback.json`.
- [ ] Run `npm run verify` and deploy (GitHub Pages via `.github/workflows/deploy-pages.yml`) — see the root `README.md`.
- [ ] Verify new rows 141–144 render correctly on the map (coordinates, category filters, detail pages).
- [x] **Guided tours feature** — see `TOURS_FUTURE_PLAN.md` for the plan. All 5 phases implemented and committed (route-on-map, richer stops, share/resume/embed, audio/autoplay, discovery/filter/near-me/print). 2026-07-10: audited against the plan, fixed a stale `e2e/tours.spec.ts` (only covered Phase 1 and was broken by Phase 2's preview step) with full Playwright coverage for all 5 phases (16 tests, all passing), plus a brittle `map.spec.ts` search-count assertion the growing dataset had broken. `npm run verify` + full e2e suite (38 tests) green.
- [ ] Reconnect **Claude-in-Chrome** so image passes can visually verify and pull Commons files (blocked in recent runs).

## 6. Housekeeping

- [ ] Remove stray probe scripts from the repo root: `__probe_ur.mjs`, `__probe_ur2.mjs`.
- [ ] `NEXT_STEPS.md` is from 2026-07-04 and partly stale — fold anything still relevant into this file and archive it.
