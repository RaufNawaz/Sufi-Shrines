#!/usr/bin/env python3
"""
Batch OCR for Taufiq Rafat's bilingual Bulleh Shah book (and similar layouts).

Per-page routing (this book: Urdu original on EVEN PDF pages, English on ODD):
  URDU pages  -> --urdu-engine:
                   ollama  (default) : a local vision-LLM via Ollama. Reads
                                        Nastaliq / calligraphy far better than the
                                        CRNN, runs fully offline. Needs Ollama +
                                        `ollama pull qwen2.5vl:7b`.  (No torch needed.)
                   utrnet            : the bundled UTRNet CRNN (needs torch/ultralytics).
  ENGLISH pages -> Tesseract (lang=eng)                [brew install tesseract]

Examples
--------
# vision-LLM for Urdu (recommended) + Tesseract for English:
python batch_ocr.py --input book.pdf --output rafat_ocr --pages 54-231 --dpi 300 \
    --urdu-engine ollama --ollama-model qwen2.5vl:7b

# quick 3-poem trial:
python batch_ocr.py --input book.pdf --output rafat_test --pages 54-58 --dpi 300 \
    --urdu-engine ollama

# original CRNN engine:
python batch_ocr.py --input book.pdf --output rafat_ocr --pages 54-231 --conf 0.35 \
    --urdu-engine utrnet
"""
import os
import sys
import re
import io
import glob
import time
import base64
import argparse

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

URDU_PROMPT = (
    "You are an expert Urdu/Shahmukhi transcriptionist. Transcribe the poem in this "
    "image EXACTLY as written, line by line, in Urdu script (including the title line "
    "if present). Output ONLY the Urdu text, preserving the original line breaks. Do "
    "NOT translate, transliterate, add commentary, or add diacritics that are not "
    "there. Ignore page numbers, headers, and any 'Digitized by Google' watermark. If "
    "something is unclear, give your single best reading."
)


# ---------- page iteration ----------
def parse_pages(spec, total):
    if not spec:
        return list(range(total))
    out = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-")
            out += list(range(int(a) - 1, int(b)))
        elif part:
            out.append(int(part) - 1)
    return [i for i in out if 0 <= i < total]


def iter_pages(inp, dpi, pages):
    """yield (name, PIL.Image, pagenum_or_None)"""
    if os.path.isdir(inp):
        exts = ("*.png", "*.jpg", "*.jpeg", "*.tif", "*.tiff", "*.bmp")
        for f in sorted(x for e in exts for x in glob.glob(os.path.join(inp, e))):
            base = os.path.splitext(os.path.basename(f))[0]
            m = re.search(r"(\d+)$", base)
            yield base, Image.open(f).convert("RGB"), (int(m.group(1)) if m else None)
    elif inp.lower().endswith(".pdf"):
        try:
            import fitz  # PyMuPDF
        except ImportError:
            sys.exit("PDF input needs PyMuPDF:  pip install PyMuPDF")
        doc = fitz.open(inp)
        for i in parse_pages(pages, doc.page_count):
            pix = doc.load_page(i).get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72))
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            yield "p%04d" % (i + 1), img, (i + 1)
    else:
        base = os.path.splitext(os.path.basename(inp))[0]
        m = re.search(r"(\d+)$", base)
        yield base, Image.open(inp).convert("RGB"), (int(m.group(1)) if m else None)


def is_urdu_page(pagenum, parity):
    if parity == "all" or pagenum is None:
        return True
    return (pagenum % 2 == 0) if parity == "even" else (pagenum % 2 == 1)


# ---------- English engine: Tesseract ----------
def ocr_english(img, lang):
    import pytesseract
    text = pytesseract.image_to_string(img, lang=lang)
    return [ln for ln in text.splitlines() if ln.strip()]


# ---------- Urdu engine: Ollama vision-LLM ----------
def ocr_urdu_ollama(img, model, host="http://localhost:11434"):
    import requests
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    resp = requests.post(
        host.rstrip("/") + "/api/chat",
        json={
            "model": model,
            "messages": [{"role": "user", "content": URDU_PROMPT, "images": [b64]}],
            "stream": False,
            "options": {"temperature": 0},
        },
        timeout=600,
    )
    resp.raise_for_status()
    content = resp.json()["message"]["content"].strip()
    return [ln for ln in content.splitlines() if ln.strip()]


