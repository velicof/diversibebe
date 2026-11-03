// Recipe photos from Gemini Images → checked → (human approval) → responsive WebP in public/v2/recipes.
//   node scripts/photo-import.cjs check            validate every file in content/gemini-import/incoming, write review previews + REPORT.md
//   node scripts/photo-import.cjs publish <id>     only for a manifest entry a human set to imageStatus "approved"
// Nothing is published automatically. Gemini cannot write to this disk: the founder downloads the files into incoming/.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const sharp = require('sharp');

const repo = path.resolve(__dirname, '..');
const importDir = path.join(repo, 'content/gemini-import');
const manifestFile = path.join(repo, 'docs/ai-ops/photos/manifest.json');
const photosModule = path.join(repo, 'src/features/v2/content/photos.ts');
const publicDir = path.join(repo, 'public/v2/recipes');
const WIDTHS = [480, 800, 1200];
const MAX_800_BYTES = 150 * 1024;

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const entryFor = (file) => manifest.photos.find((p) => path.parse(p.fileName).name === path.parse(file).name);

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

  fs.mkdirSync(publicDir, { recursive: true });
  const sizes = {};
  for (const width of WIDTHS) {
    const height = Math.round(width * 3 / 4), target = path.join(publicDir, `${recipeId}-${width}.webp`);
    let quality = 80;
    do { await sharp(source).rotate().resize({ width, height, fit: 'cover' }).webp({ quality, effort: 6 }).toFile(target); quality -= 6; }
    while (width === 800 && fs.statSync(target).size > MAX_800_BYTES && quality >= 50);
    sizes[width] = fs.statSync(target).size;
  }
  if (sizes[800] > MAX_800_BYTES) throw new Error(`${recipeId}-800.webp are ${sizes[800]} octeți (> 150 KB) chiar la calitate 50`);

  const current = fs.readFileSync(photosModule, 'utf8').match(/export const recipePhotos: Record<string, RecipePhotoAsset> = (\{[\s\S]*\});/)[1];
  const photos = Function(`return (${current})`)();
  photos[recipeId] = { base: `/v2/recipes/${recipeId}`, widths: WIDTHS, width: 1200, height: 900, alt: entry.alt, aiGenerated: Boolean(entry.provenance.aiGeneratedLabel) };
  const header = fs.readFileSync(photosModule, 'utf8').split('export const recipePhotos')[0];
  fs.writeFileSync(photosModule, `${header}export const recipePhotos: Record<string, RecipePhotoAsset> = ${JSON.stringify(photos, null, 2)};\n`);
  entry.imageStatus = 'published';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${recipeId}: ${WIDTHS.map((w) => `${w}w ${Math.round(sizes[w] / 1024)} KB`).join(', ')}. Se afișează online numai după ce rețeta are status editorial "published".`);
}

const [command, arg] = process.argv.slice(2);
(command === 'check' ? check() : command === 'publish' && arg ? publish(arg) : Promise.reject(new Error('Folosire: check | publish <recipeId>')))
  .catch((e) => { console.error(e.message); process.exit(1); });
