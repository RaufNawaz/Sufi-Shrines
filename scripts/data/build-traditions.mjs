#!/usr/bin/env node
/**
 * build-traditions.mjs — the six religious traditions the archive documents and
 * the knowledge graph had no word for.
 *
 * WHY THIS EXISTS. The graph's only affiliation vocabulary is `belongs_to_order`,
 * and every order in it is Sufi. **90 of the 169 sites are not Muslim shrines,
 * and exactly one of those 90 carries a `silsila` cell.** So for the other 89 the
 * graph recorded a tradition only as `category` — a six-value bucket — while the
 * entries themselves name and describe specific traditions in dedicated authored
 * sections: "The Nath Tradition", "The Udasi Tradition and the Island Complex",
 * "The Pranami Tradition", "The Swaminarayan Tradition", "Sant Baba Bhagat Ram
 * and the Daduvansi Tradition", "The Shakti Peetha Tradition and the Falling of
 * the Head". No page could reach one of them. Same shape as the kinship ties and
 * the order prose before them: held and not rendered.
 *
 * WHAT IT DOES NOT DO. It does not decide that a site belongs to a tradition.
 * Every membership below quotes a sentence in which the archive says so, sliced
 * out of `data/shrines.json` and never retyped.
 *
 * THE TRAP, AND IT IS A BAD ONE. A term match is not evidence. Searching the
 * corpus for these words returns mostly false positives, and they are not
 * obvious ones:
 *
 *   · "udasi" is *also* the word for Guru Nanak's four great journeys. Two
 *     gurdwara entries say "during his third journey (*udasi*)" and mean travel,
 *     not the ascetic order.
 *   · Nankana Sahib names Udasi *mahants* — in an account of the movement to
 *     remove them. A mention in an anti-Udasi context is not a membership.
 *   · "jogi" catches Ranjha, who becomes one for love of Heer in Waris Shah's
 *     poem, and a passing Hindu ascetic in the Madho Lal Hussain legend.
 *   · "Jogiwara" is a locality of Peshawar.
 *
 * All of those are recorded in REJECTED below rather than silently dropped, so
 * the next person does not re-discover them by shipping them.
 *
 * Definition passages carry `quoteUr`, sliced from the entry's Urdu article, and
 * it is REQUIRED: a definition is a page's account of the tradition, and an
 * English paragraph in that position is an untranslated sentence (i18n rule 7,
 * HANDOVER §9.128). Membership quotes are evidence for a claim stated elsewhere,
 * which is the case rule 7 permits Latin for, so they are English-only.
 *
 *     node scripts/data/build-traditions.mjs           # writes the seed block
 *     node scripts/data/build-traditions.mjs --check   # verifies, writes nothing
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
const bySlug = new Map(slugs.map((s, i) => [s, rows[i]]));

/** The taxonomy. `category` is the six-value bucket these sit inside, so a
 *  reader can be shown a tradition without the bucket being contradicted. */
