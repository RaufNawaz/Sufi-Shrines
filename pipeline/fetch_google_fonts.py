#!/usr/bin/env python3
"""fetch_google_fonts.py — bring the Latin faces in-house, subsets intact.

Why
---
`index.html` loads Merriweather, Source Sans 3 and Noto Naskh Arabic from
fonts.googleapis.com, and the comment above those links already makes this
script's argument:

    "That is a third-party host this archive does not control, on a site whose
    readers are mostly on a mobile connection in Pakistan, where Google's font
    CDN is periodically slow or unreachable. Measured in this sandbox, where it
    is blocked outright: a reload of / takes 12.6 s, and that is what a reader
    on a blocked network gets too."

The workaround in place is `media="print"` plus an onload promotion, which makes
the stylesheet non-blocking so the first paint is typeset in Georgia and
system-ui rather than blank. It works, and it is why the faces swap in at about
800ms — which is **every remaining layout shift in the archive**: six routes,
six different elements, all between 760ms and 841ms, every one of them text
re-wrapping (HANDOVER §9). The current design trades a layout shift for a
non-blank paint. Self-hosted and preloaded, there is nothing to trade: the files
are same-origin on an already-open connection, so they arrive before first paint
and never swap.

Noto Nastaliq Urdu is already self-hosted in `public/fonts/` with its OFL, and
`src/styles/global.css` gives the reason — "it's the primary reading face for the
whole Urdu experience, so it doesn't depend on a third-party CDN being
reachable." That reasoning does not stop at Nastaliq. This is the same move for
the other three families.

The one thing not to get wrong
------------------------------
**Every `@font-face` block is copied verbatim, with its `unicode-range`, and only
the `src` is rewritten.** Google splits each family into subsets — latin,
latin-ext, cyrillic, greek, vietnamese, arabic, math, symbols — and the
`unicode-range` on each is what tells the browser which characters that file
covers. Hand-writing these and dropping a subset renders tofu, and in this
archive it would land on ʿ, ā, ī and the other transliteration marks the prose
is careful about. Copying the blocks makes coverage identical *by construction*
rather than by review.

All 53 blocks are kept, including the 29 for Cyrillic, Greek and Vietnamese that
this archive will almost certainly never trigger. They cost nothing at runtime:
`unicode-range` means a browser downloads a subset only when a character in that
range actually appears on the page. Deciding which scripts the archive "needs"
would be a guess with a tofu on the other side of it, and there is no runtime
saving to buy with that risk.

The trap on the other side, found before it was walked into
-----------------------------------------------------------
**Do not wire this up without changing the service worker in the same commit.**
`vite.config.ts` precaches `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`,
so *every* woff2 in the build is in the precache manifest and every visitor
downloads all of them on the first load. Verified against `dist/sw.js`: the three
Nastaliq files are listed, 476 KB, unconditionally.

Which means the existing gating does not do what its comment says it does.
`index.html` preloads Nastaliq only for readers who will see it, on the
reasoning that doing it unconditionally "would cost every English-first visitor
~154KB they don't need" — and the service worker then fetches all three anyway.
The gate controls first-paint priority; it does not save a byte.

The 53 files this downloads are 1,560 KB, so dropping them into `public/fonts/`
would take the precache from 4,269 KB to about 5,830 KB for every visitor,
including the Cyrillic, Greek and Vietnamese subsets nobody will render. That is
a 37% regression on first load, bought to remove a 76px layout shift. The right
shape is `globIgnores` for the font directory plus a runtime CacheFirst route,
which is what workbox recommends for fonts anyway — but that changes what the
archive can do offline, so it is a decision with a real trade and it needs a
production build to measure. Hence this script downloads and stops.

Two mechanical notes
--------------------
- **The request needs a modern browser User-Agent.** Google serves woff2 only to
  a UA it believes supports it; with curl's default it answers with truetype,
  which is roughly twice the bytes.
- **The CSS URL is read out of `index.html`, not hardcoded here.** Three tags
  carry it (preload, stylesheet, noscript) and this asserts all three agree, so
  a family added to the markup cannot be silently missed by this script.

Usage
-----
    python3 pipeline/fetch_google_fonts.py            # download + write fonts.css
    python3 pipeline/fetch_google_fonts.py --dry-run  # report, touch nothing
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
FONT_DIR = ROOT / "public" / "fonts"
OUT_CSS = ROOT / "src" / "styles" / "fonts.css"

# Google serves woff2 only to a UA it thinks can take it. Not spoofing anything
# it would refuse — just declining the truetype fallback meant for IE.
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
TIMEOUT_S = 30

BLOCK_RE = re.compile(r"/\*\s*([^*]+?)\s*\*/\s*@font-face\s*\{(.*?)\}", re.S)


def curl(url: str, *, binary: bool) -> bytes:
    result = subprocess.run(
        ["curl", "--silent", "--show-error", "--location", "--max-time", str(TIMEOUT_S),
         "--user-agent", UA, url],
        capture_output=True,
        check=False,
        timeout=TIMEOUT_S + 10,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl {result.returncode} on {url}: {result.stderr.decode(errors='replace').strip()}")
    if not result.stdout:
        raise RuntimeError(f"empty response from {url}")
    return result.stdout if binary else result.stdout


def css_url_from_index() -> str:
    html = INDEX_HTML.read_text(encoding="utf-8")
    urls = re.findall(r'href="(https://fonts\.googleapis\.com/css2\?[^"]+)"', html)
    if not urls:
        raise SystemExit(
            "No fonts.googleapis.com css2 URL in index.html. If the markup has already been\n"
            "switched to the self-hosted faces, this script has nothing to do."
        )
    unique = set(urls)
    if len(unique) != 1:
        raise SystemExit(
            f"index.html carries {len(unique)} different Google Fonts URLs and they must agree:\n  "
            + "\n  ".join(sorted(unique))
        )
    return urls[0]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse(css: str) -> list[dict]:
    blocks = []
    for subset, body in BLOCK_RE.findall(css):
        def one(prop: str) -> str | None:
            found = re.search(rf"{prop}:\s*([^;]+);", body)
            return found.group(1).strip() if found else None

        family = one("font-family")
        src = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", body)
        blocks.append(
            {
                "subset": subset,
                "family": (family or "").strip("'\""),
                "style": one("font-style") or "normal",
                "weight": one("font-weight") or "400",
                "stretch": one("font-stretch"),
                "display": one("font-display"),
                "unicode_range": one("unicode-range"),
                "url": src.group(1) if src else None,
                "body": body,
            }
        )
    return blocks


def filename(block: dict) -> str:
    italic = "i" if block["style"].startswith("italic") else ""
    return f"{slug(block['family'])}-{block['weight']}{italic}-{slug(block['subset'])}.woff2"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report and write nothing")
    args = ap.parse_args()

    url = css_url_from_index()
    print(f"CSS  {url}\n")
    css = curl(url, binary=False).decode("utf-8")
    blocks = parse(css)
    print(f"{len(blocks)} @font-face block(s)")

    # Fail loudly rather than emit a face with no coverage declaration: a block
    # without a unicode-range would be treated as covering everything and would
    # shadow every other subset of the same family.
    broken = [b for b in blocks if not b["url"] or not b["unicode_range"] or not b["family"]]
    if broken:
        print(f"\n{len(broken)} block(s) could not be parsed — refusing to write:", file=sys.stderr)
        for b in broken[:5]:
            print(f"  subset={b['subset']!r} family={b['family']!r} url={bool(b['url'])} range={bool(b['unicode_range'])}", file=sys.stderr)
        return 1

    families = sorted({b["family"] for b in blocks})
    for family in families:
        subsets = sorted({b["subset"] for b in blocks if b["family"] == family})
        weights = sorted({f"{b['weight']}{'i' if b['style'].startswith('italic') else ''}" for b in blocks if b["family"] == family})
        print(f"  {family}: weights {', '.join(weights)} · subsets {', '.join(subsets)}")

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0

    FONT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    print()
    for block in blocks:
        name = filename(block)
        data = curl(block["url"], binary=True)
        # A woff2 begins with the signature 'wOF2'. Checked because a rate limit
        # or an error page is also a 200 with bytes in it, and a 2 KB HTML body
        # written to a .woff2 fails silently as tofu.
        if data[:4] != b"wOF2":
            print(f"  {name}: not a woff2 ({len(data)} bytes, starts {data[:8]!r}) — refusing", file=sys.stderr)
            return 1
        (FONT_DIR / name).write_bytes(data)
        total += len(data)
    print(f"  {len(blocks)} file(s), {total / 1024:.0f} KB into {FONT_DIR.relative_to(ROOT)}")

    header = f'''/* Latin and Naskh faces, self-hosted.
 *
 * GENERATED by pipeline/fetch_google_fonts.py from the Google Fonts CSS whose
 * URL is in index.html. Do not edit by hand — re-run the script.
 *
 * Every block below is Google's own, copied verbatim except for `src`. The
 * `unicode-range` declarations are the point: they are what tells the browser
 * which characters each file covers, and rewriting them by hand is how an
 * archive that prints ʿurs, Kashf al-Mahjūb and Farīd ends up with tofu. See
 * the script's docstring.
 *
 * Nastaliq is declared separately, in global.css, and was self-hosted first for
 * the reason that applies to all of these: the primary reading faces of a
 * bilingual archive should not depend on a third-party CDN being reachable from
 * Pakistan.
 *
 * {len(blocks)} faces across {len(families)} families: {", ".join(families)}.
 */

'''
    out = [header]
    for block in blocks:
        lines = [f"/* {block['subset']} */", "@font-face {"]
        lines.append(f"  font-family: '{block['family']}';")
        lines.append(f"  font-style: {block['style']};")
        lines.append(f"  font-weight: {block['weight']};")
        if block["stretch"]:
            lines.append(f"  font-stretch: {block['stretch']};")
        if block["display"]:
            lines.append(f"  font-display: {block['display']};")
        lines.append(f"  src: url('/fonts/{filename(block)}') format('woff2');")
        lines.append(f"  unicode-range: {block['unicode_range']};")
        lines.append("}")
        out.append("\n".join(lines))
    OUT_CSS.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"  wrote {OUT_CSS.relative_to(ROOT)}")

    print(
        "\nNot yet wired up, and step 0 is not optional — see the docstring:\n"
        "  0. vite.config.ts precaches **/*.woff2, so these 53 files would add ~1,560 KB to\n"
        "     every visitor's first load. Add globIgnores for the font directory and a runtime\n"
        "     CacheFirst route in the SAME commit, and decide what that means for offline use.\n"
        "  1. import src/styles/fonts.css from the app's stylesheet entry\n"
        "  2. remove the three fonts.googleapis.com <link> tags and the two <link rel=preconnect>\n"
        "  3. add <link rel=preload as=font type=font/woff2 crossorigin> for the latin subsets\n"
        "     of the faces the first paint uses\n"
        "  4. re-measure against a PREVIEW build, not dev: node scripts/measure-cls.mjs\n"
        "     --base http://localhost:4173. In dev these come off disk in milliseconds and\n"
        "     CLS reads 0 whatever the strategy.\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
