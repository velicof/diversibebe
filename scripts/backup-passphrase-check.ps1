# Confirms that the backup passphrase also exists outside this laptop (in the founder's password manager):
# the founder pastes it here and it is compared with the DPAPI copy. Nothing is printed or written, except a
# yes/no result in passphrase-check.json. If the founder does not have it yet, it can be shown in this window.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-passphrase-check.ps1
$ErrorActionPreference = 'Continue'
$dir = Join-Path $env:USERPROFILE 'DiversiBebe-backups'
$secret = Get-Content (Join-Path $dir 'passphrase.dpapi') | ConvertTo-SecureString
function Plain($s) { [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
$confirmed = $false
Write-Host 'Fraza de criptare a backupului DiversiBebe trebuie sa existe si in managerul tau de parole.'
Write-Host 'Lipeste-o aici (clic dreapta sau Ctrl+V, apoi Enter). Nu se afiseaza si nu se salveaza.'
for ($i = 1; $i -le 3 -and -not $confirmed; $i++) {
  $typed = Read-Host 'Fraza' -AsSecureString
  if ((Plain $typed).Trim() -ceq (Plain $secret)) { $confirmed = $true; Write-Host 'Corect: fraza din managerul de parole se potriveste.'; break }
  Write-Host 'Nu se potriveste.'
  $show = Read-Host 'Nu o ai inca salvata? Scrie d ca s-o afisez aici, s-o copiezi in managerul de parole (d/N)'
  if ($show -eq 'd') {
    Write-Host ''; Write-Host (Plain $secret); Write-Host ''
    Read-Host 'Dupa ce ai salvat-o in managerul de parole, apasa Enter si lipeste-o din nou de acolo' | Out-Null
    Clear-Host
  }
}
[ordered]@{ confirmed = $confirmed; at = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $dir 'passphrase-check.json')
if ($confirmed) { Write-Host 'Gata. Poti inchide fereastra.' } else { Write-Host 'Neconfirmat. Migratiile nu pornesc fara acest pas.' }
Read-Host 'Apasa Enter ca sa inchizi' | Out-Null
