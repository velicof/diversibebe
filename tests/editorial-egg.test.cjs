// The library's egg rule (white and yolk fully cooked) must catch the ways a recipe can leave an egg runny,
// and the two recipes that did must reach families only in their corrected form. Editorial, not medical.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./load-ts.cjs');
const {RECIPES}=load('src/app/lib/recipesDatabase.ts');
const {assessSafety}=load('src/features/v2/content/safety.ts');
const {catalog}=load('src/features/v2/catalog.ts');
const runny=(r)=>assessSafety(r,Number(r.age.match(/\d+/)[0])).some(f=>f.id==='runny-egg');

test('the original texts of both recipes are caught by the egg rule',()=>{
  for(const id of ['paste-mic-dejun-branza-ou','ou-fiert-soldati-toast']){
    const source=RECIPES.find(r=>r.id===id);
    assert.ok(source,id);
    assert.equal(runny(source),true,`${id}: the uncorrected text leaves the egg possibly runny`);
  }
});

test('families see the corrected texts: the egg is cooked on the heat, firm, and nothing is dipped in a yolk',()=>{
  const pasta=catalog.find(r=>r.id==='paste-mic-dejun-branza-ou');
  assert.equal(pasta.published,true);
  assert.equal(pasta.editorialStatus,'editorially_corrected');
  assert.ok(pasta.steps.some(s=>/pe foc mic/.test(s)&&/se închegă complet/.test(s)));
  assert.ok(!pasta.steps.some(s=>/căldura gătește oul/.test(s)));
  const egg=catalog.find(r=>r.id==='ou-fiert-soldati-toast');
  assert.equal(egg.published,true);
  assert.equal(egg.name,'Ou fiert tare cu „soldăței" de toast');
  assert.ok(egg.steps.some(s=>/10–12 minute/.test(s)&&/complet tari/.test(s)));
  assert.ok(!egg.steps.some(s=>/înmoaie|decapitează|aproape fiert/.test(s)));
  for(const r of [pasta,egg]){
    assert.equal(r.safetyFlags.some(f=>f.severity==='blocking'),false,r.id);
    assert.ok(r.corrections.length>0,r.id);
    assert.ok(r.corrections.every(c=>/^https:\/\//.test(c.source)),'each correction cites a public source');
  }
});

test('no published recipe still has an egg the rule would call runny',()=>{
  const left=catalog.filter(r=>r.published&&runny(r)).map(r=>r.id);
  assert.deepEqual(left,[]);
});
