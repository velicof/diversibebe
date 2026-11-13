# Roadmap

*13 nov. 2026 · efort în zile de lucru (o persoană + agent). P0 = necesar pentru beta privat;
P1 = după validarea E1/E2; P2 = după GO comercial.*

## Stare de pornire
V2 pe Preview privat: bibliotecă (289 de rețete publicate), filtrare pe alergii (aplicată în
producție 11 nov.), plan 1 masă/zi pe 5 zile, listă de cumpărături, cont + import vizitator,
pagina /v2/premium cu test de interes la 19/24/29 lei. Navigarea de jos pe tipuri de pagină:
corecție locală, nepublicată.

## P0 — beta privat (≈ 12–14 zile)

| # | Ce | Efort | Depinde de | Gata când |
|---|---|---|---|---|
| P0.1 | **Planificator flexibil** (Varianta B extinsă, `V2-PLANNER-SPEC.md`) | 7 | aprobarea specificației și a migrației | Scenariile 1–20 trec pe Chromium + WebKit; retest iPhone |
| P0.2 | **Azi = mesele de azi** + „Am pregătit” per masă | 1,5 | P0.1 | Fluxul în 6 pași fără ecrane intermediare |
| P0.3 | **Alimente încercate** din rețetă („A încercat: morcov”) → istoric V1 (`tried_foods`) | 2 | — | Istoricul din Profil crește din folosirea V2 |
| P0.4 | Navigare pe tipuri de pagină (corecția locală) | 0,5 | — | Publicată pe Preview, verificată pe iPhone |
| P0.5 | Metrici: activare, Z7, Z30, timp până la plan (interogări pe `product_events`) | 1 | — | Raport săptămânal reproductibil |
| P0.6 | Pregătire beta: invitații, mesaj către V1, formular de feedback | 1 | P0.1–P0.3 | 15–25 de familii invitate |

## P1 — după E1/E2 pozitive (≈ 8–10 zile)

| # | Ce | Efort | GO dacă |
|---|---|---|---|
| P1.1 | Delimitare Free/Premium în aplicație (fără plată): planul de 1 zi gratuit, 3–7 zile „Premium în test” | 2 | intenție de plată ≥ 15% |
| P1.2 | Planuri salvate și reluate | 2 | ≥ 30% din activi regenerează săptămânal |
| P1.3 | Partajare cu partenerul/bunica | 3 | ≥ 20% cer explicit în interviuri |
| P1.4 | Lista de cumpărături grupată pe zile / magazine | 1 | folosirea listei ≥ 50% |
| P1.5 | Revizie de specialitate pentru rețetele cele mai folosite (top 50) | buget extern | — |

## P2 — după GO comercial (necesită buget)

| # | Ce | Notă |
|---|---|---|
| P2.1 | Plăți (procesator, T&C, facturare, ANPC), trial 14 zile | cost legal și de procesare |
| P2.2 | Export/printare plan + listă | — |
| P2.3 | Notificări (ziua de mâine, lista) | doar dacă Z30 < țintă |
| P2.4 | Preluarea planului V1 de pe dispozitiv | dacă utilizatorii V1 o cer |
| P2.5 | Extindere 2–4 ani („mofturoși”) | după retenție dovedită |

## Criterii GO / NO-GO

| Poartă | GO | NO-GO → ce facem |
|---|---|---|
| Specificația planificatorului | Fondatorul aprobă modelul și migrația | Ajustăm modelul; nu atingem producția |
| Lansare beta privat (după P0) | Toate testele trec; retest iPhone OK; zero incidente de alergii în teste | Corectăm, nu invităm |
| Trecere la P1 | Activare ≥ 40%, Z7 ≥ 30% pe ≥ 15 familii | Interviuri, schimbăm fluxul principal, nu construim Premium |
| Test plătit (P2.1) | Criteriile din `BUSINESS-VALIDATION.md` §5 | Rămânem gratuit, căutăm altă valoare plătibilă |

## Ce rămâne explicit în afara roadmap-ului
Somn, scutece, creștere, monitorizare medicală, AI generativ pentru rețete, comunitate,
aplicație nativă, lansare publică V2, merge în `main` fără acordul fondatorului.
