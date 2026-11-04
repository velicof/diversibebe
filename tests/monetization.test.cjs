// Monetization readiness: no payment code, safety stays free, and the events carry no personal data.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {load}=require('./load-ts.cjs');
const {createDatabase,asUser,USERS}=require('./fixtures/database.cjs');
const {FREE_FEATURES,PLUS_FEATURES,PRICE_OPTIONS}=load('src/features/v2/plans.ts');
const {makeEvent}=load('src/features/v2/analytics.ts');
const root=path.join(__dirname,'..');

test('food-safety information is free and is never a Plus feature',()=>{
  assert.ok(FREE_FEATURES.filter(f=>f.safety).length>=2);
  assert.equal(PLUS_FEATURES.filter(f=>f.safety).length,0);
  for(const f of PLUS_FEATURES)assert.doesNotMatch(f.label,/alerg|siguran|servire|medic/i,f.label);
  const free=new Set(FREE_FEATURES.map(f=>f.id));
  assert.equal(PLUS_FEATURES.filter(f=>free.has(f.id)).length,0,'a feature is either free or Plus');
});

test('the tested prices are 19, 24 and 29 lei per month, plus "would not pay"',()=>{
  assert.deepEqual([...PRICE_OPTIONS],[19,24,29,0]);
});

test('no payment provider or checkout exists in the code',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const deps=Object.keys({...pkg.dependencies,...pkg.devDependencies});
  assert.deepEqual(deps.filter(d=>/stripe|paddle|braintree|netopia|mobilpay|lemonsqueezy|revenuecat/i.test(d)),[]);
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.(ts|tsx)$/.test(e.name)?[path.join(d,e.name)]:[]);
  const offenders=walk(path.join(root,'src')).filter(f=>/checkout\.stripe|createCheckoutSession|paymentIntent/i.test(fs.readFileSync(f,'utf8')));
  assert.deepEqual(offenders,[]);
});

test('monetization events keep only numbers: names, allergies and free text are dropped',()=>{
  const dirty={price:24,count:3,childName:'Ana',allergy:'Lapte',recipeId:'x',note:'text liber'};
  for(const name of ['premium_interest','shopping_item_checked','shopping_list_generated','return_session']){
    const {properties}=makeEvent(name,dirty,'2026-11-04T10:00:00Z','id');
    for(const key of Object.keys(properties))assert.ok(['price','count'].includes(key),`${name}: ${key}`);
    assert.doesNotMatch(JSON.stringify(properties),/Ana|Lapte|text liber/);
  }
  assert.deepEqual({...makeEvent('premium_interest',{price:0},'2026-11-04T10:00:00Z','id').properties},{price:0},'"would not pay" is recorded');
});

test('the database accepts the shopping event, refuses extra properties, and the metrics hide small groups',async()=>{
  const db=await createDatabase();try{
    const insert=(id,name,props)=>asUser(db,USERS.A,d=>d.query('INSERT INTO public.product_events(id,user_id,event_name,properties) VALUES($1,$2,$3,$4)',[id,USERS.A,name,props]));
    await insert('c1111111-1111-4111-8111-111111111111','shopping_item_checked',{});
    await assert.rejects(insert('c2222222-2222-4222-8222-222222222222','shopping_item_checked',{childName:'Ana'}),'properties other than count, elapsedMs and price are refused');
    await assert.rejects(insert('c3333333-3333-4333-8333-333333333333','unknown_event',{}),'event names are an allowlist');
    await db.query("UPDATE public.product_events SET is_test=false");
    const sql=fs.readFileSync(path.join(root,'supabase/operations/v2-product-metrics.sql'),'utf8');
    const rows=(await db.query(sql)).rows;
    assert.deepEqual(Object.keys(rows[0]).sort(),['events','metric','people'],'aggregates only, no user ids');
    const shopping=rows.find(r=>r.metric==='shopping_item_checked');
    assert.equal(shopping.people,null,'a group under 5 people is hidden');
    for(let i=0;i<5;i++)await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2) ON CONFLICT DO NOTHING",[`d000000${i}-0000-4000-8000-000000000000`,`m${i}@example.test`]);
    for(let i=0;i<5;i++){
      await db.query("INSERT INTO public.profiles(id,email) VALUES($1,$2) ON CONFLICT DO NOTHING",[`d000000${i}-0000-4000-8000-000000000000`,`m${i}@example.test`]);
      await db.query("INSERT INTO public.product_events(id,user_id,event_name,properties,is_test) VALUES($1,$2,'premium_interest','{\"price\":24}',false)",[`e000000${i}-0000-4000-8000-000000000000`,`d000000${i}-0000-4000-8000-000000000000`]);
    }
    const after=(await db.query(sql)).rows;
    assert.equal(after.find(r=>r.metric==='price_24').people,5,'a group of 5 is reported');
  }finally{await db.close();}
});
