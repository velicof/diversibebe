const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const native=process.env.V2_TEST_API_URL==='http://127.0.0.1:54321';
test('native GoTrue: real signup/JWT, journey ownership, siblings, legacy preservation and actual server-side expiry',{skip:!native,timeout:210000},async()=>{
 const key=process.env.V2_TEST_ANON_KEY,url=process.env.V2_TEST_API_URL;
 const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),a=client(),b=client();
 const check=r=>{assert.equal(r.error,null, r.error?.message);return r.data;};
 const email='sql-'+crypto.randomUUID()+'@example.test',password=crypto.randomBytes(18).toString('base64url');
 const session=check(await a.auth.signUp({email,password})).session;assert.ok(session?.access_token);
 const claims=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url'));assert.equal(claims.role,'authenticated');assert.equal(claims.app_metadata.is_test,true);assert.ok(claims.session_id);
 check(await b.auth.signUp({email:'other-'+crypto.randomUUID()+'@example.test',password}));
 const children=[crypto.randomUUID(),crypto.randomUUID()];
 const call=async(child,action,payload)=>check(await a.rpc('v2_apply_action',{p_baby_id:child,p_action:action,p_payload:payload}));
 for(const child of children){await call(null,'create-child',{id:child,label:'Sintetic',stage:8});await call(child,'profile',{stage:8,introduced:[]});}
 const journey={version:1,id:crypto.randomUUID(),step:3,challenge:'time',ageBand:'9-12',context:'under15',pantry:[],startedAt:Date.now(),completed:true,guideSaved:false,resultIds:['piure-dovlecel']};
 check(await a.rpc('v2_save_journey',{p_baby_id:children[0],p_preferences:journey}));
 assert.deepEqual(check(await a.rpc('v2_load_state',{p_baby_id:children[0]})).journey,journey);
 assert.equal(check(await a.rpc('v2_load_state',{p_baby_id:children[1]})).journey,null);
 assert.ok((await b.rpc('v2_save_journey',{p_baby_id:children[0],p_preferences:journey})).error);
 assert.ok((await b.rpc('v2_edit_child',{p_baby_id:children[0],p_label:'Intrus',p_stage:12})).error);
 assert.ok((await a.rpc('v2_save_journey',{p_baby_id:children[0],p_preferences:{...journey,email:'not stored'}})).error);
 check(await a.from('tried_foods').insert({user_id:session.user.id,baby_id:null,food_id:'morcov',food_name:'Morcov',try_count:4}));
 for(const child of children){await call(child,'profile',{stage:8,introduced:['morcov']});await call(child,'confirm',{id:crypto.randomUUID(),recipeId:'piure-dovlecel'});}
 const legacy=check(await a.from('tried_foods').select('try_count').is('baby_id',null).eq('food_id','morcov').single());assert.equal(legacy.try_count,4);
 check(await a.rpc('v2_mark_legacy_recipe',{p_recipe_id:'piure-dovlecel'}));check(await a.rpc('v2_mark_legacy_recipe',{p_recipe_id:'piure-dovlecel'}));
 assert.equal(check(await a.from('cooked_recipes').select('id').eq('source','legacy')).length,1);
 for(const child of children)assert.equal(check(await a.rpc('v2_load_state',{p_baby_id:child})).uses.length,1);
 for(const sdk of [a,b])assert.ok((await sdk.from('user_login_summary').select('*')).error);
 const headers={apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
 const endpoint=url+'/rest/v1/rpc/v2_load_state',body=JSON.stringify({p_baby_id:children[0]});
 assert.equal((await fetch(endpoint,{method:'POST',headers,body})).status,200);
 const wait=Math.max(0,claims.exp*1000-Date.now()+32000);assert.ok(wait<165000);
 console.log('Waiting for genuine GoTrue JWT expiry; no browser clock or token signature is altered.');
 await new Promise(r=>setTimeout(r,wait));
 assert.equal((await fetch(endpoint,{method:'POST',headers,body})).status,401);
 check(await a.auth.refreshSession());assert.equal(check(await a.rpc('v2_load_state',{p_baby_id:children[0]})).selectedBabyId,children[0]);
 await a.auth.signOut({scope:'local'});await b.auth.signOut({scope:'local'});
});
