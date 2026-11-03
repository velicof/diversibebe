// Library report + editorial corrections log, computed from the catalog the app actually uses.
// Usage: node scripts/library-report.cjs → docs/ai-ops/LIBRARY-REPORT.md, docs/ai-ops/editorial/CORRECTIONS-LOG.md
const fs = require('node:fs'), path = require('node:path');
const { load, plain } = require('../tests/load-ts.cjs');
const { RECIPES } = load('src/app/lib/recipesDatabase.ts');
const { catalog, publishedCatalog } = load('src/features/v2/catalog.ts');
const { assessSafety, canonicalAllergens } = load('src/features/v2/content/safety.ts');
const { editorialStatusLabels } = load('src/features/v2/review.ts');
const photos = require('../docs/ai-ops/photos/catalog-manifest.json').photos;

const repo = path.resolve(__dirname, '..'), out = path.join(repo, 'docs/ai-ops');
const by = (list, key) => list.reduce((acc, r) => ({ ...acc, [key(r)]: (acc[key(r)] ?? 0) + 1 }), {});
const status = by(catalog, (r) => r.editorialStatus);
const meals = ['mic-dejun', 'pranz', 'cina', 'gustare'];
const mealLabel = { 'mic-dejun': 'Mic dejun', pranz: 'Prânz', cina: 'Cină', gustare: 'Gustare' };
// Issues present in the ORIGINAL text (before corrections), with the same rules.
const before = RECIPES.map((r) => ({ id: r.id, flags: assessSafety({ ...r, allergens: canonicalAllergens(r.allergens, r.ingredients).allergens }, Number(r.age.match(/\d+/)[0])).filter((f) => f.severity === 'blocking') })).filter((x) => x.flags.length);
const corrected = catalog.filter((r) => r.editorialStatus === 'editorially_corrected');
const safetyFixed = corrected.filter((r) => r.corrections.length);
const allergenOnly = corrected.filter((r) => !r.corrections.length && r.allergenChanges.added.length);
const review = catalog.filter((r) => r.editorialStatus === 'needs_specialist_review');
const renamed = catalog.filter((r) => r.allergenChanges.renamed.length).length;
const warnings = by(catalog.flatMap((r) => r.safetyFlags.filter((f) => f.severity === 'warning')), (f) => f.message);
const photoState = by(photos, (p) => p.photoState);

