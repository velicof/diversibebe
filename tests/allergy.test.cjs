// Allergies filter recipes, cumulatively and on the written ingredients, and never hide doubt as safety.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./load-ts.cjs');
const {resolveAllergy,allergiesFor,assessRecipe,recommendable,KNOWN_ALLERGY_FOODS}=load('src/features/v2/allergy.ts');
const {catalog}=load('src/features/v2/catalog.ts');
const {FOODS_DATABASE}=load('src/app/lib/foodsDatabase.ts');
const plain=v=>JSON.parse(JSON.stringify(v));
const rec=(foodId,foodName,babyId=null)=>({id:foodId+'-'+(babyId||'all'),babyId,foodId,foodName});
const recipe=(name,ingredients,allergens=[],ingredientIds=[])=>({name,ingredients,allergens,ingredientIds});

test('every food a parent can pick in V1 is known to the filter',()=>{
  assert.deepEqual(plain([...KNOWN_ALLERGY_FOODS].sort()),plain(FOODS_DATABASE.map(f=>f.id).sort()));
});

test('no allergy: every recipe is compatible',()=>{
  assert.equal(assessRecipe(recipe('Piure',['1 morcov']),[]).status,'compatible');
});

test('one allergy, direct: the egg recipe is excluded, others stay',()=>{
  const egg=[resolveAllergy(rec('ou','Ou'))];
  assert.equal(assessRecipe(recipe('Omletă',['2 ouă'],['Ou']),egg).status,'contains');
  assert.equal(assessRecipe(recipe('Piure de morcov',['1 morcov','apă']),egg).status,'compatible');
});

test('derivatives count: butter and yoghurt are milk, mayonnaise is egg, pasta is gluten',()=>{
  const milk=[resolveAllergy(rec('iaurt','Iaurt natural'))];
  const r=catalog.filter(x=>x.ingredients.some(l=>/\bunt\b/i.test(l))&&x.allergens.includes('Lapte'))[0];
  assert.ok(r,'a recipe with butter exists');
  assert.equal(assessRecipe(r,milk).status,'contains');
  assert.equal(assessRecipe(recipe('Sandviș',['maioneză'],['Ou']),[resolveAllergy(rec('ou','Ou'))]).status,'contains');
  assert.equal(assessRecipe(recipe('Paste',['50 g paste'],['Gluten']),[resolveAllergy(rec('paine','Pâine'))]).status,'contains');
});

test('ingredients that may hide the allergen leave the recipe unverified, not safe',()=>{
  const milk=[resolveAllergy(rec('branza-vaci','Brânză de vaci'))];
  assert.equal(assessRecipe(recipe('Toast cu avocado',['1 felie pâine','½ avocado'],['Gluten']),milk).status,'unverified');
  const strawberry=[resolveAllergy(rec('capsuni','Căpșuni'))];
  assert.equal(assessRecipe(recipe('Iaurt cu fructe',['fructe de sezon']),strawberry).status,'unverified');
});

test('an unknown food (typed by hand in V1) never makes a recipe compatible',()=>{
  const custom=[resolveAllergy(rec('custom-123','Fistic verde'))];
  assert.equal(assessRecipe(recipe('Piure de morcov',['1 morcov']),custom).status,'unverified');
  assert.equal(assessRecipe(recipe('Cremă',['fistic verde măcinat']),custom).status,'contains');
});

test('several allergies apply together; a non-EU food is matched by name and by the recipe foods',()=>{
  const both=[resolveAllergy(rec('ou','Ou')),resolveAllergy(rec('capsuni','Căpșuni'))];
  const r=assessRecipe(recipe('Clătite cu căpșuni',['1 ou','căpșuni'],['Ou']),both);
  assert.equal(r.status,'contains');assert.deepEqual(plain(r.contains),['Ou','Căpșuni']);
  assert.equal(assessRecipe(recipe('Piure',['pere'],[],['capsuni']),both).status,'contains');
});

test('account-wide allergies protect every child; a child-specific one only its child',()=>{
  const records=[rec('ou','Ou',null),rec('capsuni','Căpșuni','child-a')];
  assert.deepEqual(plain(allergiesFor(records,'child-a').map(a=>a.label)),['Ou','Căpșuni']);
  assert.deepEqual(plain(allergiesFor(records,'child-b').map(a=>a.label)),['Ou']);
});

test('on the real library, an egg allergy keeps most recipes recommendable and none with egg',()=>{
  const egg=[resolveAllergy(rec('ou','Ou'))];
  const pub=catalog.filter(r=>r.published);
  const ok=pub.filter(r=>recommendable(r,egg));
  assert.ok(ok.length>pub.length/2,`${ok.length} of ${pub.length}`);
  assert.equal(ok.some(r=>r.allergens.includes('Ou')),false);
});

test('a hand-typed food is matched by its name, not by words that only describe it',()=>{
  const custom=[resolveAllergy(rec('custom-9','Fistic verde'))];
  assert.equal(assessRecipe(recipe('Fasole',['fasole verde']),custom).status,'unverified');
  assert.equal(assessRecipe(recipe('Cremă',['fistic']),custom).status,'contains');
});

test('the label says which allergen group a recorded food stands for',()=>{
  assert.equal(resolveAllergy(rec('iaurt','Iaurt natural')).label,'Iaurt natural (lapte)');
  assert.equal(resolveAllergy(rec('ou','Ou')).label,'Ou');
});

test('suggestions and plans use only compatible recipes; the library may show the rest, marked',()=>{
  const {recommend,initialFilters}=load('src/features/v2/recommendations.ts');
  const ctx={mode:'live',favorites:[],introduced:[],used:[],excludedIngredients:[],requiresClinicalGuidance:false,allergies:[resolveAllergy(rec('ou','Ou'))]};
  const f={...initialFilters,months:12,maxMinutes:999};
  const strict=recommend(catalog,f,ctx),browse=recommend(catalog,f,{...ctx,allergyScope:'browse'}),all=recommend(catalog,f,{...ctx,allergyScope:'all'});
  assert.ok(strict.length>0&&strict.length<browse.length&&browse.length<all.length,`${strict.length} < ${browse.length} < ${all.length}`);
  assert.equal(strict.every(r=>assessRecipe(r,ctx.allergies).status==='compatible'),true);
  assert.equal(browse.some(r=>assessRecipe(r,ctx.allergies).status==='contains'),false);
  assert.equal(recommend(catalog,f,{...ctx,allergies:[]}).length,all.length,'no allergy: nothing is left out');
  assert.equal(recommend(catalog,f,{...ctx,requiresClinicalGuidance:true}).length,0,'the session pause still stops suggestions');
});
