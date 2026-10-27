const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try{
  for(const width of [390,1440]) for(const route of ['/v2','/v2/azi','/v2/idei']){
   const page=await browser.newPage({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});
   await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
   await page.addInitScript(()=>{
    window.__qaVitals={lcp:0,cls:0};
    new PerformanceObserver(list=>{window.__qaVitals.lcp=list.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput) window.__qaVitals.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
   });
   await page.goto('http://127.0.0.1:3100'+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   results.push({route,width,...await page.evaluate(()=>({navigationMs:Math.round(performance.getEntriesByType('navigation')[0].loadEventEnd),lcpMs:Math.round(window.__qaVitals.lcp),cls:window.__qaVitals.cls,transferBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.transferSize,0),jsBytes:performance.getEntriesByType('resource').filter(r=>r.name.includes('.js')).reduce((s,r)=>s+r.transferSize,0)}))});
   if(route==='/v2'||route==='/v2/azi') await page.screenshot({path:path.resolve(__dirname,`../../../outputs/mvp-final/capturi/${route==='/v2'?'landing':'dashboard'}-viewport-${width}.png`)});
   await page.close();
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.resolve(__dirname,'../../finalization/performance-local.json'),JSON.stringify({method:'Chromium loopback, unthrottled, fresh context per sample. Not Lighthouse or field data.',samples:results},null,2));
 console.log(JSON.stringify(results));
})().catch(e=>{console.error(e.message);process.exit(1);});
