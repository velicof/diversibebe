const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load,plain}=require('./load-ts.cjs');
const {challenges,ageBands,newJourney,readJourney,contextQuestion,personalizedResult}=load('src/features/v2/growth/journey.ts');
const {readExperiment,sanitizeFunnelProperties,dedupeFunnel}=load('src/features/v2/growth/funnel.ts');
const {emptyState}=load('src/features/v2/model.ts');
const {previewCatalog}=load('src/features/v2/catalog.ts');
const base=()=>({...newJourney('11111111-1111-4111-8111-111111111111',1000),step:3,completed:true});
for(const challenge of challenges)for(const age of ageBands)test(`growth: ${challenge.id} / ${age.id} respects eligibility and preparation`,()=>{
 const j={...base(),challenge:challenge.id,ageBand:age.id};
 const result=personalizedResult(j,emptyState,false);
 assert.ok(result.recipes.length<=3);
 if(age.id==='preparing'){assert.equal(result.kind,'guide');assert.equal(result.recipes.length,0);}
 for(const r of result.recipes){assert.ok(r.minimumMonths<=age.stage);assert.ok(r.minutes<=30);assert.equal(r.automaticReview.status,'no-automatic-issues');assert.equal(r.review.status,'pending');}
});
test('growth: under 15 really excludes 15-minute recipes; unknown times remain ineligible',()=>{
 const j={...base(),challenge:'time',ageBand:'6-8',context:'under15'};
 const result=personalizedResult(j,emptyState,false);
 assert.ok(result.recipes.length>0);
 assert.ok(result.recipes.every(r=>r.minutes<15));
 const unknown=previewCatalog.map(r=>({...r,minutes:null}));
 assert.equal(personalizedResult(j,emptyState,false,false,unknown).kind,'empty');
});
test('growth: no eligible ingredient never silently relaxes the selected filter',()=>{
 const j={...base(),challenge:'ideas',ageBand:'6-8',context:'fridge',pantry:['broccoli']};
 assert.equal(personalizedResult(j,emptyState,false).kind,'empty');
 assert.equal(personalizedResult(j,emptyState,false).recipes.length,0);
});
test('growth: clinical stop and live review gate cannot be overridden by preferences or pinned results',()=>{
 const j={...base(),challenge:'ideas',ageBand:'over24',resultIds:['piure-dovlecel']};
 assert.equal(personalizedResult(j,emptyState,true).kind,'blocked');
 assert.equal(personalizedResult(j,emptyState,false,false,previewCatalog,'live').recipes.length,0);
 assert.equal(personalizedResult(j,{...emptyState,stage:0},false,true).kind,'guide');
 assert.equal(personalizedResult(j,{...emptyState,onboarded:true,stage:0},false).kind,'guide');
});
test('growth: personalized results retain their IDs across authentication and recheck eligibility',()=>{
 const j={...base(),challenge:'ideas',ageBand:'6-8'};
 const ids=personalizedResult(j,emptyState,false).recipes.map(r=>r.id);
 const frozen={...j,resultIds:ids};
 assert.deepEqual(plain(personalizedResult(frozen,{...emptyState,favorites:previewCatalog.map(r=>r.id)},false,true).recipes.map(r=>r.id)),plain(ids));
 assert.equal(personalizedResult(frozen,{...emptyState,stage:0},false,true).recipes.length,0);
});
test('growth: optional context may be skipped; preparation does not become a recipe',()=>{
 const j={...base(),challenge:'time',ageBand:'9-12',context:null};
 assert.ok(personalizedResult(j,emptyState,false).recipes.length>0);
 assert.equal(contextQuestion('time','preparing').options[0].id,'readiness');
 assert.equal(personalizedResult({...j,ageBand:'preparing'},emptyState,false).recipes.length,0);
});
test('growth: untrusted storage is reduced to known fields and bounded state',()=>{
 const fallback=newJourney('22222222-2222-4222-8222-222222222222',2000);
 assert.deepEqual(plain(readJourney('{broken',fallback)),plain(fallback));
 const j=readJourney(JSON.stringify({...base(),challenge:'time',ageBand:'6-8',context:'under15',pantry:['banana','allergy','banana'],step:99,name:'Sensitive',diagnosis:'secret',resultIds:['unknown','piure-dovlecel']}),fallback);
 assert.equal(j.step,3);assert.deepEqual(plain(j.pantry),['banana']);assert.deepEqual(plain(j.resultIds),['piure-dovlecel']);
 assert.ok(!JSON.stringify(j).includes('Sensitive'));assert.ok(!JSON.stringify(j).includes('secret'));
 assert.equal(readJourney(JSON.stringify({...base(),challenge:'time',ageBand:null,step:-99}),fallback).step,0);
});
test('growth: context is discarded when it does not belong to the chosen problem',()=>{
 const j=readJourney(JSON.stringify({...base(),challenge:'beginning',ageBand:'6-8',context:'under15'}),base());
 assert.equal(j.context,null);
});
test('growth: test experiment dimensions are independent and default to B / guided',()=>{
 assert.deepEqual(plain(readExperiment('?mesaj=A&parcurs=clasic')),{message:'A',flow:'classic'});
 assert.deepEqual(plain(readExperiment('?mesaj=invalid')),{message:'B',flow:'guided'});
});
test('growth: funnel rejects identities, health, answers and arbitrary properties',()=>{
 const safe=sanitizeFunnelProperties({step:2,count:3,elapsedMs:1200.4,message:'C',flow:'guided',valueKind:'demo',age:8,childId:'private',email:'x@example.test',challenge:'refusal',pantry:['banana'],diagnosis:'secret',name:'secret',unknown:'secret'});
 assert.deepEqual(plain(safe),{step:2,count:3,elapsedMs:1200,message:'C',flow:'guided',valueKind:'demo'});
 assert.deepEqual(plain(sanitizeFunnelProperties({step:-1,count:Infinity,message:'injected',flow:'unknown'})),{});
 const event={id:'unique',name:'homepage_view',properties:{},at:'now',visit:'test',journey:null};
 assert.equal(dedupeFunnel([event],event).length,1);
});
