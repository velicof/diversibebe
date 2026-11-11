"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Clock3, Leaf, Bookmark, CalendarDays } from "lucide-react";
import { Landing as ClassicLanding } from "../screens";
import { RecipeCard } from "../components";
import { usePreview } from "../Provider";
import { activeCatalog, contentMode } from "../catalog";
import { reviewCopy, accountCopy } from "../content/copy";
import { initialFilters, recommend } from "../recommendations";
import { challenges, newJourney } from "./journey";
import { journeyScope, journeyStore, useJourney, useExperiment } from "./browser";
import { headlines } from "./funnel";

// Known at build time, so the link is in the first HTML and nothing moves when the page starts.
const accountsEnabled=Boolean(process.env.NEXT_PUBLIC_V2_SUPABASE_URL);
export function GrowthHome(){
  const experiment=useExperiment();
  const {state,cloud,clinicalGuidance,allergies}=usePreview();
  const scope=journeyScope(cloud.userId,cloud.selectedBabyId);
  const draft=useJourney(scope);
  const [minutes,setMinutes]=useState(30);
  const demo=useMemo(()=>recommend(activeCatalog,{...initialFilters,months:state.stage,maxMinutes:minutes},{mode:contentMode,favorites:state.favorites,introduced:state.introduced,used:[],excludedIngredients:[],requiresClinicalGuidance:clinicalGuidance,allergies}).filter(r=>["piure-dovlecel","piure-morcov"].includes(r.id)),[state.stage,minutes,state.favorites,state.introduced,clinicalGuidance,allergies]);
  const headline=headlines[experiment.message];
  const resume=draft.ready && Boolean(draft.data.challenge) && !draft.data.completed;
  // Same element while nothing in it changed: store updates at start do not re-render the whole page.
  const page=useMemo(()=><div className="gw-home">
    <section className="gw-hero" aria-labelledby="gw-title">
      <div className="gw-hero-copy">
        <span className="gw-eyebrow"><span/> PENTRU MESE MICI ȘI ZILE PLINE</span>
        <h1 id="gw-title">{headline.title}<br/><em>{headline.accent}</em></h1>
        <p>Idei de mese potrivite vârstei, un plan pe 5 zile și lista de cumpărături gata făcută. Tu alegi, noi ținem minte.</p>
        <Link href="/v2/onboarding" className="v2-button v2-button-primary gw-main-cta">{resume?"Continuă de unde ai rămas":headline.cta}<ArrowRight size={19}/></Link>
        <div className="gw-reassurance"><span><Check size={14}/> Câteva răspunsuri</span><span><Check size={14}/> Fără cont</span><span><Check size={14}/> În ritmul tău</span></div>
        <a className="gw-demo-link" href="#incearca">Sau încearcă mai întâi o idee <ArrowRight size={16}/></a>
        {accountsEnabled&&(cloud.connected?<Link className="gw-demo-link" href="/v2/azi" prefetch={false}>Mergi la planul tău <ArrowRight size={16}/></Link>:<Link className="gw-demo-link" href="/v2/cont" prefetch={false}>{accountCopy.haveAccount} <ArrowRight size={16}/></Link>)}
      </div>
      <div className="gw-hero-visual">
        <Image src="/v2/food-oats.webp" alt="Bol cu ovăz și banane, fotografie de atmosferă, fără rol de ghid de servire." width={1100} height={1400} priority sizes="(max-width:760px) 90vw, 45vw"/>
        <span className="gw-photo-label">Fotografie de atmosferă · nu ghid de servire</span>
        <div className="gw-paper-note"><span className="gw-note-icon"><Leaf size={23}/></span><p>Mai puțin „ce mai gătesc?”<strong>Mai mult „hai la masă”.</strong></p><span className="gw-note-line"/></div>
        <div className="gw-small-stamp"><Clock3 size={17}/><span>Un început mic.<br/><b>O zi mai ușoară.</b></span></div>
      </div>
    </section>
    <section className="gw-problems" aria-labelledby="gw-problems-title">
      <div className="gw-section-heading"><div><p className="gw-eyebrow">DE UNDE ÎNCEPEM?</p><h2 id="gw-problems-title">Poate te recunoști aici.</h2></div><p>Nu trebuie să le rezolvi pe toate.<br/>Alegem un singur punct de pornire.</p></div>
      <div className="gw-problem-grid">{challenges.slice(0,4).map((c,index)=><Link key={c.id} href="/v2/onboarding" onClick={()=>{journeyStore.update(scope,{...newJourney(crypto.randomUUID(),Date.now()),challenge:c.id,step:1});}}><span className="gw-problem-number">0{index+1}</span><h3>{c.title}</h3><p>{c.note}</p><ArrowUpRight size={21}/></Link>)}</div>
    </section>
    <section id="incearca" className="gw-demo-section" aria-labelledby="gw-demo-title">
      <div className="gw-demo-intro"><p className="gw-eyebrow">UN PIC DE VALOARE, CHIAR AICI</p><h2 id="gw-demo-title">O idee de masă.<br/><em>Mai puțină căutare.</em></h2><p>Schimbă timpul și deschide o rețetă din aplicație. Acesta este produsul, nu o animație de prezentare.</p>
        <fieldset className="gw-time-options"><legend>Cât timp vrei să explorezi?</legend>{[15,30].map(n=><button key={n} type="button" aria-pressed={n===minutes} onClick={()=>setMinutes(n)}><Clock3 size={15}/>{n} minute</button>)}</fieldset>
        <p className="gw-fine-print">{reviewCopy.homeFinePrint}</p>
      </div>
      <div className="gw-demo-recipes">{demo.length?demo.map(r=><RecipeCard key={r.id} recipe={r} reason={`${r.minutes} minute în catalog`}/>):<div className="gw-no-results"><Leaf size={28}/><h3>Deocamdată, fără idei în acest filtru.</h3><p>Poți schimba timpul sau poți porni cu resursele despre pregătire.</p><Link className="v2-text-link" href="/v2/onboarding">Alege un punct de pornire <ArrowRight size={16}/></Link></div>}</div>
    </section>
    <section className="gw-continuity"><div><p className="gw-eyebrow">ȘI MÂINE POATE FI MAI SIMPLU</p><h2>Nu începi de la zero.<br/><em>Păstrezi ce vă ajută.</em></h2><p>Salvezi o idee, o așezi în plan și revii când ai nevoie. Fără liste de bifat în fiecare zi.</p><Link href="/v2/onboarding" className="v2-text-link">Găsește punctul vostru de pornire <ArrowRight size={17}/></Link></div><div className="gw-continuity-cards"><div><Bookmark size={22}/><p><strong>Idei păstrate aproape</strong>Salvatele tale, fără căutarea de la capăt.</p></div><div><CalendarDays size={22}/><p><strong>Doar următoarele zile</strong>Un plan pe care îl poți schimba oricând.</p></div><div><Leaf size={22}/><p><strong>În ritmul familiei voastre</strong>Fără serii zilnice și fără zile „pierdute”.</p></div></div></section>
    <section className="gw-trust"><span className="gw-note-icon"><Leaf size={24}/></span><div><h2>Încrederea se construiește cu lucruri clare.</h2><p>{reviewCopy.homeTrust}</p><Link href="/v2/pregatire" className="v2-text-link">Vezi resursele de început <ArrowUpRight size={16}/></Link></div></section>
  </div>,[headline,resume,minutes,demo,scope,cloud.connected]);
  if(experiment.flow==="classic")return <ClassicLanding/>;
  return page;
}
