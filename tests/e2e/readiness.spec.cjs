const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const path=require('node:path');
const captures=process.env.V2_QA_CAPTURE_DIR||path.resolve(__dirname,'../../../../outputs/mvp-final/capturi');
test.beforeEach(async({context})=>{
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
for(const width of [320,375,390,430,768,1440]) test(`account layout and touch targets at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width>=768?1000:844});await page.goto('/v2/cont',{waitUntil:'networkidle'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:path.join(captures,`cont-${width}.png`),fullPage:true});
 const controls=await page.locator('input,select,button,.v2-bottom-nav a').evaluateAll(items=>items.filter(el=>el.getBoundingClientRect().width>0).map(el=>({label:el.getAttribute('aria-label')||el.textContent||el.id,height:el.getBoundingClientRect().height})));
 expect(controls.filter(c=>c.height<44)).toEqual([]);
});
test('account accessibility, local SEO and manifest have no private offline cache',async({page,request})=>{
 await page.goto('/v2/cont',{waitUntil:'networkidle'});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(axe.violations.map(v=>v.id)).toEqual([]);
 await expect(page.locator('html')).toHaveAttribute('lang','ro');
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','http://127.0.0.1:3100/v2/cont');
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
 const robots=await request.get('/robots.txt');expect(await robots.text()).toContain('Disallow: /');
 const sitemap=await request.get('/v2/sitemap.xml');expect(await sitemap.text()).not.toContain('<loc>');
 const manifest=await (await request.get('/v2/manifest.webmanifest')).json();
 expect(manifest.scope).toBe('/v2/');expect(manifest.icons.map(i=>i.sizes)).toEqual(['192x192','512x512']);
 expect((await request.get('/v2/icon-512.png')).status()).toBe(200);
 expect((await request.get('/v2/og.png')).status()).toBe(200);
 expect(await page.evaluate(async()=>('serviceWorker' in navigator)?(await navigator.serviceWorker.getRegistrations()).length:0)).toBe(0);
});
test('preparation stage has no suggestions or meal actions; Premium only measures interest',async({page})=>{
 await page.goto('/v2/profil');await page.getByRole('button',{name:/Încă ne pregătim/}).click();
 await page.goto('/v2/retete/piure-dovlecel');
 await expect(page.getByRole('button',{name:'Adaugă în plan',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Am folosit ideea',exact:true})).toBeDisabled();
 await page.goto('/v2/idei');await expect(page.getByRole('heading',{name:'Nu am găsit o combinație deocamdată'})).toBeVisible();
 await page.goto('/v2/premium');
 await page.getByRole('button',{name:'Mi-ar fi util',exact:true}).click();
 await expect(page.getByRole('button',{name:'Interes notat în sesiune'})).toBeDisabled();
 await page.getByRole('button',{name:'Mă interesează pachetul',exact:true}).click();
 await expect(page.getByRole('button',{name:'Interes notat pentru pachet'})).toBeDisabled();
 expect(await page.locator('form[action*="checkout"],iframe').count()).toBe(0);
});
