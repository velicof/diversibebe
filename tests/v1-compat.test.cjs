// V1 (production, branch hotfix/v1-v2-schema-compat) and V2 share one Supabase database.
// These are the statements PostgREST generates for the V1 writes in src/app/lib/supabaseData.ts and src/app/jurnal/page.tsx.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDatabase,asUser,USERS,CHILDREN}=require('./fixtures/database.cjs');

const original={
  tried:"INSERT INTO public.tried_foods(user_id,baby_id,food_id,food_name,first_tried_at,try_count) VALUES($1,$2,'morcov','Morcov',now(),1) ON CONFLICT(user_id,food_id) DO UPDATE SET try_count=EXCLUDED.try_count",
  cooked:"INSERT INTO public.cooked_recipes(user_id,recipe_id,cooked_at) VALUES($1,'piure-dovlecel',now()) ON CONFLICT(user_id,recipe_id) DO UPDATE SET cooked_at=EXCLUDED.cooked_at",
};
const patched={
  findTried:"SELECT id,try_count FROM public.tried_foods WHERE user_id=$1 AND food_id=$2 ORDER BY first_tried_at ASC LIMIT 1",
  insertTried:"INSERT INTO public.tried_foods(user_id,baby_id,food_id,food_name,first_tried_at,try_count) VALUES($1,$2,$3,'Aliment',now(),1)",
  bumpTried:"UPDATE public.tried_foods SET try_count=try_count+1 WHERE id=$1",
  insertCooked:"INSERT INTO public.cooked_recipes(user_id,recipe_id,cooked_at) VALUES($1,$2,now())",
};
const v1RecordTried=(d,user,child,food)=>d.query(patched.findTried,[user,food]).then(r=>r.rows[0]?d.query(patched.bumpTried,[r.rows[0].id]):d.query(patched.insertTried,[user,child,food]));
const uniqueViolation=e=>e.code==='23505';

test('the original V1 upserts break once the V2 migrations are applied (the V1 patch must ship first)',async()=>{
  const db=await createDatabase();try{
    await assert.rejects(asUser(db,USERS.A,d=>d.query(original.tried,[USERS.A,CHILDREN.A])),e=>e.code==='42P10');
    await assert.rejects(asUser(db,USERS.A,d=>d.query(original.cooked,[USERS.A])),e=>e.code==='42P10');
  }finally{await db.close();}
});

for(const migrations of [false,true]){
  test(`patched V1 writes work on the ${migrations?'V2-migrated':'current production'} schema`,async()=>{
    const db=await createDatabase(undefined,{migrations});try{
      await asUser(db,USERS.A,async d=>{
        await v1RecordTried(d,USERS.A,CHILDREN.A,'morcov');
        await v1RecordTried(d,USERS.A,CHILDREN.A,'morcov');
        await v1RecordTried(d,USERS.A,null,'dovlecel'); // journal path writes baby_id null
        await d.query(patched.insertCooked,[USERS.A,'piure-dovlecel']);
      });
      // A second "cooked" is a unique violation, which V1 already treats as success.
      await assert.rejects(asUser(db,USERS.A,d=>d.query(patched.insertCooked,[USERS.A,'piure-dovlecel'])),uniqueViolation);
      const rows=(await db.query("SELECT food_id,try_count FROM public.tried_foods ORDER BY food_id")).rows;
      assert.deepEqual(rows.map(r=>[r.food_id,r.try_count]),[['dovlecel',1],['morcov',2]]);
    }finally{await db.close();}
  });
}

test('V1 never alters V2 confirmations and tolerates one tried-food row per sibling',async()=>{
  const db=await createDatabase();try{
    const use='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await asUser(db,USERS.A,d=>d.query("SELECT public.v2_apply_action($1,'profile','{\"stage\":8,\"introduced\":[\"morcov\"]}')",[CHILDREN.A]));
    await asUser(db,USERS.A,d=>d.query("SELECT public.v2_apply_action($1,'profile','{\"stage\":8,\"introduced\":[\"morcov\"]}')",[CHILDREN.A2]));
    await asUser(db,USERS.A,d=>d.query(`SELECT public.v2_apply_action($1,'confirm','{"id":"${use}","recipeId":"piure-dovlecel"}')`,[CHILDREN.A]));
    const before=(await db.query('SELECT cooked_at,source FROM public.cooked_recipes WHERE id=$1',[use])).rows[0];
    await asUser(db,USERS.A,async d=>{
      await d.query(patched.insertCooked,[USERS.A,'piure-dovlecel']);
      await v1RecordTried(d,USERS.A,CHILDREN.A,'morcov');
    });
    const after=(await db.query('SELECT cooked_at,source FROM public.cooked_recipes WHERE id=$1',[use])).rows[0];
    assert.deepEqual(after,before);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.cooked_recipes WHERE source='legacy'")).rows[0].n,1);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.tried_foods WHERE food_id='morcov'")).rows[0].n,2);
  }finally{await db.close();}
});

