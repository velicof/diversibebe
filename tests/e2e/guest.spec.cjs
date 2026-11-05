// Free exploration stays free, and the visitor always knows where the data is:
// no account, no server. Connecting keeps the choices, only after an explicit answer.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto');
const native=process.env.V2_NATIVE==='1';
test.setTimeout(120000);
test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const planned=page=>page.locator('.v2-plan-days .v2-plan-recipe h2').allTextContents();
async function planFive(page){
 await page.goto('/v2/plan');
 await page.getByRole('button',{name:'Arată 5 zile de mese',exact:true}).click();
 await expect(page.locator('.v2-proposal-day')).toHaveCount(5);
 const chosen=await page.locator('.v2-proposal-day h3').allTextContents();
 await page.getByRole('button',{name:'Salvează planul',exact:true}).click();
 await expect.poll(()=>planned(page)).toEqual(chosen);
 return chosen;
}
async function signup(page){
 const email=`guest-${crypto.randomUUID()}@example.test`,password=crypto.randomBytes(18).toString('base64url');
 await page.getByRole('button',{name:'Creează un cont de test',exact:true}).click();
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
 await page.getByLabel('În ce etapă este copilul?').selectOption('8');
 await page.locator('form button[type="submit"], form button:not([type])').last().click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 return {email,password};
}

test('a visitor uses the core flow with no backend call and is told the data stays on this device',async({page,context})=>{
 const backend=[];page.on('request',r=>{if(/\/(auth|rest)\/v1\//.test(r.url()))backend.push(r.url());});
 await page.goto('/v2/azi');await expect(page.locator('.v2-sync-status')).toContainText('rămân pe acest dispozitiv');
 await page.goto('/v2/retete/piure-morcov');
 await page.getByRole('button',{name:/^Salvează Piure/}).click();
 await expect(page.getByRole('button',{name:/^Elimină Piure/})).toBeVisible();
 await expect(page.locator('main .v2-device-note').first()).toContainText('doar pe acest dispozitiv');
 await planFive(page);
 await expect(page.locator('.v2-plan-saved .v2-device-note')).toContainText('doar pe acest dispozitiv');
 await page.getByRole('button',{name:/De cumpărat/}).first().click();
 await expect(page.locator('.v2-device-note').first()).toContainText('doar pe acest dispozitiv');
 await page.locator('.v2-shopping-list > li').first().locator('input').check();
 expect(backend).toEqual([]);
 expect(await context.cookies()).toEqual([]);
 const stored=await page.evaluate(()=>Object.keys(localStorage));
 expect(stored.some(k=>k.includes('test-auth'))).toBe(false);
});

test('every guest screen offers the account, including the first page, and the link works',async({page})=>{
 await page.goto('/v2');
 await page.getByRole('link',{name:'Am deja cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/cont/);
 await expect(page.getByLabel(/^Email/)).toBeVisible();
 for(const route of ['/v2/azi','/v2/idei','/v2/plan','/v2/profil']){
  await page.goto(route);
  const link=page.locator('.v2-sync-status a');
  await expect(link,route).toBeVisible();
  const box=await link.boundingBox();
  expect(box.y,route).toBeLessThan(844);
  expect(box.height,route).toBeGreaterThanOrEqual(24);
 }
 await page.goto('/v2/cont');
 await page.getByRole('link',{name:'Explorează fără cont',exact:true}).click();
 await expect(page).not.toHaveURL(/\/v2\/cont/);
});

test('connecting keeps the choices: the account asks, and adds them only after a yes',async({page,browser,baseURL})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await page.goto('/v2/retete/piure-morcov');await page.getByRole('button',{name:/^Salvează Piure/}).click();
 const chosen=await planFive(page);
 await page.locator('.v2-sync-status a').click();await expect(page).toHaveURL(/\/v2\/cont/);
 const account=await signup(page);
 const prompt=page.getByRole('region',{name:'Alegerile de pe acest dispozitiv'});
 await expect(prompt).toContainText('1 idee salvată');await expect(prompt).toContainText('5 mese planificate');
 // Nothing moves before the answer.
 await page.goto('/v2/plan');await expect(page.getByRole('region',{name:'Alegerile de pe acest dispozitiv'})).toBeVisible();expect(await planned(page)).toEqual([]);
 await page.getByRole('button',{name:'Adaugă în cont',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Am adăugat în cont 1 idee și 5 mese'})).toBeVisible({timeout:30000});
 await expect.poll(()=>planned(page),{timeout:30000}).toEqual(chosen);
 await page.getByRole('button',{name:'Am înțeles',exact:true}).click();
 await page.reload();await expect(page.getByRole('region',{name:'Alegerile de pe acest dispozitiv'})).toHaveCount(0);
 // Another device, same account: the data is on the server now.
 const other=await browser.newContext({baseURL,viewport:{width:390,height:844}});const second=await other.newPage();
 try{
  await second.goto('/v2/cont');await second.getByLabel('Email de test',{exact:true}).fill(account.email);await second.getByLabel('Parola contului de test',{exact:true}).fill(account.password);
  await second.getByRole('button',{name:'Conectare în test',exact:true}).click();await expect(second).toHaveURL(/\/v2\/azi/,{timeout:30000});
  await second.goto('/v2/plan');await expect.poll(()=>planned(second),{timeout:30000}).toEqual(chosen);
 }finally{await other.close();}
});

test('"Nu acum" adds nothing, and logout leaves no account data on the device',async({page})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 await page.goto('/v2/retete/piure-morcov');await page.getByRole('button',{name:/^Salvează Piure/}).click();
 await page.goto('/v2/cont');const account=await signup(page);
 const prompt=page.getByRole('region',{name:'Alegerile de pe acest dispozitiv'});
 await expect(prompt).toBeVisible();await page.getByRole('button',{name:'Nu acum',exact:true}).click();await expect(prompt).toHaveCount(0);
 await page.goto('/v2/idei?salvate=1');await expect(page.getByRole('heading',{name:'Nu am găsit o combinație deocamdată'})).toBeVisible();
 // An idea saved in the account stays in the account.
 await page.goto('/v2/retete/piure-dovlecel');await page.getByRole('button',{name:/^Salvează Piure/}).click();await expect(page.getByRole('button',{name:/^Elimină Piure/})).toBeVisible({timeout:20000});
 await page.goto('/v2/cont');await page.getByRole('button',{name:'Deconectare',exact:true}).click();await expect(page.getByLabel('Email de test',{exact:true})).toBeVisible({timeout:30000});
 const stored=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));
 expect(stored).not.toContain(account.email);expect(stored).not.toContain(account.password);expect(stored).not.toContain('access_token');
 await page.goto('/v2/retete/piure-dovlecel');await expect(page.getByRole('button',{name:/^Salvează Piure/})).toBeVisible();
 await page.goto('/v2/retete/piure-morcov');await expect(page.getByRole('button',{name:/^Elimină Piure/})).toBeVisible();
});
