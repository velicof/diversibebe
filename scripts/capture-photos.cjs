// Before/after screenshots of recipe cards and recipe pages for photo candidates (guest session, loopback only).
//   node scripts/capture-photos.cjs <outDir> <label> [baseUrl] [recipeId ...]
// Also measures how each photo loads: natural vs rendered size, aspect ratio, bytes transferred.
const { chromium } = require('@playwright/test'), path = require('node:path'), fs = require('node:fs');
const { findAnyRecipe } = require('../tests/load-ts.cjs').load('src/features/v2/catalog.ts');
const [outArg, label = 'after', baseArg, ...ids] = process.argv.slice(2);
const out = path.resolve(outArg || 'photo-captures'), base = baseArg || 'http://127.0.0.1:3100';
const recipes = ids.length ? ids : ['piure-broccoli-cartof-6', 'iaurt-unt-migdale', 'clatite-ovaz-mar-8'];
fs.mkdirSync(out, { recursive: true });
const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 1000 } };

(async () => {
  const browser = await chromium.launch();
  const metrics = [];
  for (const [vp, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, locale: 'ro-RO', deviceScaleFactor: vp === 'mobile' ? 2 : 1 });
    await context.route('**/*', (route) => (new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()));
    const page = await context.newPage();
    const bytes = new Map();
    page.on('response', async (r) => { if (/\/v2\/recipes\/.*\.webp$/.test(r.url())) bytes.set(r.url(), (await r.body().catch(() => Buffer.alloc(0))).length); });
    for (const id of recipes) {
      const name = findAnyRecipe(id).name;
      await page.goto(`${base}/v2/idei`, { waitUntil: 'networkidle' });
      await page.locator('#v2-stage').selectOption('12');
      await page.getByRole('button', { name: 'Oricât', exact: true }).click();
      await page.locator('#v2-search').fill(name);
      const card = page.locator('.v2-recipe-card').filter({ has: page.locator(`a[href="/v2/retete/${id}"]`) }).first();
      await card.waitFor();
      await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
      await card.screenshot({ path: path.join(out, `${id}-card-${vp}-${label}.png`) });
      await page.goto(`${base}/v2/retete/${id}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(out, `${id}-pagina-${vp}-${label}.png`) });
      const img = await page.evaluate(() => {
        const el = document.querySelector('.v2-detail-hero .v2-photo img');
        if (!el || !el.currentSrc) return null;
        const r = el.getBoundingClientRect();
        return { src: el.currentSrc.replace(location.origin, ''), natural: [el.naturalWidth, el.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)], loading: el.loading, fetchPriority: el.fetchPriority };
      });
      metrics.push({ id, viewport: vp, label, photo: img && { ...img, renderedRatio: +(img.rendered[0] / img.rendered[1]).toFixed(3), naturalRatio: +(img.natural[0] / img.natural[1]).toFixed(3), kb: Math.round((bytes.get(base + img.src) ?? 0) / 1024) } });
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, `metrics-${label}.json`), JSON.stringify(metrics, null, 2));
  console.log(`${metrics.length * 2} captures (${label}) in ${out}`);
  for (const m of metrics) if (m.photo) console.log(`${m.id} ${m.viewport}: ${m.photo.src} natural ${m.photo.natural.join('×')} rendered ${m.photo.rendered.join('×')} (ratio ${m.photo.renderedRatio}) ${m.photo.kb} KB ${m.photo.loading}/${m.photo.fetchPriority}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
