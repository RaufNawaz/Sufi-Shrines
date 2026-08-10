# Claude Code prompt — generalise the image pipeline to all shrines

## Before you run it

Claude Code cannot reach Google Drive. Do this first, once:

1. Open the Drive folder **"Shrine Information Form (File responses)"**.
2. Select all → Download. Drive zips it.
3. Move the zip into the repo working directory as `form_uploads.zip` (do **not** commit it — the prompt adds it to `.gitignore`).

Then paste the prompt below. Run it **without** `--dangerously-skip-permissions` — it commits image files and edits the sheet mapping.

---

## The prompt

```
You are generalising the self-hosted image pipeline in this repo so that every
field-surveyed shrine works the way Bibi Pak Daman already does, instead of just that one.

BACKGROUND
Shrine photos are uploaded by enumerators through a Google Form. The resulting Drive
links CANNOT be used as image sources on the site — Drive's old sharing format is
deprecated and those URLs no longer render. So photos must be downloaded, optimised,
committed to this repo, and referenced by a stable path. That is already true for a
small number of shrines; the rest still point at Drive links or nothing at all.

Existing convention, which you must match exactly:
    photos/<slug>/<slug>-01.jpg, -02.jpg, ...
served as https://raufnawaz.github.io/Sufi-Shrines/photos/<slug>/<slug>-01.jpg

Known slugs already live — do NOT rename these, the URLs are in the sheet:
    data-darbar, bibi-pak-daman, mazar-e-iqbal, shah-jamal, peer-makki,
    madho-lal-hussain, ganj-e-inayat-sarkar, abul-faiz-qalander-ali-suharwardi

STEP 0 — orient, change nothing yet
Read the code and report to MEDIA_NOTES.md:
- exactly how Bibi Pak Daman's images are currently sourced and rendered
- how the Image 1..16 sheet columns are consumed
- whether the gallery/hero distinction is driven by column order or by filename
- any image size/aspect assumptions in the CSS
Then STOP and show me this before editing.

STEP 1 — unpack and inventory
`form_uploads.zip` is in the working directory. Unzip to a gitignored scratch dir.
Google Form uploads are named like "<Question> - <Respondent> - <original>.jpg", so the
shrine name is usually recoverable from the filename. Build media_inventory.tsv:
    file_path, inferred_shrine, confidence (high|low), kind (photo|video|audio|book), bytes, dimensions
Use `survey_canonical.tsv` in this directory as the authoritative list of 14 shrines and
their expected photo/video counts — reconcile against it and report mismatches.
Anything you cannot confidently attribute goes in a separate `media_unattributed.tsv`.
DO NOT GUESS an attribution to make counts match.

STEP 2 — two known data problems, handle explicitly
The form has separate upload questions for photos and for books/pamphlets, and two rows
have files in the wrong one:
 - Data Darbar: 1 file in the photo field, 10 in the book field
 - Mian Mir: photo field EMPTY, 4 files in the book field
Mian Mir is the important one — it is why that shrine still has no field photos despite
being surveyed. Inspect the actual files: if they are photographs of the shrine, treat
them as photos regardless of which question they arrived through. If they are scanned
book pages, keep them as books. Report your determination per file; do not assume.

STEP 3 — process
For each attributed photo:
 - strip EXIF (these are field photos; location metadata should not be published)
 - resize so the long edge is at most 2000px; keep aspect ratio; never upscale
 - re-encode JPEG quality ~82, progressive
 - also emit a 600px-wide thumbnail as <slug>-NN-thumb.jpg if the gallery uses one
   (decide from STEP 0, do not add a thumbnail system that isn't used)
 - write to photos/<slug>/<slug>-NN.jpg, zero-padded, starting 01
 - ordering: put the single best establishing shot first — a clear exterior or a wide
   interior showing the space. If you cannot tell, keep the enumerator's original order
   and say so.
Use Pillow. If it isn't available, `pip install --break-system-packages Pillow`.
Log every file: source -> destination, original and final size, in media_changes.md.

STEP 4 — write the sheet mapping
Emit image_urls.tsv: `Name`, `Image 1` ... `Image 16`, filled with the resulting public
URLs, keyed so it can be pasted or VLOOKUPed into the sheet. Use the shrine's `Name`
exactly as it appears in the live sheet — read it from shrines_final.csv if present.
Do not attempt to edit the Google Sheet; you cannot reach it.

STEP 5 — video and audio: inventory only, do not commit
Report the files, sizes and durations in MEDIA_NOTES.md, and STOP. Do not add them to
git. A 20-minute recording is 10-30MB; committing these to a GitHub Pages repo is the
wrong call and needs a hosting decision first. Recommend an option, with reasoning.

STEP 6 — verify
 - every URL in image_urls.tsv resolves to a file that exists on disk
 - no file exceeds 2000px on its long edge or ~500KB
 - `git status` shows only photos/ additions plus the .gitignore change
 - add form_uploads.zip and the scratch dir to .gitignore
Stage everything. DO NOT COMMIT OR PUSH. Summarise: shrines processed, images added,
total repo size added, anything unattributed, and the Data Darbar / Mian Mir findings.

CONSTRAINTS
- Never overwrite an existing photos/<slug>/ file without telling me first — some are
  already live and referenced from the sheet.
- Do not rename existing slugs.
- Do not invent an attribution. media_unattributed.tsv is the correct home for doubt.
- No new runtime dependencies in the site itself; Pillow is a build-time tool only.
```

---

## What this does not solve

**Audio hosting.** Step 5 deliberately stops. Recordings are the project's stated purpose and there are files sitting in Drive already, but a GitHub Pages repo is the wrong place for tens of megabytes of audio. Realistic options, in rough order of preference:

1. **Internet Archive** — free, permanent, built for exactly this, gives you an embeddable player and a citable identifier. Also means the recordings survive the project.
2. **Cloudflare R2 or Backblaze B2** — cheap, fast, but you own the upkeep and the bill.
3. **YouTube unlisted** — free and easy, but you don't control it and it's a poor archival home for primary source material.

The Internet Archive option has a real secondary benefit: an oral history deposited there is preserved independently of whether this project continues, which matters given the succession question.

**Transcription.** Once audio is hosted, it goes through the same chain as books: transcribe → translate → summarise, and the transcript becomes a citable source on the shrine's page. Worth publishing the transcript alongside the audio rather than instead of it — searchable text is what makes a recording findable.
