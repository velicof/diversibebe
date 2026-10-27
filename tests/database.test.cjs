const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const CHILD_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', CHILD_A2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', CHILD_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('prepared migrations enforce owners, child references, multi-child uniqueness and quotas in local PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid primary key);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY);
      CREATE TABLE public.babies(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id));
      CREATE TABLE public.tried_foods(id text PRIMARY KEY,user_id uuid NOT NULL,baby_id uuid REFERENCES public.babies(id),food_id text NOT NULL,UNIQUE(user_id,food_id));
      CREATE TABLE public.custom_recipes(id text PRIMARY KEY,user_id uuid NOT NULL);
      CREATE TABLE public.food_journal(id text PRIMARY KEY,user_id uuid NOT NULL,baby_id uuid REFERENCES public.babies(id),custom_recipe_id text REFERENCES public.custom_recipes(id));
      CREATE VIEW public.user_login_summary AS SELECT id FROM auth.users;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated;
      CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN RETURN NEW; END$$;
      INSERT INTO auth.users VALUES('${A}'),('${B}');
      INSERT INTO public.profiles VALUES('${A}'),('${B}');
      INSERT INTO public.babies VALUES('${CHILD_A}','${A}'),('${CHILD_A2}','${A}'),('${CHILD_B}','${B}');
      INSERT INTO public.custom_recipes VALUES('a-recipe','${A}'),('b-recipe','${B}');
      INSERT INTO public.tried_foods VALUES('first','${A}','${CHILD_A}','morcov');
    `);
    for (const table of ['profiles','babies','tried_foods','custom_recipes','food_journal']) await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_permissive ON public.${table} FOR ALL TO authenticated USING(true) WITH CHECK(true);`);
    for (const name of ['20261027055351_protect_family_data.sql','20261027055353_bebeasist_quota.sql']) await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8'));
    async function asRole(role, id) { await db.exec('RESET ROLE'); await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`,[id ?? '']); await db.exec(`SET ROLE ${role}`); }
    await asRole('anon');
    await assert.rejects(db.query('SELECT count(*) FROM public.user_login_summary'), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM public.babies'), /permission denied/);
    await assert.rejects(db.query('SELECT public.consume_bebeasist_quota()'), /permission denied/);
    await asRole('authenticated',A);
    await assert.rejects(db.query('SELECT count(*) FROM public.user_login_summary'), /permission denied/);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.babies')).rows[0].n,2);
    assert.equal((await db.query(`UPDATE public.babies SET user_id='${A}' WHERE id='${CHILD_B}' RETURNING id`)).rows.length,0);
    await assert.rejects(db.query(`INSERT INTO public.food_journal VALUES('foreign-child','${A}','${CHILD_B}',null)`), /foreign key/);
    await assert.rejects(db.query(`INSERT INTO public.food_journal VALUES('foreign-recipe','${A}','${CHILD_A}','b-recipe')`), /foreign key/);
    await assert.rejects(db.query(`INSERT INTO public.food_journal VALUES('foreign-owner','${B}','${CHILD_B}',null)`), /row-level security/);
    await db.exec(`INSERT INTO public.food_journal VALUES('owned','${A}','${CHILD_A}','a-recipe'); INSERT INTO public.tried_foods VALUES('second-child','${A}','${CHILD_A2}','morcov');`);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.tried_foods')).rows[0].n,2);
    await assert.rejects(db.exec(`INSERT INTO public.tried_foods VALUES('duplicate','${A}','${CHILD_A2}','morcov')`), /unique/);
    await assert.rejects(db.query('SELECT * FROM app_private.ai_usage'), /permission denied/);
    const quota = await Promise.all(Array.from({length:15},()=>db.query('SELECT public.consume_bebeasist_quota() AS allowed')));
    assert.equal(quota.filter(r=>r.rows[0].allowed).length,10);
    await asRole('authenticated',B);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.food_journal')).rows[0].n,0);
    assert.equal((await db.query('SELECT public.consume_bebeasist_quota() AS allowed')).rows[0].allowed,true);
    await asRole('authenticated');
    await assert.rejects(db.query('SELECT public.consume_bebeasist_quota()'), /authentication required/);
  } finally { await db.close(); }
});
