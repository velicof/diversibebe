// The private phone preview end to end: iPhone viewport and touch, one address for app + auth + data
// (scripts/phone-gateway.cjs), a real GoTrue account, new browser session after closing the page.
// Runs only against a phone build:  V2_PHONE_URL=https://name.tail1234.ts.net:8443 npx playwright test tests/e2e/phone.spec.cjs
// V2_PHONE_BROWSER=webkit runs it on Playwright's WebKit, Safari's engine on Windows; it is not Safari on an iPhone.
const { test, expect, devices } = require('@playwright/test'), crypto = require('node:crypto');
const { buildStamp } = require('../../scripts/build-stamp.cjs');
const url = process.env.V2_PHONE_URL;
const browserName = process.env.V2_PHONE_BROWSER || 'chromium';
// The planner asks for days and meals: these tests keep their original shape, 5 days of lunch.
async function fiveLunches(page){const pick=page.locator('.v2-meal-choices');for(const m of ['Mic dejun','Prânz','Cină','Gustare']){const b=pick.getByRole('button',{name:m,exact:true});if(((await b.getAttribute('aria-pressed'))==='true')!==(m==='Prânz'))await b.click();}await page.getByRole('button',{name:'5 zile',exact:true}).click();await page.getByRole('button',{name:'Arată planul',exact:true}).click();}
test.skip(!url, 'Needs a phone build behind scripts/phone-gateway.cjs');
const { defaultBrowserType, ...iphone } = devices['iPhone 13'];
const host = url ? new URL(url).hostname : '';
test.use({ ...iphone, browserName, actionTimeout: 30000, baseURL: url, ignoreHTTPSErrors: true, // A *.ts.net address with a port is the local HTTPS simulation; without one it is the real Tailscale name.
  launchOptions: { args: browserName === 'chromium' && host.endsWith('.ts.net') && new URL(url).port ? [`--host-resolver-rules=MAP ${host} 127.0.0.1`] : [] } });
test.setTimeout(240000);
// WebKit logs this for requests to its own address that a full page load cuts off (these tests use page.goto).
// Moving inside the app shows none: that is checked below with no filter.
const cutOffByPageLoad = (message) => browserName === 'webkit' && /due to access control checks.$/.test(message);
const planned = (page) => page.locator('.v2-plan-days .v2-plan-recipe h2').allTextContents();

