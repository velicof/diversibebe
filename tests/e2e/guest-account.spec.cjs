// Guest → account: the way in is always in sight, nothing obliges a visitor to take it, an account takes
// only what it is told to take, and a guest can change nobody's data.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto');
const native=process.env.V2_NATIVE==='1';
test.setTimeout(150000);
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});

const INVITE='Salvează-ți progresul într-un cont gratuit';
const STORE='diversibebe:v2:isolated-preview:1';
const connect=page=>page.locator('.v2-topbar').getByRole('link',{name:'Conectează-te',exact:true});
const invite=page=>page.getByRole('heading',{name:INVITE});
const importRegion=page=>page.getByRole('region',{name:'Alegerile de pe acest dispozitiv'});
const planned=page=>page.locator('.v2-plan-days .v2-plan-recipe h2').allTextContents();
const backendCalls=page=>{const seen=[];page.on('request',r=>{if(/\/(auth|rest)\/v1\//.test(r.url()))seen.push(r.url());});return seen;};
const credentials=label=>({email:`${label}-${crypto.randomUUID()}@example.test`,password:crypto.randomBytes(18).toString('base64url')});

async function propose(page){
 await page.goto('/v2/plan');
 await page.getByRole('button',{name:'Arată 5 zile de mese',exact:true}).click();
 await expect(page.locator('.v2-proposal-day')).toHaveCount(5);
}
async function planFive(page){
 await propose(page);
 const chosen=await page.locator('.v2-proposal-day h3').allTextContents();
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.locator('.v2-plan-saved')).toBeVisible({timeout:30000});
 await expect.poll(()=>planned(page),{timeout:30000}).toEqual(chosen);
 return chosen;
}
async function fillAccount(page,{email,password}){
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
}
async function signup(page,stage='8',label='guest'){
 const account=credentials(label);
 await page.goto('/v2/cont?nou=1');
 await fillAccount(page,account);
 await page.getByLabel('În ce etapă este copilul?').selectOption(stage);
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 return account;
}
async function login(page,account){
 await page.goto('/v2/cont');
 await fillAccount(page,account);
 await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
}
async function logout(page){
 await page.goto('/v2/cont');
 await page.getByRole('button',{name:'Deconectare',exact:true}).click();
 await expect(page.getByLabel('Email de test',{exact:true})).toBeVisible({timeout:30000});
}
const synced=page=>expect(page.locator('.v2-sync-status')).toContainText('Date sincronizate',{timeout:30000});

test('"Conectează-te" is in the first screen of every page, already in the first HTML, and optional',async({page,request})=>{
 expect(await (await request.get('/v2')).text(),'in the HTML, before any script runs').toContain('v2-connect-link');
 for(const route of ['/v2','/v2/azi','/v2/idei','/v2/plan','/v2/profil','/v2/retete/piure-morcov','/v2/premium']){
  await page.goto(route);
  await expect(connect(page),route).toBeVisible();
  const box=await connect(page).boundingBox();
  expect(box.y,route).toBeLessThan(100);
  expect(box.height,`${route}: a finger can hit it`).toBeGreaterThanOrEqual(44);
  expect(box.x+box.width,route).toBeLessThanOrEqual(390);
 }
 await connect(page).click();
 await expect(page).toHaveURL(/\/v2\/cont$/);
 await expect(page.getByLabel(/^Email/)).toBeVisible();
 await expect(connect(page),'not offered on the page it leads to').toHaveCount(0);
 await page.getByRole('link',{name:'Explorează fără cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/idei/);
 await expect(page.locator('.v2-recipe-card').first(),'no account needed').toBeVisible();
});

for(const width of [320,360]){
 test(`the top bar fits a ${width}px phone with nothing cut off`,async({page})=>{
  await page.setViewportSize({width,height:700});
  await page.goto('/v2');
  await expect(connect(page)).toBeVisible();
  // On a mobile profile the window grows with the content, so the page is compared with the phone, not with the window.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const box=await connect(page).boundingBox();
  expect(box.x+box.width).toBeLessThanOrEqual(width);
  await expect(page.locator('.v2-plus-link')).toHaveAccessibleName(/DiversiBebe Plus/);
 });
}

test('the build is named on screen, so a phone can say which code it runs',async({page})=>{
 await page.goto('/v2');
 await expect(page.locator('.v2-build-stamp')).toHaveText(/^build [0-9a-f]{7,}(\+local)?$/);
});

test('after the first plan the invitation appears in the page, explains the risk, and "no" is remembered',async({page})=>{
 const backend=backendCalls(page);
 await page.goto('/v2/plan');
 await expect(page.getByRole('button',{name:'Arată 5 zile de mese',exact:true})).toBeVisible();
 await expect(invite(page),'nothing is asked before there is something to keep').toHaveCount(0);
 const chosen=await planFive(page);
 const card=page.locator('.v2-save-invite');
 await expect(invite(page)).toBeVisible();
 await expect(card).toContainText('doar în acest browser');
 await expect(card).toContainText('ștergi datele browserului');
 await expect(card.getByRole('link',{name:'Creează cont gratuit',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'Continuă fără cont',exact:true})).toBeVisible();
 // In the page, not over it: everything else stays usable while the question is open.
 await expect(page.locator('[role="dialog"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Vezi lista de cumpărături'}).click();
 const firstItem=page.locator('.v2-shopping-list > li').first();
 await firstItem.locator('input').check();
 await expect(invite(page),'still open under the list').toBeVisible();
 await page.getByRole('button',{name:'Continuă fără cont',exact:true}).click();
 await expect(invite(page)).toHaveCount(0);
 await expect(firstItem.locator('input'),'the answer changes no data').toBeChecked();
 // Asked once: not after a reload, not on the list, not after another plan.
 await page.goto('/v2/plan?lista=1');
 await expect(firstItem).toBeVisible();
 await expect(invite(page)).toHaveCount(0);
 await page.goto('/v2/plan');
 await expect.poll(()=>planned(page)).toEqual(chosen);
 await planFive(page);
 await expect(invite(page)).toHaveCount(0);
 await expect(page.locator('.v2-plan-saved .v2-device-note'),'the quiet note still says where the plan is').toContainText('doar pe acest dispozitiv');
 expect(backend,'a visitor still talks to no server').toEqual([]);
});

test('the invitation also meets a visitor who goes straight to the list, and leads to the signup form',async({page})=>{
 await planFive(page);
 await page.goto('/v2/plan?lista=1');
 await expect(page.locator('.v2-shopping-list > li').first()).toBeVisible();
 const create=page.locator('.v2-shopping-panel .v2-save-invite').getByRole('link',{name:'Creează cont gratuit',exact:true});
 await create.click();
 await expect(page).toHaveURL(/\/v2\/cont\?nou=1/);
 await expect(page.getByLabel(/^Email/)).toBeVisible();
 if(native)await expect(page.getByLabel('În ce etapă este copilul?'),'opens on the signup form').toBeVisible();
});

test('the invitation creates an account, and a plan that does not suit the child stays out, with the reason said',async({page})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await planFive(page);
 await page.locator('.v2-save-invite').getByRole('link',{name:'Creează cont gratuit',exact:true}).click();
 await fillAccount(page,credentials('young'));
 // A device that never answered has no stage to offer: its 8 is a default, not a fact about the child.
 await expect(page.getByLabel('În ce etapă este copilul?')).toHaveValue('');
 await page.getByLabel('În ce etapă este copilul?').selectOption('0');
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 // Under 6 months nothing suits: said plainly, instead of a plan that seems to vanish, and nothing to accept.
 await expect(importRegion(page)).toContainText('nu se potrivesc etapei copilului din cont');
 await expect(page.getByRole('button',{name:'Adaugă în cont',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Am înțeles',exact:true}).click();
 await expect(importRegion(page)).toHaveCount(0);
 await page.goto('/v2/plan');
 await synced(page);
 expect(await planned(page)).toEqual([]);
});

test('a stage the visitor did choose is offered at signup, and can be changed',async({page})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await page.goto('/v2/profil');
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,onboarded:true,stage:10})),STORE);
 await page.goto('/v2/cont?nou=1');
 const stage=page.getByLabel('În ce etapă este copilul?');
 await expect(stage).toHaveValue('10');
 await stage.selectOption('6');
 await expect(stage).toHaveValue('6');
});

test('import adds without replacing: a day already planned in the account keeps its meal, and this is said',async({page})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const account=await signup(page);
 const own=await planFive(page);
 await logout(page);
 // On the same device, as a visitor: an idea, and another meal on a day the account has already planned.
 await propose(page);
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.locator('.v2-plan-saved')).toBeVisible();
 await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key));
  const other=state.plan[0].recipeId==='piure-morcov'?'piure-dovlecel':'piure-morcov';
  state.plan[0].recipeId=other;
  state.favorites=['piure-morcov'];
  localStorage.setItem(key,JSON.stringify(state));
 },STORE);
 await login(page,account);
 const offer=importRegion(page);
 await expect(offer).toContainText('1 idee salvată');
 await expect(offer).toContainText(/deja o masă în cont/);
 await page.goto('/v2/plan');
 await synced(page);
 expect(await planned(page),'nothing moved before the answer').toEqual(own);
 await page.getByRole('button',{name:'Adaugă în cont',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Am adăugat în cont 1 idee'})).toBeVisible({timeout:30000});
 await page.reload();
 await synced(page);
 await expect.poll(()=>planned(page),{timeout:30000}).toEqual(own);
});

