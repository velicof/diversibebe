// The private phone preview end to end: iPhone viewport and touch, one address for app + auth + data
// (scripts/phone-gateway.cjs), a real GoTrue account, new browser session after closing the page.
// Runs only against a phone build:  V2_PHONE_URL=https://name.tail1234.ts.net:8443 npx playwright test tests/e2e/phone.spec.cjs
// WebKit is not installed here: this is Chromium with the iPhone profile, not Safari.
const { test, expect, devices } = require('@playwright/test'), crypto = require('node:crypto');
const url = process.env.V2_PHONE_URL;
test.skip(!url, 'Needs a phone build behind scripts/phone-gateway.cjs');
const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
const host = url ? new URL(url).hostname : '';
test.use({ ...iphone, actionTimeout: 30000, baseURL: url, ignoreHTTPSErrors: true, launchOptions: { args: host.endsWith('.ts.net') ? [`--host-resolver-rules=MAP ${host} 127.0.0.1`] : [] } });
test.setTimeout(240000);
const planned = (page) => page.locator('.v2-plan-days .v2-plan-recipe h2').allTextContents();

test('phone: account, library, recommendation, 5-day plan, shopping list, favorites, return', async ({ page, browser }) => {
  const errors = [], outbound = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(url) && !/^(data|blob):/.test(r.url())) outbound.push(r.url()); });
  const email = `phone-${crypto.randomUUID()}@example.test`, password = crypto.randomBytes(18).toString('base64url');

  // 1. Onboarding: three answers lead to meal ideas, without an account.
  const started = Date.now();
  await page.goto('/v2');
  await page.getByRole('link', { name: 'Hai să găsim o idee de masă' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Care e cea mai mare provocare');
  await page.getByRole('button', { name: /^Nu am suficient timp/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^9–12 luni/ }).click();
  await page.getByRole('button', { name: 'Continuă', exact: true }).click();
  await page.getByRole('button', { name: /^Sub 15 minute/ }).click();
  await page.getByRole('button', { name: 'Vezi rezultatul meu', exact: true }).click();
  await expect(page.locator('[data-result-recipe]').first()).toBeVisible({ timeout: 30000 });
  console.log(`first recommendation after ${Date.now() - started} ms`);

  // 2. Account: created on the phone, through the same address.
  await page.goto('/v2/cont');
  await page.getByRole('button', { name: 'Creează un cont de test', exact: true }).click();
  await page.getByLabel('Email de test', { exact: true }).fill(email);
  await page.getByLabel('Parola contului de test', { exact: true }).fill(password);
  await page.getByLabel('În ce etapă este copilul?').selectOption('8');
  await page.locator('form button[type="submit"], form button:not([type])').last().click();
  await expect(page).toHaveURL(/\/v2\/azi/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Planifică următoarele 5 zile' })).toBeVisible();
  const stored = await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].join(' '));
  expect(stored).not.toContain(password);

  // 3. Library: the first recipe is reachable, and a recipe can be saved.
  await page.goto('/v2/idei');
  const firstCard = page.locator('.v2-recipe-card').first();
  await expect(firstCard).toBeVisible({ timeout: 30000 });
  const top = await firstCard.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  console.log(`first recipe card starts ${Math.round(top)} px down the page`);
  expect(top, 'recipes start near the top, filters are on demand').toBeLessThan(1000);
  const name = (await firstCard.locator('h3').first().textContent()).trim();
  await firstCard.locator('a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await page.getByRole('button', { name: `Salvează ${name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Elimină ${name} din salvate`, exact: true })).toBeVisible({ timeout: 20000 });

  // 4. Plan for five days, then the shopping list.
  await page.goto('/v2/plan');
  await page.getByRole('button', { name: 'Arată 5 zile de mese', exact: true }).click();
  await expect(page.locator('.v2-proposal-day')).toHaveCount(5);
  const chosen = await page.locator('.v2-proposal-day h3').allTextContents();
  await page.getByRole('button', { name: 'Salvează planul', exact: true }).click();
  await expect.poll(() => planned(page), { timeout: 30000 }).toEqual(chosen);
  await page.getByRole('button', { name: /De cumpărat/ }).click();
  const items = page.locator('.v2-shopping-list > li');
  await expect(items.first()).toBeVisible();
  const total = await items.count();
  expect(total).toBeGreaterThan(3);
  // Two quick ticks on a slow connection: both show at once and both reach the server.
  await page.route('**/rest/v1/rpc/v2_apply_action', async (r) => { await new Promise((resolve) => setTimeout(resolve, 1200)); await r.continue(); });
  await items.first().locator('input').check();
  await items.nth(1).locator('input').check();
  await expect(items.first().locator('input')).toBeChecked();
  await expect(items.nth(1).locator('input')).toBeChecked();
  await expect(page.locator('.v2-sync-status [role="alert"]')).toHaveCount(0);
  await page.waitForTimeout(4000);
  await page.unroute('**/rest/v1/rpc/v2_apply_action');

  // 5. Close the browser session, open a new one: everything is on the server.
  const again = await browser.newContext({ ...iphone, baseURL: url, ignoreHTTPSErrors: true });
  const back = await again.newPage();
  try {
    await back.goto('/v2/cont');
    await back.getByLabel('Email de test', { exact: true }).fill(email);
    await back.getByLabel('Parola contului de test', { exact: true }).fill(password);
    await back.getByRole('button', { name: 'Conectare în test', exact: true }).click();
    await expect(back).toHaveURL(/\/v2\/azi/, { timeout: 30000 });
    await expect(back.getByRole('heading', { name: /mese planificate/ })).toBeVisible({ timeout: 30000 });
    await back.goto('/v2/plan');
    await expect.poll(() => planned(back), { timeout: 30000 }).toEqual(chosen);
    await back.getByRole('button', { name: /De cumpărat/ }).click();
    await expect(back.locator('.v2-shopping-list > li').first().locator('input')).toBeChecked();
    await expect(back.locator('.v2-shopping-list > li').nth(1).locator('input')).toBeChecked();
    await back.goto('/v2/idei?salvate=1');
    await expect(back.locator('.v2-recipe-card h3').filter({ hasText: name }).first()).toBeVisible({ timeout: 30000 });
  } finally { await again.close(); }

  // 6. Photo review gallery, then logout.
  await page.goto('/v2/revizie/fotografii');
  const photo = page.locator('img[src*="revizie/foto"], img[src*="revizie%2Ffoto"]').first();
  await expect(photo).toBeVisible({ timeout: 30000 });
  expect(await photo.evaluate((img) => img.complete && img.naturalWidth > 0 || new Promise((r) => { img.onload = () => r(img.naturalWidth > 0); img.onerror = () => r(false); }))).toBeTruthy();
  await page.goto('/v2/cont');
  await page.getByRole('button', { name: 'Deconectare', exact: true }).click();
  await expect(page.getByLabel('Email de test', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.reload();
  await expect(page.getByLabel('Email de test', { exact: true })).toBeVisible({ timeout: 30000 });

  // Nothing leaves the private address; no page errors or horizontal scroll.
  expect(outbound).toEqual([]);
  expect(errors).toEqual([]);
  for (const route of ['/v2', '/v2/azi', '/v2/idei', '/v2/plan', '/v2/cont']) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});
