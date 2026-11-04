Pregătește V1 (producția) pentru migrațiile V2 pe proiectul Supabase comun. **Merge numai după aprobarea fondatorului; nicio migrare nu este inclusă.**

PR: https://github.com/velicof/diversibebe/pull/2 · branch `hotfix/v1-v2-schema-compat` → `main`

## De ce trebuie publicat înaintea migrațiilor V2

Migrația `protect_family_data` înlocuiește constrângerile unice `(user_id, food_id)` și `(user_id, recipe_id)` cu indexuri parțiale per copil. Codul V1 din producție scrie cu `upsert(..., { onConflict })` pe exact acele constrângeri: după migrații, „Am încercat” și „Am gătit” eșuează cu `42P10` pentru toate familiile. V2 permite și adăugarea de copii, iar V1 citește copilul cu `maybeSingle()`: cu doi copii primește `null`. Patch-ul funcționează pe schema actuală, pe cea migrată și după rollback-ul L1, deci poate fi publicat oricând înainte.

## Ce schimbă (9 commituri peste `db14a4c`, producția actuală)

**Compatibilitate cu V2**
1. `b12b652` — scrieri compatibile:
   - „Am încercat”: căutare per familie cu `limit(1)` + insert simplu, fără `onConflict`;
   - „Am gătit”: insert simplu, fără coloana `notes`, care nu există în producție;
   - jurnal și pagina alimentului: `limit(1)` (o familie cu doi copii poate avea câte un rând per copil).
2. `8f7780d` — familiile cu mai mulți copii (15 în producție azi; V2 permite oricui să adauge un copil):
   - 15 citiri ale copilului (`middleware`, dashboard, rețete, plan, profil, onboarding etc.) foloseau `maybeSingle()` filtrat doar după `user_id`. Cu doi copii, supabase-js întoarce `null`, iar middleware-ul trimite familia la `/onboarding`. Acum toate iau primul copil (`created_at`, `limit(1)`), ca `getCurrentBaby()`;
   - `profil/bebelus`: salvarea e limitată la copilul afișat;
   - pagina rețetei: starea „gătit” se citea cu o coloană inexistentă, deci nu apărea niciodată; acum `select("id")` + `limit(1)`.

**Scrieri care eșuau mereu în producție** (găsite rulând paginile reale pe schema producției)
3. `6150077`:
   - **salvarea profilului copilului** trimitea coloana `allergies`, inexistentă în `babies`: părintele primea o eroare la fiecare salvare. Corecție la o afirmație anterioară: spuneam că salvarea „copia datele peste toți copiii”. Codul filtra într-adevăr doar după `user_id`, dar update-ul era respins, deci **nu s-a suprascris nimic în producție**;
   - **intrarea din jurnal după „Am gătit”** nu trimitea `food_id` (obligatoriu) și era respinsă în tăcere. Acum se salvează, fără reacția „pozitiv” pe care părintele nu a raportat-o.

**Cont și autentificare**
4. `ef8b028` + `d970573` — identitatea nu mai rămâne în cache după deconectarea din alt tab sau după expirarea sesiunii. Se citește din sesiune (`getSession`), deci fără o cerere la fiecare apel; autorizarea rămâne în RLS.
5. `6aeb02f` — `/auth/callback` nu mai acceptă un `next` către alt site (același `safeReturnPath` ca în V2).

**Securitate**
6. `360d05d` — retrage `/api/send-verification` (410): trimitea emailuri prin contul Resend către orice adresă, fără autentificare. Ruta nu e apelată nicăieri; confirmarea contului ține de Supabase Auth.

**Texte publice**
7. `6896710` + `01fc589` — pagina principală și ghidul nu mai afirmă lucruri fără dovezi:
   - „aprobate de nutriționiști”, „verificate editorial” (rețetele V1 nu au trecut prin corecturile V2);
   - „Bazat pe ghiduri pediatrice (românești)” și „Societatea Română de Pediatrie”;
   - testimonialul „Andreea M., mamă a Sofiei” (fără dovadă de autenticitate sau consimțământ).

   Textul nou: „Idei de rețete și un plan simplu, organizate pe vârste” și „Informații generale, care nu înlocuiesc sfatul medicului pediatru”.

## Securitate — rutele API din V1

| Rută | Autentificare | Abuz | Stare |
|---|---|---|---|
| `POST /api/send-verification` | niciuna (înainte) | trimitea email către orice adresă | **retrasă (410)** |
| `GET /auth/callback` | cod OAuth | `next` absolut ducea pe alt site | **`safeReturnPath`** |
| `POST /api/chat` (BebeAsist) | `getUser()` înaintea corpului și a modelului (401) | 15 cereri/10 min per utilizator, per instanță; 20 mesaje × 2.000 caractere; `max_tokens` 1024 | neschimbată; cota partajată rămâne în backlog |
| `GET/POST /api/data/sync` | — | răspuns static, fără date | neschimbată |
| `/api/auth/[...nextauth]` | — | 404 | neschimbată |

## Verificat

- **Paginile reale în browser** (`scripts/v1-browser-check.cjs`, 390×844, GoTrue + PostgREST + PostgreSQL 17 locale, schema cu migrațiile V2, conturi `@example.test`): **40/40**.
  - Acoperă: pagina publică, ruta de email, callback, familie cu doi copii, salvarea profilului, „Am gătit” + alimente încercate + starea după reîncărcare, favorite, toate paginile V1 (12), sesiune într-un tab nou, deconectare (cookie-uri șterse, pagini protejate, tab rămas deschis), al doilea cont fără date din primul, înregistrare, zero apeluri respinse de bază.
  - **Control:** codul din producție (`db14a4c`) pe aceeași schemă pică: redirect la onboarding, „Am gătit” nu se salvează.
- **Pe scheme:** `tests/v1-compat.test.cjs` + repetiția migrării (toate căile de scriere V1, înainte de migrații, după ele și după rollback-ul L1).
- **Build:** `next build` de producție (37/37 pagini) și TypeScript pe branch: PASS. Lint: nicio problemă nouă față de `db14a4c`.
- **Secrete:** niciun secret, token sau fișier `.env` în diff.
- **Fără schimbare de schemă:** nicio migrare, nicio dată modificată.

**Nu este verificat local** (Google nu există pe stack-ul local): login Google în V1. Patch-ul nu atinge fluxul, doar destinația de după callback. „Parolă uitată” din V1 rămâne nefuncțională (problemă veche, în backlog).

## După merge (verificare live, 10 minute)

1. Vercel: deploy READY, `get_runtime_errors` fără erori noi.
2. Cu contul tău: un aliment în jurnal → apare în „Alimente încercate”; „Am gătit” pe o rețetă → confirmat și rămâne afișat după reîncărcare; favorit → apare; salvarea profilului copilului → „Salvat!”.
3. Dacă ai un cont cu doi copii: login → dashboard (nu onboarding); salvarea profilului nu schimbă al doilea copil.
4. Login cu Google → dashboard.
5. `POST /api/send-verification` → 410.
6. Pagina principală (deconectat): fără testimonial și fără afirmații despre aprobări.
7. Rollback: Vercel Instant Rollback la `db14a4c`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
