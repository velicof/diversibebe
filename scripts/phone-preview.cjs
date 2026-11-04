// Private V2 preview for the founder's phone, on the isolated local stack. No Supabase project, no production data.
//   node scripts/phone-preview.cjs           starts everything and prints the address to open
//   node scripts/phone-preview.cjs --build   rebuilds first (after pulling code changes)
// Then, once, in another terminal: tailscale serve --bg 3105       (stop: tailscale serve reset)
const fs = require('node:fs'), path = require('node:path'), { spawn, spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const dist = '.next-phone', appPort = '3103', phonePort = '3105';
const env = { ...process.env, V2_DIST_DIR: dist, V2_PORT: appPort, V2_PHONE_PORT: phonePort };

function run(args, extra = {}) {
  const r = spawnSync(process.execPath, args, { cwd: repo, env: { ...env, ...extra }, stdio: 'inherit', windowsHide: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
function tailscaleName() {
  for (const bin of ['tailscale', 'C:\\Program Files\\Tailscale\\tailscale.exe']) {
    const r = spawnSync(bin, ['status', '--json'], { encoding: 'utf8', windowsHide: true });
    if (r.status === 0) {
      try { return JSON.parse(r.stdout).Self?.DNSName?.replace(/\.$/, '') || null; } catch { return null; }
    }
  }
  return null;
}

(async () => {
  // Starts PostgreSQL + GoTrue + PostgREST + the default gateway when they are not running; loopback only.
  run(['scripts/native-runtime.cjs']);
  if (process.argv.includes('--build') || !fs.existsSync(path.join(repo, dist, 'BUILD_ID')))
    run(['scripts/native-command.cjs', 'build'], { V2_BACKEND: 'phone' });
  const children = [
    spawn(process.execPath, ['scripts/preview-v2.cjs'], { cwd: repo, env, stdio: 'inherit', windowsHide: true }),
    spawn(process.execPath, ['scripts/phone-gateway.cjs'], { cwd: repo, env, stdio: 'inherit', windowsHide: true }),
  ];
  const stop = () => { for (const c of children) c.kill(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  for (const c of children) c.on('exit', (code) => { if (code) { console.error('A preview process stopped; closing the others.'); stop(); } });

  const name = tailscaleName();
  console.log(`
DiversiBebe V2 pe telefon: mediu privat, izolat de producție.
${name ? `Deschide pe iPhone (Tailscale pornit): https://${name}/v2` : 'Tailscale nu a fost găsit. Instalează-l pe laptop și pe iPhone, cu același cont (docs/ai-ops/PHONE-PREVIEW.md).'}
Prima dată, într-un alt terminal: tailscale serve --bg ${phonePort}
Cont: creezi unul în /v2/cont, cu orice adresă @example.test și o parolă de test. Nu folosi datele unui cont real.
Oprire: Ctrl+C aici, apoi: tailscale serve reset`);
})();
