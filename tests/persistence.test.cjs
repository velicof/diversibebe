const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDatabase,asUser,USERS,CHILDREN}=require('./fixtures/database.cjs');
const call=(d,id,action,payload)=>d.query('SELECT public.v2_apply_action($1,$2,$3::jsonb) AS value',[id,action,JSON.stringify(payload)]);
test('current schema upgrade persists all six models and isolates accounts and siblings',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{
   await call(d,CHILDREN.A,'profile',{stage:8,introduced:['dovlecel','morcov']});
   await call(d,CHILDREN.A,'favorite',{recipeId:'piure-dovlecel',enabled:true});
   await call(d,CHILDREN.A,'favorite',{recipeId:'piure-dovlecel',enabled:true});
   await call(d,CHILDREN.A,'plan',{slot:'2026-10-28',recipeId:'piure-dovlecel'});
   await call(d,CHILDREN.A,'preferences',{pantry:['morcov'],shoppingChecked:['1 morcov']});
   await call(d,CHILDREN.A,'confirm',{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',recipeId:'piure-dovlecel',confirmedAt:'2001-01-01'});
   await call(d,CHILDREN.A,'confirm',{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccd',recipeId:'piure-dovlecel'});
   const value=(await d.query('SELECT public.v2_load_state($1) AS value',[CHILDREN.A])).rows[0].value;
   assert.equal(value.stage,8);assert.equal(value.favorites.length,1);assert.equal(value.plan.length,1);assert.equal(value.uses.length,1);assert.deepEqual(value.shoppingChecked,['1 morcov']);
   assert.ok(new Date(value.uses[0].confirmedAt)>new Date('2026-01-01'));
   const sibling=(await d.query('SELECT public.v2_load_state($1) AS value',[CHILDREN.A2])).rows[0].value;
   assert.equal(sibling.plan.length,0);assert.equal(sibling.introduced.length,0);assert.equal(sibling.uses.length,0);assert.equal(sibling.favorites.length,1);
  });
  await asUser(db,USERS.B,async d=>{const value=(await d.query('SELECT public.v2_load_state($1) AS value',[CHILDREN.B])).rows[0].value;assert.equal(value.favorites.length,0);assert.equal(value.plan.length,0);});
  await assert.rejects(asUser(db,USERS.B,d=>d.query('SELECT public.v2_load_state($1)',[CHILDREN.A])),/child unavailable/);
  await assert.rejects(asUser(db,USERS.B,d=>call(d,CHILDREN.A,'plan',{slot:'2026-10-28',recipeId:'piure-dovlecel'})),/child unavailable/);
  await assert.rejects(asUser(db,null,d=>d.query('SELECT public.v2_load_state(null)')),/permission denied/);
  await assert.rejects(asUser(db,USERS.A,d=>d.exec("UPDATE public.cooked_recipes SET cooked_at='2001-01-01' WHERE source='v2_confirmed'")),/immutable/);
  await asUser(db,USERS.A,d=>call(d,CHILDREN.A,'profile',{stage:0,introduced:[]}));
  await assert.rejects(asUser(db,USERS.A,d=>call(d,CHILDREN.A,'plan',{slot:'2026-10-29',recipeId:'piure-dovlecel'})),/preparation/);
  await assert.rejects(asUser(db,USERS.A,d=>d.query("INSERT INTO public.cooked_recipes(user_id,baby_id,recipe_id,source) VALUES($1,$2,'piure-dovlecel','v2_confirmed')",[USERS.A,CHILDREN.A])),/preparation/);
  // An allergy filters recipes on the device (src/features/v2/allergy.ts); it no longer refuses the whole family.
  // Product decision of 11 Nov 2026; the record is kept and still reported, ownership is still enforced.
  await db.query("INSERT INTO public.allergy_records(user_id,baby_id,food_name) VALUES($1,$2,'SYNTHETIC')",[USERS.B,CHILDREN.B]);
  await db.query("INSERT INTO public.allergy_records(user_id,baby_id,food_name) VALUES($1,NULL,'SYNTHETIC-ACCOUNT')",[USERS.B]);
  await asUser(db,USERS.B,async d=>{
   await call(d,CHILDREN.B,'profile',{stage:8,introduced:[]});
   await call(d,CHILDREN.B,'plan',{slot:'2026-10-28',recipeId:'piure-dovlecel'});
   await call(d,CHILDREN.B,'confirm',{id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',recipeId:'piure-dovlecel'});
   const value=(await d.query('SELECT public.v2_load_state($1) AS value',[CHILDREN.B])).rows[0].value;
   assert.equal(value.requiresClinicalGuidance,true,'the allergy is still reported');
   assert.equal(value.plan.length,1);assert.equal(value.uses.length,1);
  });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.allergy_records WHERE user_id=$1",[USERS.B])).rows[0].n,2,'allergy records are kept');
  await assert.rejects(asUser(db,USERS.B,d=>call(d,CHILDREN.A,'plan',{slot:'2026-10-30',recipeId:'piure-dovlecel'})),/child unavailable/);
 }finally{await db.close();}
});
test('analytics uses server timestamps, deduplicates IDs and excludes sensitive payloads',async()=>{
 const db=await createDatabase();try{
  const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  await asUser(db,USERS.A,async d=>{await d.query("SELECT public.v2_record_event($1,'meal_selected','{\"elapsedMs\":2000}')",[id]);await d.query("SELECT public.v2_record_event($1,'meal_selected','{\"elapsedMs\":2000}')",[id]);});
  const event=(await db.query('SELECT * FROM public.product_events')).rows;
  assert.equal(event.length,1);assert.equal(event[0].is_test,true);assert.deepEqual(event[0].properties,{elapsedMs:2000});
  await assert.rejects(asUser(db,USERS.A,d=>d.query("SELECT public.v2_record_event(gen_random_uuid(),'meal_selected','{\"diagnosis\":\"PRIVATE\"}')")),/invalid analytics properties|check constraint/);
  await asUser(db,USERS.B,async d=>assert.equal((await d.query('SELECT * FROM public.product_events')).rows.length,0));
 }finally{await db.close();}
});

test('a visitor plan enters an account only if it suits the child of that account',()=>{
  const {importableFromGuest}=require('./load-ts.cjs').load('src/features/v2/cloud/guest-import.ts');
  const recipes=[{id:'piure',published:true,minimumMonths:6},{id:'adult',published:true,minimumMonths:12},{id:'ficat',published:false,minimumMonths:6}];
  const local={favorites:['piure','necunoscut','adult'],plan:[{slot:'2026-11-05',recipeId:'piure'},{slot:'2026-11-06',recipeId:'adult'},{slot:'2026-11-07',recipeId:'ficat'},{slot:'2026-11-08',recipeId:'piure'},{slot:'2026-11-01',recipeId:'piure'},{slot:'2026-11-09',recipeId:'necunoscut'}]};
  const account={favorites:['adult'],plan:[{slot:'2026-11-08',recipeId:'adult'}],stage:6};
  const plain=v=>JSON.parse(JSON.stringify(v));
  const result=plain(importableFromGuest(local,account,false,recipes,'2026-11-05'));
  assert.deepEqual(result.favorites,['piure'],'known, and not already in the account');
  assert.deepEqual(result.plan,[{slot:'2026-11-05',recipeId:'piure'}],'not too old for the child, not unpublished, not past, and a taken day stays as it is');
  assert.equal(result.skipped,2,'the 12+ meal and the unpublished one are reported');
  // The check on age covers saved ideas too, and a day that is taken is reported, never replaced.
  const younger=plain(importableFromGuest({favorites:['adult','piure'],plan:[]},{favorites:[],plan:[],stage:6},false,recipes,'2026-11-05'));
  assert.deepEqual(younger.favorites,['piure'],'an idea for 12+ does not enter the account of a child of 6 months');
  assert.equal(younger.skipped,1);
  assert.deepEqual(plain(importableFromGuest({favorites:['piure'],plan:[]},{favorites:[],plan:[],stage:0},false,recipes,'2026-11-05')).favorites,[],'under 6 months: no meal ideas');
  const taken=plain(importableFromGuest({favorites:[],plan:[{slot:'2026-11-08',recipeId:'piure'},{slot:'2026-11-09',recipeId:'adult'}]},{favorites:[],plan:[{slot:'2026-11-08',recipeId:'adult'},{slot:'2026-11-09',recipeId:'adult'}],stage:12},false,recipes,'2026-11-05'));
  assert.deepEqual(taken.plan,[],'nothing replaces what the account already planned');
  assert.equal(taken.kept,1,'a different meal on that day is reported; the same meal (already imported) is not');
  const twelve=plain(importableFromGuest(local,{...account,stage:12},false,recipes,'2026-11-05'));
  assert.deepEqual(twelve.plan.map(p=>p.recipeId),['piure','adult']);
  for(const blocked of [plain(importableFromGuest(local,{...account,stage:0},false,recipes,'2026-11-05')),plain(importableFromGuest(local,{...account,stage:12},true,recipes,'2026-11-05'))])assert.deepEqual(blocked.plan,[],'preparation stage or clinical guidance: no meals');
});
