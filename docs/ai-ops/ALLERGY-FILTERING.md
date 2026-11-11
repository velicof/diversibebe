# Alergii: filtrare pe ingrediente, nu blocare (P0, 11 nov. 2026)

## Cauza blocajului (iPhone, contul fondatorului)

Contul are o alergie înregistrată în V1. V1 salvează orice alergie fără copil (`allergy_records.baby_id = null`).
V2 trata orice alergie din cont, pentru orice copil, ca „necesită îndrumare individuală”:

- client: `v2_load_state.requiresClinicalGuidance = true` → `Provider` punea `clinicalGuidance` → `recommend()` întorcea
  `[]` (Descoperă 0 rețete, Azi fără idei, butonul de plan dezactivat, bifa din Profil blocată);
- server (încă în producție): `v2_apply_action` refuză `plan`/`confirm` („individual guidance required”), politica
  `v2_plan_owner` refuză rândul în `meal_plans`, iar triggerul `v2_confirmation_clock` refuză confirmarea.

## Ce face acum

- `src/features/v2/allergy.ts`: pentru copilul activ ia alergiile lui și pe cele „pentru tot contul”, cumulativ.
  Fiecare rețetă primește un status din ingredientele scrise:
  - **Conține un alergen declarat** — grupa UE a alimentului (cu derivate: unt/iaurt → lapte, maioneză → ou,
    paste/pâine → gluten…), numele alimentului sau `ingredientIds`;
  - **Ingrediente insuficient verificate** — ingrediente care pot ascunde alergenul (pâine, biscuiți, sos, „fructe”…)
    sau un aliment scris de mână în V1, pe care nu-l cunoaștem;
  - **Compatibilitate verificată pe baza ingredientelor disponibile** — nimic din cele de mai sus.
- Sugestii (Azi, onboarding, import vizitator) și planul automat folosesc **doar** rețetele compatibile.
- Descoperă rămâne deschisă: întâi compatibile, apoi neverificate, marcate; cele care conțin alergenul apar doar la
  cerere („doar pentru informare”), marcate, și nu pot intra în plan (butoane dezactivate + verificare în `dispatch`).
- Plan: butonul nu mai e dezactivat de alergie. Dacă ies mai puțin de 5 zile, pagina spune câte rețete au fost lăsate
  deoparte pentru alergen și câte ca neverificate; nu completează planul cu ele.
- Profil: copilul activ (cu alegere când sunt mai mulți), alergiile copilului cu domeniul lor, asociere explicită
  „Asociază cu {copil}” (confirmare, nimic șters; V1 citește alergiile după `user_id`, deci nu e afectat),
  separat „Ingrediente folosite pentru personalizare” (cele 8) și „Istoricul complet al alimentelor încercate” (V1).
- „Oprește personalizarea” e separat: oprește sugestiile în sesiune, nu și excluderea alergenilor.
- Mesajul medical (`ALLERGY_NOTICE`) apare în Azi, Descoperă, Plan și Profil. Nu folosim „100% sigur”.

## Migrație pregătită, NEAPLICATĂ în Supabase

`supabase/migrations/20261111100000_v2_allergy_filtering.sql` (adăugată în `supabase/v2-release.cjs`):
scoate doar refuzul pe alergie din `v2_apply_action`, `v2_confirmation_clock` și politica `v2_plan_owner`.
Proprietatea copilului și etapa (≥ 6 luni) rămân verificate. Funcțiile sunt editate pe corpul deja instalat;
dacă acesta diferă de cel așteptat, migrația se oprește. Nu șterge și nu modifică rânduri.
Aplicată și verificată doar local (PGlite în teste, PostgreSQL nativ local).

Fără ea, pe Preview: Descoperă și sugestiile funcționează, dar **salvarea planului și confirmarea** sunt refuzate
de server pentru contul cu alergie (aplicația arată eroarea de salvare).

## Limite ale filtrării

- Judecăm doar textul ingredientelor din rețetă; nu știm compoziția produselor cumpărate, urme sau contaminare
  încrucișată. „Compatibil” nu înseamnă „fără alergeni”.
- Serverul nu cunoaște ingredientele rețetelor: excluderea e făcută în aplicație. Un client modificat ar putea
  salva în plan o rețetă cu alergen (doar în propriul cont).
- Alimentele scrise de mână în V1 fac toate rețetele „insuficient verificate” (deci niciun plan automat) până la
  o potrivire exactă; e intenționat conservator.
- Severitatea din V1 („ușoară”/„severă”) nu schimbă filtrarea: orice alergie exclude la fel.
- Lista de ingrediente care pot ascunde un alergen e editorială, nu medicală, și poate avea omisiuni.

## Retest iPhone (contul fondatorului, după aprobarea migrației și a unui build nou de Preview)

1. Azi: apare o idee și mesajul „Recomandările sunt filtrate…”.
2. Descoperă: lista nu mai e goală; cardurile au marcaj; bifa „Arată și … rețete care conțin un alergen declarat”.
3. Deschide o rețetă marcată „Conține…”: „Adaugă în plan” dezactivat.
4. Plan → „Arată 5 zile de mese” → „Salvează planul”: se salvează fără eroare.
5. Profil: „Profilul activ: Eduard”, alergia „înregistrată pentru tot contul”; „Asociază cu Eduard” → confirmă →
   „doar pentru Eduard”. Istoricul complet afișează alimentele încercate (9), separat de cele 8 de personalizare.
6. Deconectare și reconectare: alergia, asocierea și planul rămân.
7. V1 (/alergii): alergia apare neschimbată.
