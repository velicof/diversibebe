# Arhitectura de producție V2

Stare la 3 nov. 2026, branch `release/v2-rc`. Faptele despre producție provin din metadate citite read-only (Supabase MCP `execute_sql` pe catalog/agregate, fără rânduri personale). Producția nu a fost modificată în această etapă.

## 1. Ce există azi

| Componentă | Valoare verificată |
|---|---|
| Supabase producție | proiect `diversibebe` (`smyimgvxlggggjeoajdo`, eu-west-1, Free) — **435 conturi**, toate cu email confirmat; 421 profiluri de copil; 15 familii cu mai mulți copii; 11 conturi fără copil |
| Tabele V1 | `profiles`, `babies`, `tried_foods` (4.695), `food_journal` (~1.050), `allergy_records` (27, toate fără `baby_id`, 17 familii), `favorite_recipes` (38), `cooked_recipes` (28), `custom_recipes`, `custom_foods`, `login_events`, `feedback`; RLS activ pe toate (`auth.uid() = user_id`) |
| Istoric migrații producție | un singur element: `close_user_login_summary` (P0, 2 nov.). Schema V1 a fost creată în afara fișierelor de migrare |
| P0 `user_login_summary` | **reconfirmat 3 nov.**: niciun privilegiu pentru `anon`/`authenticated`/`PUBLIC`, `security_invoker=true` |
| Alte proiecte Supabase active | `Nuo` (alt produs) — **nu se folosește pentru DiversiBebe**; `metropolitan_grill` este pauzat |
| Vercel | echipa `velicofs-projects`, proiectul `diversibebe`, producția se construiește din `main` (`db14a4c`); Preview-urile sunt protejate de Vercel Authentication |
| V2 | rulează numai local: PostgreSQL 17 + GoTrue + PostgREST nativ (`../real-supabase-runtime`), backend separat prin `NEXT_PUBLIC_V2_SUPABASE_*` |

## 2. Probleme de compatibilitate găsite și rezolvate local

| # | Problemă | Dovadă | Rezolvare |
|---|---|---|---|
| C1 | **V1 se strică dacă migrațiile V2 ajung în producție înaintea patch-ului V1.** V1 scrie `tried_foods` cu `onConflict: "user_id,food_id"` și `cooked_recipes` cu `onConflict: "user_id,recipe_id"`; V2 înlocuiește constrângerile unice cu indexuri parțiale per copil, iar PostgREST nu le poate ținti | `tests/v1-compat.test.cjs`: ambele upsert-uri dau `42P10` după migrații | patch V1 pe branch-ul local `hotfix/v1-v2-schema-compat` (`b12b652`, din `main`): verificare + `insert`, citire `limit(1)`; testat pe schema actuală **și** pe cea migrată. **Trebuie publicat în producție înaintea oricărei migrații V2** |
| C2 | V1 trimite coloana `notes` în `cooked_recipes`, care **nu există în producție** → „am gătit” eșuează probabil deja azi | schemă producție (fără `notes`) + cod V1 | același patch elimină `notes` din scriere. Notițele pe rețetă (V1) rămân nefuncționale — preexistent |
| C3 | **63% din alimentele încercate (2.967 rânduri, 174 familii) și toate rețetele gătite V1 nu au `baby_id`** → V2 le-ar fi ascuns | agregate producție | migrarea `20261103100000_v2_legacy_history.sql` (fără modificări de rânduri): pentru familiile cu **un singur copil** istoricul fără copil apare la acel copil; cu mai mulți copii rămâne neatribuit (nu se ghicește) |
| C4 | Un ID de rețetă cu diacritice (`omletă-legume-8`) este respins de V2 (`^[a-z0-9-]+$`) → nu putea fi planificat | test `editorial-gate` | exclus din listele V2 până primește alias ASCII |
| C5 | V2 avea `metadataBase` = `http://127.0.0.1:3100` → OG/canonical greșite online | cod | `SITE_URL` (`https://www.diversibebe.com`) |
| C6 | Alergii: toate cele 27 de înregistrări nu au copil | agregate | V2 le aplică **tuturor** copiilor familiei (`requiresClinicalGuidance`): fără planificare automată pentru 17 familii — decizie de siguranță, documentată în PRD |
| C7 | Baza de test trebuie să rămână identică cu producția | `tests/schema-drift.test.cjs` + `tests/fixtures/production-metadata.json` | se reîmprospătează din metadate înaintea fiecărei lansări |

