Pregătește V1 (producția) pentru migrațiile V2 pe proiectul Supabase comun. **Merge numai după aprobarea fondatorului; nicio migrare nu este inclusă.**

PR: https://github.com/velicof/diversibebe/pull/2 · branch `hotfix/v1-v2-schema-compat` → `main`

## De ce trebuie publicat înaintea migrațiilor V2

Migrația `protect_family_data` înlocuiește constrângerile unice `(user_id, food_id)` și `(user_id, recipe_id)` cu indexuri parțiale per copil. Codul V1 din producție scrie cu `upsert(..., { onConflict })` pe exact acele constrângeri: după migrații, „Am încercat” și „Am gătit” eșuează cu `42P10` pentru toate familiile. V2 permite și adăugarea de copii, iar V1 citește copilul cu `maybeSingle()`: cu doi copii primește `null`. Patch-ul funcționează pe schema actuală, pe cea migrată și după rollback-ul L1, deci poate fi publicat oricând înainte.

## Ce schimbă (5 commituri peste `db14a4c`, producția actuală)

1. `b12b652` — V1 rămâne funcțional după migrațiile V2:
   - „Am încercat”: căutare per familie cu `limit(1)` + insert simplu, fără `onConflict`, pe care PostgREST nu îl poate ținti după migrații (eroarea `42P10`).
   - „Am gătit”: insert simplu, fără coloana `notes`, care nu există în producție (butonul eșuează probabil și azi).
   - Jurnal și pagina alimentului: `limit(1)` (o familie cu doi copii poate avea câte un rând per copil).
2. `ef8b028` — id-ul utilizatorului nu mai rămâne în cache după deconectarea din alt tab sau după expirarea sesiunii.
3. `360d05d` — retrage `/api/send-verification` (410): trimitea emailuri prin contul Resend către orice adresă, fără autentificare (releu deschis pentru spam/phishing). Ruta nu e apelată nicăieri; confirmarea contului ține de Supabase Auth.
4. `8f7780d` — **familiile cu mai mulți copii** (15 în producție azi; V2 permite oricui să adauge un copil):
   - 15 citiri ale copilului (`middleware`, dashboard, rețete, plan, profil, onboarding etc.) folosesc `maybeSingle()` filtrat doar după `user_id`. Cu doi copii, supabase-js întoarce `null` (PGRST116), middleware-ul trimite familia la `/onboarding`, iar formularul de acolo **suprascrie primul copil**. Acum toate iau primul copil (`created_at`, `limit(1)`), ca `getCurrentBaby()`.
   - `profil/bebelus`: salvarea făcea `update(...).eq("user_id")` și **copia numele, data nașterii și sexul peste toți copiii familiei**. Acum actualizează doar copilul afișat.
   - Pagina rețetei: starea „gătit” se citea cu `select("id, notes")`, coloană inexistentă, deci nu apărea niciodată; acum `select("id")` + `limit(1)` (V2 adaugă un rând de confirmare pe zi).
5. `6896710` — pagina principală nu mai afirmă „Rețete testate și aprobate de nutriționiști”: nicio rețetă nu are o revizie de specialitate. Textul nou: „Rețete verificate editorial, după ghiduri publice”. Aprobat de fondator, 4 nov.

## Securitate — rutele API din V1

| Rută | Autentificare | Abuz | Stare |
|---|---|---|---|
| `POST /api/send-verification` | niciuna (înainte) | trimitea email către orice adresă | **retrasă (410)** în acest PR |
| `POST /api/chat` (BebeAsist) | `supabase.auth.getUser()` înaintea corpului și a modelului (401) | 15 cereri/10 min per utilizator, per instanță; 20 mesaje × 2.000 caractere; `max_tokens` 1024 | neschimbată; cota partajată rămâne în backlog |
| `GET/POST /api/data/sync` | — | răspuns static, fără date | neschimbată |
| `/api/auth/[...nextauth]` | — | 404 | neschimbată |

## Verificat

- **Pe scheme:** schema actuală a producției și schema după migrațiile V2:
  - `tests/v1-compat.test.cjs` **7/7**, inclusiv garda nouă: nicio citire V1 a copilului fără `limit(1)` și niciun `update` pe `babies` filtrat doar după `user_id` (pe codul vechi găsește 15 + 1);
  - repetiția pe PostgreSQL 17 + GoTrue + PostgREST reale: **38/38** (36 + 2 noi: o familie cu mai mulți copii citește exact primul copil; salvarea profilului schimbă doar copilul afișat). Acoperă toate căile de scriere V1, înainte de migrații, după ele și după rollback-ul L1.
- **Build:** `next build` de producție (37/37 pagini) și TypeScript pe branch: PASS. Lint pe cele 17 fișiere atinse: 0 probleme noi față de `db14a4c` (una în minus).
- **Secrete:** niciun secret, token sau fișier `.env` în diff.
- **Fără schimbare de schemă:** nicio migrare, nicio dată modificată.

## După merge (verificare live, 10 minute)

1. Vercel: deploy READY, `get_runtime_errors` fără erori noi.
2. Cu contul tău: un aliment în jurnal → apare în „Alimente încercate”; „Am gătit” pe o rețetă → confirmat și rămâne afișat după reîncărcare; favorit → apare.
3. Dacă ai un cont cu doi copii: login → dashboard (nu onboarding); salvarea profilului nu schimbă al doilea copil.
4. `POST /api/send-verification` → 410.
5. Pagina principală (deconectat): apare „Rețete verificate editorial, după ghiduri publice”.
5. Rollback: Vercel Instant Rollback la `db14a4c`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
