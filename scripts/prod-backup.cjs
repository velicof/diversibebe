// Logical backup of the DiversiBebe database (schemas public + auth), encrypted at rest, verified by restore.
// Run by the FOUNDER in their own terminal: the database password never reaches the agent, the repo or a log.
//
//   Backup:  set PGHOST/PGPORT/PGUSER/PGPASSWORD (Supabase → Connect → Session pooler) and BACKUP_PASSPHRASE,
//            then: node scripts/prod-backup.cjs
//   Verify:  node scripts/prod-backup.cjs --verify <file.dump.enc>            (decrypt + table of contents)
//            node scripts/prod-backup.cjs --verify <file.dump.enc> --restore-local
//            (restores into a throwaway database on the local PostgreSQL 17 at 127.0.0.1:54322, compares row
//             counts with the manifest, then drops it; nothing leaves the machine)
//
// Output: BACKUP_DIR (default %USERPROFILE%\DiversiBebe-backups, refused inside the repository):
//   diversibebe-<timestamp>.dump.enc  (AES-256-GCM, key = scrypt(BACKUP_PASSPHRASE))
//   diversibebe-<timestamp>.manifest.json  (row counts, sha256, versions; no rows, no secrets)
// Cost: 0 (local pg_dump 17 from ../real-supabase-runtime). Read-only for the source database.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),bin=path.resolve(repo,'../real-supabase-runtime/postgres/pgsql/bin');
const TABLES=['auth.users','public.profiles','public.babies','public.tried_foods','public.food_journal','public.allergy_records','public.favorite_recipes','public.cooked_recipes','public.custom_recipes','public.custom_foods','public.login_events','public.feedback'];
const MAGIC=Buffer.from('DBBK1');
const fail=m=>{console.error('✖ '+m);process.exit(1);};
const loopback=h=>['127.0.0.1','localhost','::1'].includes(h);
function run(exe,args,env,opts={}){
  const r=spawnSync(path.join(bin,exe),args,{env,encoding:opts.binary?undefined:'utf8',windowsHide:true,maxBuffer:256<<20});
  const secret=env.PGPASSWORD;const clean=s=>secret?String(s||'').replaceAll(secret,'[redacted]'):String(s||'');
  if(r.status!==0&&!opts.allowFail)fail(`${exe} failed: ${clean(r.stderr||r.error?.message)}`);
  return {out:clean(r.stdout),err:clean(r.stderr),status:r.status};
}
function key(passphrase,salt){if(!passphrase||passphrase.length<16)fail('BACKUP_PASSPHRASE must have at least 16 characters (store it in a password manager).');return crypto.scryptSync(passphrase,salt,32,{N:1<<15,r:8,p:1,maxmem:64<<20});}
function encrypt(src,dst,passphrase){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(passphrase,salt),iv);
  const body=Buffer.concat([c.update(fs.readFileSync(src)),c.final()]);
  fs.writeFileSync(dst,Buffer.concat([MAGIC,salt,iv,c.getAuthTag(),body]));
}
function decrypt(src,dst,passphrase){
  const b=fs.readFileSync(src);if(!b.subarray(0,5).equals(MAGIC))fail('not a DiversiBebe backup file');
  const salt=b.subarray(5,21),iv=b.subarray(21,33),tag=b.subarray(33,49),d=crypto.createDecipheriv('aes-256-gcm',key(passphrase,salt),iv);
  d.setAuthTag(tag);try{fs.writeFileSync(dst,Buffer.concat([d.update(b.subarray(49)),d.final()]));}catch{fail('wrong passphrase or corrupted file');}
}
const sha256=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const counts=(env,db)=>Object.fromEntries(run('psql.exe',['-X','-At','-d',db,'-c',TABLES.map(t=>`SELECT '${t}',count(*) FROM ${t}`).join(' UNION ALL ')],env).out.trim().split(/\r?\n/).map(l=>{const [t,n]=l.split('|');return [t,Number(n)];}));

