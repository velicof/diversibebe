const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3101'],{stdio:'ignore',env:{...process.env,DIVERSIBEBE_V2_PREVIEW:'0',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:9',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-preview-only',NEXT_TELEMETRY_DISABLED:'1'}});
 const results=[];
 try{
  let ready=false;for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:3101/v2');ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}
  assert.ok(ready,'isolated boundary server started');
  for(const route of ['/v2','/v2/azi','/v2/cont']){const response=await fetch('http://127.0.0.1:3101'+route);assert.equal(response.status,404);results.push({route,status:response.status,expected:404});}
  for(const [route,expected] of [['/api/chat',401],['/api/send-verification',410]]){const response=await fetch('http://127.0.0.1:3100'+route,{method:'POST'});assert.equal(response.status,expected);results.push({route,status:response.status,expected});}
 }finally{server.kill();}
 fs.writeFileSync(path.resolve(__dirname,'../../finalization/production-boundary.json'),JSON.stringify({localOnly:true,results},null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e.message);process.exit(1);});
