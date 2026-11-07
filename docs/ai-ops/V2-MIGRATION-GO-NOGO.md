# Migrarea V2 în producție: GO / NO-GO

## Rezultat: aplicată, 7 nov. 2026, 20:59–21:03 UTC

**Cele 8 migrații sunt aplicate în producție, fără eroare.** V2 nu e publicat: `/v2` răspunde 404 pe site.

| Verificare | Rezultat |
|---|---|
| Condiții | backup valid; copie criptată în OneDrive, recitită din cloud cu SHA-256 identic; fraza confirmată în managerul de parole (20:57 UTC); preflight 0 anomalii; V1 live pe `9c56e83`; 0 cereri în ultima oră și 0 sesiuni active |
| Textul aplicat | MD5 normalizat al fiecărei migrații înregistrate în `supabase_migrations` identic cu fișierul local, 8/8 |
| Postflight | **9/9**: tabelele V2, 11 politici restrictive, 4 chei de proprietate validate, constrângerile vechi înlocuite, `anon` fără acces la tabelele de familie, `user_login_summary` închis, funcțiile V2 doar pentru conturi, `handle_new_user` securizat, triggerul de înregistrare prezent |
| Rânduri | identice înainte și după, în toate cele 12 tabele (435 de conturi, 440 de copii, 4.696 alimente încercate, 1.184 intrări în jurnal…); 0 profiluri fără cont; RLS activ pe toate tabelele publice |
| Izolare, din exterior | cu cheia publică a site-ului: 9 tabele și `v2_load_state` răspund 401 `permission denied` |
| V1 live, cont de test | dashboard; salvarea profilului („Salvat!”, valori neschimbate după reîncărcare); „Am gătit” rămâne marcat după reîncărcare; intrarea apare în jurnal; 0 erori în consolă |
| Erori | Vercel: 0. Postgres: doar cele 10 refuzuri `42501` provocate de testul de izolare |
| Advisors | 0 ERROR. Nou: WARN pentru `consume_bebeasist_quota` (`SECURITY DEFINER` intenționat, documentat în migrație) și INFO pentru `app_private.ai_usage` (tabel privat, fără politici, intenționat). Rămase din V1: `auth_rls_initplan` pe politicile V1, chei străine fără index, protecția parolelor compromise oprită |

**Recuperare, dacă apare o problemă:** L1 `v2-disable.sql` (oprește funcțiile V2; V1 continuă), testat în repetiție. L3 restaurare țintită din backupul din 7 nov. (local și OneDrive). Nu există L2, intenționat.


Evaluarea dinaintea migrării (7 nov., 19:30 UTC), păstrată pentru istoric:

## Verdict

**GO tehnic pentru pasul 4** (cele 8 migrații), cu trei condiții:

1. aprobarea ta, pentru o oră anume;
2. o oră cu trafic minim;
3. un backup din aceeași zi. Cel de acum e din 7 nov., 19:17 UTC. Dacă migrarea are loc mai târziu, reiei fereastra de backup: durează ~1 minut, plus parola.

**Nu e GO pentru beta.** Migrarea pregătește baza de date; conturile V2 cu familii reale au nevoie și de pașii 5–8 (`RELEASE-READINESS.md`).

## Dovezi

| Condiție | Stare | Dovadă |
|---|---|---|
| V1 compatibil cu schema V2 | ✅ | PR #2 live (`9c56e83`), verificat cu un cont de test pe 6 nov.; `v1-browser-check` 40/40 pe schema migrată |
| Backup complet | ✅ | 7 nov., 19:17 UTC: 12 tabele, `Storage: 7/7`, `restore check: all 12 tables` (detalii mai jos) |
| Preflight pe producție (read-only) | ✅ | 7 nov.: 0 anomalii în toate cele 6 verificări (5 de proprietate și duplicate, plus drepturile `user_login_summary`) |
| Repetiție completă | ✅ | 7 nov.: **38/38** pe PostgreSQL 17 + GoTrue + PostgREST locale, cu 435 de conturi sintetice create ca în V1. Include migrațiile, verificarea, semnarea V1 după migrare, emailul de recuperare și rollback-ul L1 |
| Fișierele de migrație | ✅ | neschimbate de la 4 nov. (`60b2fe0`); ordinea din `supabase/v2-release.cjs` |
| Producția neatinsă până acum | ✅ | o singură migrație aplicată (cea veche, `close_user_login_summary`); nicio eroare Postgres în timpul backupului |

## Cum ar decurge pasul 4, după aprobare

