// Asks the address itself which build it serves and compares it with the code here: a test on this laptop
// says nothing about what the phone receives.
//   node scripts/phone-build-check.cjs https://name.tail1234.ts.net
const fs = require('node:fs'), path = require('node:path');
const { buildStamp } = require('./build-stamp.cjs');
const url = process.argv[2];
if (!url) throw new Error('Usage: node scripts/phone-build-check.cjs <address>');
const dist = path.resolve(__dirname, '..', process.env.V2_DIST_DIR || '.next-phone');

(async () => {
  const reply = await fetch(new URL('/v2', url), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const html = await reply.text();
  const served = /data-v2-build="([^"]+)"/.exec(html)?.[1] ?? null;
  const servedId = /\\"b\\":\\"([^\\"]+)\\"/.exec(html)?.[1] ?? null;
  const expected = buildStamp();
  const onDisk = fs.existsSync(path.join(dist, 'BUILD_ID')) ? fs.readFileSync(path.join(dist, 'BUILD_ID'), 'utf8').trim() : null;
  console.log(JSON.stringify({ url, status: reply.status, cacheControl: reply.headers.get('cache-control'), servedCommit: served, codeHere: expected, servedBuildId: servedId, buildIdOnDisk: onDisk }, null, 1));
  const ok = reply.status === 200 && served === expected && !expected.endsWith('+local') && servedId === onDisk;
  console.log(ok ? `OK: the address serves commit ${served}.` : 'NU: the address does not serve the current commit. Rebuild: node scripts/phone-preview.cjs --build');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
