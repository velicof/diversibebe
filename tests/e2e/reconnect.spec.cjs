// A signed-in family whose data fails to load for a moment is still a signed-in family: never shown as a
// visitor, never offered "Conectează-te", never writing a visitor's copy on the device. Retries are automatic;
// only a session the server rejects turns the page back into a visitor's.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto');
const native=process.env.V2_NATIVE==='1';
test.skip(!native,'Real GoTrue/PostgREST runtime only');
test.setTimeout(150000);
test.use({viewport:{width:390,height:844}});

const STORE='diversibebe:v2:isolated-preview:1';
const status=page=>page.locator('.v2-sync-status');
const connect=page=>page.locator('.v2-topbar').getByRole('link',{name:'Conectează-te',exact:true});
async function signup(page){
 const email=`reconnect-${crypto.randomUUID()}@example.test`,password=crypto.randomBytes(18).toString('base64url');
 await page.goto('/v2/cont?nou=1');
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
 await page.getByLabel('În ce etapă este copilul?').selectOption('8');
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 await expect(status(page)).toContainText('Date sincronizate',{timeout:30000});
}
// The data call fails as a dropped connection would, a given number of times.
async function failLoads(page,times){
 let left=times;
 await page.route('**/rest/v1/rpc/v2_load_state',route=>{if(route.request().method()==='POST'&&left>0){left--;return route.abort('failed');}return route.continue();});
 return ()=>left;
}

test('a short outage: the account stays an account, then loads by itself',async({page})=>{
 await signup(page);
 const remaining=await failLoads(page,2);
 await page.goto('/v2/plan');
 await expect(status(page)).toContainText('se încarcă');
 await expect(status(page)).not.toContainText('Explorezi fără cont');
 await expect(connect(page)).toHaveCount(0);
 await expect(page.locator('.v2-device-note')).toHaveCount(0);
 await expect(status(page)).toContainText('Date sincronizate',{timeout:20000});
 expect(remaining()).toBe(0);
});

test('a long outage: said plainly, nothing saved on the device, and the retry button brings the account back',async({page})=>{
 await signup(page);
 const before=await page.evaluate(k=>localStorage.getItem(k),STORE);
 await failLoads(page,99);
 await page.goto('/v2/cont');
 // Automatic retries (1 + 3 + 8 s), then the plain message, with no login form for a session that exists.
 await expect(page.getByText('Nu am putut încărca datele contului',{exact:false}).first()).toBeVisible({timeout:30000});
 await expect(page.getByLabel('Email de test',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Deconectare',exact:true})).toBeVisible();
 // A save attempted meanwhile is refused, not stored as a visitor's.
 await page.goto('/v2/retete/piure-morcov');
 await expect(status(page)).not.toContainText('Explorezi fără cont');
 await expect(connect(page)).toHaveCount(0);
 const saveButtons=page.getByRole('button',{name:/^Salvează Piure/});
 if(await saveButtons.count())await expect(saveButtons.first()).toBeDisabled();
 expect(await page.evaluate(k=>localStorage.getItem(k),STORE),'no visitor copy written').toBe(before);
 // This page has given up retrying; the connection comes back: one tap, on the same page, reloads the account.
 const retry=status(page).getByRole('button',{name:'Reîncearcă',exact:true});
 await expect(retry).toBeVisible({timeout:30000});
 await page.unrouteAll({behavior:'ignoreErrors'});
 await retry.click();
 await expect(status(page)).toContainText('Date sincronizate',{timeout:30000});
 // And a page opened once the network is back connects by itself.
 await page.goto('/v2/azi');
 await expect(status(page)).toContainText('Date sincronizate',{timeout:30000});
});

test('a session the server rejects is a visitor again, as before',async({page})=>{
 await signup(page);
 await page.route('**/auth/v1/user',route=>route.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:401,error_code:'bad_jwt',msg:'invalid JWT'})}));
 await page.goto('/v2/azi');
 await expect(status(page)).toContainText('Explorezi fără cont',{timeout:30000});
 await expect(connect(page)).toBeVisible();
});