Orfani verificați în producție: 0 rânduri `tried_foods`/`food_journal`/`allergy_records` cu `baby_id` care nu aparține utilizatorului → validarea FK din `protect_family_data` va reuși.

## 3. Setul de migrații de lansare

Sursa unică: `supabase/v2-release.cjs` (folosită de teste, de runtime-ul nativ și de release).

1. `20261027055351_protect_family_data` — politici RESTRICTIVE, FK (copil, părinte), unicitate per copil, `handle_new_user` cu `search_path` fix
2. `20261027055353_bebeasist_quota` — cotă AI zilnică partajată (pregătită; AI rămâne oprit)
3. `20261027133719_v2_persistence_and_events` — `meal_plans`, `user_preferences`, `product_events`, RPC V2
4. `20261031201425_real_auth_journey`, `20261031201937_real_auth_journey_legacy_compat`
5. `20261102100000_v2_planner_events`
6. `20261103100000_v2_legacy_history`

`001–003` sunt fișiere legacy neaplicate niciodată în producție și **nu** fac parte din lansare.

Caracter: aditive (tabele, coloane cu valori implicite, funcții, politici), cu două excepții care schimbă constrângeri V1 (C1). Rollback operațional testat (`tests/rollback.test.cjs`): `supabase/operations/v2-disable.sql` revocă accesul la RPC-urile V2 fără să șteargă date și fără să redeschidă P0. Constrângerile V1 nu se restaurează automat (după ce frații au rânduri proprii, unicitatea veche nu mai e validă); patch-ul V1 funcționează cu ambele forme.

## 4. Mediile — opțiuni de staging

Condiție: date de test și date reale niciodată în aceeași bază; fără proiect plătit fără aprobare.

| Opțiune | Cost | Avantaje | Riscuri |
|---|---|---|---|
| **A. Proiect Free nou `diversibebe-staging`**, după pauzarea lui `Nuo` (limita Free = 2 proiecte active) | 0 lei | izolare completă; Auth, email, RLS reale; aceeași versiune Postgres 17 | `Nuo` devine indisponibil cât e pauzat; proiectele Free se pauzează după 7 zile fără activitate |
| B. Supabase Pro + Branching | ~25 USD/lună + compute | branch-uri efemere per PR; backup zilnic | cost recurent; necesită aprobare |
| C. Runtime-ul local expus printr-un tunel către Vercel Preview | 0 lei | rapid | depinde de laptop; nu e „online verificat”; expune un port local — **respins** |
| D. Schemă separată în `Nuo` | 0 lei | — | amestecă produse și `auth.users` — **respins** |
| E. Conturi `is_test` în producție | 0 lei | — | date de test în baza reală — **respins** |

**Recomandare: A** dacă `Nuo` poate fi pauzat; altfel B. Staging primește schema producției (`tests/fixtures/current-schema.sql`) + setul de migrații, conturi sintetice `@example.test`, apoi E2E pe Vercel Preview.

## 5. Arhitectura recomandată pentru beta privată și lansare

```
                    ┌───────────── Vercel (proiect diversibebe) ─────────────┐
 Preview (branch) ──┤ env Preview: V2 → Supabase STAGING, SSO Vercel         │
                    │                                                        │
 Producție (main) ──┤ /           → V1 (neschimbat)                          │
                    │ /v2/*       → V2, numai cu DIVERSIBEBE_V2_PREVIEW=1     │
                    │               + cod de invitație (V2_INVITE_CODE_HASHES)│
                    │               + conținut LIVE (doar rețete publicate)   │
                    └────────────────────────┬───────────────────────────────┘
                                             │ același Supabase producție
                          435 conturi existente, RLS per familie
```

