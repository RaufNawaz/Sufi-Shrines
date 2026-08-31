# How measurements go wrong here

*Written 30 August 2026, from about fifteen wrong measurements made by two sessions over two days.
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

- **A raw key lookup against a resolver-backed field.** This one produced **four** near-findings in
  a single day and is the most convincing shape in this document, because it fails exactly the way
  a real gap does. Three reviewers and I joined on the `id` column where the app resolves through
  `buildStableSlug(Name)` — "14 graph slugs missing from the dataset", "14 entries with no
  provenance record", "16 shrines with no Urdu article", all of them zero. Then, tracing something
  else, I checked `kg.saints[].name` as a raw key in `urdu-seed.json` and reported one figure with
  no Urdu name; the guard resolves through `localizeFigureName` and the name is reachable. What
  sold it was a near-miss in the data itself: the shrine is *"Gurdwara Bhai **Beba** Singh"* and the
  figure is *"Bhai **Biba** Singh"*, so the lookup fails on a spelling difference that looks like
  the very slug-drift you went looking for. **If a field is read through a function anywhere in the
  app, measure it through that function.**

- **A guard that counted bare occurrences of `sufi:discipleOf` in the TTL** read the fix's own
  vocabulary *declaration* as a 71st statement against 70 edges — so the instrument written to
  protect the property **reported the repair as a regression**. It could not tell a use of the
  predicate from a mention of it. This is the mirror of every other example here: the query matched
  more than it meant, rather than less.

**The tell:** a query that returns *few* results and confirms a hypothesis — or, in the mirror
case, one that returns *one more* than it should and reports a failure. **The check:** ask what
a false negative would look like, and construct one — **and the same for a false positive**, which
is the half this document had not said. A pattern that matches a thing and also matches a *mention*
of that thing is answering a different question in the other direction. Every guard in this repo that asserts "both
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

**Never truncate the output you are about to draw a conclusion from.** Three of the fifteen were
this and one of them was reading a gate's own report through `head -14` and concluding a line was
missing — it was line 15. Capture to a file and grep it. A pipe that hides the interesting line
does not announce that it has.

**State the unit, especially when someone else is measuring the same file.** Two sessions reported
348 and 365 for one shrine's media and spent a message resolving it: binary MiB against decimal MB,
agreeing all along, neither saying which. This costs nothing to prevent and reads as a
disagreement about the data.

**Do not round a figure that is going to a person for a decision.** The two unpublished shrines
hold 7.5% of the archive's recorded media; one session wrote 8%. Both are the same measurement and
they behave differently once they leave the page: **7.5 invites the next reader to re-measure and 8
invites them to quote it.** This archive's whole standing-findings lesson is about numbers that got
quoted after they stopped being true, and a rounded number is the more quotable one.

**Publish the retraction next to the finding.** `docs/planning/UX_COUNCIL_2026-08-30.md` requires
its reviewers to list what they got wrong, and eleven of thirty-two findings were withdrawn. That
list is the reason the other twenty-one are credible.

---

## Before adding a fourth kind

The three above are not a tally that grew to three. **A category earns its place by having its own
check** — not its own description, which is free.

| Kind | Its check |
| --- | --- |
| A stale source read as current | Compare against the artefact you did *not* read |
| A narrower query than the question | Widen the query and see whether the answer changes |
| A premise never arranged | Assert the premise before asserting the conclusion |

If a candidate's check is already one of those three, it is a subcase and this document is better
without it. That is why "never truncate the output you are about to conclude from" is filed as a
remedy rather than a fourth kind: its check is *widen the query*, and it is a narrow query wearing
a pipe.

Two kinds would have been a coincidence. Three with distinct tells and non-overlapping checks is a
diagnostic, and it should stay one.

**One candidate was put to this test on 30 August 2026 and filed as a subcase**, which is recorded
because the adjudication is more useful than the outcome. A guard counting bare occurrences of a
predicate read that predicate's own vocabulary *declaration* as an extra statement, and reported a
fix as a regression — an instrument unable to distinguish a claim from a mention of the claim. It
was proposed as a fourth kind by the session that spotted it, on the grounds that every other
failure here is an instrument measuring the wrong *surface* and this one measures the right surface
wrongly.

It does not earn a row, because its check is kind 2's: *construct a false positive*. What it did
earn is the discovery that kind 2's check was only half-written — the document said "ask what a
false negative would look like" and stopped, so the mirror case had no stated remedy despite being
the same defect. **The candidate improved the taxonomy without joining it**, which is the outcome
this gate is for.
