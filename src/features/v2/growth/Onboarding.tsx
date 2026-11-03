"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, Clock3, Heart, Lightbulb, Sprout, CalendarDays, BookOpen, Leaf, RotateCcw, ShieldCheck } from "lucide-react";
import { Onboarding as ClassicOnboarding } from "../screens";
import { usePreview } from "../Provider";
import { LoadingState, RecipeCard } from "../components";
import { ingredients } from "../catalog";
import { reviewCopy, accountCopy } from "../content/copy";
import { emptyState } from "../model";
import { nativeAuth } from "../cloud/client";
import { cloudStore } from "../cloud/store";
import { ageBands, challenges, contextQuestion, education, journeyStage, personalizedResult, resultReason, type Journey } from "./journey";
import { emitGrowth, journeyScope, journeyStore, useExperiment, useJourney } from "./browser";

const symbols={lightbulb:Lightbulb,sprout:Sprout,heart:Heart,clock:Clock3,calendar:CalendarDays,book:BookOpen};
export function EducationCards({focus}:{focus?:string|null}){
  const cards=[...education].sort((a,b)=>Number(b.id===focus)-Number(a.id===focus));
  return <div className="gw-education-grid">{cards.map((item,i)=><article key={item.id} className="gw-education-card"><span className="gw-eyebrow">0{i+1} · REZUMAT CU SURSĂ</span><h3>{item.title}</h3><p>{item.text}</p><a className="v2-text-link" href={item.url} target="_blank" rel="noreferrer">{item.link}<ArrowUpRight size={16}/></a><small>Resursă externă în limba engleză. Rezumatul nu reprezintă revizia clinică a aplicației.</small></article>)}</div>;
}
export function Preparation(){return <div className="gw-journey gw-resource-page"><Link href="/v2" className="v2-back-link"><ArrowLeft size={16}/> Înapoi</Link><p className="gw-eyebrow">FĂRĂ CONT. FĂRĂ PAYWALL.</p><h1>Un început mai liniștit.</h1><p className="v2-intro">Începe cu surse clare despre pregătire, servire și ritmul copilului. Nu evaluăm aici dacă un copil este pregătit pentru diversificare.</p><EducationCards/><Link href="/v2/onboarding" className="v2-button v2-button-primary">Alege ce te-ar ajuta <ArrowRight size={17}/></Link></div>;}

