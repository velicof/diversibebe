// Builds launch batch 1 for specialist review and the 12-photo manifest for Gemini Images.
// Deterministic: reads the catalog, the editorial shortlist and docs/PHOTO-STRATEGY.md. Writes docs/ai-ops/{editorial,photos}.
// Nothing here approves anything: every record carries its current editorial status and an empty review block.
const fs = require('node:fs'), path = require('node:path');
const { load } = require('../tests/load-ts.cjs');
const { catalog, storableId } = load('src/features/v2/catalog.ts');
const { editorialShortlist } = load('src/features/v2/content/shortlist.ts');
const { normalize, inspectContent } = load('src/features/v2/review.ts');
const season = load('src/features/v2/season.ts');
const { recipeFingerprint } = load('src/features/v2/content/editorial.ts');

const repo = path.resolve(__dirname, '..');
const out = path.join(repo, 'docs/ai-ops');
const QUOTA = { 'mic-dejun': 7, pranz: 9, cina: 6, gustare: 4 }; // 26 recipes
const STAGES = [6, 8, 10, 12];
const stageOf = (months) => STAGES.filter((s) => s <= months).pop() ?? 6;
// Legacy ids (e.g. "omletă-legume-8") resolve to their V2 alias; aliased recipes stay out of batch selection,
// so batch 1 keeps the composition it was prepared with.
const byId = new Map(catalog.flatMap((r) => [[r.id, r], ...(r.legacyId ? [[r.legacyId, r]] : [])]));
const score = new Map(editorialShortlist.map((r) => [r.id, r.score]));

// Duplicates inside the shortlist: same normalized name stem.
const stem = (name) => normalize(name).replace(/\b(cu|si|de|la|pentru|bebe|bebelus)\b/g, ' ').replace(/\d+\+?/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
const seen = new Map(), duplicates = [];
for (const { id } of editorialShortlist) {
  const key = stem(byId.get(id).name);
  if (seen.has(key)) duplicates.push([seen.get(key), id]); else seen.set(key, id);
}
const duplicateIds = new Set(duplicates.map(([, b]) => b));

const photoIds = [...fs.readFileSync(path.join(repo, 'docs/PHOTO-STRATEGY.md'), 'utf8').matchAll(/^\| (\d+) \| [^|]*\(`([a-z0-9-]+)`\)/gm)].map((m) => m[2]);
if (photoIds.length !== 12) throw new Error(`PHOTO-STRATEGY.md lists ${photoIds.length} pilot recipes, expected 12`);

const importedHeavy = (r) => season.detectProduce(r.ingredients).some((p) => !p.local && !p.depozit && !p.allYear);
const quantified = (r) => r.ingredients.filter((l) => /\d|jumatate|sfert|lingur|cana|felie|bucat|un ou|varf/.test(normalize(l)) || /dupa gust|optional/.test(normalize(l))).length === r.ingredients.length;
const simple = (r) => r.ingredients.length <= 7 && (r.minutes ?? 99) <= 30;

const chosen = new Map(photoIds.map((id) => [id, 'pilot foto']));
for (const [meal, quota] of Object.entries(QUOTA)) {
  const pool = editorialShortlist.map(({ id }) => byId.get(id))
    .filter((r) => r.mealType === meal && storableId(r.id) && !r.legacyId && !duplicateIds.has(r.id) && !chosen.has(r.id))
    .sort((a, b) => Number(quantified(b) && simple(b) && !importedHeavy(b)) - Number(quantified(a) && simple(a) && !importedHeavy(a)) || score.get(b.id) - score.get(a.id));
  let have = [...chosen.keys()].filter((id) => byId.get(id).mealType === meal).length;
  for (let round = 0; have < quota && round < 10; round++) for (const stage of STAGES) {
    if (have >= quota) break;
    const next = pool.find((r) => !chosen.has(r.id) && stageOf(r.minimumMonths) === stage);
    if (next) { chosen.set(next.id, 'acoperire masă × etapă'); have++; }
  }
}

const texture = { 6: 'piure fin, omogen, fără bucăți', 8: 'piure grosier sau bucăți foarte moi, ușor de strivit între degete', 10: 'bucăți mici și moi, tăiate mărunt', 12: 'mâncarea familiei, tăiată în bucăți mici, moi' };
const serving = { 6: 'cu lingurița, porții mici (2–4 linguri)', 8: 'cu lingurița sau ca finger food moale în fâșii de mărimea unui deget', 10: 'finger food moale și cu lingurița; copilul exersează singur', 12: 'în farfurie, bucăți mici; supraveghere continuă' };
// Canonical EU allergen groups from the declared list plus the ingredient text (heuristic; the reviewer confirms).
const allergenWords = { ou: /\bou[a]?\b|\boua\b/, lactate: /lapte|lacto|iaurt|branz|smantan|\bunt\b|chefir|cascaval|mozzarel|ricotta/, gluten: /gluten|faina|paine|paste|gris|cuscus|ovaz|biscuit|pesmet/, nuci: /\bnuc(?!soar)|migdal|\balun|caju|fistic/, arahide: /arahid/, peste: /somon|peste|\bton\b|\bcod\b|pastrav|salau/, susan: /tahini|susan/, soia: /soia|tofu/ };
const allergenLabel = { ou: 'ou', lactate: 'lactate', gluten: 'gluten', nuci: 'nuci', arahide: 'arahide', peste: 'pește', susan: 'susan', soia: 'soia' };
const allergensOf = (r) => { const text = normalize([...(r.allergens || []), ...r.ingredients].join(' ')); return Object.entries(allergenWords).filter(([, re]) => re.test(text)).map(([k]) => allergenLabel[k]); };

const recipes = [...chosen].map(([id, reason]) => {
  const r = byId.get(id), stage = stageOf(r.minimumMonths), flags = inspectContent([r.age, ...r.ingredients, ...r.steps, r.storage].join('. '));
  return {
    id, title: r.name, mealType: r.mealType, stageMonths: stage, catalogAge: r.age, minutes: r.minutes, servings: r.servings,
    ingredients: r.ingredients, steps: r.steps, storage: r.storage, allergens: allergensOf(r),
    proposedTexture: texture[stage], proposedServing: serving[stage],
    automaticFlags: flags.reasons, quantitiesComplete: quantified(r), localSeasonMonths: season.detectProduce(r.ingredients).filter((p) => p.local).map((p) => p.name),
    selectionReason: reason, photoPilot: photoIds.includes(id),
    editorialStatus: r.editorialStatus,
    // The review is valid only for this exact text (src/features/v2/content/editorial.ts).
    contentHash: recipeFingerprint(r),
    review: { decision: null, reviewer: null, credentials: null, reviewedAt: null, sourceUrls: [], version: null, corrections: null },
  };
}).sort((a, b) => Object.keys(QUOTA).indexOf(a.mealType) - Object.keys(QUOTA).indexOf(b.mealType) || a.stageMonths - b.stageMonths);

// Coverage gaps: meal × stage cells with no recipe in the batch.
const gaps = [];
for (const meal of Object.keys(QUOTA)) for (const stage of STAGES) if (!recipes.some((r) => r.mealType === meal && r.stageMonths === stage)) gaps.push(`${meal} · ${stage}+`);

fs.mkdirSync(path.join(out, 'editorial'), { recursive: true });
fs.mkdirSync(path.join(out, 'photos'), { recursive: true });
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'editorial/batch-1.json'), JSON.stringify({ generatedAt: today, generator: 'scripts/editorial-batch.cjs', note: 'Propuneri editoriale. Textura și forma de servire sunt PROPUNERI de validat de specialist. Nicio rețetă nu este aprobată.', duplicatesInShortlist: duplicates, coverageGaps: gaps, recipes }, null, 2) + '\n');

