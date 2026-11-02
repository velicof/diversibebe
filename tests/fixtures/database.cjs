const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const USERS={A:'11111111-1111-4111-8111-111111111111',B:'22222222-2222-4222-8222-222222222222'};
const CHILDREN={A:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',A2:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',B:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
async function createDatabase(dataDir){
  const db=new PGlite(dataDir);
  const exists=await db.query("SELECT to_regclass('public.product_events') AS initialized");
  if(!exists.rows[0].initialized){
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text NOT NULL,raw_user_meta_data jsonb DEFAULT '{}',raw_app_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(auth.jwt()->>'sub','')::uuid$$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated;`);
    await db.exec(fs.readFileSync(path.join(__dirname,'current-schema.sql'),'utf8'));
    for(const name of ['20261027055351_protect_family_data.sql','20261027055353_bebeasist_quota.sql','20261027133719_v2_persistence_and_events.sql']) await db.exec(fs.readFileSync(path.join(__dirname,'../../supabase/migrations',name),'utf8'));
    for(const name of fs.readdirSync(path.join(__dirname,'../../supabase/migrations')).filter(n=>n.includes('real_auth_journey')||n.includes('v2_planner_events')))await db.exec(fs.readFileSync(path.join(__dirname,'../../supabase/migrations',name),'utf8'));
    for(const [key,id] of Object.entries(USERS)) await db.query("INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES($1,$2,'{\"is_test\":true}')",[id,`parent-${key.toLowerCase()}@example.test`]);
    for(const [key,id] of Object.entries(CHILDREN)) await db.query('INSERT INTO public.babies(id,user_id,name,feeding_stage) VALUES($1,$2,$3,8)',[id,USERS[key[0]],`Copil test ${key}`]);
  }
  return db;
}
async function asUser(db,id,run,isTest=true){
  await db.exec('BEGIN');
  try{
    await db.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify(id?{sub:id,role:'authenticated',app_metadata:{is_test:isTest}}:{})]);
    await db.exec(id?'SET LOCAL ROLE authenticated':'SET LOCAL ROLE anon');
    const value=await run(db);await db.exec('COMMIT');return value;
  }catch(e){await db.exec('ROLLBACK');throw e;}
}
module.exports={createDatabase,asUser,USERS,CHILDREN};
