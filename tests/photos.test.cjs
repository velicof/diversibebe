// Photo candidates: visible only in local/preview builds until a human approves them; variants are light and
// traceable to the exact original that was reviewed.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {loader,load}=require('./load-ts.cjs');
const {recipePhotos}=load('src/features/v2/content/photos.ts');
const manifest=require('../docs/ai-ops/photos/manifest.json');
const repo=path.join(__dirname,'..');

test('an unapproved photo never appears in an online build; local preview shows it for review',()=>{
  const candidates=Object.entries(recipePhotos).filter(([,p])=>!p.approved).map(([id])=>id);
  assert.ok(candidates.length>=1,'the pilot candidates are staged');
  const live=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''})('src/features/v2/catalog.ts');
  const preview=loader({NEXT_PUBLIC_V2_CONTENT_MODE:'preview'})('src/features/v2/catalog.ts');
  for(const id of candidates){
    assert.equal(live.findAnyRecipe(id).photo,undefined,`${id} hidden online`);
    assert.equal(preview.findAnyRecipe(id).photo.approved,false,`${id} visible locally as a candidate`);
  }
});

test('every photo has 480/800/1200 WebP variants, 4:3, ≤150 KB at 800w, traceable to the reviewed original',()=>{
  for(const [id,p] of Object.entries(recipePhotos)){
    assert.deepEqual([...p.widths],[480,800,1200]);
    for(const w of p.widths){
      // Candidates live outside public/ (never served statically); approved photos are static files.
      const file=p.approved?path.join(repo,'public',`${p.base}-${w}.webp`):path.join(repo,'content/photo-candidates',`${id}-${w}.webp`);
      assert.ok(fs.existsSync(file),file);
      assert.equal(fs.statSync(file).size,p.bytes[w]);
      if(!p.approved)assert.equal(fs.existsSync(path.join(repo,'public',`${p.base}-${w}.webp`)),false,`${id}-${w} must not be in public/`);
    }
    assert.ok(p.bytes[800]<=150*1024,`${id} 800w ${p.bytes[800]} bytes`);
    assert.match(p.sourceSha256,/^[a-f0-9]{64}$/);
    const entry=manifest.photos.find((e)=>e.recipeId===id);
    assert.equal(entry.provenance.sourceSha256,p.sourceSha256,`${id}: manifest and asset point to the same original`);
    if(!p.approved)assert.notEqual(entry.imageStatus,'published');
    assert.ok(p.alt.length>=20);
  }
});

test('photo decisions must come from a person; publish refuses without approval and terms',()=>{
  const tmp=path.join(require('node:os').tmpdir(),`decisions-${process.pid}.json`);
  fs.writeFileSync(tmp,JSON.stringify({reviewer:'Gemini agent',decidedAt:'2026-11-03T00:00:00Z',decisions:[]}));
  const before=fs.readFileSync(path.join(repo,'docs/ai-ops/photos/manifest.json'),'utf8');
  const decide=spawnSync(process.execPath,['scripts/photo-import.cjs','decide',tmp],{cwd:repo,encoding:'utf8'});
  assert.notEqual(decide.status,0);assert.match(decide.stderr,/persoană/);
  const id=Object.keys(recipePhotos).find((k)=>!recipePhotos[k].approved);
  const publish=spawnSync(process.execPath,['scripts/photo-import.cjs','publish',id],{cwd:repo,encoding:'utf8'});
  assert.notEqual(publish.status,0);assert.match(publish.stderr,/Nu public/);
  assert.equal(fs.readFileSync(path.join(repo,'docs/ai-ops/photos/manifest.json'),'utf8'),before,'manifest untouched');
  fs.rmSync(tmp,{force:true});
});

test('candidates are reachable only through the review-gated route, never as static files',async()=>{
  const {photoUrl}=load('src/features/v2/content/photos.ts');
  const [id,p]=Object.entries(recipePhotos).find(([,x])=>!x.approved);
  assert.equal(photoUrl(p,800),`/v2/revizie/foto/${id}/800`);
  assert.equal(photoUrl({...p,approved:true},800),`${p.base}-800.webp`);
  // The proxy (review gate) runs for the candidate URL: the matcher only skips static asset extensions.
  const proxySrc=fs.readFileSync(path.join(repo,'src/proxy.ts'),'utf8'),start=proxySrc.indexOf('"/((?!');
  const matcher=JSON.parse(proxySrc.slice(start,proxySrc.indexOf('"',start+1)+1));
  assert.match(`/v2/revizie/foto/${id}/800`,new RegExp('^'+matcher+'$'));
  assert.doesNotMatch(`/v2/revizie/foto/${id}-800.webp`,new RegExp('^'+matcher+'$'),'a .webp URL would bypass the gate');
  assert.ok(fs.readFileSync(path.join(repo,'src/proxy.ts'),'utf8').includes('startsWith("/v2/revizie/")'));
  for(const file of fs.existsSync(path.join(repo,'public/v2/recipes'))?fs.readdirSync(path.join(repo,'public/v2/recipes')):[])
    assert.ok(Object.entries(recipePhotos).some(([k,x])=>x.approved&&file.startsWith(k+'-')),`${file} in public/ is not an approved photo`);
});
