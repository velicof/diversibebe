# Release readiness — DiversiBebe 2.0

Evaluare: 3 nov. 2026 (actualizare după decizia „un singur proiect Supabase”) · branch `release/v2-rc` · jurnale: `outputs/release-2026-11-03/tests/migration/` și `outputs/release-2026-11-03/rehearsal/` (evaluarea anterioară: `tests/final/`).

## Decizie

| Treaptă | Decizie |
|---|---|
| **Canary (doar contul fondatorului, după invitație)** | **NO-GO** până la etapele 1–5 din `MIGRATION-V1-V2.md` (patch V1, backup, migrații, Auth), toate gratuite și care cer aprobarea ta |
| **Beta privată (familii invitate)** | **NO-GO** doar până la canary + testul pe telefon. Biblioteca nu mai este un blocaj: 289 de rețete trec verificarea editorială (decizia fondatorului, 3 nov.; vezi `LIBRARY-REPORT.md`) |
| **Publicare** | **NO-GO** |

Staging online nu mai este un blocaj: decizia ta (un proiect, cost 0) e acoperită de copia locală izolată, cu schemă dovedită identică cu producția, de repetiția pe stack real și de canary-ul din producție.

## Gate-uri (dovezi)

| # | Condiție | Stare | Dovadă |
|---|---|---|---|
| G1 | Vulnerabilități critice | ✅ | advisors producție: 0 ERROR; P0 reconfirmat; poarta beta acum fail-closed |
| G2 | Izolare între familii/copii | ✅ local | RLS în repetiție (PGlite + PostgREST real, HTTP 401 pentru anonim), `security`, `persistence` |
| G3 | Fluxuri E2E esențiale | ✅ local · ⛔ canary | E2E Playwright 108/108 |
| G4 | Backend online verificat | ⛔ → canary | înlocuit de repetiția locală pe stack real + canary (`MIGRATION-V1-V2.md` §4 etapa 7) |
| G5 | Migrații și rollback | ✅ local · ⛔ backup producție | repetiție 27/27 pe PostgreSQL 17 + GoTrue + PostgREST; rollback L1 complet (corectat); `prod-backup.cjs` verificat prin restaurare locală |
| G6 | Conținut verificat | ✅ editorial · ⏳ specialist | 291 inventariate; 289 publicabile editorial (reguli NHS/CDC/UE, 32 corectate cu jurnal); 2 în revizie de specialitate, nepublicate; 0 aprobări medicale (niciuna inventată). Consola `/v2/revizie` + export CSV pentru pediatră |
| G7 | Fără afirmații nejustificate | ✅ V2 · ⚠️ V1 | texte V2 pentru conturi reale fără „test/sintetic”; V1: „aprobate de nutriționiști” (decizie fondator) |
| G8 | Telefon fizic + desktop | ⚠️ | capturi 390/1440 ✅; telefon ⛔ |
| G9 | Analytics + confidențialitate | ✅ local · ⛔ politică | mențiunea în politica de confidențialitate lipsește |
| G10 | Monitorizare | ⚠️ | runbook canary (`MIGRATION-V1-V2.md` §5) |
| G11 | Costuri | ✅ | proiect comun, Hobby + Free: 0 până la beta |
| G12 | V1 funcționează după migrații | ✅ local · ⛔ producție | patch `b12b652` verificat și pe stack real; nepublicat |
| G13 | Acces controlat la beta | ✅ | fail-closed în producție (`release-gates`) |
| G14 | **V2 poate folosi infrastructura existentă** (nou) | ✅ local | clientul acceptă proiectul V1, conturile reale, Google; `robots.txt` nu mai scoate V1 din Google |

## Rezultatele rulării (`outputs/release-2026-11-03/tests/migration/`)

| Verificare | Rezultat |
|---|---|
| Build Next.js | PASS |
| TypeScript | PASS |
| Lint V2 | PASS, 0 probleme |
| Lint întreg repository | 46 erori + 29 avertismente — identic cu baza (un avertisment nou din `migration-rehearsal.cjs`, corectat) |
| Unit / SQL / HTTP / Auth | **101/101** (95 anterioare + drift extins, repetiție PGlite, 4 teste de lansare) |
| Repetiție pe stack real | **27/27** (`rehearsal/REPORT.md`) |
| Backup → restaurare locală | 12/12 tabele identice (pe baza locală sintetică) |
| E2E Playwright | **108/108** (`e2e.log`) |

## Blocaje rămase

### Gratuite, dar cer aprobarea sau acțiunea ta

| # | Acțiune | Efort | Cine |
|---|---|---|---|
| 1 | Push + PR + merge pentru patch-ul V1 (`hotfix/v1-v2-schema-compat`) | 1 h | agent, după aprobare |
| 2 | Backup producție cu `scripts/prod-backup.cjs` (parola bazei rămâne la tine) | 20 min | tu |
| 3 | Migrațiile V2 în producție (preflight → 7 fișiere → postflight) | 30 min | agent, după aprobare |
| 4 | Supabase Auth: Redirect URL `https://www.diversibebe.com/v2/**` + SMTP Resend; „Confirm email” rămâne dezactivat | 30 min | tu, cu ghidaj |
| 5 | Push `release/v2-rc` → Vercel Preview (verifică build-ul pe Vercel), apoi variabilele Production + merge pentru canary | 2 h | agent, după aprobare |
| 6 | Canary 48 h cu contul tău (email + Google), checklist §5 | 1 h în 2 zile | tu |
| 7 | Test pe telefon (iOS + Android) | 1–2 h | tu |
| 8 | Mențiunea despre analytics în politica de confidențialitate | 1 h | tu |

### Cu cost

| # | Acțiune | Cost |
|---|---|---|
| 9 | Revizia de specialitate (recomandată, nu mai blochează beta): întâi cele 2 excepții și lotul prioritar, prin consola `/v2/revizie` | buget 0 acum; ~1.500–3.500 lei când decizi |
| 10 | Înainte de monetizare: Vercel Pro (20 USD/lună); recomandat Supabase Pro (25 USD/lună, backup zilnic) | recurent |