const TRADITIONS = [
  {
    slug: 'nath',
    name: 'Nath',
    nameUr: 'ناتھ',
    alsoKnownAs: ['Nath sampradaya', 'Kanphata yogis'],
    category: 'Hindu Temple',
    shrine: 'dargah-pir-ratan-nath-jee',
    from: 'The Naths, who flourished across',
    to: 'the first lord and archetypal yogi.',
    urFrom: 'ناتھ، جو قرون وسطیٰ کے ابتدائی صدیوں سے',
    urTo: 'نمونہ یوگی، کے طور پر پوجتے تھے۔',
  },
  {
    slug: 'udasi',
    name: 'Udasi',
    nameUr: 'اداسی',
    alsoKnownAs: ['Udasipanth'],
    category: 'Nanakpanthi / Udasi Darbar',
    shrine: 'sadh-belo-sadh-belo-island-temple',
    from: 'The distinctive character of Sadh Belo',
    to: 'renunciation, pilgrimage and hospitality.',
    urFrom: 'سادھ بیلو کا منفرد کردار',
    urTo: 'مہمان نوازی کی روایت پروان چڑھاتی ہے۔',
  },
  {
    slug: 'pranami',
    name: 'Pranami',
    nameUr: 'پرنامی',
    alsoKnownAs: ['Parnami', 'Dhami', 'Nijananda'],
    category: 'Hindu Temple',
    shrine: 'parnami-mandir',
    from: 'The Pranami *sampradaya*',
    to: 'Hindu and Islamic conceptions of the divine.',
    urFrom: 'پرنامی سمپردایہ',
    urTo: 'مشترکہ زمین تلاش کرتی تھی۔',
  },
  {
    slug: 'swaminarayan',
    name: 'Swaminarayan',
    nameUr: 'سوامی نارائن',
    alsoKnownAs: ['Swaminarayan Sampradaya'],
    category: 'Hindu Temple',
    shrine: 'shri-swaminarayan-mandir-karachi',
    from: 'The Swaminarayan movement takes its name',
    to: 'ethical conduct, and service.',
    urFrom: 'سوامی نارائن تحریک اپنا نام',
    urTo: 'ہندومت کی تبلیغ کی۔',
  },
  {
    slug: 'daduvansi',
    name: 'Daduvansi',
    nameUr: 'دادووَنسی',
    alsoKnownAs: [],
    category: 'Nanakpanthi / Udasi Darbar',
    shrine: 'sant-baba-bhagat-ram-darbar-mandir',
    from: 'Local tradition associates the shrine',
    to: 'descendants of a saintly founder.',
    urFrom: 'مقامی روایت مزار کو بھگت رام',
    urTo: '"لائن" یا اولاد۔',
  },
  {
    slug: 'shakti-peetha',
    name: 'Shakti Peetha',
    nameUr: 'شکتی پیٹھ',
    alsoKnownAs: ['Shaktipeeth'],
    category: 'Hindu Temple',
    shrine: 'shaktipeeth-shri-hinglaj-mata-mandir',
    from: 'The sanctity of Hinglaj is rooted',
    to: 'charged with the presence of the goddess.',
    urFrom: 'ہنگلاج کی تقدس شکتی پیٹھوں',
    urTo: 'دیوی کی موجودگی سے معمور ہوا۔',
  },
  {
    slug: 'nanakpanthi',
    name: 'Nanakpanthi',
    nameUr: 'نانک پنتھی',
    alsoKnownAs: ['Nanak-panthi'],
    category: 'Nanakpanthi / Udasi Darbar',
    shrine: 'swami-dharmdas-darbar-larkana-kennedy-market',
    from: 'In the Nanakpanthi manner, such darbars',
    to: 'without a firm confessional boundary.',
    urFrom: 'نانک پنتھی انداز میں، ایسے دربار',
    urTo: 'کسی سخت مسلکی حد کے بغیر کرتے ہیں۔',
  },
  {
    slug: 'sevapanthi',
    name: 'Sevapanthi',
    nameUr: 'سیوا پنتھی',
    alsoKnownAs: ['Sewapanthi'],
    category: 'Nanakpanthi / Udasi Darbar',
    shrine: 'sevapanthi-darbar-bhai-gurdas-gandava',
    from: 'In the heart of Gandava',
    to: 'Balochistan in the eighteenth century.',
    urFrom: 'گنڈاوا کے قلب میں',
    urTo: 'سندھ اور بلوچستان تک پہنچایا۔',
  },
];

