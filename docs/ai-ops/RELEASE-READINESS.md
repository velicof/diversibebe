# Release readiness — DiversiBebe 2.0

Evaluare: 3 nov. 2026 · branch `release/v2-rc` · verificări automate: `node scripts/release-check.cjs` · jurnale: `outputs/release-2026-11-03/tests/`.

## Decizie pe etape

| Etapă | Decizie | Ce lipsește (doar blocaje reale) | Durată după aprobare |
|---|---|---|---|
| **1. Preview privat, date sintetice (mod vizitator)** | **GO tehnic**, așteaptă un pas al tău | fie Tailscale pe laptop + iPhone (varianta locală privată, fără aprobări de producție), fie A. push `release/v2-rc` · B. 3 variabile Preview (`PHONE-PREVIEW.md`) | ~10–30 min |
| **2. Testare cu contul fondatorului** (același Preview, proiectul comun) | **NO-GO** până la 4 acțiuni ale tale sau aprobate de tine | 1. patch V1 în producție · 2. backup verificat · 3. migrații V2 + postflight · 4. Auth (`AUTH-SETUP.md`: Redirect URLs, SMTP Resend, șablon); apoi 3 variabile Preview în plus | ~½ zi de lucru + 48 h de test |
| **3. Beta restrânsă** (familii invitate, `www.diversibebe.com/v2`, cod de invitație) | **NO-GO** | etapa 2 trecută · decizia ta despre fotografii (candidații nu se publică până nu decizi) · mențiunea din politica de confidențialitate · decizia BebeAsist · merge `release/v2-rc` → `main` (`release-check.cjs main` trebuie să treacă) | ~1 zi + 1–2 săpt. de beta |
| **4. Lansare publică** | **NO-GO** | beta fără incidente · performanță mobil la prag (LCP < 2,5 s ✅ 0,9–1,4 s; TBT < 200 ms ❌ 357–510 ms) · afirmația V1 „aprobate de nutriționiști” (`HomeClient.tsx:217`) · fotografii pentru rețetele principale · revizia de specialitate pentru cele 2 rețete cu ficat (sau rămân nepublicate) · afirmațiile V1 („aprobate de nutriționiști”) · Vercel Pro (20 USD/lună) **doar dacă** apar plăți/monetizare | 2–4 săpt. |

**Cât mai avem până la prima versiune V2 publicabilă (beta pe `www`):**
- **Tehnic:** aproximativ 1,5 zile de lucru, toate gratuite.
- **Calendaristic:** depinde de aprobările tale și de cele 48 h de test cu contul tău, realist **4–7 zile**.

## Gate-uri (dovezi)

| # | Condiție | Stare | Dovadă |
|---|---|---|---|
| G1 | Fără vulnerabilități critice | ✅ local · ⚠️ producție | advisors 0 ERROR; **releul de email deschis din V1 e retras în patch** (PR #2 deschis, fără merge, 4 nov.); `/api/chat` cere autentificare + limită per utilizator; codurile V2 au 60 de biți |
| G2 | Izolare între familii | ✅ | RLS: PGlite + PostgREST real (401 pentru anonim, 409 pentru o referință străină) |
| G3 | Fluxuri E2E | ✅ local · ⏳ telefon | E2E 112/112 |
| G4 | Backend online | ⏳ etapa 2 | Preview + proiectul comun după migrații |
| G5 | Migrații și rollback | ✅ local | repetiție pe stack real **36/36** (toate căile de scriere V1, înainte, după migrații și după rollback) |
| G6 | Conținut | ✅ editorial | 289 publicabile, 2 în coada de specialitate, 0 aprobări medicale inventate |
| G7 | Afirmații | ✅ V2 · ⚠️ V1 | — |
| G8 | Telefon | ⏳ | checklist în `PHONE-PREVIEW.md` |
| G9 | Analytics și confidențialitate | ✅ cod · ⏳ text public | `PRIVACY-AND-MONITORING.md` (text propus) |
| G10 | Monitorizare | ✅ plan cost 0 | idem, §3 |
| G11 | Costuri | ✅ 0 lei | — |
| G12 | V1 după migrații | ✅ local · ⏳ producție | patch `8f7780d` (4 commituri, include familiile cu mai mulți copii): build de producție + TypeScript PASS, repetiție 38/38, `v1-compat` 7/7 |
| G13 | Acces controlat | ✅ | fail-closed; Vercel Authentication pe Preview; cod separat pentru revizie |
| G14 | Fotografii | ✅ pipeline · ⏳ decizia ta | 3 candidați integrați local; 9 fișiere noi de la Antigravity, neintegrate până la confirmarea ta |
| G15 | Performanță mobil | ⚠️ | 4 nov.: LCP **0,9–1,4 s** ✅, CLS < 0,02 ✅; TBT **357–510 ms** ❌ (ținta 200 ms; plan în `NIGHT-SHIFT-REPORT.md` §5) |

## Conturile (read-only, `v2-accounts-check.sql`)

- **435 de conturi:** 0 șterse sau blocate, toate cu profil, 0 emailuri duplicate.
- **370** cu parolă.
- **65** numai cu Google: pentru ele există butonul Google în V2, iar recuperarea parolei cere SMTP.

Toate conturile pot intra în V2 după etapa 2.
