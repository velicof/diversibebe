// The PGlite/native baseline must stay identical to production, or every compatibility test above proves nothing.
// Refresh tests/fixtures/production-metadata.json from production metadata before each release (docs/ai-ops/MIGRATION-V1-V2.md).
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDatabase}=require('./fixtures/database.cjs');
const production=require('./fixtures/production-metadata.json');
// Same catalog queries as the read-only production snapshot, so both sides format definitions identically.
const CATALOG={
  constraints:`SELECT c.conrelid::regclass::text||'|'||c.conname||'|'||pg_get_constraintdef(c.oid) x FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype IN ('p','u','f','c')`,
  indexes:`SELECT tablename||'|'||indexname||'|'||indexdef x FROM pg_indexes WHERE schemaname='public'`,
  policies:`SELECT tablename||'|'||policyname||'|'||permissive||'|'||array_to_string(roles,',')||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'') x FROM pg_policies WHERE schemaname='public'`,
  triggers:`SELECT event_object_schema||'.'||event_object_table||'|'||trigger_name||'|'||action_timing||' '||event_manipulation||'|'||action_statement x FROM information_schema.triggers WHERE event_object_schema='public' OR (event_object_schema='auth' AND event_object_table='users')`,
  functions:`SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')|definer='||p.prosecdef||'|config='||coalesce(array_to_string(p.proconfig,';'),'') x FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'`,
  rls:`SELECT c.relname||'|rls='||c.relrowsecurity||'|force='||c.relforcerowsecurity x FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`,
  grants:`SELECT table_name||'|'||grantee||'|'||string_agg(privilege_type,',' ORDER BY privilege_type) x FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC') AND privilege_type<>'MAINTAIN' GROUP BY table_name,grantee`,
  views:`SELECT table_name x FROM information_schema.views WHERE table_schema='public'`,
};
test('the test baseline matches the production schema snapshot column by column',async()=>{
  const db=await createDatabase(undefined,{migrations:false});try{
    const {rows}=await db.query(`SELECT table_name,json_agg(column_name||':'||udt_name||CASE WHEN is_nullable='NO' THEN '!' ELSE '' END ORDER BY column_name) cols
      FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) GROUP BY table_name`,[Object.keys(production.columns)]);
    const local=Object.fromEntries(rows.map(r=>[r.table_name,r.cols]));
    for(const [table,cols] of Object.entries(production.columns)) assert.deepEqual(local[table],cols,`drift in public.${table}`);
  }finally{await db.close();}
});
test('the test baseline matches production constraints, indexes, RLS policies, triggers, functions and grants',async()=>{
  const db=await createDatabase(undefined,{migrations:false});try{
    for(const [kind,query] of Object.entries(CATALOG)){
      const local=(await db.query(query)).rows.map(r=>r.x).sort();
      assert.deepEqual(local,production[kind],`drift in ${kind}`);
    }
  }finally{await db.close();}
});