| # | Acțiune | Durată | Oprire dacă |
|---|---|---|---|
| a | Preflight din nou, read-only | 1 min | o anomalie ≠ 0 |
| b | Cele 8 migrații, în ordine; fiecare e o tranzacție: eșecul nu lasă nicio schimbare | sub 1 min (~0,3 s fiecare în repetiție) | prima eroare: restul nu mai rulează |
| c | `v2-postflight.sql`: 9 verificări structurale și același număr de rânduri | 1 min | o verificare falsă sau un număr diferit |
| d | Supabase advisors: niciun ERROR | 1 min | ERROR nou |
| e | V1 cu contul de test: profil, „Am gătit”, jurnal; `get_runtime_errors` | 10 min | orice regresie |

**Înapoi:**
- **L1** `v2-disable.sql`: oprește funcțiile V2, iar V1 continuă. Testat în repetiție.
- **L3** restaurare țintită din backup: doar pentru corupere de date, improbabilă, fiindcă migrațiile nu modifică rânduri.
- **L2** (refacerea constrângerilor vechi) nu există, intenționat (`MIGRATION-V1-V2.md`).

Blocările pe tabele durează sub o secundă: tabelele au sub 5.000 de rânduri.

## Ce nu blochează migrarea, dar trebuie făcut înainte de beta

- **SMTP și setările Auth** (pasul 5): 65 de conturi numai cu Google și recuperarea parolei. Nu țin de schema bazei, deci nu blochează migrarea.
- **`release/v2-rc` nu conține încă `main` cu PR #2** (`9c56e83`): merge `main` în branch înainte de pasul 8.
- **Mesaj greșit la o eroare de sincronizare:** un cont conectat vede „Explorezi fără cont”. Trebuie reparat înainte de beta.
- **`cloud.spec`:** un eșec intermitent, cu cauza negăsită (27/27 la repetare); testele păstrează acum urma de rețea.
- **Restul:** Safari real pe iPhone; contorul `login_events` din V1, umflat la fiecare reîncărcare.

## Backupul din 7 nov.

| | |
|---|---|
| Folder | `C:\Users\ionel\DiversiBebe-backups` (în afara Git; acces doar pentru contul Windows `ionel`, fără moștenire) |
| Fișiere | `diversibebe-2026-11-07T19-16-48-702Z.dump.enc` (814 KB), `.storage.enc` (16,7 MB), `.manifest.json` |
| Sursă | conexiune directă `db.smyimgvxlggggjeoajdo.supabase.co`, PostgreSQL 17.6, `pg_dump` 17.11 |
| Rânduri | `auth.users` 435, `profiles` 435, `babies` 440, `tried_foods` 4.696, `food_journal` 1.184, `login_events` 2.670, `custom_recipes` 152, `custom_foods` 81, `favorite_recipes` 38, `cooked_recipes` 29, `allergy_records` 27, `feedback` 5 |
| Storage | 7 fișiere, 12.536.738 octeți: aceeași dimensiune cu cea raportată de producție |
| Verificare | decriptat, sumă de control identică, 12/12 tabele în cuprins; 7/7 fișiere recitite cu sumele lor; restaurare într-o bază locală temporară, apoi ștearsă: toate cele 12 tabele cu același număr de rânduri |
| Criptare | AES-256-GCM; fraza e generată automat și păstrată cu DPAPI (`passphrase.dpapi`), deci o poate citi doar acest cont Windows |

**Limite:**
- `pg_restore` a raportat o singură eroare: `schema "public" already exists` (`CREATE SCHEMA public`), fiindcă baza temporară avea deja schema. Nu afectează datele (12/12 tabele cu același număr de rânduri) și nici restaurarea țintită L3, care scrie doar date în tabele existente. Corectură: inițial am atribuit-o rolurilor Supabase.
- Fișierele Storage sunt verificate prin recitire, nu reîncărcate undeva.
- **Copie în afara laptopului (7 nov.):** cele 3 fișiere criptate sunt în OneDrive (`OneDrive\DiversiBebe-backups`); erau doar în cloud, iar după descărcarea înapoi au SHA-256 identic. Fraza nu e acolo.
- **Fraza în managerul de parole:** neconfirmată încă (`scripts/backup-passphrase-check.ps1`). Fără ea, copia din OneDrive nu poate fi citită pe alt calculator. **Migrațiile nu pornesc până la confirmare.**

**Siguranța față de producție:**
- toate citirile au rulat în sesiuni read-only;
- `pg_dump` e read-only prin construcție și renunța după 10 s dacă ar fi trebuit să aștepte după o blocare;
- fișierele Storage au fost citite prin URL-urile lor publice (GET);
- parola a stat doar în memoria ferestrei: nu apare în jurnal, în fișierul de stare sau în manifest (verificat și pe repetiția locală).
