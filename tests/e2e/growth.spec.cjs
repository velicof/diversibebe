const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs'),path=require('node:path');
const accounts=JSON.parse(fs.readFileSync(process.env.V2_TEST_ACCESS_FILE || path.resolve(__dirname,'../../../finalization/local-test-access.json'),'utf8')).accounts;
const out=process.env.V2_QA_CAPTURE_DIR||path.resolve(__dirname,'../../../../outputs/growth-2026-10-30/after');
test.beforeEach(async({context})=>{await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());});
async function choose(page,challenge='Nu am suficient timp',age='Aproximativ 6–8',context='Sub 15 minute'){
 await page.goto('/v2/onboarding');
 await expect(page.locator('.gw-journey')).toBeVisible();
 const change=page.getByRole('button',{name:/Schimbă răspunsurile/});if(await change.isVisible())await change.click();
 await page.getByRole('button',{name:new RegExp('^'+challenge)}).click();
 await page.getByRole('button',{name:'Continuă',exact:true}).click();
 await page.getByRole('button',{name:new RegExp('^'+age)}).click();
 await page.getByRole('button',{name:'Continuă',exact:true}).click();
 if(context){await page.getByRole('button',{name:new RegExp('^'+context)}).click();await page.getByRole('button',{name:'Vezi rezultatul meu',exact:true}).click();}
 else await page.getByRole('button',{name:'Sar peste acest pas',exact:true}).click();
}
async function login(page,index=0){
 await page.goto('/v2/cont');await page.getByLabel('Email de test').fill(accounts[index].email);await page.getByLabel('Parola contului de test').fill(accounts[index].password);await page.getByRole('button',{name:'Conectare în test',exact:true}).click();await expect(page).toHaveURL(/\/v2\/(azi|onboarding)/);
}
async function diagnostics(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('diversibebe:v2:growth-funnel:test:1')||'[]'));}
test('growth: first visit demonstrates the product before any account request',async({page})=>{
 await page.goto('/v2');await expect(page.getByRole('heading',{level:1})).toContainText('Mai puțin timp');
 await expect(page.getByRole('link',{name:'Hai să găsim o idee de masă',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:/Conectează contul/})).toHaveCount(0);
 await expect(page.locator('input[type=email],form[action*=checkout]')).toHaveCount(0);
 await expect(page.locator('.gw-demo-recipes .v2-recipe-card')).toHaveCount(2);
 await page.getByRole('button',{name:'15 minute',exact:true}).click();await expect(page.getByRole('button',{name:'15 minute',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.gw-demo-recipes .v2-recipe-card')).toHaveCount(1);
 await page.locator('.gw-demo-recipes').getByRole('link',{name:'Vezi rețeta',exact:true}).first().click();await expect(page).toHaveURL(/\/v2\/retete\//);
 const events=await diagnostics(page);expect(events.some(e=>e.name==='homepage_view')).toBe(true);expect(events.some(e=>e.name==='recipe_opened')).toBe(true);
});
test('growth: full journey survives back, refresh, save and repeated result views',async({page})=>{
 await page.goto('/v2/onboarding');await page.getByRole('button',{name:/^Nu am suficient timp/}).click();await page.getByRole('button',{name:'Continuă',exact:true}).click();
 await page.reload();await expect(page.getByRole('heading',{level:1})).toContainText('În ce etapă');await page.getByRole('button',{name:/^Aproximativ 6–8/}).click();
 await page.getByRole('button',{name:'Înapoi',exact:true}).click();await expect(page.getByRole('button',{name:/^Nu am suficient timp/})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Continuă',exact:true}).click();await expect(page.getByRole('button',{name:/^Aproximativ 6–8/})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Continuă',exact:true}).click();await page.getByRole('button',{name:/^Sub 15 minute/}).click();await page.getByRole('button',{name:'Vezi rezultatul meu',exact:true}).click();
 await expect(page.locator('[data-result-recipe]')).toHaveCount(3);const ids=await page.locator('[data-result-recipe]').evaluateAll(xs=>xs.map(x=>x.dataset.resultRecipe));
 for(const text of await page.locator('.gw-result-grid .v2-time-badge').allTextContents())expect(parseInt(text)).toBeLessThan(15);
 await expect(page.getByRole('link',{name:process.env.V2_NATIVE==='1'?'Salvează în cont sau creează un cont':'Continuă cu contul de test',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Salvează ideile mele',exact:true}).click();await expect(page.getByRole('button',{name:'Rezultat păstrat',exact:true})).toBeDisabled();
 await page.reload();await expect(page.locator('[data-result-recipe]')).toHaveCount(ids.length);expect(await page.locator('[data-result-recipe]').evaluateAll(xs=>xs.map(x=>x.dataset.resultRecipe))).toEqual(ids);
 await expect(page.getByRole('button',{name:'Rezultat păstrat',exact:true})).toBeDisabled();
 await page.goto('/v2/azi');await page.goBack();await expect(page.locator('[data-result-recipe]')).toHaveCount(ids.length);
 const events=await diagnostics(page);expect(events.filter(e=>e.name==='personalized_result_viewed')).toHaveLength(1);expect(events.filter(e=>e.name==='question_completed')).toHaveLength(3);expect(events.some(e=>e.name==='result_saved')).toBe(true);
 for(const event of events)expect(Object.keys(event.properties).filter(k=>['age','babyId','childId','email','name','challenge','pantry','ingredients','diagnosis'].includes(k))).toEqual([]);
 expect(events.filter(e=>e.name.startsWith('signup_'))).toHaveLength(0);
});
test('growth: pre-diversification gets educational value, no meal recommendations',async({page})=>{
 await choose(page,'Suntem la început','Încă nu am început',null);
 await expect(page.getByRole('heading',{level:1})).toContainText('Un început mai liniștit');await expect(page.locator('[data-result-recipe]')).toHaveCount(0);await expect(page.locator('.gw-education-card')).toHaveCount(3);
 await page.getByRole('button',{name:'Păstrează ghidul meu',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Rezultat păstrat',exact:true})).toBeDisabled();
 await page.getByRole('link',{name:'Continuă în spațiul meu',exact:true}).click();await expect(page.locator('.gw-dashboard-focus')).toContainText('Mai întâi, un început liniștit');await expect(page.locator('.v2-featured-area .v2-recipe-card')).toHaveCount(0);
 await page.goto('/v2/retete/piure-dovlecel');await expect(page.getByRole('button',{name:'Adaugă în plan',exact:true})).toBeDisabled();
});
// Since 2026-11-02 every single fridge ingredient has at least one 6–8 month idea in the demo catalog
// (editorial shortlist), so no onboarding path reaches the empty state; it stays covered in tests/growth.test.cjs.
test('growth: a selected fridge ingredient is respected and the selected constraints are kept',async({page})=>{
 await page.goto('/v2/onboarding');await page.getByRole('button',{name:/^Nu mai știu/}).click();await page.getByRole('button',{name:'Continuă',exact:true}).click();await page.getByRole('button',{name:/^Aproximativ 6–8/}).click();await page.getByRole('button',{name:'Continuă',exact:true}).click();await page.getByRole('button',{name:/^Rețete din ce am/}).click();await page.getByRole('button',{name:'Broccoli',exact:true}).click();await page.getByRole('button',{name:'Vezi rezultatul meu',exact:true}).click();
 await expect(page.locator('[data-result-recipe]').first()).toBeVisible();await expect(page.getByText('Include un ingredient ales din frigiderul tău').first()).toBeVisible();expect((await diagnostics(page)).find(e=>e.name==='personalized_result_viewed').properties.valueKind).not.toBe('empty');
 await page.getByRole('button',{name:/Schimbă răspunsurile/}).click();await expect(page.getByRole('button',{name:/^Nu mai știu/})).toHaveAttribute('aria-pressed','true');
});
test('growth: optional context may be skipped and planning remains available',async({page})=>{
 await choose(page,'Vreau să organizez','19–24 luni',null);await expect(page.locator('[data-result-recipe]')).toHaveCount(3);await page.getByRole('link',{name:'Deschide planul meu',exact:true}).click();await expect(page).toHaveURL('/v2/plan');
 await page.goto('/v2/azi');await expect(page.locator('.gw-dashboard-focus')).toContainText('Doar următoarele trei zile');
});
for(const [challenge,context] of [['Refuză multe alimente','Mese fără presiune'],['Caut informații clare','Să aflu cum se servesc'],['Suntem la început','Să înțeleg semnele']])test(`growth: ${challenge} has contextual educational resources`,async({page})=>{
 await choose(page,challenge,'9–12 luni',context);await expect(page.locator('.gw-education-card')).toHaveCount(3);await expect(page.locator('[data-result-recipe]')).toHaveCount(0);
});
test('growth: result handoff survives test login and explicit save to account',async({page})=>{
 await choose(page,'Nu mai știu','Aproximativ 6–8','O idee pentru masa');const ids=await page.locator('[data-result-recipe]').evaluateAll(xs=>xs.map(x=>x.dataset.resultRecipe));
 await page.getByRole('button',{name:'Salvează ideile mele',exact:true}).click();await page.getByRole('link',{name:process.env.V2_NATIVE==='1'?'Salvează în cont sau creează un cont':'Continuă cu contul de test',exact:true}).click();
 await page.getByLabel('Email de test').fill(accounts[0].email);await page.getByLabel('Parola contului de test').fill(accounts[0].password);await page.getByRole('button',{name:'Conectare în test',exact:true}).click();
 await expect(page).toHaveURL(/onboarding\?rezultat=1/);await expect(page.getByRole('heading',{level:1})).toContainText('Un punct de pornire');expect(await page.locator('[data-result-recipe]').evaluateAll(xs=>xs.map(x=>x.dataset.resultRecipe))).toEqual(ids);
 const save=page.getByRole('button',{name:'Salvează ideile mele',exact:true});if(await save.count())await save.click();await expect(page.getByRole('button',{name:'Rezultat păstrat',exact:true})).toBeDisabled();await page.reload();await expect(page.getByRole('button',{name:'Rezultat păstrat',exact:true})).toBeDisabled();
 expect((await diagnostics(page)).filter(e=>e.name==='login_completed')).toHaveLength(1);expect((await diagnostics(page)).filter(e=>e.name==='signup_completed')).toHaveLength(0);
});
test('growth: authenticated preferences do not overwrite the selected child profile',async({page})=>{
 await login(page);await page.goto('/v2/profil');const before=await page.locator('.v2-stage-options button[aria-pressed=true] strong').textContent();await choose(page,'Vreau să organizez','Peste 2 ani',null);await expect(page.locator('.gw-result-page')).toContainText('nu îl suprascriu');await page.goto('/v2/profil');expect(await page.locator('.v2-stage-options button[aria-pressed=true] strong').textContent()).toBe(before);
});
test('growth: preferences never cross accounts without an explicit guest handoff',async({page})=>{
 await login(page);await choose(page,'Nu am suficient timp','13–18 luni',null);await page.goto('/v2/cont');await page.getByRole('button',{name:'Deconectare',exact:true}).click();await expect(page.getByLabel('Email de test')).toBeVisible();await page.getByLabel('Email de test').fill(accounts[1].email);await page.getByLabel('Parola contului de test').fill(accounts[1].password);await page.getByRole('button',{name:'Conectare în test',exact:true}).click();await expect(page).toHaveURL('/v2/azi');await page.goto('/v2/onboarding');await expect(page.getByRole('heading',{level:1})).toContainText('Care e cea mai mare provocare');
});
test('growth: keyboard selection, focus progression and safety resource work without login',async({page})=>{
 await page.goto('/v2/onboarding');const answer=page.getByRole('button',{name:/^Nu mai știu/});await answer.focus();await page.keyboard.press('Space');await expect(answer).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Continuă',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await page.getByRole('link',{name:/Resurse de siguranță/}).click();await expect(page).toHaveURL('/v2/pregatire');await expect(page.locator('.gw-education-card')).toHaveCount(3);await expect(page.locator('input[type=email]')).toHaveCount(0);
});
test('growth: classic comparison is inspectable and has its own funnel dimension',async({page})=>{
 await page.goto('/v2?parcurs=clasic&mesaj=B');await expect(page.getByRole('heading',{level:1})).toContainText('Mese mici.');await page.getByRole('link',{name:/Personalizează explorarea/}).click();await expect(page.getByRole('button',{name:/Primele descoperiri/})).toBeVisible();await page.getByRole('button',{name:/Primele descoperiri/}).click();await page.getByRole('button',{name:'Continuă',exact:true}).click();await page.getByRole('button',{name:'Să descoperim idei',exact:true}).click();await expect(page).toHaveURL('/v2/azi');expect((await diagnostics(page)).some(e=>e.name==='personalized_result_viewed'&&e.properties.flow==='classic')).toBe(true);
});
test('growth: a return after two days is recorded locally without simulating a real cohort',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('diversibebe:v2:last-visit:1',JSON.stringify({at:Date.now()-2*86400000})));await page.goto('/v2');await expect.poll(async()=>(await diagnostics(page)).filter(e=>e.name==='return_visit').length).toBe(1);expect((await diagnostics(page)).find(e=>e.name==='return_visit').properties.daysSinceLastVisit).toBe(2);
});
for(const width of [320,390,768,1440])test(`growth: visual journey and accessibility at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width>=768?1000:844});await page.goto('/v2',{waitUntil:'networkidle'});await page.screenshot({path:path.join(out,`growth-homepage-${width}.png`),fullPage:true});
 await page.goto('/v2/onboarding',{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:/^Nu am suficient timp/})).toBeVisible();await page.screenshot({path:path.join(out,`growth-question-${width}.png`),fullPage:true});
 await choose(page);await page.screenshot({path:path.join(out,`growth-result-${width}.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('growth: changing the existing profile back to preparation suppresses previous suggestions',async({page})=>{
 await choose(page);await page.goto('/v2/profil');await page.getByRole('button',{name:/Încă ne pregătim/}).click();await page.goto('/v2/azi');await expect(page.locator('.v2-featured-area .v2-recipe-card')).toHaveCount(0);await expect(page.locator('.gw-dashboard-focus')).toContainText('Mai întâi, un început liniștit');await page.goto('/v2/onboarding');await expect(page.locator('[data-result-recipe]')).toHaveCount(0);
});
test('growth: blocked browser storage is explained while the current journey remains usable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked by test');}}));await choose(page);await expect(page.locator('[data-result-recipe]')).toHaveCount(3);await expect(page.locator('.gw-journey')).toContainText('Browserul nu permite salvarea');await page.getByRole('button',{name:'Salvează ideile mele',exact:true}).click();await expect(page.locator('.gw-save-result')).toContainText('această sesiune');
});
for(const [variant,title] of [['A','Ce îi gătim azi?'],['C','Fiecare copil are ritmul lui.']])test(`growth: headline ${variant} is inspectable without changing the guided flow`,async({page})=>{
 await page.goto(`/v2?mesaj=${variant}&parcurs=nou`);await expect(page.getByRole('heading',{level:1})).toContainText(title);await expect(page.locator('.gw-hero:visible')).toBeVisible();await expect.poll(async()=>(await diagnostics(page)).filter(e=>e.name==='homepage_view').at(-1)?.properties.message).toBe(variant);
});
