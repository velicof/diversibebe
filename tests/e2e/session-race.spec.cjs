const {test,expect}=require('@playwright/test');
const {createClient}=require('@supabase/supabase-js');
const fs=require('node:fs'),path=require('node:path');
const accounts=JSON.parse(fs.readFileSync(process.env.V2_TEST_ACCESS_FILE || path.resolve(__dirname,'../../../finalization/local-test-access.json'),'utf8')).accounts;
const apiUrl=process.env.V2_TEST_API_URL||'http://127.0.0.1:54329',key=process.env.V2_TEST_ANON_KEY||'local-test-public-key';
require('../load-ts.cjs').load('src/features/v2/cloud/guard.ts').assertIsolatedSupabaseUrl(apiUrl);
async function enter(page,account){
 await page.getByLabel('Email de test',{exact:true}).fill(account.email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(account.password);
 await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/);
 await expect(page.locator('.v2-sync-status')).toContainText('Date sincronizate');
}
test('late import response from account A cannot enter the newly signed-in account B',async({page,context})=>{
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 const sdk=createClient(apiUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 await sdk.auth.signInWithPassword(accounts[1]);
 const cleaned=await sdk.rpc('v2_apply_action',{p_baby_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',p_action:'favorite',p_payload:{recipeId:'piure-dovlecel',enabled:false}});
 if(cleaned.error)throw cleaned.error;
 await sdk.auth.signOut({scope:'local'});
 await page.goto('/v2');
 await page.evaluate(()=>localStorage.setItem('diversibebe:v2:isolated-preview:1',JSON.stringify({version:1,stage:8,favorites:['piure-dovlecel'],plan:[],uses:[]})));
 await page.goto('/v2/cont');await enter(page,accounts[0]);
 await page.getByRole('link',{name:'Contul de test',exact:true}).click();
 let release,seen,finished;const gate=new Promise(r=>release=r),started=new Promise(r=>seen=r),done=new Promise(r=>finished=r);
 await page.route('**/rest/v1/rpc/v2_apply_action',async r=>{
  if(r.request().postDataJSON().p_action!=='favorite')return r.continue();
  const response=await r.fetch();seen();await gate;await r.fulfill({response});finished();
 });
 await page.getByRole('button',{name:'Importă favoritele și planul',exact:true}).click();await started;
 await page.getByRole('button',{name:'Deconectare',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Conectează contul de test'})).toBeVisible();
 // Stay in the same document so the delayed callback genuinely survives the account change.
 await enter(page,accounts[1]);release();await done;
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('.v2-bottom-nav').getByRole('link',{name:'Descoperă',exact:true}).click();
 await page.getByLabel('Doar ideile salvate').check();
 await expect(page.getByRole('heading',{name:'Nu am găsit o combinație deocamdată'})).toBeVisible();
});