/** Site memberships. Each quotes the archive saying it. */
const MEMBERSHIPS = [
  ['nath', 'dargah-pir-ratan-nath-jee', "The temple's saint, Ratan Nath, belongs to the", 'founder of the sect.'],
  ['nath', 'gorakhnath-goraknath-temple', 'The temple honours Guru Gorakhnath', 'order of *yogis*.'],
  ['nath', 'tilla-jogian', 'It became the principal seat of the', 'looked to Gorakhnath as its master.'],
  ['udasi', 'sadh-belo-sadh-belo-island-temple', 'One of the most important living centres', 'elder son of Guru Nanak'],
  ['udasi', 'khatwari-darbar-shikarpur', 'The darbar belongs to the shared Nanakpanthi', 'venerated the Gurus together.'],
  ['pranami', 'parnami-mandir', 'At Malka Hans, a historic village', 'devotional tradition in Pakistan.'],
  ['swaminarayan', 'shri-swaminarayan-mandir-karachi', 'Jinnah Road in the heart of Karachi', 'in the country.'],
  ['daduvansi', 'sant-baba-bhagat-ram-darbar-mandir', 'Local tradition associates the shrine', 'descendants of a saintly founder.'],
  ['shakti-peetha', 'shaktipeeth-shri-hinglaj-mata-mandir', 'It is one of the fifty-one', 'in present-day Pakistan.'],
  ['shakti-peetha', 'sharada-peeth', 'Simultaneously a temple, a fabled university', 'religious memory of Kashmir.'],
  ['nanakpanthi', 'bhai-waliram-darbar', 'In Digano Mahesar, a small village', 'Swami Dharmdas of Larkana.'],
  ['nanakpanthi', 'gurdwara-pehli-patshahi-jind-pir-sukkur', 'Its first custodian is said to have been', 'without a firm confessional boundary.'],
  ['nanakpanthi', 'gurdwara-sach-khand-sahib', "Shikarpur's only functioning Sikh gurdwara", 'this historic Sindhi trading city.'],
  ['nanakpanthi', 'guru-gurpat-mandir-db-80-sirey-ghat', 'On a plot known as DB-80', 'in the Jagiasi lineage, of Guru Nanak.'],
  ['nanakpanthi', 'khatwari-darbar-shikarpur', 'The Khatwari Darbar is among the most celebrated', 'the wealth of its merchant houses.'],
  ['nanakpanthi', 'sain-vali-vilayat-rai-darbar-kambar', 'The darbar of Sain Vali Vilayat Rai stands in the', 'Nanakpanthi *darbar* in the district.'],
  ['nanakpanthi', 'sant-baba-asudaram-darbar-panno-aqil', 'The Darbar of Sant Baba Asudaram at Panno Aqil', '(Nanakpanthi) tradition.'],
  ['nanakpanthi', 'sevapanthi-darbar-bhai-gurdas-gandava', 'Filed here under', 'Sindh–Balochistan borderland.'],
  ['nanakpanthi', 'swami-dharmdas-darbar-larkana-kennedy-market', 'The darbar of Swami Dharmdas at Larkana is one of the', "region's Hindu–Sikh saints."],
  ['sevapanthi', 'sevapanthi-darbar-bhai-gurdas-gandava', 'In the heart of Gandava', 'Balochistan in the eighteenth century.'],
  /* Both, and the entry says so in one breath: the Jagiasi line runs "through
     Baba Sri Chand's Udasi line". Two traditions, one sentence, two rows. */
  ['udasi', 'guru-gurpat-mandir-db-80-sirey-ghat', "According to the darbar's own tradition", 'in the early nineteenth century.'],
];

/** Term matches that are NOT memberships, and why. Kept because each one is a
 *  trap a scan walks straight into. */
const REJECTED = [
  { tradition: 'udasi', shrineSlug: 'gurdwara-choa-sahib', why: '"during the fourth of his great journeys (*udasis*)" — udasi here is Guru Nanak\'s JOURNEY, not the ascetic order. The commonest false positive in the corpus.' },
  { tradition: 'udasi', shrineSlug: 'gurdwara-pehli-patshahi-jind-pir-sukkur', why: 'Same word, same meaning: "during his third journey (*udasi*) through Sindh".' },
  { tradition: 'udasi', shrineSlug: 'gurudwara-janam-asthan-nankana-sahib', why: 'Names Udasi *mahants* in an account of the movement to REMOVE them from the historic gurdwaras. A mention in an anti-Udasi context is not a membership.' },
  { tradition: 'nath', shrineSlug: 'mausoleum-of-waris-shah', why: '"Ranjha, the herdsman who becomes a jogi for her sake" — a character in the Heer legend.' },
  { tradition: 'nath', shrineSlug: 'shrine-of-hazrat-madho-lal-hussain-shah-hussain-darbar', why: 'A passing "*jogi* (a Hindu ascetic) dwelt" in the account of the grave being moved.' },
  { tradition: 'nath', shrineSlug: 'gurdwara-bhai-beba-singh', why: '"the Jogiwara locality" — a place name in Peshawar.' },
  { tradition: 'nanakpanthi', shrineSlug: 'bhai-sant-thawan-das-mandir', why: 'The entry hedges and must be allowed to: "presumably a locally venerated Nanakpanthi or Sindhi Hindu holy figure". A membership asserted on the archive\'s own "presumably" would be firmer than the archive is.' },
  { tradition: 'nath', shrineSlug: 'shaktipeeth-shri-hinglaj-mata-mandir', why: '"it features in Nath yogi and Charan bardic traditions alike" — the site appears IN their lore. That is a relationship worth recording one day, and it is not belonging.' },
];

