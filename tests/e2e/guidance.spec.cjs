// Allergies filter what DiversiBebe suggests and plans; they never switch the app off (decision of 11 Nov 2026).
// Every recipe says how it stands against the recorded allergies, the plan uses only recipes in which no
// recorded allergen was found, and the parent can link a V1 allergy (recorded without a child) to one child.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto'),path=require('node:path');
const {load}=require(path.join(__dirname,'..','load-ts.cjs'));
const {catalog}=load('src/features/v2/catalog.ts');
const {resolveAllergy,assessRecipe}=load('src/features/v2/allergy.ts');
const native=process.env.V2_NATIVE==='1';
// The planner asks for days and meals: these tests keep their original shape, 5 days of lunch.
async function fiveLunches(page){const pick=page.locator('.v2-meal-choices');for(const m of ['Mic dejun','Prânz','Cină','Gustare']){const b=pick.getByRole('button',{name:m,exact:true});if(((await b.getAttribute('aria-pressed'))==='true')!==(m==='Prânz'))await b.click();}await page.getByRole('button',{name:'5 zile',exact:true}).click();await page.getByRole('button',{name:'Arată planul',exact:true}).click();}
test.use({viewport:{width:390,height:844}});
const NOTICE='Verifică întotdeauna ingredientele și etichetele';
const api=()=>process.env.V2_TEST_API_URL,key=()=>process.env.V2_TEST_ANON_KEY;

async function signup(page,request){
 const email=`allergy-${crypto.randomUUID()}@example.test`,password=crypto.randomBytes(18).toString('base64url');
 await page.goto('/v2/cont?nou=1');
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
 await page.getByLabel('În ce etapă este copilul?').selectOption('12');
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 const session=await (await request.post(`${api()}/auth/v1/token?grant_type=password`,{headers:{apikey:key(),'Content-Type':'application/json'},data:{email,password}})).json();
 const h={apikey:key(),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
 const rest=async(method,url,data)=>{const r=await request.fetch(`${api()}/rest/v1/${url}`,{method,headers:{...h,Prefer:'return=representation'},data});expect(r.ok(),await r.text()).toBe(true);return r.json();};
 const state=await rest('POST','rpc/v2_load_state',{p_baby_id:null});
 return {email,password,userId:session.user.id,rest,childA:state.selectedBabyId};
}
// As V1 records them: babyId null means the whole account.
const addAllergy=(a,food_id,food_name,baby_id=null)=>a.rest('POST','allergy_records',{user_id:a.userId,baby_id,food_id,food_name,severity:'usoara'});
const markers=(page,kind)=>page.locator(`.v2-recipe-grid [data-allergy="${kind}"]`);
async function makePlan(page){
 await page.goto('/v2/plan');
 const show=page.getByRole('button',{name:'Arată planul',exact:true});
 await expect(show).toBeEnabled({timeout:30000});
 await fiveLunches(page);
}
const plannedIds=async a=>(await a.rest('GET',`meal_plans?select=recipe_id,baby_id&user_id=eq.${a.userId}`)).map(r=>r.recipe_id);

test('no allergy: no markers, no notice, a full 5-day plan',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(150000);
 const a=await signup(page,request);
 await page.goto('/v2/idei');
 await expect(page.locator('.v2-recipe-grid article').first()).toBeVisible({timeout:30000});
 await expect(page.locator('.v2-allergy-marker')).toHaveCount(0);
 await expect(page.getByText(NOTICE)).toHaveCount(0);
 await makePlan(page);
 await page.getByRole('button',{name:'Salvează planul'}).click();
 await expect(page.getByText('mese pentru 5 zile, gata',{exact:false})).toBeVisible({timeout:30000});
 await expect.poll(async()=>(await plannedIds(a)).length,{timeout:20000}).toBe(5);
});

