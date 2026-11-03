# Migrarea V1 → V2 pe un singur proiect Supabase

Decizia fondatorului (3 nov. 2026): **un singur proiect Supabase** (`diversibebe`, `smyimgvxlggggjeoajdo`, Free) pentru V1 și V2. Fără proiect nou, fără pauzarea lui `Nuo`, fără costuri. Acest document înlocuiește opțiunile de staging din `ARCHITECTURE.md` §4.

Consecință: nu există un mediu online intermediar. Validarea se face pe **o copie locală izolată** (schema producției, dovedită identică, plus date sintetice cu forma producției). Apoi urmează un **canary în producție** limitat la contul fondatorului, ascuns după codul de invitație.

## 1. Ce știm despre producție (3 nov., metadate și agregate read-only, fără rânduri)

| | Valoare |
|---|---|
| Conturi | **435** (370 email + parolă, **65 Google**); toate au profil |
| Confirmarea emailului | **dezactivată** (toate conturile confirmate în < 5 s de la creare) |
| Familii | 409 cu un copil, 14 cu doi, 1 cu trei, 11 fără copil |
| Istoric V1 | `tried_foods` 4.695 (2.967 fără copil) · `food_journal` 1.176 (**toate** fără copil, 95 familii) · alergii 27 (toate fără copil, 17 familii) · favorite 38 · gătite 28 · rețete proprii 150 · alimente proprii 81 |
| Mărime | 17 MB |
| Activitate | 3 conturi autentificate în ultimele 30 de zile; ultima înregistrare: 25 sept. |
| Preflight | **0 anomalii** (proprietar copil, duplicate, rețete proprii) |
| Schemă | identică cu baza locală de test pe 8 categorii: coloane, constrângeri, indexuri, politici RLS, triggere, funcții, RLS, drepturi (`tests/schema-drift.test.cjs`) |
| Migrații aplicate | numai `close_user_login_summary` (P0); niciun obiect V2 |

## 2. Ce am rezolvat acum (cost 0, fără producție)

| # | Problemă găsită | Rezolvare | Dovadă |
|---|---|---|---|
| M1 | Baza de test nu avea 3 indexuri din producție; driftul verifica doar coloanele | indexurile adăugate; drift pe 8 categorii | `schema-drift` 2/2 |
| M2 | **Rollback incomplet**: `v2-disable.sql` lăsa apelabile 3 funcții V2 (`v2_save_journey`, `v2_edit_child`, `v2_mark_legacy_recipe`) | revocă toate funcțiile `v2_*` | `migration-rehearsal`, `rollback` |
| M3 | **V2 nu se putea conecta la producție**: clientul accepta numai `127.0.0.1`, formularul accepta numai adrese `@example.test` | V2 acceptă stack-ul local **sau exact proiectul V1** (`NEXT_PUBLIC_SUPABASE_URL`); restricția `@example.test` rămâne doar local | `release-gates` |
| M4 | **Texte de test pentru conturi reale**: „cont de test”, „DOAR CONTURI SINTETICE”, „mediul local de test” (≈ 30 de texte) | `accountCopy`: formulări pentru conturi reale când backend-ul e producția, etichetele de test rămân local | `release-gates` (niciun „test/sintetic/local” în modul real) |
| M5 | **Activarea V2 în producție scotea tot site-ul V1 din Google**: `robots.txt` bloca `/` când `DIVERSIBEBE_V2_PREVIEW=1` | blocare totală doar în afara Vercel Production | `release-gates` |
| M6 | Poarta beta era **fail-open**: fără `V2_INVITE_CODE_HASHES`, `/v2` devenea public | fail-closed în producție; deschiderea publică numai explicit (`V2_ACCESS=public`) | `release-gates` |
| M7 | 65 de conturi Google nu puteau intra în V2 (doar email + parolă) | „Continuă cu Google” (PKCE) afișat numai pe conturi reale | se verifică în canary (Google nu există local) |
| M8 | Fără backup verificat | `scripts/prod-backup.cjs`: `pg_dump` 17 (public + auth), AES-256-GCM, manifest cu numărul de rânduri, verificare prin restaurare locală | rulat pe baza locală sintetică: 12/12 tabele restaurate identic; parolă greșită respinsă |
| M9 | Fără verificare după migrare | `v2-postflight.sql` (9 verificări structurale + numărul de rânduri), `v2-preflight.sql` include numărul de rânduri | ambele rulate în repetiții |

