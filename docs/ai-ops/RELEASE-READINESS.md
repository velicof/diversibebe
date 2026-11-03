# Release readiness — DiversiBebe 2.0

Evaluare: 3 nov. 2026 · branch `release/v2-rc` · candidat `342c0aa` (+ corecția testului canonical) · jurnale: `outputs/release-2026-11-03/tests/final/`

## Decizie

| Treaptă | Decizie |
|---|---|
| **Beta privată** | **NO-GO** |
| **Publicare** | **NO-GO** |

Codul și testele locale sunt pregătite. Lipsesc condiții care nu se pot îndeplini local sau fără aprobare: conținut revizuit clinic, backend online verificat, patch-ul V1 publicat, test pe telefon fizic. Nu s-a deschis un PR de release către `main`, pentru că nu toate verificările sunt complete.

## Gate-uri (dovezi)

| # | Condiție | Stare | Dovadă |
|---|---|---|---|
| G1 | Vulnerabilități critice | ✅ local / ✅ producție fără ERROR | advisors producție 3 nov.: 0 ERROR, 4 WARN (3 × `handle_new_user` — rezolvate de migrația 1 din setul de lansare; protecția parolelor compromise — doar în planul Pro); P0 reconfirmat prin metadate |
| G2 | Izolare între familii/copii | ✅ local | `unit-sql-http-auth.log`: 95/95 (SQL PGlite, PostgREST real, GoTrue real); E2E native cu 2 familii și 2 copii |
| G3 | Fluxuri E2E esențiale | ✅ local · ⛔ staging | `e2e-rerun.log`: **108/108**; onboarding → rețetă → salvare → plan → listă → login, cont nou/existent, recuperare parolă, refresh, sesiuni multiple, rețea indisponibilă |
| G4 | Backend online verificat | ⛔ | nu există staging; necesită decizia de mediu (ARCHITECTURE §4) |
| G5 | Migrații și rollback | ✅ local · ⛔ staging/backup | `v1-compat` (5 teste), `schema-drift`, `rollback` verzi; neaplicate pe un mediu online; backup producție neefectuat |
| G6 | Conținut revizuit de specialist | ⛔ | 0 rețete cu revizie semnată; lotul 1 (26) pregătit; poarta de conținut testată (build live = 0 rețete afișate) |
| G7 | Fără afirmații nejustificate | ✅ V2 · ⚠️ V1 | copy V2 verificat și dependent de mod; V1: „aprobate de nutriționiști” + testimonial — decizie fondator |
| G8 | Telefon fizic + desktop | ⚠️ desktop/emulat ✅ · telefon ⛔ | capturi 390/1440 fără depășiri și fără erori de pagină (`review-pack/captures.json`); telefonul real nu a fost testat |
| G9 | Analytics + confidențialitate | ✅ local · ⛔ politica de confidențialitate | allowlist + teste DB; mențiunea în politică lipsește |
| G10 | Monitorizare | ⚠️ | Vercel/Supabase logs disponibile; runbook de verificare în ARCHITECTURE §7; fără alertare |
| G11 | Costuri cunoscute | ⚠️ | estimate în ARCHITECTURE §7 și BACKLOG; neaprobate |
| G12 | V1 funcționează după migrații | ✅ local · ⛔ producție | patch `b12b652` testat pe ambele scheme; nepublicat |
| G13 | Acces controlat la beta | ✅ local | test HTTP pe build de producție: fără cod → 307 `/acces-beta`; cod greșit → eroare; cod corect → cookie HttpOnly+Secure → 200; `noindex` pe `/v2` și `/acces-beta` |

## Rezultatele rulării finale (`tests/final/SUMMARY.txt`)

| Verificare | Rezultat |
|---|---|
| Build Next.js (backend nativ) | PASS |
| TypeScript | PASS |
| Lint V2 | PASS, 0 probleme |
| Lint întreg repository | 46 erori + 29 avertismente — identic cu baza legacy |
| Unit / SQL / HTTP / Auth | **95/95** (82 anterioare + 13 noi: compatibilitate V1, drift, poartă editorială, invitații) |
| E2E Playwright | prima rulare 107/108: testul `readiness` aștepta canonical `http://127.0.0.1:3100/…` — exact defectul C5 corectat; aserțiunea actualizată la `https://www.diversibebe.com/v2/cont` (nu ștearsă); rerulare completă **108/108** |
| Poarta de invitație (HTTP real) | PASS |
| `/api/chat` anonim | 401 |

## Blocaje reale rămase

| # | Blocaj | Acțiune precisă | Efort | Cine / aprobare |
|---|---|---|---|---|
| 1 | Conținut neaprobat clinic | trimite `REVIEW-PACKAGE.md` + foaia CSV unui pediatru/dietetician; agentul transcrie rezultatul în `editorial.ts` | 10–13 h specialist, 4–6 h agent; ~1.500–3.500 lei | fondator (cost) |
| 2 | Lipsește staging online | alege A (pauzezi `Nuo`, proiect Free nou) sau B (Supabase Pro); agentul aplică migrațiile și rulează E2E pe Vercel Preview | 6–9 h | fondator |
| 3 | Patch V1 nepublicat | push `hotfix/v1-v2-schema-compat` → PR → merge → verificare live | 1–2 h | fondator (push/merge) |
| 4 | Fără backup al producției | `pg_dump` cu parola bazei, păstrat local criptat | 1 h | fondator (parola) |
| 5 | Auth online | SMTP Resend + Redirect URLs `/v2/**` în Supabase | 1–2 h | fondator |
| 6 | Telefon fizic | checklist G8 pe iOS Safari și Android Chrome | 1–2 h | fondator |
| 7 | Politica de confidențialitate | adaugă mențiunea despre evenimentele de produs (fără date personale) | 1 h | fondator |

Pentru **publicare**, pe lângă cele de mai sus: afirmațiile V1 (G7), Vercel Pro înainte de monetizare, Supabase Pro recomandat (backup, HIBP), cel puțin o săptămână de beta fără incidente.

## Ce s-a implementat în această etapă

- Compatibilitate V1/V2: test care demonstrează ruperea V1 (`42P10`), patch V1 separat, istoric V1 fără copil vizibil în V2 pentru familiile cu un copil, set unic de migrații, verificare de drift față de producție.
- Poarta de conținut: build-urile online afișează doar rețete publicate cu revizie umană semnată și legată de conținut; AI respins ca revizor; ID-uri nestocabile excluse.
- Beta privată cu cod de invitație (gratuit), metadate V2 cu domeniul real, `noindex`.
- Lotul editorial 1 (26 rețete), pachetul pentru specialist, manifestul celor 12 fotografii, pipeline-ul de import în carantină cu WebP responsive și aprobare umană.
- UX: notă de siguranță unică pe rezultate, spațiere titlu, texte de încredere corecte în ambele moduri.
- Documentație `docs/ai-ops/` pentru continuarea fără reaudit.

## Pachetul de capturi pentru review

`outputs/release-2026-11-03/review-pack/` — 13 ecrane × mobil/desktop, sesiune de vizitator, fără date personale (capturi „înainte”: `captures-before/`).