test('phone: account, library, recommendation, 5-day plan, shopping list, favorites, return', async ({ page, browser }) => {
  const errors = [], outbound = [];
  page.on('pageerror', (e) => { if (!cutOffByPageLoad(e.message)) errors.push(e.message); });
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
  await fiveLunches(page);
  await expect(page.locator('.v2-proposal-meal')).toHaveCount(5);
  const chosen = await page.locator('.v2-proposal-meal h3').allTextContents();
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

test('phone: a visitor sees the way in, is invited, and reaches an account only after a yes', async ({ page, browser }) => {
  const errors = [], backend = [], outbound = [];
  page.on('pageerror', (e) => { if (!cutOffByPageLoad(e.message)) errors.push(e.message); });
  page.on('request', (r) => {
    if (/\/(auth|rest)\/v1\//.test(r.url())) backend.push(r.url());
    if (!r.url().startsWith(url) && !/^(data|blob):/.test(r.url())) outbound.push(r.url());
  });
  const connect = (p) => p.locator('.v2-topbar').getByRole('link', { name: 'Conectează-te', exact: true });
  const fresh = (extra = {}) => browser.newContext({ ...iphone, baseURL: url, ignoreHTTPSErrors: true, ...extra });
  const account = { email: `invite-${crypto.randomUUID()}@example.test`, password: crypto.randomBytes(18).toString('base64url') };

  // 1. The first screen: this build, and the way in, without being stopped by it.
  await page.goto('/v2');
  await expect(page.locator('.v2-build-stamp'), 'the address serves the code of this checkout').toHaveText(`build ${buildStamp()}`);
  await expect(connect(page)).toBeVisible();
  expect((await connect(page).boundingBox()).y).toBeLessThan(100);

  // 2. Free use, with no server, up to the invitation.
  await page.goto('/v2/plan');
  await fiveLunches(page);
  await expect(page.locator('.v2-proposal-meal')).toHaveCount(5);
  const chosen = await page.locator('.v2-proposal-meal h3').allTextContents();
  await page.getByRole('button', { name: 'Salvează planul', exact: true }).click();
  const card = page.locator('.v2-save-invite');
  await expect(card.getByRole('heading', { name: 'Salvează-ți progresul într-un cont gratuit' })).toBeVisible();
  await expect(card).toContainText('ștergi datele browserului');
  await expect(card.getByRole('button', { name: 'Continuă fără cont', exact: true })).toBeVisible();
  expect(backend, 'a visitor calls no server').toEqual([]);

  // 3. Signup from the invitation.
  await card.getByRole('link', { name: 'Creează cont gratuit', exact: true }).click();
  await page.getByLabel('Email de test', { exact: true }).fill(account.email);
  await page.getByLabel('Parola contului de test', { exact: true }).fill(account.password);
  await page.getByLabel('În ce etapă este copilul?').selectOption('8');
  await page.getByRole('button', { name: 'Creează și salvează în cont', exact: true }).click();
  await expect(page).toHaveURL(/\/v2\/azi/, { timeout: 60000 });

  // 4. Nothing moves before the answer; after it, the plan is in the account.
  await page.goto('/v2/plan');
  const offer = page.getByRole('region', { name: 'Alegerile de pe acest dispozitiv' });
  await expect(offer).toContainText('5 mese planificate', { timeout: 60000 });
  expect(await planned(page)).toEqual([]);
  await page.getByRole('button', { name: 'Adaugă în cont', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Am adăugat în cont 5 mese' })).toBeVisible({ timeout: 60000 });
  await expect.poll(() => planned(page), { timeout: 60000 }).toEqual(chosen);

  // 5. Logout: a visitor again, with the way back in sight.
  await page.goto('/v2/cont');
  await page.getByRole('button', { name: 'Deconectare', exact: true }).click();
  await expect(page.getByLabel('Email de test', { exact: true })).toBeVisible({ timeout: 60000 });
  await page.goto('/v2');
  await expect(connect(page)).toBeVisible();

  // 6. Login on another device: the plan came from the server, and a new browser session stays connected.
  const device = await fresh();
  try {
    const second = await device.newPage();
    await second.goto('/v2/cont');
    await second.getByLabel('Email de test', { exact: true }).fill(account.email);
    await second.getByLabel('Parola contului de test', { exact: true }).fill(account.password);
    await second.getByRole('button', { name: 'Conectare în test', exact: true }).click();
    await expect(second).toHaveURL(/\/v2\/azi/, { timeout: 60000 });
    await second.goto('/v2/plan');
    await expect.poll(() => planned(second), { timeout: 60000 }).toEqual(chosen);
    const state = await device.storageState();
    await second.close();
    const again = await fresh({ storageState: state });
    try {
      const resumed = await again.newPage();
      await resumed.goto('/v2/plan');
      await expect.poll(() => planned(resumed), { timeout: 60000 }).toEqual(chosen);
      await expect(connect(resumed)).toHaveCount(0);
    } finally { await again.close(); }
  } finally { await device.close(); }

  // 7. Another person: nothing of the first account.
  const other = await fresh();
  try {
    const third = await other.newPage();
    await third.goto('/v2/cont?nou=1');
    await third.getByLabel('Email de test', { exact: true }).fill(`invite-other-${crypto.randomUUID()}@example.test`);
    await third.getByLabel('Parola contului de test', { exact: true }).fill(crypto.randomBytes(18).toString('base64url'));
    await third.getByLabel('În ce etapă este copilul?').selectOption('8');
    await third.getByRole('button', { name: 'Creează și salvează în cont', exact: true }).click();
    await expect(third).toHaveURL(/\/v2\/azi/, { timeout: 60000 });
    await third.goto('/v2/plan');
    await expect(third.locator('.v2-sync-status')).toContainText('Date sincronizate', { timeout: 60000 });
    expect(await planned(third)).toEqual([]);
  } finally { await other.close(); }

  expect(errors, 'no script errors').toEqual([]);
  expect(outbound, 'nothing leaves the private address').toEqual([]);
});

test('phone: tapping through the app raises no script error and no failed request', async ({ page }) => {
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.goto('/v2/azi');
  await page.waitForLoadState('networkidle');
  const nav = page.locator('.v2-bottom-nav');
  for (const [name, route] of [['Descoperă', '/v2/idei'], ['Planul meu', '/v2/plan'], ['Profil', '/v2/profil'], ['Azi', '/v2/azi'], ['Descoperă', '/v2/idei']]) {
    await nav.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(route));
    await page.waitForLoadState('networkidle');
  }
  await page.locator('.v2-recipe-card a').first().click();
  await expect(page).toHaveURL(new RegExp('/v2/retete/'));
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});
