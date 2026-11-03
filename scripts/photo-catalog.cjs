// Photo plan for the WHOLE library: one Gemini prompt per recipe without a photo, a single visual identity,
// batches (pilot 12 first, then 20 per batch), and a report of existing / missing / imported images.
// Usage: node scripts/photo-catalog.cjs   → docs/ai-ops/photos/{catalog-manifest.json,PHOTO-REPORT.md}
// The pilot manifest (photos/manifest.json, editorial-batch.cjs) stays the source for the first 12;
// scripts/photo-import.cjs matches imported files to recipes by Recipe ID (file name = <recipeId>.png).
const fs = require('node:fs'), path = require('node:path');
const { load, plain } = require('../tests/load-ts.cjs');
const { catalog } = load('src/features/v2/catalog.ts');

const repo = path.resolve(__dirname, '..'), out = path.join(repo, 'docs/ai-ops/photos');
const pilot = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')).photos;
const pilotIds = new Set(pilot.map((p) => p.recipeId));
const incoming = path.resolve(repo, 'content/gemini-import/incoming');
const imported = new Set(fs.existsSync(incoming) ? fs.readdirSync(incoming).map((f) => f.replace(/\.(png|jpe?g|webp)$/i, '')) : []);

const IDENTITY = 'Fotografie realistă de mâncare gătită acasă, porție mică pentru copil. Bol ceramic mat crem sau farfurie mică, linguriță de silicon, fundal in bej și lemn deschis, lumină naturală de dimineață din stânga, umbre moi, unghi 3/4, profunzime de câmp mică, culori naturale, fără stilizare publicitară. Fără text, fără logo, fără persoane sau mâini. Format 4:3, minimum 1600×1200.';
const NEVER = ['text sau logo', 'persoane sau mâini', 'sare, zahăr sau miere vizibile', 'nuci sau arahide întregi', 'struguri, roșii cherry sau afine întregi', 'ingrediente care nu sunt în rețetă', 'porție de adult'];
const MEAL_ORDER = { 'mic-dejun': 0, pranz: 1, cina: 2, gustare: 3 };
// Longest units first; `(?=\s|$)` instead of \b, which does not treat "ț"/"ă" as letters.
const UNITS = /^(?:linguri(?:ță|ța|țe|te|tă|ta)|lingur(?:ă|a|i)|căni|cană|cani|cana|kg|gr|g|ml|l|vârf|varf|bucăți|bucată|bucati|bucata|felii|felie|căței|cățel|mână|mana|pahar|conserve|conservă|tulpini|buchețele)(?=\s|$)\.?\s*(?:de\s+)?/i;
const main = (r) => r.ingredients
  .map((l) => l.replace(/\(.*?\)/g, '').replace(/^[\d¼½¾⅓⅔.,/\s-]+/, '').replace(UNITS, '').replace(/^(?:un|o|două|doi)\s+/i, '').replace(/,.*$/, '').trim())
  .filter((l) => l && !/^(apă|apa|ulei|sare|piper|condimente|optional)/i.test(l))
  .slice(0, 6);

const published = catalog.filter((r) => r.published && !r.hasPhoto && !pilotIds.has(r.id))
  .sort((a, b) => MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType] || a.minimumMonths - b.minimumMonths || a.id.localeCompare(b.id));
const batchOf = new Map(published.map((r, i) => [r.id, 1 + Math.floor(i / 20)]));

const photos = catalog.map((r) => {
  const state = r.photo ? 'approved' : imported.has(r.id) ? 'imported-pending-review' : r.hasPhoto ? 'existing-illustration' : pilotIds.has(r.id) ? 'pilot-requested' : 'missing';
  const look = `${r.name.toLowerCase()}, ${r.servingGuidance.replace(/\.$/, '').toLowerCase()}`;
  return {
    recipeId: r.id,
    title: r.name,
    mealType: r.mealType,
    minimumMonths: r.minimumMonths,
    editorialStatus: r.editorialStatus,
    published: r.published,
    photoState: state,
    batch: pilotIds.has(r.id) ? 0 : r.published ? batchOf.get(r.id) ?? null : null,
    fileName: `${r.id}.png`,
    publishedBase: `/v2/recipes/${r.id}`,
    exactIngredients: plain(main(r)),
    finalResult: look,
    mustNotAppear: NEVER,
    prompt: `${IDENTITY} Preparat: ${look}. Ingrediente vizibile doar din: ${main(r).join(', ')}. Nu trebuie să apară: ${NEVER.join('; ')}.`,
    alt: `${r.name}, porție pentru copil: ${r.servingGuidance.charAt(0).toLowerCase()}${r.servingGuidance.slice(1)}`,
  };
});