function backup(){
  const {PGHOST,PGUSER,PGPASSWORD,BACKUP_PASSPHRASE}=process.env;
  if(!PGHOST||!PGUSER||!PGPASSWORD)fail('Set PGHOST, PGUSER and PGPASSWORD in this terminal (Supabase → Connect → Session pooler).');
  const dir=path.resolve(process.env.BACKUP_DIR||path.join(os.homedir(),'DiversiBebe-backups'));
  const rel=path.relative(repo,dir);
  if(!rel.startsWith('..')&&!path.isAbsolute(rel))fail('BACKUP_DIR must be outside the repository (a backup is never committed).');
  key(BACKUP_PASSPHRASE,Buffer.alloc(16));fs.mkdirSync(dir,{recursive:true});
  const env={...process.env,PGPORT:process.env.PGPORT||'5432',PGDATABASE:process.env.PGDATABASE||'postgres',PGSSLMODE:process.env.PGSSLMODE||(loopback(PGHOST)?'disable':'require'),PGCONNECT_TIMEOUT:'10',PGAPPNAME:'diversibebe-backup'};
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),base=path.join(dir,`diversibebe-${stamp}`),plain=path.join(os.tmpdir(),`db-${crypto.randomUUID()}.dump`);
  const server=run('psql.exe',['-X','-At','-c','SHOW server_version'],env).out.trim();
  const before=counts(env,env.PGDATABASE);
  console.log(`Server ${server}. Dumping schemas public + auth (read-only)…`);
  run('pg_dump.exe',['--format=custom','--compress=9','--schema=public','--schema=auth','--file',plain],env);
  try{
    encrypt(plain,base+'.dump.enc',BACKUP_PASSPHRASE);
    const manifest={createdAt:new Date().toISOString(),source:{host:PGHOST,database:env.PGDATABASE,serverVersion:server},pgDump:run('pg_dump.exe',['--version'],env).out.trim(),schemas:['public','auth'],rowCounts:before,file:path.basename(base+'.dump.enc'),sha256:sha256(base+'.dump.enc'),encryption:'AES-256-GCM, scrypt(N=32768,r=8,p=1)'};
    fs.writeFileSync(base+'.manifest.json',JSON.stringify(manifest,null,2)+'\n');
    console.log(`✔ ${base}.dump.enc\n✔ ${base}.manifest.json\nRows: ${Object.entries(before).map(([t,n])=>`${t}=${n}`).join(' ')}\nNext: node scripts/prod-backup.cjs --verify "${base}.dump.enc" --restore-local`);
  }finally{fs.rmSync(plain,{force:true});}
}

function verify(file,restore){
  const {BACKUP_PASSPHRASE}=process.env,manifestFile=file.replace(/\.dump\.enc$/,'.manifest.json');
  if(!fs.existsSync(file)||!fs.existsSync(manifestFile))fail('backup or manifest not found');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  if(sha256(file)!==manifest.sha256)fail('sha256 mismatch: the backup file changed since it was written');
  const plain=path.join(os.tmpdir(),`db-${crypto.randomUUID()}.dump`);decrypt(file,plain,BACKUP_PASSPHRASE);
  try{
    const toc=run('pg_restore.exe',['--list',plain],process.env).out;
    const data=TABLES.filter(t=>toc.includes(`TABLE DATA ${t.split('.')[0]} ${t.split('.')[1]} `));
    if(data.length!==TABLES.length)fail(`table data missing from the dump: ${TABLES.filter(t=>!data.includes(t)).join(', ')}`);
    console.log(`✔ decrypted, sha256 matches, ${data.length}/${TABLES.length} tables with data in the table of contents`);
    if(!restore)return;
    const cfg=JSON.parse(fs.readFileSync(path.resolve(repo,'../real-supabase-runtime/private/runtime.json'),'utf8'));
    const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'54322',PGUSER:'postgres',PGPASSWORD:cfg.dbPassword,PGSSLMODE:'disable'};
    const db='diversibebe_restore_check';
    run('psql.exe',['-X','-q','-d','postgres','-c',`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`],env);run('psql.exe',['-X','-q','-d','postgres','-c',`CREATE DATABASE ${db}`],env);
    try{
      run('psql.exe',['-X','-q','-d',db,'-c','CREATE SCHEMA IF NOT EXISTS extensions;CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;'],env);
      // Supabase-only roles/extensions do not exist locally: object errors are reported, row counts decide.
      const r=run('pg_restore.exe',['--no-owner','--no-privileges','--dbname',db,plain],env,{allowFail:true});
      const restored=counts(env,db),diff=TABLES.filter(t=>restored[t]!==manifest.rowCounts[t]);
      console.log(`pg_restore: ${(r.err.match(/error:/g)||[]).length} non-data errors (Supabase-specific roles/extensions)`);
      if(diff.length)fail(`row counts differ after restore: ${diff.map(t=>`${t} ${restored[t]}≠${manifest.rowCounts[t]}`).join(', ')}`);
      console.log(`✔ restore check: all ${TABLES.length} tables restored with identical row counts`);
    }finally{run('psql.exe',['-X','-q','-d','postgres','-c',`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`],env);}
  }finally{fs.rmSync(plain,{force:true});}
}

const i=process.argv.indexOf('--verify');
if(i>0)verify(path.resolve(process.argv[i+1]||''),process.argv.includes('--restore-local'));else backup();
