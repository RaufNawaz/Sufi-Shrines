#!/usr/bin/env python3
"""
optimize_photos.py — re-encode raw field photos for the site, in place under public/.

    python3 optimize_photos.py <src_dir> <dest_dir>

Reproduces the convention established for the 31 July / 10 Aug photo batches:
long edge capped at 1600px, JPEG quality 82, baseline (non-progressive), EXIF/ICC
stripped after applying EXIF orientation, PNG (and anything else Pillow can open)
converted to JPEG. Source files are untouched; every output goes to <dest_dir>
with the same basename, extension forced to .jpg.
"""

import sys, os
from PIL import Image, ImageOps

LONG_EDGE = 1600
QUALITY = 82


def optimize_one(src, dest):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        w, h = im.size
        if max(w, h) > LONG_EDGE:
            scale = LONG_EDGE / max(w, h)
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=QUALITY, progressive=False, optimize=True)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src_dir, dest_dir = sys.argv[1], sys.argv[2]
    os.makedirs(dest_dir, exist_ok=True)
    done = 0
    for name in sorted(os.listdir(src_dir)):
        src = os.path.join(src_dir, name)
        if not os.path.isfile(src):
            continue
        base, _ = os.path.splitext(name)
        dest = os.path.join(dest_dir, base + ".jpg")
        try:
            optimize_one(src, dest)
            done += 1
        except Exception as e:
            print(f"SKIPPED {name}: {e}", file=sys.stderr)
    print(f"optimized {done} file(s) from {src_dir} -> {dest_dir}")


if __name__ == "__main__":
    main()
