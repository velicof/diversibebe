export const funnelNames = ["homepage_view","onboarding_started","question_completed","personalized_result_viewed","recipe_opened","signup_started","signup_completed","recipe_saved","return_visit","premium_interest","account_prompt_viewed","login_started","login_completed","result_saved"] as const;
export type FunnelName = (typeof funnelNames)[number];
export type Experiment = {message:"A"|"B"|"C";flow:"guided"|"classic"};
export type FunnelEvent = {id:string;name:FunnelName;at:string;visit:string;journey:string|null;properties:Record<string,string|number>};
export const headlines = {
  A:{title:"Ce îi gătim azi?",accent:"O întrebare mai ușoară, împreună.",cta:"Hai să găsim o idee de masă"},
  B:{title:"Mai puțin timp căutând rețete.",accent:"Mai mult timp împreună.",cta:"Hai să găsim o idee de masă"},
  C:{title:"Fiecare copil are ritmul lui.",accent:"Și mesele voastre, la fel.",cta:"Personalizează sugestiile"},
} as const;
export function readExperiment(search:string):Experiment {
  const p=new URLSearchParams(search);
  return {message:p.get("mesaj")==="A"?"A":p.get("mesaj")==="C"?"C":"B",flow:p.get("parcurs")==="clasic"?"classic":"guided"};
}
export function sanitizeFunnelProperties(properties:Record<string,unknown>):Record<string,string|number> {
  const safe:Record<string,string|number>={};
  for(const key of ["step","count","elapsedMs","daysSinceLastVisit"]) {
    const v=properties[key];if(typeof v==="number" && Number.isFinite(v) && v>=0) safe[key]=Math.min(86400000,Math.round(v));
  }
  if(["A","B","C"].includes(String(properties.message))) safe.message=String(properties.message);
  if(["guided","classic"].includes(String(properties.flow))) safe.flow=String(properties.flow);
  if(["demo","guide","empty","blocked"].includes(String(properties.valueKind))) safe.valueKind=String(properties.valueKind);
  return safe;
}
export function dedupeFunnel(events:FunnelEvent[],event:FunnelEvent) {
  return events.some(e=>e.id===event.id)?events:[...events,event].slice(-500);
}
