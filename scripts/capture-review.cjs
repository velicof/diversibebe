// Anonymized screenshot pack for independent design review (Gemini 4 Argon) and before/after comparison.
// Guest session only: no account, no e-mail, no child name; every request outside 127.0.0.1 is blocked.
//   node scripts/capture-review.cjs <outDir> [baseUrl]
const { chromium } = require('@playwright/test'), path = require('node:path'), fs = require('node:fs');
const out = path.resolve(process.argv[2] || 'review-captures'), base = process.argv[3] || 'http://127.0.0.1:3100';
fs.mkdirSync(out, { recursive: true });
const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 1000 } };

async function journey(page, shot) {
  await page.goto(`${base}/v2`, { waitUntil: 'networkidle' }); await shot('01-homepage');
  await page.goto(`${base}/v2/onboarding`, { waitUntil: 'networkidle' }); await shot('02-onboarding-intrebare');
  await page.getByRole('button', { name: /^Nu am suficient timp/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^Aproximativ 6–8/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^Sub 15 minute/ }).click();
  await page.getByRole('button', { name: 'Vezi rezultatul meu', exact: true }).click();
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); await shot('03-rezultat-personalizat');
  await page.goto(`${base}/v2/azi`, { waitUntil: 'networkidle' }); await shot('04-ce-gatim-azi');
  await page.goto(`${base}/v2/idei`, { waitUntil: 'networkidle' }); await shot('05-retete');
  const firstRecipe = page.locator('a[href^="/v2/retete/"]').first();
  if (await firstRecipe.count()) { await firstRecipe.click(); await page.waitForLoadState('networkidle'); await shot('06-detaliu-reteta'); }
  await page.goto(`${base}/v2/plan`, { waitUntil: 'networkidle' }); await shot('07-planificator');
  await page.getByRole('button', { name: 'Prânz', exact: true }).click().catch(() => {});
  await page.getByRole('button', { name: 'Arată 5 zile de mese', exact: true }).click().catch(() => {});
  await page.waitForTimeout(400); await shot('08-propunere-5-zile');
  await page.getByRole('button', { name: 'Salvează planul', exact: true }).click().catch(() => {});
  await page.waitForTimeout(300); await shot('09-plan-salvat');
  await page.getByRole('button', { name: /De cumpărat/ }).click().catch(() => {});
  await page.waitForTimeout(300); await shot('10-lista-cumparaturi');
  await page.goto(`${base}/v2/premium`, { waitUntil: 'networkidle' }); await shot('11-premium');
  await page.goto(`${base}/v2/cont`, { waitUntil: 'networkidle' }); await shot('12-cont');
  await page.goto(`${base}/v2/retete/nu-exista`, { waitUntil: 'networkidle' }); await shot('13-reteta-indisponibila');
}

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [label, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, locale: 'ro-RO', deviceScaleFactor: label === 'mobile' ? 2 : 1 });
    await context.route('**/*', (r) => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const shot = async (name) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      await page.screenshot({ path: path.join(out, `${name}-${label}.png`), fullPage: true });
      report.push({ name, label, url: page.url().replace(base, ''), horizontalOverflow: overflow });
    };
    await journey(page, shot);
    // Offline / backend unavailable: the guest flow must keep working from device storage.
    await context.setOffline(true);
    await page.goto(`${base}/v2/plan`).catch(() => {});
    await page.waitForTimeout(500);
    await context.setOffline(false);
    report.push({ name: 'page-errors', label, errors });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify(report, null, 2));
  console.log(report.map((r) => r.errors ? `${r.label} page errors: ${r.errors.length}` : `${r.name}-${r.label} ${r.url}${r.horizontalOverflow ? ' OVERFLOW' : ''}`).join('\n'));
})();