const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const sheet = [['id', 'titlu', 'masa', 'etapa', 'alergeni', 'textura_propusa', 'servire_propusa', 'marcaje_automate', 'DECIZIE (aprobat/modificari/respins)', 'textura_confirmata', 'servire_confirmata', 'corecturi', 'specialist', 'calificare_si_nr_parafa', 'data', 'surse_https'].join(','),
  ...recipes.map((r) => [r.id, r.title, r.mealType, `${r.stageMonths}+`, r.allergens.join('; '), r.proposedTexture, r.proposedServing, r.automaticFlags.join('; '), '', '', '', '', '', '', '', ''].map(cell).join(','))].join('\n');
fs.writeFileSync(path.join(out, 'editorial/review-sheet-batch-1.csv'), '﻿' + sheet + '\n');

const meals = { 'mic-dejun': 'Mic dejun', pranz: 'Prânz', cina: 'Cină', gustare: 'Gustare' };
const md = [`# Lot editorial 1 — ${recipes.length} rețete pentru revizie de specialitate`, '', `Generat ${today} de \`scripts/editorial-batch.cjs\` din shortlist-ul de 90. Status pentru toate: **review_required**. Textura și forma de servire sunt propuneri editoriale, nu recomandări medicale.`, '',
  '## Acoperire', '', '| Masă | 6+ | 8+ | 10+ | 12+ | Total |', '|---|---|---|---|---|---|',
  ...Object.keys(QUOTA).map((m) => `| ${meals[m]} | ${STAGES.map((s) => recipes.filter((r) => r.mealType === m && r.stageMonths === s).length).join(' | ')} | ${recipes.filter((r) => r.mealType === m).length} |`), '',
  `Goluri de acoperire (masă × etapă fără rețetă în lot): ${gaps.length ? gaps.join(', ') : 'niciunul'}.`, '',
  '## Rețete', '', '| # | Rețetă (`id`) | Masă · etapă | Alergeni | Cantități complete | Marcaje automate | Motiv |', '|---|---|---|---|---|---|---|',
  ...recipes.map((r, i) => `| ${i + 1} | ${r.title} (\`${r.id}\`) | ${meals[r.mealType]} · ${r.stageMonths}+ | ${r.allergens.join(', ') || '—'} | ${r.quantitiesComplete ? 'da' : '**nu**'} | ${r.automaticFlags.join('; ') || '—'} | ${r.selectionReason}${r.photoPilot ? ' 📷' : ''} |`), '',
  `## Duplicate în shortlist (${duplicates.length})`, '', ...(duplicates.length ? duplicates.map(([a, b]) => `- \`${b}\` dublează \`${a}\` — exclus din lot`) : ['- niciunul detectat']), '',
  '## Fișiere', '', '- `batch-1.json` — conținut complet (ingrediente, pași, alergeni, propuneri), câmp `review` gol.', '- `review-sheet-batch-1.csv` — foaia completată de specialist (se deschide în Excel).', '- Instrucțiuni pentru specialist: `../REVIEW-PACKAGE.md`.', ''].join('\n');