test('one allergy recorded in V1: the library stays open, marked; the plan leaves the allergen out and is saved',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(200000);
 const a=await signup(page,request);
 await addAllergy(a,'ou','Ou');
 await page.goto('/v2/idei');
 await expect(page.getByText(NOTICE).first()).toBeVisible({timeout:30000});
 await expect(markers(page,'compatible').first()).toBeVisible();
 await expect(page.locator('.v2-recipe-grid article').first()).toBeVisible();
 // Recipes with egg are listed only on request, for reading, and marked.
 await expect(markers(page,'contains')).toHaveCount(0);
 const toggle=page.getByLabel(/rețete? care con(ț|t)in(e)? un alergen declarat/);
 await toggle.check();
 // They come after every other recipe; a search brings them into the first page.
 await page.getByLabel('Cauți ceva anume?').fill('omletă');
 await expect(markers(page,'contains').first()).toBeVisible();
 await expect(markers(page,'compatible')).toHaveCount(0);
 await expect(markers(page,'contains').first()).toContainText('Ou');
 // Detail of an egg recipe: readable, but it cannot enter the plan.
 await page.goto('/v2/retete/salata-ou-avocado');
 await expect(page.locator('.v2-allergy-detail')).toContainText('Conține un alergen declarat',{timeout:30000});
 await expect(page.getByRole('button',{name:'Adaugă în plan'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Am folosit ideea'})).toBeDisabled();
 // The planner is not switched off by the allergy.
 await makePlan(page);
 await expect(page.locator('.v2-proposal').getByText(NOTICE)).toBeVisible();
 await page.getByRole('button',{name:'Salvează planul'}).click();
 await expect(page.getByText('mese pentru 5 zile, gata',{exact:false})).toBeVisible({timeout:30000});
 let ids=[];await expect.poll(async()=>(ids=await plannedIds(a)).length,{timeout:20000}).toBe(5);
 const egg=[resolveAllergy({id:'x',babyId:null,foodId:'ou',foodName:'Ou'})];
 for(const id of ids)expect(assessRecipe(catalog.find(r=>r.id===id),egg).status,id).toBe('compatible');
 // Persistence: after signing out and in again, the allergy still filters and the plan is still there.
 await page.goto('/v2/cont');await page.getByRole('button',{name:'Deconectare',exact:true}).click();
 await page.getByLabel('Email de test').fill(a.email);await page.getByLabel('Parola contului de test').fill(a.password);
 await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/(azi|onboarding)/,{timeout:30000});
 await page.goto('/v2/profil');
 await expect(page.locator('.v2-allergy-list')).toContainText('Ou',{timeout:30000});
 await page.goto('/v2/plan');
 await expect(page.locator('.v2-plan-days .v2-plan-recipe')).toHaveCount(5,{timeout:30000});
 await expect(page.locator('.v2-plan-days [data-allergy="contains"]')).toHaveCount(0);
});

test('several allergies and derivatives: butter counts as milk; all apply together',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(150000);
 const a=await signup(page,request);
 await addAllergy(a,'ou','Ou');await addAllergy(a,'iaurt','Iaurt natural');await addAllergy(a,'capsuni','Căpșuni');
 await page.goto('/v2/retete/ou-fiert-soldati-toast');
 const detail=page.locator('.v2-allergy-detail');
 await expect(detail).toContainText('Conține un alergen declarat',{timeout:30000});
 await expect(detail).toContainText('Ou');await expect(detail).toContainText('Iaurt natural (lapte)');
 await page.goto('/v2/profil');
 for(const label of ['Ou','Iaurt natural (lapte)','Căpșuni'])await expect(page.locator('.v2-allergy-list')).toContainText(label,{timeout:30000});
 await makePlan(page);
 await page.getByRole('button',{name:'Salvează planul'}).click().catch(()=>{});
 const all=['ou','iaurt','capsuni'].map((f,i)=>resolveAllergy({id:String(i),babyId:null,foodId:f,foodName:f}));
 await expect.poll(async()=>(await plannedIds(a)).length,{timeout:20000}).toBeGreaterThan(0);
 for(const id of await plannedIds(a))expect(assessRecipe(catalog.find(r=>r.id===id),all).status,id).toBe('compatible');
});

test('an unknown food never counts as absent: nothing is planned, and the page says exactly why',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(150000);
 const a=await signup(page,request);
 await addAllergy(a,'custom-pitaya','Pitaya');
 await page.goto('/v2/idei');
 await expect(markers(page,'unverified').first()).toContainText('Ingrediente insuficient verificate',{timeout:30000});
 await expect(markers(page,'compatible')).toHaveCount(0);
 await makePlan(page);
 const why=page.locator('.v2-plan-shortfall');
 await expect(why).toContainText('Prânz: 5 mese rămân libere');
 await expect(why).toContainText('insuficient verificate');
 await expect(why).toContainText('nu le folosim ca să completăm planul');
 expect((await plannedIds(a)).length).toBe(0);
});

