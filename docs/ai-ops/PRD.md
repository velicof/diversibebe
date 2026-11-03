# PRD — DiversiBebe 2.0 (prima lansare)

## 1. Public și problemă

**Părinți din România cu copii între 6 și 24 de luni**, aflați în diversificare sau trecând la mesele familiei. Mulți folosesc deja V1 (435 de conturi).

| Problemă | Cum o rezolvă V2 |
|---|---|
| „Nu știu ce să-i gătesc azi” | 3 idei potrivite etapei, ingredientelor din casă și timpului disponibil, fără cont |
| Căutare lungă de rețete | rezultat în ≤3 întrebări |
| Organizarea săptămânii | plan pe 5 zile cu înlocuire dintr-un clic |
| Cumpărături | listă cumulată, cu „am acasă” |
| Teama de greșeli | numai rețete revizuite de un specialist, formă de servire pe etapă, alergeni vizibili |

## 2. Experiența centrală (singurul flux care trebuie să fie excelent)

Intră → 3 întrebări → idei de mese → rețetă → salvează → plan 5 zile → listă de cumpărături → revine (cont creat sau existent).

## 3. Incluse la prima lansare

| Funcție | Ecran | Stare cod |
|---|---|---|
| Homepage cu valoare înainte de cont | `/v2` | gata |
| Onboarding 3 întrebări (provocare, vârstă, context) | `/v2/onboarding` | gata |
| Rezultat personalizat (3 idei) | onboarding | gata |
| „Ce gătim azi?” | `/v2/azi` | gata |
| Bibliotecă + căutare + filtre (etapă, masă, timp, ingrediente) | `/v2/idei` | gata |
| Detaliu rețetă (ingrediente, pași, alergeni, textură/servire, păstrare) | `/v2/retete/[id]` | gata; textura confirmată de specialist în lotul 1 |
| Favorite | — | gata |
| Plan 5 zile + alternative + salvare | `/v2/plan` | gata |
| Listă de cumpărături + „am acasă” + copiere | `/v2/plan` | gata |
| Cont: signup, login, logout, recuperare parolă, mai mulți copii | `/v2/cont`, `/v2/profil`, `/v2/recuperare` | gata (local); online după staging |
| Confirmare opțională „am gătit” | `/v2/jurnal` | gata |
| Prezentare Premium + măsurarea interesului | `/v2/premium` | gata, fără checkout |

## 4. Amânate (nu blochează lansarea)

BebeAsist (AI), checkout și plăți, mai multe mese pe zi în plan, export PDF, partajare listă, grupare pe raioane, administrare de conținut în interfață, notificări, rețete proprii în V2, personalizare pentru alergii diagnosticate, aplicație nativă.

## 5. Experiența pe etape

| Etapă | Ce primește părintele | Limite |
|---|---|---|
| Pregătire (<6 luni sau nesigur) | resurse despre semnele de pregătire, cu sursă | fără plan, fără rețete (E2E verificat) |
| 6+ | piureuri fine, un ingredient nou odată, porții mici | doar rețete aprobate pentru 6+ |
| 8+ | texturi mai groase, finger food moale | — |
| 10+ | bucăți mici moi, combinații | — |
| 12+ | mâncarea familiei adaptată | sare/zahăr limitate conform reviziei |
| Alergii înregistrate (17 familii V1) | mesaj de îndrumare la specialist; ideile rămân de explorat | **fără plan automat** până la o revizie clinică a filtrării pe alergeni |

## 6. Fluxuri și stări de eroare

| Situație | Comportament |
|---|---|
| Fără cont | totul funcționează pe dispozitiv; „Continuă în spațiul meu” propune contul |
| Backend indisponibil / offline | datele rămân pe dispozitiv, mesaj de sincronizare (E2E „eroare rețea”) |
| Sesiune expirată | reautentificare fără pierderea datelor locale (E2E JWT expirat) |
| Nicio idee pentru combinație | ecran gol cu acțiuni de relaxare a filtrelor de preferință (nu și a siguranței) |
| Rețetă nepublicată sau inexistentă | 404 „Rețetă indisponibilă” |
| Email neconfirmat | mesaj clar + retrimitere |
| Fără cod de invitație (beta) | `/acces-beta` |

## 7. Free și demonstrația Premium

- **Gratuit:** idei zilnice, bibliotecă, detalii rețete, favorite, siguranță esențială, un plan de 5 zile, lista de cumpărături.
- **Plus (demonstrație, fără plată):** planuri salvate și reutilizabile, mesele familiei, personalizare avansată. Se măsoară `premium_interest` după valoare (după salvarea planului). Fără reduceri fictive, testimoniale sau presiune de timp. Checkout: aprobare separată.

## 8. Criterii de acceptare măsurabile

| Criteriu | Țintă | Cum se măsoară |
|---|---|---|
| Timp până la primele idei | ≤60 s, ≤3 întrebări | `onboarding_started` → `personalized_result_viewed` (`elapsedMs`) |
| Finalizare onboarding | ≥60% din cei care încep | evenimente |
| Plan creat | ≥30% din conturile active în săptămâna 1 | `meal_added_to_plan`, `shopping_list_generated` |
| Revenire | ≥30% în săptămâna 2 | `return_session` |
| Conținut | 100% din rețetele afișate cu revizie semnată | `publishedCatalog` = rețetele afișate; test `editorial-gate` |
| Acoperire | ≥20 rețete publicate, toate 4 mesele, etapele 6/8/10/12 | `docs/ai-ops/editorial/BATCH-1.md` |
| Calitate | 0 erori critice, E2E esențiale verzi, 0 depășiri orizontale la 390 px | QA |
| Interes Premium | ≥6/30 participanți la pilot cu interes explicit | `premium_interest` + interviu |
