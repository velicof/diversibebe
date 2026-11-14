const {test,expect}=require('@playwright/test'),crypto=require('node:crypto'),path=require('node:path'),fs=require('node:fs');
const {createClient}=require('@supabase/supabase-js');
const native=process.env.V2_NATIVE==='1';
const out=process.env.V2_QA_CAPTURE_DIR||path.resolve(__dirname,'../../../../outputs/master-2026-11-01/captures');
fs.mkdirSync(out,{recursive:true});
// The planner asks for days and meals: these tests keep their original shape, 5 days of lunch.
async function fiveLunches(page){const pick=page.locator('.v2-meal-choices');for(const m of ['Mic dejun','Prânz','Cină','Gustare']){const b=pick.getByRole('button',{name:m,exact:true});if(((await b.getAttribute('aria-pressed'))==='true')!==(m==='Prânz'))await b.click();}await page.getByRole('button',{name:'5 zile',exact:true}).click();await page.getByRole('button',{name:'Arată planul',exact:true}).click();}
async function restrict(context){await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());}
async function planFiveDays(page){
 await page.goto('/v2/plan');
 await page.getByRole('button',{name:'max. 30 min',exact:true}).click();
 await fiveLunches(page);
 await expect(page.locator('.v2-proposal-meal')).toHaveCount(5);
}
const plannedNames=page=>page.locator('.v2-plan-days .v2-plan-recipe h2').allTextContents();

test('planner: preferences → 5-day proposal → swap → save → shopping list with "am acasă", persisted after reload',async({page,context})=>{
 await restrict(context);
 await planFiveDays(page);
 await page.screenshot({path:path.join(out,'planner-proposal-mobile.png'),fullPage:true});
 const proposal=page.locator('.v2-proposal-meal');
 const firstBefore=await proposal.first().locator('h3').textContent();
 const alt=proposal.first().locator('.v2-alt-chip').first();
 const altName=(await alt.textContent()).replace(/^sau /,'');
 await alt.click();
 await expect(proposal.first().locator('h3')).toHaveText(altName);
 await expect(proposal.first().locator('.v2-alt-chip').filter({hasText:firstBefore})).toHaveCount(1);
 const secondBefore=await proposal.nth(1).locator('h3').textContent();
 await proposal.nth(1).getByRole('button',{name:/Altă rețetă/}).click();
 await expect(proposal.nth(1).locator('h3')).not.toHaveText(secondBefore);
 const chosen=await proposal.locator('h3').allTextContents();
 expect(new Set(chosen).size).toBe(5);
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.locator('.v2-plan-saved')).toContainText('5 mese pentru 5 zile');
 await expect.poll(()=>plannedNames(page)).toEqual(chosen);
 await page.reload();
 await expect.poll(()=>plannedNames(page)).toEqual(chosen);
 await page.getByRole('button',{name:/De cumpărat/}).click();
 const items=page.locator('.v2-shopping-list > li');
 await expect(items.first()).toBeVisible();
 const total=await items.count();
 expect(total).toBeGreaterThan(3);
 await expect(page.locator('.v2-shopping-list')).not.toContainText(/^Apă/m);
 const homeName=(await items.first().locator('strong').textContent()).split(' · ')[0];
 await items.first().getByRole('button',{name:/^Am acasă/}).click();
 await expect(items).toHaveCount(total-1);
 await expect(page.locator('.v2-at-home summary')).toHaveText('Ai deja acasă (1)');
 await items.first().locator('input').check();
 await page.screenshot({path:path.join(out,'planner-shopping-mobile.png'),fullPage:true});
 await page.reload();
 await page.getByRole('button',{name:/De cumpărat/}).click();
 await expect(items).toHaveCount(total-1);
 await expect(items.first().locator('input')).toBeChecked();
 await page.locator('.v2-at-home summary').click();
 await expect(page.locator('.v2-at-home')).toContainText(homeName);
 await page.locator('.v2-at-home').getByRole('button',{name:'Mută în listă'}).click();
 await expect(items).toHaveCount(total);
 const stored=await page.evaluate(()=>localStorage.getItem('diversibebe:v2:isolated-preview:1'));
 expect(stored).not.toMatch(/childName|parola|password/i);
});