test('a V1 allergy linked to one child explicitly; two children keep different restrictions',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(200000);
 const a=await signup(page,request);
 const [allergy]=await addAllergy(a,'ou','Ou');
 const childB=crypto.randomUUID();
 await a.rest('POST','rpc/v2_apply_action',{p_baby_id:null,p_action:'create-child',p_payload:{id:childB,label:'Al doilea copil',stage:12}});
 await a.rest('POST','rpc/v2_apply_action',{p_baby_id:a.childA,p_action:'select-child',p_payload:{}});
 await page.goto('/v2/profil');
 const select=page.getByLabel('Copilul pentru care vezi ideile');
 await expect(select).toBeVisible({timeout:30000});
 await expect(page.locator('.v2-allergy-list')).toContainText('înregistrată pentru tot contul');
 // Before linking, the account-wide allergy protects the second child too.
 await select.selectOption(childB);
 await expect(page.locator('.v2-allergy-list')).toContainText('Ou',{timeout:30000});
 await select.selectOption(a.childA);
 await expect(page.getByRole('button',{name:'Asociază cu Profilul meu'})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:'Asociază cu Profilul meu'}).click();
 await expect(page.locator('.v2-allergy-confirm')).toContainText('Al doilea copil');
 await expect(page.locator('.v2-allergy-confirm')).toContainText('Nu se șterge nimic');
 await page.getByRole('button',{name:'Da, pentru Profilul meu'}).click();
 await expect(page.locator('.v2-allergy-list')).toContainText('doar pentru Profilul meu',{timeout:30000});
 const rows=await a.rest('GET',`allergy_records?select=id,baby_id,food_id,food_name&user_id=eq.${a.userId}`);
 expect(rows).toEqual([{id:allergy.id,baby_id:a.childA,food_id:'ou',food_name:'Ou'}]);
 // The second child is no longer filtered for egg; the first one still is.
 await select.selectOption(childB);
 await expect(page.getByText('Nicio alergie înregistrată pentru acest profil.')).toBeVisible({timeout:30000});
 await page.goto('/v2/idei');
 await expect(page.locator('.v2-recipe-grid article').first()).toBeVisible({timeout:30000});
 await expect(page.locator('.v2-allergy-marker')).toHaveCount(0);
 await page.goto('/v2/profil');
 await page.getByLabel('Copilul pentru care vezi ideile').selectOption(a.childA);
 // A full reload cancels a switch still being saved: wait until it shows.
 await expect(page.locator('.v2-allergy-list')).toContainText('doar pentru Profilul meu',{timeout:30000});
 await page.goto('/v2/idei');
 await expect(page.getByText(NOTICE).first()).toBeVisible({timeout:30000});
});

test('pausing personalisation is separate from allergy protection, and says how to turn it back on',async({page})=>{
 await page.goto('/v2/profil');
 await expect(page.getByText('Excluderea alergenilor înregistrați nu depinde de această opțiune')).toBeVisible();
 await page.getByLabel('Oprește sugestiile personalizate în această sesiune').check();
 await page.locator('.v2-bottom-nav').getByRole('link',{name:'Descoperă'}).click();
 await expect(page.getByRole('heading',{name:'Sugestiile sunt oprite'})).toBeVisible();
 const reason=page.locator('.v2-guidance-reason').first();
 await expect(reason).toContainText('Ai oprit sugestiile pentru această sesiune');
 await expect(reason.getByRole('link',{name:'Le poți porni din Profil'})).toHaveAttribute('href','/v2/profil');
});

