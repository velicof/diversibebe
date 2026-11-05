"use client";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { catalog } from "../catalog";
import { accountCopy } from "../content/copy";
import { nextDays } from "../planning";
import { usePreview } from "../Provider";
import { previewStore } from "../store";
import { importableFromGuest } from "./guest-import";
import { cloudStore } from "./store";

const DISMISSED_KEY = "diversibebe:v2:guest-import-dismissed";
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const notSuited = (count: number) => `${plural(count, "alegere nu se potrivește", "alegeri nu se potrivesc")} etapei copilului din cont și nu se adaugă.`;

/** Connecting must not look like losing what a visitor saved: the account offers to take it, explicitly. */
export function GuestImportPrompt() {
  const { cloud } = usePreview();
  const pathname = usePathname();
  const local = useSyncExternalStore(previewStore.subscribe, previewStore.getSnapshot, previewStore.getServerSnapshot);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [failed, setFailed] = useState(false);
  if (!cloud.connected || !cloud.selectedBabyId || cloud.loading || !local.ready || dismissed || pathname === "/v2/cont") return null;
  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* Storage unavailable: the answer lasts until the next reload. */
    }
    setDismissed(true);
  };
  const pending = importableFromGuest(local.state, cloud.state, cloud.requiresClinicalGuidance, catalog, nextDays(new Date())[0].key);
  if (result)
    return (
      <div className="v2-guest-import" role="status">
        <p>{result}</p>
        <button type="button" className="v2-text-button" onClick={() => { setResult(""); dismiss(); }}>Am înțeles</button>
      </div>
    );
  if (!pending.favorites.length && !pending.plan.length) {
    // Everything was left out: say why, or the plan made as a visitor seems to have vanished.
    if (!pending.skipped) return null;
    return (
      <section className="v2-guest-import" aria-label="Alegerile de pe acest dispozitiv">
        <p>
          <strong>{notSuited(pending.skipped)}</strong> Rămân pe acest dispozitiv, neschimbate.
        </p>
        <button type="button" className="v2-text-button" onClick={dismiss}>Am înțeles</button>
      </section>
    );
  }
  const parts = [
    pending.favorites.length ? plural(pending.favorites.length, "idee salvată", "idei salvate") : "",
    pending.plan.length ? plural(pending.plan.length, "masă planificată", "mese planificate") : "",
  ].filter(Boolean);
  return (
    <section className="v2-guest-import" aria-label="Alegerile de pe acest dispozitiv">
      <p>
        <strong>Ai pe acest dispozitiv {parts.join(" și ")}.</strong> {accountCopy.guestImportQuestion}
        {pending.skipped > 0 && ` ${notSuited(pending.skipped)}`}
        {pending.kept > 0 && ` ${plural(pending.kept, "zi are", "zile au")} deja o masă în cont și ${pending.kept === 1 ? "rămâne neschimbată" : "rămân neschimbate"}.`}
      </p>
      {failed && <p role="alert">Nu am putut adăuga totul. Datele de pe acest dispozitiv au rămas neschimbate; reîncearcă.</p>}
      <div className="v2-action-row">
        <button
          type="button"
          className="v2-button v2-button-primary"
          disabled={busy || cloud.saving}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              const done = await cloudStore.importIdeas(local.state);
              const added = [
                done.favorites ? plural(done.favorites, "idee", "idei") : "",
                done.plan ? plural(done.plan, "masă", "mese") : "",
              ].filter(Boolean);
              setResult(added.length ? `Am adăugat în cont ${added.join(" și ")}.` : "Contul avea deja aceste alegeri.");
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Se adaugă…" : "Adaugă în cont"}
        </button>
        <button type="button" className="v2-button v2-button-secondary" disabled={busy} onClick={dismiss}>
          Nu acum
        </button>
      </div>
    </section>
  );
}
