# V2 pe telefon: acces privat online, cost 0

O singură adresă, în două etape: `https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2` (Preview Vercel pentru branch-ul `release/v2-rc`). Producția (`www.diversibebe.com`) nu se schimbă în niciuna dintre etape.

## Protecție (server-side, în ambele etape)

1. **Vercel Authentication** pe Preview: activă pe proiect (`ssoProtection: all_except_custom_domains`, verificat read-only). Fără contul tău Vercel, nimeni nu încarcă pagina.
2. **Codul de invitație V2**, verificat în `src/proxy.ts` înainte de orice pagină `/v2`. Fără cod → `/acces-beta`; fail-closed dacă variabila lipsește. Recomandat și pe Preview (apărare în adâncime), în locul `V2_ACCESS=public`.
3. **Consola de revizie și galeria foto**: cod separat (`V2_REVIEW_CODE_HASHES`).
4. **Datele**: Auth + RLS pe fiecare tabel. O familie vede doar rândurile ei (repetiție 36/36, inclusiv izolare HTTP 401/409).

Nu există o variantă fără cost cu conturi reale și date sintetice online:
- un al doilea proiect Supabase cere pauzarea Nuo sau plan plătit;
- un tunel către laptop ar expune stack-ul local;
- Wi-Fi-ul de acasă nu are HTTPS (V2 folosește `crypto.randomUUID`).

De aceea etapa 1 rulează în modul vizitator, iar conturile reale vin abia în etapa 2, pe proiectul comun.

## Etapa 1 — Preview privat, mod vizitator (azi, după aprobare)

Ce testezi: onboarding, biblioteca (289 de rețete), filtre, rețete, planul pe 5 zile, înlocuirea unei mese, lista de cumpărături, galeria foto și consola de revizie. Alegerile rămân doar în telefon; **nicio scriere în baza reală** (fără chei Supabase V2).

| Acțiune (aprobare separată) | Detalii |
|---|---|
| A. Push `release/v2-rc` pe GitHub | fără PR și fără merge; Vercel construiește automat Preview-ul |
| B. Variabile Vercel, ținta Preview, branch `release/v2-rc` | `DIVERSIBEBE_V2_PREVIEW=1` · `V2_INVITE_CODE_HASHES=<hash>` · `V2_REVIEW_CODE_HASHES=<hash>`. Codurile se generează local cu `scripts/invite-codes.cjs` și rămân la tine |

Simulat local cu aceeași configurație: build PASS, poartă închisă fără cod, `robots: Disallow /`, 20 de capturi fără erori și fără depășiri, nicio formulare „de test” (`outputs/release-2026-11-03/preview-simulation/`).

## Varianta locală privată (fără push, fără Vercel) — pregătită 4 nov.

Pentru testul de pe iPhone fără nicio aprobare de producție: laptopul servește V2, iar telefonul îl deschide printr-o rețea privată **Tailscale** (gratuit, plan Personal). Adresa `https://<laptop>.<tailnet>.ts.net/v2` are HTTPS real (necesar pentru `crypto.randomUUID`) și este vizibilă **doar dispozitivelor tale** conectate la același cont Tailscale. Nimic nu este public; PostgreSQL, GoTrue și PostgREST nu sunt expuse (build-ul vizitator nu le folosește deloc).

Ce acoperă: onboarding, biblioteca, filtre, rețete, planul pe 5 zile, lista de cumpărături, persistența în telefon (închizi și revii), galeria foto și consola de revizie. **Nu** acoperă conturile: autentificarea și sincronizarea vin în etapa 2.

Pașii tăi (o singură dată, ~10 min; autentificarea în Tailscale o faci tu):
1. Instalezi Tailscale pe laptop (tailscale.com/download) și pe iPhone (App Store), te conectezi cu același cont pe ambele.
2. În terminalul laptopului, în folderul proiectului:

   ```bash
   V2_BACKEND=none V2_DIST_DIR=.next-phone node scripts/native-command.cjs build
   ```

   ```bash
   V2_DIST_DIR=.next-phone V2_PORT=3103 node scripts/preview-v2.cjs
   ```

   ```bash
   tailscale serve --bg 3103
   ```

3. Pe iPhone, cu Tailscale pornit, deschizi adresa afișată de `tailscale serve`, urmată de `/v2`.
4. La final: `tailscale serve reset` (oprește accesul) și închizi preview-ul.

În PowerShell, variabilele se scriu înainte de comandă: `$env:V2_BACKEND="none"; $env:V2_DIST_DIR=".next-phone"; node scripts/native-command.cjs build`.

Serverul ascultă doar pe `127.0.0.1`; Tailscale îl publică exclusiv în rețeaua ta privată. Preview-ul local deschide `/v2` și consola de revizie fără cod (`V2_ACCESS=public`), ceea ce e acceptabil doar pentru că adresa este vizibilă numai dispozitivelor tale. Checklist-ul de mai jos se aplică la fel.

