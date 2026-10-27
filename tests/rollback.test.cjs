const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createDatabase,asUser,USERS,CHILDREN}=require('./fixtures/database.cjs');
test('operational rollback disables V2 without deleting family data or reopening the login view',async()=>{
 const db=await createDatabase();try{
  await asUser(db,USERS.A,d=>d.query("SELECT public.v2_apply_action($1,'plan','{\"slot\":\"2026-10-30\",\"recipeId\":\"piure-dovlecel\"}')",[CHILDREN.A]));
  await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/operations/v2-disable.sql'),'utf8'));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.meal_plans')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.babies')).rows[0].n,3);
  await assert.rejects(asUser(db,USERS.A,d=>d.query('SELECT public.v2_load_state(null)')),/permission denied/);
  await assert.rejects(asUser(db,null,d=>d.query('SELECT * FROM public.user_login_summary')),/permission denied/);
 }finally{await db.close();}
});