test('V1 history without a child shows in V2 only when the family has exactly one child',async()=>{
  const db=await createDatabase();try{
    await db.query("INSERT INTO public.tried_foods(user_id,baby_id,food_id,food_name) VALUES($1,NULL,'banana','Banana'),($2,NULL,'banana','Banana')",[USERS.A,USERS.B]);
    await db.query("INSERT INTO public.cooked_recipes(user_id,recipe_id) VALUES($1,'terci-ovaz')",[USERS.B]);
    const stateB=(await asUser(db,USERS.B,d=>d.query('SELECT public.v2_load_state($1) s',[CHILDREN.B]))).rows[0].s;
    assert.deepEqual(stateB.introduced,['banana']);
    assert.deepEqual(stateB.uses.map(u=>u.recipeId),['terci-ovaz']);
    // Family A has two children: the unassigned row is ambiguous and is not attributed to either.
    for(const child of [CHILDREN.A,CHILDREN.A2]){
      const s=(await asUser(db,USERS.A,d=>d.query('SELECT public.v2_load_state($1) s',[child]))).rows[0].s;
      assert.deepEqual(s.introduced,[]);
    }
    // Family B cannot see family A's history and vice versa.
    assert.equal((await asUser(db,USERS.B,d=>d.query('SELECT count(*)::int n FROM public.tried_foods'))).rows[0].n,1);
  }finally{await db.close();}
});

test('V1 code never depends on V2 RPCs, so the operational rollback (v2-disable.sql) cannot break V1',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='v2'?[]:walk(path.join(d,e.name))):/\.(ts|tsx)$/.test(e.name)?[path.join(d,e.name)]:[]);
  const v1=[...walk(path.join(__dirname,'../src/app')),...walk(path.join(__dirname,'../src/lib'))];
  const offenders=v1.filter(f=>/\.rpc\(\s*["'`]v2_/.test(fs.readFileSync(f,'utf8')));
  assert.deepEqual(offenders.map(f=>path.relative(path.join(__dirname,'..'),f)),[]);
  const data=fs.readFileSync(path.join(__dirname,'../src/app/lib/supabaseData.ts'),'utf8');
  assert.doesNotMatch(data,/onConflict\s*:/,'PostgREST onConflict cannot target the V2 partial indexes');
});

test('V1 reads one child per family and never updates every child at once',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const root=path.join(__dirname,'..');
  const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='v2'?[]:walk(path.join(d,e.name))):/\.(ts|tsx)$/.test(e.name)?[path.join(d,e.name)]:[]);
  const unlimited=[],broadUpdates=[];
  for(const f of [...walk(path.join(root,'src/app')),path.join(root,'src/proxy.ts')]){
    const s=fs.readFileSync(f,'utf8'),rel=path.relative(root,f);
    // Each chain from .from("babies") up to its terminating semicolon (or the next query in a Promise.all).
    for(const m of s.matchAll(/\.from\("babies"\)([\s\S]*?)(?=;|\.from\(|\n\s*\]\))/g)){
      const chain=m[1];
      if(/\.maybeSingle\(\)/.test(chain)&&/\.eq\("user_id"/.test(chain)&&!/\.(insert|update|upsert)\(|\.eq\("id"/.test(chain)&&!/\.limit\(1\)/.test(chain))unlimited.push(rel);
      if(/\.update\(/.test(chain)&&!/\.eq\("id"/.test(chain))broadUpdates.push(rel);
    }
  }
  assert.deepEqual(unlimited,[],'maybeSingle() returns null once a family has two children');
  assert.deepEqual(broadUpdates,[],'an update filtered only by user_id overwrites every child');
});
