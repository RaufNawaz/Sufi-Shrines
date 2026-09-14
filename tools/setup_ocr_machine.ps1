<#
tools/setup_ocr_machine.ps1 — Windows twin of setup_ocr_machine.sh.
Makes a freshly copied project folder able to run the book OCR batch.
Idempotent: every step checks before it acts. Run from any folder:

  powershell -ExecutionPolicy Bypass -File tools\setup_ocr_machine.ps1 -DryRun     # check only
  powershell -ExecutionPolicy Bypass -File tools\setup_ocr_machine.ps1             # install + set up
  powershell -ExecutionPolicy Bypass -File tools\setup_ocr_machine.ps1 -SkipUtrnet # project side only

Sets up, in order: winget packages (Git, Python 3.12 + 3.10, Poppler, Tesseract),
the project venv (.venv) from requirements.txt, the UTRNet OCR server as a SIBLING
folder on Python 3.10 with the pinned web stack (tools\utrnet-pins.txt) and its
weights from the HuggingFace Space, then prints the commands to run.
Never touches books\ or out\ — those come across in the folder copy.

Untested on a Windows machine at the time of writing (11 Sep 2026: authored on a
Mac); the winget ids are the ones docs/LIBRARY_OCR_SETUP.md used successfully.
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$SkipUtrnet,
  [string]$UtrnetDir = ""
)
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $UtrnetDir) { $UtrnetDir = Join-Path (Split-Path $RepoRoot -Parent) "End-To-End-Urdu-OCR-WebApp" }
$UtrnetRepo = "https://github.com/abdur75648/End-To-End-Urdu-OCR-WebApp.git"
$UtrnetHf = "https://huggingface.co/spaces/abdur75648/UrduOCR-UTRNet/resolve/main"
$Incoming = "books\incoming-2026-09-11"
$IncomingEn = "books\incoming-2026-09-11-english"
$script:Missing = 0

function Ok($m)   { Write-Host ("  OK       {0}" -f $m) }
function Miss($m) { Write-Host ("  MISSING  {0}" -f $m); $script:Missing++ }
function Warn($m) { Write-Host ("  WARN     {0}" -f $m) -ForegroundColor Yellow }
function Die($m)  { Write-Error ("ERROR: {0}" -f $m); exit 1 }
function Run { param([string]$Exe, [string[]]$Args)
  if ($DryRun) { Write-Host ("  (dry-run) would run: {0} {1}" -f $Exe, ($Args -join " ")); return }
  & $Exe @Args
  if ($LASTEXITCODE -ne 0) { Die ("{0} {1} failed with exit code {2}" -f $Exe, ($Args -join " "), $LASTEXITCODE) }
}
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function NeedBin($bin, $wingetId) {
  if (Has $bin) { Ok ("{0} ({1})" -f $bin, (Get-Command $bin).Source) }
  else { Miss $bin; if (-not $DryRun) { Run "winget" @("install","-e","--id",$wingetId,"--accept-source-agreements","--accept-package-agreements") } }
}

Write-Host "== Project folder"
if (-not (Test-Path (Join-Path $RepoRoot "tools\ocr_all_books.py"))) { Die "not the Shrines Project folder: $RepoRoot" }
Ok $RepoRoot
if (Test-Path (Join-Path $RepoRoot "out\ocr")) {
  $done = (Get-ChildItem (Join-Path $RepoRoot "out\ocr") -Directory | Where-Object { $_.Name -notin @("logs","Final") }).Count
  Ok "out\ocr\ present — $done finished book folder(s) will be skipped by the batch"
} else { Warn "out\ocr\ is missing. It is gitignored, so a git clone does not bring it: copy the WHOLE folder, or every finished book is redone." }
$pdfs = @(Get-ChildItem (Join-Path $RepoRoot $Incoming),(Join-Path $RepoRoot $IncomingEn) -Filter *.pdf -ErrorAction SilentlyContinue)
if ($pdfs.Count -gt 0) { Ok ("{0} new PDF(s) waiting in {1}" -f $pdfs.Count, $Incoming) } else { Warn "$Incoming\ not present yet — download step still to do (runbook step 4)" }