## 3. Repetiția migrării (copia locală izolată)

Două niveluri, ambele pe schema producției, cu date **sintetice** de aceeași formă (435 conturi, 0/1/2/3 copii, istoric fără copil, jurnal cu o familie de 410 intrări, alergii). Generator determinist: `tests/fixtures/synthetic-production.cjs`.

| Verificare | PGlite (`tests/migration-rehearsal.test.cjs`, rulează la fiecare `npm test`) | Stack real: PostgreSQL 17 + GoTrue + PostgREST (`scripts/migration-rehearsal.cjs`) |
|---|---|---|
| Preflight 0 anomalii | ✅ | ✅ |
| Rândurile V1 identice octet cu octet după migrații (md5 pe toate cele 11 tabele) | ✅ | ✅ |
| `auth.users` neschimbat; conturile existente se autentifică | ✅ | ✅ (GoTrue real, JWT real) |
| Postflight 9/9 | ✅ | ✅ |
| Fiecare copil vede exact istoricul V1 promis (437 copii) | ✅ | ✅ (eșantion prin PostgREST) |
| RLS: familia vede doar rândurile ei; anonimul nu vede nimic | ✅ | ✅ (HTTP 401 pentru anonim) |
| Upsert-ul V1 nepatch-uit: merge înainte, eșuează după (`42P10`) | ✅ (`v1-compat`) | ✅ |
| V1 patch-uit după migrații: jurnal, „am încercat”, „am gătit”, favorite | ✅ | ✅ |
| Fluxul de înregistrare V1 (signUp → sesiune imediată → copil + alimente) | — | ✅ |
| Familie cu mai mulți copii: V1 citește primul copil; salvarea profilului schimbă doar copilul afișat (4 nov.) | ✅ (gardă pe cod, `v1-compat`) | ✅ |
| Cont nou deschis în V2 cu copilul lui | ✅ | ✅ |
| Planificator + confirmare V2 pe cont migrat | ✅ | ✅ |
| Email de recuperare a parolei (GoTrue → SMTP) | — | ✅ (Mailpit local) |
| Rollback `v2-disable.sql`: 0 rânduri V1 modificate, toate RPC-urile V2 închise, V1 funcționează, login funcționează | ✅ | ✅ |

Raport: `outputs/release-2026-11-03/rehearsal/REPORT.md`. Baza `diversibebe_rehearsal` este ștearsă la final.

## 4. Planul de lansare graduală (fiecare pas cu aprobarea ta separată)

