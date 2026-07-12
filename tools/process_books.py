from __future__ import annotations

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from pathlib import Path

# Shared helpers live in _lib (sibling module — importable without sys.path
# tweaks when invoked as `python3 tools/process_books.py`).
from _lib import (
    DEFAULT_LIBRETRANSLATE_URL,
    REPO_ROOT,
    USER_AGENT,
    PipelineError,
    StringValue,
    clean_text,
    libre_translate_chunk,
    load_csv_url,
    normalize_translate_endpoint,
    safe_filename_part,
    split_text,
    utf8_stdio,
)

utf8_stdio()

DEFAULT_UTRNET_URL = "abdur75648/UrduOCR-UTRNet"
DEFAULT_SHEET_CELL_CHARS = 45000
DEFAULT_TRANSLATION_CHARS = 4500
KEY_FIELDS = ["Name", "Location", "Latitude", "Longitude", "Category"]


def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, remainder = divmod(seconds, 60)
    return f"{int(minutes)}m {remainder:.1f}s"


def is_blank(value: object) -> bool:
    return not StringValue(value).strip()


def fetch_csv_rows(csv_url: str, timeout: int) -> list[dict[str, str]]:
    request = urllib.request.Request(csv_url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        data = response.read().decode("utf-8-sig")

    reader = csv.DictReader(data.splitlines())
    rows: list[dict[str, str]] = []
    for row in reader:
        cleaned = {
            StringValue(key).strip(): StringValue(value).strip()
            for key, value in (row or {}).items()
            if StringValue(key).strip()
        }
        rows.append(cleaned)
    return rows


def build_row_key(row: dict[str, str]) -> str:
    return "||".join(StringValue(row.get(field, "")).strip() for field in KEY_FIELDS)


def chunk_key_sort(base_column: str, key: str) -> tuple[int, str]:
    if key.lower() == base_column.lower():
        return (1, key.lower())

    match = re.match(
        rf"^{re.escape(base_column)}\s+(\d+)$",
        key,
        flags=re.IGNORECASE,
    )
    if match:
        return (int(match.group(1)), key.lower())

    return (10**9, key.lower())


def chunked_column_keys(row: dict[str, str], base_column: str) -> list[str]:
    pattern = re.compile(
        rf"^{re.escape(base_column)}(?:\s+\d+)?$",
        flags=re.IGNORECASE,
    )
    return sorted(
        [key for key in row.keys() if pattern.match(key)],
        key=lambda key: chunk_key_sort(base_column, key),
    )


def collect_chunked_column(row: dict[str, str], base_column: str) -> str:
    parts = [
        StringValue(row.get(key, "")).strip()
        for key in chunked_column_keys(row, base_column)
    ]
    return clean_text("\n\n".join(part for part in parts if part))


def apply_chunked_column(
    row: dict[str, str],
    base_column: str,
    text: str,
    max_cell_chars: int,
) -> list[str]:
    for key in chunked_column_keys(row, base_column):
        row[key] = ""

    chunks = split_text(text, max_cell_chars)
    for index, chunk in enumerate(chunks, start=1):
        key = base_column if index == 1 else f"{base_column} {index}"
        row[key] = chunk
    return [base_column if index == 1 else f"{base_column} {index}" for index in range(1, len(chunks) + 1)]


def translate_text(
    text: str,
    endpoint: str,
    source: str,
    target: str,
    api_key: str,
    timeout: int,
    retries: int,
    chunk_chars: int,
    delay_seconds: float,
) -> str:
    chunks = split_text(text, chunk_chars)
    translated_chunks: list[str] = []
    translation_started_at = time.perf_counter()

    for index, chunk in enumerate(chunks, start=1):
        chunk_started_at = time.perf_counter()
        print(f"    translating chunk {index}/{len(chunks)} ({len(chunk)} chars)")
        translated_chunks.append(
            libre_translate_chunk(
                chunk,
                endpoint,
                source,
                target,
                api_key,
                timeout,
                retries,
            )
        )
        elapsed = time.perf_counter() - chunk_started_at
        print(f"    translation chunk {index}/{len(chunks)} finished in {format_duration(elapsed)}")
        if delay_seconds > 0 and index < len(chunks):
            time.sleep(delay_seconds)

    total_elapsed = time.perf_counter() - translation_started_at
    print(f"    translation finished in {format_duration(total_elapsed)}")
    return clean_text("\n\n".join(translated_chunks))


def resolve_executable(command: str, label: str) -> str:
    value = StringValue(command).strip()
    if not value:
        raise PipelineError(f"Missing {label} command.")

    path = Path(value)
    if path.exists():
        return str(path)

    found = shutil.which(value)
    if found:
        return found

    raise PipelineError(
        f"Could not find {label} command '{value}'. Install it or pass --{label}."
    )


def run_command(command: list[str], label: str, timeout: int) -> str:
    try:
        completed = subprocess.run(
            command,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise PipelineError(f"{label} command was not found: {command[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise PipelineError(f"{label} timed out after {timeout} seconds.") from exc

    if completed.returncode != 0:
        raise PipelineError(
            f"{label} failed with exit code {completed.returncode}:\n"
            f"{completed.stderr.strip()}"
        )

    return completed.stdout


def page_sort_key(path: Path) -> tuple[int, str]:
    match = re.search(r"-(\d+)\.png$", path.name, flags=re.IGNORECASE)
    return (int(match.group(1)) if match else 10**9, path.name)


def render_pdf_pages(
    pdf_path: Path,
    output_dir: Path,
    pdftoppm: str,
    dpi: int,
    first_page: int,
    max_pages: int,
    timeout: int,
) -> list[Path]:
    output_prefix = output_dir / "page"
    command = [pdftoppm, "-r", str(dpi), "-png"]
    if first_page > 1:
        command.extend(["-f", str(first_page)])
    if max_pages > 0:
        command.extend(["-l", str(first_page + max_pages - 1)])
    command.extend([str(pdf_path), str(output_prefix)])

    started_at = time.perf_counter()
    # Rendering a whole 500+ page book legitimately takes far longer than the
    # per-command timeout meant for page-level OCR calls — floor it at 2 hours.
    run_command(command, "pdftoppm", max(timeout, 7200))
    pages = sorted(output_dir.glob("page-*.png"), key=page_sort_key)
    if not pages:
        raise PipelineError("PDF rendering produced no page images.")
    elapsed = time.perf_counter() - started_at
    print(f"    rendered {len(pages)} page image(s) in {format_duration(elapsed)}")
    return pages


def find_spread_seam(image) -> int | None:
    """Return the gutter column of a two-page-spread image, or None.

    A page image is treated as a spread when it is clearly landscape. The
    gutter is located as the darkest column band (fold shadow) within the
    central 30% of the width; when no distinct shadow exists, fall back to
    the middle.
    """
    width, height = image.size
    if width <= height * 1.15:
        return None

    gray = image.convert("L")
    band_left = int(width * 0.35)
    band_right = int(width * 0.65)
    band = gray.crop((band_left, 0, band_right, height)).resize((band_right - band_left, 64))
    pixels = list(band.getdata())
    cols = band_right - band_left
    col_means = [sum(pixels[col::cols]) / 64.0 for col in range(cols)]
    darkest = min(range(cols), key=lambda col: col_means[col])
    median = sorted(col_means)[cols // 2]
    if median - col_means[darkest] < 12:
        return width // 2
    return band_left + darkest


def split_spread_pages(pages: list[Path]) -> list[Path]:
    """Split spread images into right/left halves (right first — RTL books)."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise PipelineError(
            "--split-spreads requires Pillow. Install it with: py -3 -m pip install pillow"
        ) from exc

    result: list[Path] = []
    for page in pages:
        with Image.open(page) as image:
            seam = find_spread_seam(image)
            if seam is None:
                result.append(page)
                continue
            width, height = image.size
            right_path = page.with_name(page.stem + "-right.png")
            left_path = page.with_name(page.stem + "-left.png")
            image.crop((seam, 0, width, height)).save(right_path)
            image.crop((0, 0, seam, height)).save(left_path)
        result.extend([right_path, left_path])
    return result


def extract_text_from_gradio_result(result: object) -> str:
    if isinstance(result, str):
        return clean_text(result)

    if isinstance(result, dict):
        for key in ("text", "value", "data", "output"):
            value = result.get(key)
            text = extract_text_from_gradio_result(value)
            if text:
                return text
        return ""

    if isinstance(result, (list, tuple)):
        for value in reversed(result):
            text = extract_text_from_gradio_result(value)
            if text:
                return text

    return ""


def utrnet_ocr_image(image_path: Path, args: argparse.Namespace) -> str:
    try:
        from gradio_client import Client
    except ImportError as exc:
        raise PipelineError(
            "UTRNet OCR requires the gradio_client package. Install it with:\n"
            "py -3 -m pip install gradio_client"
        ) from exc

    try:
        from gradio_client import handle_file
    except ImportError:
        handle_file = lambda value: value

    client = getattr(args, "_utrnet_client", None)
    if client is None:
        client = Client(args.utrnet_url)
        setattr(args, "_utrnet_client", client)

    image_input = handle_file(str(image_path))
    last_error: Exception | None = None

    for api_name in ("/predict", None):
        try:
            if api_name:
                result = client.predict(image_input, api_name=api_name)
            else:
                result = client.predict(image_input)
        except Exception as exc:
            last_error = exc
            continue
        # A successful prediction with no text is a blank/imageless page,
        # not an error — the caller logs a per-page warning and moves on.
        return extract_text_from_gradio_result(result)

    raise PipelineError(f"UTRNet OCR failed for {image_path}: {last_error}")


def tesseract_ocr_image(
    image_path: Path,
    tesseract: str,
    tessdata_dir: str,
    ocr_lang: str,
    psm: str,
    command_timeout: int,
) -> str:
    tesseract_command = [tesseract, str(image_path), "stdout"]
    if StringValue(tessdata_dir).strip():
        tesseract_command.extend(["--tessdata-dir", StringValue(tessdata_dir).strip()])
    tesseract_command.extend(["-l", ocr_lang, "--psm", psm])
    return run_command(
        tesseract_command,
        "tesseract",
        command_timeout,
    )


def ocr_pdf(
    pdf_path: Path,
    work_dir: Path,
    pdftoppm: str,
    tesseract: str | None,
    args: argparse.Namespace,
    dpi: int,
    first_page: int,
    max_pages: int,
    command_timeout: int,
) -> str:
    pages_dir = work_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    pages = render_pdf_pages(
        pdf_path,
        pages_dir,
        pdftoppm,
        dpi,
        first_page,
        max_pages,
        command_timeout,
    )

    if getattr(args, "split_spreads", False):
        split_count = len(pages)
        pages = split_spread_pages(pages)
        print(f"    split spreads: {split_count} render(s) -> {len(pages)} page image(s)")

    page_texts: list[str] = []
    ocr_started_at = time.perf_counter()
    for index, page_path in enumerate(pages, start=1):
        page_started_at = time.perf_counter()
        print(f"    OCR page {index}/{len(pages)} with {args.ocr_engine}")
        if args.ocr_engine == "utrnet":
            text = utrnet_ocr_image(page_path, args)
        elif args.ocr_engine == "tesseract":
            if not tesseract:
                raise PipelineError("Tesseract OCR engine requested but tesseract was not configured.")
            text = tesseract_ocr_image(
                page_path,
                tesseract,
                args.tessdata_dir,
                args.ocr_lang,
                args.psm,
                command_timeout,
            )
        else:
            raise PipelineError(f"Unsupported OCR engine: {args.ocr_engine}")
        cleaned = clean_text(text)
        if cleaned:
            page_texts.append(cleaned)
        else:
            print(f"    WARNING: page {first_page + index - 1} produced no text")
        elapsed = time.perf_counter() - page_started_at
        print(f"    OCR page {index}/{len(pages)} finished in {format_duration(elapsed)}")

    total_elapsed = time.perf_counter() - ocr_started_at
    print(f"    OCR finished in {format_duration(total_elapsed)}")
    return clean_text("\n\n".join(page_texts))


def extract_drive_file_id(url: str) -> str:
    value = StringValue(url).strip()
    if re.fullmatch(r"[-\w]{20,}", value):
        return value

    parsed = urllib.parse.urlparse(value)
    query = urllib.parse.parse_qs(parsed.query)
    if query.get("id"):
        return query["id"][0]

    match = re.search(r"/file/d/([-\w]+)", parsed.path)
    if match:
        return match.group(1)

    match = re.search(r"/d/([-\w]+)", parsed.path)
    if match:
        return match.group(1)

    return ""


def extract_drive_resource_key(url: str) -> str:
    parsed = urllib.parse.urlparse(StringValue(url).strip())
    query = urllib.parse.parse_qs(parsed.query)
    return query.get("resourcekey", [""])[0]


def build_drive_download_url(file_id: str, resource_key: str = "", confirm: str = "") -> str:
    params = {
        "export": "download",
        "id": file_id,
    }
    if resource_key:
        params["resourcekey"] = resource_key
    if confirm:
        params["confirm"] = confirm

    return "https://drive.google.com/uc?" + urllib.parse.urlencode(params)


def confirm_token_from_html(html: str, cookie_jar: CookieJar) -> str:
    for cookie in cookie_jar:
        if cookie.name.startswith("download_warning"):
            return cookie.value

    patterns = [
        r"confirm=([0-9A-Za-z_\-]+)&",
        r'name="confirm"\s+value="([^"]+)"',
        r"confirm=([^&\"']+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return urllib.parse.unquote(match.group(1).replace("&amp;", "&"))

    return ""


def save_response_to_file(response, output_path: Path) -> None:
    with output_path.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)


def assert_pdf_file(path: Path) -> None:
    with path.open("rb") as file:
        header = file.read(5)
    if header != b"%PDF-":
        raise PipelineError(
            "Downloaded file is not a PDF. Check that the Book link is a direct PDF "
            "or a shared Google Drive PDF."
        )


def download_direct_url(url: str, output_path: Path, timeout: int) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content_type = StringValue(response.headers.get("Content-Type", "")).lower()
        if "text/html" in content_type:
            raise PipelineError(
                "The Book link returned an HTML page, not a PDF. Use a shared Google "
                "Drive file link or a direct PDF URL."
            )
        save_response_to_file(response, output_path)
    assert_pdf_file(output_path)


def download_google_drive_pdf(book_url: str, output_path: Path, timeout: int) -> None:
    file_id = extract_drive_file_id(book_url)
    resource_key = extract_drive_resource_key(book_url)
    if not file_id:
        raise PipelineError("Could not find a Google Drive file id in the Book link.")

    cookie_jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
    opener.addheaders = [("User-Agent", USER_AGENT)]

    first_url = build_drive_download_url(file_id, resource_key)
    with opener.open(first_url, timeout=timeout) as response:
        content_type = StringValue(response.headers.get("Content-Type", "")).lower()
        if "text/html" not in content_type:
            save_response_to_file(response, output_path)
            assert_pdf_file(output_path)
            return

        html = response.read().decode("utf-8", errors="replace")

    confirm = confirm_token_from_html(html, cookie_jar)
    if not confirm:
        raise PipelineError(
            "Google Drive did not return a downloadable PDF. Make sure the file is "
            "shared as 'Anyone with the link can view'."
        )

    confirm_url = build_drive_download_url(file_id, resource_key, confirm)
    with opener.open(confirm_url, timeout=timeout) as response:
        save_response_to_file(response, output_path)
    assert_pdf_file(output_path)


def download_book_pdf(book_url: str, output_path: Path, timeout: int) -> None:
    value = StringValue(book_url).strip()
    if not value:
        raise PipelineError("Missing Book link.")

    if "drive.google.com" in value or re.fullmatch(r"[-\w]{20,}", value):
        download_google_drive_pdf(value, output_path, timeout)
        return

    if value.startswith("www."):
        value = f"https://{value}"
    download_direct_url(value, output_path, timeout)


def save_row_to_apps_script(
    endpoint_url: str,
    api_key: str,
    sheet_name: str,
    original_row: dict[str, str],
    updated_row: dict[str, str],
    row_index: int,
    timeout: int,
) -> dict:
    if not endpoint_url:
        raise PipelineError("Missing Apps Script URL. Pass --apps-script-url or set SHRINES_APPS_SCRIPT_URL.")

    payload = {
        "action": "save_shrine",
        "apiKey": api_key,
        "sheetName": sheet_name,
        "rowKey": build_row_key(original_row),
        "rowIndex": row_index,
        "originalRow": original_row,
        "updatedRow": updated_row,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    request = urllib.request.Request(
        endpoint_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "text/plain;charset=utf-8",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise PipelineError(f"Apps Script HTTP {exc.code}: {body[:500]}") from exc
    except urllib.error.URLError as exc:
        raise PipelineError(f"Could not reach Apps Script endpoint: {exc}") from exc

    try:
        parsed = json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise PipelineError(f"Apps Script returned invalid JSON: {raw[:500]}") from exc

    if parsed.get("ok") is False:
        raise PipelineError(StringValue(parsed.get("error", "Apps Script save failed.")))

    return parsed


def process_row(
    row: dict[str, str],
    row_index: int,
    args: argparse.Namespace,
    pdftoppm: str,
    tesseract: str,
) -> bool:
    book_url = StringValue(row.get(args.book_column, "")).strip()
    if not book_url:
        return False

    existing_transcribed = collect_chunked_column(row, args.transcribed_column)
    existing_translated = collect_chunked_column(row, args.translated_column)
    needs_ocr = args.force or not existing_transcribed
    needs_translation = args.translate and (args.force or not existing_translated)

    if not needs_ocr and not needs_translation:
        return False

    name = StringValue(row.get("Name", f"row {row_index + 2}")).strip() or f"row {row_index + 2}"
    print(f"Processing sheet row {row_index + 2}: {name}")

    updated_row = dict(row)
    transcribed_text = existing_transcribed

    temp_dir_context = None
    if args.keep_workdir:
        work_dir = Path(tempfile.mkdtemp(prefix="shrine-book-"))
    else:
        temp_dir_context = tempfile.TemporaryDirectory(prefix="shrine-book-")
        work_dir = Path(temp_dir_context.name)

    try:
        pdf_path = work_dir / "book.pdf"

        if needs_ocr:
            print("  downloading PDF")
            download_book_pdf(book_url, pdf_path, args.timeout)
            print("  running Urdu OCR")
            transcribed_text = ocr_pdf(
                pdf_path,
                work_dir,
                pdftoppm,
                tesseract,
                args,
                args.dpi,
                args.first_page,
                args.max_pages,
                args.command_timeout,
            )
            if not transcribed_text:
                raise PipelineError("OCR produced no text.")

            written = apply_chunked_column(
                updated_row,
                args.transcribed_column,
                transcribed_text,
                args.sheet_cell_chars,
            )
            print(f"  OCR text: {len(transcribed_text)} chars into {len(written)} column(s)")

            if args.save_ocr_first and needs_translation and not args.dry_run:
                save_row_to_apps_script(
                    args.apps_script_url,
                    args.api_key,
                    args.sheet_name,
                    row,
                    updated_row,
                    row_index,
                    args.timeout,
                )
                print("  saved OCR text before translation")

        if needs_translation:
            if not transcribed_text:
                raise PipelineError(
                    f"Cannot translate because {args.transcribed_column} is empty."
                )

            print("  translating Urdu OCR to English")
            translated_text = translate_text(
                transcribed_text,
                args.libre_url,
                args.translation_source,
                args.translation_target,
                args.libre_api_key,
                args.timeout,
                args.retries,
                args.translation_chars,
                args.translation_delay,
            )
            written = apply_chunked_column(
                updated_row,
                args.translated_column,
                translated_text,
                args.sheet_cell_chars,
            )
            print(f"  translated text: {len(translated_text)} chars into {len(written)} column(s)")

        if args.dry_run:
            print("  dry run: not saving to Google Sheet")
        else:
            result = save_row_to_apps_script(
                args.apps_script_url,
                args.api_key,
                args.sheet_name,
                row,
                updated_row,
                row_index,
                args.timeout,
            )
            print(f"  saved row {result.get('rowNumber', row_index + 2)}")

        return True
    finally:
        if args.keep_workdir:
            print(f"  kept work directory: {work_dir}")
        elif temp_dir_context is not None:
            temp_dir_context.cleanup()


def copy_local_pdf(source_path: Path, output_path: Path) -> None:
    if not source_path.exists():
        raise PipelineError(f"Test PDF does not exist: {source_path}")
    if not source_path.is_file():
        raise PipelineError(f"Test PDF path is not a file: {source_path}")

    shutil.copyfile(source_path, output_path)
    assert_pdf_file(output_path)


def get_test_book_name(args: argparse.Namespace) -> str:
    if args.test_pdf:
        return safe_filename_part(Path(args.test_pdf).stem)

    url = StringValue(args.test_book_url).strip()
    file_id = extract_drive_file_id(url)
    if file_id:
        return safe_filename_part(file_id)

    parsed = urllib.parse.urlparse(url)
    path_name = Path(urllib.parse.unquote(parsed.path)).stem
    return safe_filename_part(path_name)


def get_page_range_label(first_page: int, max_pages: int) -> str:
    if max_pages <= 0:
        return f"p{first_page:03d}-end"
    last_page = first_page + max_pages - 1
    return f"p{first_page:03d}-p{last_page:03d}"


def build_standalone_output_paths(
    args: argparse.Namespace,
    output_dir: Path,
) -> tuple[Path, Path]:
    book_name = get_test_book_name(args)
    page_range = get_page_range_label(args.first_page, args.max_pages)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename_base = f"{page_range}_{timestamp}"
    book_dir = output_dir / book_name
    return (
        book_dir / f"{filename_base}_transcribed.txt",
        book_dir / f"{filename_base}_translated.txt",
    )


def process_standalone_test(
    args: argparse.Namespace,
    pdftoppm: str,
    tesseract: str | None,
) -> None:
    output_dir = Path(args.test_output_dir).expanduser().resolve()
    transcribed_path, translated_path = build_standalone_output_paths(args, output_dir)
    transcribed_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="shrine-book-test-") as temp_dir:
        work_dir = Path(temp_dir)
        pdf_path = work_dir / "book.pdf"

        if args.test_pdf:
            source_path = Path(args.test_pdf).expanduser().resolve()
            print(f"Using local PDF: {source_path}")
            copy_local_pdf(source_path, pdf_path)
        else:
            print("Downloading PDF")
            download_book_pdf(args.test_book_url, pdf_path, args.timeout)

        print("Running Urdu OCR")
        transcribed_text = ocr_pdf(
            pdf_path,
            work_dir,
            pdftoppm,
            tesseract,
            args,
            args.dpi,
            args.first_page,
            args.max_pages,
            args.command_timeout,
        )
        if not transcribed_text:
            raise PipelineError("OCR produced no text.")

        transcribed_path.write_text(transcribed_text, encoding="utf-8", newline="\n")
        print(f"Wrote OCR text: {transcribed_path}")

        if not args.translate:
            print("Translation skipped. Pass --translate to also produce an English draft.")
            return

        print("Translating Urdu OCR to English (draft — requires human review before publication)")
        translated_text = translate_text(
            transcribed_text,
            args.libre_url,
            args.translation_source,
            args.translation_target,
            args.libre_api_key,
            args.timeout,
            args.retries,
            args.translation_chars,
            args.translation_delay,
        )

        translated_path.write_text(translated_text, encoding="utf-8", newline="\n")
        print(f"Wrote translation draft: {translated_path}")
        print("  Note: machine translation requires human review before publication.")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "OCR Urdu book PDFs with UTRNet and write the transcribed text to local "
            "files under out/ocr/.  Translation (LibreTranslate) and Google Sheet "
            "write-back are both OFF by default; enable them with --translate and "
            "--write-sheet respectively."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  # OCR a local PDF (default — no Sheet, no translation):\n"
            "  py -3 tools/process_books.py --test-pdf BOOK.pdf\n\n"
            "  # OCR + produce an English translation draft:\n"
            "  py -3 tools/process_books.py --test-pdf BOOK.pdf --translate\n\n"
            "  # Process books from the Google Sheet and write OCR back (no translation):\n"
            "  py -3 tools/process_books.py --write-sheet\n\n"
            "  # Full pipeline — Sheet, OCR, translate, write back:\n"
            "  py -3 tools/process_books.py --write-sheet --translate\n"
        ),
    )
    parser.add_argument(
        "--csv-url",
        default=load_csv_url(),
        help=(
            "Published Google Sheets CSV URL. Defaults to data/csv-source.json "
            "(csvUrl), overridable via the VITE_CSV_URL env var (SHRINES_CSV_URL "
            "is still accepted but deprecated)."
        ),
    )
    parser.add_argument("--apps-script-url", default=os.getenv("SHRINES_APPS_SCRIPT_URL", ""))
    parser.add_argument("--api-key", default=os.getenv("SHRINES_APPS_SCRIPT_API_KEY", ""))
    parser.add_argument("--sheet-name", default=os.getenv("SHRINES_SHEET_NAME", ""))
    parser.add_argument("--book-column", default="Book")
    parser.add_argument("--transcribed-column", default="Transcribed")
    parser.add_argument("--translated-column", default="Translated")
    parser.add_argument("--test-pdf", default="", help="OCR/translate one local PDF without using the sheet.")
    parser.add_argument("--test-book-url", default="", help="OCR/translate one PDF/Drive URL without using the sheet.")
    parser.add_argument("--test-output-dir", default=str(REPO_ROOT / "out" / "ocr"))
    parser.add_argument("--limit", type=int, default=0, help="Process at most this many rows.")
    parser.add_argument("--force", action="store_true", help="Reprocess rows even when output exists.")
    parser.add_argument("--dry-run", action="store_true", help="Run OCR/translation without saving.")
    parser.add_argument("--stop-on-error", action="store_true")
    parser.add_argument("--keep-workdir", action="store_true")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--command-timeout", type=int, default=600)
    parser.add_argument("--pdftoppm", default=os.getenv("PDFTOPPM", "pdftoppm"))
    parser.add_argument(
        "--ocr-engine",
        choices=("utrnet", "tesseract"),
        default=os.getenv("SHRINES_OCR_ENGINE", "utrnet"),
        help="Primary OCR engine. UTRNet is the default; Tesseract is a fallback.",
    )
    parser.add_argument(
        "--utrnet-url",
        default=os.getenv("UTRNET_URL", DEFAULT_UTRNET_URL),
        help="Gradio app URL or Hugging Face Space id for the UTRNet end-to-end OCR app.",
    )
    parser.add_argument("--tesseract", default=os.getenv("TESSERACT", "tesseract"))
    parser.add_argument("--tessdata-dir", default=os.getenv("TESSDATA_DIR", ""))
    parser.add_argument("--ocr-lang", default=os.getenv("TESSERACT_LANG", "urd"))
    parser.add_argument("--psm", default="6")
    parser.add_argument(
        "--split-spreads",
        action="store_true",
        default=False,
        help=(
            "Split landscape page renders (two-page book spreads) vertically at "
            "the detected gutter and OCR right half before left (RTL page order). "
            "Portrait pages pass through untouched. Requires Pillow. Note: the "
            "per-page WARNING numbering counts half-pages when splitting occurs."
        ),
    )
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--first-page", type=int, default=1)
    parser.add_argument("--max-pages", type=int, default=0)
    parser.add_argument(
        "--libre-url",
        default=os.getenv("LIBRETRANSLATE_URL", DEFAULT_LIBRETRANSLATE_URL),
    )
    parser.add_argument("--libre-api-key", default=os.getenv("LIBRETRANSLATE_API_KEY", ""))
    parser.add_argument("--translation-source", default="ur")
    parser.add_argument("--translation-target", default="en")
    parser.add_argument("--translation-chars", type=int, default=DEFAULT_TRANSLATION_CHARS)
    parser.add_argument("--translation-delay", type=float, default=0.1)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--sheet-cell-chars", type=int, default=DEFAULT_SHEET_CELL_CHARS)
    parser.add_argument(
        "--no-save-ocr-first",
        dest="save_ocr_first",
        action="store_false",
        help="Do not save Transcribed before starting translation.",
    )
    parser.set_defaults(save_ocr_first=True)
    parser.add_argument(
        "--translate",
        action="store_true",
        default=False,
        help=(
            "Run LibreTranslate after OCR to produce an English translation draft. "
            "Off by default — requires a running LibreTranslate instance. "
            "Any machine-translated output must be reviewed by a human before "
            "publication and is never the source of record."
        ),
    )
    parser.add_argument(
        "--write-sheet",
        action="store_true",
        default=False,
        help=(
            "Read book links from the Google Sheet (--csv-url) and write OCR results "
            "back via the Apps Script endpoint. Requires SHRINES_APPS_SCRIPT_URL or "
            "--apps-script-url to be set. Off by default."
        ),
    )

    args = parser.parse_args(argv)
    args.libre_url = normalize_translate_endpoint(args.libre_url)

    if args.first_page < 1:
        parser.error("--first-page must be at least 1")
    if args.sheet_cell_chars > 50000:
        parser.error("--sheet-cell-chars must be 50000 or less for Google Sheets")
    if args.translation_chars <= 0:
        parser.error("--translation-chars must be positive")
    if args.test_pdf and args.test_book_url:
        parser.error("Use either --test-pdf or --test-book-url, not both")

    return args


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    try:
        pdftoppm = resolve_executable(args.pdftoppm, "pdftoppm")
        tesseract = (
            resolve_executable(args.tesseract, "tesseract")
            if args.ocr_engine == "tesseract"
            else None
        )
        if args.test_pdf or args.test_book_url:
            process_standalone_test(args, pdftoppm, tesseract)
            print("Done. OCR output written to", args.test_output_dir)
            return 0

        if not args.write_sheet:
            print(
                "Nothing to do. To run OCR on a PDF use --test-pdf or --test-book-url.\n"
                "To sync with Google Sheets pass --write-sheet.",
                file=sys.stderr,
            )
            return 1

        if not args.dry_run and not args.apps_script_url:
            raise PipelineError(
                "Missing Apps Script URL. Set SHRINES_APPS_SCRIPT_URL or pass --apps-script-url."
            )

        if not args.csv_url:
            raise PipelineError(
                "No CSV URL configured. Add data/csv-source.json (csvUrl), set "
                "VITE_CSV_URL, or pass --csv-url."
            )

        print("Fetching published Google Sheet CSV")
        rows = fetch_csv_rows(args.csv_url, args.timeout)
        print(f"Loaded {len(rows)} row(s)")

        processed = 0
        for row_index, row in enumerate(rows):
            if args.limit and processed >= args.limit:
                break

            try:
                did_process = process_row(row, row_index, args, pdftoppm, tesseract)
                if did_process:
                    processed += 1
            except Exception as exc:
                print(f"ERROR row {row_index + 2}: {exc}", file=sys.stderr)
                if args.stop_on_error:
                    return 1

        print(f"Done. Processed {processed} row(s).")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
