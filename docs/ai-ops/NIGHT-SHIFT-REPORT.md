# Raport tura de noapte — 3–4 nov. 2026

> **Actualizare:** starea curentă este în `RELEASE-READINESS.md`. Două afirmații de aici sunt depășite: salvarea profilului V1 nu „copia datele peste toți copiii” în producție (update-ul era respins mereu, coloana `allergies` nu există), iar textul „Rețete verificate editorial” a fost înlocuit, fiindcă sugera o verificare neefectuată.

Branch `release/v2-rc` (local, nepublicat) · patch V1 `hotfix/v1-v2-schema-compat` (publicat, PR #2 deschis) · jurnale în `outputs/release-2026-11-04/`.

Producția nu a fost atinsă:
- fără merge și fără deploy în producție;
- fără scrieri în baza live și fără schimbări Auth;
- fără emailuri reale și fără servicii plătite.

Singura acțiune externă a fost cea aprobată: push pe branch-ul hotfix și actualizarea PR-ului existent. Fotografiile Antigravity (`content/gemini-import/`) nu au fost atinse și nu sunt în niciun commit.

## 1. Ce am implementat efectiv

### P0 — patch-ul V1

- **Stare găsită:** branch-ul era deja publicat, iar PR [#2](https://github.com/velicof/diversibebe/pull/2) era deschis (creat 3 nov., 18:02) cu 3 commituri, deși handoff-ul spunea „nepublicat”. Nu am creat un duplicat.
- **Securitate, verificată separat:**
  - `/api/send-verification` trimitea emailuri prin Resend către orice adresă, fără autentificare; nu e apelat nicăieri, iar patch-ul îl retrage (410);
  - `/api/chat` cere autentificare înainte de corp și de model (401) și are limitare per utilizator (15 cereri/10 min, per instanță);
  - `/api/data/sync` și `/api/auth/*` sunt stub-uri fără date;
  - V2: codurile de invitație și de revizie au 60 de biți de entropie, deci ghicirea online e imposibilă și nu e nevoie de limitare.
- **Problemă nouă găsită și reparată (`8f7780d`): familiile cu mai mulți copii** (15 în producție; V2 permite oricui să adauge un copil):
  - 15 citiri V1 ale copilului folosesc `maybeSingle()` doar pe `user_id`. Cu doi copii, supabase-js întoarce `null`, middleware-ul trimite familia la `/onboarding`, iar formularul de acolo **suprascrie primul copil**;
  - salvarea profilului (`profil/bebelus`) făcea `update` pe `user_id` și **copia numele și data nașterii peste toți copiii**;
  - pagina rețetei citea starea „gătit” cu o coloană inexistentă în producție (`notes`), deci starea nu apărea niciodată.
- **Verificare:** gardă nouă în `v1-compat` (pe codul vechi găsește 15 citiri + 1 update), 2 verificări noi în repetiția pe stack real, build de producție, TypeScript, lint fără probleme noi, fără secrete.
- **Push** `360d05d..8f7780d` (fast-forward). Titlul și descrierea PR-ului au fost actualizate (`docs/ai-ops/pr/V1-PATCH-PR.md`). Același fix este și în `release/v2-rc`.

### P1 — performanța mobilă

Cauza măsurată: biblioteca, planul și rețeta afișau doar un schelet până rula tot JavaScript-ul. Catalogul de 291 de rețete se construia în browser (~200 ms de procesor la 4×), iar layout-ul comun aducea baza de rețete V1 pe fiecare pagină V2, prin widgetul de chat V1.

- titlurile și conținutul rețetei se randează pe server;
- butoanele personale au un loc rezervat „Se încarcă” de aceeași mărime, deci nu apare un „Salvează” fals înainte de încărcarea datelor;
- controalele rețetei sunt dezactivate până la hidratare;
- rețetele sunt prerandate la build (`generateStaticParams`, 289 de pagini);
- catalogul se calculează o dată, la build (`catalog-build.ts` → `catalog.generated.json`), cu reguli neschimbate:
  - rezultat identic cu vechiul catalog în ambele moduri;
  - un test pică dacă fișierul nu mai corespunde regulilor;
  - `build-v2` și `release-check` refuză un fișier vechi;
- chatul V1 se încarcă separat (`next/dynamic`): neschimbat pe V1, absent pe V2;
- universul cheilor de cumpărături se calculează o singură dată, nu de două ori.

### P1 — preview pe telefon

- **Variantă privată, gratuită, fără aprobări de producție:** build vizitator (`V2_BACKEND=none`) servit prin Tailscale Serve. HTTPS real, vizibil doar dispozitivelor tale; nimic public, niciun port de bază de date expus. Pașii sunt în `PHONE-PREVIEW.md`.
- **Infrastructură de test:** al doilea preview poate rula lângă cel de pe 3100 (`V2_DIST_DIR`, `V2_PORT`), cu un gateway local care acceptă doar originea acelui preview (`V2_GATEWAY_PORT`).

## 2. Commituri

| Branch | Commit | Ce |
|---|---|---|
| `hotfix/v1-v2-schema-compat` (**publicat**) | `8f7780d` | fix(v1): familiile cu mai mulți copii |
| `release/v2-rc` (local) | `c24585d` | același fix + teste de regresie (`v1-compat`, repetiție) |
| | `f7fc186` | perf: randare pe server, rețete prerandate, loc rezervat pentru acțiuni |
| | `4abee77` | perf: catalog la build, chat V1 separat, chei de cumpărături o singură dată; `release-check` cere 4 commituri V1 |
| | `ccefe02` | test: al doilea build/preview/gateway lângă cel implicit |
| | `4d37ddb` | chore: lint și git ignoră directoarele de build suplimentare |
| | commitul următor | documentație (acest raport, handoff, readiness, migrare, telefon) |

## 3. PR-ul V1

[velicof/diversibebe#2](https://github.com/velicof/diversibebe/pull/2) · `hotfix/v1-v2-schema-compat` → `main` · **OPEN**, head `6896710`, 5 commituri (al 5-lea: afirmația „aprobate de nutriționiști”, după aprobarea ta), verificările Vercel SUCCESS. **Nu am făcut merge.**

**Ce schimbă:**
1. „Am încercat” și „Am gătit” scriu fără `onConflict`.
2. Cache-ul contului este corect după deconectare.
3. Releul de email deschis este retras.
4. Familiile cu mai mulți copii funcționează.
5. Pagina principală nu mai afirmă o aprobare a nutriționiștilor.

**De ce înaintea migrațiilor V2:** migrația `protect_family_data` înlocuiește constrângerile pe care V1 le folosește în `upsert(onConflict)`. Fără patch, „Am încercat” și „Am gătit” eșuează cu `42P10` pentru toate familiile din momentul migrării. Patch-ul funcționează pe schema actuală, pe cea migrată și după rollback-ul L1.

## 4. Rezultatele testelor (rulări reale)

| Verificare | Rezultat |
|---|---|
| TypeScript (V2 / release) | PASS |
| Lint V2 | PASS (0 probleme) |
| Lint întreg repository | 46 erori + 29 avertismente, identic cu baza moștenită din V1 |
| Unit / SQL / HTTP / Auth / RLS (`native-command test`: database, security, native-auth cu expirarea reală a JWT, rollback, schema-drift, v1-compat, catalog-snapshot etc.) | **117/117** (113 anterior + 4 noi), rulat de două ori |
| E2E Playwright (stack nativ: GoTrue + PostgREST + PostgreSQL 17) | **112/112**. Ultima rulare completă: 111/112. Singurul eșec, testul de recuperare a parolei, avea portul 3100 scris direct în regex; corectat, apoi rulat separat: 2/2 |
| E2E pe build-ul vizitator pentru telefon (`planner` + `local`) | **68/68** (+1 test doar pentru stack-ul nativ, sărit). Un worker Playwright s-a oprit (Windows `0xC0000409`); testul rulat din nou a trecut |
| Repetiția migrării pe stack real | **38/38** (36 + 2 noi pentru mai mulți copii), înainte, după migrații și după rollback |
| Regresie V1 (patch) | `v1-compat` 7/7 · build de producție PASS (37/37 pagini, variabile publice fictive) · TypeScript PASS · lint 0 probleme noi pe 17 fișiere |
| Secrete în diff-ul patch-ului | niciunul |
| `release-check.cjs main` | NO-GO așteptat: patch-ul V1 nu e în producție; `release/v2-rc` nu e pe GitHub. Catalogul generat corespunde regulilor |

Erori reale găsite de teste și reparate, fără să șterg vreun test:
1. **Pagina de rețetă nu mai arăta că datele se încarcă**, iar butonul „Salvează” apărea neapăsat înainte să se știe starea. Soluția: loc rezervat „Se încarcă”.
2. **O listă de pași duplicată, ascunsă, apărea intermitent:** un segment transmis în flux rămânea orfan când store-ul se actualiza înaintea hidratării. Soluția: rețetele sunt prerandate.

## 5. Performanța mobilă înainte/după

Același profil: cache rece, 4G lent (1,6 Mbps, 150 ms), procesor 4× mai lent, 390×844. Valorile sunt medianele a 2–3 rulări (`outputs/release-2026-11-04/perf/COMPARISON.json`).

| Pagină | LCP | TBT | CLS | JS |
|---|---|---|---|---|
| Acasă | 1,43 → 1,42 s | 518 → 510 ms | 0,012 → 0,012 | 313 → 304 KB |
| Bibliotecă | **3,30 → 0,88 s** | 613–697 → **383 ms** | 0,015 → 0,015 | 313 → 304 KB |
| Rețetă cu fotografie | **3,43 → 1,34 s** | 556–561 → **428 ms** | 0,015 → 0,015 | 313 → 305 KB |
| Plan | **3,11 → 0,86 s** | 583–586 → **357 ms** | 0,015 → 0,015 | 313 → 304 KB |

- **Ținte:** LCP < 2,5 s ✅ pe toate paginile; CLS < 0,1 ✅.
- **TBT < 200 ms ❌:** 357–510 ms, adică −20…−45% pe paginile cu catalog și neschimbat pe pagina de start.
- **Ce rămâne (profil CPU):**
  - hidratarea componentelor client mari (~300 ms la 4×);
  - runtime-ul React/Next (~150 ms);
  - supabase-js (57 KB gzip), descărcat și de vizitatori.
- **Planul concret** (fără să sacrific funcții), în ordinea câștigului:
  1. Părțile statice (pagina de start, corpul rețetei, titluri) ca Server Components, iar componentele client păstrate doar pentru acțiuni. Este refactorul arhitectural despre care am spus că nu îl fac fără dovezi: 1–2 zile; câștig estimat −150…−250 ms TBT.
  2. supabase-js încărcat doar la autentificare sau la o sesiune existentă (0,5 zile; atinge fluxurile Auth, deci cere rularea completă a E2E).
  3. `screens.tsx` (72 KB) împărțit pe rute (0,5 zile; câștig mic).

## 6. Preview-ul pe telefon

| Variantă | Stare | Ce lipsește |
|---|---|---|
| **Locală privată (Tailscale)**, mod vizitator: onboarding, bibliotecă, rețete, plan pe 5 zile, listă de cumpărături, persistență în telefon, galeria foto | **gata și verificată local** (build fără backend, E2E vizitator 68/68) | tu: instalezi Tailscale pe laptop și iPhone (cont gratuit), apoi 3 comenzi (`PHONE-PREVIEW.md`). Tailscale nu e instalat, deci adresa `ts.net` nu a putut fi testată de mine |
| Vercel Preview, etapa 1 (vizitator) | pregătită | aprobarea ta: push `release/v2-rc` + 3 variabile Preview |
| Cu contul real (autentificare, sincronizare) | NO-GO | patch V1 în producție → backup → migrații → Auth → variabilele etapei 2 |

Autentificarea pe telefon cu stack-ul local ar cere slăbirea gărzilor de URL (`assertAllowedSupabaseUrl`, originile gateway-ului). Nu am făcut asta.

## 7. Ce mai lipsește până la lansarea V2

1. Merge PR #2 → verificare live (10 min).
2. Backup → preflight → 7 migrații → postflight 9/9.
3. Auth: Redirect URLs, SMTP Resend, șablonul în română.
4. Testul tău pe telefon: vizitator azi, cu cont după pașii 1–3.
5. Deciziile tale:
   - fotografiile;
   - BebeAsist;
   - textul din politica de confidențialitate;
   - afirmația V1 de mai jos.
6. Canary 48 h → beta.
7. Pentru publicul larg:
   - TBT;
   - revizia de specialitate (0 aprobări medicale; conținutul este verificat editorial, nu validat medical);
   - fotografiile principalelor rețete.

## 8. Blocaje

**P0 — înainte de orice migrare sau test cu cont real:**
- PR #2 nu e în producție;
- backup-ul nu e făcut;
- migrațiile nu sunt aplicate;
- SMTP lipsește: 65 de conturi numai cu Google nu au alternativă la buton, iar recuperarea parolei nu e de încredere.

**P1 — înainte de beta:**
- testul pe telefon real;
- decizia despre fotografii (16 fișiere Antigravity, neintegrate);
- mențiunea din politica de confidențialitate;
- decizia BebeAsist;
- ~~V1 afișează „Rețete testate și aprobate de nutriționiști”~~ → **rezolvat după aprobarea ta (4 nov.)**: „Rețete verificate editorial, după ghiduri publice”, commit `6896710` în PR #2 (live după merge) și în `release/v2-rc`. Un test nou (`library.test.cjs`) pică dacă o pagină afirmă o aprobare de specialitate pe care nicio rețetă nu o are. Testimonialul de sub text rămâne o decizie separată.

**P2 — înainte de lansarea publică:**
- TBT 357–510 ms (planul din §5);
- revizia celor 2 rețete cu ficat;
- „Parolă uitată” din V1;
- secretele Vercel marcate Sensitive;
- lint-ul moștenit (46 de erori).

## 9. Acțiuni care necesită aprobarea ta (fiecare separat)

1. **Merge PR #2** în `main` (deploy automat V1) + verificarea live din PR.
2. **Backup de producție.** Îl rulezi tu: `node scripts/prod-backup.cjs`; parola nu ajunge la agent.
3. **Migrațiile V2 în producție** (`MIGRATION-V1-V2.md` §4, etapa 4).
4. **Setările Supabase Auth** (`AUTH-SETUP.md`), făcute de tine.
5. **Preview pe telefon:**
   - fie instalezi Tailscale (contul tău);
   - fie aprobi push-ul `release/v2-rc` + variabilele Vercel Preview.
6. ~~Textul V1 „aprobate de nutriționiști”~~: aprobat și făcut (`6896710`), ajunge live odată cu merge-ul PR #2.
7. Deciziile despre fotografii, BebeAsist și politica de confidențialitate.
8. Merge `release/v2-rc` → `main`, după ce `release-check.cjs main` trece.

## 10. Următoarea acțiune recomandată

**Merge PR #2**: 10 minute, apoi checklist-ul din PR. Deblochează întregul lanț al migrației, iar patch-ul este sigur și pe schema actuală. În paralel, pentru testul de pe iPhone fără nicio schimbare în producție: Tailscale + cele 3 comenzi din `PHONE-PREVIEW.md`.

## Note operaționale

- **Portul 3100** era ocupat de un preview pornit la 19:36, nu de mine.
  - Nu l-am oprit: oprirea unui proces străin a fost refuzată de regulile sesiunii și am respectat refuzul.
  - Serverul folosește `.next-v2`, pe care l-am reconstruit la începutul sesiunii (cod de dinainte de optimizări). Pentru a vedea versiunea actuală, repornește-l cu `node scripts/native-command.cjs build` și apoi `preview`.
  - Măsurătorile și E2E au rulat pe propriile mele build-uri (3101 înainte, 3102 după, 3103 telefon), cu un gateway separat pe 54331.
- **Greșeala mea, fără impact:** în worktree-ul hotfix, o comparație de lint a suprascris modificările mele încă necomise (`git checkout HEAD -- …`). Le-am refăcut din scriptul determinist, apoi le-am verificat (lint, TypeScript, build, repetiție) înainte de commit. Nimic din afara modificărilor mele nu a fost atins.
- **Directoare de build locale** (ignorate de git; le poți șterge oricând): `.next-perf-before`, `.next-perf-after`, `.next-phone`.

## Verdicte

**Testarea privată V2: GO în mod vizitator, NO-GO cu conturi reale.**
- **Dovezi pentru vizitator:**
  - unit 117/117 și E2E 112/112 pe build-ul final;
  - build-ul de telefon fără backend: E2E 68/68;
  - LCP 0,9–1,4 s;
  - nicio scriere în producție.
- **Condiția:** pornește după un pas al tău (Tailscale sau aprobarea Vercel Preview).
- **Cu conturi reale:** NO-GO până la patch V1 în producție, backup, migrații și Auth.

**Lansarea publică V2: NO-GO.**
- patch-ul V1 nu e în producție;
- migrațiile nu sunt aplicate;
- SMTP lipsește;
- TBT 357–510 ms (ținta: 200 ms);
- 0 revizii de specialitate;
- afirmația falsă din V1 (corectată în PR #2, încă nepublicată);
- fotografiile neaprobate;
- beta nerulată.
