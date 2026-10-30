"""
Build a small zip of the Shrines and Welfare viewer for an outside reviewer (e.g. ChatGPT).

The brief that goes with it is docs/prompts/WELFARE_VIEWER_CRITIQUE_BRIEF.md (packed as BRIEF.md).
Screenshots are taken fresh from viewer/index.html by shots.cjs, so they always match the page.

Usage (from the repo root; needs node + playwright from the repo's node_modules):
  python pipeline/gis/viewer/review/make_package.py [--out pipeline/gis/viewer/review/welfare-viewer-review.zip]
"""
import argparse, os, re, subprocess, sys, tempfile, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
VIEWER = ROOT / "pipeline/gis/viewer"
FILES = {  # path in zip -> path in repo
    "BRIEF.md": "docs/prompts/WELFARE_VIEWER_CRITIQUE_BRIEF.md",
    "viewer/index.html": "pipeline/gis/viewer/index.html",
    "viewer/template.html": "pipeline/gis/viewer/template.html",
    "viewer/build_viewer.py": "pipeline/gis/viewer/build_viewer.py",
    "viewer/rebuild_from_embedded.py": "pipeline/gis/viewer/rebuild_from_embedded.py",
    "viewer/tests/test_conjecture.cjs": "pipeline/gis/viewer/tests/test_conjecture.cjs",
    "viewer/tests/check_conjecture_reference.py": "pipeline/gis/viewer/tests/check_conjecture_reference.py",
    "viewer/tests/test_review_fixes.cjs": "pipeline/gis/viewer/tests/test_review_fixes.cjs",
    "viewer/tests/calibrate_placebo.cjs": "pipeline/gis/viewer/tests/calibrate_placebo.cjs",
    "docs/VIEWER_REVIEW.md": "docs/research/VIEWER_REVIEW_2026-10-30.md",
    "docs/GIS_FOUNDATION.md": "docs/GIS_FOUNDATION.md",
    "docs/GIS_README.md": "pipeline/gis/README.md",
    "data/indicator_catalog.tsv": "pipeline/gis/atlas/indicator_catalog.tsv",
    "data/atlas_codebook.csv": "pipeline/gis/atlas/atlas_codebook.csv",
    "data/native_support.tsv": "pipeline/gis/atlas/native_support.tsv",
}
# Anything that must not leave the repository: keys and personal addresses in any file. The team-only
# columns are checked in the page's embedded data, decoded, since the scripts name them to exclude them.
FORBIDDEN = [re.compile(p) for p in (r"maptiler\.com/[^\"']*key=", r"[A-Za-z0-9._%+-]+@(college\.)?harvard\.edu")]
TEAM_ONLY = ("qa_note", "needs_review")


def embedded_data(html):
    sys.path.insert(0, str(VIEWER))
    from rebuild_from_embedded import extract  # noqa: E402
    return extract(html)[1].decode("utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(VIEWER / "review/welfare-viewer-review.zip"))
    a = ap.parse_args()

    missing = [p for p in FILES.values() if not (ROOT / p).is_file()]
    if missing:
        sys.exit("missing: " + ", ".join(missing))
    for z, p in FILES.items():
        if z == "BRIEF.md":
            continue
        text = (ROOT / p).read_text(encoding="utf-8", errors="replace")
        for rx in FORBIDDEN:
            if rx.search(text):
                sys.exit(f"refusing to package {p}: matches {rx.pattern}")
    data = embedded_data((VIEWER / "index.html").read_text(encoding="utf-8"))
    leaked = [c for c in TEAM_ONLY if f'"{c}"' in data]
    if leaked:
        sys.exit("refusing to package index.html: embedded data carries " + ", ".join(leaked))

    with tempfile.TemporaryDirectory() as shots:
        env = dict(os.environ, NODE_PATH=str(ROOT / "node_modules"))
        subprocess.run(["node", str(VIEWER / "review/shots.cjs"), str(VIEWER / "index.html"), shots],
                       check=True, env=env, cwd=ROOT)
        pngs = sorted(Path(shots).glob("*.png"))
        if len(pngs) < 9:
            sys.exit(f"expected 9 screenshots, got {len(pngs)}")
        out = Path(a.out)
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
            for z, p in FILES.items():
                zf.write(ROOT / p, z)
            for png in pngs:
                zf.write(png, "screenshots/" + png.name)
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB, {len(FILES) + len(pngs)} files)")


if __name__ == "__main__":
    main()
