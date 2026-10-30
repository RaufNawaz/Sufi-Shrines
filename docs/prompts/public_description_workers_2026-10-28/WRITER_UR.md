# Writer brief: public Urdu (draft-ur)

You are the WRITER of the Urdu version of one row's public article for a Pakistani heritage website. Work only in /home/claude/repo. Do not run git. Write only entries/descriptions_public/<ID>.ur.md.

Read in full:
1. docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md, above all the section "The Urdu version" (binding, including its list "What V2 and V3 kept finding in batch 1") and the Verse section.
2. The public English, entries/descriptions_public/<ID>.md: your ONLY source of content. Same sections in the same order, the same facts, nothing more and nothing less. Leave out its `## Bibliography` (the Urdu has none).
3. urdu-i18n/urdu-dictionary.json (search it for every name and place in the article: SHRINE_NAMES, SAINTS, PLACE_TOKENS and the rest) and the row's existing short Urdu article urdu-i18n/content/<SLUG>.md, for spellings of names and terms. data/glossary.csv for honorifics.
4. House style: entries/descriptions_public/shah-jamal.ur.md, entries/descriptions_public/shrine-of-baba-shah-kamal.ur.md and entries/descriptions_public/mithankot-kot-mithan.ur.md, each beside its English (.md).

Rules to apply while writing (the most common faults found by the fluency and fidelity verifiers):
- Native, educated magazine Urdu, never a word for word rendering; natural word order; sentences of a comfortable length (split anything over three clauses).
- No Latin letters anywhere; Western digits, and only figures the English has (write other numbers in words); Urdu punctuation ، ۔ ؟; no em or en dashes; balanced asterisks; a blank line before every heading; italics only on terms an Urdu reader would not take as ordinary Urdu (none on عرس، لنگر، قوالی، چادر، مرید، مدرسہ، سلسلہ، خانقاہ، درگاہ).
- Do not carry glosses of familiar words; never place a gloss between a noun and its postposition.
- Avoid the calques یاد کیا جانا ("remembered as"), کے لیے جانا جاتا ہے ("known for"), تب سے اب تک, a calqued ایک for "a", X کا اپنا for "X's own" (write خود X کا).
- Hedges and framing must govern the whole claim exactly as in the English ("tradition holds" روایت ہے کہ، "it is said" کہا جاتا ہے، "accounts differ" روایات مختلف ہیں، "most often" عموماً یا زیادہ تر، "not settled" طے نہیں). Legends stay legends. Never add certainty.
- Resolve every ان / انہوں نے / وہ to a clear person; name a saint in full (not a bare first name) where English uses "he" across sentences or paragraphs; name the person or century again across paragraph breaks.
- Agreement with the noun (gender and number), correct postpositions and izafat; do not repeat a word inside one sentence.
- Verse paragraphs: copy them byte for byte from the English file. Where the English has an italic rendering paragraph after a verse, give its meaning in Urdu as one short italic paragraph, no credit line. A verse already in Urdu needs no meaning paragraph.
- After resolving a pronoun or joining two sentences, reread the new sentence: the same name or place must not now appear twice in it.
- Keep the gloss for قلندر (and for any term an Urdu reader may not know), as its own clause, never between a noun and its postposition.
- Length: Urdu prose 0.85 to 1.15 times the English prose in characters.

When written, run:
  cd /home/claude/repo && python3 pipeline/book_queue/check_public_description.py <ID> --no-verdicts
It must print ok and exit 0. Fix the Urdu (not the checker) until it does. Then reread the whole Urdu once as a native editor would, and once paragraph by paragraph against the English for omissions and additions, and fix what you find (rerun the checker after).

Reply in under 80 words: the checker line and any name spellings you chose that are in neither the dictionary nor the existing article (a short list).
