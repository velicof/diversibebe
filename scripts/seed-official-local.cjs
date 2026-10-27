// Prepared for the genuine LOCAL Supabase stack. Not executed while Docker is unavailable.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {USERS,CHILDREN}=require('../tests/fixtures/database.cjs');
(async()=>{
 const url=new URL(process.env.V2_LOCAL_ADMIN_URL||'http://127.0.0.1:54321');
 if(url.origin!=='http://127.0.0.1:54321'||url.pathname!=='/'||url.username||url.password||url.search||url.hash) throw new Error('Only the genuine loopback test stack is allowed');
 const key=process.env.V2_LOCAL_SERVICE_ROLE_KEY;
 if(!key) throw new Error('Set V2_LOCAL_SERVICE_ROLE_KEY in the terminal only; never commit it');
 const client=createClient(url.origin,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const target=path.resolve(__dirname,'../../finalization/local-test-access.json');
 if(fs.existsSync(target)) throw new Error('Existing local credentials are preserved. Move that private file aside before initializing a fresh official stack.');
 const accounts=[];
 for(const [label,id] of Object.entries(USERS)){
  const email=`parent-${label.toLowerCase()}@example.test`,password=crypto.randomBytes(20).toString('base64url');
  const {error}=await client.auth.admin.createUser({id,email,password,email_confirm:true,app_metadata:{is_test:true}});
  if(error) throw new Error('Synthetic user initialization failed; inspect the local stack privately');
  accounts.push({id,email,password});
  for(const [childLabel,childId] of Object.entries(CHILDREN).filter(([name])=>name[0]===label)){
   const result=await client.from('babies').insert({id:childId,user_id:id,name:`Copil test ${childLabel}`,feeding_stage:8});
   if(result.error) throw new Error('Synthetic child initialization failed');
  }
 }
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({accounts},null,2),{flag:'wx'});
 console.log('Synthetic accounts created locally. Credentials saved only in the private untracked file. No emails requested.');
})().catch(e=>{console.error(e.message);process.exit(1);});
