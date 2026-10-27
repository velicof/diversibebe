# DiversiBebe 2.0 — versiune locală de test

Branch: `codex/diversibebe-2-mvp`. Nu este o versiune de producție și nu este încă pregătită pentru pilot cu familii reale.

## Pornire

Node 20.9+ și npm sunt necesare. În acest repository, după `npm ci`, deschide două terminale:

```powershell
# Terminal 1: bază PostgreSQL persistentă + API de test, exclusiv 127.0.0.1
npm run test:api

# Terminal 2: build și interfață
npm run build:v2
npm run preview:v2
```

Deschide `http://127.0.0.1:3100/v2`. Nu deschide porturile în rețea. Serverul de test nu este GoTrue/PostgREST și nu trebuie publicat. Folosește doar cele două conturi sintetice. Datele lor de acces sunt generate în fișierul privat `../finalization/local-test-access.json`; nu îl trimite și nu îl include în Git. Parolele nu sunt păstrate în localStorage. SDK-ul păstrează sesiunea de test într-un spațiu separat. Baza persistă în `.local-test-db/postgres-verified`.

Explorarea fără cont folosește o cheie localStorage separată. Importul în cont este explicit și aditiv: favorite + zile neocupate din plan. Nu importă profilul, istoricul sau confirmările și păstrează copia locală.

## Verificare

```powershell
npm run typecheck
npm run lint:v2
npm test
# Cât timp serverul de test rulează:
$env:V2_RUN_HTTP_TESTS='1'
npm test
npx playwright install chromium
npm run test:e2e
node scripts/measure-v2.cjs
```

E2E modifică exclusiv conturile sintetice. Capturile și rapoartele sunt scrise lângă repository, în structura workspace-ului livrat. `npm run lint` inspectează și codul vechi, ale cărui erori sunt raportate separat. Testele directe PostgreSQL nu înlocuiesc testele GoTrue/PostgREST.

## Supabase complet, încă nevalidat

Motorul Docker nu pornește în mediul actual. CLI 2.122.0 este disponibil; schema fără date și cele trei migrări au fost pregătite în `.local-supabase/supabase`. Pachetul final include o copie curată `supabase-local-pregatit/`. Acesta nu este un mediu funcțional verificat.

După remedierea Docker, din acel director, folosește versiunea fixată a CLI. Mai întâi verifică faptul că este o bază locală goală, fără proiect remote asociat. Nu folosi `link`, `db push` sau `db reset --linked`.

```powershell
docker network create -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' diversibebe-local-only
npx supabase@2.122.0 start --network-id diversibebe-local-only
```

Verifică porturile: toate trebuie legate de loopback. Migrarea baseline se folosește numai pentru baza nouă de test, niciodată pe o bază existentă. Nu rula migrările istorice 001–003 peste schema actuală reconstruită.

După ce stack-ul pornește, cheia locală `service_role` este necesară numai în terminal pentru `scripts/seed-official-local.cjs`. Cheia anon locală și URL-ul `http://127.0.0.1:54321` se configurează prin `NEXT_PUBLIC_V2_SUPABASE_URL` / `NEXT_PUBLIC_V2_SUPABASE_ANON_KEY`, iar `NEXT_PUBLIC_V2_BACKEND_KIND=supabase-local`. Rebuild obligatoriu. Păstrează separat credentialele fixture-ului înainte de generarea conturilor oficiale locale. Seeder-ul este pregătit, nu executat. Pentru testele HTTP/E2E setează și `V2_TEST_API_URL=http://127.0.0.1:54321`, `V2_TEST_ANON_KEY` la cheia anon locală și `V2_RUN_HTTP_TESTS=1`. Suitele au fost executate până acum numai pe fixture-ul 54329; stack-ul oficial trebuie verificat separat.

Referință: https://supabase.com/docs/guides/local-development

## Limite deliberate

291 de rețete existente, toate cu revizie clinică în așteptare. Triajul automat nu acordă validare medicală; modul live nu recomandă rețete fără revizie documentată. Catalogul local rămâne o explorare de design. Etapa 0 nu permite planificarea/confirmarea meselor. Alergiile deja înregistrate opresc personalizarea; aplicația nu generează recomandări terapeutice.

Manifestul, iconurile și metadatele sunt pregătite. Nu există service worker, cache offline de date private sau plăți. Instalarea pe dispozitive reale și VoiceOver/TalkBack nu sunt încă validate.

Producția, GitHub remote și Vercel nu au fost modificate. V2 returnează 404 în modul producție fără flag-ul explicit de preview. URL-urile de producție sunt respinse de clientul de persistență V2.
