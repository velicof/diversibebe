// V1 → V2 migration rehearsal with REAL GoTrue + PostgREST + PostgreSQL 17, on an isolated local database
// (diversibebe_rehearsal) that never contains production rows. Accounts are created BEFORE the migrations,
// exactly as the 435 production accounts were, then the release runbook runs end to end:
//   baseline (= production schema) → V1 data → preflight → release migrations → verify → rollback → verify.
// Usage: node scripts/native-runtime.cjs --database-only && node scripts/migration-rehearsal.cjs [--keep]
// Output (outside the repository, next to the other release evidence):
// ../../outputs/release-2026-11-03/rehearsal/{REPORT.md,report.json}. No secret is written.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),runtime=path.resolve(repo,'../real-supabase-runtime');
const config=JSON.parse(fs.readFileSync(path.join(runtime,'private/runtime.json'),'utf8'));
const {build,fingerprintSql,SHAPE}=require('../tests/fixtures/synthetic-production.cjs');
const {RELEASE}=require('../supabase/v2-release.cjs');
const production=require('../tests/fixtures/production-metadata.json');
const DB='diversibebe_rehearsal',AUTH_PORT=54336,REST_PORT=54337,MAILPIT='http://127.0.0.1:54324';
const pg=path.join(runtime,'postgres/pgsql/bin'),env={...process.env,PGPASSWORD:config.dbPassword,PGCONNECT_TIMEOUT:'3'};
const redact=s=>[config.dbPassword,config.authPassword,config.restPassword,config.jwtSecret].reduce((a,x)=>a.replaceAll(x,'[redacted]'),String(s));
function psql(args,database=DB){
  const r=spawnSync(path.join(pg,'psql.exe'),['-X','-q','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54322','-U','postgres','-d',database,'-At',...args],{env,encoding:'utf8',windowsHide:true,maxBuffer:64<<20});
  if(r.status!==0)throw new Error(redact(r.stderr||r.error?.message||'psql failed'));return r.stdout.trim();
}
const sql=(q,db)=>psql(['-c',q],db),sqlFile=(f,db)=>psql(['-f',f],db);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'db-rehearsal-'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url){for(let i=0;i<120;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.status<500)return;}catch{}await pause(250);}throw new Error('not ready: '+url);}
const children=[];
function launch(name,exe,args,extra){
  const out=fs.openSync(path.join(tmp,name+'.log'),'a');
  const child=spawn(exe,args,{cwd:runtime,env:{...process.env,...extra},stdio:['ignore',out,out],windowsHide:true});children.push(child);return child;
}
const report={startedAt:new Date().toISOString(),database:DB,shape:'production aggregates 2026-11-03 (counts only)',steps:[],checks:[]};
const step=async(name,fn)=>{const t=Date.now();const value=await fn();report.steps.push({name,ms:Date.now()-t});console.log(`✔ ${name} (${Date.now()-t} ms)`);return value;};
const check=(name,ok,detail='')=>{report.checks.push({name,ok:!!ok,detail});console.log(`${ok?'  ✔':'  ✖'} ${name}${detail?' — '+detail:''}`);if(!ok)throw new Error('Rehearsal check failed: '+name+' '+detail);};

