// Founder decision (3 Nov. 2026): the existing library is shown after editorial and safety checks.
// Invariants: published ≠ medically approved; a recipe in specialist review is never shown or recommended;
// no AI review can approve a recipe; a specialist review only counts for the exact content reviewed.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,loader,plain}=require('./load-ts.cjs');
const {canTransition,hasClinicalReview,isPublishable}=load('src/features/v2/review.ts');
const signed={status:'reviewed',reviewer:'Dr. Ana Pop',credentials:'Medic primar pediatrie, CMR 12345',reviewedAt:'2026-11-20',sourceUrls:['https://www.who.int/'],version:'1'};

test('an online build shows every recipe that passes the checks and none that needs specialist review',()=>{
  const live=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''})('src/features/v2/catalog.ts');
  assert.equal(live.contentMode,'live');
  assert.equal(live.catalog.length,291);
  const review=live.catalog.filter(r=>r.editorialStatus==='needs_specialist_review');
  assert.equal(live.publishedCatalog.length,291-review.length);
  assert.ok(live.publishedCatalog.length>=280,'the library is not hidden');
  for(const r of review){assert.equal(r.published,false,r.id);assert.equal(live.findVisibleRecipe(r.id),undefined,`${r.id} is 404 online`);}
  assert.ok(live.findVisibleRecipe('piure-dovlecel'));
  assert.deepEqual(plain(live.activeCatalog.map(r=>r.id)),plain(live.publishedCatalog.map(r=>r.id)));
});

test('local preview uses exactly the same eligibility as production',()=>{
  const preview=loader({NEXT_PUBLIC_V2_CONTENT_MODE:'preview'})('src/features/v2/catalog.ts');
  const live=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''})('src/features/v2/catalog.ts');
  assert.equal(preview.contentMode,'preview');
  assert.deepEqual(plain(preview.activeCatalog.map(r=>r.id)),plain(live.activeCatalog.map(r=>r.id)));
});

test('statuses are the editorial ones and nothing is specialist-approved without a signed review',()=>{
  const {catalog}=load('src/features/v2/catalog.ts');
  const allowed=['imported','editorially_corrected','needs_specialist_review','specialist_approved'];
  for(const r of catalog){
    assert.ok(allowed.includes(r.editorialStatus),r.id);
    assert.notEqual(r.editorialStatus,'specialist_approved',`${r.id}: no signed review exists yet`);
    assert.equal(r.review.status,'pending');
    if(r.editorialStatus==='editorially_corrected')assert.ok(r.corrections.length||r.allergenChanges.added.length,r.id);
    if(r.editorialStatus==='imported')assert.equal(r.corrections.length+r.allergenChanges.added.length,0,r.id);
  }
});

test('an AI evaluation can never count as a clinical review',()=>{
  assert.ok(hasClinicalReview(signed));
  for(const [reviewer,credentials] of [['Gemini 4 Argon','UX review'],['Claude','evaluare'],['ChatGPT','nutriție'],['Dr. Ana Pop','validat de AI'],['Echipa','verificare automată']])
    assert.equal(hasClinicalReview({...signed,reviewer,credentials}),false,`${reviewer} / ${credentials}`);
  assert.equal(canTransition('needs_specialist_review','specialist_approved',{...signed,reviewer:'Gemini'}),false);
  assert.equal(canTransition('imported','specialist_approved',{status:'pending'}),false);
  assert.equal(canTransition('imported','specialist_approved',signed),true);
  assert.equal(isPublishable('needs_specialist_review',signed,0),false,'specialist queue is never published');
  assert.equal(isPublishable('imported',{status:'pending'},1),false,'a blocking safety flag is never published');
  assert.equal(isPublishable('editorially_corrected',{status:'pending'},0),true,'publication does not require (or imply) medical approval');
});

test('every recipe V2 can show is storable by the database; the legacy diacritic id keeps working',()=>{
  const {publishedCatalog,storableId,findVisibleRecipe}=load('src/features/v2/catalog.ts');
  assert.ok(publishedCatalog.every(r=>storableId(r.id)));
  assert.equal(storableId('omletă-legume-8'),false);
  const alias=findVisibleRecipe('omletă-legume-8');
  assert.equal(alias.id,'omleta-legume-8');assert.equal(alias.legacyId,'omletă-legume-8');
});

test('a signed review is void as soon as the reviewed recipe text changes',()=>{
  // The hash is taken from the corrected recipe as published; the registry is filled before the catalog loads.
  const reviewed=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''})('src/features/v2/catalog.ts').catalog.find(r=>r.id==='piure-broccoli-cartof-6');
  const fresh=loader({NEXT_PUBLIC_V2_CONTENT_MODE:''});
  const {editorialRegistry,recipeFingerprint}=fresh('src/features/v2/content/editorial.ts');
  const first=reviewed;
  editorialRegistry[first.id]={status:'specialist_approved',review:signed,contentHash:recipeFingerprint(first)};
  editorialRegistry['piure-dovlecel']={status:'specialist_approved',review:signed,contentHash:'00000000'};
  const live=fresh('src/features/v2/catalog.ts');
  assert.equal(live.catalog.find(r=>r.id==='piure-broccoli-cartof-6').editorialStatus,'specialist_approved');
  assert.equal(live.catalog.find(r=>r.id==='piure-dovlecel').editorialStatus,'imported','stale review ignored');
});
