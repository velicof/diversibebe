Corectează în V1 (producție) două rețete care lăsau oul posibil negătit complet. **Merge numai după aprobarea fondatorului.**

Branch: `hotfix/v1-egg-cooking` (din `main` = `9c56e83`, live), commit `666a388`, un singur fișier: `src/app/lib/micDejunExtraRecipes.ts`. Local, nepublicat.

## Ce schimbă

| Rețetă | Înainte | După |
|---|---|---|
| `paste-mic-dejun-branza-ou` | „Pune pastele calde în castron.” + „Adaugă amestecul de ou și brânză — căldura gătește oul.” | „Pune pastele înapoi pe foc mic, adaugă amestecul de ou și brânză și amestecă 2–3 minute, până când oul se închegă complet și nu mai rămâne lichid.” |
| `ou-fiert-soldati-toast` | „Ou fiert moale…”; 10 min; „Fierbe oul 7-8 minute (gălbenușul să fie aproape fiert complet).”; „Pune oul într-un suport, decapitează-l.”; „Bebelușul înmoaie soldățeii în ou!” | „Ou fiert tare…”; 15 min; „Fierbe oul 10–12 minute, până când albușul și gălbenușul sunt complet tari.”; „Curăță oul și taie-l în sferturi sau zdrobește-l cu furculița.”; „Servește bețișoarele de pâine alături de ou; copilul le poate ține singur.” |

Aceeași formulare ca în V2. Corectură editorială după regula bibliotecii (ou gătit complet) și sursa publică [NHS — foods to avoid](https://www.nhs.uk/conditions/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/). **Nu este o revizie medicală.**

ID-urile rămân aceleași: favoritele și istoricul rămân valabile. Nicio migrație, nicio schimbare de schemă.

## Verificat

TypeScript pe branch: PASS. Diff: un fișier, 6 linii adăugate, 7 eliminate.

## După merge în `main`

1. Vercel construiește Production. Deschizi cele două rețete în V1 și verifici textul nou.
2. **În `release/v2-rc`, la următoarea sincronizare cu `main`:** cele 6 corecturi V2 pentru aceste rețete (`src/features/v2/content/corrections.ts`) nu mai găsesc textul vechi. Se șterg; textul V2 rămâne același, fiindcă vine direct din V1. Testul `editorial-egg.test.cjs` se ajustează: verifică textul sursă, nu corectura.

Înapoi: Vercel Instant Rollback la deployment-ul anterior.
