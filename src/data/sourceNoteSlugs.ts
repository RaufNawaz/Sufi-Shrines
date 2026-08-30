/**
 * Which entries carry a 'Where the source contradicts itself' disclosure.
 *
 * Generated from `src/data/source-notes.json`; regenerate with
 *
 *   node -e "const d=require('./src/data/source-notes.json');console.log(JSON.stringify(Object.entries(d).filter(([k,v])=>k!=='_readme'&&Array.isArray(v)&&v.length>0).map(([k])=>k).sort(),null,2))"
 *
 * and keep the array below in step. `SourceNotes.test.tsx` fails if the two
 * disagree in either direction, so drift is caught rather than trusted.
 *
 * **Why this file exists at all.** The notes themselves are a 92.6 KB chunk and
 * only 52 of the archive's entries have any. Measured on a production
 * build before this list existed: /shrine/data-darbar, which has none, fetched
 * all 92,640 bytes and rendered nothing from them — as did 117 of 169 entries.
 * A static list of slugs is small enough to ride along in the page's own chunk,
 * so the download now happens only where there is something to read.
 */
export const SOURCE_NOTE_SLUGS: readonly string[] = [
  "bhai-waliram-darbar",
  "chandragup-baba-chandragup",
  "darbar-abul-muali-qadri",
  "darbar-ghamkol-sharif-zinda-pir",
  "darbar-hazrat-shah-gohar-peer",
  "darbar-malik-ahmad-ayaz",
  "darbar-mian-qurban-ali-shah",
  "dargah-of-khwaja-muhammad-zaman-luari-sharif",
  "ghazi-ilm-din-shaheed",
  "gori-temple-gori-jo-mandar",
  "gurdwara-baoli-sahib-guru-arjan-dev-ji-lahore",
  "gurdwara-chakki-sahib",
  "gurdwara-chhevin-patshahi-chitti-gatti",
  "gurdwara-choa-sahib",
  "gurdwara-khoohi-bhai-lalo-bhai-lalo-di-khooi",
  "gurdwara-malji-sahib",
  "gurdwara-patshahi-chhevin-hadiara-lahore",
  "gurdwara-pehli-patshahi-jind-pir-sukkur",
  "gurdwara-sahib-saidpur-guru-nanak-dev-ji",
  "gurdwara-sri-tilganji-sahib",
  "jain-mandir-lahore",
  "kalat-kali-temple",
  "khatwari-darbar-shikarpur",
  "khawaja-feroz-ud-din-gharib-nawaz",
  "lal-kurti-temple-balmiki-mandir-rawalpindi",
  "loh-temple-lava-temple",
  "mohra-sharif-khanqah",
  "ram-mandir-saidpur-ram-kund-mandir",
  "sain-vali-vilayat-rai-darbar-kambar",
  "samadhi-of-maharaja-ranjit-singh",
  "sant-bhagat-kanwar-ram-temple-chak",
  "sevapanthi-darbar-bhai-gurdas-gandava",
  "shrine-of-akhund-panju-baba",
  "shrine-of-baba-shah-chiragh",
  "shrine-of-baba-shah-kamal",
  "shrine-of-hafiz-muhammad-jamal-multani",
  "shrine-of-hazrat-muhammad-ayub-shah-bukhari",
  "shrine-of-hazrat-shah-ali-akbar-shah-ali-akbar-shamsi",
  "shrine-of-makhdoom-abdul-rahim-girhori",
  "shrine-of-makhdoom-nooh-hala",
  "shrine-of-mian-umar-baba-chamkani",
  "shrine-of-pir-chhatal-shah-noorani",
  "shrine-of-pir-lakha-aab-e-shifa-jhal-magsi",
  "shrine-of-shah-abdul-karim-bulri",
  "shrine-of-shah-inayat-qadiri",
  "swami-dharmdas-darbar-larkana-kennedy-market",
  "tahir-bandagi-qadri",
  "tomb-of-javindi-bibi",
  "tomb-of-qutbuddin-aibak",
  "tomb-of-ustad-nuriya",
  "valmiki-swamiji-mandir-gracy-lines-rawalpindi",
  "wasif-ali-wasif"
];

/** Set form, built once — SourceNotes asks this on every shrine render. */
export const SOURCE_NOTE_SLUG_SET: ReadonlySet<string> = new Set(SOURCE_NOTE_SLUGS);