test('a guest writes nothing to any account: logout, guest use, login finds the account as it was, another account sees none of it',async({page,browser,baseURL})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const a=await signup(page);
 await page.goto('/v2/retete/piure-morcov');
 await page.getByRole('button',{name:/^Salvează Piure/}).click();
 await expect(page.getByRole('button',{name:/^Elimină Piure/})).toBeVisible({timeout:20000});
 await logout(page);
 const backend=backendCalls(page);
 // A guest on the same device: another idea and a plan.
 await page.goto('/v2/retete/piure-dovlecel');
 await page.getByRole('button',{name:/^Salvează Piure/}).click();
 const guestPlan=await planFive(page);
 expect(backend,'after logout the device is a guest: it calls no server').toEqual([]);
 // Back in the account: asked, and nothing moved.
 await login(page,a);
 await expect(importRegion(page)).toBeVisible();
 await page.goto('/v2/plan');
 await synced(page);
 expect(await planned(page),'nothing moved without a yes').toEqual([]);
 await page.goto('/v2/retete/piure-dovlecel');
 await expect(page.getByRole('button',{name:/^Salvează Piure/}),'the idea saved as a guest is not in the account').toBeVisible({timeout:20000});
 // A new browser session of the same account: still connected, with its own data.
 const again=await browser.newContext({baseURL,viewport:{width:390,height:844},storageState:await page.context().storageState()});
 try{
  const resumed=await again.newPage();
  await resumed.goto('/v2/retete/piure-morcov');
  await expect(resumed.getByRole('button',{name:/^Elimină Piure/})).toBeVisible({timeout:30000});
 }finally{await again.close();}
 // Another person on another device: nothing of A, nothing of the guest.
 const other=await browser.newContext({baseURL,viewport:{width:390,height:844}});
 try{
  const second=await other.newPage();
  await signup(second,'8','other');
  await second.goto('/v2/plan');
  await synced(second);
  expect(await planned(second)).toEqual([]);
  for(const name of guestPlan)await expect(second.locator('main')).not.toContainText(name);
  await second.goto('/v2/retete/piure-morcov');
  await synced(second);
  await expect(second.getByRole('button',{name:/^Salvează Piure/})).toBeVisible({timeout:20000});
 }finally{await other.close();}
});

