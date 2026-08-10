# Internet Archive — setup for the oral history recordings

## Why this and not the repo

A 20-minute recording is 10–30 MB. Committing dozens to a GitHub Pages repo bloats the
clone forever (git never forgets a blob), and Pages is not built to serve media. The
Internet Archive is free, permanent, generates its own streaming player and waveform,
gives every item a citable identifier, and — the part that matters most here — **the
recordings survive independently of whether this project does.** Given there is currently
one engineer and a 2028 graduation date, that is not a small consideration.

---

## Before you upload anything: consent

**Do this first. It is not a formality and it is not reversible.**

Internet Archive items can be *darkened* (hidden from public view) but not truly deleted.
Once a recording of an elderly *khādim* is public, assume it is public permanently.

So:

1. **Consent must be on the recording itself**, in Urdu or Punjabi, at the start, in the
   speaker's own voice. A signature on a form nobody can produce later is worth less than
   thirty seconds of tape.
2. **The script must say the recording will be published freely on the internet**, not
   merely "used for research". Those are different things and the speaker is agreeing to
   the first.
3. **Anything without clear consent does not get uploaded.** Not "upload and sort it out
   later" — the whole point of a permanent archive is that later is too late.
4. Keep a `consent_log.tsv`: recording ID, speaker name, role, date, language of consent,
   timestamp in the file where consent is given, and whether they asked for any
   restriction.

### Suggested spoken script

> *"My name is [surveyor]. I am recording this conversation for a public archive of
> Pakistan's shrines. It will be published freely on the internet so that anyone can
> listen to it, and it will be kept permanently. You may refuse any question, and you may
> ask me to stop at any time. Do you agree to be recorded and published? Please say your
> name and your answer."*

If they hesitate, stop. A refused interview costs an hour; a betrayed one costs the
project its standing at every shrine in the district.

---

## One-time account setup

1. Create a free account at **archive.org** — use a project address, not a personal one.
   `shrines.project@…` or similar, so it can be handed over.
2. Get API keys at **archive.org/account/s3.php**. Copy both the access key and secret.
3. Install the CLI and configure it:

```bash
pip3 install --break-system-packages internetarchive
ia configure          # prompts for archive.org email + password
```

4. Verify:

```bash
ia whoami
```

---

## Identifier scheme

One item per interview, not one per shrine. Cleaner citation, and it means a single
recording can be restricted later without affecting the others.

```
shrines-pk-<shrine-slug>-<role>-<YYYYMMDD>
```

Examples:

```
shrines-pk-data-darbar-khadim-20260815
shrines-pk-bibi-pak-daman-administrator-20260816
shrines-pk-madho-lal-hussain-qawwal-20260820
```

Identifiers are global and permanent — check availability before uploading:

```bash
ia metadata shrines-pk-data-darbar-khadim-20260815
```

An empty result means it is free.

---

## Upload

```bash
ia upload shrines-pk-data-darbar-khadim-20260815 \
  ./data-darbar_khadim_20260815.m4a \
  --metadata="title:Oral history — Data Darbar, Lahore: interview with a khadim" \
  --metadata="mediatype:audio" \
  --metadata="collection:opensource_audio" \
  --metadata="creator:Mapping the Shrines of Pakistan" \
  --metadata="date:2026-08-15" \
  --metadata="language:urd" \
  --metadata="subject:Sufi shrine" \
  --metadata="subject:oral history" \
  --metadata="subject:Data Darbar" \
  --metadata="subject:Lahore" \
  --metadata="subject:Pakistan" \
  --metadata="licenseurl:http://creativecommons.org/licenses/by-sa/4.0/" \
  --metadata="description:Field recording made at Data Darbar, Lahore, for a public archive of Pakistan's shrines. The speaker gave recorded consent to publication at the start of the file. Interviewer: Saifullah Imtiaz."
```

Notes on those fields:

- `language` uses ISO 639-2: `urd` Urdu, `pan` Punjabi, `snd` Sindhi, `pus` Pashto. Use
  the language actually spoken, not the language of the project.
- `licenseurl` — **CC BY-SA 4.0** is the right default. It keeps the material reusable,
  requires attribution, and stops anyone enclosing it in a proprietary product. If a
  speaker wants no commercial reuse, use CC BY-NC-SA for that item only.
- The consent statement belongs in `description`, visibly. It tells a future user the
  recording is ethically sourced without them having to take it on faith.
- The Archive auto-generates MP3 derivatives and a player; upload the original, not a
  compressed copy.

---

## Embedding on the shrine page

```html
<iframe src="https://archive.org/embed/shrines-pk-data-darbar-khadim-20260815"
        width="100%" height="150" frameborder="0"
        allowfullscreen title="Oral history recording — Data Darbar"></iframe>
```

Add a plain link beneath it for anyone the iframe fails for, and always give the
speaker's role and the date beside the player. A recording labelled only "audio" is
nearly useless to someone deciding whether to spend twenty minutes on it.

---

## Publish the transcript too

The recording is the primary source; the transcript is what makes it findable. Search
engines cannot index audio, and neither can your own site search.

Run each recording through the pipeline you already built for books — transcribe, then
translate, then summarise — and put the Urdu transcript and English rendering on the
shrine page alongside the player. Upload the transcript into the same Archive item as a
`.txt` so the two never separate:

```bash
ia upload shrines-pk-data-darbar-khadim-20260815 ./transcript_urdu.txt ./transcript_english.txt
```

Then cite it in the shrine's bibliography like any other source:

> Oral history interview with a *khādim* of Data Darbar, Lahore, 15 August 2026.
> Internet Archive, `shrines-pk-data-darbar-khadim-20260815`.

That line is the whole point of the exercise: a claim on the page that traces to a named
person who said it, on tape, permanently retrievable.

---

## A collection of your own

Once you have ten or so items, ask Archive support to create a dedicated collection
(`shrines-of-pakistan`). It gives you one landing page for the whole oral history archive,
which is far more presentable to Auqaf or a funder than a list of loose items. It is a
manual request and takes a few days.

---

## Batch upload

Once the pattern is established, a CSV-driven batch is simpler than repeated commands:

```bash
ia upload --spreadsheet=uploads.csv
```

`uploads.csv` needs an `identifier` and `file` column plus one column per metadata field.
Build it from `consent_log.tsv` so an item without a logged consent cannot physically be
uploaded — make the pipeline enforce the ethics rather than relying on remembering.
