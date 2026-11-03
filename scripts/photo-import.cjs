// Recipe photos from Gemini Images → checked → (human approval) → responsive WebP in public/v2/recipes.
//   node scripts/photo-import.cjs which <file>   dry run: which recipe a file name belongs to (writes nothing)
//   node scripts/photo-import.cjs check            validate every file in content/gemini-import/incoming, write review previews + REPORT.md
//   node scripts/photo-import.cjs stage [id ...]   WebP candidates (approved: false) for local review; originals untouched
//   node scripts/photo-import.cjs decide <file>    record the human decisions exported from /v2/revizie/fotografii
//   node scripts/photo-import.cjs publish <id>     only for a manifest entry a human set to imageStatus "approved"
// Nothing is published automatically. Gemini cannot write to this disk: the founder downloads the files into incoming/.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const sharp = require('sharp');

const repo = path.resolve(__dirname, '..');
const importDir = path.join(repo, 'content/gemini-import');
const manifestFile = path.join(repo, 'docs/ai-ops/photos/manifest.json');
const photosModule = path.join(repo, 'src/features/v2/content/photos.ts');
const publicDir = path.join(repo, 'public/v2/recipes');
// Candidates are NOT in public/: served only by the review-gated route /v2/revizie/foto/<id>/<width>.
const candidateDir = path.join(repo, 'content/photo-candidates');
const WIDTHS = [480, 800, 1200];
const MAX_800_BYTES = 150 * 1024;

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
// manifest.json is the decision ledger (status + provenance). Recipes beyond the pilot come from the full-catalog
// plan (catalog-manifest.json, scripts/photo-catalog.cjs) and get a ledger entry the first time a file is imported.
const catalogManifestFile = path.join(repo, 'docs/ai-ops/photos/catalog-manifest.json');
const catalogPlan = fs.existsSync(catalogManifestFile) ? JSON.parse(fs.readFileSync(catalogManifestFile, 'utf8')).photos : [];
const ledgerEntry = (plan) => ({
  recipeId: plan.recipeId, title: plan.title, stageMonths: plan.minimumMonths, mealType: plan.mealType,
  exactIngredients: plan.exactIngredients, finalResult: plan.finalResult, mustNotAppear: plan.mustNotAppear,
  prompt: plan.prompt, fileName: plan.fileName, publishedBase: plan.publishedBase, alt: plan.alt, batch: plan.batch,
  imageStatus: 'requested', editorialStatus: plan.editorialStatus,
  provenance: { generator: null, model: null, generatedAt: null, promptVersion: 1, commercialUseTermsChecked: false, termsUrl: null, aiGeneratedLabel: true, reviewedBy: null, decision: null, rejectionReason: null },
});
const entryFor = (file) => {
  const name = path.parse(file).name;
  const known = manifest.photos.find((p) => path.parse(p.fileName).name === name);
  if (known) return known;
  const plan = catalogPlan.find((p) => path.parse(p.fileName).name === name && p.published);
  if (!plan) return undefined;
  const entry = ledgerEntry(plan);
  manifest.photos.push(entry);
  return entry;
};

async function inspect(file) {
  const buffer = fs.readFileSync(file), problems = [];
  const meta = await sharp(buffer).metadata().catch(() => null);
  if (!meta || !['png', 'jpeg', 'webp'].includes(meta.format)) return { problems: ['format neacceptat (doar PNG, JPEG, WebP)'] };
  const ratio = meta.width / meta.height;
  if (meta.width < 1200 || meta.height < 900) problems.push(`rezoluție mică ${meta.width}×${meta.height} (minim 1200×900)`);
  if (Math.abs(ratio - 4 / 3) > 0.08) problems.push(`raport ${ratio.toFixed(2)} (cerut 4:3, se decupează central la publicare)`);
  if (meta.exif || meta.xmp || meta.iptc) problems.push('conține metadate (se elimină la publicare)');
  return { meta, problems, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length };
}