| Etapa | Ce se întâmplă | Cine | Durată | Cum verificăm | Rollback |
|---|---|---|---|---|---|
| **1. Patch V1** | merge PR [#2](https://github.com/velicof/diversibebe/pull/2) `hotfix/v1-v2-schema-compat` (4 commituri peste producție: `b12b652` compatibilitate, `ef8b028` cache cont, `360d05d` retragerea releului de email, `8f7780d` familiile cu mai mulți copii). Branch-ul și PR-ul sunt publicate (4 nov.); rămâne doar merge-ul → deploy automat V1. Build de producție și TypeScript verificate local | agent (cu aprobare) | 1 h | live: jurnal, „am încercat”, „am gătit”, înregistrare; `get_runtime_errors` | Vercel Instant Rollback |
| **2. Backup** | `node scripts/prod-backup.cjs` în terminalul tău (parola bazei nu ajunge la agent), apoi `--verify … --restore-local` | tu | 20 min | „restore check: 12 tables identical” | — |
| **3. Preflight** | `supabase/operations/v2-preflight.sql` (read-only); notezi numărul de rânduri | agent | 5 min | 5 × 0 anomalii | — |
| **4. Migrațiile** | cele 7 fișiere din `supabase/v2-release.cjs`, în ordine, oră cu trafic minim; fiecare fișier e o tranzacție (eșec = nicio schimbare) | agent (cu aprobare) | < 1 min de execuție; 30 min cu verificări | `v2-postflight.sql` 9/9 + același număr de rânduri; advisors fără ERROR; V1 smoke | **L1** `v2-disable.sql` (testat) |
| **5. Auth** | exact ca în `AUTH-SETUP.md`: 3 Redirect URLs, SMTP Resend, șablonul de resetare în română. **Nu activa „Confirm email”** (vezi §6) | tu (cu ghidaj) | 30 min | email de recuperare primit | revii la setarea anterioară |
| **6. Vercel Preview** | push `release/v2-rc` → Preview (protejat de Vercel Authentication) + 3 variabile Preview limitate la branch; **fără** `NEXT_PUBLIC_V2_SUPABASE_*` (V2 în modul vizitator, nicio scriere în producție). Pașii și checklist-ul pentru telefon: `PHONE-PREVIEW.md`; configurația a fost simulată local | agent (cu aprobare) | 1 h | build reușit pe Vercel (`distDir` custom), fluxul vizitator, telefonul tău | ștergi deployment-ul |
| **7. Canary** | variabile Production + merge în `main`: `/v2` ascuns după invitație, **numai contul tău** (email și unul Google) timp de 48 h | agent + tu | 48 h | checklist §5; erori runtime 0; V1 neafectat | env → redeploy sau Instant Rollback; L1 |
| **8. Beta privată** | 10–20 familii invitate (coduri `scripts/invite-codes.cjs`) — **numai după revizia clinică** (fără ea V2 afișează 0 rețete) | tu | 1–2 săpt. | metrici `product_events`, zero incidente | coduri revocate (scoți hash-ul) |
| **9. Beta deschisă** | `V2_ACCESS=public` + link opțional din V1 („Încearcă noua versiune”) | agent (cu aprobare) | 2–4 săpt. | rata de erori, feedback | `V2_ACCESS` scos → redeploy |
| **10. V2 implicit** | decizie separată: `/` → V2 pentru conturile conectate; V1 rămâne accesibil | — | — | — | redeploy |

Vercel Hobby: Instant Rollback revine la deployment-ul de producție anterior; o variabilă de mediu schimbată intră în vigoare la următorul deploy.

## 5. Checklist canary (etapa 7, contul tău)

1. `/v2` fără cod → `/acces-beta`; cu cod → V2.
2. Login cu email + parolă: apar copiii tăi și alimentele din V1.
3. Login cu Google (un cont Google de test al tău): revine în `/v2/cont`, apoi `/v2/azi`.
4. Salvezi o idee, planifici 2 zile, bifezi lista de cumpărături, închizi, revii de pe telefon: totul e acolo.
5. În V1: jurnalul, „am încercat”, „am gătit” funcționează, iar favoritul din V2 apare în V1.
6. Recuperare parolă: emailul ajunge (după SMTP).
7. `robots.txt` pe producție: `Allow: /`, `Disallow: /v2/`, sitemap prezent.
8. `get_runtime_errors` (Vercel) și Supabase Logs: fără erori noi.

## 5b. Verificări de compatibilitate finalizate (3 nov., după decizia „un proiect”)

| # | Constatare | Rezolvare |
|---|---|---|
| F1 | `main` local era vechi; producția (`origin/main` = `db14a4c`) avea 4 commituri absente din `release/v2-rc` | **merge local** `17dcdcc`: conținutul SEO și de securitate era deja identic; au intrat mesajele BebeAsist (401/429). Merge-ul către `main` nu mai poate anula nimic din producție |
| F2 | `release/v2-rc` avea propria variantă V1 de scriere: căutare „am încercat” per copil (eșuează pe schema actuală când există rândul fără copil) și „am gătit” prin RPC-ul V2 (**V1 s-ar fi stricat după rollback-ul L1**) | release folosește acum exact patch-ul V1, valabil pe ambele scheme și după rollback; test nou: V1 nu apelează niciun RPC V2 și nu folosește `onConflict` |
| F3 | V1 în producție: id-ul utilizatorului rămânea în cache după deconectarea din alt tab sau după expirarea sesiunii (RLS bloca datele, dar apăreau liste goale sau salvări eșuate) | corectat în patch (`ef8b028`) și în release |
| F4 | **V1 în producție: `/api/send-verification` trimitea emailuri prin contul Resend către orice adresă, fără autentificare** (releu deschis pentru spam/phishing); nu e folosit nicăieri | retras (410) în patch (`360d05d`), identic cu release |
| F5 | **Decizie de produs:** BebeAsist e activ în producție pentru conturile autentificate și trimite datele copilului către modelul AI; V2 îl ține oprit (503) până la cotă partajată, date per copil și revizie de confidențialitate | merge-ul păstrează varianta V2 (oprit, 0 lei, nicio dată trimisă) și afișează mesajul serverului. **Dacă vrei BebeAsist activ după lansare, spune înainte de merge** |
| F6 | Testul pe telefon prin Wi-Fi local nu funcționează (fără HTTPS, `crypto.randomUUID` lipsește) | Vercel Preview, `PHONE-PREVIEW.md` |
| F8 | **V1 în producție: familiile cu mai mulți copii** (15 azi; V2 permite oricui să adauge un copil). 15 citiri ale copilului folosesc `maybeSingle()` doar pe `user_id` → `null` cu doi copii → middleware-ul trimite la `/onboarding`, iar formularul **suprascrie primul copil**; salvarea profilului (`profil/bebelus`) **copia datele peste toți copiii** | `8f7780d` în patch și în release: primul copil (`created_at`, `limit(1)`), update doar pe copilul afișat; gardă în `v1-compat` + 2 verificări noi în repetiție (38/38) |
| F7 | **V1: „Parolă uitată” nu funcționează** (paginile `/forgot-password/*` nu apelează Supabase) | V2 are fluxul real; setările exacte (Redirect URLs, SMTP Resend, șablon în română): `AUTH-SETUP.md` |

## 6. Constrângeri care decurg din proiectul comun

- **Setările Auth sunt comune.** V1 creează profilul copilului imediat după `signUp`, ceea ce funcționează doar pentru că producția dă sesiunea imediat (confirmarea emailului e dezactivată). Dacă activezi „Confirm email”, înregistrările noi din V1 rămân fără copil. Schimbarea cere întâi o modificare în V1.
- **Datele de test nu intră în producție.** Nu se creează conturi sintetice în producție. Canary-ul folosește doar contul tău. Preview-ul Vercel nu primește cheile Supabase V2.
- **Evenimentele V2** (`product_events`) se marchează `is_test` numai pentru conturile cu `app_metadata.is_test`. Conturile reale apar ca reale.
- **Jurnalul V1** (1.176 intrări) rămâne intact și vizibil în V1. V2 nu îl afișează încă (backlog P1).
- **Alergiile V1 fără copil** (17 familii) blochează planificarea automată în V2 pentru acele familii (decizie de siguranță, PRD).

## 7. Niveluri de rollback

| Nivel | Când | Cum | Efect asupra datelor | Testat |
|---|---|---|---|---|
| L0 aplicație | V2 are o eroare vizibilă | Vercel Instant Rollback sau scoți `DIVERSIBEBE_V2_PREVIEW` → redeploy | niciunul | `scripts/check-v2-boundary.cjs` (404 fără flag) |
| L1 bază, funcțional | V2 scrie greșit / RPC cu problemă | `supabase/operations/v2-disable.sql` | niciunul; V1 continuă | ✅ PGlite + stack real |
| L2 schemă | — | **intenționat inexistent**: constrângerile vechi nu mai pot fi restaurate după ce frații au rânduri proprii, iar V1 patch-uit funcționează cu ambele forme | — | — |
| L3 date | corupere de date (improbabil: migrațiile nu modifică rânduri) | restaurare țintită din backup (`pg_restore --table`) | revine la momentul backup-ului | restaurare completă verificată local |

## 8. Riscuri reziduale

| Risc | Probabilitate | Atenuare |
|---|---|---|
| Prima rulare reală a migrațiilor e în producție (fără staging online) | mică | schemă dovedită identică pe 8 categorii; repetiție pe PostgreSQL 17 + GoTrue + PostgREST reale; tranzacții; 17 MB → secunde; preflight 0; backup verificat; L1 testat |
| Diferențe Supabase neacoperite local (pooler, versiunea schemei `auth`, extensii) | mică | postflight + advisors imediat după; V1 smoke |
| Google OAuth neverificabil local | medie | canary cu contul tău; fallback de verificat tot în canary: recuperarea parolei pe adresa contului Google, apoi o parolă nouă |
| Proiect Free pauzat după 7 zile fără activitate | mică (V1 activ) | monitorizare; Supabase Pro înainte de monetizare |
| Fără backup automat zilnic (Free) | — | backup manual înaintea fiecărei migrații; Pro (25 USD/lună) recomandat la lansarea publică |