- **Același proiect Supabase pentru V1 și V2 în producție.** Este singura variantă în care cei 435 de părinți intră în V2 cu contul existent. V2 folosește `NEXT_PUBLIC_V2_SUPABASE_URL`/`ANON_KEY` = valorile producției numai în mediul Production.
- **Beta privată = `/v2` pe domeniul de producție, cu cod de invitație** (`src/lib/security/invite.ts`, `/acces-beta`). Serverul are doar hash-uri SHA-256; codul stă într-un cookie httpOnly. Gratuit (protecția cu parolă Vercel este un add-on plătit). Nu este o barieră pentru date — datele rămân protejate de Auth + RLS.
- **Poarta de conținut:** orice build fără `NEXT_PUBLIC_V2_CONTENT_MODE=preview` afișează numai rețetele `published` cu revizie clinică semnată (`publishedCatalog`); paginile celorlalte → 404. Scripturile locale setează explicit `preview`.
- **AI:** `/api/chat` în V2 rămâne fail-closed (401/503, niciun apel plătit). Pentru reactivare: cota partajată din migrația 2 (10 apeluri/zi/utilizator) + limitare per instanță + revizie clinică a promptului.
- **Noindex:** `/v2` și `/acces-beta` primesc `X-Robots-Tag: noindex` și sunt excluse din `robots.txt`.

### Ordinea de lansare (fiecare pas cu aprobare separată)

1. Backup logic al producției (`pg_dump` cu parola bazei sau Supabase CLI `db dump`) — Free nu are backup descărcabil. Fișierul rămâne local, criptat.
2. Publicarea patch-ului V1 `hotfix/v1-v2-schema-compat` (PR → `main`) și verificare live: jurnal, „am încercat”, „am gătit”.
3. Staging (opțiunea A/B) → aplicare set migrații → E2E pe Vercel Preview cu Supabase staging.
4. Supabase Auth producție: SMTP propriu (Resend, deja folosit de legacy) — emailul implicit Supabase are limită de ordinul câtorva mesaje/oră; Redirect URLs pentru `https://www.diversibebe.com/v2/**`.
5. Preflight `supabase/operations/v2-preflight.sql` → migrațiile în producție (în fereastră cu trafic mic) → advisors → preflight din nou.
6. Variabile Production: `DIVERSIBEBE_V2_PREVIEW=1`, `V2_INVITE_CODE_HASHES`, `NEXT_PUBLIC_V2_SUPABASE_URL/ANON_KEY` (producție), `NEXT_PUBLIC_V2_BACKEND_KIND=supabase-native`; **fără** `NEXT_PUBLIC_V2_CONTENT_MODE`.
7. Merge `release/v2-rc` → `main` → verificare producție (secțiunea 7).

## 6. Autentificare

| Flux | Stare locală (GoTrue real) | Pentru online |
|---|---|---|
| Signup cu confirmare email | E2E PASS (Mailpit) | SMTP Resend în Supabase Auth; domeniu verificat în Resend |
| Login / logout / sesiuni multiple / refresh | E2E PASS (inclusiv expirare JWT reală, două browsere) | — |
| Recuperare parolă (PKCE) | E2E PASS | Redirect URL `/v2/recuperare` în Supabase Auth |
| Conturi V1 existente în V2 | parolele sunt în același `auth.users` → login direct | verificat pe staging cu conturi sintetice create prin V1 |
| Protecție parole compromise (HIBP) | — | disponibilă doar pe planul Pro Supabase |

## 7. Monitorizare, logging, costuri

- **Erori:** Vercel Runtime Logs + `get_runtime_errors` (gratuit); Supabase Logs/Advisors. Fără Sentry până la o decizie privind datele (DPA).
- **Fără date personale în loguri:** `product_events` acceptă doar nume de evenimente din allowlist și proprietăți numerice (`count`, `elapsedMs`, `price`); niciun email sau nume de copil. Rutele V2 nu loghează corpul cererilor.
- **Verificare după publicare:** `/v2` → redirect la `/acces-beta` fără cod; cu cod → 200; rețetă nepublicată → 404; `POST /api/chat` anonim → 401; advisors fără ERROR; `verify-seo` 18/18.

| Element | Beta privată | Lansare publică cu plăți |
|---|---|---|
| Vercel | Hobby (0) — **utilizarea comercială cere Pro** | Pro 20 USD/lună |
| Supabase | Free (0) + staging Free | Pro 25 USD/lună recomandat (backup zilnic, fără pauzare) |
| Email (Resend) | Free (100/zi, 3.000/lună) | Free sau 20 USD/lună |
| AI | 0 (oprit) | max. 10 apeluri/zi/utilizator; cost de estimat la reactivare |
| Domeniu | existent | existent |

## 8. Telefon fizic

Nu poate fi verificat de agent. Checklist pentru fondator (iOS Safari + Android Chrome) în `QUALITY-GATES.md` → G8.