test('planner: desktop layout and season strip on "Ce gătim azi?"',async({page,context})=>{
 await restrict(context);await page.setViewportSize({width:1440,height:1000});
 await page.goto('/v2/azi');
 await expect(page.locator('.v2-season-strip')).toContainText('Proaspăt local în');
 await page.screenshot({path:path.join(out,'today-season-desktop.png'),fullPage:true});
 await planFiveDays(page);
 await expect(page.locator('.v2-reuse-note')).toBeVisible();
 await page.screenshot({path:path.join(out,'planner-proposal-desktop.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 expect(overflow).toBe(false);
});

test('planner: preparation stage cannot generate meals',async({page,context})=>{
 await restrict(context);
 await page.goto('/v2/profil');
 await page.getByRole('button',{name:/Încă ne pregătim/}).click();
 await page.goto('/v2/plan');
 await expect(page.getByRole('button',{name:'Arată planul',exact:true})).toBeDisabled();
 await expect(page.locator('.v2-planner-builder')).toContainText('Planificarea meselor începe după alegerea etapei');
});

test('planner (real Auth): two children of one family and a second family stay separate',async({page,context,browser})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await restrict(context);
 const sdk=createClient(process.env.V2_TEST_API_URL,process.env.V2_TEST_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const make=async()=>{const email='planner-'+crypto.randomUUID()+'@example.test',password=crypto.randomBytes(18).toString('base64url');const r=await sdk.auth.signUp({email,password});expect(r.error).toBeNull();await sdk.auth.signOut({scope:'local'});return {email,password};};
 const login=async(p,{email,password})=>{await p.goto('/v2/cont');await p.getByLabel('Email de test',{exact:true}).fill(email);await p.getByLabel('Parola contului de test',{exact:true}).fill(password);await p.getByRole('button',{name:'Conectare în test',exact:true}).click();await expect(p).toHaveURL('/v2/azi');};
 const addChild=async(p,label,stage)=>{await p.goto('/v2/cont');await p.getByLabel('Etichetă opțională pentru profil').fill(label);await p.getByLabel('Etapa noului profil').selectOption(stage);await p.getByRole('button',{name:'Creează profilul',exact:true}).click();await expect(p.getByLabel('Profilul activ')).toContainText(label);};
 const family=await make(),other=await make();
 await login(page,family);
 await addChild(page,'Primul copil','8');await addChild(page,'Al doilea copil','10');
 await page.goto('/v2/cont');
 // A full reload right after switching can cancel the switch before it reaches the server (seen on WebKit):
 // wait until the account confirms which child is active.
 const switched=page.waitForResponse(r=>r.url().includes('rpc/v2_apply_action')&&(r.request().postData()||'').includes('select-child'));
 await page.getByLabel('Profilul activ').selectOption({label:'Primul copil'});await switched;
 await page.goto('/v2/plan');
 await expect(page.getByLabel('Planifici pentru',{exact:true})).toBeVisible();
 await planFiveDays(page);
 const chosen=await page.locator('.v2-proposal-meal h3').allTextContents();
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect(page.locator('.v2-plan-saved')).toBeVisible();
 await expect.poll(()=>plannedNames(page),{timeout:20000}).toEqual(chosen);
 await page.screenshot({path:path.join(out,'planner-native-child-a-mobile.png'),fullPage:true});
 await page.getByLabel('Planifici pentru',{exact:true}).selectOption({label:'Al doilea copil'});
 await expect(page.locator('.v2-planner-builder')).toContainText('Etapa 10+ luni',{timeout:20000});
 await expect.poll(()=>plannedNames(page),{timeout:20000}).toEqual([]);
 await page.getByLabel('Planifici pentru',{exact:true}).selectOption({label:'Primul copil'});
 await expect.poll(()=>plannedNames(page),{timeout:20000}).toEqual(chosen);
 const second=await browser.newContext({baseURL:`http://127.0.0.1:${process.env.V2_PORT||3100}`,viewport:{width:390,height:844}});await restrict(second);
 try{
  const p2=await second.newPage();await login(p2,other);await addChild(p2,'Alt copil','8');await p2.goto('/v2/plan');
  await expect(p2.locator('.v2-planner-builder')).toBeVisible();
  expect(await plannedNames(p2)).toEqual([]);
  const p3=await second.newPage();await p3.goto('/v2/cont');await p3.getByRole('button',{name:'Deconectare',exact:true}).click();
  await login(p3,family);await p3.goto('/v2/plan');await expect.poll(()=>plannedNames(p3),{timeout:20000}).toEqual(chosen);
 }finally{await second.close();}
});
