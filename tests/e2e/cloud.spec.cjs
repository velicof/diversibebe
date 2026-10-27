const { test, expect } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs'), path = require('node:path');
const apiUrl=process.env.V2_TEST_API_URL||'http://127.0.0.1:54329';
require('../load-ts.cjs').load('src/features/v2/cloud/guard.ts').assertIsolatedSupabaseUrl(apiUrl);
const publicKey=process.env.V2_TEST_ANON_KEY||'local-test-public-key';
const accounts = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../finalization/local-test-access.json'), 'utf8')).accounts;
const childA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sibling = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';
const captures = path.resolve(__dirname, '../../../../outputs/mvp-final/capturi');
async function restrict(context) {
  await context.route('**/*', r => ['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
}
async function synced(page) {
  await expect(page.locator('.v2-sync-status')).toContainText('Date sincronizate');
  await expect(page.locator('.v2-sync-status')).toHaveAttribute('aria-busy','false');
}
async function login(page, account) {
  await page.goto('/v2/cont');
  await page.getByLabel('Email de test', { exact:true }).fill(account.email);
  await page.getByLabel('Parola contului de test', { exact:true }).fill(account.password);
  await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
  await expect(page).toHaveURL(/\/v2\/azi/);
  await synced(page);
}
async function select(page,id) {
  await page.goto('/v2/cont'); await page.getByLabel('Profilul activ').selectOption(id); await synced(page);
}
test.beforeEach(async ({context})=>restrict(context));
test('authenticated flows: persistence, second device, siblings, logout and account isolation', async ({page,browser})=>{
  const sdk = createClient(apiUrl,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  await sdk.auth.signInWithPassword(accounts[0]);
  const call = async (id,action,payload) => { const r=await sdk.rpc('v2_apply_action',{p_baby_id:id,p_action:action,p_payload:payload}); if(r.error) throw r.error; return r.data; };
  for(const id of [childA,sibling]){
    const loaded=await call(id,'select-child',{});
    for(const p of loaded.plan) await call(id,'remove-plan',{slot:p.slot});
    for(const u of loaded.uses) await call(id,'remove-use',{id:u.id});
    await call(id,'profile',{stage:8,introduced:[]});
  }
  await call(childA,'favorite',{recipeId:'piure-dovlecel',enabled:false});
  await call(childA,'select-child',{});
  await login(page,accounts[0]);
  await page.goto('/v2/profil');
  await page.getByRole('button',{name:'Morcov',exact:true}).click(); await synced(page);
  await expect(page.getByRole('button',{name:'Morcov',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.goto('/v2/retete/piure-dovlecel');
  await page.getByRole('button',{name:'Salvează Piure de dovlecel',exact:true}).click(); await synced(page);
  await page.getByRole('button',{name:'Adaugă în plan',exact:true}).click(); await synced(page);
  await page.getByRole('button',{name:'Am folosit ideea',exact:true}).click(); await synced(page);
  await page.route('**/rest/v1/rpc/v2_load_state', async r=>{await new Promise(resolve=>setTimeout(resolve,1500)); await r.continue();});
  await page.reload();
  await expect(page.getByRole('status',{name:'Se încarcă',exact:true})).toBeVisible();
  await page.screenshot({path:path.join(captures,'incarcare-390.png'),fullPage:true});
  await synced(page); await page.unroute('**/rest/v1/rpc/v2_load_state');
  await expect(page.getByRole('button',{name:'Confirmată azi',exact:true})).toBeDisabled();
  const device=await browser.newContext({baseURL:'http://127.0.0.1:3100',viewport:{width:1440,height:1000}});
  await restrict(device); const second=await device.newPage();
  try {
    await login(second,accounts[0]); await second.goto('/v2/plan'); await synced(second);
    await expect(second.getByRole('heading',{name:'Piure de dovlecel',exact:true})).toBeVisible();
    await second.screenshot({path:path.join(captures,'plan-autentificat-1440.png'),fullPage:true});
    await select(page,sibling); await page.goto('/v2/jurnal');
    await expect(page.getByRole('heading',{name:'Bunele idei se întorc la masă'})).toBeVisible();
    await page.goto('/v2/profil'); await expect(page.getByRole('button',{name:'Morcov',exact:true})).toHaveAttribute('aria-pressed','false');
    await select(page,childA); await page.goto('/v2/jurnal');
    await expect(page.getByRole('heading',{name:'Piure de dovlecel',exact:true})).toBeVisible();
    await page.screenshot({path:path.join(captures,'jurnal-autentificat-390.png'),fullPage:true});
    await page.goto('/v2/cont');
    await page.route('**/auth/v1/logout*',async r=>{await new Promise(resolve=>setTimeout(resolve,900));await r.continue();});
    await page.getByRole('button',{name:'Deconectare',exact:true}).click();
    await expect(page.getByRole('status',{name:'Se încarcă',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Conectare în test',exact:true})).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'Conectează contul de test'})).toBeVisible();
    await page.unroute('**/auth/v1/logout*');
    await login(page,accounts[0]); await page.goto('/v2/retete/piure-dovlecel'); await synced(page);
    await expect(page.getByRole('button',{name:'Confirmată azi',exact:true})).toBeDisabled();
    await page.goto('/v2/cont'); await page.getByRole('button',{name:'Deconectare',exact:true}).click();
    await login(page,accounts[1]); await page.goto('/v2/jurnal'); await synced(page);
    await expect(page.getByRole('heading',{name:'Bunele idei se întorc la masă'})).toBeVisible();
    await page.goto('/v2/retete/piure-dovlecel');
    await expect(page.getByRole('button',{name:'Salvează Piure de dovlecel',exact:true})).toHaveAttribute('aria-pressed','false');
  } finally { await device.close(); await sdk.auth.signOut({scope:'local'}); }
});
test('offline logout clears the local session and never restores the private view on reload',async({page})=>{
  await login(page,accounts[0]);await page.goto('/v2/cont');
  await page.route('**/auth/v1/logout*',r=>r.abort('failed'));
  await page.getByRole('button',{name:'Deconectare',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Conectează contul de test'})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('diversibebe:v2:test-auth'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Conectează contul de test'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Contul tău de test'})).toHaveCount(0);
});
test('network write failure is visible, retry persists and invalid login is rejected',async({page})=>{
  await page.goto('/v2/cont'); await page.getByLabel('Email de test',{exact:true}).fill(accounts[0].email);
  await page.getByLabel('Parola contului de test',{exact:true}).fill('invalid-password');
  await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
  await expect(page.locator('form [role="alert"]')).toBeVisible();
  await login(page,accounts[0]); await select(page,childA);
  await page.goto('/v2/retete/piure-morcov');
  const save=page.getByRole('button',{name:/^(Salvează Piure morcov & cartof dulce|Elimină Piure morcov & cartof dulce din salvate)$/});
  const before=await save.getAttribute('aria-pressed');
  await page.route('**/rest/v1/rpc/v2_apply_action',r=>r.abort('failed'));
  await save.click();
  await expect(page.locator('.v2-sync-status [role="alert"]')).toContainText('Salvarea nu a reușit');
  await expect(save).toHaveAttribute('aria-pressed',before);
  await page.screenshot({path:path.join(captures,'eroare-retea-390.png'),fullPage:true});
  await page.unroute('**/rest/v1/rpc/v2_apply_action');
  await page.getByRole('button',{name:'Reîncearcă',exact:true}).click(); await synced(page);
  await expect(save).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
  await page.reload(); await synced(page);
  await expect(save).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
  const stored=await page.evaluate(()=>Object.values(localStorage).join(' '));
  expect(stored).not.toContain(accounts[0].password);
});
test('explicit local import is additive and never imports local meal confirmations',async({page})=>{
  await page.goto('/v2');
  await page.evaluate(()=>localStorage.setItem('diversibebe:v2:isolated-preview:1',JSON.stringify({version:1,stage:12,favorites:['piure-dovlecel'],plan:[{slot:'2026-10-30',recipeId:'piure-morcov'}],uses:[{id:'local-only',recipeId:'piure-morcov',day:'2026-10-27',confirmedAt:'2026-10-27T12:00:00Z'}]})));
  await page.reload(); await login(page,accounts[0]); await select(page,childA);
  await page.getByRole('button',{name:'Importă favoritele și planul',exact:true}).click();
  await expect(page.getByRole('button',{name:'Idei importate'})).toBeDisabled();
  await page.goto('/v2/jurnal');
  await expect(page.getByRole('heading',{name:'Piure de morcov',exact:true})).toHaveCount(0);
  await page.goto('/v2/cont'); await page.getByRole('button',{name:'Deconectare',exact:true}).click();
  const demo=await page.evaluate(()=>JSON.parse(localStorage.getItem('diversibebe:v2:isolated-preview:1')));
  expect(demo.uses[0].id).toBe('local-only');
});
