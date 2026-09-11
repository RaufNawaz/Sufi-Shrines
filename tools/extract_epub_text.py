"""Extract the reading-order text of an EPUB into out/ocr/<book>/ — no OCR.

An EPUB is a zip of XHTML files; its OPF manifest gives the spine (reading
order). This walks the spine, strips the markup, and writes the text in the
same shape `tools/ocr_all_books.py` writes for a PDF:

  out/ocr/<book-name>/p001-end_<timestamp>_transcribed.txt
  out/ocr/<book-name>/p001-end_<timestamp>_provenance.json

so `tools/finalize_books.py` and the summariser see one kind of output.
Stdlib only, deliberately: this runs on whatever machine the OCR batch runs on.

  python3 tools/extract_epub_text.py books/incoming-2026-09-11/*.epub
  python3 tools/extract_epub_text.py --force path/to/book.epub
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

from _lib import OCR_ROOT, REPO_ROOT, safe_filename_part, utf8_stdio

utf8_stdio()

BLOCK_TAGS = {
    "p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "blockquote",
    "section", "article", "hr", "td", "th", "dd", "dt", "figcaption",
}
SKIP_TAGS = {"script", "style", "head", "title"}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag in SKIP_TAGS:
            self._skip_depth += 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self.parts.append(data)

    def text(self) -> str:
        raw = "".join(self.parts)
        raw = re.sub(r"[ \t\r\f\v]+", " ", raw)
        raw = re.sub(r" *\n *", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()


def spine_documents(epub: zipfile.ZipFile) -> list[str]:
    """Return the zip member names of the spine's XHTML documents, in order."""
    container = ET.fromstring(epub.read("META-INF/container.xml"))
    ns = {"c": "urn:oasis:names:tc:opendocument:xmlns:container"}
    rootfile = container.find("c:rootfiles/c:rootfile", ns)
    if rootfile is None or not rootfile.get("full-path"):
        raise ValueError("container.xml names no OPF rootfile")
    opf_path = rootfile.get("full-path")
    opf_dir = opf_path.rsplit("/", 1)[0] + "/" if "/" in opf_path else ""
    opf = ET.fromstring(epub.read(opf_path))
    ons = {"o": "http://www.idpf.org/2007/opf"}
    manifest = {
        item.get("id"): (item.get("href"), item.get("media-type", ""))
        for item in opf.findall("o:manifest/o:item", ons)
    }
    docs: list[str] = []
    for itemref in opf.findall("o:spine/o:itemref", ons):
        href, media = manifest.get(itemref.get("idref"), (None, ""))
        if href and ("html" in media or href.lower().endswith((".xhtml", ".html", ".htm"))):
            docs.append(opf_dir + href.split("#", 1)[0])
    if not docs:
        raise ValueError("OPF spine lists no XHTML documents")
    return docs


def extract(epub_path: Path) -> str:
    chunks: list[str] = []
    with zipfile.ZipFile(epub_path) as epub:
        for member in spine_documents(epub):
            try:
                html = epub.read(member).decode("utf-8", errors="replace")
            except KeyError:
                print(f"    WARNING: spine item missing from zip: {member}", file=sys.stderr)
                continue
            parser = _TextExtractor()
            parser.feed(html)
            text = parser.text()
            if text:
                chunks.append(text)
    return "\n\n".join(chunks).strip()


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("epubs", nargs="+", help="EPUB files (or directories to scan for *.epub).")
    parser.add_argument("--force", action="store_true", help="Redo books that already have output.")
    args = parser.parse_args(argv)

    targets: list[Path] = []
    for raw in args.epubs:
        path = Path(raw)
        if path.is_dir():
            targets.extend(sorted(path.glob("*.epub")))
        elif path.is_file():
            targets.append(path)
        else:
            print(f"ERROR: not found: {path}", file=sys.stderr)
            return 1
    if not targets:
        print("ERROR: no .epub files given", file=sys.stderr)
        return 1

    failed = 0
    for epub_path in targets:
        book_name = safe_filename_part(epub_path.stem)
        out_dir = OCR_ROOT / book_name
        if not args.force and any(out_dir.glob("p001-end_*_transcribed.txt")):
            print(f"SKIP {epub_path.name} (already extracted; use --force to redo)")
            continue
        try:
            text = extract(epub_path)
            if len(text) < 1000:
                raise ValueError(f"only {len(text)} characters extracted — not a text EPUB?")
        except (zipfile.BadZipFile, ValueError, ET.ParseError, KeyError) as exc:
            failed += 1
            print(f"FAIL {epub_path.name}: {exc}", file=sys.stderr)
            continue
        out_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_txt = out_dir / f"p001-end_{stamp}_transcribed.txt"
        out_txt.write_text(text + "\n", encoding="utf-8", newline="\n")
        provenance = {
            "method": "epub-text-extraction",
            "source": epub_path.name,
            "note": "Text taken from the EPUB's own XHTML, spine order; no OCR run. Footnote markers and running heads may survive as stray lines — review.",
            "reviewed": False,
        }
        (out_dir / f"p001-end_{stamp}_provenance.json").write_text(
            json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"OK   {out_txt.relative_to(REPO_ROOT)} ({len(text)} chars)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
