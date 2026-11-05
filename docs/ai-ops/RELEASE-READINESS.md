# Release readiness — DiversiBebe 2.0

Evaluare: 5 nov. 2026 · branch `release/v2-rc` · verificări automate: `node scripts/release-check.cjs` · jurnale: `outputs/release-2026-11-04/` și `outputs/release-2026-11-05/`.

Rețetele nu sunt validate medical: trec prin verificări automate și corecturi notate, fără revizie de specialitate.

## Decizie pe etape

| Etapă | Decizie | Ce lipsește (doar blocaje reale) |
|---|---|---|
| **1. Test privat pe telefon, mediu local izolat, cu cont de test** | **GO** după un pas al tău | Testul tău pe iPhone (`PHONE-PREVIEW.md`). Agentul a rulat WebKit pe Windows, nu Safari real |
| **2. Testare cu contul fondatorului** (Preview, proiectul comun) | **NO-GO** | backup verificat · migrații + postflight · Auth (Redirect URLs, SMTP, șablon) · push `release/v2-rc` + variabile Preview |
| **3. Beta restrânsă** (familii invitate, cod de invitație) | **NO-GO** | etapa 2 trecută · deciziile despre fotografii și BebeAsist · mențiunea din politica de confidențialitate · merge `release/v2-rc` → `main` |
| **4. Lansare publică** | **NO-GO** | beta fără incidente · decizia despre revizia de specialitate · fotografii pentru rețetele principale · confirmarea performanței pe conturi reale |

## Ordinea exactă de lansare

Fiecare pas cere aprobarea ta și se oprește dacă verificarea lui pică.

