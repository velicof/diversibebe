# Backup și verificarea restaurării, înaintea migrațiilor V2

Îl rulezi tu, în terminalul tău: parola bazei de date nu ajunge la agent, în repository sau într-un jurnal. Backupul doar citește din producție. Cost: 0 lei. Durată: ~20 min.

## Ce acoperă

| Parte | Conținut | Unde ajunge |
|---|---|---|
| Baza de date | schemele `public` (11 tabele) și `auth` (27 de tabele), cu `pg_dump` 17 | `diversibebe-<moment>.dump.enc` |
| Fișiere | Storage: bucket-ul `avatars`, 7 fișiere, ~12,5 MB. `pg_dump` nu le include | `diversibebe-<moment>.storage.enc` |
| Dovada | număr de rânduri și de fișiere, sume de control, versiuni; fără date | `diversibebe-<moment>.manifest.json` |

Criptare AES-256-GCM. Folderul implicit este `%USERPROFILE%\DiversiBebe-backups`; un folder din repository e refuzat.

**Nu acoperă:** setările Auth, variabilele Vercel și funcțiile din alte scheme. Migrațiile V2 nu le schimbă.

## Pași (recomandat: fereastra locală)

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prod-backup-window.ps1
```

Fereastra cere doar parola bazei de date (nu se afișează și nu se salvează) și face singură restul: alege adresa printr-un `SELECT 1` read-only, face backupul, îl verifică și face restaurarea de test. Fraza de criptare e generată și păstrată cu DPAPI. Rezultatul, fără secrete, ajunge în `last-run.json`. Folosită pe 7 nov.: totul a trecut.

### Manual

Din `work/diversibebe`, în PowerShell. Datele de conectare sunt în Supabase → **Connect** → **Session pooler**.

```powershell
$env:PGHOST = "<host din Session pooler>"
$env:PGPORT = "5432"
$env:PGUSER = "postgres.smyimgvxlggggjeoajdo"
$env:PGPASSWORD = Read-Host "Parola bazei de date"
$env:BACKUP_PASSPHRASE = Read-Host "Fraza pentru criptare, minimum 16 caractere"
$env:BACKUP_STORAGE_URL = "https://smyimgvxlggggjeoajdo.supabase.co"
node scripts/prod-backup.cjs
```

Păstrează fraza într-un manager de parole: fără ea, backupul nu poate fi citit. La final, scriptul afișează comanda de verificare:

```powershell
node scripts/prod-backup.cjs --verify "<fișierul .dump.enc afișat>" --restore-local
```

Apoi închide terminalul, ca variabilele să dispară.

## Rezultatul așteptat

```
✔ decrypted, sha256 matches, 12/12 tables with data in the table of contents
✔ Storage: 7/7 files read back, each matching its checksum
✔ restore check: all 12 tables restored with identical row counts
```

Restaurarea se face într-o bază temporară de pe laptop, ștearsă imediat după comparație. Mesajele `pg_restore: N non-data errors` vin din rolurile și extensiile specifice Supabase, care nu există local; decide numărul de rânduri.

Pe 5 nov. producția avea aproximativ: `profiles` 435, `babies` 440, `tried_foods` 4.695, `food_journal` 1.183, `login_events` 2.656, `custom_recipes` 152, `custom_foods` 81, `favorite_recipes` 38, `cooked_recipes` 28, `allergy_records` 27, `feedback` 5. Numerele pot crește între timp, dar o scădere mare înseamnă oprire.

Dacă un pas afișează `✖`, oprește-te: **migrațiile nu pornesc fără cele trei linii de mai sus.**

## Ce a fost verificat, și pe ce

Pe baza locală sintetică (5 nov.): backup, restaurare 12/12, fișiere 2/2. Sunt refuzate: fraza greșită, dump-ul modificat, fișierul Storage modificat. Un fișier Storage lipsă oprește backupul. După fiecare eșec nu rămâne nicio copie necriptată în folderul temporar.

În producție (citire): server PostgreSQL 17.6, compatibil cu `pg_dump` 17.11; rolul `postgres` poate citi toate tabelele din `public` și `auth`.

**Rulat pe producție pe 7 nov., 19:17 UTC: trecut** (`V2-MIGRATION-GO-NOGO.md`).

## După backup

Spune agentului doar că verificarea a trecut și ora backupului, fără parolă și fără frază. Migrațiile rămân oprite până la o aprobare separată (`RELEASE-READINESS.md`, pașii 3–4).

Restaurare în caz de nevoie: `MIGRATION-V1-V2.md`, nivelul L3.

## Backup înainte de planificatorul flexibil (14 nov. 2026)

Același procedeu (fereastra locală sau pașii manuali de mai sus). Verificarea numără acum și tabelele
pe care le atinge migrația planificatorului: `meal_plans`, `user_preferences`, `product_events`.

Rezultatul așteptat:

```
✔ decrypted, sha256 matches, 15/15 tables with data in the table of contents
✔ Storage: 7/7 files read back, each matching its checksum
✔ restore check: all 15 tables restored with identical row counts
```

Preflight-ul read-only din 14 nov. a numărat: `meal_plans` 1, `user_preferences` 1, `product_events` 19,
`allergy_records` 27, `tried_foods` 4.704. Numerele din manifest trebuie să fie aceleași (sau mai mari,
dacă între timp au intrat date noi în V1).

### Copie în afara laptopului

Cele trei fișiere sunt criptate; fără fraza de criptare nu pot fi citite. Copiază-le într-un loc care nu
depinde de laptop, de exemplu Google Drive-ul tău (trage fișierele în drive.google.com) sau un stick USB:

- `diversibebe-<moment>.dump.enc`
- `diversibebe-<moment>.storage.enc`
- `diversibebe-<moment>.manifest.json`

Fraza de criptare rămâne **doar** în managerul de parole, niciodată lângă fișiere.

Verifică faptul că pe copie avem aceiași octeți ca la original (PowerShell, pe fișierul copiat, de exemplu
după ce îl descarci înapoi din Drive):

```powershell
Get-FileHash "<copia>.dump.enc" -Algorithm SHA256
```

Hash-ul trebuie să fie identic cu cel al originalului (`Get-FileHash` pe fișierul din
`%USERPROFILE%\DiversiBebe-backups`). Spune agentului doar: ora backupului, cele trei linii ✔ și
„copia are același hash”. Fără parolă, fără frază.
