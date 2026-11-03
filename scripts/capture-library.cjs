// Screenshots of the full V2 library (guest session, no account, requests outside 127.0.0.1 blocked).
//   node scripts/capture-library.cjs <outDir> [baseUrl]
const { chromium } = require('@playwright/test'), path = require('node:path'), fs = require('node:fs');
const out = path.resolve(process.argv[2] || 'library-captures'), base = process.argv[3] || 'http://127.0.0.1:3100';
fs.mkdirSync(out, { recursive: true });
const viewports = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 1000 } };

async function journey(page, shot) {
  // A stage is needed for suggestions; the onboarding sets it like a real parent would.
  await page.goto(`${base}/v2/onboarding`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Nu am suficient timp/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^Aproximativ 6–8/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^Sub 15 minute/ }).click();
  await page.getByRole('button', { name: 'Vezi rezultatul meu', exact: true }).click();
  await page.waitForLoadState('networkidle');
  await page.goto(`${base}/v2/idei`, { waitUntil: 'networkidle' });
  await page.locator('#v2-stage').selectOption('12');
  await page.getByRole('button', { name: 'Oricât', exact: true }).click();
  await page.waitForTimeout(300); await shot('01-biblioteca-toate', false);
  await page.getByRole('group', { name: 'Momentul mesei' }).getByRole('button', { name: /^Cină/ }).click();
  await page.waitForTimeout(300); await shot('02-categorie-cina', false);
  await page.getByRole('button', { name: 'Fără Lapte', exact: true }).click();
  await page.getByRole('button', { name: 'Fără Ou', exact: true }).click();
  await page.waitForTimeout(300); await shot('03-fara-lapte-si-ou', true);
  await page.goto(`${base}/v2/idei`, { waitUntil: 'networkidle' });
  await page.locator('#v2-search').fill('dovleac');
  await page.waitForTimeout(300); await shot('04-cautare-dovleac', false);
  await page.goto(`${base}/v2/retete/paste-pesto-pui`, { waitUntil: 'networkidle' }); await shot('05-detaliu-corectat', true);
  await page.goto(`${base}/v2/retete/piure-broccoli-cartof-6`, { waitUntil: 'networkidle' }); await shot('06-detaliu-6-luni', true);
  await page.goto(`${base}/v2/plan`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Arată 5 zile de mese', exact: true }).click().catch(() => {});
  await page.waitForTimeout(400); await shot('07-plan-5-zile', true);
  await page.goto(`${base}/v2/revizie`, { waitUntil: 'networkidle' }); await shot('08-revizie-toate', false);
  await page.getByLabel('Risc').selectOption('blocking');
  await page.locator('.v2-review-item summary').first().click();
  await page.waitForTimeout(200); await shot('09-revizie-exceptii', true);
  await page.goto(`${base}/v2/retete/pate-ficat-pui-pere`, { waitUntil: 'networkidle' }); await shot('10-reteta-in-revizie-404', false);
}

(async () => {
  const browser = await chromium.launch();
  const report = [];
  for (const [label, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, locale: 'ro-RO', deviceScaleFactor: label === 'mobile' ? 2 : 1 });
    await context.route('**/*', (route) => (new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const shot = async (name, full) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      await page.screenshot({ path: path.join(out, `${name}-${label}.png`), fullPage: full });
      report.push({ name, viewport: label, horizontalOverflow: overflow });
    };
    await journey(page, shot);
    report.push({ viewport: label, pageErrors: errors });
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify(report, null, 2));
  console.log(`${report.filter((r) => r.name).length} captures, overflow: ${report.filter((r) => r.horizontalOverflow).map((r) => r.name + '-' + r.viewport).join(', ') || 'none'}, page errors: ${report.filter((r) => r.pageErrors?.length).map((r) => r.pageErrors.join(' | ')).join(' ; ') || 'none'}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
