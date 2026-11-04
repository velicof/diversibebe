# DiversiBebe V2 pe telefon

## Acum: privat, cu cont de test, cost 0

Laptopul servește V2 și propriul mediu local (PostgreSQL + GoTrue + PostgREST), iar iPhone-ul îl deschide printr-o rețea privată **Tailscale** (plan Personal gratuit).

**Ce poți folosi:** onboarding, creare de cont și autentificare, biblioteca, recomandările, planul pe 5 zile, lista de cumpărături, favorite, persistența (închizi browserul, te reconectezi și datele sunt acolo), galeria foto.

**Izolare:**
- datele stau în baza locală de pe laptop, fără nicio legătură cu Supabase-ul de producție;
- conturile acceptă doar adrese `@example.test`;
- adresa `https://<laptop>.<tailnet>.ts.net` este vizibilă **doar dispozitivelor tale** din Tailscale;
- totul trece printr-un singur punct local (`scripts/phone-gateway.cjs`, doar `127.0.0.1`): baza de date, GoTrue, PostgREST și căsuța de email locală nu sunt accesibile direct de pe telefon;
- același mod de lucru refuză orice adresă publică (`resolveBackendUrl`, testat).

### Pași (prima dată ~15 min; apoi 1 min)

Laptopul trebuie să rămână pornit și treaz cât testezi.

**1. Instalezi Tailscale** (o singură dată, autentificarea o faci tu):
- pe laptop: tailscale.com/download/windows;
- pe iPhone: aplicația Tailscale din App Store;
- te conectezi cu **același cont** pe ambele și pornești conexiunea pe iPhone.

**2. Pornești V2**, în folderul proiectului, într-un terminal care rămâne deschis:

```bash
node scripts/phone-preview.cjs --build
```

`--build` e necesar prima dată și după schimbări de cod. Scriptul pornește tot și afișează adresa exactă de deschis.

**3. Deschizi accesul privat**, într-un alt terminal:

```bash
tailscale serve --bg 3105
```

Dacă Tailscale cere activarea HTTPS pentru rețeaua ta, deschide linkul afișat, confirmă și repetă comanda.

**4. Pe iPhone**, cu Tailscale pornit, deschizi în Safari adresa afișată la pasul 2 (`https://<laptop>.<tailnet>.ts.net/v2`).

**5. Contul:** atingi **Conectează contul de test** (sau deschizi `/v2/cont`) → **Creează un cont de test** → orice adresă `ceva@example.test`, o parolă de minimum 8 caractere și etapa copilului. Nu folosi datele unui cont real.

**La final:** `Ctrl+C` în primul terminal, apoi:

```bash
tailscale serve reset
```

### Ce să verifici pe iPhone

- [ ] pagina se încarcă rezonabil și textul se citește fără zoom;
- [ ] „Hai să găsim o idee de masă” → 3 întrebări → primele idei, doar cu degetul mare;
- [ ] Descoperă: căutare, primele rețete pe primul ecran, butonul **Filtre**, „Fără Lapte”, „Mai multe idei”;
- [ ] o rețetă: fotografia sau imaginea de rezervă, alergenii, „Cum servești”, „Un pas pe ecran”, **Salvează**, **Adaugă în plan** → „Vezi planul”;
- [ ] Planul meu → „Arată 5 zile de mese” → înlocuiești o masă → „Salvează planul”;
- [ ] „De cumpărat”: bifezi rapid câteva produse (bifele apar imediat) → „Am acasă”;
- [ ] Azi: arată câte mese ai planificate și câte produse mai ai de cumpărat;
- [ ] închizi Safari, revii: datele sunt acolo; deconectare → reconectare;
- [ ] Plus (`/v2/premium`): „Mi-ar fi util” → întrebarea despre preț. Nu există plăți;
- [ ] `/v2/revizie/fotografii`: imaginile candidate, checklist, export. Niciuna nu este aprobată încă;
- [ ] rotirea ecranului, fără derulare orizontală.

### Ce am verificat și ce nu

**Verificat:** `tests/e2e/phone.spec.cjs` parcurge tot fluxul de mai sus cu profil de iPhone (touch, 390×844), printr-o adresă `*.ts.net` simulată cu HTTPS local, fără nicio cerere în afara adresei private.

**Nu am putut verifica eu:**
- **Safari real:** testul rulează în Chromium; motorul WebKit nu e instalat aici. Din acest motiv, testul tău de pe iPhone contează;
- **Tailscale real:** nu e instalat pe laptop;
- **recuperarea parolei de pe telefon:** linkul din email duce la serviciul local, deci funcționează doar de pe laptop (`http://127.0.0.1:54324`). Pe telefon testezi asta în etapa cu contul real;
- **Google:** nu există pe stack-ul local. Se testează în canary.

## Mai târziu: Vercel Preview (necesită aprobare)

Adresa: `https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2`. Protecție: Vercel Authentication + cod de invitație + cod separat pentru revizie.

### Etapa 1 — mod vizitator, fără conturi

Fără nicio scriere în baza reală. Alegerile rămân doar în telefon.

| Acțiune (aprobare separată) | Detalii |
|---|---|
| A. Push `release/v2-rc` pe GitHub | fără PR și fără merge; Vercel construiește automat Preview-ul |
| B. Variabile Vercel, ținta Preview, branch `release/v2-rc` | `DIVERSIBEBE_V2_PREVIEW=1` · `V2_INVITE_CODE_HASHES=<hash>` · `V2_REVIEW_CODE_HASHES=<hash>`. Codurile se generează local cu `scripts/invite-codes.cjs` și rămân la tine |

### Etapa 2 — cu contul tău real (după migrații)

Se adaugă: login cu email și parolă, Google, recuperarea parolei, copiii și istoricul din V1, sincronizarea între telefon și laptop.

**Precondiții**, în ordinea din `RELEASE-READINESS.md`, fiecare cu aprobarea ta: patch-ul V1 în producție → backup verificat → migrații + postflight → Auth (`AUTH-SETUP.md`).

**Variabile Preview** suplimentare:

| Variabilă | Valoare |
|---|---|
| `NEXT_PUBLIC_V2_SUPABASE_URL` | aceeași valoare ca `NEXT_PUBLIC_SUPABASE_URL` (proiectul comun) |
| `NEXT_PUBLIC_V2_SUPABASE_ANON_KEY` | aceeași valoare ca `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cheie publică) |
| `NEXT_PUBLIC_V2_BACKEND_KIND` | `supabase-native` |

**Supabase → Redirect URLs** (doar pentru testul tău, le scoți după lansare):

```text
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/cont
https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2/recuperare
```

Avantaj: testezi cu date reale fără merge în `main`. V1 rămâne neatins pe `www`.

Performanța măsurată este în `RELEASE-READINESS.md`.
