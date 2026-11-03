# Lotul 0 — 12 fotografii pilot (Gemini Pro)

Generat de `scripts/photo-catalog.cjs` din `photos/manifest.json`. Prompturile corespund rețetelor **corectate** (ex. supa de broccoli fără crutoane).

## Pentru fiecare fotografie

1. În aplicația Gemini, deschide **o conversație nouă** pentru fiecare rețetă (ca stilul să nu se amestece între rețete).
2. Copiază blocul „De lipit în Gemini” al rețetei și trimite-l.
3. Dacă rezultatul încalcă vreun punct din „Nu trebuie să apară”, cere o variantă nouă în aceeași conversație. Nu edita manual imaginea.
4. Descarcă imaginea la rezoluția maximă și salveaz-o **exact** cu numele din „Salvează ca”, în `content/gemini-import/incoming/`. Niciodată în `public/`.
5. După toate cele 12 (sau după câteva), rulează:

```bash
node scripts/photo-import.cjs check
```

6. Deschide `content/gemini-import/review/` și verifică fiecare imagine cu checklist-ul de mai jos (persoană, nu AI).

**Checklist (respinge dacă):**
- apare un ingredient care nu e în rețetă;
- textura nu se potrivește etapei;
- apare orice element din „Nu trebuie să apară”;
- porția e de adult;
- apar text, logo, persoane sau mâini;
- arată ca o reclamă;
- are detalii AI false (linguri deformate, boluri duble).

**Condiții de utilizare:** înainte de publicare, verifică în condițiile Google pentru Gemini că imaginile pot fi folosite comercial pe site. Notează linkul în `provenance.termsUrl` și setează `commercialUseTermsChecked: true` doar dacă ești sigur. Fără asta, `photo-import publish` refuză publicarea.

**După aprobare**, în `docs/ai-ops/photos/manifest.json`, la rețeta respectivă:
- `imageStatus: "approved"`;
- `provenance.generator: "Gemini"`, `model`, `generatedAt`, `reviewedBy` (numele tău), `decision`;
- verifici `alt`.

Apoi:

```bash
node scripts/photo-import.cjs publish <recipeId>
```

## 1. Piure de broccoli cu cartof

`piure-broccoli-cartof-6` · 6+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/piure-broccoli-cartof-6.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: piure verde-pal, omogen, fără bucăți, în bol mic, linguriță de silicon. Ingrediente vizibile doar din: broccoli buchețele, cartof mediu, unt, lapte matern sau formulă. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Fără sare, fără bucăți de broccoli în bol. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: fără sare; fără bucăți de broccoli în bol; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** piure verde-pal, omogen, fără bucăți, în bol mic, linguriță de silicon · **Textură:** piure fin, omogen, fără bucăți · **Servire:** cu lingurița, porții mici (2–4 linguri)

## 2. Iaurt cu unt de migdale

`iaurt-unt-migdale` · 6+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/iaurt-unt-migdale.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: iaurt alb cu un fir subțire de unt de migdale fin amestecat, eventual măr ras fin. Ingrediente vizibile doar din: iaurt natural integral fără zahăr, unt de migdale fin, măr mic, scorțișoară. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Unt fin, fără migdale întregi/bucăți; alergen — etichetă. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: unt fin; fără migdale întregi/bucăți; alergen — etichetă; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** iaurt alb cu un fir subțire de unt de migdale fin amestecat, eventual măr ras fin · **Textură:** piure fin, omogen, fără bucăți · **Servire:** cu lingurița, porții mici (2–4 linguri)

## 3. Clătite de ovăz cu măr ras

`clatite-ovaz-mar-8` · 8+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/clatite-ovaz-mar-8.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: clătite mici, moi, tăiate în fâșii de mărimea unui deget, măr ras vizibil. Ingrediente vizibile doar din: fulgi de ovăz, ou, lapte, măr ras, scorțișoară, ulei de cocos. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Fără sirop, fără zahăr pudră. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: fără sirop; fără zahăr pudră; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** clătite mici, moi, tăiate în fâșii de mărimea unui deget, măr ras vizibil · **Textură:** piure grosier sau bucăți foarte moi, ușor de strivit între degete · **Servire:** cu lingurița sau ca finger food moale în fâșii de mărimea unui deget

## 4. Brânză de vaci cu afine

`branza-vaci-afine-8` · 8+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/branza-vaci-afine-8.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: brânză de vaci în bol, afine strivite amestecate (pete violet). Ingrediente vizibile doar din: brânză de vaci, afine proaspete sau congelate, vanilie. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Afinele întregi sunt risc de înec <12 luni — doar strivite. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: afinele întregi sunt risc de înec <12 luni — doar strivite; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** brânză de vaci în bol, **afine strivite** amestecate (pete violet) · **Textură:** piure grosier sau bucăți foarte moi, ușor de strivit între degete · **Servire:** cu lingurița sau ca finger food moale în fâșii de mărimea unui deget

## 5. Dip de sfeclă cu nuci și castravete

`dip-sfecla-nuci` · 8+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/dip-sfecla-nuci.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: dip roz-magenta, neted, cu bețișoare de castravete curățat. Ingrediente vizibile doar din: sfeclă fiartă, iaurt natural, ulei de măsline, nuci măcinate, suc de lămâie, chimion și coriandru, castravete mic. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Nuci doar măcinate fin, nu bucăți vizibile. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: nuci doar măcinate fin; nu bucăți vizibile; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** dip roz-magenta, neted, cu bețișoare de castravete curățat · **Textură:** piure grosier sau bucăți foarte moi, ușor de strivit între degete · **Servire:** cu lingurița sau ca finger food moale în fâșii de mărimea unui deget

## 6. Piure de năut cu tahini și morcov fiert