| # | Pas | Cine | Verificare | Înapoi |
|---|---|---|---|---|
| 0 | Test privat pe iPhone (`PHONE-PREVIEW.md`) | tu | checklist-ul din document | — |
| 0b | Vizitator → cont: „Conectează-te” vizibil, invitația după primul plan, adăugare în cont doar după „Adaugă în cont” | tu | `PHONE-PREVIEW.md` | — |
| 1 | **Merge PR [#2](https://github.com/velicof/diversibebe/pull/2)** → deploy V1. **Făcut 5 nov.: live `9c56e83`.** Partea publică verificată; contul real rămâne de verificat | agent, cu aprobare | checklist „După merge” din PR | Vercel Instant Rollback la `db14a4c` (`dpl_z6E6xAaCN17TEq2goKUmkjJgV9EQ`) |
| 2 | **Backup** (`BACKUP-RUNBOOK.md`): baza de date și fișierele din Storage | tu; parola nu ajunge la agent | „Storage: 7/7” și „restore check: all 12 tables” | — |
| 3 | Preflight (`v2-preflight.sql`, read-only) | agent, cu aprobare | 5 × 0 anomalii; numărul de rânduri notat | — |
| 4 | **Cele 8 migrații** (`supabase/v2-release.cjs`), în ordine, la oră cu trafic minim | agent, cu aprobare | postflight 9/9, același număr de rânduri, advisors fără ERROR, V1 smoke | L1 `v2-disable.sql` (testat); L3 backup |
| 5 | **Auth** (`AUTH-SETUP.md`): Redirect URLs, SMTP Resend, șablon | tu, cu ghidaj. Nu activa „Confirm email” | email de recuperare primit | revii la setarea anterioară |
| 6 | Push `release/v2-rc` + variabile Preview (etapele 1 și 2 din `PHONE-PREVIEW.md`) | agent, cu aprobare | build Vercel; cont real pe telefon: email, Google, recuperare, izolare între 2 conturi | ștergi deployment-ul |
| 7 | Deciziile tale: fotografii, BebeAsist, text confidențialitate | tu | `photos/VISUAL-REVIEW-20261104.md`; `PRIVACY-AND-MONITORING.md` | — |
| 8 | `node scripts/release-check.cjs main` → merge `release/v2-rc` → `main`; `/v2` rămâne ascuns după cod | agent, cu aprobare | canary 48 h cu contul tău (`MIGRATION-V1-V2.md` §5); erori runtime 0; V1 neafectat | Instant Rollback; L1 |
| 9 | Beta: 10–20 familii, coduri `scripts/invite-codes.cjs` | tu | `v2-product-metrics.sql`; zero incidente, 1–2 săpt. | scoți hash-urile |
| 10 | Deschidere: `V2_ACCESS=public` | decizie separată | criteriile din etapa 4 | scoți variabila → redeploy |

**Costuri:** 0 lei până la pasul 9. Supabase Pro (backup zilnic) și Vercel Pro (obligatoriu la monetizare) rămân decizii separate.

## Blocaje reale

**P0 (înaintea oricărei migrații):** verificarea V1 cu un cont real · fără backup · migrații neaplicate · fără SMTP (65 de conturi numai cu Google nu au alternativă la buton, iar recuperarea nu e de încredere).

**P1 (înainte de beta):**
- testul pe iPhone real (WebKit verificat automat, Safari real nu);
- un cont cu sesiune salvată, la o eroare trecătoare de sincronizare, vede „Explorezi fără cont” și poate salva doar local: mesaj greșit, de reparat împreună cu o reîncercare automată;
- măsurarea conversiei vizitator → cont: evenimentele vizitatorului rămân pe dispozitiv, deci rata nu se vede online. Un eveniment agregat ar cere o migrație și o decizie;
- deciziile despre fotografii (3 de regenerat, 5 versiuni de ales);
- mențiunea din politica de confidențialitate;
- BebeAsist: rămâne oprit în V2? Promptul din V1 încă îi cere să se bazeze pe „OMS și Societatea Română de Pediatrie”: dacă rămâne activ, promptul trebuie reformulat;
- Google OAuth și recuperarea parolei pe telefon: testabile doar pe proiectul real.

**P2 (înainte de public):**
- încărcarea rece cu cont: bibliotecă ~4,5 s pe GoTrue local (lent, ~570 ms per cerere). De remăsurat pe proiectul real;
- revizia de specialitate pentru cele 2 rețete cu ficat (altfel rămân nepublicate) și decizia despre revizia generală;
- „Parolă uitată” din V1;
- widgetul de chat V1 acoperă mijlocul butonului de salvare a profilului pe telefon (partea stângă rămâne activă);
- secretele Vercel marcate Sensitive; lint-ul moștenit din V1 (46 de erori).

## Performanță (laborator: cache rece, 4G 1,6 Mbps / 150 ms, CPU 4×, 390×844)

Ținte: LCP < 2,5 s, TBT < 200 ms, CLS < 0,1. Mediane din 3 rulări (`outputs/release-2026-11-04/perf/`), vizitator.

| Pagină | LCP inițial → acum | TBT inițial → acum | CLS | JS |
|---|---|---|---|---|
| Acasă | 1,4 → **1,4 s** | 518 → **161 ms** | 0,012 | 313 → 257 KB |
| Bibliotecă | 3,3 → **2,4 s** | 697 → **122 ms** | 0 | 313 → 251 KB |
| Rețetă cu fotografie | 3,4 → **1,3 s** | 561 → **189 ms** | 0 | 313 → 251 KB |
| Plan | 3,1 → **0,9 s** | 586 → **129 ms** | 0 | 313 → 250 KB |

Transfer total pe bibliotecă: 474 → 327 KB. Navigare în aplicație: bibliotecă → rețetă 150–380 ms, schimbare de tab ~110 ms.

**Cu cont** (GoTrue local): revenire, cu JS în cache: bibliotecă ~2,1 s, plan ~0,3 s. Încărcare rece: bibliotecă ~4,5 s, plan ~0,7 s. TBT ≤ 139 ms, CLS 0,007. Pe proiectul real trebuie remăsurat.

Ce a schimbat cifrele (dovezi: profil CPU atribuit prin source maps, `V2_SOURCE_MAPS=1`):
1. conținutul personalizat se randează cu `useDeferredValue`: starea vine printr-un store sincron, care făcea din toată pagina o singură sarcină lungă;
2. supabase-js (57 KB gzip) se încarcă doar cu o sesiune stocată sau la autentificare;
3. fontul: TTF 240 KB → WOFF2 30 KB (latin + română);
4. cardurile și linkurile secundare nu mai fac prefetch pe conexiunea de telefon;
5. catalogul, cheile de cumpărături și scorurile de sezon se calculează la build; randările repetate sunt evitate.

**Nu a fost nevoie de refactorul la Server Components.** Fotografiile responsive erau deja în regulă (`srcset`, 800w sub 45 KB).

## Pregătire pentru monetizare (fără plăți)

- **Free/Plus** declarate în `src/features/v2/plans.ts`; informațiile de siguranță sunt mereu gratuite (test). Nimic nu este blocat; nu există cod de plată (test).
- **Măsurători:** întrebare de preț la 19, 24, 29 lei sau „Nu aș plăti” (`premium_interest.price`) · `shopping_item_checked` (lista folosită, nu doar deschisă) · `shopping_list_generated` · `meal_added_to_plan` · `return_session`.
- **Citire:** `supabase/operations/v2-product-metrics.sql` (read-only, doar agregate, conturile de test excluse, grupurile sub 5 persoane ascunse).
- **Date sensibile:** evenimentele păstrează doar numere (`count`, `elapsedMs`, `price`); numele, alergiile și textul liber sunt eliminate în aplicație și refuzate de baza de date (test).

## Gate-uri (dovezi)

| # | Condiție | Stare | Dovadă |
|---|---|---|---|
| G1 | Fără vulnerabilități critice | ✅ | `npm audit` 0; ruta de email și redirectul din callback corectate, live din 5 nov. (`/api/send-verification` răspunde 410) |
| G2 | Izolare între familii | ✅ local | `scripts/access-attack.cjs` 46/46 pe adresa privată: anonim, fără credențiale, token fals, `alg none`, service role fals, token expirat, altă familie. Catalog: rolul anonim nu are niciun drept pe tabele sau funcții. Se repetă pe proiectul real după migrații |
| G3 | Fluxuri E2E | ✅ local · ⏳ cont pe iPhone real | E2E 128/128 (5 nov.), inclusiv `guest.spec` și `guest-account.spec`; `phone.spec` 3/3 pe WebKit și pe Chromium, prin adresa reală. Fondatorul a folosit V2 pe iPhone real, ca vizitator. Instabilitate deschisă: `cloud.spec` a picat o dată („Nu am putut sincroniza datele”), apoi a trecut de 27 de ori din 27, inclusiv sub CPU plin. Cauză negăsită: în acel moment, `/user` a răspuns în 5,8 s, nu în ~0,5 s. Testele păstrează acum urma de rețea la eșec |
| G4 | Backend online | ⏳ pasul 6 | — |
| G5 | Migrații și rollback | ✅ local | repetiție pe stack real 38/38, 8 migrații |
| G6 | Conținut | ✅ automat · ⏳ specialitate | 289 publicabile, 2 în coada de specialitate, 0 aprobări medicale |
| G7 | Afirmații | ✅ live pe V1 | testimonialul și afirmațiile fără dovezi eliminate; gardă în `library.test`; V2 descrie verificările ca automate |
| G8 | Telefon | ⏳ pasul 0 | `PHONE-PREVIEW.md` |
| G9 | Analytics și confidențialitate | ✅ cod · ⏳ text public | `monetization.test`; `PRIVACY-AND-MONITORING.md` |
| G10 | Monitorizare | ✅ plan cost 0 | idem, §3 |
| G11 | Costuri | ✅ 0 lei | — |
| G12 | V1 după migrații | ✅ local · ⏳ după migrații | `v1-browser-check` 40/40 pe codul live, reluat înaintea merge-ului; codul vechi pică același test |
| G13 | Acces controlat | ✅ | poartă fail-closed verificată prin HTTP în modul de producție: fără cod sau cu cod greșit → `/acces-beta`; codul de invitație nu deschide consola de revizie; `check-v2-boundary` (404 fără flag) |
| G14 | Fotografii | ✅ pipeline · ⏳ decizia ta | versiuni `-vN`; `photos/VISUAL-REVIEW-20261104.md`; 0 aprobate automat |
| G15 | Performanță mobil | ✅ vizitator · ⏳ cont real | tabelul de mai sus |

## Conturile (read-only, 3 nov., `v2-accounts-check.sql`)

435 de conturi, 0 șterse sau blocate, toate cu profil, 0 emailuri duplicate; 370 cu parolă, 65 numai cu Google. La prima intrare în V2, etapa copilului se calculează din data nașterii (verificat pe un cont cu copil creat ca în V1).
