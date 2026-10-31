const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {load}=require('./load-ts.cjs');
test('independent login summary hotfix denies anon/authenticated and preserves the SQL owner, including safe rollback',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE TABLE public.synthetic_logins(id int,email text);INSERT INTO public.synthetic_logins VALUES(1,'parent@example.test');CREATE VIEW public.user_login_summary AS SELECT id,email FROM public.synthetic_logins;GRANT SELECT ON public.user_login_summary TO anon,authenticated;`);
  for(const role of ['anon','authenticated'])assert.equal((await db.query('SELECT has_table_privilege($1,\'public.user_login_summary\',\'SELECT\') AS allowed',[role])).rows[0].allowed,true);
  const hotfix=fs.readFileSync(path.join(__dirname,'../supabase/operations/security-hotfix/01-close-login-summary.sql'),'utf8');
  await db.exec(hotfix);await db.exec(hotfix);
  for(const script of [null,'02-safe-operational-rollback.sql']){
   if(script)await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/operations/security-hotfix',script),'utf8'));
   for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(db.query('SELECT * FROM public.user_login_summary'),/permission denied/);await db.exec('RESET ROLE');}
   assert.equal((await db.query('SELECT count(*)::int AS n FROM public.user_login_summary')).rows[0].n,1);
  }
 }finally{await db.close();}
});
test('plaintext registration cleanup is narrow and tolerates unavailable browser storage',()=>{
 const {clearLegacyRegistrationCredentials}=load('src/lib/security/registration-credentials.ts');
 const removed=[];clearLegacyRegistrationCredentials({removeItem:key=>removed.push(key)});
 assert.deepEqual(removed,['register_step1','diversibebe_register_step1']);
 assert.doesNotThrow(()=>clearLegacyRegistrationCredentials({removeItem(){throw new Error('disabled')}}));
 const draft=fs.readFileSync(path.join(__dirname,'../src/app/register/RegistrationDraft.tsx'),'utf8');
 assert.ok(!draft.includes('setItem('));
});
