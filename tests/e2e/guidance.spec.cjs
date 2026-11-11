// A family whose account holds an allergy (recorded in V1) gets no meal suggestions, by design: the page must
// say why, and where to see the allergy, instead of looking empty or broken. The page also says V2 shows
// only the eight base ingredients and links to the full history in V1.
const {test,expect}=require('@playwright/test'),crypto=require('node:crypto');
const native=process.env.V2_NATIVE==='1';
test.setTimeout(150000);
test.use({viewport:{width:390,height:844}});
const REASON='Contul tău are o alergie înregistrată';

test('an allergy in the account: no suggestions, and every page says why and where to look',async({page,request})=>{
 test.skip(!native,'Real GoTrue/PostgREST runtime only');
 const email=`guidance-${crypto.randomUUID()}@example.test`,password=crypto.randomBytes(18).toString('base64url');
 await page.goto('/v2/cont?nou=1');
 await page.getByLabel('Email de test',{exact:true}).fill(email);
 await page.getByLabel('Parola contului de test',{exact:true}).fill(password);
 await page.getByLabel('În ce etapă este copilul?').selectOption('12');
 await page.getByRole('button',{name:'Creează și salvează în cont',exact:true}).click();
 await expect(page).toHaveURL(/\/v2\/azi/,{timeout:30000});
 // As V1 records them: an allergy without a child.
 const api=process.env.V2_TEST_API_URL,key=process.env.V2_TEST_ANON_KEY;
 const session=await (await request.post(`${api}/auth/v1/token?grant_type=password`,{headers:{apikey:key,'Content-Type':'application/json'},data:{email,password}})).json();
 const h={apikey:key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
 expect((await request.post(`${api}/rest/v1/allergy_records`,{headers:h,data:{user_id:session.user.id,food_id:'ou',food_name:'Ou',severity:'usoara'}})).ok()).toBe(true);

 await page.goto('/v2/idei');
 await expect(page.getByRole('heading',{name:'Aici e nevoie de îndrumare individuală'})).toBeVisible({timeout:30000});
 const reason=page.locator('.v2-guidance-reason').first();
 await expect(reason).toContainText(REASON);
 await expect(reason.getByRole('link',{name:'Vezi alergiile înregistrate'})).toHaveAttribute('href','/alergii');

 await page.goto('/v2/plan');
 await expect(page.getByRole('button',{name:'Arată 5 zile de mese',exact:true})).toBeDisabled({timeout:30000});
 await expect(page.locator('.v2-guidance-reason').first()).toContainText(REASON);

 await page.goto('/v2/profil');
 await expect(page.getByLabel('Oprește sugestiile personalizate în această sesiune')).toBeDisabled({timeout:30000});
 await expect(page.locator('.v2-allergen-note .v2-guidance-reason')).toContainText(REASON);
 // V2 keeps only the eight base ingredients; the page says so and links to the full history in V1.
 await expect(page.getByRole('link',{name:'Alimente încercate'})).toHaveAttribute('href','/alimente');
});

test('a visitor who pauses suggestions is told how to turn them back on',async({page})=>{
 await page.goto('/v2/profil');
 await page.getByLabel('Oprește sugestiile personalizate în această sesiune').check();
 await page.locator('.v2-bottom-nav').getByRole('link',{name:'Descoperă'}).click();
 await expect(page.getByRole('heading',{name:'Aici e nevoie de îndrumare individuală'})).toBeVisible();
 const reason=page.locator('.v2-guidance-reason').first();
 await expect(reason).toContainText('Ai oprit sugestiile pentru această sesiune');
 await expect(reason.getByRole('link',{name:'Le poți porni din Profil'})).toHaveAttribute('href','/v2/profil');
});
