# Finds folders in this repository that carry the Windows Read-only attribute, and clears it.
#
# Why (HANDOVER 9.432, 30 October 2026): Windows will not remove a read-only folder
# ("Access is denied"), so Git looped on "Deletion of directory '.git/objects/00' failed.
# Should I try again?", builds failed to empty dist/, and deleting in Explorer failed on
# thousands of files. 8,977 of the repository's 8,985 folders had the attribute; files did not.
# Folders created since did not get it, so it was a one-time recursive change, not a process.
#
# Folders only: Git deliberately makes its object files read-only, and that is harmless.
#
#   powershell -ExecutionPolicy Bypass -File scripts\windows\clear-readonly-dirs.ps1          # report and clear
#   powershell -ExecutionPolicy Bypass -File scripts\windows\clear-readonly-dirs.ps1 -Check   # report; exit 1 if any

param([switch]$Check)

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ro = @(@(Get-Item -LiteralPath $root -Force) +
        @(Get-ChildItem -LiteralPath $root -Directory -Recurse -Force -ErrorAction SilentlyContinue) |
        Where-Object { $_.Attributes -band [IO.FileAttributes]::ReadOnly })

"$($ro.Count) read-only folder(s) under $root"
if ($ro.Count -eq 0) { exit 0 }
$ro | Select-Object -First 10 | ForEach-Object { "  " + $_.FullName }
if ($Check) { exit 1 }

foreach ($d in $ro) { $d.Attributes = $d.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly) }
"cleared $($ro.Count)"