export function GrowthOnboarding(){
  const exp=useExperiment();
  const {state,ready,cloud,clinicalGuidance,dispatch}=usePreview();
  const scope=journeyScope(cloud.userId,cloud.selectedBabyId);
  const snapshot=useJourney(scope);
  const heading=useRef<HTMLHeadingElement>(null);
  const previousStep=useRef<number|null>(null);
  const j=snapshot.data;
  const result=personalizedResult(j,state,clinicalGuidance,cloud.connected);
  useEffect(()=>{
    if(!nativeAuth && snapshot.ready && !cloud.loading && cloud.connected)journeyStore.claimHandoff(scope);
  },[snapshot.ready,cloud.connected,cloud.loading,scope]);
  useEffect(()=>{
    if(!snapshot.ready || !ready || !exp.ready || exp.flow==="classic")return;
    if(j.step<3)emitGrowth("onboarding_started",{},"start",j.id);
    if(j.step===3)emitGrowth("personalized_result_viewed",{count:result.recipes.length,valueKind:result.kind,elapsedMs:Math.max(0,Date.now()-j.startedAt)},"result",j.id);
    if(previousStep.current!==null && previousStep.current!==j.step)heading.current?.focus();
    previousStep.current=j.step;
  },[j.id,j.step,j.startedAt,ready,snapshot.ready,exp.ready,exp.flow,result.kind,result.recipes.length]);
  if(!exp.ready)return <LoadingState/>;
  if(exp.flow==="classic")return <ClassicOnboarding/>;
  if(!ready || !snapshot.ready)return <LoadingState/>;
  const update=(patch:Partial<Journey>)=>journeyStore.update(scope,patch);
  const context=contextQuestion(j.challenge,j.ageBand);
  const next=(skip=false)=>{
    emitGrowth("question_completed",{step:j.step+1},`question:${j.step+1}`,j.id);
    if(j.step<2){update({step:j.step+1});return;}
    const completed={...j,context:skip?null:j.context,pantry:skip?[]:j.pantry};
    const candidateState=cloud.connected?state:{...state,stage:journeyStage(j)};
    const selected=personalizedResult(completed,candidateState,clinicalGuidance,cloud.connected);
    update({step:3,completed:true,context:completed.context,pantry:completed.pantry,resultIds:selected.recipes.map(r=>r.id)});
    // The UX age band never changes the selected child's stored clinical profile.
    if(!cloud.connected)dispatch({type:"onboard",stage:journeyStage(j),introduced:state.introduced});
  };
  const title=j.step===0?"Care e cea mai mare provocare la mesele celui mic?":j.step===1?"În ce etapă este copilul tău?":j.step===2?context.title:result.kind==="guide"?"Un început mai liniștit, în ritmul vostru.":result.kind==="blocked"?"Începem cu informații, nu cu sugestii.":result.kind==="empty"?"Nu am găsit idei în alegerile de acum.":"Un punct de pornire pentru mesele voastre.";
  return <div className={`gw-journey ${j.step===3?"gw-result-page":""}`}>
    <div className="gw-journey-top"><Link href="/v2" className="v2-back-link"><ArrowLeft size={16}/> Pagina de început</Link><Link href="/v2/pregatire" className="gw-safety-link"><ShieldCheck size={15}/> Resurse de siguranță</Link></div>
    <div className="gw-progress" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(3,j.step+1)} aria-label={j.step===3?"Rezultatul tău":`Pasul ${j.step+1} din 3`}><span style={{width:`${j.step===3?100:(j.step+1)*100/3}%`}}/></div>
    <p className="gw-eyebrow">{j.step<3?`CÂTEVA ALEGERI PENTRU VOI · ${j.step+1} DIN 3`:"REZULTATUL TĂU · FĂRĂ CONT OBLIGATORIU"}</p>
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    <p className="gw-question-note">{j.step===0?"Alege ce te-ar ajuta cel mai mult astăzi. Poți schimba răspunsul oricând.":j.step===1?"Categorii de explorare, nu reguli medicale. Nu cerem nume, dată de naștere sau alte date personale.":j.step===2?context.note:result.kind==="demo"?"Aceste exemple reale din catalog respectă filtrele alese. Nu sunt recomandări medicale validate.":result.kind==="empty"?"Nu lărgim filtrele în locul tău. Poți schimba timpul sau ingredientele și poți explora resursele gratuite.":"Câteva informații cu sursă, de explorat în ritmul tău. Fără evaluări sau recomandări individuale."}</p>
    {snapshot.storageError && <p role="alert" className="v2-alert">Răspunsurile rămân doar în sesiunea curentă. Browserul nu permite salvarea lor pentru refresh.</p>}
    {j.step===0 && <div className="gw-answer-grid">{challenges.map(c=>{const Icon=symbols[c.symbol];return <button className="gw-answer" type="button" key={c.id} aria-pressed={j.challenge===c.id} onClick={()=>update({challenge:c.id,context:null,pantry:[],resultIds:[]})}><span className="gw-answer-icon"><Icon size={24} strokeWidth={1.5}/></span><span><strong>{c.title}</strong><small>{c.note}</small></span><span className="gw-answer-check">{j.challenge===c.id&&<Check size={15}/>}</span></button>;})}</div>}
    {j.step===1 && <><div className="gw-answer-grid">{ageBands.map(a=><button className="gw-answer" type="button" key={a.id} aria-pressed={j.ageBand===a.id} onClick={()=>update({ageBand:a.id,context:null,resultIds:[]})}><span className="gw-answer-icon"><Sprout size={24} strokeWidth={1.5}/></span><span><strong>{a.title}</strong><small>{a.note}</small></span><span className="gw-answer-check">{j.ageBand===a.id&&<Check size={15}/>}</span></button>)}</div><p className="gw-fine-print">Dacă nu ați început, îți arătăm resurse despre pregătire. Vârsta singură nu stabilește pregătirea sau modul de servire.</p></>}
    {j.step===2 && <><div className="gw-answer-grid gw-answer-grid-context">{context.options.map(o=><button key={o.id} className="gw-answer" type="button" aria-pressed={j.context===o.id} onClick={()=>update({context:o.id,pantry:[],resultIds:[]})}><span><strong>{o.title}</strong><small>{o.note}</small></span><span className="gw-answer-check">{j.context===o.id&&<Check size={15}/>}</span></button>)}</div>{j.context==="fridge"&&<fieldset className="gw-pantry"><legend>Ce ai deja acasă? <small>Opțional · orice ingredient bifat poate apărea în rezultat</small></legend><div className="v2-ingredient-cloud">{ingredients.map(i=><button type="button" key={i.id} aria-pressed={j.pantry.includes(i.id)} onClick={()=>update({pantry:j.pantry.includes(i.id)?j.pantry.filter(x=>x!==i.id):[...j.pantry,i.id]})}>{j.pantry.includes(i.id)&&<Check size={14}/>} {i.name}</button>)}</div><p className="gw-fine-print">Nu deducem alergii sau toleranță din aceste alegeri. Lista nu verifică dacă ai toate ingredientele rețetei.</p></fieldset>}</>}
    {j.step<3 ? <><div className="gw-journey-actions"><button className="v2-button v2-button-secondary" type="button" disabled={j.step===0} onClick={()=>update({step:j.step-1})}><ArrowLeft size={16}/> Înapoi</button><button type="button" className="v2-button v2-button-primary" disabled={j.step===0?!j.challenge:j.step===1?!j.ageBand:!j.context} onClick={()=>next()}>{j.step===2?"Vezi rezultatul meu":"Continuă"}<ArrowRight size={17}/></button></div>{j.step===2&&<button type="button" className="v2-text-button gw-skip" onClick={()=>next(true)}>Sar peste acest pas</button>}<p className="gw-private-note"><Leaf size={14}/> Rezultatul apare înainte de cont. Fără nume sau date medicale.</p></> : <><div className="gw-result-summary"><span><Check size={15}/> {challenges.find(c=>c.id===j.challenge)?.note}</span><button type="button" className="v2-text-button" onClick={()=>update({step:0,resultIds:[]})}>Schimbă răspunsurile <RotateCcw size={14}/></button></div>{cloud.connected&&<p className="gw-fine-print">Păstrăm profilul copilului selectat din cont. Răspunsurile de explorare nu îl suprascriu.</p>}
      {result.kind==="demo"&&<div className="gw-result-grid">{result.recipes.map(r=><div key={r.id} data-result-recipe={r.id}><RecipeCard recipe={r} reason={resultReason(j,r)}/><p className="gw-recipe-ingredients">{r.ingredients.slice(0,3).join(" · ")}</p></div>)}<p className="gw-serving-note">{reviewCopy.serving} <a href={education[1].url} target="_blank" rel="noreferrer">ghidul NHS</a>.</p></div>}
      {(result.kind!=="demo"||j.challenge==="refusal")&&<EducationCards focus={j.context}/>}
      {(result.kind==="empty"||result.kind==="blocked")&&<p className="gw-fine-print">Nu afișăm rețete eligibile în acest rezultat. Poți continua cu informațiile de mai sus.</p>}
      <SaveResult scope={scope} journey={j} ids={result.recipes.map(r=>r.id)} kind={result.kind}/>
      <div className="gw-result-next"><Link href={j.challenge==="planning"||j.context==="few-days"?"/v2/plan":"/v2/azi"} className="v2-button v2-button-primary">{j.challenge==="planning"||j.context==="few-days"?"Deschide planul meu":"Continuă în spațiul meu"}<ArrowRight size={17}/></Link><Link href="/v2/idei" className="v2-text-link">Explorează catalogul fără cont <ArrowRight size={16}/></Link></div>
    </>}
  </div>;
}
function SaveResult({scope,journey,ids,kind}:{scope:string;journey:Journey;ids:string[];kind:string}){
  const {state,cloud,dispatch,announce,storageError}=usePreview();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const localSaved=ids.length?ids.every(id=>state.favorites.includes(id)):journey.guideSaved;
  const saved=localSaved&&(!cloud.connected||!nativeAuth||JSON.stringify(cloud.journey)===JSON.stringify(journey));
  useEffect(()=>{if(saved&&!cloud.connected)emitGrowth("account_prompt_viewed",{},"prompt",journey.id);},[saved,cloud.connected,journey.id]);
  return <section className="gw-save-result" aria-labelledby="gw-save-title"><span className="gw-note-icon"><Bookmark size={24}/></span><div><h2 id="gw-save-title">{saved?"Un lucru mai puțin de căutat mâine.":ids.length?"Vrei să păstrezi ideile pentru mai târziu?":"Vrei să păstrezi aceste resurse?"}</h2><p>{saved?cloud.connected?accountCopy.savedInAccount:storageError?"Rezultatul este păstrat în această sesiune.":"Rezultatul este păstrat pe acest dispozitiv. Poți reveni oricând.":cloud.connected&&ids.length?"Adăugăm doar ideile din acest rezultat. Planul și profilul rămân ale tale.":"Le salvăm întâi pe acest dispozitiv. Nu ai nevoie de email sau parolă."}</p><button type="button" className="v2-button v2-button-secondary" disabled={busy||saved||cloud.saving||cloud.loading||(cloud.connected&&!cloud.selectedBabyId)} onClick={async()=>{
    setBusy(true);setError("");
    try{
      if(ids.length){if(cloud.connected)await cloudStore.importIdeas({...emptyState,favorites:ids});else for(const recipeId of ids)if(!state.favorites.includes(recipeId))dispatch({type:"favorite",recipeId});}
      else journeyStore.update(scope,{guideSaved:true});
      if(nativeAuth&&cloud.connected)await cloudStore.saveJourney(ids.length?journey:{...journey,guideSaved:true});
      emitGrowth("result_saved",{count:ids.length,valueKind:kind},"saved",journey.id);
      announce("Rezultatul a fost păstrat.");
    }catch{setError("Salvarea nu s-a încheiat. Rezultatul rămâne aici și poți reîncerca.");}finally{setBusy(false);}
  }}><Check size={17}/>{busy?"Se salvează…":saved?"Rezultat păstrat":ids.length?"Salvează ideile mele":"Păstrează ghidul meu"}</button>{error&&<p role="alert">{error}</p>}
  {saved&&!cloud.connected&&<div className="gw-account-invitation"><h3>{nativeAuth?"Păstrează rezultatul și pentru următoarea vizită":"Ai deja un cont de test?"}</h3><p>{nativeAuth?accountCopy.accountInvitation:"Poți conecta contul și păstra acest rezultat. Crearea conturilor reale va fi disponibilă după validarea autentificării; înregistrarea nu este simulată aici."}</p><Link href="/v2/cont" className="v2-text-link" onClick={()=>{journeyStore.prepareHandoff(scope);emitGrowth("account_prompt_viewed",{},"prompt",journey.id);}}>{nativeAuth?"Salvează în cont sau creează un cont":"Continuă cu contul de test"} <ArrowRight size={16}/></Link></div>}</div></section>;
}
