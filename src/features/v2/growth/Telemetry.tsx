"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePreview } from "../Provider";
import { emitGrowth, recordVisit, useExperiment } from "./browser";
import { activeCatalog, contentMode } from "../catalog";
import { initialFilters, recommend } from "../recommendations";

export function GrowthTelemetry(){
  const path=usePathname();
  const {state,ready,cloud}=usePreview();
  const experiment=useExperiment();
  const previous=useRef<{owner:string;ids:string[]}|null>(null);
  useEffect(()=>{
    if(!experiment.ready)return;
    recordVisit(path==="/v2");
    if(path.startsWith("/v2/retete/"))emitGrowth("recipe_opened",{},path);
  },[path,experiment.ready]);
  useEffect(()=>{
    if(path!=="/v2/azi"||!ready||!experiment.ready||experiment.flow!=="classic")return;
    const count=recommend(activeCatalog,{...initialFilters,months:state.stage},{mode:contentMode,favorites:[],introduced:[],used:[],excludedIngredients:[],requiresClinicalGuidance:false}).length;
    emitGrowth("personalized_result_viewed",{flow:"classic",count,valueKind:count?"demo":"empty"},"classic-result");
  },[path,ready,experiment.ready,experiment.flow,state.stage]);
  useEffect(()=>{
    if(!ready)return;
    const owner=cloud.userId||"guest";
    if(previous.current?.owner===owner){for(const id of state.favorites)if(!previous.current.ids.includes(id))emitGrowth("recipe_saved",{},`saved:${id}`);}
    previous.current={owner,ids:[...state.favorites]};
  },[state.favorites,ready,cloud.userId]);
  return null;
}
