# Urdu-script check: the page-image checks, 16 October 2026 (HANDOVER §9.354)

These follow up the flagged lines in `data/review/PATCH_urdu_script_2026-10-15.tsv` (§9.353). Each line was settled by
rendering the cited PDF page (pdftoppm at 200 and 400 dpi, from single pages split out with `pdfseparate`) and
reading the quoted words on the image. **This is still a proposal. No md draft, patch CSV, import CSV, takeaway,
transcription or sheet cell was changed.**

PDF pages are 1-based PDF indices. The transcription's `[p. N]` markers are PDF pages too, as both provenance files say.
Tareekh = `books/incoming-2026-09-11/22_2015.398396.Tareeq-Lahore-saifullah-imti.pdf`;
Tahqiqat = `books/incoming-2026-09-11/21_2015.315235.Tahqiqaat-Chishti-saifullah.pdf`.

## Results, by patch line

| patch n | row / line | PDF page (printed folio) | what the image prints | verdict |
|---|---|---|---|---|
| 17 | samadh-raja-teja-singh `_name_ur` | Tareekh 190 (folio 193) | **سمادہ**, with دال, at least three times on the page ("راجہ تیجا سنگہ کی سمادہ", "یہ سمادہ بعد وفات", "اس سمادہ کی تعمیر"); the name is printed **تیجا سنگہ** | proposed: `سمادہ راجہ تیجا سنگہ`. Our سماوہ is a و/د misreading carried over from the transcription (L2298, L2300). |
| 23 | samadhi-of-maharaja-ranjit-singh L11 | Tahqiqat 577 (folio 552) | "**کہ سن** چودہ سو ستر عیسوی مین". کہ is written joined to سن, which is why the transcription read کس | the quotation's "سن چودہ سو ستر" is RIGHT. It is not a silent repair. The transcription (L6982) is the one that is wrong. No change to the draft. |
| 25 | gurdwara-chhevin-patshahi-mozang L13 | Tahqiqat 513 (folio 507) | "دریا برد کیا ۔ **جب** یہان لاہور مین گورو ہرگوبند آئے تو بمقام مزنگ وہان ڈیرہ کیا" | the quotation's **جب** is RIGHT; the transcription's بعد (L6322) is wrong. The book prints یہان, مین (see the orthography note below). |
| 26 | mozang L11 ("…اسکا ادب کرتے ہین") | Tareekh 226 (folio 229) | **ہین** | the quotation is RIGHT. The transcription's ہیں is a modernisation. |
| 27 | mozang L23 (two quotations) | Tareekh 226 (folio 229) | "مندر بابا صاحب کہتے **ہین**"; and "اسمین دو **گرنتھہ / باداب** تمام رکھے **ہین** اور گرنتھون کے اوپر ریشمی سائبان تنا ہوا ہی" | ہین is RIGHT. **The second quotation is also a MISREADING:** the draft and the transcription have "دو گرنتھ ہین جو اب تمام رکھے ہین", but the book prints "دو گرنتھہ باداب تمام رکھے ہین", meaning that two Granths are kept *with all due reverence*. The draft's English ("now kept …") translates the misreading and has to change with it. The same idiom is printed on Tareekh 206, last line: "گرنتھہ صاحب باداب تمام رکھا رہتا ہی". |
| 28 | gurdwara-dera-sahib L81 ("…بنی ہین") | Tareekh 206 (folio 209) | **ہین** | RIGHT. |
| 29 | gurdwara-dera-sahib L83 ("کہتے ہین …") | Tareekh 206 (folio 209) | **ہین** begins the line | ہین is RIGHT. Not settled: the next word, quoted "بنگ کوٹنے", looks like **گھوٹنے** on the image. Tareekh 206, next line, prints "بنگ گھوٹتے اور پیتے ہین", and 217 prints "بہنگ گھوٹ کر", which supports گھوٹنے. The 600 dpi crop is too broken to be sure, so this needs a human eye. |
| 30 | madho-lal-hussain L293 (two) | Tareekh 233 (folio 236) | "دروازہ کہتے **ہین**", "فرما چکے **ہین**" | RIGHT. |
| 31 | madho-lal-hussain L301 | Tareekh 234 (folio 237) | "مکانات گرے پُرے **ہین**" | RIGHT. |
| 32 | madho-lal-hussain L369 | Tareekh 233 (folio 236) | "مسلمانون مین بہت مشہور **ہین**" | RIGHT. Note that the quotation writes میں for printed مین. |
| 33 | madho-lal-hussain L383 | Tareekh 233 (folio 236) | "چشم دیدہ لکہی **ہین**" | RIGHT. |
| 34 | samadhi-of-maharaja-ranjit-singh L104 | Tareekh 217 (folio 220) | "کی پتہر مین بنا کر نصب کی گئی **ہین**" | RIGHT. |
| 35 | samadhi-of-maharaja-ranjit-singh L132 (two) | Tareekh 219 (folio 222) | "گیارہ رانیون کی **ہین**", "دو کبوترون کی **ہین**" | RIGHT. |
| 36 | shrine-of-baba-shah-chiragh L77 | Tareekh 80 (folio 83) | "نیلہ گنبد / کہتے **ہین**" | RIGHT. |