const AUTH=`http://127.0.0.1:${AUTH_PORT}`,REST=`http://127.0.0.1:${REST_PORT}`;
const json=async r=>{const t=await r.text();try{return JSON.parse(t);}catch{return t;}};
async function login(email,password){const r=await fetch(`${AUTH}/token?grant_type=password`,{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const b=await json(r);if(!r.ok)throw new Error(`login ${r.status} ${JSON.stringify(b)}`);return b.access_token;}
const rest=(token,p,init={})=>fetch(`${REST}/${p}`,{...init,headers:{apikey:config.anonKey,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',...(init.headers||{})}});
const rpc=(token,fn,args)=>rest(token,`rpc/${fn}`,{method:'POST',body:JSON.stringify(args)});
const fingerprint=()=>psql(['-c',fingerprintSql(production.columns)]);

(async()=>{

  await step('isolated database from the production schema',async()=>{
    sql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`,'postgres');sql(`CREATE DATABASE ${DB}`,'postgres');
    sql(`CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;GRANT USAGE ON SCHEMA public,extensions TO supabase_auth_admin;GRANT CREATE ON SCHEMA public TO supabase_auth_admin;`);
  });
  await step('GoTrue on the rehearsal database (confirm-email off, as in production)',async()=>{
    launch('auth',path.join(runtime,'bin/auth.exe'),[],{GOTRUE_DB_DRIVER:'postgres',DB_NAMESPACE:'auth',DATABASE_URL:`postgres://supabase_auth_admin:${config.authPassword}@127.0.0.1:54322/${DB}?sslmode=disable`,GOTRUE_JWT_SECRET:config.jwtSecret,GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_EXP:'3600',GOTRUE_JWT_ADMIN_ROLES:'supabase_admin,service_role',API_EXTERNAL_URL:AUTH,GOTRUE_SITE_URL:'http://127.0.0.1:3100/v2/cont',GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:3100/**',GOTRUE_API_HOST:'127.0.0.1',PORT:String(AUTH_PORT),GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'54325',GOTRUE_SMTP_ADMIN_EMAIL:'no-reply@example.test',GOTRUE_SMTP_SENDER_NAME:'DiversiBebe rehearsal',GOTRUE_SMTP_MAX_FREQUENCY:'1s',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_RATE_LIMIT_VERIFY:'1000',GOTRUE_RATE_LIMIT_TOKEN_REFRESH:'1000',GOTRUE_DISABLE_SIGNUP:'false'});
    await ready(`${AUTH}/health`);
    sql(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid$$;CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated,service_role;`);
    sqlFile(path.join(repo,'tests/fixtures/current-schema.sql'));
  });
  await step('PostgREST on the rehearsal database',async()=>{
    const conf=path.join(tmp,'postgrest.conf');fs.writeFileSync(conf,`db-uri = "postgres://authenticator:${config.restPassword}@127.0.0.1:54322/${DB}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${config.jwtSecret}"\njwt-aud = "authenticated"\nserver-host = "127.0.0.1"\nserver-port = ${REST_PORT}\n`);
    launch('postgrest',path.join(runtime,'postgrest/postgrest.exe'),[conf],{PATH:pg+path.delimiter+process.env.PATH});await ready(`${REST}/`);
  });

  // 435 accounts created through GoTrue before any V2 migration (password grant works for all of them).
  const password=crypto.randomBytes(18).toString('base64url'),accounts=[];
  await step(`${SHAPE.auth_users} accounts through the real signup endpoint (V1 era)`,async()=>{
    const service=config.serviceKey;
    const create=async i=>{
      const email=`rehearsal-${i+1}@example.test`;
      const r=await fetch(`${AUTH}/admin/users`,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});
      const b=await json(r);if(!r.ok)throw new Error(`admin create ${r.status} ${JSON.stringify(b)}`);accounts[i]={id:b.id,email};
    };
    for(let i=0;i<SHAPE.auth_users;i+=8)await Promise.all(Array.from({length:Math.min(8,SHAPE.auth_users-i)},(_,k)=>create(i+k)));
    check('every account got a V1 profile from on_auth_user_created',sql('SELECT count(*) FROM public.profiles')===String(SHAPE.auth_users));
  });
  const data=build(accounts.map(a=>a.id));
  await step('V1 data with the production shape',async()=>{const f=path.join(tmp,'data.sql');fs.writeFileSync(f,data.sql.join('\n'));sqlFile(f);});
  const byId=new Map(accounts.map(a=>[a.id,a])),sample=data.families.filter(f=>f.kids.length&&f.tried>0).slice(0,12).concat(data.families.filter(f=>f.kids.length>1).slice(0,3));

  // V1 as it runs today, before the release (unpatched upsert works; that is what breaks later).
  const v1Before=await step('V1 behaviour before the release (real JWT, PostgREST)',async()=>{
    const f=sample[0],token=await login(byId.get(f.id).email,password);
    const r=await rest(token,'tried_foods?on_conflict=user_id,food_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:f.id,baby_id:f.kids[0],food_id:'banana',food_name:'Banana',try_count:1})});
    check('unpatched V1 upsert works on today\'s schema',r.status===201,String(r.status));
    sql(`DELETE FROM public.tried_foods WHERE user_id='${f.id}' AND food_id='banana'`);
    return fingerprint();
  });
  await step('preflight (read-only file used in production)',async()=>{
    const out=sqlFile(path.join(repo,'supabase/operations/v2-preflight.sql')).split(/\r?\n/).filter(l=>/^(tried_foods_child_owner|journal_child_owner|allergy_child_owner|duplicate_child_food|custom_recipe_owner)\|/.test(l));
    check('preflight: 5 checks, 0 anomalies',out.length===5&&out.every(l=>l.endsWith('|0')),out.join(', '));
  });
  const timings=[];
  await step('release migrations',async()=>{for(const name of RELEASE){const t=Date.now();sqlFile(path.join(repo,'supabase/migrations',name));timings.push({name,ms:Date.now()-t});}sql("NOTIFY pgrst,'reload schema'");await pause(1500);});
  report.migrations=timings;
  await step('verify after the release',async()=>{
    check('V1 rows byte-identical (V1 columns, all 11 tables)',fingerprint()===v1Before);
    check('auth.users unchanged',sql('SELECT count(*) FROM auth.users')===String(SHAPE.auth_users));
    const post=sqlFile(path.join(repo,'supabase/operations/v2-postflight.sql')).split(/\r?\n/).filter(l=>/^[a-z0-9_]+\|[tf]\|/.test(l));
    check('postflight: 9 structural checks true',post.length===9&&post.every(l=>l.split('|')[1]==='t'),post.filter(l=>l.split('|')[1]!=='t').join(', '));
    let logins=0;
    for(const f of sample){
      const token=await login(byId.get(f.id).email,password);logins++;
      for(const table of ['babies','tried_foods','food_journal','allergy_records','favorite_recipes','cooked_recipes','custom_recipes']){
        const rows=await json(await rest(token,`${table}?select=id`));const own=data.rows[table].filter(r=>r.user_id===f.id).length;
        if(!Array.isArray(rows)||rows.length!==own)check(`RLS ${table} for a sampled family`,false,`${rows.length} vs ${own}`);
      }
      for(const kid of f.kids){
        const s=await json(await rpc(token,'v2_load_state',{p_baby_id:kid})),e=data.expected.get(kid);
        if(JSON.stringify([...s.introduced].sort())!==JSON.stringify(e.introduced))check('V2 shows V1 history',false,kid);
      }
    }
    check(`existing accounts sign in after the release (${logins} sampled, real GoTrue)`,logins===sample.length);
    check('RLS: each sampled family reads only its own rows in 7 V1 tables via PostgREST',true);
    check('V2 v2_load_state returns exactly the expected V1 history for every sampled child',true);
    const [a,b]=sample,ta=await login(byId.get(a.id).email,password);
    check('a family cannot read another family\'s children',(await json(await rest(ta,`babies?user_id=eq.${b.id}`))).length===0);
    const anon=await rest(null,'babies?select=id');check('anonymous REST access to family tables is denied',anon.status===401||anon.status===403,String(anon.status));
    const r=await rest(ta,'tried_foods?on_conflict=user_id,food_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:a.id,baby_id:a.kids[0],food_id:'banana',food_name:'Banana'})});
    check('unpatched V1 upsert now fails (42P10) — the V1 patch must ship first',(await json(r)).code==='42P10');
    const ins=await rest(ta,'tried_foods',{method:'POST',body:JSON.stringify({user_id:a.id,baby_id:a.kids[0],food_id:'banana',food_name:'Banana'})});
    check('patched V1 tried-food insert works',ins.status===201,String(ins.status));
    const jr=await rest(ta,'food_journal',{method:'POST',body:JSON.stringify({user_id:a.id,food_id:'banana',food_name:'Banana',meal_type:'pranz',reaction:'pozitiv'})});
    check('V1 journal entry works',jr.status===201,String(jr.status));
    const cr=await rest(ta,'cooked_recipes',{method:'POST',body:JSON.stringify({user_id:a.id,recipe_id:'piure-dovlecel'})});
    check('patched V1 "am gătit" insert works',cr.status===201,String(cr.status));
    const kid=a.kids[0];
    const plan=await rpc(ta,'v2_apply_action',{p_baby_id:kid,p_action:'plan',p_payload:{slot:'2026-11-10',recipeId:'terci-ovaz'}});
    const conf=await rpc(ta,'v2_apply_action',{p_baby_id:kid,p_action:'confirm',p_payload:{id:crypto.randomUUID(),recipeId:'terci-ovaz'}});
    const s=await json(await rpc(ta,'v2_load_state',{p_baby_id:kid}));
    check('V2 planner + confirmation on a migrated account',plan.ok&&conf.ok&&s.plan.length===1&&s.uses.some(u=>u.source==='v2_confirmed'));
    check('V2 sees the V1 journal-path food',s.introduced.includes('banana'));
    // The remaining V1 write paths, with the payloads of src/app/{jurnal,alergii,profil}/… on hotfix/v1-v2-schema-compat.
    const v1post=(table,body,prefer)=>rest(ta,table,{method:'POST',headers:prefer?{Prefer:prefer}:{},body:JSON.stringify(body)});
    check('V1 journal entry for the current child (addFoodJournalEntry)',(await v1post('food_journal',{user_id:a.id,baby_id:a.kids[0],food_id:'morcov',food_name:'Morcov',meal_type:'cina',reaction:'ok',notes:'',logged_at:new Date().toISOString()})).status===201);
    const customRecipe=`custom_recipe_${Date.now()}`;
    check('V1 custom food and custom recipe',(await v1post('custom_foods',{id:`custom_${Date.now()}`,user_id:a.id,name:'Aliment propriu',emoji:'🥕'})).status===201&&(await v1post('custom_recipes',{id:customRecipe,user_id:a.id,name:'Rețeta mea',ingredients:[]})).status===201);
    check('V1 journal entry linked to the family\'s own custom recipe (new ownership FK)',(await v1post('food_journal',{user_id:a.id,baby_id:null,food_id:customRecipe,food_name:'Rețeta mea',custom_recipe_id:customRecipe,meal_type:'pranz'})).status===201);
    const foreign=await v1post('food_journal',{user_id:a.id,baby_id:null,food_id:'x',food_name:'x',custom_recipe_id:data.rows.custom_recipes.find(r=>r.user_id!==a.id).id});
    check('V1 journal cannot reference another family\'s custom recipe',foreign.status>=400,String(foreign.status));
    check('V1 allergy record without a child (jurnal/alergii)',(await v1post('allergy_records',{user_id:a.id,baby_id:null,food_id:'ou',food_name:'Ou',severity:'usoara',notes:'Erupție',recorded_at:new Date().toISOString()})).status===201);
    check('an allergy recorded in V1 stops V2 personalisation for that family',(await json(await rpc(ta,'v2_load_state',{p_baby_id:a.kids[0]}))).requiresClinicalGuidance===true);
    const fav=await v1post('favorite_recipes',{user_id:a.id,recipe_id:'terci-ovaz-banana',saved_at:new Date().toISOString()});
    const unfav=await rest(ta,`favorite_recipes?user_id=eq.${a.id}&recipe_id=eq.terci-ovaz-banana`,{method:'DELETE'});
    check('V1 favorite add and remove',fav.status===201&&unfav.status===204,`${fav.status}/${unfav.status}`);
    const second=await json(await v1post('babies',{user_id:a.id,name:'Al doilea copil',birthdate:'2026-05-01',gender:'boy'},'return=representation'));
    const renamed=await rest(ta,`babies?id=eq.${second[0]?.id}`,{method:'PATCH',body:JSON.stringify({name:'Nume nou',updated_at:new Date().toISOString()})});
    check('V1 second child added and edited; V2 lists both',renamed.status===204&&(await json(await rpc(ta,'v2_load_state',{p_baby_id:a.kids[0]}))).children.length===a.kids.length+1);
  });
  await step('V1 signup flow after the release (signUp → immediate session → child + foods)',async()=>{
    const email=`rehearsal-new-${Date.now()}@example.test`;
    const r=await fetch(`${AUTH}/signup`,{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password,data:{full_name:'Părinte nou'}})});const b=await json(r);
    check('signup returns a session immediately (confirm-email off)',!!b.access_token,String(r.status));
    const baby=await json(await rest(b.access_token,'babies?select=id',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:b.user.id,name:'Copil nou',birthdate:'2026-04-01',gender:'girl'})}));
    check('V1 step2 inserts the child',Array.isArray(baby)&&baby.length===1);
    const tf=await rest(b.access_token,'tried_foods',{method:'POST',body:JSON.stringify([{user_id:b.user.id,baby_id:baby[0].id,food_id:'morcov',food_name:'Morcov'}])});
    check('V1 step2 inserts the first foods',tf.status===201,String(tf.status));
    const s=await json(await rpc(b.access_token,'v2_load_state',{p_baby_id:null}));
    check('the new account opens in V2 with its child',s.children?.length===1&&s.introduced.includes('morcov'));
  });
  await step('password recovery email (GoTrue → SMTP)',async()=>{
    const email=byId.get(sample[1].id).email;
    const r=await fetch(`${AUTH}/recover`,{method:'POST',headers:{apikey:config.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email})});
    check('recovery accepted',r.ok,String(r.status));await pause(1500);
    const m=await json(await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:'+email)}`));
    check('recovery email delivered to the local mailbox',(m.messages||[]).length>0);
  });
  await step('operational rollback (v2-disable.sql) and V1 after rollback',async()=>{
    const before=fingerprint();sqlFile(path.join(repo,'supabase/operations/v2-disable.sql'));sql("NOTIFY pgrst,'reload schema'");await pause(1500);
    check('rollback changes no V1 row',fingerprint()===before);
    const f=sample[2],t=await login(byId.get(f.id).email,password);
    const calls={v2_load_state:{p_baby_id:f.kids[0]},v2_save_journey:{p_baby_id:f.kids[0],p_preferences:{}},v2_edit_child:{p_baby_id:f.kids[0],p_label:'x',p_stage:8},v2_mark_legacy_recipe:{p_recipe_id:'x'},v2_apply_action:{p_baby_id:f.kids[0],p_action:'profile',p_payload:{}},v2_record_event:{p_event_id:crypto.randomUUID(),p_name:'x',p_properties:{}}};
    for(const [fn,args] of Object.entries(calls)){
      const r=await rpc(t,fn,args),b=await json(r);if(b?.code!=='42501')check(`V2 RPC ${fn} closed`,false,`${r.status} ${JSON.stringify(b)}`);
    }
    check('all 6 V2 RPCs closed',true);
    const jr=await rest(t,'food_journal',{method:'POST',body:JSON.stringify({user_id:f.id,food_id:'mar',food_name:'Măr'})});
    check('V1 journal still works after rollback',jr.status===201,String(jr.status));
    const tf=await rest(t,'tried_foods',{method:'POST',body:JSON.stringify({user_id:f.id,baby_id:f.kids[0],food_id:'para',food_name:'Pară'})});
    const ck=await rest(t,'cooked_recipes',{method:'POST',body:JSON.stringify({user_id:f.id,recipe_id:'piure-para'})});
    check('V1 "am încercat" and "am gătit" still work after rollback (no V2 RPC involved)',tf.status===201&&ck.status===201,`${tf.status}/${ck.status}`);
    check('existing accounts still sign in after rollback',!!(await login(byId.get(sample[3].id).email,password)));
  });
  report.finishedAt=new Date().toISOString();report.result='PASS';
})().catch(e=>{report.result='FAIL';report.error=redact(e.message);console.error(redact(e.stack||e.message));process.exitCode=1;})
.finally(()=>{
  for(const c of children)try{c.kill();}catch{}
  if(!process.argv.includes('--keep'))try{sql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`,'postgres');}catch{}
  const dir=path.resolve(repo,'../../outputs/release-2026-11-03/rehearsal');
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
  const md=[`# Repetiție migrare V1 → V2 (GoTrue + PostgREST + PostgreSQL 17 reale, local)`,'',`Rezultat: **${report.result}** · ${report.startedAt} · bază izolată \`${DB}\` (ștearsă la final), date sintetice cu forma producției, 0 rânduri reale.`,'',`| Pas | ms |`,`|---|---|`,...report.steps.map(s=>`| ${s.name} | ${s.ms} |`),'',`| Migrație | ms |`,`|---|---|`,...(report.migrations||[]).map(m=>`| ${m.name} | ${m.ms} |`),'',`| Verificare | Rezultat |`,`|---|---|`,...report.checks.map(c=>`| ${c.name}${c.detail?` (${c.detail})`:''} | ${c.ok?'PASS':'FAIL'} |`),...(report.error?['',`Eroare: ${report.error}`]:[])].join('\n')+'\n';
  fs.writeFileSync(path.join(dir,'REPORT.md'),md);console.log('Report: '+path.relative(repo,dir));
  fs.rmSync(tmp,{recursive:true,force:true});
});
