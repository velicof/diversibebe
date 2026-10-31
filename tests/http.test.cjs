const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const {load}=require('./load-ts.cjs');
const {V2Repository}=load('src/features/v2/cloud/repository.ts');
const {assertIsolatedSupabaseUrl}=load('src/features/v2/cloud/guard.ts');
const {emptyState}=load('src/features/v2/model.ts');
const apiUrl=process.env.V2_TEST_API_URL||'http://127.0.0.1:54329';
assertIsolatedSupabaseUrl(apiUrl);
const publicKey=process.env.V2_TEST_ANON_KEY||'local-test-public-key';
test('production and remote Supabase destinations are blocked',()=>{
 for(const url of ['https://smyimgvxlggggjeoajdo.supabase.co','https://other-test.supabase.co','http://127.0.0.1.evil.invalid','file:///test','http://localhost@evil.invalid']) assert.throws(()=>assertIsolatedSupabaseUrl(url));
 assert.equal(assertIsolatedSupabaseUrl('http://127.0.0.1:54321').hostname,'127.0.0.1');
});
test('real SDK HTTP integration: login, persist, second device, logout/login and account isolation',{skip:!process.env.V2_RUN_HTTP_TESTS},async()=>{
 const accounts=JSON.parse(fs.readFileSync(process.env.V2_TEST_ACCESS_FILE || path.resolve(__dirname,'../../finalization/local-test-access.json'),'utf8')).accounts;
 const create=()=>createClient(apiUrl,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const a=create(),b=create(),device=create();
 try{
  assert.equal((await a.auth.signInWithPassword(accounts[0])).error,null);
  assert.equal((await b.auth.signInWithPassword(accounts[1])).error,null);
  const repo=new V2Repository(a),other=new V2Repository(b);
  const state=await repo.load(),child=state.children[0].id;
  await repo.apply(child,{type:'onboard',stage:8,introduced:['dovlecel']},emptyState);
  const favorite=await repo.call(child,'favorite',{recipeId:'piure-dovlecel',enabled:true});assert.ok(favorite.state.favorites.includes('piure-dovlecel'));
  await repo.call(child,'plan',{slot:'2026-10-30',recipeId:'piure-dovlecel'});
  await repo.call(child,'preferences',{pantry:[],shoppingChecked:['1 dovlecel mic (150g)']});
  assert.equal((await device.auth.signInWithPassword(accounts[0])).error,null);
  assert.ok((await new V2Repository(device).load()).state.favorites.includes('piure-dovlecel'));
  assert.equal((await new V2Repository(device).load()).state.plan.find(p=>p.slot==='2026-10-30').recipeId,'piure-dovlecel');
  await assert.rejects(other.load(child));
  await assert.rejects(other.call(child,'plan',{slot:'2026-10-30',recipeId:'piure-morcov'}));
  assert.ok(!(await other.load()).state.favorites.includes('piure-dovlecel'));
  await a.auth.signOut({scope:'local'});await assert.rejects(repo.load());
  assert.equal((await a.auth.signInWithPassword(accounts[0])).error,null);
  assert.ok((await repo.load()).state.favorites.includes('piure-dovlecel'));
  const invalid=await create().auth.signInWithPassword({email:accounts[0].email,password:'not-the-password'});assert.ok(invalid.error);
 }finally{await a.auth.signOut({scope:'local'});await b.auth.signOut({scope:'local'});await device.auth.signOut({scope:'local'});}
});
