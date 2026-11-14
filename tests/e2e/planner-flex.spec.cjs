// Flexible planner, end to end: the parent chooses days and meals, plans already saved (on the device or in
// the account) are kept, allergies are respected for every meal, one meal can be replaced and the shopping
// list follows, two children keep their own choices, a network failure saves nothing silently, and a
// visitor's meals enter the account by day and meal.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto'),path=require('node:path');
const {load}=require(path.join(__dirname,'..','load-ts.cjs'));
const {catalog}=load('src/features/v2/catalog.ts');
const {resolveAllergy,assessRecipe}=load('src/features/v2/allergy.ts');
const native=process.env.V2_NATIVE==='1';
const STORE='diversibebe:v2:isolated-preview:1';
test.use({viewport:{width:390,height:844}});
test.setTimeout(180000);
const api=()=>process.env.V2_TEST_API_URL,key=()=>process.env.V2_TEST_ANON_KEY;
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bucharest'}).format(new Date());
const plusDays=n=>{const d=new Date(today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};

async function chooseMeals(page,meals){
 const pick=page.locator('.v2-meal-choices');
 for(const m of ['Mic dejun','Prânz','Cină','Gustare']){
  const b=pick.getByRole('button',{name:m,exact:true});
  if(((await b.getAttribute('aria-pressed'))==='true')!==meals.includes(m))await b.click();
 }
}
async function makePlan(page,{days=3,meals=['Mic dejun','Prânz','Cină']}={}){
 await page.goto('/v2/plan');
 await expect(page.getByRole('button',{name:'Arată planul',exact:true})).toBeEnabled({timeout:30000});
 await chooseMeals(page,meals);
 await page.getByRole('button',{name:days===1?'1 zi':`${days} zile`,exact:true}).click();
 await page.getByRole('button',{name:'max. 30 min',exact:true}).click();
 await page.getByRole('button',{name:'Arată planul',exact:true}).click();
}
async function signup(page,request,stage='12'){
 const email=`flex-${crypto.randomUUID()}@example.test`,password=crypto.randomBytes(18).toString('base64url');
 await page.goto('/v2/cont?nou=1');
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
 await page.getByLabel('În ce etapă este copilul?').selectOption(stage);
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 const session=await (await request.post(`${api()}/auth/v1/token?grant_type=password`,{headers:{apikey:key(),'Content-Type':'application/json'},data:{email,password}})).json();
 const h={apikey:key(),Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
 const rest=async(method,url,data)=>{const r=await request.fetch(`${api()}/rest/v1/${url}`,{method,headers:{...h,Prefer:'return=representation'},data});expect(r.ok(),await r.text()).toBe(true);return r.json();};
 const state=await rest('POST','rpc/v2_load_state',{p_baby_id:null});
 return {email,password,userId:session.user.id,rest,child:state.selectedBabyId};
}
const rows=a=>a.rest('GET',`meal_plans?select=planned_for,meal,recipe_id,baby_id&user_id=eq.${a.userId}&order=planned_for,meal`);

test('a plan saved in the browser before meal types is kept: shown as "Masă", never overwritten by a new plan',async({page})=>{
 await page.goto('/v2/azi');
 const old=catalog.find(r=>r.published&&r.minimumMonths<=8);
 await page.evaluate(([k,slot,id])=>localStorage.setItem(k,JSON.stringify({version:1,onboarded:true,stage:8,plan:[{slot,recipeId:id}],favorites:[],introduced:[],uses:[],pantry:[],shoppingChecked:[]})),[STORE,plusDays(1),old.id]);
 await page.goto('/v2/plan');
 const day=page.locator('.v2-plan-day').nth(1);
 await expect(day.locator('[data-meal="oricare"]')).toContainText(old.name);
 await expect(day.locator('[data-meal="oricare"] .v2-meal-label')).toHaveText('Masă');
 await makePlan(page,{days:3,meals:['Prânz']});
 await expect(page.locator('.v2-proposal-meal')).toHaveCount(3);
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(day.locator('[data-meal="oricare"]')).toContainText(old.name);
 await expect(day.locator('[data-meal="pranz"]')).toHaveCount(1);
 const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).plan,STORE);
 expect(stored.filter(p=>p.slot===plusDays(1)).map(p=>p.meal).sort()).toEqual(['oricare','pranz']);
});