test('with only the key every browser has, a guest can neither read nor change the data of a family',async({request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const api=process.env.V2_TEST_API_URL,key=process.env.V2_TEST_ANON_KEY;
 const send=(method,path,{token=key,data,prefer}={})=>request.fetch(api+path,{method,data,headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})}});
 const {email,password}=credentials('owner');
 const owner=await (await send('POST','/auth/v1/signup',{data:{email,password}})).json();
 expect(owner.access_token).toBeTruthy();
 const token=owner.access_token,id=owner.user.id;
 const baby=(await (await send('POST','/rest/v1/babies',{token,prefer:'return=representation',data:{user_id:id,name:'Copil sintetic',birthdate:'2026-01-15',gender:'girl'}})).json())[0];
 expect(baby?.id).toBeTruthy();
 expect((await send('POST','/rest/v1/rpc/v2_apply_action',{token,data:{p_baby_id:baby.id,p_action:'favorite',p_payload:{recipeId:'piure-morcov',enabled:true}}})).ok()).toBe(true);
 const family=async()=>({
  babies:await (await send('GET',`/rest/v1/babies?select=id,name&user_id=eq.${id}`,{token})).json(),
  favorites:await (await send('GET',`/rest/v1/favorite_recipes?select=recipe_id&user_id=eq.${id}`,{token})).json(),
 });
 const before=await family();
 expect(before.babies).toHaveLength(1);
 expect(before.favorites).toHaveLength(1);
 for(const table of ['babies','favorite_recipes','meal_plans','food_journal','allergy_records']){
  const read=await send('GET',`/rest/v1/${table}?select=*&limit=5`);
  expect(read.ok()?await read.json():[],`${table}: nothing readable`).toEqual([]);
  expect((await send('POST',`/rest/v1/${table}`,{data:{user_id:id,name:'x',recipe_id:'x',food_id:'x',food_name:'x'}})).ok(),`${table}: no insert`).toBe(false);
  const patch=await send('PATCH',`/rest/v1/${table}?user_id=eq.${id}`,{prefer:'return=representation',data:{user_id:id}});
  expect(patch.ok()?await patch.json():[],`${table}: no update`).toEqual([]);
  const remove=await send('DELETE',`/rest/v1/${table}?user_id=eq.${id}`,{prefer:'return=representation'});
  expect(remove.ok()?await remove.json():[],`${table}: no delete`).toEqual([]);
 }
 for(const [name,body] of [['v2_load_state',{p_baby_id:baby.id}],['v2_apply_action',{p_baby_id:baby.id,p_action:'favorite',p_payload:{recipeId:'piure-morcov',enabled:false}}]])
  expect((await send('POST',`/rest/v1/rpc/${name}`,{data:body})).ok(),`${name}: refused`).toBe(false);
 expect(await family(),'the family is exactly as it was').toEqual(before);
});
