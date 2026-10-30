# Register the archive database's scheduled tasks for the current Windows user (no admin needed).
# Re-running replaces them. Remove with: Unregister-ScheduledTask -TaskName 'Shrines DB*' -Confirm:$false
#
#   Shrines DB - start           at logon: start the PostgreSQL server (localhost only)
#   Shrines DB - nightly backup  02:30 daily: dump + restore drill + WAL check (backup.py)
#   Shrines DB - weekly base     Sunday 03:00: physical base backup for point-in-time recovery
#
# StartWhenAvailable: a run missed while the laptop was asleep or off happens at the next chance.
# Paths: binaries ~/pgsql-17, data ~/pgdata/17, backups ~/pgbackup (none inside the iCloud repo).

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path "$PSScriptRoot\..\..\..").Path
$py = "$HOME\.venvs\shrines-db\Scripts\python.exe"
$pgctl = "$HOME\pgsql-17\pgsql\bin\pg_ctl.exe"
$data = "$HOME\pgdata\17"
foreach ($p in @($py, $pgctl, $data)) { if (-not (Test-Path $p)) { throw "missing: $p" } }

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries `
  -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$me = "$env:USERDOMAIN\$env:USERNAME"

$tasks = @(
  @{ Name = 'Shrines DB - start'
     Action = New-ScheduledTaskAction -Execute $pgctl -Argument "-D `"$data`" -l `"$HOME\pgdata\logs\startup.log`" start"
     Trigger = New-ScheduledTaskTrigger -AtLogOn -User $me },
  @{ Name = 'Shrines DB - nightly backup'
     Action = New-ScheduledTaskAction -Execute $py -Argument "pipeline\db\backup.py" -WorkingDirectory $repo
     Trigger = New-ScheduledTaskTrigger -Daily -At 2:30am },
  @{ Name = 'Shrines DB - weekly base'
     Action = New-ScheduledTaskAction -Execute $py -Argument "pipeline\db\backup.py --base" -WorkingDirectory $repo
     Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00am }
)
foreach ($t in $tasks) {
  Register-ScheduledTask -TaskName $t.Name -Action $t.Action -Trigger $t.Trigger -Settings $settings `
    -Description 'Shrines archive database (pipeline/db, docs/DATABASE.md)' -Force | Out-Null
  "registered: $($t.Name)"
}
