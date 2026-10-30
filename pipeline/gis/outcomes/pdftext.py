"""
pdftotext -layout, as the PDF-table builders in this folder were written against it: poppler's, UTF-8.

The parsers (NNS, MICS, World Bank poverty map, UNDP HDI) read fixed-width columns out of the layout
text, so they depend on the exact layout engine. Two programs are called pdftotext: poppler's (Homebrew
on the Mac; the parsers were built and checked against it) and xpdf's (shipped with Git for Windows,
first on its PATH). xpdf lays out multi-word district names differently, and on 30 October 2026 the
NNS parser placed 144 of 156 districts with it and failed ten checks. So this refuses anything but
poppler, and asks for UTF-8 explicitly (xpdf's default is Latin-1).

On Windows, put poppler's Library/bin first on PATH, or name it in PDFTOTEXT.
"""
import os, subprocess, sys

EXE = os.environ.get("PDFTOTEXT", "pdftotext")


def pdftotext(pdf, out):
    try:
        v = subprocess.run([EXE, "-v"], capture_output=True, text=True)
    except FileNotFoundError:
        sys.exit(f"{EXE} not found: install poppler (brew install poppler) or set PDFTOTEXT")
    banner = (v.stdout + v.stderr).strip()
    if "poppler" not in banner.lower():
        sys.exit(f"{EXE} is not poppler's pdftotext ({banner.splitlines()[0] if banner else 'no version'}); "
                 "the table parsers need poppler's layout. Set PDFTOTEXT to poppler's pdftotext.")
    subprocess.run([EXE, "-layout", "-enc", "UTF-8", str(pdf), str(out)], check=True)
