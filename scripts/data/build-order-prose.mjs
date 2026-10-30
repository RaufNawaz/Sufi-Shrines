#!/usr/bin/env node
/**
 * build-order-prose.mjs — what the archive says about its own nine orders,
 * sliced out of its own entries and written into
 * `data/kg-seeds.json#orderProse`.
 *
 * WHY THIS EXISTS. Until 29 August 2026 an order page showed one summary
 * sentence written for this site, and four of the nine showed nothing at all —
 * `/order/malamati`, `/order/rashidi`, `/order/azeemia`, `/order/shattari`
 * opened on a member list with no account of the order. The corpus had the
 * answer the whole time: its entries carry whole authored sections on the same
 * orders — "The Suhrawardi Way", "The Suhrawardi Order in India", "The
 * Naqshbandi-Mujaddidi Way", "The Way of Blame", "The Azeemia Order", "The
 * Qalandar and His Order" — and no page could reach one of them.
 *
 * WHY IT IS A SCRIPT AND NOT A HAND-WRITTEN SEED. The passages are quotations.
 * A retyped quotation is a misquotation waiting to happen, so nothing here is
 * typed: each pick names a shrine and the first and last few words of the run,
 * and the text is SLICED out of `data/shrines.json` (English) and
 * `src/data/urdu-content.json` (Urdu). A marker that stops matching fails this
 * script loudly instead of quietly publishing drifted prose, and
 * `verify-kg-proposals.mjs` re-checks both halves against both sources on every
 * build.
 *
 * SELECTION RULES, each of which cost something to learn:
 *
 *  1. **A passage must name its own subject.** Lifted out of its entry,
 *     "Through his disciple Nizamuddin Auliya…" and "From his base at Shergarh
 *     he taught…" open on a pronoun with no antecedent. Three picks were
 *     re-chosen for this. The archive's prose is not ours to patch with a
 *     bracketed name.
 *  2. **Never cut the middle out of a quotation.** The first Shattari pick ran
 *     first sentence to last and swept in a paragraph about friction with
 *     Kasur's ruling family. It is now two quotations from the same entry, in
 *     order — which is also the only reason the second may open on "He".
 *  3. **Where two entries word the same fact differently, keep both.** Bahauddin
 *     Zakariya's entry says "The Suhrawardi order he founded"; the Abul Faiz
 *     entry says the Suhrawardiyya takes its name from Abu Najib and Shihab
 *     al-Din of Baghdad and was *carried into* India by Zakariya. Both are on
 *     `/order/suhrawardiyya`, unreconciled (RULE 2).
 *  4. **The Urdu is required, not a nicety.** An English paragraph standing as
 *     the main content of an Urdu order page is an untranslated sentence, which
 *     i18n rule 7 forbids — the no-leak guard failed on seven routes the first
 *     time this shipped (HANDOVER §9.128). Every passage therefore carries
 *     `quoteUr`, sliced from the entry's Urdu article, which the archive already
 *     held for all 168 entries.
 *
 * Rerun after any change to the picks below, or after the sheet is re-imported:
 *
 *     node scripts/data/build-order-prose.mjs        # rewrites the seed block
 *     node scripts/data/build-order-prose.mjs --check # verifies, writes nothing
 *
 * Then `npm run data:kg` to regenerate `data/kg-order-prose.json`, which is what
 * `OrderPage` imports. That file is NOT in kg.json on purpose: `/order/:slug` is
 * its only reader and `src/lib/kg.ts` imports kg.json statically (§9.125).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSlugs } from './lib/slugs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = process.argv.includes('--check');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const rows = read('data/shrines.json').rows;
const urdu = read('src/data/urdu-content.json');
const slugs = buildSlugs(rows);
const byName = rows.map((row, i) => [row.Name, { row, slug: slugs[i] }]);

const PICKS = [
  { order: 'chishtiyya', shrine: 'Eidgah Sharif',
    from: 'He is counted within the Chishti order', to: '(spiritual audition).',
    why: 'The corpus’s clearest statement of what the Chishti order IS, rather than who belonged to it — masters, current and characteristic practice in one sentence.' },
  { order: 'chishtiyya', shrine: 'Shrine of Fariduddin Ganjshakar',
    from: 'At Pakpattan, on the old bank of the Sutlej', to: 'holy figures of the Punjab.',
    why: 'Names its own subject. The obvious pick was "the Chishti order he helped root in India became the most widespread of all the Sufi paths of the subcontinent" — a better sentence and an unusable one, because lifted out of its entry it opens on "Through his disciple" with no antecedent. A passage on an order page has to stand alone, and the archive’s prose is not ours to patch.' },

  { order: 'suhrawardiyya', shrine: 'Shrine of Abul Faiz Qalander Ali Suharwardi',
    from: 'The Suhrawardiyya takes its name', to: 'well suited to a scholar-saint.',
    why: 'From the archive’s own section "The Suhrawardi Way": the order’s name, its founding texts and its temper.' },
  { order: 'suhrawardiyya', shrine: 'Shrine of Bahauddin Zakariya',
    from: "Bahauddin Zakariya's lasting achievement was to root the Suhrawardi way", to: 'western Punjab and Sindh for centuries.',
    why: 'Kept beside the passage above: the order’s temper as it took root at Multan. Until 30 October 2026 this entry said Zakariya "founded" the order and the pick was kept for that disagreement with the Abul Faiz entry; the public text that replaced it says he "planted" and "rooted" it, which no longer disagrees, so the pick was reselected from the same paragraph (Rauf, 30 October 2026: reselect from the public text).' },

  { order: 'qadiriyya', shrine: 'Shamsabad',
    from: 'Shams Ali Qalandar stood in the tradition', to: 'the early devotee Uways al-Qarani.',
    why: 'Carries the order’s eponym and date, and defines *Owaisi* — which is also the standing reason no person-to-person lineage edge may be drawn for this figure. Its first sentence is also the Qalandariyya’s passage, deliberately: the same paragraph places this figure in both traditions, which is why the archive records him under both.' },
  { order: 'qadiriyya', shrine: 'Shergarh',
    from: 'At Shergarh, in the Okara district', to: 'spread that order in the Punjab.',
    why: 'How the order reached the Punjab, from the entry of a saint who carried it there — and a sentence that names him, which "From his base at Shergarh he taught" does not.' },

  { order: 'qalandariyya', shrine: 'Shamsabad',
    from: 'Shams Ali Qalandar stood in the tradition', to: 'more sober, respectable orders.',
    why: 'The archive’s own section "The Qalandar and His Order", and the only passage in the corpus that defines the qalandari way as such.' },

  { order: 'naqshbandiyya', shrine: 'Shrine of Ganj e Inayat Sarkar',
    from: 'The Naqshbandiyya takes its name', to: 'renewal in South Asia.',
    why: 'From the archive’s section "The Naqshbandi-Mujaddidi Way". Covers the eponym, silent dhikr, "solitude within the crowd", and the Mujaddidi branch — which is the branch 2 of the 10 memberships actually name.' },

  { order: 'rashidi', shrine: 'Dargah of Pir Muhammad Rashid',
    from: 'The town of Pir Jo Goth', to: 'the line of Pir Pagara.',
    why: 'The order had NO description at all. This is the corpus naming its founder, its date and its descent — and it is the sentence the seed’s taxonomy note was already quoting where no reader could see it.' },
  { order: 'rashidi', shrine: 'Dargah of Pir Muhammad Rashid',
    from: 'The dargah is distinguished by an austere discipline', to: 'observe no public urs here.',
    why: 'A practice of the order stated as a practice, and one that contradicts the archive’s own default assumption that a Sufi shrine keeps an urs.' },

  { order: 'malamati', shrine: 'Shrine of Hazrat Madho Lal Hussain',
    from: 'Hussain belonged in spirit to the', to: 'an outward show of impropriety.',
    why: 'The archive’s section "The Way of Blame". The order had no description; this is the definition the corpus already held.' },

  { order: 'azeemia', shrine: 'Shrine of Qalandar Baba Auliya',
    from: 'Qalandar Baba Auliya’s lasting legacy', to: 'devotion and study.',
    why: 'The archive’s section "The Azeemia Order" in full — founder, successor, teaching and seat. A twentieth-century order the archive documents well and the order page showed nothing of.' },

  { order: 'shattari', shrine: 'Shrine of Shah Inayat Qadiri',
    from: 'His full name, as it stands in his own works', to: 'Shah Inayat Allah Qadiri and Inayat Shah.',
    why: 'Reselected on 30 October 2026 from the public text, which replaced the entry. The Shattari is named in this entry twice: in his full name as his own works give it, and in the paragraph below. This sentence names him and carries the nisba, so it stands first; the paragraph on his teachers between the two opens on "He" and is not quoted. Nothing here defines the order, and nothing pretends to.' },
  { order: 'shattari', shrine: 'Shrine of Shah Inayat Qadiri',
    from: 'He combined the Qadiri and Shattari orders', to: 'was given particular importance.',
    why: 'The other half: that he held the two orders together, and the one Shattari doctrine the entry names (fana fi l-shaikh). Opens on "He", allowed only because it follows the passage above it, from the same entry, which names him.' },
  { order: 'shattari', shrine: 'Mazar of Bulleh Shah',
    from: 'Shah Inayat was a Sufi master of Lahore', to: 'rather than a Sayyid of high birth.',
    why: 'The second and last mention: the same man named from his disciple’s entry as "of the Qadiri-Shattari line".' },

  /* The two Junaidi picks (Peer Makki, Bibi Pak Daman) were dropped on 30 October 2026, when the
     public text replaced both entries (Rauf, in chat: reselect from the public text, drop what it no
     longer says). Bibi Pak Daman's no longer names the line. Peer Makki's does, but in a paragraph
     opening "He came to Lahore", and the shortest run that names him first is 2,406 characters,
     over the 1,200 a passage may be: rules 1 and 2 cannot both hold. */
];
/* The Urdu half. Positional against PICKS — [orderSlug, shrineSlug, from, to] —
   so a reordering of the picks fails loudly rather than silently pairing a
   passage with the wrong translation. */
