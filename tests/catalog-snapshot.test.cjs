// The browser loads the catalog computed at build time (content/catalog.generated.json). It must be exactly
// what catalog-build.ts produces from the current recipes, corrections, safety rules and reviews.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {render,file}=require('../scripts/generate-catalog.cjs');
const {loader}=require('./load-ts.cjs');

test('the shipped catalog equals the build output (run node scripts/generate-catalog.cjs after content changes)',()=>{
  assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),render());
});

test('the browser catalog keeps every rule result and only resolves photos at runtime',()=>{
  for(const mode of ['','preview']){
    const load=loader({NEXT_PUBLIC_V2_CONTENT_MODE:mode});
    const built=JSON.parse(JSON.stringify(load('src/features/v2/catalog-build.ts').buildRecipes()));
    const {catalog}=load('src/features/v2/catalog.ts');
    const {recipePhotos}=load('src/features/v2/content/photos.ts');
    assert.deepEqual(JSON.parse(JSON.stringify(catalog.map(({photo,hasPhoto,...r})=>r))),built);
    for(const r of catalog){
      const asset=recipePhotos[r.id];
      assert.equal(Boolean(r.photo),Boolean(asset&&(asset.approved||mode==='preview')),r.id);
    }
  }
});

test('the client catalog module does not import the recipe database or the safety rules',()=>{
  const root=path.join(__dirname,'..');
  for(const f of ['src/features/v2/catalog.ts','src/features/v2/catalog-shared.ts']){
    const imports=[...fs.readFileSync(path.join(root,f),'utf8').matchAll(/^import (?!type )[^;]*from "([^"]+)"/gm)].map(m=>m[1]);
    assert.deepEqual(imports.filter(i=>/recipesDatabase|foodsDatabase|content\/safety|catalog-build|\/review"|season/.test(i)),[],f);
  }
});
