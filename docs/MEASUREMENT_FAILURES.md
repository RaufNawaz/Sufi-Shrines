# How measurements go wrong here

*Written 31 August 2026, from about fifteen wrong measurements made by two sessions over two days.
Read this before trusting a number you just produced — including, especially, a number that
confirms what you expected.*

Every one of those fifteen had the same two properties. **The symptom was real**, and **no tool
behaved incorrectly.** That combination is why they survive: a false symptom gets checked, and a
crashing tool gets fixed. A true symptom with a plausible explanation gets *written down*.

They sort into three kinds. The taxonomy is worth more than the count, and the count has stopped
being interesting.

---

## 1. A stale source read as current

The artefact you are reading was true when it was written and is not true now, and nothing about it
says so.

- **`.gitignore` said `build-dataset` "drops for having no coordinates" the two rows a live export
  carries.** It had not done that since 22 August; `isValidRow` keeps unmapped rows on purpose, and
  names one of those two shrines as the reason it was changed. Four instruments had reported the
  171-vs-169 drift correctly and none read the predicate. Cost: an afternoon geocoding two shrines
  that were never blocked on a coordinate.
- **The bundle-budget header said "headroom stays ~7%."** Three routes were at exactly zero and six
  more under 3 KB.
- **CLAUDE.md said the video count "cannot be checked from the repository."** It could, from
  `photo_manifest.tsv`, by a better instrument than the one that produced it.
- **Two sessions read two different artefacts about the same shrine** — one `data/shrines.json`,
  one the live sheet — and reached opposite conclusions about whether it exists. Both were right
  about their own file.

**The tell:** a confident sentence with a date on it, or with none. **The check:** read the code or
the data the sentence describes, not the sentence. A comment is not a measurement.

## 2. A narrower query than the question

You asked something answerable and it was not the thing you wanted to know.

- **Searching image filenames for the literal string `whatsapp`** found one image and would have
  read as the standing finding being half wrong. `IMG-20260615-WA0116` is the same convention.
- **`hasText` is a substring**, so a figure-search assertion followed a gurdwara into the almanac.
- **`indexOf('Recorded, and unnamed')` missed what `getByText` had just found** — `innerText`
  returns the CSS-uppercased text.
- **A single-line regex against a `<meta>` tag prettier had split across three lines** reported the
  homepage as having no description at all. Both sessions hit this one independently.
- **Matching a failed `<img>` back to its row by URL prefix** marked the wrong one dead: every
  Wikimedia Commons URL in this archive opens with the same 43 characters.
- **`| head -14`** concluded a gate's output was missing a line that was on line 15. The rule
  against this is already written down (`feedback_never_truncate_test_output`), which is the point:
  knowing the rule is not the same as applying it under momentum.

**The tell:** a query that returns *few* results and confirms a hypothesis. **The check:** ask what
a false negative would look like, and construct one. Every guard in this repo that asserts "both
shapes of the damage" earned that phrasing here — and note that writing *"both"* is not evidence
there are two: an emphasis guard once asserted both damage shapes and both were the same shape.

## 3. A premise never arranged

The measurement was accurate about a state the system had never been in.

- **Three drafts of a spec asserted against a page whose images had never been requested.** Gallery
  images are `loading="lazy"` below a long article, so on an untouched page nothing is fetched,
  nothing can fail, and a working fix reads as broken. Anything testing image failure must scroll
  the gallery into view first.
- **Marker geometry measured 0.4 s after the marker count settled**, on a map still animating.
  Three assertions reported duplicate coordinates and a 0.13 px nearest pair. *The count settles
  long before the view does.* Wait for two identical frames 250 ms apart.
- **A browser pass reported 80 dead images from inside a proxied sandbox.** It was measuring the
  proxy; curl returned `206 image/jpeg` for the same URLs seconds later.
- **`route.fulfill({ status: 404 })` on "the first request"** is not enough — Chrome asked for the
  same file twice in a measured run, the retry succeeded, and the entry kept both photographs. Name
  the file.

**The tell:** a clean result on the first run. **The check:** break it on purpose. If you cannot
make the check fail, you have not shown that it can.

---

## What actually works

**Validate the instrument against a known answer first.** Geocoding was trusted only after OSM put
Data Darbar within 330 m of a coordinate already in the archive.

**Break every new guard before trusting it.** Every invariant added on 30–31 August was run against
a deliberately damaged copy of the real data. Two of them turned out to pass on damage they were
written for.

**Prefer the artefact that records what it cannot see.** `check_image_liveness.py` wrote down that
`sultan-bahoo.com` served an expired certificate on one connection and a valid one on the next, and
that its own number was therefore wrong. Four days later that image failed outright and the
correction took minutes instead of an investigation. **An instrument that documents its own blind
spot is worth more than one that is merely right.**

**Correcting a number from the file you already have is the most productive move available**, and it
happened twice in one day: 44 unfiled media files became 30 by looking harder at the same manifest,
and the 171-vs-169 drift was closed by reading a predicate nobody had opened. The file you already
have is the one least likely to get re-read.

**Publish the retraction next to the finding.** `docs/planning/UX_COUNCIL_2026-08-30.md` requires
its reviewers to list what they got wrong, and eleven of thirty-two findings were withdrawn. That
list is the reason the other twenty-one are credible.