test('defaults follow the stage: one lunch at 6 months, three meals from 8; the snack is offered, never preselected',async({page})=>{
 await page.goto('/v2/profil');
 await page.getByRole('button',{name:/Primele descoperiri/}).click();
 await page.goto('/v2/plan');
 const pressed=async()=>{const out=[];for(const m of ['Mic dejun','Prânz','Cină','Gustare'])if(await page.locator('.v2-meal-choices').getByRole('button',{name:m,exact:true}).getAttribute('aria-pressed')==='true')out.push(m);return out;};
 expect(await pressed()).toEqual(['Prânz']);
 await page.goto('/v2/profil');
 await page.getByRole('button',{name:/La masa familiei/}).first().click();
 await page.goto('/v2/plan');
 expect(await pressed()).toEqual(['Mic dejun','Prânz','Cină']);
 await chooseMeals(page,[]);
 await expect(page.getByRole('button',{name:'Arată planul',exact:true})).toBeDisabled();
});

test('account with an egg allergy: 3 days x 3 meals, every meal compatible, one meal replaced, list recalculated, kept after signing in again',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const a=await signup(page,request,'12');
 await a.rest('POST','allergy_records',{user_id:a.userId,baby_id:null,food_id:'ou',food_name:'Ou',severity:'usoara'});
 await makePlan(page,{days:3,meals:['Mic dejun','Prânz','Cină']});
 await expect(page.locator('.v2-proposal-meal')).toHaveCount(9);
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.getByText('9 mese pentru 3 zile, gata',{exact:false})).toBeVisible({timeout:30000});
 let saved=[];await expect.poll(async()=>(saved=await rows(a)).length,{timeout:20000}).toBe(9);
 expect([...new Set(saved.map(r=>r.meal))].sort()).toEqual(['cina','mic-dejun','pranz']);
 const egg=[resolveAllergy({id:'x',babyId:null,foodId:'ou',foodName:'Ou'})];
 for(const r of saved)expect(assessRecipe(catalog.find(c=>c.id===r.recipe_id),egg).status,r.recipe_id).toBe('compatible');
 // Shopping list, then replace one meal: only that row changes and the list follows.
 await page.getByRole('button',{name:/De cumpărat/}).click();
 const items=page.locator('.v2-shopping-list > li');await expect(items.first()).toBeVisible();
 const listBefore=await page.locator('.v2-shopping-list').innerText();
 await page.getByRole('button',{name:/Mesele mele/}).click();
 const lunch=saved.find(r=>r.planned_for===today()&&r.meal==='pranz');
 await page.getByRole('button',{name:'Înlocuiește prânz de azi',exact:true}).click();
 let after=[];await expect.poll(async()=>(after=await rows(a)).find(r=>r.planned_for===today()&&r.meal==='pranz').recipe_id,{timeout:20000}).not.toBe(lunch.recipe_id);
 expect(after.filter(r=>!(r.planned_for===today()&&r.meal==='pranz'))).toEqual(saved.filter(r=>!(r.planned_for===today()&&r.meal==='pranz')));
 await page.getByRole('button',{name:/De cumpărat/}).click();
 await expect.poll(()=>page.locator('.v2-shopping-list').innerText()).not.toBe(listBefore);
 // Remove one meal: one row less.
 await page.getByRole('button',{name:/Mesele mele/}).click();
 await page.getByRole('button',{name:'Elimină cină de azi',exact:true}).click();
 await expect.poll(async()=>(await rows(a)).length,{timeout:20000}).toBe(8);
 // Sign out and in again: the same 8 meals, by day and meal.
 const kept=await rows(a);
 await page.goto('/v2/cont');await page.getByRole('button',{name:'Deconectare',exact:true}).click();
 await page.getByLabel('Email de test').fill(a.email);await page.getByLabel('Parola contului de test').fill(a.password);
 await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/(azi|onboarding)/,{timeout:30000});
 await page.goto('/v2/plan');
 await expect(page.locator('.v2-plan-days .v2-meal-row')).toHaveCount(8,{timeout:30000});
 expect(await rows(a)).toEqual(kept);
 // Azi lists today's meals, each with "Am pregătit".
 await page.goto('/v2/azi');
 await expect(page.locator('.v2-today-meals li')).toHaveCount(2,{timeout:30000});
 await page.locator('.v2-today-meals li').first().getByRole('button',{name:/^Am pregătit/}).click();
 await expect(page.locator('.v2-today-meals li').first().getByRole('button',{name:/pregătită azi/})).toBeDisabled({timeout:20000});
});

