// Private server credentials never enter Next.js. Only the local anon JWT is public.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),runtime=path.resolve(repo,'../real-supabase-runtime');
const config=JSON.parse(fs.readFileSync(path.join(runtime,'private/runtime.json'),'utf8'));
const [command,...args]=process.argv.slice(2);
if(!command||!['build','preview','dev','test','e2e','lint','lint-all','typecheck','seed'].includes(command))throw new Error('Choose build/preview/dev/test/e2e/lint/lint-all/typecheck/seed');
// V2_GATEWAY_URL: a second loopback gateway (scripts/native-gateway.cjs with V2_GATEWAY_PORT) for a build served on V2_PORT.
const gateway=process.env.V2_GATEWAY_URL||'http://127.0.0.1:54321';
if(new URL(gateway).hostname!=='127.0.0.1')throw new Error('The native gateway must be loopback');
const env={...process.env,V2_NATIVE:'1',NEXT_PUBLIC_V2_BACKEND_KIND:'supabase-native',NEXT_PUBLIC_V2_SUPABASE_URL:gateway,NEXT_PUBLIC_V2_SUPABASE_ANON_KEY:config.anonKey,V2_TEST_API_URL:gateway,V2_TEST_ANON_KEY:config.anonKey,V2_TEST_ACCESS_FILE:path.join(runtime,'private/accounts.json'),V2_RUN_HTTP_TESTS:'1'};
const scripts={build:'scripts/build-v2.cjs',preview:'scripts/preview-v2.cjs',dev:'scripts/preview-v2.cjs',seed:'scripts/seed-native.cjs'};
const nextArgs=scripts[command]?[scripts[command],...(command==='dev'?['--dev']:[]),...args]:command==='e2e'?[require.resolve('@playwright/test/cli'),'test','--config','playwright.config.cjs',...args]:command==='test'?['--test','--test-concurrency=1',...fs.readdirSync(path.join(repo,'tests')).filter(n=>n.endsWith('.test.cjs')).map(n=>'tests/'+n),...args]:command==='typecheck'?[require.resolve('typescript/bin/tsc'),'--noEmit','--pretty','false']: [path.join(path.dirname(require.resolve('eslint/package.json')),'bin/eslint.js'),...(command==='lint-all'?['.']:['src/features/v2','src/app/v2','src/lib/security','src/app/register','src/app/components/ClientLayout.tsx']),...args];
const r=spawnSync(process.execPath,nextArgs,{cwd:repo,env,stdio:'inherit',windowsHide:true});process.exit(r.status??1);
