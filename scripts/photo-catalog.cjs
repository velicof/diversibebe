// Photo plan for the WHOLE library: one Gemini prompt per recipe without a photo, a single visual identity,
// batches (pilot 12 first, then 20 per batch), and a report of existing / missing / imported images.
// Usage: node scripts/photo-catalog.cjs   → docs/ai-ops/photos/{catalog-manifest.json,PHOTO-REPORT.md}
// The pilot manifest (photos/manifest.json, editorial-batch.cjs) stays the source for the first 12;
// scripts/photo-import.cjs matches imported files to recipes by Recipe ID (file name = <recipeId>.png).
const fs = require('node:fs'), path = require('node:path');
const { load, plain } = require('../tests/load-ts.cjs');
const { catalog } = load('src/features/v2/catalog.ts');
const { recipePhotos } = load('src/features/v2/content/photos.ts');

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

const published = catalog.filter((r) => r.published && !r.hasPhoto && !recipePhotos[r.id] && !pilotIds.has(r.id))
  .sort((a, b) => MEAL_ORDER[a.mealType] - MEAL_ORDER[b.mealType] || a.minimumMonths - b.minimumMonths || a.id.localeCompare(b.id));
const batchOf = new Map(published.map((r, i) => [r.id, 1 + Math.floor(i / 20)]));

const photos = catalog.map((r) => {
  const asset = recipePhotos[r.id];
  const state = asset?.approved ? 'approved' : asset ? 'candidate-staged' : imported.has(r.id) ? 'imported-pending-review' : r.hasPhoto ? 'existing-illustration' : pilotIds.has(r.id) ? 'pilot-requested' : 'missing';
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
  `| Candidat WebP generat, așteaptă aprobarea ta (/v2/revizie/fotografii) | ${count('candidate-staged')} |`,
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

// Batch 0 kit: the 12 pilot prompts, ready to paste one by one into the Gemini app.
const ASK = 'Generează o singură fotografie realistă, format 4:3 (orizontal), minimum 1600×1200, după descrierea de mai jos. Respectă strict lista „Nu trebuie să apară”. Dacă nu poți respecta o restricție, spune-o în loc să generezi.';
const kit = [
  '# Lotul 0 — 12 fotografii pilot (Gemini Pro)',
  '',
  'Generat de `scripts/photo-catalog.cjs` din `photos/manifest.json`. Prompturile corespund rețetelor **corectate** (ex. supa de broccoli fără crutoane).',
  '',
  '## Pentru fiecare fotografie',
  '',
  '1. În aplicația Gemini, deschide **o conversație nouă** pentru fiecare rețetă (ca stilul să nu se amestece între rețete).',
  '2. Copiază blocul „De lipit în Gemini” al rețetei și trimite-l.',
  '3. Dacă rezultatul încalcă vreun punct din „Nu trebuie să apară”, cere o variantă nouă în aceeași conversație. Nu edita manual imaginea.',
  '4. Descarcă imaginea la rezoluția maximă și salveaz-o **exact** cu numele din „Salvează ca”, în `content/gemini-import/incoming/`. Niciodată în `public/`.',
  '5. După toate cele 12 (sau după câteva), rulează:',
  '',
  '```bash',
  'node scripts/photo-import.cjs check',
  '```',
  '',
  '6. Deschide `content/gemini-import/review/` și verifică fiecare imagine cu checklist-ul de mai jos (persoană, nu AI).',
  '',
  '**Checklist (respinge dacă):**',
  '- apare un ingredient care nu e în rețetă;',
  '- textura nu se potrivește etapei;',
  '- apare orice element din „Nu trebuie să apară”;',
  '- porția e de adult;',
  '- apar text, logo, persoane sau mâini;',
  '- arată ca o reclamă;',
  '- are detalii AI false (linguri deformate, boluri duble).',
  '',
  '**Condiții de utilizare:** înainte de publicare, verifică în condițiile Google pentru Gemini că imaginile pot fi folosite comercial pe site. Notează linkul în `provenance.termsUrl` și setează `commercialUseTermsChecked: true` doar dacă ești sigur. Fără asta, `photo-import publish` refuză publicarea.',
  '',
  '**După aprobare**, în `docs/ai-ops/photos/manifest.json`, la rețeta respectivă:',
  '- `imageStatus: "approved"`;',
  '- `provenance.generator: "Gemini"`, `model`, `generatedAt`, `reviewedBy` (numele tău), `decision`;',
  '- verifici `alt`.',
  '',
  'Apoi:',
  '',
  '```bash',
  'node scripts/photo-import.cjs publish <recipeId>',
  '```',
  '',
  ...pilot.flatMap((p, i) => {
    const r = catalog.find((x) => x.id === p.recipeId);
    return [
      `## ${i + 1}. ${p.title}`,
      '',
      `\`${p.recipeId}\` · ${r.age} · status: ${r.editorialStatus}${r.published ? '' : ' (nepublicată)'}`,
      '',
      `**Salvează ca:** \`content/gemini-import/incoming/${p.fileName}\``,
      '',
      '**De lipit în Gemini:**',
      '',
      '```text',
      `${ASK}\n\n${p.prompt}\n\nNu trebuie să apară: ${p.mustNotAppear.join('; ')}.`,
      '```',
      '',
      `**Rezultatul așteptat:** ${p.finalResult} · **Textură:** ${p.texture} · **Servire:** ${p.presentation}`,
      '',
    ];
  }),
].join('\n');
fs.writeFileSync(path.join(out, 'PILOT-BATCH-0.md'), kit);
console.log(`photos: ${photos.length} · approved ${count('approved')} · candidates ${count('candidate-staged')} · illustration ${count('existing-illustration')} · imported ${count('imported-pending-review')} · pilot ${count('pilot-requested')} · missing ${count('missing')} · batches ${batches.length}`);