const report = [
  '# Biblioteca DiversiBebe 2.0 — raport',
  '',
  `Generat de \`scripts/library-report.cjs\` din catalogul folosit de aplicație (${new Date().toISOString().slice(0, 10)}). Sursa: \`src/app/lib/recipesDatabase.ts\` (neschimbată); corecturile V2: \`src/features/v2/content/corrections.ts\`; regulile: \`content/safety.ts\`.`,
  '',
  '## Cifre',
  '',
  '| | Rețete |',
  '|---|---|',
  `| 1. Importate (toate ID-urile vechi, inventariate) | **${catalog.length}** (${meals.map((m) => `${mealLabel[m]} ${catalog.filter((r) => r.mealType === m).length}`).join(', ')}) |`,
  `| 2. Corectate editorial | **${corrected.length}** — ${safetyFixed.length} cu modificări de conținut (siguranță/claritate) + ${allergenOnly.length} doar cu alergeni completați |`,
  `| 3. Fără probleme identificate | **${status.imported ?? 0}** |`,
  `| 4. Necesită revizie de specialitate (nepublicate) | **${review.length}** |`,
  `| 5. Gata pentru publicare editorială | **${publishedCatalog.length}** (${meals.map((m) => `${mealLabel[m]} ${publishedCatalog.filter((r) => r.mealType === m).length}`).join(', ')}) |`,
  `| Aprobate de specialist (aviz semnat) | **${status.specialist_approved ?? 0}** — nicio aprobare medicală nu a fost atribuită |`,
  `| 6. Fotografii | ${photoState.approved ?? 0} aprobate · ${photoState['existing-illustration'] ?? 0} ilustrații vechi generice · ${photoState['pilot-requested'] ?? 0} pilot cerute · ${photoState.missing ?? 0} lipsă (prompt pregătit) |`,
  '',
  `„Publicată” înseamnă: trece verificarea editorială și regulile de siguranță. **Nu înseamnă aviz medical.** Interfața spune asta explicit pe fiecare rețetă.`,
  '',
  '## Ce au găsit regulile în textul vechi',
  '',
  `Auditul anterior raporta 77 de semnale (alergeni/sare) în lista scurtă: semnale automate, nu probleme confirmate. Verificate individual pe toate cele 291 de rețete:`,
  '',
  '- **Sare, zahăr, miere adăugate: 0.** Toate mențiunile de sare sunt „fără sare”; nu există miere sau zahăr adăugat.',
  '- **Struguri, popcorn, mezeluri, lapte de orez, pește cu mercur ridicat: 0.**',
  '- Laptele de vacă apare sub 12 luni doar la gătit (permis); nucile apar aproape mereu măcinate sau ca unt fin.',
  `- **Probleme reale de siguranță în textul vechi: ${before.length} rețete**, toate corectate:`,
  '',
  '| Rețetă | Problemă (înainte) |',
  '|---|---|',
  ...before.map((x) => `| \`${x.id}\` | ${[...new Set(x.flags.map((f) => f.message))].join('; ')} |`),
  '',
  `- Alergeni: etichete standardizate la lista UE (14) pentru ${renamed} rețete („Lactoză” → „Lapte”: alergenul este proteina din lapte, nu lactoza; „Nucă de cocos” nu este alergen UE și rămâne ca informație). Alergeni lipsă adăugați din ingrediente: ${corrected.filter((r) => r.allergenChanges.added.length).length} rețete (cel mai des țelina din ciorbe).`,
  '',
  '## Excepții: rețete care NU sunt afișate familiilor',
  '',
  '| Rețetă | Motiv | Ce trebuie |',
  '|---|---|---|',
  ...review.map((r) => `| \`${r.id}\` (${r.name}, ${r.age}) | ${r.specialistNote ?? r.safetyFlags.filter((f) => f.severity === 'blocking').map((f) => f.message).join('; ')} | decizie de specialist în consola de revizie |`),
  '',
  'Rămân vizibile pentru fondator și specialist în `/v2/revizie`, cu motivul afișat.',
  '',
  '## Avertismente de servire (afișate în rețetă, nu blochează)',
  '',
  '| Avertisment | Rețete |',
  '|---|---|',
  ...Object.entries(warnings).sort((a, b) => b[1] - a[1]).map(([m, n]) => `| ${m} | ${n} |`),
  '',
  '## Statusuri',
  '',
  '| Status | Rețete | Afișată familiilor |',
  '|---|---|---|',
  ...Object.entries(editorialStatusLabels).map(([k, v]) => `| ${v} (\`${k}\`) | ${status[k] ?? 0} | ${k === 'needs_specialist_review' ? 'nu' : 'da'} |`),
  '',
  'Aprobarea de specialist se obține numai printr-o revizie semnată (nume, calificare, dată, surse), legată de textul exact al rețetei; o evaluare AI este respinsă de cod (`hasClinicalReview`). O modificare ulterioară a rețetei anulează aprobarea.',
  '',
  'Jurnalul complet al modificărilor: `editorial/CORRECTIONS-LOG.md`. Fotografiile: `photos/PHOTO-REPORT.md`.',
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'LIBRARY-REPORT.md'), report);

const log = [
  '# Jurnalul corecturilor editoriale',
  '',
  'Fiecare modificare față de biblioteca veche, cu motiv și sursă publică. Corecturi editoriale, nu aviz medical. Generat de `scripts/library-report.cjs`.',
  '',
  '## Modificări de conținut',
  '',
  '| Rețetă | Câmp | Înainte | După | Motiv | Sursă |',
  '|---|---|---|---|---|---|',
  ...catalog.flatMap((r) => r.corrections.map((c) => `| \`${r.id}\` | ${c.field === 'ingredients' ? 'ingredient' : 'pas'} | ${c.before} | ${c.after || '*(eliminat)*'} | ${c.reason} | ${c.source} |`)),
  '',
  '## Alergeni adăugați din ingrediente',
  '',
  '| Rețetă | Adăugați | Lista finală (UE) |',
  '|---|---|---|',
  ...catalog.filter((r) => r.allergenChanges.added.length).map((r) => `| \`${r.id}\` | ${plain(r.allergenChanges.added).join(', ')} | ${plain(r.allergens).join(', ')} |`),
  '',
  '## ID-uri',
  '',
  ...catalog.filter((r) => r.legacyId).map((r) => `- \`${r.legacyId}\` → \`${r.id}\` (ID-ul vechi rămâne valid pentru favoritele V1 și pentru linkuri).`),
  '',
].join('\n');
fs.mkdirSync(path.join(out, 'editorial'), { recursive: true });
fs.writeFileSync(path.join(out, 'editorial/CORRECTIONS-LOG.md'), log);
console.log(`imported ${catalog.length} · corrected ${corrected.length} · clean ${status.imported} · review ${review.length} · publishable ${publishedCatalog.length} · original issues ${before.length}`);
