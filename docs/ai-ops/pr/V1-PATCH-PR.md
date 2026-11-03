# PR: `hotfix/v1-v2-schema-compat` → `main` (draft, nepublicat)

**Titlu:** fix(v1): writes compatible with the V2 schema, account cache, retire open mail relay

## Ce schimbă (3 commituri peste `db14a4c`, producția actuală)

1. `b12b652` — V1 rămâne funcțional după migrațiile V2:
   - „Am încercat”: căutare per familie cu `limit(1)` + insert simplu, fără `onConflict`, pe care PostgREST nu îl poate ținti după migrații (eroarea `42P10`).
   - „Am gătit”: insert simplu, fără coloana `notes`, care nu există în producție (butonul eșuează probabil și azi).
   - Jurnal și pagina alimentului: `limit(1)` (o familie cu doi copii poate avea câte un rând per copil).
2. `ef8b028` — id-ul utilizatorului nu mai rămâne în cache după deconectarea din alt tab sau după expirarea sesiunii.
3. `360d05d` — retrage `/api/send-verification`: trimitea emailuri prin contul Resend către orice adresă, fără autentificare. Ruta nu e folosită nicăieri; confirmarea contului ține de Supabase Auth.

## Verificat

- **Pe scheme:** schema actuală a producției și schema după migrațiile V2:
  - `tests/v1-compat.test.cjs`;
  - repetiția pe PostgreSQL 17 + GoTrue + PostgREST reale: 27/27, inclusiv după rollback-ul L1.
- **Build:** `next build` de producție și TypeScript pe branch: PASS. Lint: identic cu baza pentru fișierele atinse.
- **Fără schimbare de schemă:** nicio migrare, nicio dată modificată.

## După merge (verificare live, 10 minute)

1. Vercel: deploy READY, `get_runtime_errors` fără erori noi.
2. Cu contul tău: un aliment în jurnal → apare în „Alimente încercate”; „Am gătit” pe o rețetă → confirmat; favorit → apare.
3. `POST /api/send-verification` → 410.
4. Rollback: Vercel Instant Rollback la `db14a4c`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
