#!/usr/bin/env python3
"""
eval/ocr/run_cer.py — compute CER and WER for OCR output against gold samples.

CER (Character Error Rate) = Levenshtein(hypothesis, reference) / len(reference)
WER (Word Error Rate)       = word-level Levenshtein / len(reference_words)

Both are lower-is-better.  A perfect transcript scores 0.0; the raw OCR
baseline and the post-corrected output are compared against the same gold text
to measure whether post-correction helps.

Usage
-----
  # Score a single file pair:
  py -3 eval\\ocr\\run_cer.py \
      --gold eval\\ocr\\samples\\example\\p001_gold.txt \
      --hyp  out\\ocr\\AFADA-E-KABIR\\p001_transcribed.txt

  # Score corrected vs raw for the same gold:
  py -3 eval\\ocr\\run_cer.py \
      --gold eval\\ocr\\samples\\example\\p001_gold.txt \
      --hyp  out\\ocr\\AFADA-E-KABIR\\p001_transcribed.txt \
      --corrected out\\ocr_corrected\\AFADA-E-KABIR\\p001_corrected.txt

  # Batch: score all sample pairs found under eval/ocr/samples/:
  py -3 eval\\ocr\\run_cer.py --batch eval\\ocr\\samples\\

Output is written to eval/ocr/REPORT.md when --report is set.
"""

import argparse
import io
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


# ── Edit distance (pure stdlib) ───────────────────────────────────────────────

def levenshtein(a: list, b: list) -> int:
    """Compute the Levenshtein edit distance between two sequences."""
    if not a:
        return len(b)
    if not b:
        return len(a)
    # Use two-row DP to keep memory O(min(|a|, |b|)).
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for ch_a in a:
        curr = [prev[0] + 1]
        for j, ch_b in enumerate(b):
            curr.append(min(
                curr[j] + 1,           # insertion
                prev[j + 1] + 1,       # deletion
                prev[j] + (ch_a != ch_b),  # substitution
            ))
        prev = curr
    return prev[-1]


def cer(hypothesis: str, reference: str) -> float:
    """Character Error Rate, normalised by reference length."""
    ref = list(reference)
    hyp = list(hypothesis)
    if not ref:
        return 0.0 if not hyp else float("inf")
    return levenshtein(hyp, ref) / len(ref)


def wer(hypothesis: str, reference: str) -> float:
    """Word Error Rate, normalised by reference word count."""
    ref = reference.split()
    hyp = hypothesis.split()
    if not ref:
        return 0.0 if not hyp else float("inf")
    return levenshtein(hyp, ref) / len(ref)


# ── Normalisation ─────────────────────────────────────────────────────────────

def normalise(text: str) -> str:
    """Strip whitespace and collapse internal runs for fair comparison."""
    return " ".join(text.split())


# ── Scoring ───────────────────────────────────────────────────────────────────

def score_pair(
    gold_path: Path,
    hyp_path: Path,
    corrected_path: Path | None = None,
) -> dict:
    gold = normalise(gold_path.read_text(encoding="utf-8"))
    hyp = normalise(hyp_path.read_text(encoding="utf-8"))

    raw_cer = cer(hyp, gold)
    raw_wer = wer(hyp, gold)

    result: dict = {
        "gold": str(gold_path),
        "hypothesis": str(hyp_path),
        "raw_cer": round(raw_cer, 4),
        "raw_wer": round(raw_wer, 4),
    }

    if corrected_path and corrected_path.exists():
        corr = normalise(corrected_path.read_text(encoding="utf-8"))
        corr_cer = cer(corr, gold)
        corr_wer = wer(corr, gold)
        result["corrected"] = str(corrected_path)
        result["corrected_cer"] = round(corr_cer, 4)
        result["corrected_wer"] = round(corr_wer, 4)
        result["cer_delta"] = round(corr_cer - raw_cer, 4)
        result["wer_delta"] = round(corr_wer - raw_wer, 4)

    return result


# ── Batch mode ────────────────────────────────────────────────────────────────

