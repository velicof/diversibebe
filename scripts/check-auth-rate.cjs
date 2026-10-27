const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 let limitedAt=0;
 for(let i=1;i<=21;i++){
  const response=await fetch('http://127.0.0.1:54329/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:'local-test-public-key'},body:JSON.stringify({email:'rate-limit@example.test',password:'invalid-synthetic-password'})});
  if(response.status===429){limitedAt=i;break;}
  assert.ok([400,401].includes(response.status));
 }
 assert.ok(limitedAt>0,'synthetic authentication rate limit must reject with 429');
 fs.writeFileSync(path.resolve(__dirname,'../../finalization/auth-rate-limit.json'),JSON.stringify({backend:'synthetic contract fixture only',status:429,limitedWithinRequests:limitedAt,configuredLimit:'20 attempts per minute; previous test attempts can share the same window',passed:true},null,2));
 console.log('Synthetic authentication rate limit: PASS (429).');
})().catch(e=>{console.error(e.message);process.exit(1);});
