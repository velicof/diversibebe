"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {getV2Repository,nativeAuth} from "./client";
import {PageHeading} from "../components";
import {accountCopy} from "../content/copy";
export function Recovery(){
 const started=useRef(false),[ready,setReady]=useState(false),[password,setPassword]=useState(""),[error,setError]=useState(""),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{if(started.current)return;started.current=true;
 void Promise.resolve().then(async()=>{
 const code=new URLSearchParams(window.location.search).get("code");
 if(!nativeAuth||!code)throw new Error("invalid link");
 const repo=getV2Repository();if(!repo)throw new Error();const {error}=await repo.client.auth.exchangeCodeForSession(code);if(error)throw error;window.history.replaceState(null,"","/v2/recuperare");setReady(true);}).catch(()=>{setError("Linkul nu mai este valid sau a fost deschis în alt browser. Cere un link nou.");});
 },[]);
 return <><PageHeading eyebrow={accountCopy.recoveryEyebrow} title="Alege o parolă nouă">Linkul este utilizabil o singură dată, în browserul în care ai cerut recuperarea.</PageHeading><section className="v2-profile-section v2-account-panel">{error&&<p role="alert">{error}</p>}{done?<><p role="status">Parola a fost schimbată. Te poți conecta din nou.</p><Link href="/v2/cont" className="v2-button v2-button-primary">Mergi la cont</Link></>:ready?<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{const repo=getV2Repository();if(!repo)throw new Error();const {error}=await repo.client.auth.updateUser({password});if(error)throw error;setPassword("");await repo.client.auth.signOut({scope:"local"});setDone(true);}catch{setError("Parola nu a putut fi schimbată. Reîncearcă sau cere un link nou.");}finally{setBusy(false);}}}><label htmlFor="v2-new-password">Parola nouă</label><input id="v2-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy} className="v2-button v2-button-primary">Schimbă parola</button></form>:!error?<p role="status">Se verifică linkul…</p>:<Link href="/v2/cont">Cere alt link</Link>}</section></>;
}
