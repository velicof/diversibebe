# Acces privat online pentru testul V2 pe telefon

Cost: 0 lei. Producția (www.diversibebe.com, Supabase) nu se modifică.

## Varianta aleasă: Vercel Preview pentru `release/v2-rc`, în modul vizitator

| | |
|---|---|
| Adresa | `https://diversibebe-git-release-v2-rc-velicofs-projects.vercel.app/v2` (adresa de branch Vercel) |
| Cine o poate deschide | numai membrii echipei Vercel autentificați. Protecția este activă pe proiect: `ssoProtection: all_except_custom_domains`, verificat read-only pe 3 nov. |
| Date | **niciuna în baza reală**: Preview-ul nu primește cheile Supabase V2, deci V2 rulează în modul vizitator (alegerile rămân în telefon) |
| HTTPS | da. Necesar: V2 folosește `crypto.randomUUID()`, pe care browserul îl permite numai pe HTTPS |

### Ce trebuie aprobat (3 acțiuni, fiecare separat)

1. **Push** pentru `release/v2-rc` pe GitHub. Fără merge și fără PR către `main`. Vercel construiește automat un Preview; producția se construiește numai din `main`.
2. **3 variabile de mediu** în Vercel, ținta **Preview**, limitate la branch-ul `release/v2-rc`:

   | Variabilă | Valoare | De ce |
   |---|---|---|
   | `DIVERSIBEBE_V2_PREVIEW` | `1` | `/v2` există doar cu acest flag |
   | `V2_ACCESS` | `public` | pe Preview nu folosim coduri de invitație; accesul e deja limitat de autentificarea Vercel |
   | `V2_REVIEW_ACCESS` | `public` | consola `/v2/revizie`, pentru tine și, ulterior, pentru pediatră |

   **Nu** se adaugă `NEXT_PUBLIC_V2_SUPABASE_URL` / `ANON_KEY`: V2 nu scrie nimic în baza reală până la canary.
3. **Deschizi adresa pe telefon**, te autentifici o dată în Vercel și parcurgi checklist-ul de mai jos.

### Simulat local (3 nov.), cu aceeași configurație

| Verificare | Rezultat |
|---|---|
| Build ca pe Vercel (`next build --webpack`, `VERCEL_ENV=preview`, fără backend V2) | PASS |
| Fără `V2_ACCESS` | `/v2` → `/acces-beta`, `/v2/revizie` → `/acces-revizie` (rămâne închis) |
| `robots.txt` pe Preview | `Disallow: /` (neindexabil) |
| Pagina principală V1 | 200 |
| Fluxul complet: bibliotecă, filtre, rețetă, plan 5 zile, consolă de revizie | 20 de capturi, mobil și desktop, fără erori și fără depășiri (`outputs/release-2026-11-03/preview-simulation/`) |
| Formulări | niciun „cont de test”, „sintetic” sau „mediu local”; contul arată „Conectarea este temporar indisponibilă” |

### De știut

- **Variabilele secrete ale proiectului** (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`):
  - sunt setate azi pentru toate mediile, inclusiv Preview;
  - Vercel le marchează „readable-secret”;
  - codul din `release/v2-rc` nu le folosește: cheia service role nu e importată, BebeAsist e oprit, ruta de email e retrasă.
  - Recomandare (backlog #17): marchează-le „Sensitive” și scoate-le de pe Preview.
- **Paginile V1 din Preview** folosesc Supabase-ul real, ca orice Preview de până acum. Dacă te autentifici acolo în V1, lucrezi pe contul tău real.
- **Varianta „telefon pe Wi-Fi-ul de acasă”** (`http://192.168…:3100`) este respinsă: fără HTTPS, onboarding-ul se oprește la `crypto.randomUUID()`.

## Checklist pe telefon (iOS Safari și Android Chrome)

1. Pagina principală V2 se încarcă în mai puțin de 3 secunde pe 4G; textul se citește fără zoom.
2. Onboarding-ul (3 întrebări) se completează doar cu degetul mare; tastatura nu acoperă butoanele.
3. Biblioteca:
   - tab-urile de categorie derulează orizontal;
   - filtrele „Fără Lapte” și „Doar de sezon” schimbă numărul afișat;
   - „Mai multe idei” încarcă alte rețete.
4. O rețetă: fotografia sau imaginea de rezervă, alergenii, „Cum servești”, modul „Un pas pe ecran”.
5. Salvezi o idee, apoi „Adaugă în plan” → Planul meu → „Arată 5 zile de mese” → „Înlocuiește” → Lista de cumpărături → „Copiază lista”.
6. Închizi browserul și revii: favoritele și planul sunt încă acolo (pe același telefon).
7. Rotești telefonul: nu apare derulare orizontală.
8. `/v2/revizie`: filtrul „Risc”, deschiderea unei rețete, exportul CSV (se descarcă fișierul).

Notează problemele cu ecranul și pasul. Le corectez și refac capturile.

## După migrații (canary)

Testul conturilor reale (email, Google, istoricul V1 în V2) se face pe producție, numai cu contul tău. Vezi `MIGRATION-V1-V2.md` §4, etapa 7.
