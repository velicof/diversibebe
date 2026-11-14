// Flexible planner in the database: several meals per child and day, an atomic save, the old client still
// working, existing rows kept, row-level security unchanged, and a rollback that never deletes silently.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createDatabase,asUser,USERS,CHILDREN}=require('./fixtures/database.cjs');
const {RELEASE}=require('../supabase/v2-release.cjs');
const call=(d,id,action,payload)=>d.query('SELECT public.v2_apply_action($1,$2,$3::jsonb) AS value',[id,action,JSON.stringify(payload)]).then(r=>r.rows[0].value);
const load=async(d,id)=>(await d.query('SELECT public.v2_load_state($1) AS value',[id])).rows[0].value;
const sql=name=>fs.readFileSync(path.join(__dirname,'..','supabase',name),'utf8');
const MIGRATION='20261113100000_v2_flexible_planner.sql';
// Days in Bucharest, as the server checks them.
const day=offset=>{const d=new Date(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bucharest'}).format(new Date())+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const rows=async db=>(await db.query('SELECT count(*)::int AS n FROM public.meal_plans')).rows[0].n;

test('an existing one-meal plan survives the migration as meal "oricare"; nothing is lost',async()=>{
 const db=await createDatabase(undefined,{migrations:false});try{
  for(const name of RELEASE.filter(n=>n!==MIGRATION))await db.exec(sql('migrations/'+name));
  await db.query('UPDATE public.babies SET feeding_stage=8');
  await asUser(db,USERS.A,async d=>{await call(d,CHILDREN.A,'plan',{slot:day(1),recipeId:'piure-dovlecel'});await call(d,CHILDREN.A,'plan',{slot:day(2),recipeId:'piure-morcov'});});
  const before=await rows(db);
  await db.exec(sql('migrations/'+MIGRATION));
  assert.equal(await rows(db),before);
  await asUser(db,USERS.A,async d=>{
   const s=await load(d,CHILDREN.A);
   assert.deepEqual(s.plan.map(p=>[p.slot,p.meal,p.recipeId]),[[day(1),'oricare','piure-dovlecel'],[day(2),'oricare','piure-morcov']]);
   assert.deepEqual(s.planner,{});
  });
 }finally{await db.close();}
});

test('several meals a day; the same meal is replaced, never duplicated; the old client still writes "oricare"',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{
   await call(d,CHILDREN.A,'plan',{slot:day(0),meal:'mic-dejun',recipeId:'terci-ovaz-banana'});
   await call(d,CHILDREN.A,'plan',{slot:day(0),meal:'pranz',recipeId:'piure-dovlecel'});
   await call(d,CHILDREN.A,'plan',{slot:day(0),meal:'pranz',recipeId:'piure-morcov'});
   await call(d,CHILDREN.A,'plan',{slot:day(0),recipeId:'piure-cartof-dulce'});
   const s=await load(d,CHILDREN.A);
   assert.deepEqual(s.plan.map(p=>[p.meal,p.recipeId]),[['mic-dejun','terci-ovaz-banana'],['pranz','piure-morcov'],['oricare','piure-cartof-dulce']]);
   await call(d,CHILDREN.A,'remove-plan',{slot:day(0),meal:'pranz'});
   assert.deepEqual((await load(d,CHILDREN.A)).plan.map(p=>p.meal),['mic-dejun','oricare'],'only that meal is removed');
   await call(d,CHILDREN.A,'remove-plan',{slot:day(0)});
   assert.deepEqual((await load(d,CHILDREN.A)).plan.map(p=>p.meal),['mic-dejun'],'without a meal: the untyped one, as before');
   assert.equal((await load(d,CHILDREN.A2)).plan.length,0,'a sibling never sees the other child plan');
  });
  await assert.rejects(asUser(db,USERS.A,d=>call(d,CHILDREN.A,'plan',{slot:day(1),meal:'brunch',recipeId:'piure-dovlecel'})),/invalid meal/);
 }finally{await db.close();}
});

test('plan-many is atomic: one invalid entry and nothing is saved; limits are enforced',async()=>{
 const db=await createDatabase();try{
  const entries=[];for(let i=0;i<7;i++)for(const meal of ['mic-dejun','pranz','cina'])entries.push({slot:day(i),meal,recipeId:'piure-dovlecel'});
  await asUser(db,USERS.A,async d=>{const s=await call(d,CHILDREN.A,'plan-many',{entries});assert.equal(s.plan.length,21);});
  const before=await rows(db);
  for(const bad of [
   [...entries.slice(0,3),{slot:day(1),meal:'pranz',recipeId:'NOT VALID'}],
   [{slot:day(1),meal:'brunch',recipeId:'piure-morcov'}],
   [{slot:day(30),meal:'pranz',recipeId:'piure-morcov'}],
   [{slot:'ieri',meal:'pranz',recipeId:'piure-morcov'}],
   Array.from({length:36},(_,i)=>({slot:day(i%7),meal:'pranz',recipeId:'piure-morcov'})),
   [],
  ])await assert.rejects(asUser(db,USERS.A,d=>call(d,CHILDREN.A,'plan-many',{entries:bad})),/invalid plan|invalid/,JSON.stringify(bad).slice(0,80));
  assert.equal(await rows(db),before,'a refused save changes nothing');
  await asUser(db,USERS.A,async d=>assert.ok((await load(d,CHILDREN.A)).plan.every(p=>p.recipeId==='piure-dovlecel')));
 }finally{await db.close();}
});

