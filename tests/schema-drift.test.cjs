// The PGlite/native baseline must stay identical to production, or every compatibility test above proves nothing.
// Refresh tests/fixtures/production-metadata.json from production metadata before each release (docs/ai-ops/ARCHITECTURE.md).
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDatabase}=require('./fixtures/database.cjs');
const production=require('./fixtures/production-metadata.json');
test('the test baseline matches the production schema snapshot column by column',async()=>{
  const db=await createDatabase(undefined,{migrations:false});try{
    const {rows}=await db.query(`SELECT table_name,json_agg(column_name||':'||udt_name||CASE WHEN is_nullable='NO' THEN '!' ELSE '' END ORDER BY column_name) cols
      FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1) GROUP BY table_name`,[Object.keys(production.columns)]);
    const local=Object.fromEntries(rows.map(r=>[r.table_name,r.cols]));
    for(const [table,cols] of Object.entries(production.columns)) assert.deepEqual(local[table],cols,`drift in public.${table}`);
  }finally{await db.close();}
});
