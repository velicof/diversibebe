import type { AppState, Stage } from "../model";
import { activeCatalog, contentMode, ingredients, type Recipe } from "../catalog";
import { initialFilters, recommend } from "../recommendations";

export const challenges = [
  { id: "ideas", title: "Nu mai știu ce să-i gătesc", note: "Un pic de inspirație pentru azi", symbol: "lightbulb" },
  { id: "beginning", title: "Suntem la început cu diversificarea", note: "Luăm lucrurile pe rând", symbol: "sprout" },
  { id: "refusal", title: "Refuză multe alimente", note: "Mai multă liniște la masă", symbol: "heart" },
  { id: "time", title: "Nu am suficient timp să gătesc", note: "Idei pentru zilele pline", symbol: "clock" },
  { id: "planning", title: "Vreau să organizez mai bine mesele", note: "Un plan mic, ușor de schimbat", symbol: "calendar" },
  { id: "serving", title: "Caut informații clare despre servire", note: "Resurse de încredere, la îndemână", symbol: "book" },
] as const;
export type Challenge = (typeof challenges)[number]["id"];
export const ageBands = [
  { id: "preparing", title: "Încă nu am început", note: "Ne pregătim pentru primele mese", stage: 0 },
  { id: "6-8", title: "Aproximativ 6–8 luni", note: "Primele descoperiri", stage: 6 },
  { id: "9-12", title: "9–12 luni", note: "Mai multă varietate", stage: 8 },
  { id: "13-18", title: "13–18 luni", note: "La masa familiei", stage: 12 },
  { id: "19-24", title: "19–24 luni", note: "Mici obiceiuri de zi cu zi", stage: 12 },
  { id: "over24", title: "Peste 2 ani", note: "Continuăm să explorăm", stage: 12 },
] as const;
export type AgeBand = (typeof ageBands)[number]["id"];
export type Journey = {
  version: 1; id: string; step: number; challenge: Challenge | null;
  ageBand: AgeBand | null; context: string | null; pantry: string[];
  startedAt: number; completed: boolean; guideSaved: boolean; resultIds: string[];
};
export type ContextQuestion = { title: string; note: string; options: {id: string; title: string; note: string}[] };
export function contextQuestion(challenge: Challenge | null, age: AgeBand | null): ContextQuestion {
  if (age === "preparing" || challenge === "beginning" || challenge === "serving") return {
    title: "Ce te-ar ajuta să te simți mai pregătit?", note: "Alege un punct de pornire. Poți sări peste acest pas.",
    options: [
      {id:"readiness",title:"Să înțeleg semnele de pregătire",note:"Vârsta nu este singurul reper"},
      {id:"serving",title:"Să aflu cum se servesc alimentele",note:"Textură, formă și supraveghere"},
      {id:"safety",title:"Să înțeleg regulile de siguranță",note:"O sursă clară la care să revin"},
    ],
  };
  if (challenge === "time") return {title:"Cât timp ai de obicei pentru o masă?",note:"Ne uităm la timpul din rețetă, fără să promitem un rezultat cronometrat.",options:[
    {id:"under15",title:"Sub 15 minute",note:"Cât mai puțini pași"},
    {id:"15to30",title:"15–30 minute",note:"Un răgaz mic pentru gătit"},
    {id:"over30",title:"Peste 30 minute",note:"Am loc și pentru ceva mai elaborat"},
  ]};
  if (challenge === "refusal") return {title:"Cu ce ai vrea să începi?",note:"Nu punem diagnostice și nu promitem să rezolvăm refuzurile.",options:[
    {id:"no-pressure",title:"Mese fără presiune",note:"Informații despre ritmul copilului"},
    {id:"familiar",title:"Idei din ingrediente cunoscute",note:"Un punct de pornire familiar"},
    {id:"today",title:"O idee simplă pentru azi",note:"Fără obligația de a o folosi"},
  ]};
  return {title:challenge === "planning" ? "Ce vrei să organizezi mai întâi?" : "Ce ți-ar fi cel mai util?",note:"Doar ce îți este util acum. Restul poate aștepta.",options:[
    {id:"today",title:"O idee pentru masa de azi",note:"Începem cu o singură alegere"},
    {id:"few-days",title:"Un plan pentru câteva zile",note:"Următoarele trei zile, pe rând"},
    {id:"fridge",title:"Rețete din ce am în frigider",note:"Aleg ingredientele pe care le am"},
  ]};
}
export function newJourney(id: string, now: number): Journey {
  return {version:1,id,step:0,challenge:null,ageBand:null,context:null,pantry:[],startedAt:now,completed:false,guideSaved:false,resultIds:[]};
}
export function readJourney(raw: string | null, fallback: Journey): Journey {
  try {
    const v = JSON.parse(raw || "null");
    if (!v || v.version !== 1 || typeof v.id !== "string" || !/^[a-f0-9-]{36}$/i.test(v.id)) return fallback;
    const challenge = challenges.some(c=>c.id===v.challenge) ? v.challenge as Challenge : null;
    const ageBand = ageBands.some(a=>a.id===v.ageBand) ? v.ageBand as AgeBand : null;
    const context = contextQuestion(challenge,ageBand).options.some(o=>o.id===v.context) ? v.context as string : null;
    const parsedStep = Math.max(0,Math.min(3,Math.trunc(Number(v.step)||0)));
    const step = !challenge ? 0 : !ageBand ? Math.min(parsedStep,1) : parsedStep;
    return {version:1,id:v.id,challenge,ageBand,context,step,
      pantry:Array.isArray(v.pantry)?[...new Set<string>(v.pantry.filter((x:unknown)=>ingredients.some(i=>i.id===x)))].slice(0,8):[],
      startedAt:typeof v.startedAt==="number" && Number.isFinite(v.startedAt) && v.startedAt>0 ? v.startedAt : fallback.startedAt,
      completed:v.completed===true && step===3,guideSaved:v.guideSaved===true,
      resultIds:Array.isArray(v.resultIds)?[...new Set<string>(v.resultIds.filter((id:unknown)=>activeCatalog.some(r=>r.id===id)))].slice(0,3):[]};
  } catch { return fallback; }
}
export function journeyStage(j: Journey): Stage {
  return (ageBands.find(a=>a.id===j.ageBand)?.stage ?? 0) as Stage;
}
export function journeyMinutes(j: Journey) { return j.context==="under15"?14:j.context==="over30"?90:30; }
export function personalizedResult(j: Journey, state: AppState, blocked: boolean, authenticated=false, recipes: Recipe[]=activeCatalog, mode:"preview"|"live"=contentMode) {
  const stage = authenticated || state.onboarded ? Math.min(state.stage, journeyStage(j)) : journeyStage(j);
  const guide = stage===0 || j.context==="readiness" || j.context==="safety" || j.context==="serving" || j.context==="no-pressure";
  const matches = guide || blocked ? [] : recommend(recipes,{...initialFilters,months:stage,maxMinutes:journeyMinutes(j),ingredientIds:j.context==="fridge"?j.pantry:[]},{
    mode,favorites:state.favorites,introduced:state.introduced,used:state.uses.map(u=>u.recipeId),excludedIngredients:[],requiresClinicalGuidance:blocked,
  });
  const selected = j.completed && j.resultIds.length ? j.resultIds.flatMap(id=>matches.filter(r=>r.id===id)) : matches.slice(0,3);
  return {kind:blocked?"blocked":guide?"guide":selected.length?"demo":"empty",recipes:selected,stage,maxMinutes:journeyMinutes(j)} as const;
}
export function resultReason(j: Journey, recipe: Recipe) {
  if(j.context==="fridge" && j.pantry.length) return "Include un ingredient ales din frigiderul tău";
  if(j.challenge==="time") return `${recipe.minutes} minute în catalog · în limita aleasă`;
  if(j.challenge==="planning" || j.context==="few-days") return "O idee pe care o poți păstra în plan";
  if(j.challenge==="refusal") return "Un exemplu de explorat, fără promisiuni de acceptare";
  return "Din catalogul demonstrativ, pentru etapa de explorare aleasă";
}
export const education = [
  {id:"readiness",title:"Înainte de prima masă",text:"Pregătirea ține de dezvoltare, nu doar de o vârstă din calendar. Începe cu semnele descrise de NHS și discută situația copilului cu profesionistul care îl urmărește.",url:"https://www.nhs.uk/best-start-in-life/baby/weaning/how-to-start-weaning-your-baby/",link:"Semnele de pregătire · NHS"},
  {id:"serving",title:"Servirea începe cu siguranța",text:"Forma și textura alimentelor, poziția copilului și supravegherea contează. Ghidul NHS explică pregătirea alimentelor pentru reducerea riscului de înec.",url:"https://www.nhs.uk/best-start-in-life/baby/weaning/safe-weaning/preparing-food-safely/",link:"Pregătirea și servirea · NHS"},
  {id:"no-pressure",title:"Un ritm fără presiune",text:"O masă nu este un test. NHS recomandă respectarea semnalelor copilului, fără a-l forța să mănânce. Pentru îngrijorări persistente, cere îndrumare individuală.",url:"https://www.nhs.uk/baby/weaning-and-feeding/help-your-baby-enjoy-new-foods/",link:"Explorarea alimentelor · NHS"},
] as const;
