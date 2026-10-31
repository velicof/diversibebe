// Loopback transport proxy. Authentication and SQL are handled by real GoTrue/PostgREST.
const http=require('node:http'),path=require('node:path'),fs=require('node:fs');
const runtime=path.resolve(__dirname,'../../real-supabase-runtime');
if(!fs.existsSync(path.join(runtime,'private/runtime.json')))throw new Error('Native runtime not initialized');
const allowedOrigins=new Set(['http://127.0.0.1:3100','http://localhost:3100']);
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&!allowedOrigins.has(origin)){res.writeHead(403).end();return;}
 res.setHeader('Access-Control-Allow-Origin',origin||'http://127.0.0.1:3100');
 res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,range-unit');
 res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,PUT,DELETE,OPTIONS');
 res.setHeader('Access-Control-Expose-Headers','content-range');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
 const url=new URL(req.url,'http://127.0.0.1:54321');
 if(url.pathname==='/health'){
  const status=await Promise.all([fetch('http://127.0.0.1:54326/health'),fetch('http://127.0.0.1:54327/')]).catch(()=>[]);
  res.writeHead(status.length===2&&status.every(r=>r.ok)?200:503,{'Content-Type':'application/json'}).end(JSON.stringify({backend:'native-gotrue-postgrest-postgresql',fullSupabaseStack:false,auth:'GoTrue v2.197.0 with Windows socket compatibility patch'}));return;
 }
 const auth=url.pathname.startsWith('/auth/v1/'),rest=url.pathname.startsWith('/rest/v1/');
 if(!auth&&!rest){res.writeHead(404).end();return;}
 let body;
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>131072){res.writeHead(413).end();return;}chunks.push(chunk);}body=Buffer.concat(chunks);
  if(auth&&['/auth/v1/signup','/auth/v1/recover','/auth/v1/otp','/auth/v1/admin/users'].includes(url.pathname)){
   try{const v=JSON.parse(body.toString()||'{}');if(typeof v.email!=='string'||!/^[a-z0-9.!#$%&'*+\-/=?^_`{|}~]+@example\.test$/i.test(v.email)){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'synthetic_email_required',message:'Folosește doar o adresă @example.test în acest mediu local.'}));return;}}catch{res.writeHead(400).end();return;}
  }
 }
 const headers={...req.headers};delete headers.host;delete headers.connection;delete headers['content-length'];
 const target={hostname:'127.0.0.1',port:auth?54326:54327,path:url.pathname.replace(auth?'/auth/v1':'/rest/v1','')+url.search,method:req.method,headers};
 const upstream=http.request(target,reply=>{
  for(const [key,value] of Object.entries(reply.headers))if(value!==undefined&&!['connection','access-control-allow-origin','access-control-allow-headers','access-control-expose-headers'].includes(key))res.setHeader(key,value);
  res.writeHead(reply.statusCode||502);reply.pipe(res);
 });
 upstream.setTimeout(15000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Serviciul local nu răspunde.'}));});
 upstream.end(body);
});
server.listen(54321,'127.0.0.1',()=>console.log('Native GoTrue/PostgREST gateway: http://127.0.0.1:54321; synthetic email addresses only'));
