"use client";
// Local approval gallery for photo candidates. Recording a decision here only produces a file: the founder
// applies it with `node scripts/photo-import.cjs decide <file>`, then checks the commercial-use terms and runs
// `publish`. Nothing on this page publishes an image.
import { useEffect, useState } from "react";
import { findAnyRecipe } from "../catalog";
import { recipePhotos } from "../content/photos";
import { photoNotes } from "../content/photo-notes";
import { PageHeading, RecipePhoto } from "../components";

const KEY = "diversibebe:v2:photo-decisions";
const CHECKLIST = [
  "Toate ingredientele vizibile există în rețetă",
  "Textura corespunde etapei",
  "Forma de servire este sigură (nimic din lista interzisă)",
  "Porție de copil, nu de adult",
  "Fără text, logo, persoane sau mâini",
  "Arată ca mâncare gătită acasă, nu ca reclamă",
  "Fără detalii false (linguri deformate, boluri duble)",
];
type Decision = { decision: "" | "approved" | "rejected" | "regenerate"; checks: boolean[]; notes: string };
const empty = (): Decision => ({ decision: "", checks: CHECKLIST.map(() => false), notes: "" });
const recommendationLabel = { approve: "Recomand aprobarea", "approve-with-note": "Aprobare posibilă, cu observație", regenerate: "Recomand regenerarea" } as const;

export function PhotoGallery() {
  const ids = Object.keys(recipePhotos);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [reviewer, setReviewer] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (saved && typeof saved === "object") queueMicrotask(() => { setDecisions(saved.decisions ?? {}); setReviewer(saved.reviewer ?? ""); });
    } catch { /* Memory only. */ }
  }, []);
  const save = (next: Record<string, Decision>, name = reviewer) => {
    setDecisions(next);
    try { localStorage.setItem(KEY, JSON.stringify({ decisions: next, reviewer: name })); } catch { /* Memory only. */ }
  };
  const get = (id: string) => decisions[id] ?? empty();
  const update = (id: string, patch: Partial<Decision>) => save({ ...decisions, [id]: { ...get(id), ...patch } });
  const ready = ids.filter((id) => get(id).decision);
  function exportDecisions() {
    const payload = {
      reviewer: reviewer.trim(),
      decidedAt: new Date().toISOString(),
      decisions: ready.map((id) => ({ recipeId: id, sourceSha256: recipePhotos[id].sourceSha256, ...get(id), checklist: CHECKLIST.filter((_, i) => get(id).checks[i]) })),
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    link.download = `decizii-fotografii-${payload.decidedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <>
      <PageHeading eyebrow="FOTOGRAFII · APROBARE LOCALĂ" title="Galeria candidaților">
        {ids.length} imagini generate, afișate doar local. O decizie de aici nu publică nimic: exporți fișierul, îl aplici cu
        comanda de mai jos, verifici condițiile de utilizare comercială și abia apoi rulezi publicarea.
      </PageHeading>
      <section className="v2-photo-strip" aria-label="Coerența seriei">
        <h2>Seria, una lângă alta</h2>
        <div>
          {ids.map((id) => {
            const r = findAnyRecipe(id);
            return r ? <RecipePhoto key={id} recipe={{ ...r, photo: recipePhotos[id] }} /> : null;
          })}
        </div>
      </section>
      <ol className="v2-photo-gallery">
        {ids.map((id) => {
          const r = findAnyRecipe(id), asset = recipePhotos[id], note = photoNotes[id], d = get(id);
          if (!r) return null;
          return (
            <li key={id} className="v2-photo-item">
              <header>
                <h2>{r.name}</h2>
                <p>{r.age} · <code>{id}</code> · {asset.approved ? "aprobată" : "candidat"}</p>
              </header>
              <div className="v2-photo-compare">
                <figure><RecipePhoto recipe={{ ...r, photo: undefined, image: "/v2/icon.svg" }} /><figcaption>Înainte (imagine de rezervă)</figcaption></figure>
                <figure><RecipePhoto recipe={{ ...r, photo: asset }} /><figcaption>După · WebP {Object.entries(asset.bytes).map(([w, b]) => `${w}w ${Math.round(b / 1024)} KB`).join(" · ")}</figcaption></figure>
              </div>
              <a className="v2-text-link" href={`${asset.base}-1200.webp`} target="_blank" rel="noreferrer">Deschide la 1200 px</a>
              <div className="v2-photo-columns">
                <div>
                  <h3>Rețeta</h3>
                  <ul>{r.ingredients.map((l) => <li key={l}>{l}</li>)}</ul>
                  <p><strong>Cum se servește:</strong> {r.servingGuidance}</p>
                </div>
                {note && (
                  <div>
                    <h3>{recommendationLabel[note.recommendation]}</h3>
                    <ul>{note.matches.map((m) => <li key={m}>✓ {m}</li>)}</ul>
                    {note.concerns.length > 0 && <ul>{note.concerns.map((c) => <li key={c}>△ {c}</li>)}</ul>}
                    {note.promptFix && <p><strong>Dacă regenerezi:</strong> {note.promptFix}.</p>}
                  </div>
                )}
              </div>
              <fieldset className="v2-photo-checklist">
                <legend>Checklist (verificarea ta)</legend>
                {CHECKLIST.map((item, i) => (
                  <label key={item}>
                    <input type="checkbox" checked={d.checks[i] ?? false}
                      onChange={(e) => update(id, { checks: d.checks.map((v, j) => (j === i ? e.target.checked : v)) })} />
                    {item}
                  </label>
                ))}
              </fieldset>
              <div className="v2-photo-decision" role="group" aria-label={`Decizie pentru ${r.name}`}>
                {([["approved", "Aprob"], ["regenerate", "Regenerează"], ["rejected", "Resping"]] as const).map(([value, label]) => (
                  <button key={value} className="v2-button v2-button-secondary" aria-pressed={d.decision === value}
                    disabled={value === "approved" && d.checks.some((c) => !c)}
                    onClick={() => update(id, { decision: d.decision === value ? "" : value })}>{label}</button>
                ))}
              </div>
              {d.decision === "approved" || d.checks.every(Boolean) ? null : <p className="v2-field-note">„Aprob” devine activ după bifarea întregului checklist.</p>}
              <label className="v2-review-note-field">Observații
                <textarea maxLength={1000} value={d.notes} onChange={(e) => update(id, { notes: e.target.value })} />
              </label>
            </li>
          );
        })}
      </ol>
      <section className="v2-photo-export">
        <label>Numele tău (persoana care aprobă)
          <input value={reviewer} maxLength={80} onChange={(e) => { setReviewer(e.target.value); save(decisions, e.target.value); }} />
        </label>
        <button className="v2-button v2-button-primary" disabled={!ready.length || !reviewer.trim()} onClick={exportDecisions}>
          Exportă deciziile ({ready.length})
        </button>
        <p className="v2-field-note">
          Apoi, în terminal: <code>node scripts/photo-import.cjs decide decizii-fotografii-….json</code>. Pentru fiecare imagine aprobată
          completezi în manifest linkul condițiilor Google (<code>termsUrl</code>, <code>commercialUseTermsChecked</code>) și rulezi{" "}
          <code>node scripts/photo-import.cjs publish &lt;recipeId&gt;</code>.
        </p>
      </section>
    </>
  );
}
