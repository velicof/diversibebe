// What the repository can prove before each release step. Read-only: git refs, files and the catalog.
// Production facts (migrations applied, Auth settings, backup) are confirmed by their own runbook steps.
//   node scripts/release-check.cjs            → all stages
//   node scripts/release-check.cjs main       → exit 1 if merging release/v2-rc into main is not safe yet
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const { load } = require('../tests/load-ts.cjs');
const repo = path.resolve(__dirname, '..');
const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
const ancestor = (a, b) => git('merge-base', '--is-ancestor', a, b).status === 0;
const has = (ref) => git('rev-parse', '--verify', '--quiet', ref).status === 0;

const { catalog, publishedCatalog } = load('src/features/v2/catalog.ts');
const { recipePhotos } = load('src/features/v2/content/photos.ts');
const V1_PATCH = ['b12b652', 'ef8b028', '360d05d', '8f7780d'];

const checks = [];
const add = (stage, name, ok, action) => checks.push({ stage, name, ok, action });

// Repository state.
const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
add('all', `branch curent: ${branch}`, branch === 'release/v2-rc', 'lucrează pe release/v2-rc');
add('all', 'working tree fără modificări urmărite necomise', !git('status', '--porcelain', '--untracked-files=no').stdout.trim(), 'commit sau stash local');
add('all', 'release/v2-rc conține producția (origin/main)', has('origin/main') && ancestor('origin/main', 'HEAD'), 'git fetch + merge origin/main (local)');

// Stage 1 — private preview, synthetic/guest data.
add('preview', 'branch-ul există pe GitHub (Preview Vercel)', git('ls-remote', '--exit-code', '--heads', 'origin', branch).status === 0, 'push release/v2-rc (aprobare)');
add('all', 'catalog.generated.json corespunde regulilor actuale', spawnSync(process.execPath, ['scripts/generate-catalog.cjs', '--check'], { cwd: repo }).status === 0, 'node scripts/generate-catalog.cjs + commit');
add('preview', 'biblioteca publicabilă ≥ 280 rețete', publishedCatalog.length >= 280, 'vezi LIBRARY-REPORT.md');

// Stage 2 — founder account on the shared production project.
const patchLive = V1_PATCH.every((c) => has(c) && has('origin/main') && ancestor(c, 'origin/main'));
add('founder', 'patch-ul V1 (4 commituri) este în producție (origin/main)', patchLive, 'push + PR + merge hotfix/v1-v2-schema-compat (aprobare)');

// Stage 3/4 — merge release/v2-rc into main (beta, then public).
const candidates = Object.entries(recipePhotos).filter(([, p]) => !p.approved).map(([id]) => id);
const publicFiles = fs.existsSync(path.join(repo, 'public/v2/recipes')) ? fs.readdirSync(path.join(repo, 'public/v2/recipes')) : [];
const unapprovedFiles = publicFiles.filter((f) => candidates.some((id) => f.startsWith(`${id}-`)));
add('main', 'nicio fotografie neaprobată în public/ (ar fi accesibilă prin URL după merge)', unapprovedFiles.length === 0,
  `${unapprovedFiles.length} fișiere candidate: publică cele aprobate (photo-import publish) și scoate restul din public/v2/recipes înainte de merge`);
add('main', 'rețetele din coada de specialitate nu sunt publicate', catalog.filter((r) => r.editorialStatus === 'needs_specialist_review').every((r) => !r.published), 'verifică catalog.ts');
add('main', 'patch-ul V1 este în producție înaintea merge-ului V2', patchLive, 'etapa 1 din MIGRATION-V1-V2.md');

const stages = { all: 'Repository', preview: '1. Preview privat (mod vizitator)', founder: '2. Testare cu contul fondatorului', main: '3–4. Merge în main (beta / public)' };
for (const [key, title] of Object.entries(stages)) {
  console.log(`\n${title}`);
  for (const c of checks.filter((x) => x.stage === key)) console.log(`  ${c.ok ? '✔' : '✖'} ${c.name}${c.ok ? '' : ` → ${c.action}`}`);
}
console.log('\nVerificări care nu se pot face din repository (le confirmă runbook-ul): backup, migrații aplicate, setările Auth, variabilele Vercel, testul pe telefon.');
if (process.argv[2] === 'main') {
  const blocking = checks.filter((c) => (c.stage === 'main' || c.stage === 'all') && !c.ok);
  if (blocking.length) { console.error(`\nNO-GO pentru merge în main: ${blocking.length} condiții`); process.exit(1); }
  console.log('\nGO tehnic pentru merge în main (aprobarea rămâne a ta).');
}
