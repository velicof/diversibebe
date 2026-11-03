// Synthetic dataset with the SHAPE of production (aggregate counts in production-metadata.json → aggregates),
// never its content: no row, email, name or date is copied from production. Deterministic (seeded PRNG),
// so a failing rehearsal is reproducible. Used by tests/migration-rehearsal.test.cjs and
// scripts/migration-rehearsal.cjs (native PostgreSQL + GoTrue + PostgREST).
const SHAPE=require('./production-metadata.json').aggregates;

function prng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const uuid=(rand)=>{const h=[...Array(32)].map(()=>Math.floor(rand()*16).toString(16));h[12]='4';h[16]='89ab'[Math.floor(rand()*4)];return`${h.slice(0,8).join('')}-${h.slice(8,12).join('')}-${h.slice(12,16).join('')}-${h.slice(16,20).join('')}-${h.slice(20).join('')}`;};
const FOODS=Array.from({length:110},(_,i)=>`aliment-sintetic-${String(i+1).padStart(3,'0')}`);
const RECIPES=Array.from({length:60},(_,i)=>`reteta-sintetica-${i+1}`);
const day=(rand,from='2026-03-01',span=240)=>new Date(Date.parse(from)+Math.floor(rand()*span)*864e5+Math.floor(rand()*864e5)).toISOString();
const q=v=>v===null||v===undefined?'NULL':typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;

// Family composition and per-family tried-food counts follow the production histograms.
function families(userIds,rand){
  const kidsPlan=[];for(const [k,n] of Object.entries(SHAPE.children_per_family))for(let i=0;i<n;i++)kidsPlan.push(Number(k));
  const triedPlan=[];const ranges={'0':[0,0],'1-5':[1,5],'6-20':[6,20],'21-60':[21,60],'61+':[61,SHAPE.tried_foods_max]};
  for(const [b,n] of Object.entries(SHAPE.tried_foods_per_family))for(let i=0;i<n;i++){const [lo,hi]=ranges[b];triedPlan.push(lo+Math.floor(rand()*(hi-lo+1)));}
  if(userIds.length!==kidsPlan.length)throw new Error(`expected ${kidsPlan.length} synthetic users, got ${userIds.length}`);
  // Shuffle tried-food volumes across families (deterministically) so multi-child families also get history.
  for(let i=triedPlan.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[triedPlan[i],triedPlan[j]]=[triedPlan[j],triedPlan[i]];}
  return userIds.map((id,i)=>({id,kids:Array.from({length:kidsPlan[i]},()=>uuid(rand)),tried:triedPlan[i]}));
}

