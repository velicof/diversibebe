// Drives the real V1 pages in a browser against the local GoTrue + PostgREST + PostgreSQL stack, whose
// schema already has the V2 migrations: the state production will be in after the release. Synthetic
// @example.test accounts only. Never point this at production.
//   node scripts/v1-browser-check.cjs <v1BaseUrl> <gatewayUrl> [outFile]
const { chromium } = require('@playwright/test'), fs = require('node:fs'), path = require('node:path');
const [base, gateway, outFile] = process.argv.slice(2);
for (const value of [base, gateway]) if (!value || new URL(value).hostname !== '127.0.0.1') throw new Error('Loopback URLs only');
const { anonKey } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../real-supabase-runtime/private/runtime.json'), 'utf8'));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) }); console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${detail ? ` (${String(detail).slice(0, 160)})` : ''}`); };
const stamp = Date.now(), password = `Local-${stamp}-pass`;
const api = async (token, url, init = {}) => fetch(`${gateway}/rest/v1/${url}`, { ...init, headers: { apikey: anonKey, Authorization: `Bearer ${token || anonKey}`, 'Content-Type': 'application/json', ...init.headers } });
async function account(label, kids) {
  const email = `v1-${label}-${stamp}@example.test`;
  const r = await fetch(`${gateway}/auth/v1/signup`, { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const b = await r.json();
  if (!b.access_token) throw new Error(`signup ${r.status}`);
  const ids = [];
  for (const name of kids) {
    const res = await api(b.access_token, 'babies', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: b.user.id, name, birthdate: '2026-02-01', gender: 'girl' }) });
    ids.push((await res.json())[0].id);
    await new Promise((resolve) => setTimeout(resolve, 20)); // distinct created_at: V1 reads the first child
  }
  return { email, id: b.user.id, token: b.access_token, kids: ids };
}
// Local tokens live 120 s and this run takes longer: verify with a fresh one.
async function freshToken(a) {
  const r = await fetch(`${gateway}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a.email, password }) });
  return (await r.json()).access_token;
}
async function login(page, a) {
  await page.goto(`${base}/login`);
  await page.getByPlaceholder('Email').fill(a.email);
  await page.getByPlaceholder('Parolă', { exact: true }).fill(password);
  await page.locator('button[type="submit"]').click();
}
const cookedRead = (page) => page.waitForResponse((r) => r.url().includes('/rest/v1/cooked_recipes') && r.request().method() === 'GET', { timeout: 30000 });
async function step(name, fn) { try { await fn(); } catch (e) { check(`${name}: threw`, false, e.message.split('\n')[0]); } }
const wait = (page, test) => page.waitForURL(test, { timeout: 15000 }).then(() => true, () => false);

(async () => {
  const A = await account('a', ['Copil Unu', 'Copil Doi']), B = await account('b', ['Copil Beta']);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));
  // Every rejected database call, on every page: a column or table V1 asks for and the schema lacks.
  const rejected = new Map();
  context.on('response', async (r) => {
    if (!r.url().includes('/rest/v1/') || r.status() < 400 || r.status() === 401) return;
    const key = `${r.status()} ${r.request().method()} ${r.url().split('/rest/v1/')[1].split('?')[0]}`;
    if (!rejected.has(key)) rejected.set(key, (await r.text().catch(() => '')).slice(0, 160));
  });

  await step('public home', async () => {
    await page.goto(`${base}/`);
    await page.getByText('Creează cont gratuit').first().waitFor({ timeout: 15000 });
    const text = await page.locator('body').innerText();
    check('home: no approval, guideline or testimonial claims', !/nutri[tț]ioni|verificate editorial|ghiduri pediatrice|Andreea|Mamă a /i.test(text));
    check('home: says it does not replace the pediatrician', /nu înlocuiesc sfatul medicului pediatru/i.test(text));
  });
  await step('mail relay', async () => {
    const target = `relay-${stamp}@example.test`;
    const r = await fetch(`${base}/api/send-verification`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: target, token: 'x' }) });
    check('POST /api/send-verification answers 410', r.status === 410, r.status);
    const mail = await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${target}`)}`).then((m) => m.json(), () => ({ messages: [] }));
    check('the relay sent nothing', !(mail.messages || []).length);
  });
  await step('callback redirect', async () => {
    const r = await fetch(`${base}/auth/callback?next=https://evil.example/`, { redirect: 'manual' });
    check('auth callback never redirects to another site', new URL(r.headers.get('location'), base).port === new URL(base).port && /^(127.0.0.1|localhost)$/.test(new URL(r.headers.get('location'), base).hostname), r.headers.get('location'));
  });
  await step('protected pages signed out', async () => {
    await page.goto(`${base}/dashboard`);
    check('signed out: /dashboard goes to /login', await wait(page, /\/login/));
  });
  await step('family with two children', async () => {
    await login(page, A);
    check('two children: login reaches the dashboard, not onboarding', await wait(page, /\/dashboard/), page.url());
    await page.goto(`${base}/`);
    check('two children: / goes to the dashboard, not onboarding', await wait(page, /\/dashboard/), page.url());
    await page.goto(`${base}/onboarding`);
    check('two children: /onboarding goes to the dashboard', await wait(page, /\/dashboard/), page.url());
  });
  await step('profile save', async () => {
    await page.goto(`${base}/profil/bebelus`);
    const name = page.locator('input:not([type="file"])').first();
    await page.waitForFunction(() => document.querySelector('input:not([type="file"])')?.value === 'Copil Unu', null, { timeout: 15000 });
    await name.fill('Copil Unu Editat');
    page.once('dialog', (d) => d.accept());
    // The floating chat pill covers the middle of this button on phones: tap its free left part.
    await page.getByRole('button', { name: 'Salvează modificările' }).click({ position: { x: 40, y: 24 } });
    await page.waitForTimeout(2500);
    const rows = await (await api(A.token, `babies?user_id=eq.${A.id}&select=id,name`)).json();
    const names = Object.fromEntries(rows.map((r) => [r.id, r.name]));
    check('profile save changes the child shown', names[A.kids[0]] === 'Copil Unu Editat', JSON.stringify(names));
    check('profile save leaves the sibling alone', names[A.kids[1]] === 'Copil Doi', JSON.stringify(names));
  });
  await step('cooked, tried, favorite', async () => {
    let read = cookedRead(page);
    await page.goto(`${base}/retete/piure-morcov`);
    const cook = page.getByRole('button', { name: /Am gătit!|Gătit!/ }).first();
    await cook.waitFor({ timeout: 15000 });
    await read;
    await page.waitForTimeout(300);
    await cook.click();
    await page.getByRole('button', { name: /✓ Gătit!/ }).first().waitFor({ timeout: 20000 });
    const cooked = await (await api(A.token, `cooked_recipes?user_id=eq.${A.id}&recipe_id=eq.piure-morcov&select=id`)).json();
    check('"Am gătit" is stored on the V2 schema', cooked.length === 1, cooked.length);
    const tried = await (await api(A.token, `tried_foods?user_id=eq.${A.id}&select=food_id,baby_id`)).json();
    check('"Am gătit" also records the tried foods', tried.some((t) => t.food_id === 'morcov'), JSON.stringify(tried).slice(0, 120));
    read = cookedRead(page);
    await page.reload();
    await read;
    await page.getByRole('button', { name: /✓ Gătit!/ }).first().waitFor({ timeout: 10000 }).then(() => check('the cooked state survives a reload', true), () => check('the cooked state survives a reload', false));
    await page.getByRole('button', { name: 'Reacție' }).click();
    await page.waitForTimeout(2500);
    const fav = await (await api(A.token, `favorite_recipes?user_id=eq.${A.id}&recipe_id=eq.piure-morcov&select=id`)).json();
    check('favorite is stored', fav.length === 1, fav.length);
  });
  await step('every V1 page loads', async () => {
    for (const route of ['/dashboard', '/alimente', '/alimente/morcov', '/retete', '/plan', '/jurnal', '/alergii', '/ghid', '/notificari', '/istoric', '/ajutor', '/profil']) {
      const res = await page.goto(`${base}${route}`);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      check(`${route} loads`, res && res.status() < 400, res && res.status());
    }
  });
  await step('session persistence', async () => {
    const second = await context.newPage();
    await second.goto(`${base}/dashboard`);
    check('the session persists in a new tab', !(await wait(second, /\/login/).then((hit) => hit && second.url().includes('/login'))), second.url());
    await second.close();
  });
  await step('logout', async () => {
    const other = await context.newPage();
    const otherRead = cookedRead(other);
    await other.goto(`${base}/retete/piure-banana`);
    const otherCook = other.getByRole('button', { name: /Am gătit!/ }).first();
    await otherCook.waitFor({ timeout: 15000 });
    await otherRead;
    await page.goto(`${base}/profil`);
    await page.getByText('Deconectare').click();
    check('logout goes to the public home', await page.waitForURL((u) => u.pathname === '/', { timeout: 30000 }).then(() => true, () => false), page.url());
    await page.waitForTimeout(1000);
    const cookies = (await context.cookies()).filter((c) => /^sb-.*auth-token/.test(c.name));
    check('logout removes the session cookies', cookies.length === 0, cookies.map((c) => c.name).join());
    await page.goto(`${base}/dashboard`);
    check('after logout /dashboard goes to /login', await wait(page, /\/login/), page.url());
    // A tab left open from before the logout must not write with the old identity.
    await otherCook.click().catch(() => {});
    await other.waitForTimeout(4000);
    const leaked = await (await api(await freshToken(A), `cooked_recipes?user_id=eq.${A.id}&recipe_id=eq.piure-banana&select=id`)).json();
    check('a tab left open writes nothing after logout', Array.isArray(leaked) && leaked.length === 0, JSON.stringify(leaked).slice(0, 80));
    await other.close();
  });
  await step('next account', async () => {
    await login(page, B);
    check('second account reaches its dashboard', await wait(page, /\/dashboard/), page.url());
    await page.getByText(/Copil Beta/).first().waitFor({ timeout: 20000 }).catch(() => {});
    const body = await page.locator('body').innerText();
    check('second account sees its own child', /Copil Beta/.test(body));
    check('second account sees nothing from the first family', !/Copil Unu|Copil Doi/.test(body));
    const secondRead = cookedRead(page);
    await page.goto(`${base}/retete/piure-morcov`);
    await secondRead;
    await page.waitForTimeout(500);
    check('second account does not inherit the cooked state', await page.getByRole('button', { name: 'Am gătit!' }).first().isVisible());
    await page.goto(`${base}/profil`);
    await page.getByText('Deconectare').click();
    await wait(page, (u) => u.pathname === '/');
  });
  await step('registration', async () => {
    const email = `v1-new-${stamp}@example.test`;
    await page.goto(`${base}/register`);
    await page.getByPlaceholder('Numele tău complet').fill('Părinte Nou');
    await page.getByPlaceholder('Adresa ta de email').fill(email);
    await page.getByPlaceholder('Creează o parolă').fill(password);
    await page.getByPlaceholder('Confirmă parola').fill(password);
    await page.getByRole('button', { name: 'Continuă', exact: true }).click();
    await page.getByPlaceholder('Numele bebelușului').waitFor({ timeout: 15000 });
    await page.getByPlaceholder('Numele bebelușului').fill('Copil Nou');
    await page.locator('input[type="date"]').first().fill('2026-03-01');
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: 'Creează cont', exact: true }).click();
    check('registration reaches the dashboard', await wait(page, /\/dashboard/), page.url());
    await page.getByText(/Copil Nou/).first().waitFor({ timeout: 20000 }).catch(() => {});
    check('registration creates the child', /Copil Nou/.test(await page.locator('body').innerText()));
  });
  for (const [key, body] of rejected) console.log(`rejected: ${key} ${body}`);
  check('the database rejected no V1 call', rejected.size === 0, [...rejected.keys()].join(' ; '));
  check('no uncaught page errors other than the auth lock notice', pageErrors.filter((e) => !/[Ll]ock/.test(e)).length === 0, pageErrors.join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ base, at: new Date().toISOString(), passed: results.length - failed, total: results.length, results }, null, 2));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