const URDU_MARKS = [
 ["chishtiyya","eidgah-sharif","وہ سلسلہ چشتیہ سے تعلق رکھتے ہیں","سماع کی مشق پر ہے۔"],
 ["chishtiyya","shrine-of-fariduddin-ganjshakar","پنجاب کے جنوب میں دریائے ستلج کے پرانے کنارے","روحانی شخصیات میں شمار ہوتے ہیں۔"],
 ["suhrawardiyya","shrine-of-abul-faiz-qalander-ali-suharwardi","سہروردیہ اپنا نام","عالم بزرگ کے لیے موزوں تھا۔"],
 ["suhrawardiyya","shrine-of-bahauddin-zakariya","حضرت بہاؤالدین زکریا کا پائیدار کارنامہ","مذہبی زندگی کو ڈھالا۔"],
 ["qadiriyya","shamsabad","شمس علی قلندر قلندروں کی روایت میں","اویس قرنی کے انداز میں۔"],
 ["qadiriyya","shergarh","پنجاب کے ضلع اوکاڑہ میں شیر گڑھ","ان کا بڑا حصہ رہا۔"],
 ["qalandariyya","shamsabad","شمس علی قلندر قلندروں کی روایت میں","قابل احترام سلسلوں سے الگ کرتی تھی۔"],
 ["naqshbandiyya","shrine-of-ganj-e-inayat-sarkar","نقشبندیہ اپنا نام","عظیم انجنوں میں سے ایک بن کر۔"],
 ["rashidi","dargah-of-pir-muhammad-rashid-roze-dhani-pir-jo-goth","قصبہ پیر جو گوٹھ","پیر پگارا کے سلسلے کے جدِ امجد۔"],
 ["rashidi","dargah-of-pir-muhammad-rashid-roze-dhani-pir-jo-goth","دربار صوفی مزارات میں ایک غیر معمولی سخت نظم","کوئی عوامی عرس نہیں مناتی۔"],
 ["malamati","shrine-of-hazrat-madho-lal-hussain-shah-hussain-darbar","روح کے اعتبار سے شاہ حسین ملامتیہ","کے پردے میں چھپائے رکھتے ہیں۔"],
 ["azeemia","shrine-of-qalandar-baba-auliya","قلندر بابا اولیاء کا پائیدار ورثہ","عقیدت اور علم دونوں کی حامل ہے۔"],
 ["shattari","shrine-of-shah-inayat-qadiri","خود ان کی تصانیف","کے ناموں سے بھی معروف ہیں۔"],
 ["shattari","shrine-of-shah-inayat-qadiri","شاہ عنایت نے اپنے سلوک میں قادری اور شطاری","ذات میں مٹا دینا۔"],
 ["shattari","mazar-of-bulleh-shah","شاہ عنایت لاہور کے ایک صوفی بزرگ تھے","برادری سے تعلق رکھتے تھے۔"]
];

