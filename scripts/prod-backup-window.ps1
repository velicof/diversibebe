# Runs scripts/prod-backup.cjs (backup, then verify and restore on this laptop) in its own window.
# The database password is typed here and lives only in this process's memory: it is not shown, not written to
# a file or a log, and never reaches the agent. The encryption passphrase is generated here and stored with
# Windows DPAPI, readable only by this Windows account. The log and the status file hold no secret.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\prod-backup-window.ps1
#   ... -Rehearsal -BackupDir <folder> -StorageUrl <stub>   (local synthetic database, no prompt)
param([switch]$Rehearsal, [string]$BackupDir = (Join-Path $env:USERPROFILE 'DiversiBebe-backups'), [string]$StorageUrl = 'https://smyimgvxlggggjeoajdo.supabase.co')
$ErrorActionPreference = 'Continue'
# node prints UTF-8: without this, the log shows the check marks as mojibake.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo
$stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ssZ')
New-Item -ItemType Directory -Force $BackupDir | Out-Null
# Only this Windows account can open the folder.
& icacls $BackupDir /inheritance:r /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(OI)(CI)F" | Out-Null
$log = Join-Path $BackupDir "run-$stamp.log"
$status = Join-Path $BackupDir 'last-run.json'
$result = [ordered]@{ startedAt = (Get-Date).ToUniversalTime().ToString('o'); rehearsal = [bool]$Rehearsal; address = $null; backup = 'not run'; verify = 'not run'; files = @(); log = $log; finishedAt = $null }
function Save-Status { $result.finishedAt = (Get-Date).ToUniversalTime().ToString('o'); $result | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $status }
function Say([string]$text) { Write-Host $text; Add-Content -Encoding utf8 $log $text }
function Node-Step([string[]]$arguments) {
  & node @arguments 2>&1 | ForEach-Object { $line = "$_"; Write-Host $line; Add-Content -Encoding utf8 $log $line }
  return $LASTEXITCODE
}

# Passphrase: generated once, kept with DPAPI next to the backups.
$keyFile = Join-Path $BackupDir 'passphrase.dpapi'
if (-not (Test-Path $keyFile)) {
  $bytes = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $phrase = [Convert]::ToBase64String($bytes)
  ConvertTo-SecureString $phrase -AsPlainText -Force | ConvertFrom-SecureString | Set-Content $keyFile
  Remove-Variable phrase
}
$secret = Get-Content $keyFile | ConvertTo-SecureString
$env:BACKUP_PASSPHRASE = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret))
$env:BACKUP_DIR = $BackupDir
$env:BACKUP_STORAGE_URL = $StorageUrl

try {
  Say "DiversiBebe: backup READ-ONLY. Folder: $BackupDir"
  if ($Rehearsal) {
    $runtime = Get-Content (Join-Path $repo '..\real-supabase-runtime\private\runtime.json') | ConvertFrom-Json
    $env:PGPASSWORD = $runtime.dbPassword
    $candidates = @(@{ host = '127.0.0.1'; port = '54322'; user = 'postgres'; db = 'diversibebe_dev' })
  } else {
    Write-Host ''
    Write-Host 'Parola bazei de date Supabase (Database -> Settings). Nu se afiseaza, nu se salveaza.'
    Write-Host 'Daca nu o stii, inchide fereastra: resetarea ei este o schimbare in productie si o decizi tu.'
    $candidates = @(
      @{ host = 'db.smyimgvxlggggjeoajdo.supabase.co'; port = '5432'; user = 'postgres'; db = 'postgres' },
      @{ host = 'aws-0-eu-west-1.pooler.supabase.com'; port = '5432'; user = 'postgres.smyimgvxlggggjeoajdo'; db = 'postgres' },
      @{ host = 'aws-1-eu-west-1.pooler.supabase.com'; port = '5432'; user = 'postgres.smyimgvxlggggjeoajdo'; db = 'postgres' }
    )
  }
  $chosen = $null
  $tries = if ($Rehearsal) { 1 } else { 2 }
  for ($attempt = 1; $attempt -le $tries -and -not $chosen; $attempt++) {
    if (-not $Rehearsal) {
      $typed = Read-Host 'Parola' -AsSecureString
      $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($typed))
    }
    foreach ($c in $candidates) {
      $env:PGHOST = $c.host; $env:PGPORT = $c.port; $env:PGUSER = $c.user; $env:PGDATABASE = $c.db
      $answer = (& node scripts/prod-backup.cjs --probe 2>&1 | Select-Object -Last 1)
      Say "connection $($c.host): $answer"
      if ("$answer" -eq 'probe: ok') { $chosen = $c; break }
      # A wrong password is not retried on another address: repeated failures can block this IP.
      if ("$answer" -eq 'probe: wrong-password') { Write-Host 'Parola nu a fost acceptata.'; break }
    }
  }
  if (-not $chosen) { $result.backup = 'no connection'; Say 'Oprit: nicio conexiune. Nimic nu s-a scris in productie.'; return }
  $result.address = $chosen.host

  $code = Node-Step @('scripts/prod-backup.cjs')
  $result.backup = if ($code -eq 0) { 'ok' } else { "failed ($code)" }
  # From here on the production credentials are no longer needed.
  foreach ($name in 'PGPASSWORD','PGHOST','PGPORT','PGUSER','PGDATABASE') { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
  if ($code -ne 0) { Say 'Backup oprit. Vezi mesajul de mai sus.'; return }

  $dump = Get-ChildItem $BackupDir -Filter 'diversibebe-*.dump.enc' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $code = Node-Step @('scripts/prod-backup.cjs', '--verify', $dump.FullName, '--restore-local')
  $result.verify = if ($code -eq 0) { 'ok' } else { "failed ($code)" }
  $prefix = $dump.FullName -replace '\.dump\.enc$', ''
  $result.files = @(Get-ChildItem "$prefix.*" | ForEach-Object { [ordered]@{ name = $_.Name; bytes = $_.Length } })
} finally {
  foreach ($name in 'PGPASSWORD','PGHOST','PGPORT','PGUSER','PGDATABASE','BACKUP_PASSPHRASE') { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
  Save-Status
  if (-not $Rehearsal) {
    Write-Host ''
    Write-Host 'Gata. Rezultatul este in last-run.json; agentul il citeste de acolo.'
    $show = Read-Host 'Vrei sa vezi fraza de criptare, ca s-o copiezi in managerul de parole? (d/N)'
    if ($show -eq 'd') { Write-Host ([Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret))) }
    Read-Host 'Apasa Enter ca sa inchizi fereastra' | Out-Null
  }
}