# ---------- Urdu engine: UTRNet (lazy; only if selected) ----------
class UTRNet:
    def __init__(self, device_arg, conf):
        os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
        import torch
        _orig = torch.load
        def _trusted(*a, **k):
            k.setdefault("weights_only", False)
            return _orig(*a, **k)
        torch.load = _trusted
        sys.path.insert(0, HERE)
        from read import text_recognizer_batch
        from model import Model
        from utils import CTCLabelConverter
        from ultralytics import YOLO

        self.torch = torch
        self.trb = text_recognizer_batch
        if device_arg and device_arg != "auto":
            device = torch.device(device_arg)
        elif torch.cuda.is_available():
            device = torch.device("cuda")
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            device = torch.device("cpu")
        self.device = device
        self.conf = conf
        with open(os.path.join(HERE, "UrduGlyphs.txt"), encoding="utf-8") as fh:
            content = "".join(line.strip("\n") for line in fh) + " "
        self.conv = CTCLabelConverter(content)
        self.rec = Model(num_class=len(self.conv.character), device=device).to(device)
        self.rec.load_state_dict(
            torch.load(os.path.join(HERE, "best_norm_ED.pth"), map_location=device))
        self.rec.eval()
        self.det = YOLO(os.path.join(HERE, "yolov8m_UrduDoc.pt"))

    def ocr(self, img):
        ydev = 0 if self.device.type == "cuda" else self.device.type
        with self.torch.inference_mode():
            res = self.det.predict(source=img, conf=self.conf, imgsz=1280, save=False,
                                   nms=True, device=ydev, verbose=False)
        boxes = res[0].boxes.xyxy.cpu().numpy().tolist()
        boxes.sort(key=lambda b: b[1])
        return self.trb([img.crop(b) for b in boxes], self.rec, self.conv, self.device)


def main():
    ap = argparse.ArgumentParser(description="Routed batch OCR (Urdu=vision-LLM/UTRNet, English=Tesseract).")
    ap.add_argument("--input", required=True, help="image, folder of images, or PDF")
    ap.add_argument("--output", default="ocr_out")
    ap.add_argument("--pages", default="", help="PDF pages, e.g. 54-231 or 1,3,5")
    ap.add_argument("--dpi", type=int, default=200, help="render DPI for PDF input")
    ap.add_argument("--urdu-parity", default="even", choices=["even", "odd", "all"],
                    help="which PDF page parity holds the Urdu original (this book: even)")
    ap.add_argument("--urdu-engine", default="ollama", choices=["ollama", "utrnet"],
                    help="engine for the Urdu pages (default: ollama vision-LLM)")
    ap.add_argument("--ollama-model", default="qwen2.5vl:7b", help="Ollama vision model tag")
    ap.add_argument("--ollama-host", default="http://localhost:11434")
    ap.add_argument("--english-engine", default="tesseract", choices=["tesseract", "none"])
    ap.add_argument("--english-lang", default="eng")
    ap.add_argument("--device", default="auto", help="(UTRNet only) auto|cpu|mps|cuda")
    ap.add_argument("--conf", type=float, default=0.2, help="(UTRNet only) YOLO confidence")
    ap.add_argument("--throttle", type=float, default=0.0, help="seconds to pause between pages")
    ap.add_argument("--limit", type=int, default=0, help="stop after N pages (0 = all)")
    args = ap.parse_args()

    utr = None
    if args.urdu_engine == "utrnet":
        utr = UTRNet(args.device, args.conf)
        print("Urdu engine: UTRNet on", utr.device)
    else:
        print("Urdu engine: Ollama vision-LLM (%s)" % args.ollama_model)
    print("English engine:", args.english_engine)

    os.makedirs(args.output, exist_ok=True)
    combined = []
    count = 0
    for name, img, pagenum in iter_pages(args.input, args.dpi, args.pages):
        if is_urdu_page(pagenum, args.urdu_parity):
            lines = ocr_urdu_ollama(img, args.ollama_model, args.ollama_host) \
                if args.urdu_engine == "ollama" else utr.ocr(img)
            tag = "urdu"
        elif args.english_engine == "tesseract":
            lines = ocr_english(img, args.english_lang)
            tag = "eng"
        else:
            lines, tag = [], "skip"
        text = "\n".join(lines)
        with open(os.path.join(args.output, name + ".txt"), "w", encoding="utf-8") as fh:
            fh.write(text)
        combined.append("==== %s [%s] ====\n%s" % (name, tag, text))
        print("%s [%s]: %d lines" % (name, tag, len(lines)))
        count += 1
        if args.throttle > 0:
            time.sleep(args.throttle)
        if args.limit and count >= args.limit:
            break

    with open(os.path.join(args.output, "_combined.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n\n".join(combined))
    print("Done. %d page(s) -> %s" % (count, args.output))


if __name__ == "__main__":
    main()
