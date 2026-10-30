"use client";
import { useEffect, useSyncExternalStore } from "react";
import { newJourney, readJourney, type Journey } from "./journey";
import { readExperiment, sanitizeFunnelProperties, type Experiment, type FunnelEvent, type FunnelName } from "./funnel";

const listeners=new Set<()=>void>();
const notify=()=>{for(const f of listeners)f();};
const subscribe=(f:()=>void)=>{listeners.add(f);return()=>{listeners.delete(f);};};
const emptyJourney=newJourney("00000000-0000-4000-8000-000000000000",1);
type Snapshot={ready:boolean;storageError:boolean;data:Journey};
const initial:Snapshot={ready:false,storageError:false,data:emptyJourney};
const snapshots=new Map<string,Snapshot>();
const key=(scope:string)=>`diversibebe:v2:journey:1:${scope}`;
const pendingKey="diversibebe:v2:journey-handoff:1";
export function journeyScope(user:string|null,child:string|null) {return user?`account:${user}:${child??"none"}`:"guest";}
export const journeyStore={
  get:(scope:string)=>snapshots.get(scope)??initial,
  hydrate(scope:string){
    if(this.get(scope).ready)return;
    const fallback=newJourney(crypto.randomUUID(),Date.now());
    try {snapshots.set(scope,{ready:true,storageError:false,data:readJourney(localStorage.getItem(key(scope)),fallback)});}
    catch {snapshots.set(scope,{ready:true,storageError:true,data:fallback});}
    notify();
  },
  update(scope:string,patch:Partial<Journey>){
    const old=this.get(scope);const data=readJourney(JSON.stringify({...old.data,...patch}),old.data);
    let storageError=old.storageError;
    try{localStorage.setItem(key(scope),JSON.stringify(data));}catch{storageError=true;}
    snapshots.set(scope,{ready:true,data,storageError});notify();
  },
  restart(scope:string){this.update(scope,newJourney(crypto.randomUUID(),Date.now()));},
  prepareHandoff(scope:string){
    try{sessionStorage.setItem(pendingKey,JSON.stringify({at:Date.now(),data:this.get(scope).data}));return true;}catch{return false;}
  },
  hasHandoff(){try{const v=JSON.parse(sessionStorage.getItem(pendingKey)||"null");return Boolean(v && Date.now()-v.at<3600000 && v.data?.completed);}catch{return false;}},
  claimHandoff(scope:string){
    if(scope==="guest"||!this.hasHandoff())return;
    try{const v=JSON.parse(sessionStorage.getItem(pendingKey)!);sessionStorage.removeItem(pendingKey);this.update(scope,v.data);}catch{/* Remain in the current, isolated journey. */}
  },
};
export function useJourney(scope:string){
  const value=useSyncExternalStore(subscribe,()=>journeyStore.get(scope),()=>initial);
  useEffect(()=>{journeyStore.hydrate(scope);},[scope]);
  return value;
}
const experimentInitial:Experiment&{ready:boolean}={message:"B",flow:"guided",ready:false};
let experiment=experimentInitial;
let experimentSearch="";
export function useExperiment(){
  const value=useSyncExternalStore(subscribe,()=>experiment,()=>experimentInitial);
  useEffect(()=>{
    if(experimentSearch===window.location.search && experiment!==experimentInitial)return;
    experimentSearch=window.location.search;
    const requested=readExperiment(experimentSearch);
    try{
      const params=new URLSearchParams(experimentSearch);
      if(params.has("parcurs")||params.has("mesaj"))sessionStorage.setItem("diversibebe:v2:experiment:1",JSON.stringify(requested));
      const stored=JSON.parse(sessionStorage.getItem("diversibebe:v2:experiment:1")||"null");
      experiment={...(stored?readExperiment(`?mesaj=${stored.message}&parcurs=${stored.flow==="classic"?"clasic":"nou"}`):requested),ready:true};
    }catch{experiment={...requested,ready:true};}
    notify();
  },[]);
  return value;
}
const funnelKey="diversibebe:v2:growth-funnel:test:1";
let fallbackEvents:FunnelEvent[]=[];
const memoryDedupe=new Set<string>();
let visitId="";
function eventLog():FunnelEvent[]{try{const v=JSON.parse(localStorage.getItem(funnelKey)||"[]");return Array.isArray(v)?v.slice(-500):[];}catch{return fallbackEvents;}}
export function emitGrowth(name:FunnelName,properties:Record<string,unknown>={},dedupe?:string,journey:string|null=null){
  if(typeof window==="undefined")return;
  const now=Date.now();
  try{
    const last=Number(sessionStorage.getItem("diversibebe:v2:visit-last")||0);
    if(!visitId || now-last>1800000){
      visitId=now-last<=1800000?sessionStorage.getItem("diversibebe:v2:visit-id")||crypto.randomUUID():crypto.randomUUID();
      sessionStorage.setItem("diversibebe:v2:visit-id",visitId);
    }
    sessionStorage.setItem("diversibebe:v2:visit-last",String(now));
  }catch{if(!visitId)visitId=crypto.randomUUID();}
  const dedupeKey=dedupe?`${visitId}:${journey||"visit"}:${name}:${dedupe}`:null;
  const seenKey="diversibebe:v2:funnel-dedupe:1";
  let seen:string[]=[];
  try{const v=JSON.parse(sessionStorage.getItem(seenKey)||"[]");if(Array.isArray(v))seen=v.filter(x=>typeof x==="string").slice(-500);}catch{/* Use in-memory deduplication. */}
  if(dedupeKey && (memoryDedupe.has(dedupeKey)||seen.includes(dedupeKey)))return;
  const event:FunnelEvent={id:crypto.randomUUID(),name,at:new Date(now).toISOString(),visit:visitId,journey,properties:sanitizeFunnelProperties({...experiment,...properties})};
  const events=[...eventLog(),event].slice(-500);fallbackEvents=events;
  try{localStorage.setItem(funnelKey,JSON.stringify(events));}catch{/* Test-only diagnostics stay in memory when storage is blocked. */}
  if(dedupeKey){memoryDedupe.add(dedupeKey);try{sessionStorage.setItem(seenKey,JSON.stringify([...seen,dedupeKey].slice(-500)));}catch{/* Memory fallback. */}}
}
export function recordVisit(homepage=false){
  const visitKey="diversibebe:v2:last-visit:1";
  try{
    const previous=JSON.parse(localStorage.getItem(visitKey)||"null");
    if(homepage)emitGrowth("homepage_view",{},"homepage");
    if(previous && Date.now()-previous.at>=1800000){
      emitGrowth("return_visit",{daysSinceLastVisit:Math.floor((Date.now()-previous.at)/86400000)},"return");
    }
    localStorage.setItem(visitKey,JSON.stringify({at:Date.now()}));
  }catch{if(homepage)emitGrowth("homepage_view",{},"homepage");}
}
