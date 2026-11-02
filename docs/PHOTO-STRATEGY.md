# Fotografiile rețetelor — strategie și lot-pilot de 12

Stare: **pregătit, nimic generat sau cumpărat în această sesiune.** Nu s-au activat API-uri plătite. Astăzi doar 8 din 291 de rețete au imagine proprie (2 ilustrații generate pe 30.10, 2 fotografii Unsplash generice, restul folosesc pictograma).

## Stil vizual comun (brief)

- Lumină naturală laterală, dimineață, umbre moi; fără bliț.
- Fundal: lemn deschis sau in bej (`#faf7f2`–`#e9eddf`, paleta V2); veselă simplă de copii (bol mic ceramic, linguriță de silicon), fără branduri.
- Mâncare gătită acasă, porție de copil (nu porție de adult), textura corectă pentru etapa rețetei.
- Încadrare 4:3 pentru carduri, cu subiectul centrat ca să suporte și decupaj 1:1 pe mobil; vedere ¾ sau de sus.
- Ingredientele crude pot apărea în fundal **doar** dacă nu sugerează o formă de servire (ex. dovleac întreg, nu bucăți tari tăiate mici).
- Interzis: alimente întregi rotunde și tari pentru <12 luni (struguri, roșii cherry, afine întregi, nuci), miere pentru <12 luni, sare vizibilă, copii reali/fețe, mâini cu bijuterii, text în imagine.
- Livrare: WebP ≤150 KB, 1200×900, `alt` descriptiv în română; etichetă „Ilustrație generată · demo” dacă imaginea e AI.

## Opțiuni și costuri estimative (nevalidate, fără achiziție)

| Opțiune | Fidelitate față de rețetă | Cost estimativ pentru 12 | Observații |
|---|---|---|---|
| Fotografii proprii (fondator, telefon + lumină naturală) | maximă — chiar rețeta | 0 lei + 4–6 ore | recomandat pentru încredere; necesită gătit real |
| Fotograf food freelance (o zi, gătit inclus) | maximă | ~1.500–3.500 lei | estimare de piață orientativă, de cerut oferte |
| Bănci gratuite (Unsplash/Pexels) | slabă — rareori exact preparatul | 0 lei | bune doar pentru categorii generice (supă, terci) |
| Bănci plătite (Adobe Stock etc.) | medie | ~50–150 lei/imagine | tot rar fidele pentru porții de bebeluș |
| Generare AI (ex. modele imagine la ~0,04–0,20 USD/imagine, 3–4 încercări/rețetă) | bună dacă promptul e strict; risc de detalii false | ~5–50 lei total | etichetare obligatorie; verificare umană a texturii |

Recomandare: **lot-pilot AI pentru 12 rețete + verificare vizuală a fondatorului**, apoi fotografii reale pentru rețetele aprobate clinic care intră în pilot.

## Lotul-pilot (12 rețete din shortlist)

Aspectul corect este definit din ingrediente, etapă și pasul final al rețetei. Toate rețetele sunt încă `review_required`; imaginea nu certifică siguranța.

