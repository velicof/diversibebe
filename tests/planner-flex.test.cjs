// Flexible planner in the app: the meals and days the parent chooses, no needless repeats, allergies
// respected, old plans kept, guest plans imported by day and meal, and a shopping list that adds up.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./load-ts.cjs');
const P=load('src/features/v2/planning.ts');
const M=load('src/features/v2/model.ts');
const {importableFromGuest}=load('src/features/v2/cloud/guest-import.ts');
const {catalog,activeCatalog}=load('src/features/v2/catalog.ts');
const {recommend,initialFilters}=load('src/features/v2/recommendations.ts');
const {resolveAllergy,assessRecipe}=load('src/features/v2/allergy.ts');
const plain=v=>JSON.parse(JSON.stringify(v));
const days=['2026-11-14','2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20'];
const ctx={mode:'live',favorites:[],introduced:[],used:[],excludedIngredients:[],requiresClinicalGuidance:false};
const eligible=(extra={})=>recommend(activeCatalog,{...initialFilters,months:12,maxMinutes:999},{...ctx,...extra});
const requests=(n,meals)=>days.slice(0,n).flatMap(slot=>meals.map(meal=>({slot,meal})));
const byId=id=>catalog.find(r=>r.id===id);

test('defaults suit the stage and never impose three meals on a beginner',()=>{
 assert.deepEqual(plain(P.defaultMeals(6)),['pranz']);
 assert.deepEqual(plain(P.defaultMeals(8)),['mic-dejun','pranz','cina']);
 assert.equal(P.defaultMeals(12).includes('gustare'),false,'a snack is offered, not preselected');
});

test('5 days of lunch: 5 different lunches',()=>{
 const plan=P.proposeMeals(eligible(),requests(5,['pranz']),{reuseIngredients:true});
 assert.equal(plan.length,5);
 assert.equal(new Set(plan.map(p=>p.recipeId)).size,5);
 assert.ok(plan.every(p=>byId(p.recipeId).mealType==='pranz'));
});

test('7 days x 4 meals: every meal fits its type and no recipe repeats while others remain',()=>{
 const pool=eligible();
 const plan=P.proposeMeals(pool,requests(7,['mic-dejun','pranz','cina','gustare']),{reuseIngredients:true});
 for(const p of plan)assert.equal(byId(p.recipeId).mealType,p.meal,`${p.slot} ${p.meal}`);
 for(const meal of ['mic-dejun','pranz','cina','gustare']){
  const of=plan.filter(p=>p.meal===meal),available=pool.filter(r=>r.mealType===meal).length;
  if(available>=7)assert.equal(new Set(of.map(p=>p.recipeId)).size,of.length,`${meal}: no repeat with ${available} recipes`);
 }
 assert.deepEqual(plain(plan.map(p=>p.slot+p.meal)),plain([...plan].sort((a,b)=>a.slot.localeCompare(b.slot)||['mic-dejun','pranz','cina','gustare'].indexOf(a.meal)-['mic-dejun','pranz','cina','gustare'].indexOf(b.meal)).map(p=>p.slot+p.meal)),'ordered by day and meal');
});

test('a small pool: repeats are marked and at least two days apart; empty meals stay empty',()=>{
 const two=eligible().filter(r=>r.mealType==='cina').slice(0,2);
 const plan=P.proposeMeals(two,requests(5,['cina','pranz']),{reuseIngredients:false});
 assert.equal(plan.some(p=>p.meal==='pranz'),false,'no lunch recipe in the pool: no lunch is invented');
 const dinners=plan.filter(p=>p.meal==='cina');
 assert.ok(dinners.some(p=>p.repeated),'repeats are flagged');
 for(const id of new Set(dinners.map(p=>p.recipeId))){
  const ds=dinners.filter(p=>p.recipeId===id).map(p=>Date.parse(p.slot));
  for(let i=1;i<ds.length;i++)assert.ok(ds[i]-ds[i-1]>=2*86400000,'never on consecutive days');
 }
});

test('allergies: every planned meal is compatible (egg + milk), and kept meals stay as they are',()=>{
 const allergies=['ou','iaurt'].map((f,i)=>resolveAllergy({id:String(i),babyId:null,foodId:f,foodName:f}));
 const pool=eligible({allergies});
 const plan=P.proposeMeals(pool,requests(5,['mic-dejun','pranz','cina']),{reuseIngredients:true});
 assert.ok(plan.length>0);
 for(const p of plan)assert.equal(assessRecipe(byId(p.recipeId),allergies).status,'compatible',p.recipeId);
 const keep=pool.find(r=>r.mealType==='pranz');
 const again=P.proposeMeals(pool,requests(3,['pranz']),{reuseIngredients:true,kept:new Map([[M.planKey({slot:days[1],meal:'pranz'}),keep]])});
 const kept=again.find(p=>p.slot===days[1]);
 assert.equal(kept.recipeId,keep.id);assert.equal(kept.kept,true);
 assert.equal(again.filter(p=>p.recipeId===keep.id).length,1,'a kept recipe is not proposed again elsewhere');
});

