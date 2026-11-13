# DiversiBebe 2.0 — Viziune de produs

*13 nov. 2026 · document de lucru, înainte de dezvoltare*

## Poziționare

**DiversiBebe este asistentul pentru mesele bebelușului și ale copilului mic, în România.**
Răspunde zilnic la o singură întrebare: *„Ce îi gătesc copilului azi și cum organizez mesele
următoarelor zile, ținând cont de vârstă, alergii și alimentele deja încercate?”*

Nu e o aplicație generală de parenting. Nu urmărim somn, scutece sau parametri medicali. Tot ce
construim trebuie să scurteze drumul de la „nu știu ce să-i dau” la „masa e pe foc și am lista”.

Huckleberry e folosit ca model de **mecanism comercial** (gratuit util + abonament pentru
economie de timp și personalizare, revenire zilnică prin date proprii), nu ca model de produs
sau de interfață. Huckleberry e centrat pe somn; partea de alimentație solidă este acolo un jurnal,
fără rețete, plan sau listă de cumpărături (vezi `COMPETITIVE-ANALYSIS.md`).

## Public țintă

**Primar:** părinți din România, mediu urban, copil 6–24 luni, la început sau în mijlocul
diversificării, cu timp puțin (amândoi lucrează sau un părinte singur cu copilul ziua).

Semne că sunt publicul nostru:
- gătesc separat pentru copil sau adaptează mâncarea familiei;
- au deja o listă mentală de „ce a încercat / ce nu-i place / ce i-a făcut rău”;
- caută rețete pe Instagram, grupuri de Facebook, bloguri, și pierd timp cu asta zilnic.

**Secundar (mai târziu):** bunici sau bone care gătesc după instrucțiunile părinților
(acces partajat), copii 2–4 ani cu „mofturi”.

**Nu e publicul acum:** familii care au nevoie de dietă medicală (alergii multiple severe,
afecțiuni digestive diagnosticate). Pentru ele produsul filtrează prudent și trimite la
specialist; nu pretindem plan terapeutic.

## Problema, în ordinea durerii

1. **Decizia zilnică** — „ce fac azi” — repetată de 2–3 ori pe zi.
2. **Siguranța** — vârsta potrivită, forma de servire, alergenii, alimentele deja introduse.
3. **Organizarea** — planul pe câteva zile și cumpărăturile aferente.
4. **Memoria** — ce a încercat, ce a refuzat, ce reacții au fost.

## Diferențiere

| Ce oferim | De ce contează | Cine mai face asta în RO |
|---|---|---|
| Rețete românești, filtrate pe **etapă + alergii + alimente încercate**, simultan | Alergia nu oprește aplicația; doar exclude, cu explicație | Parțial (filtre de alergeni la Rețetaria, generator pe vârstă la AmiYammi) |
| **Plan flexibil** pe 1–7 zile, cu mesele alese de părinte | Copilul de 6 luni nu are 3 mese; cel de 12 luni are | AmiYammi (2–3 mese + gustare), Rețetaria (meniu fix săptămânal) |
| **Listă de cumpărături** din plan, cu „am acasă” | Economie reală de timp | Rețetaria (prin email), WISERAPPS |
| **Istoric și alergii din V1** păstrate, legate de copil | Datele existente nu se pierd | — |
| Fără promisiuni medicale: „compatibil pe baza ingredientelor”, nu „100% sigur” | Încredere, risc legal mic | — |
| Funcționează fără cont, apoi trece în cont fără pierderi | Activare rapidă | — |

**Avantajul care se poate apăra în timp:** datele copilului (alimente încercate, reacții, ce a mers)
transformate în propuneri mai bune. Cu cât folosești mai mult, cu atât planul devine mai al tău.
Catalogul de rețete singur nu e un avantaj durabil (concurenții au 1.500–2.000 de rețete).

## Principii de produs

1. **Maximum de valoare, minimum de interacțiuni.** Fluxul principal are 6 pași
   (alegi copilul → vezi ce poți pregăti azi → generezi planul → schimbi ce vrei → lista →
   marchezi ce s-a mâncat). Orice ecran nou trebuie să scurteze acest drum.
2. **Siguranța nu se plătește.** Excluderea alergenilor, informațiile de siguranță, rețetele de
   bază și istoricul rămân gratuite.
3. **Niciun claim medical nevalidat.** Rețetele nu au revizie medicală; o spunem.
4. **Datele părintelui sunt ale lui.** Nimic nu se șterge sau se rescrie fără o acțiune explicită.
5. **Validăm înainte să construim.** Funcțiile Premium se construiesc după ce testul de preț
   arată intenție reală de plată (vezi `BUSINESS-VALIDATION.md`).

## Ce NU construim acum

Somn, scutece, creștere/greutate, monitorizare medicală, chat AI general, comunitate/forum,
marketplace de produse, livrări de mâncare, aplicație nativă separată (rămânem PWA/web până la
validare).
