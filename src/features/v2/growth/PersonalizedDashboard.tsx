"use client";
import Link from "next/link";
import { ArrowRight, Leaf, Bookmark, Clock3, CalendarDays } from "lucide-react";
import { usePreview } from "../Provider";
import { activeCatalog, contentMode } from "../catalog";
import { initialFilters, recommend } from "../recommendations";
import { journeyScope, useJourney } from "./browser";
import { challenges, personalizedResult } from "./journey";
import { monthIn } from "../season";

export function useDashboardMatches(){
  const {state,cloud,clinicalGuidance}=usePreview();
  const j=useJourney(journeyScope(cloud.userId,cloud.selectedBabyId));
  return j.ready&&j.data.completed?personalizedResult(j.data,state,clinicalGuidance,cloud.connected).recipes:recommend(activeCatalog,{...initialFilters,months:state.stage},{mode:contentMode,favorites:state.favorites,introduced:state.introduced,used:state.uses.map(u=>u.recipeId),excludedIngredients:[],requiresClinicalGuidance:clinicalGuidance,month:monthIn()});
}
export function DashboardFocus(){
  const {cloud,state,clinicalGuidance}=usePreview();
  const j=useJourney(journeyScope(cloud.userId,cloud.selectedBabyId));
  if(!j.ready||!j.data.completed)return null;
  const d=j.data;
  const preparation=state.stage===0||clinicalGuidance||d.ageBand==="preparing"||["readiness","safety","serving","no-pressure"].includes(d.context||"");
  const planning=d.challenge==="planning"||d.context==="few-days";
  const Icon=preparation?Leaf:planning?CalendarDays:d.challenge==="time"?Clock3:Bookmark;
  return <section className="gw-dashboard-focus"><span className="gw-note-icon"><Icon size={25}/></span><div><p className="gw-eyebrow">UN PUNCT DE PORNIRE ALES DE TINE</p><h2>{preparation?"Mai întâi, un început liniștit.":planning?"Doar următoarele trei zile.":d.challenge==="time"?"Idei pentru puținul timp pe care îl ai.":d.challenge==="refusal"?"La masă, fără presiune.":"O idee de azi, păstrată pentru altă zi."}</h2><p>{challenges.find(c=>c.id===d.challenge)?.note}. Poți schimba direcția oricând.</p><div className="gw-focus-links"><Link href={preparation?"/v2/pregatire":planning?"/v2/plan":"/v2/onboarding"} className="v2-text-link">{preparation?"Resursele mele de început":planning?"Deschide planul meu":"Revino la ideile alese"}<ArrowRight size={16}/></Link><Link href="/v2/onboarding" className="v2-text-link">Schimbă preferințele</Link></div></div></section>;
}