test('row-level security: another family, a child of another family and the preparation stage are refused',async()=>{
 const db=await createDatabase();try{
  await assert.rejects(asUser(db,USERS.B,d=>call(d,CHILDREN.A,'plan-many',{entries:[{slot:day(1),meal:'pranz',recipeId:'piure-dovlecel'}]})),/child unavailable/);
  await assert.rejects(asUser(db,USERS.B,d=>d.query("INSERT INTO public.meal_plans(user_id,baby_id,planned_for,meal,recipe_id) VALUES($1,$2,$3,'pranz','piure-dovlecel')",[USERS.B,CHILDREN.A,day(1)])),/row-level security|foreign key|violates/);
  await asUser(db,USERS.A,d=>call(d,CHILDREN.A,'plan',{slot:day(1),meal:'pranz',recipeId:'piure-dovlecel'}));
  await asUser(db,USERS.B,async d=>assert.equal((await d.query('SELECT count(*)::int AS n FROM public.meal_plans')).rows[0].n,0,'another family reads nothing'));
  await asUser(db,USERS.A,d=>call(d,CHILDREN.A,'profile',{stage:0,introduced:[]}));
  await assert.rejects(asUser(db,USERS.A,d=>call(d,CHILDREN.A,'plan-many',{entries:[{slot:day(2),meal:'pranz',recipeId:'piure-dovlecel'}]})),/preparation/);
  await assert.rejects(asUser(db,null,d=>call(d,CHILDREN.A,'plan',{slot:day(2),recipeId:'piure-dovlecel'})),/permission denied/);
 }finally{await db.close();}
});

test('planner settings are stored per child and validated',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{
   await call(d,CHILDREN.A,'planner-settings',{meals:['pranz','mic-dejun'],days:3});
   await call(d,CHILDREN.A2,'planner-settings',{meals:['pranz'],days:7});
   const a=await load(d,CHILDREN.A);
   assert.deepEqual([...a.planner.meals].sort(),['mic-dejun','pranz']);assert.equal(a.planner.days,3);
   assert.deepEqual((await load(d,CHILDREN.A2)).planner,{meals:['pranz'],days:7});
  });
  for(const bad of [{meals:[],days:5},{meals:['brunch'],days:5},{meals:['pranz'],days:4},{meals:['oricare'],days:5}])
   await assert.rejects(asUser(db,USERS.A,d=>call(d,CHILDREN.A,'planner-settings',bad)),/invalid planner settings/);
  await assert.rejects(asUser(db,USERS.B,d=>call(d,CHILDREN.A,'planner-settings',{meals:['pranz'],days:5})),/child unavailable/);
 }finally{await db.close();}
});

test('planner analytics accept counts only',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{
   for(const [name,props] of [['plan_generated',{count:9,days:3,meals:3}],['plan_saved',{count:9}],['plan_meal_replaced',{}]])
    await d.query('SELECT public.v2_record_event($1,$2,$3::jsonb)',[crypto.randomUUID(),name,JSON.stringify(props)]);
  });
  await assert.rejects(asUser(db,USERS.A,d=>d.query('SELECT public.v2_record_event($1,$2,$3::jsonb)',[crypto.randomUUID(),'plan_generated','{"recipe":"x"}'])),/check constraint|invalid analytics/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.product_events WHERE event_name LIKE 'plan_%'")).rows[0].n,3);
 }finally{await db.close();}
});

test('rollback refuses while a day holds several meals, and restores the old schema when it can',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,async d=>{await call(d,CHILDREN.A,'plan',{slot:day(1),meal:'pranz',recipeId:'piure-dovlecel'});await call(d,CHILDREN.A,'plan',{slot:day(1),meal:'cina',recipeId:'piure-morcov'});});
  await assert.rejects(db.exec(sql('operations/v2-planner-rollback.sql')),/rollback refused/);
  await db.exec('ROLLBACK').catch(()=>{});
  assert.equal(await rows(db),2,'nothing deleted');
  await asUser(db,USERS.A,d=>call(d,CHILDREN.A,'remove-plan',{slot:day(1),meal:'cina'}));
  await db.exec(sql('operations/v2-planner-rollback.sql'));
  await asUser(db,USERS.A,async d=>{
   await call(d,CHILDREN.A,'plan',{slot:day(1),recipeId:'piure-morcov'});
   const s=await load(d,CHILDREN.A);
   assert.deepEqual(s.plan.map(p=>[p.slot,p.recipeId]),[[day(1),'piure-morcov']],'the old client works again, one meal per day');
  });
 }finally{await db.close();}
});