// Returns SQL (executed by a privileged role, as a restore would be) and the expectations derived from it.
function build(userIds,seed=20261103){
  const rand=prng(seed),fams=families(userIds,rand),sql=[],rows={babies:[],tried_foods:[],custom_recipes:[],custom_foods:[],food_journal:[],allergy_records:[],favorite_recipes:[],cooked_recipes:[],login_events:[],feedback:[]};
  const unassignedShare={0:1,1:SHAPE.tried_foods_unassigned_by_children[1]/4400,2:0.4,3:0};
  for(const f of fams){
    f.kids.forEach((kid,i)=>rows.babies.push({id:kid,user_id:f.id,name:`Copil sintetic ${i+1}`,birthdate:day(rand,'2025-01-01',500).slice(0,10),gender:rand()<0.5?'boy':'girl',created_at:day(rand)}));
    // Production keeps UNIQUE(user_id, food_id): a family never has the same food twice, even for siblings.
    const foods=[...FOODS].sort(()=>rand()-0.5).slice(0,f.tried);
    for(const food of foods){
      const unassigned=!f.kids.length||rand()<unassignedShare[Math.min(f.kids.length,3)];
      rows.tried_foods.push({id:uuid(rand),user_id:f.id,baby_id:unassigned?null:f.kids[Math.floor(rand()*f.kids.length)],food_id:food,food_name:food.replace('aliment-sintetic-','Aliment '),first_tried_at:day(rand),try_count:1+Math.floor(rand()*6)});
    }
  }
  const pick=(n,filter=()=>true)=>fams.filter(filter).sort(()=>rand()-0.5).slice(0,n);
  // Custom recipes first: the journal references some of them (same owner, as production preflight requires).
  const recipeOwners=pick(40,f=>f.tried>0);
  for(let i=0;i<SHAPE.custom_recipes;i++){const o=recipeOwners[i%recipeOwners.length];rows.custom_recipes.push({id:`custom-${i+1}-${o.id.slice(0,8)}`,user_id:o.id,name:`Rețetă proprie ${i+1}`,ingredients:'[]',created_at:day(rand)});}
  for(let i=0;i<SHAPE.custom_foods;i++){const o=recipeOwners[i%recipeOwners.length];rows.custom_foods.push({id:`custom-food-${i+1}-${o.id.slice(0,8)}`,user_id:o.id,name:`Aliment propriu ${i+1}`,created_at:day(rand)});}
  // Journal: all rows unassigned, a long tail (one family has food_journal_max entries).
  const journalFams=pick(SHAPE.food_journal_families,f=>f.tried>0);const counts=journalFams.map(()=>1);counts[0]=SHAPE.food_journal_max;
  let rest=SHAPE.food_journal-counts.reduce((a,b)=>a+b,0);while(rest>0){counts[1+Math.floor(rand()*(counts.length-1))]++;rest--;}
  let withRecipe=SHAPE.food_journal_custom_recipe;
  journalFams.forEach((f,i)=>{const own=rows.custom_recipes.filter(r=>r.user_id===f.id);for(let n=0;n<counts[i];n++){
    const custom=own.length&&withRecipe>0&&rand()<0.6?own[Math.floor(rand()*own.length)].id:null;if(custom)withRecipe--;
    rows.food_journal.push({id:uuid(rand),user_id:f.id,baby_id:null,food_id:FOODS[Math.floor(rand()*FOODS.length)],food_name:'Aliment',meal_type:['mic-dejun','pranz','cina','gustare'][Math.floor(rand()*4)],reaction:['pozitiv','neutru','negativ','loved'][Math.floor(rand()*4)],logged_at:day(rand),custom_recipe_id:custom});}});
  const allergyFams=pick(17,f=>f.kids.length>0);for(let i=0;i<SHAPE.allergy_records;i++){const f=allergyFams[i%allergyFams.length];rows.allergy_records.push({id:uuid(rand),user_id:f.id,baby_id:null,food_id:FOODS[i],food_name:'Alergen sintetic',severity:['usoara','moderata','severa'][i%3],recorded_at:day(rand)});}
  const favFams=pick(SHAPE.favorite_families,f=>f.kids.length===1);for(let i=0;i<SHAPE.favorite_recipes;i++){const f=favFams[i%favFams.length];rows.favorite_recipes.push({id:uuid(rand),user_id:f.id,recipe_id:RECIPES[i],saved_at:day(rand)});}
  const cookFams=pick(SHAPE.cooked_families,f=>f.kids.length>0);for(let i=0;i<SHAPE.cooked_recipes;i++){const f=cookFams[i%cookFams.length];rows.cooked_recipes.push({id:uuid(rand),user_id:f.id,recipe_id:RECIPES[i],cooked_at:day(rand)});}
  for(let i=0;i<SHAPE.login_events;i++)rows.login_events.push({id:uuid(rand),user_id:fams[Math.floor(rand()*fams.length)].id,logged_in_at:day(rand),platform:'web'});
  for(let i=0;i<SHAPE.feedback;i++)rows.feedback.push({id:uuid(rand),user_id:fams[i*7].id,question_1:'Răspuns sintetic',created_at:day(rand)});
  for(const [table,list] of Object.entries(rows)){
    if(!list.length)continue;const cols=Object.keys(list[0]);
    for(let i=0;i<list.length;i+=500)sql.push(`INSERT INTO public.${table}(${cols.join(',')}) VALUES ${list.slice(i,i+500).map(r=>'('+cols.map(c=>q(r[c])).join(',')+')').join(',')};`);
  }
  // What V2 must show per child after the migrations (v2_legacy_history rule).
  const expected=new Map();
  for(const f of fams)for(const kid of f.kids){
    const only=f.kids.length===1,mine=r=>r.user_id===f.id&&(r.baby_id===kid||(r.baby_id===null&&only));
    expected.set(kid,{user:f.id,introduced:[...new Set(rows.tried_foods.filter(mine).map(r=>r.food_id))].sort(),uses:rows.cooked_recipes.filter(r=>r.user_id===f.id&&only).length,clinical:rows.allergy_records.some(r=>r.user_id===f.id)});
  }
  return {sql,families:fams,rows,expected};
}

// Fingerprint of the V1 columns only (production snapshot), so added V2 columns do not change it.
function fingerprintSql(columns){
  return Object.entries(columns).map(([table,cols])=>{
    const names=cols.map(c=>c.split(':')[0]);
    return `SELECT '${table}' t,count(*)::int n,coalesce(md5(string_agg(row(${names.map(n=>`"${n}"`).join(',')})::text,'|' ORDER BY id::text)),'') h FROM public.${table}`;
  }).join(' UNION ALL ')+' ORDER BY 1';
}
module.exports={build,fingerprintSql,prng,uuid,SHAPE};