test('a reaction recorded in V1 for a recipe excludes that recipe\'s foods, not the whole library: a full plan',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');test.setTimeout(150000);
 const a=await signup(page,request);
 // As the V1 journal records a reaction to a cooked recipe: the recipe id and name, without a child.
 await addAllergy(a,'piure-banana','Piure de banană & avocado');
 await page.goto('/v2/profil');
 await expect(page.locator('.v2-allergy-list')).toContainText('rețetă: banana, avocado, lapte',{timeout:30000});
 await expect(page.locator('.v2-allergy-list')).toContainText('pentru o rețetă, nu pentru un aliment');
 await page.goto('/v2/idei');
 await expect(markers(page,'compatible').first()).toBeVisible({timeout:30000});
 await makePlan(page);
 await page.getByRole('button',{name:'Salvează planul'}).click();
 await expect(page.getByText('mese pentru 5 zile, gata',{exact:false})).toBeVisible({timeout:30000});
 let ids=[];await expect.poll(async()=>(ids=await plannedIds(a)).length,{timeout:20000}).toBe(5);
 const allergy=[resolveAllergy({id:'x',babyId:null,foodId:'piure-banana',foodName:'Piure de banană & avocado'})];
 for(const id of ids)expect(assessRecipe(catalog.find(r=>r.id===id),allergy).status,id).toBe('compatible');
});

test('the resources page keeps the app navigation; Înapoi never leaves the app; sources open in the same tab',async({page})=>{
 // Opened directly, as from a message link: nothing before it in the browser's history.
 await page.goto('/v2/pregatire');
 await expect(page.locator('.v2-bottom-nav')).toBeVisible();
 for(const link of await page.locator('.gw-education-card a').all())expect(await link.getAttribute('target')).toBeNull();
 await page.getByRole('link',{name:'Înapoi'}).last().click();
 await expect(page).toHaveURL(/\/v2(\/azi)?$/);
 await page.goto('/v2/pregatire');
 await page.locator('.v2-bottom-nav').getByRole('link',{name:'Descoperă'}).click();
 await expect(page).toHaveURL(/\/v2\/idei/);
 // The phone's back gesture returns to the resources page, inside the app.
 await page.goBack();
 await expect(page).toHaveURL(/\/v2\/pregatire/);
});

test('navigation by page type: app pages always have the menu, onboarding has its own way out, the start page shows it once the app is in use',async({page})=>{
 // A first visit: one clear next step on the start page; onboarding is a focused flow.
 await page.goto('/v2');
 await expect(page.getByRole('link',{name:'Hai să găsim o idee de masă',exact:true})).toBeVisible();
 await expect(page.locator('.v2-bottom-nav')).toHaveCount(0);
 await page.goto('/v2/onboarding');
 await expect(page.locator('.v2-bottom-nav')).toHaveCount(0);
 await expect(page.locator('.gw-journey-top').getByRole('link',{name:'Pagina de început'})).toBeVisible();
 // Once the app is in use on this device (a stage chosen), the start page has the menu and onboarding leads back to Azi.
 await page.goto('/v2/profil');
 await page.getByRole('button',{name:/Primele descoperiri/}).click();
 await page.goto('/v2/onboarding');
 await expect(page.locator('.gw-journey-top').getByRole('link',{name:'Înapoi la Azi'})).toBeVisible();
 await expect(page.locator('.v2-bottom-nav')).toHaveCount(0);
 for(const path of ['/v2','/v2/pregatire','/v2/azi','/v2/idei','/v2/plan','/v2/profil']){
  await page.goto(path);
  const nav=page.locator('.v2-bottom-nav');
  await expect(nav,path).toBeVisible();
  for(const name of ['Azi','Descoperă','Planul meu','Profil'])await expect(nav.getByRole('link',{name}),`${path} ${name}`).toBeVisible();
  // The end of the page can scroll above the menu.
  const footer=page.locator('.v2-footer');
  await footer.scrollIntoViewIfNeeded();await page.mouse.wheel(0,4000);
  const [f,n]=await Promise.all([footer.boundingBox(),nav.boundingBox()]);
  expect(f.y+f.height,`${path}: footer above the menu`).toBeLessThanOrEqual(n.y+n.height+1);
  const link=footer.getByRole('link').last();const box=await link.boundingBox();
  expect(box.y+box.height,`${path}: last footer link not under the menu`).toBeLessThanOrEqual(n.y);
 }
 await page.goto('/v2');
 await page.locator('.v2-bottom-nav').getByRole('link',{name:'Planul meu'}).click();
 await expect(page).toHaveURL(/\/v2\/plan/);
});
