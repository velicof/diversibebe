// Shared production (V1 + V2 on one Vercel project and one Supabase project): enabling V2 must not
// open the beta by accident or remove V1 from search results.
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {loader,load,plain}=require('./load-ts.cjs');
const {v2AccessAllowed}=load('src/lib/security/invite.ts');
const hash=c=>crypto.createHash('sha256').update(c).digest('hex');

test('the V2 gate fails closed in production when no invite hashes are configured',async()=>{
  const hashes=[hash('DB-AAAA-BBBB-CCCC')];
  assert.equal(await v2AccessAllowed({production:true,access:undefined,hashes:[],code:'DB-AAAA-BBBB-CCCC'}),false);
  assert.equal(await v2AccessAllowed({production:true,access:'invite',hashes,code:undefined}),false);
  assert.equal(await v2AccessAllowed({production:true,access:undefined,hashes,code:'db-aaaa-bbbb-cccc'}),true);
  assert.equal(await v2AccessAllowed({production:true,access:'public',hashes:[],code:undefined}),true,'explicit public launch');
  assert.equal(await v2AccessAllowed({production:false,access:undefined,hashes:[],code:undefined}),true,'local development');
});

test('robots.txt keeps V1 crawlable on Vercel Production even with V2 enabled; previews stay blocked',()=>{
  const robots=env=>plain(loader(env)('src/app/robots.ts').default());
  const prod=robots({DIVERSIBEBE_V2_PREVIEW:'1',VERCEL_ENV:'production'});
  assert.equal(prod.rules.allow,'/');assert.ok(prod.rules.disallow.includes('/v2/'));assert.match(prod.sitemap,/sitemap\.xml$/);
  for(const env of [{DIVERSIBEBE_V2_PREVIEW:'1',VERCEL_ENV:'preview'},{DIVERSIBEBE_V2_PREVIEW:'1'}])
    assert.deepEqual(robots(env).rules,{userAgent:'*',disallow:'/'});
  assert.equal(robots({VERCEL_ENV:'production'}).rules.allow,'/');
});

test('V2 connects only to a loopback stack or to the exact Supabase project shared with V1',()=>{
  const {assertAllowedSupabaseUrl,usesRealAccounts}=load('src/features/v2/cloud/guard.ts');
  const prod='https://smyimgvxlggggjeoajdo.supabase.co';
  assert.equal(assertAllowedSupabaseUrl(prod,prod).hostname,'smyimgvxlggggjeoajdo.supabase.co');
  assert.equal(assertAllowedSupabaseUrl('http://127.0.0.1:54321',undefined).hostname,'127.0.0.1');
  for(const [url,shared] of [[prod,undefined],[prod,'https://abcdefghijklmnopqrst.supabase.co'],['https://abcdefghijklmnopqrst.supabase.co',prod],['http://smyimgvxlggggjeoajdo.supabase.co',prod],[prod+'/rest',prod],['https://smyimgvxlggggjeoajdo.supabase.co.evil.invalid',prod],['http://localhost@evil.invalid',prod]])
    assert.throws(()=>assertAllowedSupabaseUrl(url,shared),undefined,`${url} with V1=${shared}`);
  assert.equal(usesRealAccounts(prod),true);
  for(const v of ['http://127.0.0.1:54321','not a url'])assert.equal(usesRealAccounts(v),false);
  assert.equal(loader({NEXT_PUBLIC_V2_SUPABASE_URL:''})('src/features/v2/cloud/guard.ts').usesRealAccounts(),true,'online build without a V2 backend (Preview, guest mode) shows no test wording');
});

test('real accounts never see test or synthetic wording; local stacks keep the honest test labels',()=>{
  const words=/\b(test|sintetic\w*|demonstrativ\w*|local\w*)\b/i;
  const real=plain(loader({NEXT_PUBLIC_V2_SUPABASE_URL:'https://smyimgvxlggggjeoajdo.supabase.co'})('src/features/v2/content/copy.ts').accountCopy);
  for(const [k,v] of Object.entries(real))assert.doesNotMatch(v,words,`accountCopy.${k} (real accounts)`);
  const local=plain(loader({NEXT_PUBLIC_V2_SUPABASE_URL:'http://127.0.0.1:54321'})('src/features/v2/content/copy.ts').accountCopy);
  assert.equal(local.loginEyebrow,'DOAR CONTURI SINTETICE');assert.equal(real.loginTitle,'Conectează-te');
});
