# Pilot fotografii — primele 3 imagini (Antigravity / Gemini)

3 nov. 2026. Imagini generate de Antigravity în `content/gemini-import/incoming/`. Originalele PNG au rămas neatinse (SHA-256 verificat înainte și după import). Nimic nu este publicat: imaginile sunt **candidați**, vizibili numai local și în galeria de aprobare.

## 1. Fișiere și manifest

| Fișier | Rețetă (manifest) | Format | Raport | Metadate | SHA-256 |
|---|---|---|---|---|---|
| `piure-broccoli-cartof-6.png` | `piure-broccoli-cartof-6` | PNG 1600×1200 (4.134 KB) | 4:3 exact | niciuna | `eef7d97c023f…` |
| `iaurt-unt-migdale.png` | `iaurt-unt-migdale` | PNG 1600×1200 (3.828 KB) | 4:3 exact | niciuna | `598f76932ce5…` |
| `clatite-ovaz-mar-8.png` | `clatite-ovaz-mar-8` | PNG 1600×1200 (4.215 KB) | 4:3 exact | niciuna | `b8ea8f27ce3e…` |

Verificarea tehnică (`photo-import.cjs check`) nu a găsit probleme.

## 2. Variante WebP (`photo-import.cjs stage`)

| Rețetă | 480w | 800w | 1200w | Reducere față de original |
|---|---|---|---|---|
| piure-broccoli-cartof-6 | 16 KB | 35 KB | 62 KB | −99% |
| iaurt-unt-migdale | 16 KB | 32 KB | 58 KB | −99% |
| clatite-ovaz-mar-8 | 20 KB | 43 KB | 76 KB | −99% |

Toate sunt sub limita de 150 KB la 800w și nu au metadate. Fișierele sunt în `public/v2/recipes/`, iar intrările în `photos.ts` au `approved: false`.

## 3. Încărcare și deformare (măsurat în browser)

- **Fără deformare:** `object-fit: cover`, centrat. Pagina rețetei decupează simetric marginile (raport afișat 1,25 pe mobil, 1,10 pe desktop, față de 4:3 al imaginii). Compozițiile sunt centrate, deci farfuria rămâne întreagă.
- **Pagina rețetei:** imaginea se încarcă imediat (`eager`, `fetchpriority=high`), varianta 800w de 32–43 KB.
- **Carduri:** încărcare amânată (`lazy`). Am corectat atributul `sizes` (cardurile cereau 800w pentru o lățime de ~314 px); acum folosesc 480w pe desktop (16–20 KB).
- **Galeria și capturile:** fără erori de pagină și fără derulare orizontală, pe mobil (390) și desktop (1440).

## 4. Evaluarea vizuală — recomandarea mea (decizia e a ta)

| Rețetă | Recomandare | Corespunde | De observat |
|---|---|---|---|
| Piure de broccoli cu cartof (6+) | **aprob** | piure neted, fără bucăți; bol crem, linguriță de silicon, in, lemn, lumină de fereastră; nimic interzis | — |
| Iaurt cu unt de migdale (6+) | **aprob, cu observație** | unt de migdale fin, fără migdale întregi; doar ingredientele rețetei | mărul pare ras grosier; rețeta cere răzătoarea fină (6 luni) |
| Clătite de ovăz cu măr (8+) | **regenerez** | fâșii moi cât un deget, fără sirop sau zahăr | **fulgi de ovăz întregi vizibili**, iar rețeta cere ovăz mixat fin; farfuria albastră iese din serie |

## 5. Stilul pentru toate cele 291 de rețete

**Coerență:** 2 din 3 imagini respectă identitatea întocmai: bol crem mat, linguriță de silicon salvie, in bej, lemn, lumină de dimineață, unghi 3/4. A treia păstrează paleta, dar schimbă vasul. Ca serie, imaginile arată ca aceeași bucătărie. Diferența față de imaginea de rezervă este mare (capturile din `outputs/release-2026-11-03/photo-pilot/comparatii/`).

**Recomandare: păstrăm stilul**, cu 3 precizări în promptul comun înainte de loturile următoare:
1. „vas: bol sau farfurie mică **crem mat**, aceeași în toate fotografiile”;
2. „textura exact ca în rețetă: ingredientele mixate, rase sau pasate **fin** nu apar ca bucăți sau fulgi”;
3. „fundal: doar in și lemn; fără borcane, ambalaje sau obiecte suplimentare”.

Ritm estimat: 12 imagini pilot → 14 loturi de 20 (`photos/PHOTO-REPORT.md`). Cost: 0 lei prin Antigravity/Gemini, așa cum ai raportat; verifică doar condițiile de utilizare comercială înainte de prima publicare.

## 6. Cum aprobi

1. Deschizi `http://127.0.0.1:3100/v2/revizie/fotografii` (preview local).
2. Pentru fiecare imagine: bifezi checklist-ul, apoi Aprob / Regenerează / Resping. Scrii numele tău și apeși „Exportă deciziile”.
3. Aplici deciziile:

   ```bash
   node scripts/photo-import.cjs decide decizii-fotografii-….json
   ```

   Deciziile se înregistrează în manifest. Un nume de agent AI este refuzat, iar o decizie pentru alt fișier decât cel verificat este ignorată.
4. Pentru publicare completezi `provenance.termsUrl` și `commercialUseTermsChecked` în `photos/manifest.json`, apoi rulezi:

   ```bash
   node scripts/photo-import.cjs publish <recipeId>
   ```

   Abia atunci imaginea apare și într-un build online.
