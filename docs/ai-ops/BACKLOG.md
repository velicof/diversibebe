# Backlog prioritizat până la lansare

Efort = ore de lucru efectiv (agent sau om). Cost = cheltuieli externe. „Aprobare” = acțiune cu efect în producție, cost sau comunicare externă: se execută numai după acordul explicit al fondatorului.

## P0 — blochează beta privată

| # | Acțiune | Cine | Efort | Cost | Aprobare | Gate |
|---|---|---|---|---|---|---|
| 1 | Contractarea unui pediatru/dietetician pentru lotul 1 (26 rețete, `REVIEW-PACKAGE.md`) | fondator | 1–2 h coordonare + 10–13 h specialist | ~1.500–3.500 lei (de cerut oferte) | da (cost) | G6 |
| 2 | Transcrierea reviziei în `editorial.ts` (cu `contentHash`), aplicarea corecturilor, retrimiterea celor „modificări” | agent | 4–6 h | 0 | nu | G6 |
| 3 | ~~Staging online~~ — înlocuit (decizia „un singur proiect”, 3 nov.) de repetiția locală pe stack real (**făcut**, 27/27) + canary | — | — | 0 | — | G4, G5 |
| 4 | Vercel Preview pentru `release/v2-rc` în modul vizitator (fără chei Supabase V2 în Preview): build pe Vercel + flux vizitator | agent | 1 h | 0 | da (push) | G3 |
| 5 | Supabase Auth producție: SMTP Resend + Redirect URLs `/v2/**` | fondator + agent | 1–2 h | 0 | da | G4 |
| 6 | Backup logic al producției înainte de migrații | fondator (parola DB) + agent | 1 h | 0 | da | G5 |
| 7 | Publicarea patch-ului V1 `hotfix/v1-v2-schema-compat` (`b12b652`) → verificare live | agent | 1–2 h | 0 | da (push + merge) | G12 |
| 8 | Migrațiile V2 în producție + advisors + preflight | agent | 2 h | 0 | da | G1, G5 |
| 9 | Variabile Production + coduri de invitație + merge `release/v2-rc` → canary 48 h cu contul fondatorului (`MIGRATION-V1-V2.md` §5) | agent + fondator | 2 h + 48 h | 0 | da | G3, G4, G13 |
| 10 | Test pe telefon fizic (iOS + Android) cu checklist G8 | fondator | 1–2 h | 0 | nu | G8 |
| 11 | Mențiune analytics în politica de confidențialitate | fondator | 1 h | 0 | da (conținut public) | G9 |

## P1 — înainte de publicare

| # | Acțiune | Efort | Cost | Gate |
|---|---|---|---|---|
| 12 | Afirmațiile V1 („aprobate de nutriționiști”, testimonial) — dovezi sau eliminare | 1 h | 0 | G7 |
| 13 | 12 fotografii: Gemini Images → verificare → `photo-import publish` | 4–6 h fondator + 2 h agent | 0–50 lei | G6 |
| 14 | Lotul editorial 2 (încă 20–30 rețete, inclusiv cină 6+ dacă specialistul o cere) | 2 h agent + specialist | ~1.500–3.000 lei | G6 |
| 15 | Vercel Pro înainte de orice monetizare | — | 20 USD/lună | G11 |
| 16 | Supabase Pro (backup zilnic, fără pauzare, protecție parole compromise) | — | 25 USD/lună | G5, G1 |
| 17 | Redirect apex 307 → 308; variabilele secrete marcate Sensitive | 0,5 h | 0 | G1 |
| 18 | Alias ASCII pentru `omletă-legume-8` (păstrând favoritele V1) | 1 h | 0 | — |
| 19 | „Debifarea” în V2 a unui aliment înregistrat în V1 fără copil (familie cu un copil) nu îl ascunde — adopție la salvarea profilului | 2 h | 0 | — |
| 20 | ~~Pass de copy pentru conturi reale~~ — **făcut** (`accountCopy`) | — | 0 | G7 |
| 21 | Jurnalul V1 (1.176 intrări, 95 familii) vizibil și în V2 (citire) | 3–4 h | 0 | — |
| 22 | V1: păstrarea copilului la înregistrare chiar dacă „Confirm email” ar fi activat (precondiție pentru activarea confirmării) | 2 h | 0 | — |

## P2 — după lansare

Planificator cu mai multe mese/zi, export PDF, partajarea listei, grupare pe raioane, dashboard intern de metrici, reactivarea BebeAsist cu cotă partajată și revizie clinică a promptului, checkout (aprobare separată), reducerea lint-ului legacy (46 erori moștenite).

## Estimare totală până la beta privată

| | Optimist | Realist |
|---|---|---|
| Timp calendaristic | 2 săptămâni | 3–4 săptămâni (dominat de revizia clinică) |
| Efort agent | ~20 h | ~30 h |
| Efort fondator | ~8 h | ~12 h |
| Cost extern | ~1.500 lei (revizie) | ~3.500 lei (proiect Supabase comun, Free: 0 lei infrastructură până la beta) |
