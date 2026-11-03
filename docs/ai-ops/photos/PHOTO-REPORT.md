# Fotografii — biblioteca completă

Generat de `scripts/photo-catalog.cjs`. Total rețete: **291**.

| Stare | Rețete |
|---|---|
| Fotografie aprobată și publicată (`photos.ts`) | 0 |
| Ilustrație existentă (imagini V2 vechi, generice) | 8 |
| Importată, așteaptă verificarea umană | 0 |
| Pilot cerut (manifest 12) | 12 |
| Lipsă (prompt pregătit) | 271 |

Până la fotografie, cardul afișează o imagine de rezervă (culoarea momentului mesei, emoji-ul rețetei, ingredientele principale, „Fotografie în pregătire”).

## Identitate fotografică (identică pentru toate cererile)

> Fotografie realistă de mâncare gătită acasă, porție mică pentru copil. Bol ceramic mat crem sau farfurie mică, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale, fără stilizare publicitară. Fără text, fără logo, fără persoane sau mâini. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: text sau logo; persoane sau mâini; sare, zahăr sau miere vizibile; nuci sau arahide întregi; struguri, roșii cherry sau afine întregi; ingrediente care nu sunt în rețetă; porție de adult.

## Loturi

| Lot | Rețete | Conținut |
|---|---|---|
| 0 (pilot) | 12 | mic-dejun, pranz, cina, gustare |
| 1 | 20 | mic-dejun |
| 2 | 20 | mic-dejun |
| 3 | 20 | mic-dejun |
| 4 | 20 | mic-dejun, pranz |
| 5 | 20 | pranz |
| 6 | 20 | pranz |
| 7 | 20 | pranz |
| 8 | 20 | pranz |
| 9 | 20 | cina, pranz |
| 10 | 20 | cina |
| 11 | 20 | cina |
| 12 | 20 | cina |
| 13 | 20 | gustare, cina |
| 14 | 9 | gustare |

Rețete fără lot (în revizie de specialitate, nepublicate): `pate-ficat-pui-pere`, `ficatel-pui-piure-cartofi-12`.

## Flux

1. Din `catalog-manifest.json` copiezi `prompt` pentru rețetele lotului (Gemini Pro, aplicația ta; nu se activează API-uri plătite).
2. Salvezi fiecare imagine ca `<recipeId>.png` în `content/gemini-import/incoming/`.
3. `node scripts/photo-import.cjs check` → verificare vizuală (checklist din `GEMINI-HANDOFF.md`).
4. Aprobată → `node scripts/photo-import.cjs publish <recipeId>` (WebP 480/800/1200, asociere automată după Recipe ID).
5. `node scripts/photo-catalog.cjs` actualizează acest raport.
