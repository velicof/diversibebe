"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { nativeAuth } from "./config";
import { emptyState } from "../model";
import { journeyScope } from "../growth/browser";
import { cloudStore } from "./store";
import { usePreview } from "../Provider";
import { previewStore } from "../store";
import { LoadingState, PageHeading } from "../components";
import { emitGrowth, journeyStore } from "../growth/browser";
import { accountCopy, realAccounts } from "../content/copy";

const noSubscription = () => () => {};
const asksForNewAccount = () => new URLSearchParams(window.location.search).get("nou") === "1";

export function Account() {
  const { cloud, announce } = usePreview();
  const router = useRouter();
  // The invitation "Creează cont gratuit" opens straight on the signup form.
  const newAccount = useSyncExternalStore(noSubscription, asksForNewAccount, () => false);
  const [chosenMode,setMode]=useState<"login"|"signup"|"recover"|null>(null);
  const mode=chosenMode??(newAccount?"signup":"login");
  const [notice,setNotice]=useState("");
  const [stage,setStage]=useState(0);
  const local = useSyncExternalStore(previewStore.subscribe, previewStore.getSnapshot, previewStore.getServerSnapshot);
  const [pickedStage,setSignupStage]=useState("");
  // A stage the visitor chose is offered; the default of an untouched device is not, because it would be a guess about the child.
  const signupStage=pickedStage||(local.state.onboarded?String(local.state.stage):"");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [childLabel, setChildLabel] = useState("");
  const [imported, setImported] = useState(false);
  const [importNote, setImportNote] = useState("");
  const oauthStarted = useRef(false);
  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  // Typed or autofilled before the page became interactive: adopted now, or the next render would erase it.
  // In a layout effect, because the stores above re-render this form right after hydration.
  useLayoutEffect(() => {
    if (emailField.current?.value) setEmail(emailField.current.value);
    if (passwordField.current?.value) setPassword(passwordField.current.value);
  }, []);
  useEffect(() => {
    // Return from Google (PKCE): exchange the one-time code in the browser that started the sign-in.
    if (!realAccounts || oauthStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code && !params.get("error")) return;
    oauthStarted.current = true;
    window.history.replaceState(null, "", "/v2/cont");
    const pending = journeyStore.peekHandoff();
    void Promise.resolve()
      .then(async () => {
        if (!code) throw new Error(accountCopy.googleFailed);
        setBusy(true);
        await cloudStore.completeOAuth(code, pending);
        await transferPending();
        emitGrowth("login_completed");
        router.push(pending ? "/v2/onboarding?rezultat=1" : "/v2/azi");
      })
      .catch((e) => setError(e instanceof Error ? e.message : accountCopy.googleFailed))
      .finally(() => setBusy(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function transferPending(){
    const pending=journeyStore.peekHandoff();
    if(!nativeAuth || !pending)return;
    const current=cloudStore.getSnapshot();
    if(!current.selectedBabyId)throw new Error("Creează un profil pentru a asocia rezultatul.");
    await cloudStore.importIdeas({...emptyState,favorites:pending.resultIds});
    await cloudStore.saveJourney(pending);
    journeyStore.claimHandoff(journeyScope(current.userId,current.selectedBabyId));
  }
  if (cloud.loading && !cloud.connected) return <LoadingState />;
  if (cloud.connected)
    return (
      <>
        <PageHeading eyebrow={accountCopy.connectedEyebrow} title={accountCopy.connectedTitle}>
          {accountCopy.connectedIntro}
        </PageHeading>
        <section className="v2-profile-section v2-account-panel">
          <ShieldCheck size={24} />
          <h2>{accountCopy.connectedStatus}</h2>
          <p>{cloud.email}</p>
          <label htmlFor="v2-child">Profilul activ</label>
          <select
            id="v2-child"
            value={cloud.selectedBabyId ?? ""}
            disabled={busy || cloud.saving || cloud.loading}
            onChange={(e) => void cloudStore.selectChild(e.target.value)}
          >
            <option value="" disabled>
              Alege un profil
            </option>
            {cloud.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {(nativeAuth || cloud.children.length === 0) && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await cloudStore.createChild(childLabel, nativeAuth?stage:0);
                  setChildLabel("");
                } catch {
                  setError("Profilul nu a putut fi creat.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="v2-child-label">
                Etichetă opțională pentru profil
              </label>
              <input
                id="v2-child-label"
                maxLength={40}
                value={childLabel}
                onChange={(e) => setChildLabel(e.target.value)}
                placeholder="Copilul meu"
              />
              {nativeAuth&&<><label htmlFor="v2-new-stage">Etapa noului profil</label><select id="v2-new-stage" value={stage} onChange={e=>setStage(Number(e.target.value))}>{[0,6,8,10,12].map(n=><option key={n} value={n}>{n===0?"Pregătire":n+" luni sau mai mult"}</option>)}</select></>}
              <button disabled={busy} className="v2-button v2-button-primary">
                Creează profilul
              </button>
            </form>
          )}
          {nativeAuth&&cloud.selectedBabyId&&<ChildEditor key={cloud.selectedBabyId+cloud.state.stage+cloud.children.find(c=>c.id===cloud.selectedBabyId)?.label} label={cloud.children.find(c=>c.id===cloud.selectedBabyId)?.label??"Copilul meu"} stage={cloud.state.stage}/>}
          {nativeAuth&&journeyStore.hasHandoff()&&<button className="v2-button v2-button-primary" disabled={busy} onClick={async()=>{setBusy(true);try{await transferPending();router.push("/v2/onboarding?rezultat=1");}catch{setError("Rezultatul a rămas disponibil. Reîncearcă asocierea.");}finally{setBusy(false);}}}>Asociază rezultatul dinainte de cont</button>}
          <div className="v2-import-panel">
            <h3>Vrei să păstrezi ideile explorate fără cont?</h3>
            <p>
              Importul adaugă doar favoritele și zilele libere din plan. Nu
              înlocuiește planul din cont și nu importă confirmări, istoricul
              sau datele profilului. Copia locală rămâne disponibilă.
            </p>
            <button
              disabled={busy || imported || !cloud.selectedBabyId}
              className="v2-button v2-button-secondary"
              onClick={async () => {
                setBusy(true);
                try {
                  const done = await cloudStore.importIdeas(
                    previewStore.getSnapshot().state,
                  );
                  setImported(true);
                  setImportNote(`Am adăugat ${done.favorites} idei și ${done.plan} mese.${done.skipped ? ` ${done.skipped} nu se potrivesc etapei copilului din cont și nu s-au adăugat.` : ""}`);
                  announce(
                    "Ideile au fost importate fără înlocuirea planului existent.",
                  );
                } catch {
                  setError(
                    "Importul nu a fost finalizat. Poți relua fără dublare.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {imported ? "Idei importate" : "Importă favoritele și planul"}
            </button>
            {importNote && <p role="status">{importNote}</p>}
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="v2-action-row">
            <Link href="/v2/azi" className="v2-button v2-button-primary">
              Continuă în aplicație
              <ArrowRight size={16} />
            </Link>
            <button
              className="v2-button v2-button-secondary"
              onClick={async () => {
                const serverConfirmed = await cloudStore.logout();
                setMode("login");
                setMode("login");
                setPassword("");
                setImported(false);
                setImportNote("");
                setEmail("");
                setChildLabel("");
                setError("");
                announce(serverConfirmed ? accountCopy.signedOut : "Ai ieșit pe acest dispozitiv. Revocarea sesiunii pe server nu a putut fi confirmată.");
              }}
            >
              <LogOut size={16} />
              Deconectare
            </button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow={accountCopy.loginEyebrow}
        title={accountCopy.loginTitle}
      >
        {accountCopy.loginIntro}
        {process.env.NEXT_PUBLIC_V2_BACKEND_KIND === "contract-fixture" && " Acest test folosește PostgreSQL și o API compatibilă Supabase, cu autentificare sintetică. Serviciile Supabase complete nu sunt încă validate."}
      </PageHeading>
      {nativeAuth&&<div className="v2-action-row" aria-label="Operații cont"><button className="v2-button v2-button-secondary" aria-pressed={mode==="login"} onClick={()=>{setMode("login");setError("");setNotice("");}}>Am deja cont</button><button className="v2-button v2-button-secondary" aria-pressed={mode==="signup"} onClick={()=>{setMode("signup");setError("");setNotice("");}}>{accountCopy.signupButton}</button></div>}
      <form
        className="v2-profile-section v2-account-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            (mode!=="recover" && password.length < (mode==="signup"?8:6))
          ) {
            setError(accountCopy.invalidForm);
            return;
          }
          if(nativeAuth&&!realAccounts&&!/^[^\s@]+@example\.test$/i.test(email)){setError("Folosește o adresă sintetică @example.test, de exemplu demo-nou@example.test.");return;}
          setBusy(true);
          try {
            if(mode==="recover"){
              await cloudStore.recover(email);setNotice(accountCopy.recoverNotice);setPassword("");return;
            }
            emitGrowth(mode==="signup"?"signup_started":"login_started");
            const pending=journeyStore.peekHandoff();
            if(mode==="signup")await cloudStore.signup(email,password,pending,Number(signupStage)||0);else await cloudStore.login(email,password);
            await transferPending();
            emitGrowth(mode==="signup"?"signup_completed":"login_completed");
            setPassword("");
            router.push(pending ? "/v2/onboarding?rezultat=1" : "/v2/azi");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Conectarea nu a reușit.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="v2-email">{accountCopy.emailLabel}</label>
        <input
          id="v2-email"
          ref={emailField}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
        />
        {nativeAuth&&accountCopy.emailNote&&<p className="v2-field-note">{accountCopy.emailNote}</p>}
        {mode!=="recover"&&<><label htmlFor="v2-password">{accountCopy.passwordLabel}</label>
        <input
          id="v2-password"
          ref={passwordField}
          type="password"
          autoComplete={mode==="signup"?"new-password":"current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode==="signup"?8:6}
          maxLength={200}
        />
        </>}
        {mode==="signup"&&!journeyStore.peekHandoff()&&<><label htmlFor="v2-signup-stage">În ce etapă este copilul?</label>
        <select id="v2-signup-stage" required value={signupStage} onChange={(e)=>setSignupStage(e.target.value)}>
          <option value="" disabled>Alege etapa</option>
          <option value="0">Încă ne pregătim (sub 6 luni)</option>
          <option value="6">6–7 luni</option>
          <option value="8">8–9 luni</option>
          <option value="10">10–11 luni</option>
          <option value="12">12+ luni</option>
        </select>
        <p className="v2-field-note">Arătăm doar rețete potrivite etapei. O poți schimba oricând.</p>
        </>}
        {notice&&<p role="status">{notice}{!realAccounts&&<> <a href="http://127.0.0.1:54324" target="_blank" rel="noreferrer">Deschide emailurile locale</a></>}</p>}
        {error && (
          <p className="v2-alert" role="alert">
            {error}
          </p>
        )}
        {!cloud.available && (
          <p className="v2-field-note">
            {accountCopy.unavailable}
          </p>
        )}
        <button
          className="v2-button v2-button-primary v2-full-width"
          disabled={busy || !cloud.available}
        >
          {busy ? "Se procesează…" : mode==="signup"?"Creează și salvează în cont":mode==="recover"?"Trimite linkul de recuperare":accountCopy.submitLogin}
          <ArrowRight size={17} />
        </button>
        {nativeAuth&&<button type="button" className="v2-text-button" onClick={()=>{setMode("recover");setPassword("");setError("");}}>Am uitat parola</button>}
        {realAccounts&&mode!=="recover"&&<button type="button" className="v2-button v2-button-secondary v2-full-width" disabled={busy||!cloud.available} onClick={async()=>{setError("");setBusy(true);try{emitGrowth("login_started");await cloudStore.loginWithGoogle();}catch(e){setError(e instanceof Error?e.message:accountCopy.googleFailed);setBusy(false);}}}>{accountCopy.googleButton}</button>}
        <p className="v2-field-note">
          {accountCopy.passwordNote}
        </p>
        <Link href="/v2/idei" className="v2-text-link">
          Explorează fără cont
          <ArrowRight size={16} />
        </Link>
      </form>
    </>
  );
}

function ChildEditor({label,stage}:{label:string;stage:number}){
 const [name,setName]=useState(label),[age,setAge]=useState(stage),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 return <form className="v2-import-panel" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{await cloudStore.editChild(name,age);setMessage("Profil actualizat.");}catch{setMessage("Profilul nu a fost salvat. Reîncearcă.");}finally{setBusy(false);}}}><h3>Editează profilul activ</h3><label htmlFor="v2-edit-label">Eticheta profilului activ</label><input id="v2-edit-label" required maxLength={40} value={name} onChange={e=>setName(e.target.value)}/><label htmlFor="v2-edit-stage">Etapa profilului activ</label><select id="v2-edit-stage" value={age} onChange={e=>setAge(Number(e.target.value))}>{[0,6,8,10,12].map(n=><option key={n} value={n}>{n===0?"Pregătire":n+" luni sau mai mult"}</option>)}</select><button className="v2-button v2-button-secondary" disabled={busy}>Salvează profilul</button>{message&&<p role="status">{message}</p>}</form>;
}