Write-Host "== System tools (winget)"
if (-not (Has "winget")) { Die "winget not available — install 'App Installer' from the Microsoft Store, then re-run" }
NeedBin "git" "Git.Git"
NeedBin "pdftoppm" "oschwartz10612.Poppler"
NeedBin "pdftotext" "oschwartz10612.Poppler"
NeedBin "tesseract" "UB-Mannheim.TesseractOCR"
if ((Test-Path (Join-Path $RepoRoot "tessdata\urd.traineddata")) -and (Test-Path (Join-Path $RepoRoot "tessdata\fas.traineddata"))) {
  Ok "tessdata\urd + fas shipped with the project"
} else { Warn "tessdata\ (urd, fas) missing from the project copy — Tesseract fallback needs them" }
if ((Has "tesseract") -and -not ((& tesseract --list-langs 2>$null) -contains "eng")) { Warn "tesseract has no 'eng' data — the English scans need it (UB-Mannheim installer: tick 'English' under additional languages)" }
if (-not (Has "pdftoppm") -and -not $DryRun) { Warn "Poppler was just installed: close and reopen PowerShell so PATH picks it up, then re-run this script." }

Write-Host "== Project Python"
$projectPy = $null
foreach ($v in @("3.14","3.13","3.12","3.11")) { if (Has "py") { & py "-$v" --version 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $projectPy = @("py","-$v"); break } } }
if ($projectPy) { Ok ("py {0} ({1})" -f $projectPy[1], (& $projectPy[0] $projectPy[1] --version)) }
else { Miss "Python >= 3.11 for tools\"; if (-not $DryRun) { Run "winget" @("install","-e","--id","Python.Python.3.12","--accept-source-agreements","--accept-package-agreements"); $projectPy = @("py","-3.12") } }
$venvPy = Join-Path $RepoRoot ".venv\Scripts\python.exe"
if (Test-Path $venvPy) { Ok ".venv exists" } else { Miss ".venv (project virtualenv)"; if (-not $DryRun) { Run $projectPy[0] @($projectPy[1],"-m","venv",(Join-Path $RepoRoot ".venv")) } }
if (-not $DryRun) {
  Run $venvPy @("-m","pip","install","--quiet","--upgrade","pip")
  Run $venvPy @("-m","pip","install","--quiet","-r",(Join-Path $RepoRoot "requirements.txt"))
  Ok "requirements.txt installed into .venv"
} elseif (Test-Path $venvPy) {
  & $venvPy -c "import gdown, gradio_client, PIL" 2>$null
  if ($LASTEXITCODE -eq 0) { Ok ".venv has gdown, gradio_client, pillow" } else { Miss ".venv packages from requirements.txt" }
}

if ($SkipUtrnet) {
  Write-Host "== UTRNet: skipped (-SkipUtrnet). The batch will need --utrnet-url abdur75648/UrduOCR-UTRNet (public HF Space, slow, shared)."
} else {
  Write-Host "== UTRNet OCR server -> $UtrnetDir"
  $py310 = $false
  if (Has "py") { & py -3.10 --version 2>$null | Out-Null; $py310 = ($LASTEXITCODE -eq 0) }
  if ($py310) { Ok "py -3.10 ($(& py -3.10 --version)) — the app's torch/gradio pins need exactly 3.10" }
  else { Miss "Python 3.10 (the UTRNet app is pinned to it)"; if (-not $DryRun) { Run "py" @("install","3.10") } }
  if (Test-Path (Join-Path $UtrnetDir ".git")) { Ok "repo cloned" } else { Miss "repo clone"; if (-not $DryRun) { Run "git" @("clone",$UtrnetRepo,$UtrnetDir) } }
  # Same as the shell twin: the batch needs the LOCAL PATCH (tools\utrnet\local-changes.patch —
  # text-only batched /predict, trusted torch.load, pinned requirements.txt) on a fresh clone,
  # and it must land before pip reads requirements.txt. A folder copied from the Air or unzipped
  # from the bundle is already patched.
  $appPy = Join-Path $UtrnetDir "app.py"
  if ((Test-Path $appPy) -and (Select-String -Path $appPy -Pattern "text_recognizer_batch" -Quiet)) { Ok "local patch applied (app.py has text_recognizer_batch)" }
  else {
    Miss "local patch - tools\utrnet\local-changes.patch on app.py, read.py, requirements.txt"
    if ((-not $DryRun) -and (Test-Path (Join-Path $UtrnetDir ".git"))) {
      Run "git" @("-C",$UtrnetDir,"apply",(Join-Path $RepoRoot "tools\utrnet\local-changes.patch"))
      Copy-Item (Join-Path $RepoRoot "tools\utrnet\batch_ocr.py") $UtrnetDir -Force
      Copy-Item (Join-Path $RepoRoot "tools\utrnet\README_MAC.md") $UtrnetDir -Force
      if (-not (Select-String -Path $appPy -Pattern "text_recognizer_batch" -Quiet)) { Die "the patch did not apply - upstream has moved; apply tools\utrnet\local-changes.patch by hand" }
    }
  }
  $upy = Join-Path $UtrnetDir ".venv\Scripts\python.exe"
  if (Test-Path $upy) { Ok "UTRNet .venv exists" } else { Miss "UTRNet .venv"; if (-not $DryRun) { Run "py" @("-3.10","-m","venv",(Join-Path $UtrnetDir ".venv")) } }
  if (-not $DryRun) {
    Run $upy @("-m","pip","install","--quiet","--upgrade","pip")
    Run $upy @("-m","pip","install","--quiet","-r",(Join-Path $UtrnetDir "requirements.txt"))
    Run $upy @("-m","pip","install","--quiet","--force-reinstall","-r",(Join-Path $RepoRoot "tools\utrnet-pins.txt"))
    Ok "UTRNet requirements + pinned web stack installed"
    & $upy -c "import torch; print('  torch', torch.__version__, 'CUDA:', torch.cuda.is_available())"
    Warn "if CUDA prints False on an NVIDIA machine: install the CUDA wheel from https://pytorch.org/get-started/locally/ inside $UtrnetDir\.venv — CPU OCR is ~10x slower"
  }
  foreach ($f in @("best_norm_ED.pth","yolov8m_UrduDoc.pt","1.jpg","2.jpg","3.jpg")) {
    $target = Join-Path $UtrnetDir $f
    $min = if ($f -match '\.(pth|pt)$') { 40000000 } else { 1000 }
    if ((Test-Path $target) -and ((Get-Item $target).Length -ge $min)) { Ok "weights: $f" }
    else { Miss "weights: $f"; if (-not $DryRun) { Run "curl.exe" @("-fL","--retry","3","-o",$target,"$UtrnetHf/$f") } }
  }
  if (-not $DryRun) {
    foreach ($f in @("best_norm_ED.pth","yolov8m_UrduDoc.pt")) {
      if ((Get-Item (Join-Path $UtrnetDir $f)).Length -lt 40000000) { Die "$f is under 40 MB — HuggingFace returned an error page; delete it and re-run" }
    }
  }
}

Write-Host ""
if ($script:Missing -gt 0) {
  if ($DryRun) { Write-Host "$($script:Missing) prerequisite(s) missing. Run without -DryRun to install them."; exit 2 }
  Write-Host "$($script:Missing) item(s) were missing and have been installed where possible. Re-run with -DryRun to confirm everything reads OK."
} else { Write-Host "All prerequisites present." }
@"

-- Run the batch ----------------------------------------------------------------
PowerShell 1 - the OCR model server (leave it running):
  cd "$UtrnetDir"; Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\.venv\Scripts\Activate.ps1; python app.py
  # wait for:  Running on local URL: http://127.0.0.1:7860

PowerShell 2 - the books:
  cd "$RepoRoot"; .\.venv\Scripts\Activate.ps1
$(if ((Test-Path (Join-Path $RepoRoot "$Incoming\manifest.json")) -and ($pdfs.Count -gt 0)) {
"  # the books are already here ($($pdfs.Count) PDFs; downloaded and verified 12 Sep 2026) - download, sort and verify are done, go straight to the OCR"
} else {
"  python tools\download_books.py --links pipeline\books_links_2026-09-11.txt --out $Incoming --cookies `"`$env:USERPROFILE\Downloads\cookies.txt`"
  python tools\books_manifest.py --sort-downloaded      # English PDFs -> $IncomingEn
  python tools\books_manifest.py --verify               # sizes + sha256 into the manifest TSV"
})
  python tools\extract_epub_text.py $IncomingEn          # the one EPUB (no OCR) - it sorted into the English folder
  python tools\ocr_all_books.py --books-dir $Incoming --utrnet-url http://127.0.0.1:7860
  `$env:TESSERACT_LANG = "eng"; python tools\ocr_all_books.py --books-dir $IncomingEn --ocr-engine tesseract

Progress:  python tools\ocr_status.py   (writes out\ocr\STATUS.md)
Details:   docs\OCR_NEW_MACHINE_RUNBOOK.md
"@ | Write-Host