test('an existing account plan (one meal, no type) stays; a network failure saves nothing; retry saves everything',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const a=await signup(page,request,'8');
 // As the deployed client writes it: no meal.
 await a.rest('POST','rpc/v2_apply_action',{p_baby_id:a.child,p_action:'plan',p_payload:{slot:plusDays(1),recipeId:'piure-dovlecel'}});
 await page.goto('/v2/plan');
 await expect(page.locator('.v2-plan-day').nth(1).locator('[data-meal="oricare"]')).toBeVisible({timeout:30000});
 await makePlan(page,{days:3,meals:['Prânz']});
 await page.route('**/rest/v1/rpc/v2_apply_action',r=>r.request().postData()?.includes('plan-many')?r.abort('failed'):r.continue());
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.getByText('Salvarea nu a reușit',{exact:false})).toBeVisible({timeout:30000});
 expect((await rows(a)).map(r=>r.meal)).toEqual(['oricare'],'nothing of the failed plan was written');
 await page.unroute('**/rest/v1/rpc/v2_apply_action');
 await page.getByRole('button',{name:'Reîncearcă',exact:true}).click();
 await expect.poll(async()=>(await rows(a)).length,{timeout:20000}).toBe(4);
 expect((await rows(a)).filter(r=>r.meal==='oricare').map(r=>r.recipe_id)).toEqual(['piure-dovlecel']);
});

test('two children keep their own planner choices',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const a=await signup(page,request,'12');
 const second=crypto.randomUUID();
 await a.rest('POST','rpc/v2_apply_action',{p_baby_id:null,p_action:'create-child',p_payload:{id:second,label:'Al doilea',stage:6}});
 await a.rest('POST','rpc/v2_apply_action',{p_baby_id:a.child,p_action:'select-child',p_payload:{}});
 await makePlan(page,{days:7,meals:['Prânz','Cină']});
 await expect(page.locator('.v2-proposal-meal')).toHaveCount(14);
 // The choices are stored for this child when the plan is generated.
 await expect.poll(async()=>(await a.rest('GET',`user_preferences?select=planner&user_id=eq.${a.userId}`))[0]?.planner?.[a.child]?.days,{timeout:20000}).toBe(7);
 await page.getByRole('button',{name:'Schimbă preferințele',exact:true}).click();
 await page.getByLabel('Planifici pentru',{exact:true}).selectOption(second);
 await expect(page.locator('.v2-meal-choices').getByRole('button',{name:'Prânz',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:30000});
 await expect(page.locator('.v2-meal-choices').getByRole('button',{name:'Cină',exact:true})).toHaveAttribute('aria-pressed','false');
 await expect(page.getByRole('button',{name:'5 zile',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Planifici pentru',{exact:true}).selectOption(a.child);
 await expect(page.locator('.v2-meal-choices').getByRole('button',{name:'Cină',exact:true})).toHaveAttribute('aria-pressed','true',{timeout:30000});
 await expect(page.getByRole('button',{name:'7 zile',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('a visitor\'s meals enter the account by day and meal, in one save',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await page.goto('/v2/profil');
 await page.getByRole('button',{name:/La masa familiei/}).first().click();
 await makePlan(page,{days:1,meals:['Mic dejun','Prânz']});
 await expect(page.locator('.v2-proposal-meal')).toHaveCount(2);
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 const local=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).plan,STORE);
 expect(local.map(p=>p.meal).sort()).toEqual(['mic-dejun','pranz']);
 const a=await signup(page,request,'12');
 await page.goto('/v2/azi');
 await page.getByRole('button',{name:'Adaugă în cont',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:/Am adăugat în cont 2 mese/})).toBeVisible({timeout:30000});
 const saved=await rows(a);
 expect(saved.map(r=>[r.planned_for,r.meal,r.recipe_id])).toEqual(local.map(p=>[p.slot,p.meal,p.recipeId]).sort((x,y)=>x[1].localeCompare(y[1])));
});
