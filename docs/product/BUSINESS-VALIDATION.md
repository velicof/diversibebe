# Validare comercială

*13 nov. 2026 · ipoteze de testat; **nicio plată nu se implementează** până la decizia GO.*

## 1. Structura Free / Premium propusă

Regulă: **siguranța nu se plătește**. Premium = timp economisit și planificare avansată.

| Funcție | Free | Premium |
|---|---|---|
| Profil copil, etapă, alergii declarate | ✓ | ✓ |
| **Excluderea alergenilor** în recomandări și plan | ✓ | ✓ |
| Informații de siguranță (pregătire, servire, alergeni pe rețetă) | ✓ | ✓ |
| Biblioteca de rețete, căutare, filtre | rețetele de bază | întreaga bibliotecă + rețete noi lunar [I] |
| Istoric alimente încercate și alergii | ✓ | ✓ |
| Idei pentru azi | ✓ | ✓ |
| Plan | **1 zi**, mesele alese, înlocuire individuală | **3 / 5 / 7 zile**, regenerare, mese păstrate |
| Lista de cumpărături | pentru planul de 1 zi | pentru planul complet, cu „am acasă” |
| Planuri salvate și reluate („săptămâna care a mers”) | — | ✓ (P1, după validare) |
| Partajare cu partenerul / bunica (același copil) | — | ✓ (P1, după validare) |
| Export/printare plan + listă | — | ✓ (P2) |

De ce așa: Rețetaria arată că se plătește pentru *meniul gata făcut + lista* [C]; Huckleberry
arată că se plătește pentru *personalizare și timp*, nu pentru acces la siguranță [C]. Planul de
o zi gratuit lasă părintele să simtă „momentul magic” fără să-l blocăm.

**Neutru față de AmiYammi (gratuit) [I]:** gratuitul nostru trebuie să fie bun singur (azi +
alergii + istoric). Premium vinde cele 30–60 de minute pe săptămână economisite la planificare și
cumpărături.

## 2. Prețuri de testat

| Variantă | Lunar | Anual (propus) | Ancoră pe piață |
|---|---|---|---|
| A | 19 lei | 149 lei (≈ 12,4 lei/lună) | Rețetaria Degust 19,99 lei [C] |
| B | 24 lei | 189 lei | — |
| C | 29 lei | 229 lei | Rețetaria Diversific 29,99 lei [C] |

Trial: 14 zile Premium fără card (ca la Huckleberry [C]), apoi revenire la Free fără pierderi.
Ipoteză [I]: anualul se vinde mai ușor în primele 2 luni de diversificare (perioada cu cea mai
mare nevoie).

## 3. Definiții și ținte

Evenimentele există deja în aplicație (`product_events`, `src/features/v2/model.ts`).

| Metrică | Definiție | Țintă pentru GO [I] |
|---|---|---|
| **Activare** | În primele 24 h: profil cu etapă **și** (plan salvat **sau** „Am folosit ideea”) — `plan_slot_saved` / `meal_confirmed` | ≥ 40% din conturile noi |
| **Moment magic** | Timpul de la deschidere la primul plan salvat (`first_relevant_choice` → `plan_slot_saved`) | mediană < 2 min |
| **Retenție Z7** | Revine în zilele 6–8 și face o acțiune de masă (`return_session` + oricare din `meal_*`/`plan_slot_saved`) | ≥ 30% |
| **Retenție Z30** | Idem în zilele 28–32 | ≥ 15% |
| **Utilizare săptămânală** | Săptămâni cu ≥ 3 zile cu acțiune de masă | ≥ 35% din activi |
| **Intenție de plată** | `premium_interest` cu preț ≠ 0 (pagina /v2/premium testează deja 19/24/29/0) | ≥ 15% din activii Z7 |
| **Conversie (test plătit)** | Trial → plătitor | ≥ 5% din activi în 30 de zile; ≥ 8% = semnal puternic |
| **Churn lunar** | Plătitori care nu reînnoiesc | ≤ 10% |

Notă: țintele sunt de pornire, calibrate după aplicații de consum de nișă; le ajustăm după primele
50 de familii.

## 4. Experimente, în ordine (buget 0 lei)

### E1 — Beta privat calitativ (2 săptămâni, 15–25 familii)
- Recrutare: cunoștințe, grupuri de mame (cu acordul administratorilor), utilizatori V1 activi
  (mesaj manual, nu email automat).
- Ce măsurăm: activare, Z7, timpul până la primul plan, ce înlocuiesc în plan.
- Interviu de 20 min cu 8–10 familii: „ce ai făcut ieri la masă?”, „ce ai plăti?”.
- **Criteriu de trecere:** ≥ 40% activare, ≥ 30% Z7, ≥ 5 familii spun spontan că i-a scutit timp.

### E2 — Test de preț fără plată (în același beta)
- Pagina /v2/premium (există) arată Premium cu unul din cele 3 prețuri, distribuit aleator per
  cont; butonul „Vreau Premium” înregistrează `premium_interest` + prețul.
- **Criteriu:** ≥ 15% din activii Z7 apasă la un preț ≠ 0; diferență clară între 19 și 29.

### E3 — Precomandă / „fake door” cu angajament (după E1+E2)
- „Rezervă Premium la X lei, plătești doar la lansare” cu email de confirmare (dublu opt-in).
- **Criteriu:** ≥ 20 de rezervări din ≥ 100 de familii active.

### E4 — Test plătit real (doar după GO)
- 50–100 de familii, un singur preț (câștigătorul E2), trial 14 zile.
- Cerințe înainte: procesator de plăți, termeni și condiții, politică de rambursare, facturare
  (SRL), ANPC; consultanță juridică minimă. **Toate au cost** → necesită buget aprobat.

## 5. Criterii pentru un test plătit (GO)

Toate trebuie îndeplinite:
1. Activare ≥ 40% și Z7 ≥ 30% pe ≥ 50 de familii.
2. Intenție de plată ≥ 15% la cel puțin un preț.
3. Planificatorul flexibil + lista folosite de ≥ 50% din activii Z7 (valoarea pe care o vindem).
4. Zero incidente de siguranță raportate (rețetă cu alergen propusă unui copil cu alergie).
5. Rețetele Premium au statut editorial clar (fără claim medical).

## 6. Ce NU dezvoltăm înainte de validare

- Integrare de plăți, facturare, cupoane, abonamente de familie.
- Partajare multi-utilizator, planuri salvate, export PDF.
- Aplicație nativă iOS/Android, notificări push.
- Rețete generate cu AI, chat AI.
- Comunitate, comentarii, rețete publicate de utilizatori.
- Somn, scutece, creștere, orice funcție fără legătură cu alimentația.
- Catalog extins masiv înainte să știm ce rețete se folosesc (măsurăm întâi).

## 7. Riscuri comerciale

| Risc | Probabilitate | Atenuare |
|---|---|---|
| Concurent gratuit bun (AmiYammi) | mare | Diferențiere pe alergii + istoric + listă; gratuitul nostru util singur |
| Părinții nu revin după primele 2 săptămâni | medie | Azi + „Am pregătit” zilnic; plan reînnoit săptămânal |
| Perioadă scurtă de nevoie (6–18 luni) | mare | Anual cu reducere; extindere 2–4 ani după validare |
| Încredere: rețete fără revizie medicală | medie | Transparență, statut editorial, revizie de specialist ca prioritate de buget |
| Costuri legale la plată | sigur | Doar după GO, cu buget separat |
