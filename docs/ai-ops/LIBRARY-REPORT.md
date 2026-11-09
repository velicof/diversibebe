# Biblioteca DiversiBebe 2.0 — raport

Generat de `scripts/library-report.cjs` din catalogul folosit de aplicație (2026-11-09). Sursa: `src/app/lib/recipesDatabase.ts` (neschimbată); corecturile V2: `src/features/v2/content/corrections.ts`; regulile: `content/safety.ts`.

## Cifre

| | Rețete |
|---|---|
| 1. Importate (toate ID-urile vechi, inventariate) | **291** (Mic dejun 74, Prânz 121, Cină 71, Gustare 25) |
| 2. Corectate editorial | **34** — 15 cu modificări de conținut (siguranță/claritate) + 19 doar cu alergeni completați |
| 3. Fără probleme identificate | **255** |
| 4. Necesită revizie de specialitate (nepublicate) | **2** |
| 5. Gata pentru publicare editorială | **289** (Mic dejun 74, Prânz 119, Cină 71, Gustare 25) |
| Aprobate de specialist (aviz semnat) | **0** — nicio aprobare medicală nu a fost atribuită |
| 6. Fotografii | 0 aprobate · 8 ilustrații vechi generice · 0 pilot cerute · 271 lipsă (prompt pregătit) |

„Publicată” înseamnă: trece verificarea editorială și regulile de siguranță. **Nu înseamnă aviz medical.** Interfața spune asta explicit pe fiecare rețetă.

## Ce au găsit regulile în textul vechi

Auditul anterior raporta 77 de semnale (alergeni/sare) în lista scurtă: semnale automate, nu probleme confirmate. Verificate individual pe toate cele 291 de rețete:

- **Sare, zahăr, miere adăugate: 0.** Toate mențiunile de sare sunt „fără sare”; nu există miere sau zahăr adăugat.
- **Struguri, popcorn, mezeluri, lapte de orez, pește cu mercur ridicat: 0.**
- Laptele de vacă apare sub 12 luni doar la gătit (permis); nucile apar aproape mereu măcinate sau ca unt fin.
- **Probleme reale de siguranță în textul vechi: 13 rețete**, toate corectate:

| Rețetă | Problemă (înainte) |
|---|---|
| `paste-mic-dejun-branza-ou` | Ou posibil negătit complet. |
| `ou-fiert-soldati-toast` | Ou posibil negătit complet. |
| `cereale-casa-nuci-fructe-10` | Semințe întregi de floarea-soarelui sau dovleac (risc de înec). |
| `clatite-clasice-fructe-12` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `paine-perdue-fructe-12` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `galuste-branza-dulci-12` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `croissant-branza-rosii-12` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `bol-acai-fructe-12` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `cartof-dulce-fasole-avocado` | Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine). |
| `paste-pesto-pui` | Nuci sau arahide în bucăți (risc de înec sub 5 ani). |
| `orez-pui-legume-asiatic` | Condiment cu mult sodiu (sos de soia, cub/bază de supă). |
| `supa-crema-dovlecel-morcov-12` | Crutoane tari (risc de înec). |
| `supa-crema-broccoli-12` | Crutoane tari (risc de înec). |

- Alergeni: etichete standardizate la lista UE (14) pentru 169 rețete („Lactoză” → „Lapte”: alergenul este proteina din lapte, nu lactoza; „Nucă de cocos” nu este alergen UE și rămâne ca informație). Alergeni lipsă adăugați din ingrediente: 20 rețete (cel mai des țelina din ciorbe).

## Excepții: rețete care NU sunt afișate familiilor

| Rețetă | Motiv | Ce trebuie |
|---|---|---|
| `pate-ficat-pui-pere` (Pate de ficat de pui cu pere fierte, 6+ luni) | Ficat de la 6 luni: frecvența și porția (vitamina A) trebuie stabilite de un specialist. | decizie de specialist în consola de revizie |
| `ficatel-pui-piure-cartofi-12` (Ficățel de pui cu piure de cartofi, 12+ luni) | Ficat: frecvența și porția (vitamina A) trebuie stabilite de un specialist. | decizie de specialist în consola de revizie |

Rămân vizibile pentru fondator și specialist în `/v2/revizie`, cu motivul afișat.

## Avertismente de servire (afișate în rețetă, nu blochează)

| Avertisment | Rețete |
|---|---|
| Gătește oul complet, până când albușul și gălbenușul sunt ferme. | 76 |
| Alergen major: oferă-l în formă fină, când copilul e sănătos, și urmărește reacțiile. | 47 |
| Verifică atent peștele și îndepărtează toate oasele. | 37 |
| Sub 12 luni, laptele de vacă se folosește doar la gătit, nu ca băutură. | 34 |
| Semințele de chia se lasă să se hidrateze înainte de servire. | 1 |

## Statusuri

| Status | Rețete | Afișată familiilor |
|---|---|---|
| Fără probleme la verificările automate (`imported`) | 255 | da |
| Corectată editorial (`editorially_corrected`) | 34 | da |
| Necesită verificare de specialitate (`needs_specialist_review`) | 2 | nu |
| Verificată și aprobată de specialist (`specialist_approved`) | 0 | da |

Aprobarea de specialist se obține numai printr-o revizie semnată (nume, calificare, dată, surse), legată de textul exact al rețetei; o evaluare AI este respinsă de cod (`hasClinicalReview`). O modificare ulterioară a rețetei anulează aprobarea.

Jurnalul complet al modificărilor: `editorial/CORRECTIONS-LOG.md`. Fotografiile: `photos/PHOTO-REPORT.md`.