fs.writeFileSync(path.join(out, 'editorial/BATCH-1.md'), md);

// Photo manifest (12). Only stable, non-personal data: no child names, no account data, no secrets.
const strategy = Object.fromEntries([...fs.readFileSync(path.join(repo, 'docs/PHOTO-STRATEGY.md'), 'utf8').matchAll(/^\| \d+ \| [^|]*\(`([a-z0-9-]+)`\) \| [^|]* \| [^|]* \| ([^|]*) \| ([^|]*) \|/gm)].map((m) => [m[1], { look: m[2].trim(), safety: m[3].trim() }]));
const manifestFile = path.join(out, 'photos/manifest.json');
const previous = new Map(fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')).photos.map((p) => [p.recipeId, p]) : []);
const neverShow = ['sare sau solniță', 'miere', 'zahăr pudră, sirop, glazură', 'nuci, alune sau semințe întregi', 'struguri, afine, roșii cherry sau măsline întregi (sub 12 luni)', 'ingrediente care nu apar în rețetă', 'persoane, mâini de adult cu bijuterii, fețe de copii', 'text, logo, mărci, ambalaje', 'tacâmuri metalice ascuțite, pahare de sticlă', 'abur puternic sau mâncare fierbinte'];
const manifest = {
  version: 1, generatedAt: today, generator: 'scripts/editorial-batch.cjs',
  rules: 'Imaginile se încarcă în content/gemini-import/incoming/ și NU sunt publicate până când imageStatus=approved ȘI editorialStatus=published pentru rețetă. Manifestul nu conține date personale sau secrete.',
  promptTemplate: 'Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: {LOOK}. Ingrediente vizibile doar din: {INGREDIENTS}. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. {SAFETY}. Format 4:3, minimum 1600×1200.',
  photos: photoIds.map((id) => {
    const r = recipes.find((x) => x.id === id), s = strategy[id];
    const main = r.ingredients.map((l) => l.replace(/^(?:[\d½¼¾⅓⅔\/.,\s-]+|(?:o|un|una|doi|două|trei)\s+)(?:linguri\S*|lingur\S*|cană|căni|cani|bucăți|bucată|felii|felie|vârf|varf|cățel|kg|ml|g|l)?(?=\s|$)\s*(?:de\s+)?/i, '').replace(/\(.*?\)/g, '').trim()).filter((l) => !/apa|dupa gust|optional/i.test(normalize(l)));
    return {
      recipeId: id, title: r.title, stageMonths: r.stageMonths, mealType: r.mealType,
      exactIngredients: r.ingredients,
      finalResult: s.look, texture: r.proposedTexture, presentation: r.proposedServing,
      mustNotAppear: [...new Set([...s.safety.split(/[;,]/).map((x) => x.replace(/\*\*/g, '').trim()).filter(Boolean), ...neverShow])],
      prompt: `Fotografie realistă de mâncare gătită acasă, porție pentru copil mic: ${s.look.replace(/\*\*/g, '')}. Ingrediente vizibile doar din: ${main.join(', ')}. Bol ceramic mic mat, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale. Fără text, fără logo, fără persoane. ${s.safety.replace(/\*\*/g, '').replace(/^./, (c) => c.toUpperCase())}. Format 4:3, minimum 1600×1200.`,
      fileName: `${id}.png`, publishedBase: `/v2/recipes/${id}`,
      alt: `${r.title}: ${s.look.replace(/\*\*/g, '')}.`,
      imageStatus: 'requested', editorialStatus: r.editorialStatus,
      provenance: { generator: null, model: null, generatedAt: null, promptVersion: 1, commercialUseTermsChecked: false, termsUrl: null, aiGeneratedLabel: true, reviewedBy: null, decision: null, rejectionReason: null },
      // Human decisions survive regeneration.
      ...(previous.get(id) ? { alt: previous.get(id).alt, imageStatus: previous.get(id).imageStatus, provenance: previous.get(id).provenance } : {}),
    };
  }),
};
fs.writeFileSync(path.join(out, 'photos/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`batch-1: ${recipes.length} recipes, gaps: ${gaps.join(', ') || 'none'}, duplicates: ${duplicates.length}; manifest: ${manifest.photos.length} photos`);
