// Full V1 → V2 rehearsal on an isolated copy of the PRODUCTION SCHEMA (drift-tested) filled with a synthetic
// dataset of production's shape: 435 accounts, 0/1/2/3 children, unassigned V1 history, journal, allergies.
// Order mirrors the release runbook (docs/ai-ops/MIGRATION-V1-V2.md): preflight → migrations → verify → rollback.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createDatabase,asUser}=require('./fixtures/database.cjs');
const {build,fingerprintSql,prng,uuid,SHAPE}=require('./fixtures/synthetic-production.cjs');
const {RELEASE}=require('../supabase/v2-release.cjs');
const production=require('./fixtures/production-metadata.json');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const FINGERPRINT=fingerprintSql(production.columns);
const V2_RPCS=["v2_load_state(NULL)","v2_apply_action(NULL,'profile','{}')","v2_record_event(NULL,'x','{}')","v2_save_journey(NULL,'{}')","v2_edit_child(NULL,'x',8::smallint)","v2_mark_legacy_recipe('x')"];

test('rehearsal: V1 production-shaped data survives the V2 release, V1 and V2 both work, rollback keeps V1 intact',{timeout:600000},async t=>{
  const db=await createDatabase(undefined,{migrations:false});try{
    // 1. Restore: synthetic accounts through the real signup trigger, then V1 rows.
    const rand=prng(7),users=Array.from({length:SHAPE.auth_users},()=>uuid(rand));
    for(const [i,id] of users.entries())await db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,$2,$3)",[id,`rehearsal-${i+1}@example.test`,JSON.stringify({provider:i<65?'google':'email',is_test:true})]);
    const data=build(users);for(const s of data.sql)await db.exec(s);
    const v1=(await db.query(FINGERPRINT)).rows;
    assert.equal(v1.find(r=>r.t==='profiles').n,SHAPE.profiles+2);
    t.diagnostic(`synthetic dataset: ${v1.map(r=>`${r.t}=${r.n}`).join(' ')}`);

    // 2. Preflight (same file the founder runs read-only in production): every anomaly count must be 0.
    const preRows=(await db.exec(read('supabase/operations/v2-preflight.sql'))).flatMap(r=>r.rows);
    const pre=preRows.filter(r=>'anomalies' in r),preCounts=preRows.filter(r=>'n' in r&&'t' in r);
    assert.equal(pre.length,5);for(const r of pre)assert.equal(Number(r.anomalies),0,r.check_name);

    // 3. Release migrations, in release order.
    const started=Date.now();for(const name of RELEASE)await db.exec(read(`supabase/migrations/${name}`));
    t.diagnostic(`release migrations applied in ${Date.now()-started} ms (PGlite)`);

    // 4. No V1 row or column value changed (V1 columns only; V2 adds columns with defaults).
    assert.deepEqual((await db.query(FINGERPRINT)).rows,v1);
    assert.equal((await db.query('SELECT count(*)::int n FROM auth.users')).rows[0].n,SHAPE.auth_users+2);
    // Postflight (same file the founder runs in production after the migrations): all checks true, counts unchanged.
    const postRows=(await db.exec(read('supabase/operations/v2-postflight.sql'))).flatMap(r=>r.rows);
    const post=postRows.filter(r=>'ok' in r);assert.equal(post.length,9);
    for(const r of post)assert.equal(r.ok,true,`postflight ${r.check_name} ${r.detail}`);
    assert.deepEqual(postRows.filter(r=>'n' in r&&'t' in r).map(r=>[r.t,Number(r.n)]),preCounts.map(r=>[r.t,Number(r.n)]));

    // 5. Every child sees exactly the V1 history the legacy-history rule promises; childless accounts load too.
    for(const [kid,e] of data.expected){
      const s=(await asUser(db,e.user,d=>d.query('SELECT public.v2_load_state($1) s',[kid]))).rows[0].s;
      assert.deepEqual([...s.introduced].sort(),e.introduced,`introduced for ${kid}`);
      assert.equal(s.uses.length,e.uses,`uses for ${kid}`);
      assert.equal(s.requiresClinicalGuidance,e.clinical,`allergy guard for ${kid}`);
    }
    for(const f of data.families.filter(f=>!f.kids.length)){
      const s=(await asUser(db,f.id,d=>d.query('SELECT public.v2_load_state(NULL) s'))).rows[0].s;
      assert.deepEqual(s.children,[]);
    }

    // 6. RLS: each family reads only its own rows; strangers and anonymous callers get nothing.
    const sample=data.families.filter(f=>f.tried>0).slice(0,25),tables=['babies','tried_foods','food_journal','allergy_records','favorite_recipes','cooked_recipes','custom_recipes'];
    for(const f of sample)for(const table of tables){
      const own=data.rows[table].filter(r=>r.user_id===f.id).length;
      assert.equal((await asUser(db,f.id,d=>d.query(`SELECT count(*)::int n FROM public.${table}`))).rows[0].n,own,`${table} visible to owner`);
    }
    const [a,b]=sample;
    assert.equal((await asUser(db,a.id,d=>d.query('UPDATE public.tried_foods SET try_count=99 WHERE user_id=$1',[b.id]))).affectedRows,0);
    await assert.rejects(asUser(db,a.id,d=>d.query("INSERT INTO public.food_journal(user_id,food_id,food_name) VALUES($1,'x','x')",[b.id])));
    await assert.rejects(asUser(db,null,d=>d.query('SELECT * FROM public.babies')),/permission denied/);
    await assert.rejects(asUser(db,null,d=>d.query('SELECT * FROM public.user_login_summary')),/permission denied/);

    // 7. V1 after the migrations (patched code paths): journal, tried food, cooked, favorite.
    const single=data.families.find(f=>f.kids.length===1&&f.tried>5),kid=single.kids[0];
    await asUser(db,single.id,async d=>{
      await d.query("INSERT INTO public.food_journal(user_id,baby_id,food_id,food_name,meal_type,reaction) VALUES($1,NULL,'morcov','Morcov','pranz','pozitiv')",[single.id]);
      const ex=(await d.query("SELECT id FROM public.tried_foods WHERE user_id=$1 AND food_id='morcov' ORDER BY first_tried_at LIMIT 1",[single.id])).rows[0];
      if(ex)await d.query('UPDATE public.tried_foods SET try_count=try_count+1 WHERE id=$1',[ex.id]);
      else await d.query("INSERT INTO public.tried_foods(user_id,baby_id,food_id,food_name) VALUES($1,$2,'morcov','Morcov')",[single.id,kid]);
      await d.query("INSERT INTO public.cooked_recipes(user_id,recipe_id) VALUES($1,'piure-dovlecel')",[single.id]);
      await d.query("INSERT INTO public.favorite_recipes(user_id,recipe_id) VALUES($1,'piure-dovlecel') ON CONFLICT(user_id,recipe_id) DO NOTHING",[single.id]);
    });

    // 8. V2 planner and journal on a migrated account; V1 sees the V2 favorite, V2 sees the V1 write.
    const slot='2026-11-10';
    await asUser(db,single.id,async d=>{
      await d.query(`SELECT public.v2_apply_action($1,'plan','{"slot":"${slot}","recipeId":"terci-ovaz"}')`,[kid]);
      await d.query(`SELECT public.v2_apply_action($1,'confirm','{"id":"${uuid(rand)}","recipeId":"terci-ovaz"}')`,[kid]);
    });
    const s=(await asUser(db,single.id,d=>d.query('SELECT public.v2_load_state($1) s',[kid]))).rows[0].s;
    // Written as the deployed client does (no meal): stored and returned as the untyped meal "oricare".
    assert.deepEqual(s.plan,[{slot,meal:'oricare',recipeId:'terci-ovaz'}]);
    assert.ok(s.introduced.includes('morcov'));
    assert.ok(s.uses.some(u=>u.recipeId==='terci-ovaz'&&u.source==='v2_confirmed'));
    assert.ok(s.uses.some(u=>u.recipeId==='piure-dovlecel'&&u.source==='legacy'));

    // 9. A new signup after the release still gets a profile (hardened handle_new_user) and can use V2.
    const fresh=uuid(rand),child=uuid(rand);
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'rehearsal-new@example.test')",[fresh]);
    await asUser(db,fresh,d=>d.query(`SELECT public.v2_apply_action(NULL,'create-child','{"id":"${child}","label":"Nou","stage":6}')`));
    assert.equal((await asUser(db,fresh,d=>d.query('SELECT count(*)::int n FROM public.babies'))).rows[0].n,1);

    // 10. Operational rollback: every V2 RPC closed, V1 data byte-identical, V1 writes still work.
    const beforeRollback=(await db.query(FINGERPRINT)).rows;
    await db.exec(read('supabase/operations/v2-disable.sql'));
    assert.deepEqual((await db.query(FINGERPRINT)).rows,beforeRollback);
    for(const call of V2_RPCS)await assert.rejects(asUser(db,single.id,d=>d.query(`SELECT public.${call}`)),/permission denied/,call);
    await asUser(db,single.id,d=>d.query("INSERT INTO public.food_journal(user_id,food_id,food_name) VALUES($1,'mar','Măr')",[single.id]));
    await assert.rejects(asUser(db,single.id,d=>d.query('SELECT count(*) FROM public.meal_plans')),/permission denied/);
  }finally{await db.close();}
});