`naut-piure-tahini-morcov` · 8+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/naut-piure-tahini-morcov.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: hummus neted, bej, morcov fiert în bețișoare moi. Ingrediente vizibile doar din: năut fiert, tahini, suc de lămâie, ulei de măsline, morcov mediu fiert, chimion. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Morcovul trebuie să pară fiert/moale. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: morcovul trebuie să pară fiert/moale; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** hummus neted, bej, morcov fiert în bețișoare moi · **Textură:** piure grosier sau bucăți foarte moi, ușor de strivit între degete · **Servire:** cu lingurița sau ca finger food moale în fâșii de mărimea unui deget

## 7. Paste cu somon și smântânică

`paste-somon-smantana` · 10+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/paste-somon-smantana.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: fusilli mici, sos cremos pal, spanac tocat, somon fulgi. Ingrediente vizibile doar din: paste fusilli mici, somon proaspăt fără oase, smântână pentru gătit, suc de lămâie, spanac proaspăt, ulei de măsline. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Fără oase vizibile, fără lămâie felii. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: fără oase vizibile; fără lămâie felii; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** fusilli mici, sos cremos pal, spanac tocat, somon fulgi · **Textură:** bucăți mici și moi, tăiate mărunt · **Servire:** finger food moale și cu lingurița; copilul exersează singur

## 8. Mâncare de spanac cu ou

`mancare-spanac-ou` · 10+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/mancare-spanac-ou.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: spanac cremos verde închis, ou fiert tare tăiat în sferturi. Ingrediente vizibile doar din: spanac proaspăt sau congelat, ulei, făină, lapte, ouă fierte tare, nucșoară. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Ou complet fiert (gălbenuș mat). Format 4:3, minimum 1600×1200.

Nu trebuie să apară: ou complet fiert (gălbenuș mat); sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** spanac cremos verde închis, ou fiert tare tăiat în sferturi · **Textură:** bucăți mici și moi, tăiate mărunt · **Servire:** finger food moale și cu lingurița; copilul exersează singur

## 9. Pain perdu (pâine prăjită în ou) cu fructe

`paine-perdue-fructe-12` · 12+ luni · status: editorially_corrected

**Salvează ca:** `content/gemini-import/incoming/paine-perdue-fructe-12.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: pâine aurie în bețișoare, fructe moi tăiate (banană, căpșuni sferturi). Ingrediente vizibile doar din: pâine albă, ouă, lapte, scorțișoară, unt, fructe. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Fructe tăiate pe lungime, fără zahăr pudră. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: fructe tăiate pe lungime; fără zahăr pudră; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** pâine aurie în bețișoare, fructe moi tăiate (banană, căpșuni sferturi) · **Textură:** mâncarea familiei, tăiată în bucăți mici, moi · **Servire:** în farfurie, bucăți mici; supraveghere continuă

## 10. Cuscus cu legume mediteraneene

`cus-cus-legume-12` · 12+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/cus-cus-legume-12.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: cuscus pufos cu dovlecel și roșie tăiate cubulețe, verdeață. Ingrediente vizibile doar din: cuscus, dovlecel, roșie, ardei gras, ulei de măsline, mentă sau pătrunjel. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Roșii tăiate, nu cherry întregi. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: roșii tăiate; nu cherry întregi; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** cuscus pufos cu dovlecel și roșie tăiate cubulețe, verdeață · **Textură:** mâncarea familiei, tăiată în bucăți mici, moi · **Servire:** în farfurie, bucăți mici; supraveghere continuă

## 11. Biluțe cu măr, cremă de brânză și scorțișoară

`biluze-mar-crema-branza-12` · 12+ luni · status: imported

**Salvează ca:** `content/gemini-import/incoming/biluze-mar-crema-branza-12.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: biluțe mici, moi, pudrate ușor cu scorțișoară. Ingrediente vizibile doar din: măr ras, cremă de brânză, scorțișoară. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Mărime potrivită apucării, nu rotunde-tari. Format 4:3, minimum 1600×1200.

Nu trebuie să apară: mărime potrivită apucării; nu rotunde-tari; sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** biluțe mici, moi, pudrate ușor cu scorțișoară · **Textură:** mâncarea familiei, tăiată în bucăți mici, moi · **Servire:** în farfurie, bucăți mici; supraveghere continuă

## 12. Supă cremă de broccoli

`supa-crema-broccoli-12` · 12+ luni · status: editorially_corrected

**Salvează ca:** `content/gemini-import/incoming/supa-crema-broccoli-12.png`

**De lipit în Gemini:**

```text
Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: supă cremă verde, netedă, în cană/bol mic, eventual câteva cubulețe de pâine moale. Ingrediente vizibile doar din: broccoli, morcov, usturoi. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. Fără sare vizibilă, fără crutoane tari sau prăjite, temperatură călduță (fără abur puternic). Format 4:3, minimum 1600×1200.

Nu trebuie să apară: fără sare vizibilă; fără crutoane tari sau prăjite; temperatură călduță (fără abur puternic); sare sau solniță; miere; zahăr pudră, sirop, glazură; nuci, alune sau semințe întregi; struguri, afine, roșii cherry sau măsline întregi (sub 12 luni); ingrediente care nu apar în rețetă; persoane, mâini de adult cu bijuterii, fețe de copii; text, logo, mărci, ambalaje; tacâmuri metalice ascuțite, pahare de sticlă; abur puternic sau mâncare fierbinte.
```

**Rezultatul așteptat:** supă cremă verde, netedă, în cană/bol mic, eventual câteva cubulețe de pâine moale · **Textură:** mâncarea familiei, tăiată în bucăți mici, moi · **Servire:** în farfurie, bucăți mici; supraveghere continuă
