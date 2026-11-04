# Evaluare vizuală a fotografiilor din `incoming/` — 4 nov. 2026

Recomandări ale agentului, comparând fiecare imagine cu ingredientele și forma de servire din rețetă. **Nu sunt aprobări.** Decizia este a fondatorului, în `/v2/revizie/fotografii`, iar nimic nu s-a integrat, mutat sau marcat. Fișierele Antigravity au fost doar citite.

Stare: 30 de fișiere, 23 de rețete, 7 cu mai multe versiuni (`node scripts/photo-import.cjs versions`).

## De regenerat: imaginea contrazice rețeta

| Rețetă | Problema | Ce să ceară promptul |
|---|---|---|
| `supa-crema-broccoli-12` (v1, v2) | **Crutoane în ambele versiuni**, deși rețeta conține doar broccoli, morcov, usturoi și apă. Ar sugera gluten, un alergen pe care rețeta nu îl are | Supă cremă simplă, fără nimic deasupra, cu nuanța dată și de morcov |
| `naut-piure-tahini-morcov` | Bețele de morcov par **crude și ferme**, iar rețeta cere morcov fiert și e pentru 8+ luni. Morcovul crud este un risc de înec | Morcov vizibil fiert și moale, ușor de strivit, sau pasat în piure |
| `biluze-mar-crema-branza-12` (v1, v2) | v2 arată ca un aluat copt, fără măr. v1 are textură de ovăz și o jucărie în fundal. Rețeta nu se coace | Biluțe moi, palide, de cremă de brânză, cu măr ras vizibil și scorțișoară, tăiate în jumătăți |

## De ales între versiuni

| Rețetă | Recomandare | De ce |
|---|---|---|
| `clatite-ovaz-mar-8` | **v2** | Fără fulgi întregi de ovăz (rețeta îi cere măcinați) și în vasul crem. v1 are fulgi vizibili, farfurie albastră. Observație: furculița e mai potrivită pentru copii mai mari |
| `cus-cus-legume-12` | **v2** | Vasul crem din setul comun. v1 are bol piersică, cană și scaun în fundal |
| `piure-banana` | **v2** | Fără scorțișoară. Rețeta e pentru 6+ luni și scorțișoara este opțională abia de la 8+ |
| `polenta-afine` | **v2** | Afinele sunt pasate, deci fără fructe mici întregi. v1 are bucătărie în fundal. Observație: cana din fundal poate fi evitată |
| `salata-ou-avocado` | **v2** | Forma de servire e aproape de indicația rețetei („cât un deget”) și gălbenușul e închegat. Observație: bețele par pane; dacă e avocado cu semințe de cânepă, e corect |

## Aprobabile, cu observație

| Rețetă | Observație |
|---|---|
| `bol-fasole-neagra` | Felii de avocado lângă bol; rețeta indică piure fin la 6+ luni. Mai corect: avocado pasat |
| `budinca-chia-cocos` | Fâșii lungi de mango la 6+ luni, unde rețeta indică terci neted. Mai corect: mango pasat deasupra |
| `clatite-banana-naut` | Teanc de clătite întregi; pentru 8+ luni e mai clar tăiat în fâșii. Untul de arahide e opțional în rețetă și e neted, deci corect |
| `dip-sfecla-nuci` | Lingura e roz, iar restul setului verde-salvie. Castravetele apare crud și cu coajă: formă de verificat la revizia de specialitate |
| `iaurt-unt-arahide` | Bețele de pe farfurie sunt ambigue (banană sau pâine?). Rețeta are doar banană |
| `orez-cu-ou-curry` | Boabele arată mai degrabă ca paste orzo decât ca orez basmati |
| `scramble-ou-dovlecel` | Dovlecel ras în fire lungi; rețeta indică piure fin pentru 6+ luni |
| `iaurt-unt-migdale` | Deja candidat. Observația din `photo-notes.ts` rămâne |

## Fără probleme vizibile

`branza-vaci-afine-8` (afine zdrobite), `clatite-dovleac-ricotta`, `mancare-spanac-ou` (ou tare, în sferturi), `omleta-legume-curcubeu` (fâșii), `paine-perdue-fructe-12`, `paste-somon-smantana`, `piure-broccoli-cartof-6` (deja candidat).

## Limitele evaluării

- Este o evaluare vizuală pe imagini reduse, nu o verificare de specialitate. Forma sigură de servire rămâne de confirmat de pediatru sau dietetician.
- Imaginile sunt generate: ilustrează rețeta, nu demonstrează textura reală.
- Nu am verificat condițiile de utilizare comercială (`commercialUseTermsChecked`); `publish` le cere separat.

## Pașii, după decizia ta

```bash
node scripts/photo-import.cjs check
```

(numai după ce Antigravity s-a oprit: comanda scrie `review/` și `REPORT.md`)

```bash
node scripts/photo-import.cjs stage clatite-ovaz-mar-8 cus-cus-legume-12 piure-banana polenta-afine salata-ou-avocado
```

`stage` ia implicit cea mai nouă versiune; `stage <id>-v1` alege una mai veche. Rămân candidați neaprobați până la decizia din galerie.