const problems = [];
const out = [];
PICKS.forEach((p, i) => {
  const hit = byName.find(([name]) => name.startsWith(p.shrine));
  if (!hit) return problems.push(`[${i}] no shrine row starting "${p.shrine}"`);
  const [shrineName, { row, slug }] = hit;

  const d = String(row.Description || '');
  const a = d.indexOf(p.from);
  if (a < 0) return problems.push(`[${i}] ${p.order}: "from" not found in ${shrineName}`);
  const b = d.indexOf(p.to, a);
  if (b < 0) return problems.push(`[${i}] ${p.order}: "to" not found after "from" in ${shrineName}`);

  const [order, shrineSlug, urFrom, urTo] = URDU_MARKS[i] ?? [];
  if (order !== p.order || shrineSlug !== slug) {
    return problems.push(`[${i}] URDU_MARKS is ${order}/${shrineSlug}, pick is ${p.order}/${slug}`);
  }
  const ud = urdu[slug]?.descriptionUr;
  if (!ud) return problems.push(`[${i}] ${p.order}: no Urdu article for ${slug}`);
  const ua = ud.indexOf(urFrom);
  if (ua < 0) return problems.push(`[${i}] ${p.order}: Urdu "from" not found`);
  const ub = ud.indexOf(urTo, ua);
  if (ub < 0) return problems.push(`[${i}] ${p.order}: Urdu "to" not found after "from"`);

  out.push({
    orderSlug: p.order,
    shrineSlug: slug,
    shrineName,
    quote: d.slice(a, b + p.to.length).replace(/\s+/g, ' ').trim(),
    quoteUr: ud.slice(ua, ub + urTo.length).replace(/\s+/g, ' ').trim(),
    source: `data/shrines.csv#${slug}`,
    _why: p.why,
  });
});

if (problems.length) {
  console.error('[order-prose] ' + problems.length + ' problem(s):');
  problems.forEach((x) => console.error('  ✗ ' + x));
  process.exit(1);
}

const seedPath = join(ROOT, 'data', 'kg-seeds.json');
const seeds = JSON.parse(readFileSync(seedPath, 'utf8'));
const changed = JSON.stringify(seeds.orderProse) !== JSON.stringify(out);

if (CHECK) {
  if (changed) {
    console.error(
      '[order-prose] data/kg-seeds.json#orderProse is out of date with the corpus. ' +
        'Run: node scripts/data/build-order-prose.mjs',
    );
    process.exit(1);
  }
  console.log(`[order-prose] OK — ${out.length} passage(s) match the corpus in both languages.`);
} else {
  seeds.orderProse = out;
  writeFileSync(seedPath, JSON.stringify(seeds, null, 2) + '\n');
  console.log(
    `[order-prose] wrote ${out.length} passage(s) across ` +
      `${new Set(out.map((p) => p.orderSlug)).size} order(s)` +
      (changed ? '' : ' (unchanged)'),
  );
}