Patch line 24 was flagged as well. The bridge dropped before its text could be read, so this run did not check it.
The next firing should read it.

## What the ہین/ہیں question turned out to be

**The book prints ہین, all 13 times.** The quotations are faithful on that word. Our Tareekh-e Lahore transcription
modernised it to ہیں. So none of lines 26-36 should be applied as `proposed`; each one's proposal is now "no change".

The same pages show something larger. **Tareekh-e Lahore and Tahqiqat-e Chishtiyya write final نون غنہ with a dotted
ن throughout** (مین, یہان, سکھون, گرنتھون, رانیون, کبوترون), and they often write ہی for ہے. The rewritten
Descriptions keep ہین but modernise the rest of the same quotations (میں, یہاں, سکھوں, گرنتھوں, سمادہیں, تھیں).
So the quotations are neither wholly as printed nor wholly modernised. Rauf ruled on 29 Sep (§9.242) that
orthography is as printed. That ruling applies, but bringing every quotation into line is a bulk edit, so it is
asked rather than done.

## The transcription errors these pages exposed (not fixed, since the transcriptions are not edited here)

- Tareekh L2298, L2300, L2312: سماوہ/سادہ for **سمادہ** (p. 190-191).
- Tareekh L2652: "دو گرنتھ ہیں جو اب تمام" for **"دو گرنتھہ باداب تمام"** (p. 226).
- Tareekh, all 13 passages above: ہیں for printed **ہین**. This is probably corpus-wide in that transcription.
- Tahqiqat L6982: کس for **کہ سن** (p. 577). Tahqiqat L6322: بعد for **جب** (p. 513).

## Addendum, 16 October 2026 ~05:15Z (HANDOVER §9.355): patch line 24 and the گھوٹنے crop

Pages split out with `pdfseparate` into `out/urdu_image_check2/` (Tazkirah p. 63) and `out/urdu_image_check/tl_206.pdf`,
rendered at 150/300/600 dpi and read. Still a proposal; nothing was changed.

| patch n | row / line | PDF page (printed folio) | what the image prints | verdict |
|---|---|---|---|---|
| 24 | shrine-of-fariduddin-ganjshakar L45 (روغنی روٹیاں) | Sharib, *Tazkirah Awliya-e Pak o Hind* (`tazkirah_awliya_pak_o_hind`, `books/incoming-2026-09-11/16_00523_Tazkirah-Awliya-e-Pak-o-Hind-saifu.pdf`) PDF 63 (folio 59, as the draft cites) | "**دو روغنی روٹیوں** میں سے ایک خود تناول فرماتے تھے اور دوسری روٹی کے ٹکڑے کرکے حاضرین کو تقسیم کر دیتے تھے"; our transcription L1489 has the same words | **The §9.353 flag was a FALSE MATCH.** It compared the draft with a different book and passage (Tazkirah-e Awliya-e Pakistan vol. 1, transcription L6468, "روغنی ردٹی کھلانے", a story about loaves promised to friends). The draft's source is Sharib p. 63, which prints روٹیوں cleanly. The draft's روغنی روٹیاں is not inside quotation marks; it is the direct-case form of the printed روٹیوں, used inside English prose. Not a silent repair. Proposed: no change (or, if Rauf wants every Urdu word in the Descriptions to be as printed, quote "دو روغنی روٹیوں"). |
| 29 (2nd half) | gurdwara-dera-sahib L83 ("بنگ کوٹنے") | Tareekh 206 (folio 209) | "ہین بنگ **گہوٹنے** کیواسطے پاس رکھی ہے": the گ's second stroke and the ٹ's small ط are clear at 600 dpi; the book writes ہ for ھ (سنگہ, لکہی), so this is گھوٹنے | **The draft's کوٹنے is a misreading.** Proposed: quote "بنگ گہوٹنے کے واسطے" as printed (the book writes it کیواسطے), or "گھوٹنے" if Rauf modernises. The English ("for pounding *bhang*") can stand; گھوٹنا is to grind or pound. |

Seen on the same Tareekh line and the one above it, not settled (the draft already marks both `[OCR?]`, so they are listed
for a human eye only): the pestle's name, quoted "ونڈ[OCR?]", looks like **ونڈا** on the image (a final alif after ڈ);
and the mortar, quoted "کوڑہ[OCR?] پتھر", is printed as a word beginning with د or ک, with a ڑ, before **پتہر** (the book
prints پتہر, not پتھر). The draft's "گاڑا ہوا ہے" is printed "گاڑا ہوا ہی" (the ہی-for-ہے orthography noted above).

With this addendum every flagged line of `PATCH_urdu_script_2026-10-15.tsv` has been checked against a page image.