const count = (s) => photos.filter((p) => p.photoState === s).length;
const batches = [...new Set(photos.map((p) => p.batch).filter((b) => b !== null))].sort((a, b) => a - b);
fs.writeFileSync(path.join(out, 'catalog-manifest.json'), JSON.stringify({ generatedBy: 'scripts/photo-catalog.cjs', identity: IDENTITY, mustNotAppear: NEVER, rules: 'Fișierul descărcat din Gemini se numește exact <recipeId>.png și intră în content/gemini-import/incoming/. Publicarea: scripts/photo-import.cjs (aprobare umană, WebP 480/800/1200). Rețetele nepublicate (revizie de specialitate) nu primesc fotografie până la decizie.', photos }, null, 2) + '\n');
const md = [
  '# Fotografii — biblioteca completă',
  '',
  `Generat de \`scripts/photo-catalog.cjs\`. Total rețete: **${photos.length}**.`,
  '',
  '| Stare | Rețete |',
  '|---|---|',
  `| Fotografie aprobată și publicată (\`photos.ts\`) | ${count('approved')} |`,
  `| Ilustrație existentă (imagini V2 vechi, generice) | ${count('existing-illustration')} |`,
  `| Importată, așteaptă verificarea umană | ${count('imported-pending-review')} |`,
  `| Pilot cerut (manifest 12) | ${count('pilot-requested')} |`,
  `| Lipsă (prompt pregătit) | ${count('missing')} |`,
  '',
  'Până la fotografie, cardul afișează o imagine de rezervă (culoarea momentului mesei, emoji-ul rețetei, ingredientele principale, „Fotografie în pregătire”).',
  '',
  '## Identitate fotografică (identică pentru toate cererile)',
  '',
  `> ${IDENTITY}`,
  '',
  `Nu trebuie să apară: ${NEVER.join('; ')}.`,
  '',
  '## Loturi',
  '',
  '| Lot | Rețete | Conținut |',
  '|---|---|---|',
  ...batches.map((b) => {
    const list = photos.filter((p) => p.batch === b);
    const meals = [...new Set(list.map((p) => p.mealType))].join(', ');
    return `| ${b === 0 ? '0 (pilot)' : b} | ${list.length} | ${meals} |`;
  }),
  '',
  `Rețete fără lot (în revizie de specialitate, nepublicate): ${photos.filter((p) => p.batch === null && !p.published).map((p) => '`' + p.recipeId + '`').join(', ') || '—'}.`,
  '',
  '## Flux',
  '',
  '1. Din `catalog-manifest.json` copiezi `prompt` pentru rețetele lotului (Gemini Pro, aplicația ta; nu se activează API-uri plătite).',
  '2. Salvezi fiecare imagine ca `<recipeId>.png` în `content/gemini-import/incoming/`.',
  '3. `node scripts/photo-import.cjs check` → verificare vizuală (checklist din `GEMINI-HANDOFF.md`).',
  '4. Aprobată → `node scripts/photo-import.cjs publish <recipeId>` (WebP 480/800/1200, asociere automată după Recipe ID).',
  '5. `node scripts/photo-catalog.cjs` actualizează acest raport.',
  '',
].join('\n');
fs.writeFileSync(path.join(out, 'PHOTO-REPORT.md'), md);
console.log(`photos: ${photos.length} · approved ${count('approved')} · illustration ${count('existing-illustration')} · imported ${count('imported-pending-review')} · pilot ${count('pilot-requested')} · missing ${count('missing')} · batches ${batches.length}`);