Verificat local (4 nov.): build-ul vizitator nu conține nicio adresă de backend V2 și fluxurile vizitator trec (`NIGHT-SHIFT-REPORT.md`). Tailscale nu este instalat pe laptop, deci adresa `ts.net` nu a putut fi testată de agent.

## Etapa 2 — același Preview, cu contul tău real (după migrații)

Ce se adaugă:
- login cu email și parolă;
- **Google**;
- **recuperarea parolei** (email în română);
- copiii și istoricul din V1;
- favoritele, planul și lista sincronizate între telefon și laptop;
- izolarea conturilor: testată cu un al doilea cont al tău.

**Precondiții**, în ordinea din `MIGRATION-V1-V2.md` §4, fiecare cu aprobarea ta:
1. Patch-ul V1 este în producție.
2. Backup verificat prin restaurare.
3. Migrațiile V2 aplicate + postflight 9/9.
4. Auth configurat (`AUTH-SETUP.md`), inclusiv adresele Preview de mai jos.

**Variabile Preview** (branch `release/v2-rc`, în plus față de etapa 1):

| Variabilă | Valoare |
|---|---|
| `NEXT_PUBLIC_V2_SUPABASE_URL` | aceeași valoare ca `NEXT_PUBLIC_SUPABASE_URL` (proiectul comun) |
| `NEXT_PUBLIC_V2_SUPABASE_ANON_KEY` | aceeași valoare ca `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cheie publică) |
| `NEXT_PUBLIC_V2_BACKEND_KIND` | `supabase-native` |

Codul acceptă doar proiectul folosit de V1 (`assertAllowedSupabaseUrl`); orice alt proiect este refuzat.

**Supabase → Redirect URLs** (în plus față de producție, doar pentru testul tău):

```text
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/cont
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/recuperare
```

Le scoți după lansare.

Avantajul etapei 2: testezi V2 cu date reale **fără merge în `main`**. V1 rămâne neatins pe `www`, iar dacă ceva nu e în regulă, oprești Preview-ul; nu există niciun rollback de făcut în producție.

## Pe telefon

1. Deschizi adresa → autentificare Vercel (o singură dată) → codul de invitație → V2.
2. Checklist (iOS Safari și Android Chrome):
   - [ ] pagina principală se încarcă în mai puțin de 3 s pe 4G, textul se citește fără zoom;
   - [ ] onboarding-ul (3 întrebări) se face doar cu degetul mare;
   - [ ] biblioteca: tab-uri de categorie, „Fără Lapte”, „Doar de sezon”, „Mai multe idei”;
   - [ ] o rețetă: fotografia sau imaginea de rezervă, alergenii, „Cum servești”, „Un pas pe ecran”;
   - [ ] plan pe 5 zile → „Înlocuiește” → listă de cumpărături → „Copiază lista”;
   - [ ] închizi browserul și revii: datele sunt acolo;
   - [ ] rotirea ecranului fără derulare orizontală;
   - [ ] `/v2/revizie/fotografii`: imaginile candidate, checklist-ul, exportul deciziilor.
3. Doar în etapa 2:
   - [ ] login cu email;
   - [ ] logout → „Continuă cu Google”;
   - [ ] „Am uitat parola” → email → parolă nouă (funcționează și în V1);
   - [ ] pe laptop vezi același plan;
   - [ ] cu al doilea cont nu vezi nimic din primul.

## Performanță măsurată (încărcare la rece, 4G lent 1,6 Mbps, procesor de telefon 4× mai lent)

4 nov., după optimizări (mediane; înainte → după, `outputs/release-2026-11-04/perf/COMPARISON.json`):

| Pagină | Conținutul principal (LCP) | Stabilitate (CLS) | Blocare (TBT) | JavaScript |
|---|---|---|---|---|
| Acasă | 1,4 → 1,4 s | 0,012 | 518 → 510 ms | 313 → 304 KB |
| Bibliotecă | 3,3 → **0,9 s** | 0,015 | 613–697 → **383 ms** | 313 → 304 KB |
| Rețetă cu fotografie | 3,4 → **1,3 s** | 0,015 | ~558 → **428 ms** | 313 → 305 KB |
| Plan | 3,1 → **0,9 s** | 0,015 | ~585 → **357 ms** | 313 → 304 KB |

Concluzie:
- **LCP și CLS** sunt sub pragurile „bune” (2,5 s și 0,1) pe toate paginile.
- **TBT** rămâne peste 200 ms. Cauza principală este hidratarea componentelor client mari. Planul este în `NIGHT-SHIFT-REPORT.md` §5: Server Components pentru părțile statice, 1–2 zile.
- **Ce s-a schimbat:**
  - titlurile și rețeta se randează pe server;
  - rețetele sunt prerandate;
  - catalogul se calculează la build;
  - chatul V1 nu mai ajunge pe paginile V2.
- Măsurătoarea se reface cu `node scripts/perf-mobile.cjs`.
