// Quality gate for the full library (founder decision, 3 Nov. 2026): all 291 existing recipes are kept,
// corrected where public guidance is clear, and families only see what passes the safety rules.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,plain}=require('./load-ts.cjs');
const {RECIPES}=load('src/app/lib/recipesDatabase.ts');
const {catalog,publishedCatalog,findAnyRecipe,ingredientFilters}=load('src/features/v2/catalog.ts');
const {corrections,specialistQueue}=load('src/features/v2/content/corrections.ts');
const {detectAllergens,canonicalAllergens}=load('src/features/v2/content/safety.ts');
const {recommend,initialFilters,ANY_DURATION}=load('src/features/v2/recommendations.ts');
const {proposePlan,buildShoppingList}=load('src/features/v2/planning.ts');
const context={mode:'live',favorites:[],introduced:[],used:[],excludedIngredients:[],requiresClinicalGuidance:false};
const all={...initialFilters,months:12,maxMinutes:ANY_DURATION};

test('all 291 legacy recipes are inventoried, by meal, and none disappeared',()=>{
  assert.equal(RECIPES.length,291);assert.equal(catalog.length,291);
  const byMeal=m=>catalog.filter(r=>r.mealType===m).length;
  assert.deepEqual([byMeal('mic-dejun'),byMeal('pranz'),byMeal('cina'),byMeal('gustare')],[74,121,71,25]);
  for(const source of RECIPES){
    const r=findAnyRecipe(source.id);
    assert.ok(r,`${source.id} lost`);
    assert.equal(r.name,source.name);assert.equal(r.mealType,source.mealType);assert.equal(r.age,source.age);assert.equal(r.time,source.time);
  }
  assert.equal(new Set(catalog.map(r=>r.id)).size,291,'stable unique V2 ids');
});

test('every correction applies to the real source text and is logged with a reason and a public source',()=>{
  for(const c of corrections){
    const source=RECIPES.find(r=>r.id===c.recipeId);
    assert.ok(source,c.recipeId);assert.ok(source[c.field].includes(c.before),`${c.recipeId}: "${c.before}" not in source`);
    assert.ok(c.reason.length>10);assert.match(c.source,/^https:\/\//);
    assert.ok(findAnyRecipe(c.recipeId).corrections.some(x=>x.before===c.before),`${c.recipeId} applied`);
  }
  for(const id of Object.keys(specialistQueue))assert.equal(findAnyRecipe(id).editorialStatus,'needs_specialist_review',id);
});

test('allergens are complete: nothing declared is dropped and everything in the ingredients is listed',()=>{
  for(const r of catalog){
    for(const a of detectAllergens(r.ingredients))assert.ok(r.allergens.includes(a),`${r.id} misses ${a}`);
    const source=RECIPES.find(s=>s.id===(r.legacyId??r.id));
    for(const a of canonicalAllergens(source.allergens,[]).allergens)assert.ok(r.allergens.includes(a),`${r.id} dropped declared ${a}`);
    assert.ok(!r.allergens.includes('Lactoză'),'lactose is not the allergen; milk is');
  }
});

test('nothing with a blocking risk reaches families, at any stage or filter',()=>{
  const shown=recommend(catalog,all,context);
  assert.equal(shown.length,publishedCatalog.length);
  for(const r of shown){
    assert.equal(r.safetyFlags.filter(f=>f.severity==='blocking').length,0,r.id);
    assert.notEqual(r.editorialStatus,'needs_specialist_review',r.id);
  }
  for(const r of catalog.filter(r=>!r.published))for(const f of r.safetyFlags.filter(f=>f.severity==='blocking'))assert.match(f.source,/^https:\/\//);
  assert.equal(recommend(catalog,all,{...context,requiresClinicalGuidance:true}).length,0,'allergy records still stop personalisation');
});

test('library filters: meal, stage, duration (incl. "Oricât"), ingredient, allergen exclusion, season, search',()=>{
  const count=f=>recommend(catalog,{...all,...f},{...context,month:7}).length;
  const meals=['mic-dejun','pranz','cina','gustare'].map(meal=>count({meal}));
  assert.equal(meals.reduce((a,b)=>a+b),publishedCatalog.length);
  assert.ok(count({months:6})<count({months:12}));
  assert.ok(recommend(catalog,{...all,months:6},context).every(r=>r.minimumMonths<=6));
  assert.ok(recommend(catalog,{...all,maxMinutes:15},context).every(r=>r.minutes!==null&&r.minutes<=15));
  assert.ok(recommend(catalog,all,context).some(r=>r.minutes===null),'"Oricât" includes overnight recipes');
  const noMilk=recommend(catalog,{...all,excludedAllergens:['Lapte','Ou']},context);
  assert.ok(noMilk.length>50&&noMilk.every(r=>!r.allergens.includes('Lapte')&&!r.allergens.includes('Ou')));
  const july=recommend(catalog,{...all,inSeason:true},{...context,month:7});
  assert.ok(july.length>20&&july.every(r=>r.seasonMonths.includes(7)));
  assert.ok(recommend(catalog,{...all,query:'dovleac'},context).every(r=>/dovleac/i.test(r.name+r.ingredients.join(' '))));
  assert.ok(ingredientFilters.length>=20);
  const morcov=recommend(catalog,{...all,ingredientIds:['morcov']},context);assert.ok(morcov.length>30&&morcov.every(r=>r.ingredientIds.includes('morcov')));
});

test('the planner and the shopping list use the whole eligible library, not the old demo set',()=>{
  const eligible=recommend(catalog,{...initialFilters,months:12,maxMinutes:30},context);
  assert.ok(eligible.length>100,`eligible ${eligible.length}`);
  const days=['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14'];
  const plan=proposePlan(eligible,days,{reuseIngredients:true,kept:new Map()});
  assert.equal(plan.length,5);
  const pool=new Set(plan.flatMap(d=>[d.recipeId,...d.alternatives]));assert.ok(pool.size>=10);
  const entries=plan.map(d=>({slot:d.slot,recipeId:d.recipeId}));
  const list=buildShoppingList(entries,catalog,[]);
  assert.ok(list.toBuy.length>3);
});

test('V1 user associations keep resolving and no medical approval is invented',()=>{
  for(const source of RECIPES)assert.ok(findAnyRecipe(source.id));
  assert.equal(catalog.filter(r=>r.editorialStatus==='specialist_approved').length,0);
  assert.ok(catalog.every(r=>r.review.status==='pending'));
  const manifest=require('../docs/ai-ops/photos/catalog-manifest.json');
  assert.equal(manifest.photos.length,291);
  assert.deepEqual(plain(manifest.photos.map(p=>p.recipeId)).sort(),plain(catalog.map(r=>r.id)).sort());
  assert.equal(manifest.photos.filter(p=>p.batch===0).length,12);
});