def run_batch(samples_dir: Path) -> list[dict]:
    """
    Discover gold/*_gold.txt files and look for matching hypothesis/corrected
    files based on naming convention:
      gold:      eval/ocr/samples/<set>/<name>_gold.txt
      raw OCR:   out/ocr/<set>/<name>_transcribed.txt
      corrected: out/ocr_corrected/<set>/<name>_corrected.txt
    """
    results = []
    for gold_path in sorted(samples_dir.rglob("*_gold.txt")):
        stem = gold_path.stem.replace("_gold", "")
        set_name = gold_path.parent.name
        hyp = Path("out/ocr") / set_name / f"{stem}_transcribed.txt"
        corrected = Path("out/ocr_corrected") / set_name / f"{stem}_corrected.txt"

        if not hyp.exists():
            print(f"  Skip {gold_path.name}: no matching transcription at {hyp}")
            continue

        r = score_pair(gold_path, hyp, corrected if corrected.exists() else None)
        results.append(r)
    return results


# ── Report generation ─────────────────────────────────────────────────────────

def _pct(v: float) -> str:
    return f"{v * 100:.1f}%"


def build_report(results: list[dict]) -> str:
    lines = [
        "# OCR Evaluation Report",
        "",
        "Lower CER/WER is better. Delta = corrected − raw (negative = improvement).",
        "",
        "| Gold sample | Raw CER | Raw WER | Corr. CER | Corr. WER | ΔCER |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        name = Path(r["gold"]).name
        raw_cer = _pct(r["raw_cer"])
        raw_wer = _pct(r["raw_wer"])
        if "corrected_cer" in r:
            corr_cer = _pct(r["corrected_cer"])
            corr_wer = _pct(r["corrected_wer"])
            delta = _pct(r["cer_delta"])
        else:
            corr_cer = corr_wer = delta = "—"
        lines.append(f"| {name} | {raw_cer} | {raw_wer} | {corr_cer} | {corr_wer} | {delta} |")

    if results:
        avg_raw_cer = sum(r["raw_cer"] for r in results) / len(results)
        lines += [
            "",
            f"**Samples evaluated:** {len(results)}",
            f"**Mean raw CER:** {_pct(avg_raw_cer)}",
        ]
        if any("corrected_cer" in r for r in results):
            corr_results = [r for r in results if "corrected_cer" in r]
            avg_corr_cer = sum(r["corrected_cer"] for r in corr_results) / len(corr_results)
            avg_delta = sum(r["cer_delta"] for r in corr_results) / len(corr_results)
            lines += [
                f"**Mean corrected CER:** {_pct(avg_corr_cer)}",
                f"**Mean ΔCER:** {_pct(avg_delta)}",
            ]

    lines.append("")
    return "\n".join(lines)


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="run_cer.py",
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--gold", metavar="PATH", help="Gold reference text file.")
    mode.add_argument(
        "--batch",
        metavar="DIR",
        help=(
            "Directory to search recursively for *_gold.txt files. "
            "Matches hypothesis files automatically by naming convention."
        ),
    )
    p.add_argument("--hyp", metavar="PATH", help="Hypothesis (raw OCR) file. Required with --gold.")
    p.add_argument(
        "--corrected",
        metavar="PATH",
        help="Post-corrected file. Optional; compared against the same gold.",
    )
    p.add_argument(
        "--report",
        metavar="PATH",
        default="",
        help="Write a Markdown report to this path (e.g. eval/ocr/REPORT.md).",
    )
    p.add_argument(
        "--json-out",
        metavar="PATH",
        default="",
        help="Write raw results as JSON to this path.",
    )
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    if args.gold:
        if not args.hyp:
            print("--hyp is required when using --gold", file=sys.stderr)
            return 1
        results = [
            score_pair(
                Path(args.gold),
                Path(args.hyp),
                Path(args.corrected) if args.corrected else None,
            )
        ]
    else:
        batch_dir = Path(args.batch).expanduser().resolve()
        results = run_batch(batch_dir)
        if not results:
            print("No matching sample pairs found.", file=sys.stderr)
            return 1

    for r in results:
        print(f"\n{Path(r['gold']).name}")
        print(f"  Raw CER : {_pct(r['raw_cer'])}   WER: {_pct(r['raw_wer'])}")
        if "corrected_cer" in r:
            print(
                f"  Corr CER: {_pct(r['corrected_cer'])}   WER: {_pct(r['corrected_wer'])}   "
                f"ΔCER: {_pct(r['cer_delta'])}"
            )

    report_md = build_report(results)

    if args.report:
        Path(args.report).write_text(report_md, encoding="utf-8", newline="\n")
        print(f"\nWrote report: {args.report}")
    else:
        print("\n" + report_md)

    if args.json_out:
        Path(args.json_out).write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding="utf-8",
            newline="\n",
        )
        print(f"Wrote JSON: {args.json_out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
