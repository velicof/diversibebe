# Handoff Gemini (Argon pentru UX, Images pentru fotografii)

Gemini nu are acces la disc, la repository, la Supabase sau la conturi. Primește numai fișierele de mai jos, încărcate manual de fondator. **Nu se trimit:** secrete, URL-uri de preview, adrese de email, nume de copii, date din producție.

## A. Gemini 4 Argon — evaluare independentă UX

**Ce încarci:** capturile din `outputs/release-2026-11-03/review-pack/` (13 ecrane × mobil 390 px și desktop 1440 px, sesiune de vizitator, fără cont). Sunt anonimizate: nu conțin email, nume sau date reale.

**Prompt de pornire (copiază):**

> Ești evaluator senior de UX pentru o aplicație mobilă românească de rețete pentru bebeluși (6–24 luni). Fluxul central: intră → 3 întrebări → idei de mese → rețetă → salvează → plan 5 zile → listă de cumpărături → revine. Capturile sunt numerotate în ordinea fluxului. Pentru fiecare ecran: (1) acțiunea principală este clară? (2) ce pas e inutil? (3) probleme de lizibilitate/contrast/țintă de atingere pe mobil, (4) unde scade încrederea unui părinte. Dă maximum 15 observații, ordonate după impact, fiecare cu ecranul, problema, dovada din captură și o corecție concretă. Nu propune funcționalități noi și nu redesena identitatea vizuală (culori, fonturi). Notă: în capturile full-page, elementele fixe (bara de jos, skip link) pot apărea în mijlocul paginii — ignoră-le.

**Cum se integrează răspunsul:** fondatorul salvează textul în `docs/ai-ops/reviews/argon-<data>.md`. Agentul tratează fiecare observație ca recomandare: o verifică în interfața reală, o acceptă sau o respinge motivat într-un tabel (ca în `DESIGN-SYSTEM.md` → Corecturi), implementează doar corecțiile cu impact mare și refolosește `scripts/capture-review.cjs` pentru capturi după.

## B. Gemini Images — 12 fotografii

**Ce încarci:** numai câmpurile `prompt`, `exactIngredients`, `finalResult`, `texture`, `presentation`, `mustNotAppear` din `docs/ai-ops/photos/manifest.json`, o rețetă pe rând. Nu atașa alte fișiere.

**Instrucțiune suplimentară pentru fiecare cerere:**

> Generează o singură fotografie realistă, 4:3, minimum 1600×1200, după promptul de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.

**Pași pentru fondator:**
1. Descarcă imaginea și redenumește-o exact ca `fileName` (ex. `piure-broccoli-cartof-6.png`).
2. Pune-o în `content/gemini-import/incoming/` (nu în `public/`).
3. Notează în manifest `provenance.generator`, `model`, `generatedAt` și link-ul către condițiile de utilizare ale serviciului (`termsUrl`). Verifică în condiții că imaginile pot fi folosite comercial; dacă nu ești sigur, `commercialUseTermsChecked` rămâne `false`.
4. Rulează `node scripts/photo-import.cjs check` și deschide `content/gemini-import/review/`.

**Checklist de aprobare vizuală (om, nu AI):**

| # | Întrebare | Respinge dacă |
|---|---|---|
| 1 | Ingredientele vizibile există toate în rețetă? | apare orice ingredient în plus (ierburi decorative, semințe, fructe) |
| 2 | Textura corespunde etapei? | bucăți la 6+, piure la 12+ finger food |
| 3 | Forma de servire e sigură? | orice element din `mustNotAppear` (afine/struguri întregi <12 luni, nuci întregi, sare, miere…) |
| 4 | Porția e de copil? | farfurie de adult, cantitate mare |
| 5 | Fără text, logo, persoane, mâini? | oricare |
| 6 | Arată ca mâncare gătită acasă, nu ca reclamă? | stilizare excesivă, culori nereale |
| 7 | Detalii AI false? | linguri deformate, boluri duble, texturi imposibile |

Aprobată → `imageStatus: "approved"`, `provenance.reviewedBy`, `decision`, verifică `alt`, apoi `node scripts/photo-import.cjs publish <recipeId>`. Respinsă → mut-o în `rejected/`, `imageStatus: "rejected"`, `rejectionReason`, regenerează cu promptul corectat (`promptVersion` +1).

**Publicare:** fotografia apare online numai când rețeta are și statusul editorial `published` (revizie clinică). Până atunci se vede doar în preview-ul local.
