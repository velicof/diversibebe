// Mission rule: nothing unreviewed reaches real families, and no AI review can approve a recipe.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,loader}=require('./load-ts.cjs');
const {canTransition,hasClinicalReview,isPublishable}=load('src/features/v2/review.ts');
const signed={status:'reviewed',reviewer:'Dr. Ana Pop',credentials:'Medic primar pediatrie, CMR 12345',reviewedAt:'2026-11-20',sourceUrls:['https://www.who.int/'],version:'1'};

test('a build without explicit preview opt-in shows only published, clinically reviewed recipes',()=>{
  const live=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''})('src/features/v2/catalog.ts');
  assert.equal(live.contentMode,'live');
  assert.equal(live.publishedCatalog.length,0,'no recipe has a signed review yet');
  assert.equal(live.activeCatalog.length,0);
  assert.equal(live.findVisibleRecipe('piure-dovlecel'),undefined,'unreviewed recipe pages are 404 online');
});

test('local preview keeps the labelled review queue visible for QA',()=>{
  const preview=loader({NEXT_PUBLIC_V2_CONTENT_MODE:'preview'})('src/features/v2/catalog.ts');
  assert.equal(preview.contentMode,'preview');
  assert.ok(preview.activeCatalog.length>=100);
  assert.ok(preview.activeCatalog.every(r=>r.editorialStatus!=='published'));
  assert.ok(preview.findVisibleRecipe('piure-dovlecel'));
});

test('shortlisted recipes start as review_required, everything else as draft',()=>{
  const {catalog}=load('src/features/v2/catalog.ts');
  const {shortlistIds}=load('src/features/v2/content/shortlist.ts');
  for(const r of catalog) assert.equal(r.editorialStatus,shortlistIds.has(r.id)?'review_required':'draft',r.id);
});

test('an AI evaluation can never count as a clinical review',()=>{
  assert.ok(hasClinicalReview(signed));
  for(const [reviewer,credentials] of [['Gemini 4 Argon','UX review'],['Claude','evaluare'],['ChatGPT','nutriție'],['Dr. Ana Pop','validat de AI'],['Echipa','verificare automată']])
    assert.equal(hasClinicalReview({...signed,reviewer,credentials}),false,`${reviewer} / ${credentials}`);
  assert.equal(canTransition('review_required','clinically_approved',{...signed,reviewer:'Gemini'}),false);
  assert.equal(isPublishable('published',{status:'pending'}),false);
  assert.equal(canTransition('draft','published',signed),false,'no shortcut past review');
});

test('every recipe V2 can show is storable by the database (plans, confirmations, favorites)',()=>{
  const {previewCatalog,storableId}=load('src/features/v2/catalog.ts');
  assert.ok(previewCatalog.every(r=>storableId(r.id)));
  assert.equal(storableId('omletă-legume-8'),false);
});