const problems = [];
const slice = (text, from, to, label) => {
  const a = text.indexOf(from);
  if (a < 0) { problems.push(`${label}: "from" not found`); return null; }
  const b = text.indexOf(to, a);
  if (b < 0) { problems.push(`${label}: "to" not found after "from"`); return null; }
  return text.slice(a, b + to.length).replace(/\s+/g, ' ').trim();
};

const traditions = [];
for (const t of TRADITIONS) {
  const row = bySlug.get(t.shrine);
  if (!row) { problems.push(`${t.slug}: no shrine row "${t.shrine}"`); continue; }
  const en = slice(String(row.Description || ''), t.from, t.to, `${t.slug} (en)`);
  const ua = urdu[t.shrine]?.descriptionUr;
  if (!ua) { problems.push(`${t.slug}: no Urdu article for ${t.shrine}`); continue; }
  const ur = slice(ua, t.urFrom, t.urTo, `${t.slug} (ur)`);
  if (!en || !ur) continue;
  traditions.push({
    slug: t.slug,
    name: t.name,
    nameUr: t.nameUr,
    ...(t.alsoKnownAs.length ? { alsoKnownAs: t.alsoKnownAs } : {}),
    category: t.category,
    definition: en,
    definitionUr: ur,
    definitionShrine: t.shrine,
    source: `data/shrines.csv#${t.shrine}`,
  });
}

const known = new Set(traditions.map((t) => t.slug));
const memberships = [];
for (const [tradition, shrineSlug, from, to] of MEMBERSHIPS) {
  if (!known.has(tradition)) { problems.push(`membership names unknown tradition "${tradition}"`); continue; }
  const row = bySlug.get(shrineSlug);
  if (!row) { problems.push(`membership: no shrine row "${shrineSlug}"`); continue; }
  const quote = slice(String(row.Description || ''), from, to, `${tradition} ← ${shrineSlug}`);
  if (!quote) continue;
  memberships.push({ traditionSlug: tradition, shrineSlug, shrineName: row.Name, quote, source: `data/shrines.csv#${shrineSlug}` });
}

for (const r of REJECTED) {
  if (!bySlug.has(r.shrineSlug)) problems.push(`rejected entry names unknown shrine "${r.shrineSlug}"`);
}

if (problems.length) {
  console.error('[traditions] ' + problems.length + ' problem(s):');
  problems.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}

const seedPath = join(ROOT, 'data', 'kg-seeds.json');
const seeds = JSON.parse(readFileSync(seedPath, 'utf8'));
const next = { traditions, traditionMemberships: memberships, traditionNonMemberships: REJECTED };
const changed = ['traditions', 'traditionMemberships', 'traditionNonMemberships'].some(
  (k) => JSON.stringify(seeds[k]) !== JSON.stringify(next[k]),
);

if (CHECK) {
  if (changed) {
    console.error('[traditions] data/kg-seeds.json is out of date. Run: node scripts/data/build-traditions.mjs');
    process.exit(1);
  }
  console.log(`[traditions] OK — ${traditions.length} tradition(s), ${memberships.length} membership(s), ${REJECTED.length} recorded non-membership(s).`);
} else {
  seeds._comment_traditions =
    'The six religious traditions the archive documents and the graph had no word for. ' +
    'Generated by scripts/data/build-traditions.mjs — edit the picks there, not here. ' +
    'Every definition and every membership is sliced verbatim out of the corpus; a term ' +
    'match is NOT evidence, and traditionNonMemberships records the ones that look like ' +
    'memberships and are not.';
  Object.assign(seeds, next);
  writeFileSync(seedPath, JSON.stringify(seeds, null, 2) + '\n');
  console.log(`[traditions] wrote ${traditions.length} tradition(s), ${memberships.length} membership(s), ${REJECTED.length} non-membership(s)`);
}