| # | Rețetă (`id`) | Masă · etapă | Imagine existentă | Cum trebuie să arate | Atenție la siguranță |
|---|---|---|---|---|---|
| 1 | Piure de broccoli cu cartof (`piure-broccoli-cartof-6`) | prânz · 6+ | pictogramă | piure verde-pal, omogen, fără bucăți, în bol mic, linguriță de silicon | fără sare, fără bucăți de broccoli în bol |
| 2 | Iaurt cu unt de migdale (`iaurt-unt-migdale`) | mic dejun · 6+ | pictogramă | iaurt alb cu un fir subțire de unt de migdale fin amestecat, eventual măr ras fin | unt fin, **fără migdale întregi/bucăți**; alergen — etichetă |
| 3 | Clătite de ovăz cu măr ras (`clatite-ovaz-mar-8`) | mic dejun · 8+ | pictogramă | clătite mici, moi, tăiate în fâșii de mărimea unui deget, măr ras vizibil | fără sirop, fără zahăr pudră |
| 4 | Brânză de vaci cu afine (`branza-vaci-afine-8`) | gustare · 8+ | pictogramă | brânză de vaci în bol, **afine strivite** amestecate (pete violet) | **afinele întregi sunt risc de înec <12 luni** — doar strivite |
| 5 | Dip de sfeclă cu nuci și castravete (`dip-sfecla-nuci`) | prânz · 8+ | pictogramă | dip roz-magenta, neted, cu bețișoare de castravete curățat | nuci **doar măcinate fin**, nu bucăți vizibile |
| 6 | Piure de năut cu tahini și morcov (`naut-piure-tahini-morcov`) | cină · 8+ | pictogramă | hummus neted, bej, morcov fiert în bețișoare moi | morcovul trebuie să pară fiert/moale |
| 7 | Paste cu somon și smântânică (`paste-somon-smantana`) | prânz · 10+ | pictogramă | fusilli mici, sos cremos pal, spanac tocat, somon fulgi | fără oase vizibile, fără lămâie felii |
| 8 | Mâncare de spanac cu ou (`mancare-spanac-ou`) | cină · 10+ | pictogramă | spanac cremos verde închis, ou fiert tare tăiat în sferturi | ou complet fiert (gălbenuș mat) |
| 9 | Pain perdu cu fructe (`paine-perdue-fructe-12`) | mic dejun · 12+ | pictogramă | pâine aurie în bețișoare, fructe moi tăiate (banană, căpșuni sferturi) | fructe tăiate pe lungime, fără zahăr pudră |
| 10 | Cuscus cu legume mediteraneene (`cus-cus-legume-12`) | cină · 12+ | pictogramă | cuscus pufos cu dovlecel și roșie tăiate cubulețe, verdeață | roșii tăiate, nu cherry întregi |
| 11 | Biluțe cu măr și cremă de brânză (`biluze-mar-crema-branza-12`) | gustare · 12+ | pictogramă | biluțe mici, moi, pudrate ușor cu scorțișoară | mărime potrivită apucării, nu rotunde-tari |
| 12 | Supă cremă de broccoli (`supa-crema-broccoli-12`) | prânz · 12+ | pictogramă | supă cremă verde, netedă, în cană/bol mic, eventual crutoane moi | fără sare vizibilă, temperatură călduță (fără abur puternic) |

Rețetele cu ilustrații deja generate (`piure-dovlecel`, `piure-morcov`) rămân ca referință de stil.

## Prompt AI — șablon

```
Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: {CUM TREBUIE SĂ ARATE}.
Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață
din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale, fără text, fără logo,
fără persoane, fără sare vizibilă. {RESTRICȚIE DE SIGURANȚĂ}. Format 4:3.
```

Exemplu (#4): „…brânză de vaci albă, cremoasă, într-un bol mic, cu afine **strivite** amestecate, pete violet; nicio afină întreagă vizibilă…”.

## Verificarea fidelității (pentru fiecare imagine)

1. Ingredientele principale sunt recognoscibile și nu apar ingrediente care lipsesc din rețetă.
2. Textura corespunde etapei (piure neted la 6+, bucăți moi la 8–10+, finger food la 12+).
3. Nicio formă de servire nesigură (vezi lista interzisă).
4. Porția arată ca pentru un copil, nu pentru un adult.
5. Aprobare vizuală a fondatorului înainte de integrare; apoi `image` în `src/features/v2/catalog.ts` + intrare în `public/v2/ASSETS.md` (sursă, licență sau prompt).

## Integrarea în carduri

`RecipePhoto`/`RecipeCard` folosesc deja `recipe.image` și afișează eticheta de ilustrație. Integrarea = fișier WebP în `public/v2/`, maparea `id → cale` în `catalog.ts` (înlocuiește lanțul actual de condiții cu un obiect `photos`) și actualizarea `ASSETS.md`.
