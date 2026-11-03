const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn,spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),runtime=path.resolve(repo,'../real-supabase-runtime');
const priv=path.join(runtime,'private'),logs=path.join(runtime,'logs');
fs.mkdirSync(priv,{recursive:true});fs.mkdirSync(logs,{recursive:true});
const file=path.join(priv,'runtime.json');
const random=()=>crypto.randomBytes(36).toString('base64url');
function jwt(secret,role){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const data=enc({alg:'HS256',typ:'JWT'})+'.'+enc({iss:'supabase',role,aud:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+31536000});return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url');}
if(!fs.existsSync(file)){const secret=random();fs.writeFileSync(file,JSON.stringify({dbPassword:random(),authPassword:random(),restPassword:random(),jwtSecret:secret,anonKey:jwt(secret,'anon'),serviceKey:jwt(secret,'service_role')},null,2),{flag:'wx'});}
const config=JSON.parse(fs.readFileSync(file,'utf8'));
const env={...process.env,PGPASSWORD:config.dbPassword,PGCONNECT_TIMEOUT:"3"};
const pg=path.join(runtime,'postgres/pgsql/bin');
function sql(query,database='diversibebe_dev'){
 const r=spawnSync(path.join(pg,'psql.exe'),['-X','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','54322','-U','postgres','-d',database,'-At','-c',query],{env,encoding:'utf8',windowsHide:true});
 if(r.status!==0)throw new Error((r.stderr||r.error?.message||'Local SQL failed').replaceAll(config.dbPassword,'[redacted]').replaceAll(config.authPassword,'[redacted]').replaceAll(config.restPassword,'[redacted]'));
 return r.stdout.trim();
}
const pidsFile=path.join(priv,'processes.json');let pids=fs.existsSync(pidsFile)?JSON.parse(fs.readFileSync(pidsFile,'utf8')):{};
async function start(name,command,args,extra={}){
 const port={postgres:54322,mailpit:54324,auth:54326,postgrest:54327,gateway:54321}[name];
 const listening=await new Promise(resolve=>{const s=require('node:net').connect({host:'127.0.0.1',port});s.setTimeout(500);s.once('connect',()=>{s.destroy();resolve(true)});s.once('error',()=>resolve(false));s.once('timeout',()=>{s.destroy();resolve(false)})});
 if(listening)return;
  const descriptor=path.join(priv,'launch-'+name+'.json');
 fs.writeFileSync(descriptor,JSON.stringify({command,args,cwd:runtime,environment:extra,stdout:path.join(logs,name+'.log'),stderr:path.join(logs,name+'.err.log')}));
 const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(repo,'scripts/native-process.ps1'),'-Descriptor',descriptor],{windowsHide:true,stdio:'ignore'});
 child.unref();pids[name]=child.pid;fs.writeFileSync(pidsFile,JSON.stringify(pids,null,2));
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url){for(let i=0;i<80;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1500)});if(r.ok)return;}catch{}await pause(250);}throw new Error('Local service did not become ready: '+url);}
const quote=s=>"'"+s.replaceAll("'","''")+"'";
async function database(){
 const data=path.join(priv,'postgres-data');
 if(!fs.existsSync(path.join(data,'PG_VERSION'))){
  const passwordFile=path.join(priv,'initdb-password.txt');fs.writeFileSync(passwordFile,config.dbPassword);
  const r=spawnSync(path.join(pg,'initdb.exe'),['-D',data,'-U','postgres','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--pwfile='+passwordFile,'--encoding=UTF8','--locale=C'],{encoding:'utf8',windowsHide:true});
  if(r.status!==0)throw new Error(r.stderr||'PostgreSQL initdb failed');console.log('Initialized new dedicated local PostgreSQL cluster.');
 }
 let running=false;try{running=sql('SELECT 1','postgres')==='1';}catch{} if(!running)await start('postgres',path.join(runtime,'postgres-background/pgsql/bin/postgres.exe'),['-D',data,'-h','127.0.0.1','-p','54322']);
 let ok=false;for(let i=0;i<40;i++){try{sql('SELECT 1','postgres');ok=true;break;}catch{await pause(250);}}if(!ok)throw new Error('PostgreSQL loopback startup failed');
 if(sql("SELECT count(*) FROM pg_database WHERE datname='diversibebe_dev'",'postgres')==='0')sql('CREATE DATABASE diversibebe_dev','postgres');
 sql(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD ${quote(config.restPassword)};END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD ${quote(config.authPassword)};END IF;END $$;GRANT anon,authenticated,service_role TO authenticator;CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;CREATE SCHEMA IF NOT EXISTS extensions;CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;ALTER ROLE supabase_auth_admin SET search_path=auth,public,extensions;GRANT USAGE ON SCHEMA public,extensions TO supabase_auth_admin;`);
 console.log('PostgreSQL 17 ready on 127.0.0.1:54322.');
}
function migrate(){
 sql(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid$$;CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO anon,authenticated,service_role;`);
 if(sql("SELECT coalesce(to_regclass('public.user_preferences')::text,'')")===''){
  sql(fs.readFileSync(path.join(repo,'tests/fixtures/current-schema.sql'),'utf8'));
  for(const name of require(path.join(repo,'supabase/v2-release.cjs')).BASELINE)sql(fs.readFileSync(path.join(repo,'supabase/migrations',name),'utf8'));
  console.log('Applied existing schema and three existing security/persistence migrations to the new local database.');
 }
 sql(fs.readFileSync(path.join(repo,'supabase/operations/security-hotfix/01-close-login-summary.sql'),'utf8'));
 sql(`CREATE OR REPLACE FUNCTION auth.mark_native_test_user() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$BEGIN NEW.raw_app_meta_data=coalesce(NEW.raw_app_meta_data,'{}'::jsonb)||'{"is_test":true}'::jsonb;RETURN NEW;END$$;DROP TRIGGER IF EXISTS native_synthetic_user ON auth.users;CREATE TRIGGER native_synthetic_user BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.mark_native_test_user();GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated,service_role;`);
 for(const name of require(path.join(repo,'supabase/v2-release.cjs')).INCREMENTAL){
  sql('CREATE TABLE IF NOT EXISTS app_private.native_applied_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
  if(sql(`SELECT count(*) FROM app_private.native_applied_migrations WHERE name=${quote(name)}`)==='0'){sql(fs.readFileSync(path.join(repo,'supabase/migrations',name),'utf8'));sql(`INSERT INTO app_private.native_applied_migrations(name) VALUES(${quote(name)})`);}
 }
 sql("NOTIFY pgrst,'reload schema'");
}
(async()=>{
 await database();if(process.argv.includes('--database-only'))return;
 await start('mailpit',path.join(runtime,'mailpit/mailpit.exe'),[],{MP_SMTP_BIND_ADDR:'127.0.0.1:54325',MP_UI_BIND_ADDR:'127.0.0.1:54324',MP_DATABASE:path.join(priv,'mailpit.db'),MP_MAX_MESSAGES:'0'});await ready('http://127.0.0.1:54324/api/v1/messages');
 await start('auth',path.join(runtime,'bin/auth.exe'),[],{GOTRUE_DB_DRIVER:'postgres',DB_NAMESPACE:'auth',DATABASE_URL:`postgres://supabase_auth_admin:${config.authPassword}@127.0.0.1:54322/diversibebe_dev?sslmode=disable`,GOTRUE_JWT_SECRET:config.jwtSecret,GOTRUE_JWT_AUD:'authenticated',GOTRUE_JWT_DEFAULT_GROUP_NAME:'authenticated',GOTRUE_JWT_EXP:'120',GOTRUE_JWT_ADMIN_ROLES:'supabase_admin,service_role',API_EXTERNAL_URL:'http://127.0.0.1:54321/auth/v1',GOTRUE_SITE_URL:'http://127.0.0.1:3100/v2/cont',GOTRUE_URI_ALLOW_LIST:'http://127.0.0.1:3100/v2/**',GOTRUE_API_HOST:'127.0.0.1',PORT:'54326',GOTRUE_EXTERNAL_EMAIL_ENABLED:'true',GOTRUE_EXTERNAL_PHONE_ENABLED:'false',GOTRUE_MAILER_AUTOCONFIRM:'true',GOTRUE_SMTP_HOST:'127.0.0.1',GOTRUE_SMTP_PORT:'54325',GOTRUE_SMTP_ADMIN_EMAIL:'no-reply@example.test',GOTRUE_SMTP_SENDER_NAME:'DiversiBebe local',GOTRUE_SMTP_MAX_FREQUENCY:'1s',GOTRUE_MAILER_URLPATHS_RECOVERY:'/auth/v1/verify',GOTRUE_MAILER_URLPATHS_CONFIRMATION:'/auth/v1/verify',GOTRUE_RATE_LIMIT_EMAIL_SENT:'1000',GOTRUE_RATE_LIMIT_VERIFY:'1000',GOTRUE_RATE_LIMIT_TOKEN_REFRESH:'1000',GOTRUE_DISABLE_SIGNUP:'false'});
 await ready('http://127.0.0.1:54326/health');migrate();
 const restFile=path.join(priv,'postgrest.conf');fs.writeFileSync(restFile,`db-uri = "postgres://authenticator:${config.restPassword}@127.0.0.1:54322/diversibebe_dev"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${config.jwtSecret}"\njwt-aud = "authenticated"\nserver-host = "127.0.0.1"\nserver-port = 54327\n`);
 await start('postgrest',path.join(runtime,'postgrest/postgrest.exe'),[restFile],{PATH:pg+path.delimiter+process.env.PATH});await ready('http://127.0.0.1:54327/');
 await start('gateway',process.execPath,[path.join(repo,'scripts/native-gateway.cjs')]);await ready('http://127.0.0.1:54321/health');
 console.log('Real local Auth + PostgREST + PostgreSQL ready. Mailbox: http://127.0.0.1:54324. Not the full Docker Supabase stack.');
})().catch(e=>{console.error(e.message);process.exit(1);});