test('replacing one meal keeps the meal type and leaves every other meal untouched',()=>{
 const pool=eligible();
 let state=M.appReducer(M.emptyState,{type:'plan-many',entries:P.proposeMeals(pool,requests(2,['mic-dejun','pranz']),{reuseIngredients:true}).map(({slot,meal,recipeId})=>({slot,meal,recipeId}))});
 const before=plain(state.plan);
 const next=P.swapRecipe(pool,state.plan,days[0],'pranz');
 assert.equal(next.mealType,'pranz');
 state=M.appReducer(state,{type:'plan',slot:days[0],meal:'pranz',recipeId:next.id});
 assert.equal(state.plan.length,before.length);
 for(const e of before.filter(e=>!(e.slot===days[0]&&e.meal==='pranz')))assert.ok(state.plan.some(p=>p.slot===e.slot&&p.meal===e.meal&&p.recipeId===e.recipeId));
 state=M.appReducer(state,{type:'remove-plan',slot:days[0],meal:'mic-dejun'});
 assert.deepEqual(plain(state.plan.filter(p=>p.slot===days[0]).map(p=>p.meal)),['pranz'],'removing one meal removes only it');
});

test('plans saved before meal types (device or account) are kept as "oricare"; nothing is dropped',()=>{
 const ids=new Set(catalog.map(r=>r.id));
 const old=Array.from({length:40},(_,i)=>({slot:`2026-12-${String(i%28+1).padStart(2,'0')}`,recipeId:catalog[i].id}));
 const state=M.readState(JSON.stringify({version:1,plan:[...old,{slot:days[0],meal:'cina',recipeId:catalog[50].id},{slot:days[0],meal:'brunch',recipeId:catalog[51].id}]}),ids,new Set());
 assert.ok(state.plan.every(p=>M.MEAL_ORDER.includes(p.meal)));
 assert.equal(state.plan.find(p=>p.slot===days[0]&&p.meal==='cina').recipeId,catalog[50].id);
 assert.equal(state.plan.find(p=>p.slot===days[0]&&p.meal==='oricare').recipeId,catalog[51].id,'an unknown meal becomes "oricare", it is not lost');
 // 40 old entries on 28 days: the later entry of a repeated day wins, as when it was saved.
 assert.equal(state.plan.filter(p=>p.meal==='oricare'&&p.slot.startsWith('2026-12')).length,28);
 assert.equal(state.plan.find(p=>p.slot==='2026-12-01').recipeId,catalog[28].id);
 assert.equal(M.readState(JSON.stringify({version:1,planner:{meals:['cina','pranz','brunch'],days:3}}),ids,new Set()).planner.meals.join(),'pranz,cina');
 assert.equal(M.readState(JSON.stringify({version:1,planner:{meals:['pranz'],days:4}}),ids,new Set()).planner,null);
});

test('guest import is keyed by day and meal: other meals of a planned day can be added, a taken meal stays the account\'s',()=>{
 const recipes=catalog.map(r=>({id:r.id,published:true,minimumMonths:6}));
 const account={favorites:[],stage:12,plan:[{slot:days[1],meal:'pranz',recipeId:'piure-dovlecel'}]};
 const local={favorites:[],plan:[
  {slot:days[1],meal:'pranz',recipeId:'piure-morcov'},
  {slot:days[1],meal:'cina',recipeId:'piure-morcov'},
  {slot:days[2],meal:'oricare',recipeId:'piure-dovlecel'},
 ]};
 const r=importableFromGuest(local,account,false,recipes,days[0]);
 assert.deepEqual(plain(r.plan),[{slot:days[1],meal:'cina',recipeId:'piure-morcov'},{slot:days[2],meal:'oricare',recipeId:'piure-dovlecel'}]);
 assert.equal(r.kept,1);
});

test('the shopping list adds quantities of the same unit across meals and follows every change',()=>{
 const recipe=(id,ingredients)=>({id,name:id,ingredients});
 const recipes=[recipe('a',['100 g morcov','1 lingură ulei de măsline']),recipe('b',['50 g morcov','2 linguri ulei de măsline']),recipe('c',['1 banană'])];
 const plan=[{slot:days[0],meal:'pranz',recipeId:'a'},{slot:days[0],meal:'cina',recipeId:'b'},{slot:days[1],meal:'pranz',recipeId:'a'}];
 const list=P.buildShoppingList(plan,recipes,[]).toBuy;
 const carrot=list.find(i=>i.key==='p:morcov');
 assert.deepEqual(plain(carrot.amounts),[{value:250,unit:'g'}],'100 + 50 + 100 g');
 assert.equal(P.formatAmounts(list.find(i=>/ulei/.test(i.key)).amounts),'4 linguri');
 const without=P.buildShoppingList(plan.filter(p=>!(p.slot===days[0]&&p.meal==='cina')),recipes,[]).toBuy;
 assert.deepEqual(plain(without.find(i=>i.key==='p:morcov').amounts),[{value:200,unit:'g'}],'a removed meal leaves the list');
 const replaced=P.buildShoppingList([...plan.slice(0,2),{slot:days[1],meal:'pranz',recipeId:'c'}],recipes,[]).toBuy;
 assert.deepEqual(plain(replaced.find(i=>i.key==='p:morcov').amounts),[{value:150,unit:'g'}]);
 assert.ok(replaced.some(i=>/banana/.test(i.key)&&i.amounts[0].value===1),'a replaced meal brings its own ingredients');
});
