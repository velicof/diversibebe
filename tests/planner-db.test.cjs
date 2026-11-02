const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDatabase,asUser,USERS,CHILDREN}=require('./fixtures/database.cjs');
const call=(d,id,action,payload)=>d.query('SELECT public.v2_apply_action($1,$2,$3::jsonb) AS value',[id,action,JSON.stringify(payload)]);
const load=async(d,id)=>(await d.query('SELECT public.v2_load_state($1) AS value',[id])).rows[0].value;
const days=['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'];
test('5-day plan, pantry shopping keys and planner events persist per child and per account',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{
   for(const [i,slot] of days.entries())await call(d,CHILDREN.A,'plan',{slot,recipeId:['piure-dovlecel','piure-morcov','piure-cartof-dulce','terci-ovaz-banana','piure-dovlecel'][i]});
   await call(d,CHILDREN.A,'plan',{slot:days[0],recipeId:'piure-morcov'});
   await call(d,CHILDREN.A,'preferences',{pantry:['p:morcov','n:ulei de masline'],shoppingChecked:['p:dovlecel']});
   const a=await load(d,CHILDREN.A);
   assert.equal(a.plan.length,5);
   assert.equal(a.plan.find(p=>p.slot===days[0]).recipeId,'piure-morcov','re-saving a day overwrites, never duplicates');
   assert.deepEqual(a.pantry,['p:morcov','n:ulei de masline']);
   assert.deepEqual(a.shoppingChecked,['p:dovlecel']);
   const sibling=await load(d,CHILDREN.A2);
   assert.equal(sibling.plan.length,0,'a sibling never sees the other child plan');
   for(const name of ['recipe_viewed','shopping_list_generated'])
    await d.query('SELECT public.v2_record_event($1,$2,$3::jsonb)',[crypto.randomUUID(),name,JSON.stringify(name==='shopping_list_generated'?{count:12}:{})]);
  });
  await assert.rejects(asUser(db,USERS.A,d=>d.query('SELECT public.v2_record_event($1,$2,$3::jsonb)',[crypto.randomUUID(),'child_name_logged','{}'])),/check constraint|invalid analytics/);
  await assert.rejects(asUser(db,USERS.A,d=>d.query('SELECT public.v2_record_event($1,$2,$3::jsonb)',[crypto.randomUUID(),'shopping_list_generated','{"recipe":"x"}'])),/check constraint|invalid analytics/);
  await asUser(db,USERS.B,async d=>{const b=await load(d,CHILDREN.B);assert.equal(b.plan.length,0);assert.deepEqual(b.pantry,[]);});
  await assert.rejects(asUser(db,USERS.B,d=>call(d,CHILDREN.A,'plan',{slot:days[1],recipeId:'piure-dovlecel'})),/child unavailable/);
  const counts=(await db.query("SELECT event_name,count(*)::int AS n FROM public.product_events WHERE event_name IN ('recipe_viewed','shopping_list_generated') GROUP BY 1 ORDER BY 1")).rows;
  assert.deepEqual(counts.map(r=>[r.event_name,r.n]),[['recipe_viewed',1],['shopping_list_generated',1]]);
 }finally{await db.close();}
});