async function check() {
  const incoming = path.join(importDir, 'incoming'), review = path.join(importDir, 'review');
  fs.mkdirSync(review, { recursive: true });
  const files = fs.existsSync(incoming) ? fs.readdirSync(incoming).filter((f) => !f.startsWith('.') && f !== 'README.md') : [];
  const rows = [];
  for (const name of files) {
    const entry = entryFor(name), result = await inspect(path.join(incoming, name));
    if (!entry) result.problems.unshift('nume de fișier necunoscut — redenumește exact ca `fileName` din manifest');
    if (result.meta) await sharp(path.join(incoming, name)).rotate().resize({ width: 800, height: 600, fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(review, `${path.parse(name).name}.webp`));
    rows.push({ name, entry, ...result });
  }
  const missing = manifest.photos.filter((p) => !files.some((f) => path.parse(f).name === path.parse(p.fileName).name));
  const report = [`# Import imagini — verificare tehnică (${new Date().toISOString().slice(0, 10)})`, '',
    'Verificarea tehnică NU aprobă imaginea. Aprobarea vizuală (ingrediente, textură, formă sigură de servire) se face de om, cu checklist-ul din `docs/ai-ops/GEMINI-HANDOFF.md`, apoi se setează în manifest `imageStatus: "approved"` și `provenance`.', '',
    '| Fișier | Rețetă | Dimensiuni | Probleme tehnice | SHA-256 |', '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.name} | ${r.entry ? r.entry.recipeId : '—'} | ${r.meta ? `${r.meta.width}×${r.meta.height} ${r.meta.format}` : '—'} | ${r.problems.join('; ') || 'niciuna'} | \`${(r.sha256 || '').slice(0, 12)}\` |`), '',
    `Lipsesc (${missing.length}): ${missing.map((p) => p.fileName).join(', ') || '—'}`, ''].join('\n');
  fs.writeFileSync(path.join(importDir, 'REPORT.md'), report);
  console.log(report);
}

// Responsive WebP variants from the original (read-only): metadata stripped, 4:3 cover crop, 800w ≤ 150 KB.
async function variants(recipeId, source, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const sizes = {};
  for (const width of WIDTHS) {
    const height = Math.round(width * 3 / 4), target = path.join(dir, `${recipeId}-${width}.webp`);
    let quality = 80;
    do { await sharp(source).rotate().resize({ width, height, fit: 'cover' }).webp({ quality, effort: 6 }).toFile(target); quality -= 6; }
    while (width === 800 && fs.statSync(target).size > MAX_800_BYTES && quality >= 50);
    sizes[width] = fs.statSync(target).size;
  }
  if (sizes[800] > MAX_800_BYTES) throw new Error(`${recipeId}-800.webp are ${sizes[800]} octeți (> 150 KB) chiar la calitate 50`);
  return sizes;
}

function writePhotos(recipeId, entry, sizes, approved, sourceSha256) {
  const current = fs.readFileSync(photosModule, 'utf8').match(/export const recipePhotos: Record<string, RecipePhotoAsset> = (\{[\s\S]*\});/)[1];
  const photos = Function(`return (${current})`)();
  photos[recipeId] = { base: `/v2/recipes/${recipeId}`, widths: WIDTHS, width: 1200, height: 900, alt: entry.alt, aiGenerated: Boolean(entry.provenance.aiGeneratedLabel), approved, sourceSha256, bytes: sizes };
  const header = fs.readFileSync(photosModule, 'utf8').split('export const recipePhotos')[0];
  fs.writeFileSync(photosModule, `${header}export const recipePhotos: Record<string, RecipePhotoAsset> = ${JSON.stringify(photos, null, 2)};\n`);
}

async function stage(ids) {
  const incoming = path.join(importDir, 'incoming');
  const files = fs.readdirSync(incoming).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  const targets = files.map((f) => entryFor(f)).filter((e) => e && (!ids.length || ids.includes(e.recipeId)));
  if (!targets.length) throw new Error('Nicio imagine din incoming/ nu corespunde manifestului.');
  for (const entry of targets) {
    const source = path.join(incoming, files.find((f) => path.parse(f).name === path.parse(entry.fileName).name));
    const result = await inspect(source);
    const blocking = result.problems.filter((p) => !/metadate/.test(p));
    if (blocking.length) { console.log(`${entry.recipeId}: NU — ${blocking.join('; ')}`); continue; }
    const sizes = await variants(entry.recipeId, source, candidateDir);
    writePhotos(entry.recipeId, entry, sizes, false, result.sha256);
    if (['requested', 'candidate'].includes(entry.imageStatus)) entry.imageStatus = 'candidate';
    entry.provenance.sourceSha256 = result.sha256;
    entry.provenance.stagedAt = new Date().toISOString();
    console.log(`${entry.recipeId}: candidat · ${WIDTHS.map((w) => `${w}w ${Math.round(sizes[w] / 1024)} KB`).join(', ')} · original ${Math.round(result.bytes / 1024)} KB păstrat`);
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}

// Applies the decisions exported from /v2/revizie/fotografii. Records who decided; never publishes and never
// marks the commercial-use terms as checked (that stays a separate, manual confirmation).
function decide(file) {
  const payload = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!payload.reviewer || !Array.isArray(payload.decisions)) throw new Error('Fișier de decizii invalid (lipsește reviewer sau decisions).');
  if (/\b(?:ai|gpt|gemini|claude|bot|automat\w*)\b/i.test(payload.reviewer)) throw new Error('Aprobarea vizuală trebuie făcută de o persoană.');
  for (const d of payload.decisions) {
    const entry = manifest.photos.find((p) => p.recipeId === d.recipeId);
    if (!entry) { console.log(`${d.recipeId}: nu este în manifest — ignorat`); continue; }
    if (entry.provenance.sourceSha256 && d.sourceSha256 !== entry.provenance.sourceSha256) { console.log(`${d.recipeId}: decizia privește alt fișier decât cel pregătit — ignorată`); continue; }
    entry.provenance.reviewedBy = payload.reviewer;
    entry.provenance.decision = d.decision;
    entry.provenance.decidedAt = payload.decidedAt;
    entry.provenance.reviewNotes = d.notes || null;
    if (d.decision === 'approved') entry.imageStatus = 'approved';
    else { entry.imageStatus = 'rejected'; entry.provenance.rejectionReason = d.notes || d.decision; }
    console.log(`${d.recipeId}: ${entry.imageStatus}${entry.imageStatus === 'approved' && !entry.provenance.commercialUseTermsChecked ? ' — mai lipsește confirmarea condițiilor de utilizare (termsUrl, commercialUseTermsChecked) înainte de publish' : ''}`);
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
}

async function publish(recipeId) {
  const entry = manifest.photos.find((p) => p.recipeId === recipeId);
  if (!entry) throw new Error(`${recipeId} nu este în manifest`);
  const blockers = [];
  if (entry.imageStatus !== 'approved') blockers.push(`imageStatus este "${entry.imageStatus}", nu "approved"`);
  if (!entry.provenance.commercialUseTermsChecked || !entry.provenance.termsUrl) blockers.push('condițiile de utilizare comercială nu sunt verificate (provenance.commercialUseTermsChecked + termsUrl)');
  if (!entry.provenance.reviewedBy || !entry.provenance.generator) blockers.push('lipsește provenance.reviewedBy sau provenance.generator');
  if (!entry.alt || entry.alt.length < 20) blockers.push('lipsește textul alternativ (alt, minim 20 de caractere)');
  const source = path.join(importDir, 'incoming', entry.fileName);
  if (!fs.existsSync(source)) blockers.push(`lipsește ${path.relative(repo, source)}`);
  if (blockers.length) throw new Error(`Nu public ${recipeId}:\n- ${blockers.join('\n- ')}`);

  // The approved file must be the one that was staged and looked at.
  const sha256 = (await inspect(source)).sha256;
  if (entry.provenance.sourceSha256 && entry.provenance.sourceSha256 !== sha256)
    throw new Error(`${recipeId}: fișierul din incoming/ nu mai este cel verificat (sha256 diferit). Rulează din nou stage și verifică.`);
  const sizes = await variants(recipeId, source, publicDir);
  writePhotos(recipeId, entry, sizes, true, sha256);
  for (const width of WIDTHS) fs.rmSync(path.join(candidateDir, `${recipeId}-${width}.webp`), { force: true });
  entry.imageStatus = 'published';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${recipeId}: ${WIDTHS.map((w) => `${w}w ${Math.round(sizes[w] / 1024)} KB`).join(', ')}. Apare pe rețetele publicate din bibliotecă; o rețetă aflată în revizie de specialitate nu este afișată familiilor.`);
}

// Dry run: which recipe a file name maps to. Writes nothing.
function which(file) {
  const before = manifest.photos.length, entry = entryFor(file);
  if (!entry) { console.log(`${file}: necunoscut — nu corespunde unei rețete publicabile (rețetele din revizia de specialitate nu primesc fotografie)`); process.exitCode = 1; return; }
  console.log(`${file} → ${entry.recipeId} · ${entry.title} · ${entry.batch === null || entry.batch === undefined ? (manifest.photos.length > before ? 'fără lot' : 'pilot') : `lot ${entry.batch}`} · ${manifest.photos.length > before ? 'intrare nouă la import' : `în registru (${entry.imageStatus})`}`);
}

const [command, arg] = process.argv.slice(2);
const ids = process.argv.slice(3);
(command === 'which' && arg ? Promise.resolve(which(arg)) : command === 'check' ? check() : command === 'stage' ? stage(ids) : command === 'decide' && arg ? Promise.resolve(decide(arg)) : command === 'publish' && arg ? publish(arg) : Promise.reject(new Error('Folosire: check | stage [recipeId ...] | decide <fișier.json> | publish <recipeId>')))
  .catch((e) => { console.error(e.message); process.exit(1); });
