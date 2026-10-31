// Synthetic, idempotent seed. Adds missing users/rows; never deletes existing data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const runtime=path.resolve(__dirname,'../../real-supabase-runtime'),file=path.join(runtime,'private/accounts.json');
const config=JSON.parse(fs.readFileSync(path.join(runtime,'private/runtime.json'),'utf8'));
const admin=createClient('http://127.0.0.1:54321',config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const identities=[['11111111-1111-4111-8111-111111111111','parent-a@example.test'],['22222222-2222-4222-8222-222222222222','parent-b@example.test'],['33333333-3333-4333-8333-333333333333','founder@example.test']];
const credentials=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{accounts:identities.map(([id,email])=>({id,email,password:crypto.randomBytes(18).toString('base64url')}))};
const check=r=>{if(r.error)throw new Error(r.error.message);return r.data};
(async()=>{
 for(const a of credentials.accounts){const found=await admin.auth.admin.getUserById(a.id);if(!found.data.user)check(await admin.auth.admin.createUser({id:a.id,email:a.email,password:a.password,email_confirm:true,role:"authenticated",app_metadata:{is_test:true}}));else if(found.data.user.role!=="authenticated")check(await admin.auth.admin.updateUserById(a.id,{role:"authenticated"}));}
 fs.writeFileSync(file,JSON.stringify(credentials,null,2));
 const children=[['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',identities[0][0],'Copil test A'],['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',identities[0][0],'Copil test A2'],['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',identities[1][0],'Copil test B'],['cccccccc-cccc-4ccc-8ccc-cccccccccccc',identities[2][0],'Profil demonstrativ']];
 for(const [id,user_id,name] of children){const rows=check(await admin.from('babies').select('id').eq('id',id));if(!rows.length)check(await admin.from('babies').insert({id,user_id,name,feeding_stage:8}));}
 const founder=createClient('http://127.0.0.1:54321',config.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 check(await founder.auth.signInWithPassword(credentials.accounts[2]));
 const child=children[3][0],call=async(action,payload)=>check(await founder.rpc('v2_apply_action',{p_baby_id:child,p_action:action,p_payload:payload}));
 let state=check(await founder.rpc('v2_load_state',{p_baby_id:child}));
 if(!state.onboarded)await call('profile',{stage:8,introduced:['dovlecel','morcov','cartof']});
 for(const recipeId of ['piure-dovlecel','piure-morcov'])if(!state.favorites.includes(recipeId))await call('favorite',{recipeId,enabled:true});
 for(let i=0;i<3;i++){const day=new Date();day.setDate(day.getDate()+i);const slot=day.toLocaleDateString('en-CA',{timeZone:'Europe/Bucharest'});if(!state.plan.some(p=>p.slot===slot))await call('plan',{slot,recipeId:i%2?'piure-morcov':'piure-dovlecel'});}
 if(!state.journey)check(await founder.rpc('v2_save_journey',{p_baby_id:child,p_preferences:{version:1,id:crypto.randomUUID(),step:3,challenge:'ideas',ageBand:'9-12',context:'today',pantry:[],startedAt:Date.now(),completed:true,guideSaved:false,resultIds:['piure-dovlecel','piure-morcov']}}));
 await founder.auth.signOut({scope:'local'});
 console.log('Three synthetic accounts and four child profiles ready. Founder has saved demo meals, journey and a three-day plan. Credentials remain in runtime/private/accounts.json.');
})().catch(e=>{console.error(e.message);process.exit(1)});
