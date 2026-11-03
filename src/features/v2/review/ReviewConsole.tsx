"use client";
// Specialist and founder review of the WHOLE library (every status). Recipe content only: no account, no
// family data. Viewing or annotating here is never an approval: approvals come only from the signed sheet
// exported below, transcribed into content/editorial.ts (hasClinicalReview rejects AI reviewers).
import { useEffect, useMemo, useState } from "react";
import { reviewCatalog, type Recipe } from "../catalog";
import { editorialStatusLabels, type EditorialStatus } from "../review";
import { EU_ALLERGENS } from "../content/safety";
import Link from "next/link";
import { PageHeading } from "../components";

const NOTES_KEY = "diversibebe:v2:review-notes";
const MEALS: Record<string, string> = { "mic-dejun": "Mic dejun", pranz: "Prânz", cina: "Cină", gustare: "Gustare" };
type Risk = "all" | "blocking" | "corrected" | "warnings" | "clean";

const riskOf = (r: Recipe) => ({
  blocking: r.editorialStatus === "needs_specialist_review",
  corrected: r.corrections.length > 0 || r.allergenChanges.added.length > 0,
  warnings: r.safetyFlags.some((f) => f.severity === "warning"),
});

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " | ");
  return /[",;|]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function ReviewConsole() {
  const [status, setStatus] = useState<EditorialStatus | "all">("all");
  const [risk, setRisk] = useState<Risk>("all");
  const [meal, setMeal] = useState("all");
  const [age, setAge] = useState(0);
  const [allergen, setAllergen] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}");
      if (saved && typeof saved === "object") queueMicrotask(() => setNotes(saved));
    } catch { /* Notes stay in memory only. */ }
  }, []);
  const saveNote = (id: string, value: string) => {
    setNotes((old) => {
      const next = { ...old, [id]: value };
      try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch { /* Memory only. */ }
      return next;
    });
  };
  const counts = useMemo(() => {
    const byStatus = reviewCatalog.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.editorialStatus]: (acc[r.editorialStatus] ?? 0) + 1 }), {});
    return { byStatus, published: reviewCatalog.filter((r) => r.published).length };
  }, []);
  const q = query.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const rows = reviewCatalog.filter((r) => {
    const k = riskOf(r);
    if (status !== "all" && r.editorialStatus !== status) return false;
    if (risk === "blocking" && !k.blocking) return false;
    if (risk === "corrected" && !k.corrected) return false;
    if (risk === "warnings" && !k.warnings) return false;
    if (risk === "clean" && (k.blocking || k.corrected || k.warnings)) return false;
    if (meal !== "all" && r.mealType !== meal) return false;
    if (age && r.minimumMonths !== age) return false;
    if (allergen !== "all" && !r.allergens.includes(allergen as never)) return false;
    return !q || `${r.id} ${r.name} ${r.ingredients.join(" ")}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q);
  });
  function exportBatch() {
    const batch = selected.length ? reviewCatalog.filter((r) => selected.includes(r.id)) : rows;
    const header = ["recipe_id", "nume", "moment", "varsta_orientativa", "status_editorial", "publicata", "alergeni_UE", "forma_servire", "riscuri_si_avertismente", "corecturi_aplicate", "surse", "ingrediente", "pasi", "observatii_consultare", "DECIZIE (aprobat / modificari / respins)", "observatii_specialist", "nume_specialist", "calificare_si_cod", "data", "semnatura"];
    const lines = batch.map((r) => [
      r.id, r.name, MEALS[r.mealType], r.age, editorialStatusLabels[r.editorialStatus], r.published ? "da" : "nu", r.allergens.join(", "), r.servingGuidance,
      [r.specialistNote, ...r.safetyFlags.map((f) => `${f.severity === "blocking" ? "BLOCANT" : "avertisment"}: ${f.message}`)].filter(Boolean).join(" ; "),
      r.corrections.map((c) => `${c.before || "(nou)"} → ${c.after || "(eliminat)"}`).join(" ; "),
      [...new Set([...r.safetyFlags.map((f) => f.source), ...r.corrections.map((c) => c.source)].filter(Boolean))].join(" "),
      r.ingredients.join(" ; "), r.steps.join(" ; "), notes[r.id] ?? "", "", "", "", "", "", "",
    ].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `diversibebe-lot-revizie-${new Date().toISOString().slice(0, 10)}-${batch.length}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <>
      <PageHeading eyebrow="REVIZIE DE SPECIALITATE · FĂRĂ DATE DESPRE FAMILII" title="Biblioteca completă">
        Toate cele {reviewCatalog.length} rețete, indiferent de status. Consultarea și notițele de aici nu reprezintă o
        aprobare: aprobarea se înregistrează numai prin foaia exportată, completată și semnată de specialist.
      </PageHeading>
      <Link className="v2-text-link" href="/v2/revizie/fotografii">Fotografii candidate: galeria de aprobare →</Link>
      <section className="v2-review-summary" aria-label="Rezumat">
        <span><strong>{reviewCatalog.length}</strong> rețete</span>
        <span><strong>{counts.published}</strong> publicabile editorial</span>
        {(Object.keys(editorialStatusLabels) as EditorialStatus[]).map((s) => (
          <span key={s}><strong>{counts.byStatus[s] ?? 0}</strong> {editorialStatusLabels[s].toLowerCase()}</span>
        ))}
      </section>
      <section className="v2-review-filters" aria-label="Filtre revizie">
        <label>Caută<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nume, ID sau ingredient" /></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as EditorialStatus | "all")}>
          <option value="all">Toate</option>
          {(Object.keys(editorialStatusLabels) as EditorialStatus[]).map((s) => <option key={s} value={s}>{editorialStatusLabels[s]}</option>)}
        </select></label>
        <label>Risc<select value={risk} onChange={(e) => setRisk(e.target.value as Risk)}>
          <option value="all">Toate</option>
          <option value="blocking">Necesită verificare (nepublicate)</option>
          <option value="corrected">Corectate editorial</option>
          <option value="warnings">Cu avertismente de servire</option>
          <option value="clean">Fără semnale</option>
        </select></label>
        <label>Moment<select value={meal} onChange={(e) => setMeal(e.target.value)}>
          <option value="all">Toate</option>
          {Object.entries(MEALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Vârstă<select value={age} onChange={(e) => setAge(Number(e.target.value))}>
          <option value={0}>Toate</option>
          {[6, 7, 8, 10, 12].map((m) => <option key={m} value={m}>{m}+ luni</option>)}
        </select></label>
        <label>Alergen<select value={allergen} onChange={(e) => setAllergen(e.target.value)}>
          <option value="all">Toți</option>
          {EU_ALLERGENS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select></label>
      </section>
      <div className="v2-review-actions">
        <p aria-live="polite">{rows.length} rețete afișate · {selected.length} selectate pentru lot</p>
        <button className="v2-button v2-button-secondary" onClick={() => setSelected(rows.map((r) => r.id))}>Selectează toate afișate</button>
        <button className="v2-button v2-button-secondary" onClick={() => setSelected([])} disabled={!selected.length}>Golește selecția</button>
        <button className="v2-button v2-button-primary" onClick={exportBatch} disabled={!rows.length && !selected.length}>
          Exportă lotul (CSV, {selected.length || rows.length})
        </button>
      </div>
      <ol className="v2-review-list">
        {rows.map((r) => (
          <li key={r.id} className={`v2-review-item v2-review-${r.editorialStatus}`}>
            <input type="checkbox" className="v2-review-select" aria-label={`Include ${r.name} în lot`} checked={selected.includes(r.id)}
              onChange={() => setSelected((old) => old.includes(r.id) ? old.filter((id) => id !== r.id) : [...old, r.id])} />
            <details>
              <summary>
                <span className="v2-review-name">{r.name}</span>
                <span className="v2-review-meta">{MEALS[r.mealType]} · {r.age} · {r.allergens.join(", ") || "fără alergeni UE"}</span>
                <span className="v2-review-status">{editorialStatusLabels[r.editorialStatus]}{r.published ? "" : " · nepublicată"}</span>
              </summary>
              <div className="v2-review-body">
                <p className="v2-review-id">ID: {r.id}{r.legacyId ? ` (V1: ${r.legacyId})` : ""} · {r.time} · {r.servings} porții · {r.difficulty}</p>
                {r.specialistNote && <p className="v2-alert" role="note">{r.specialistNote}</p>}
                <h3>Ingrediente</h3>
                <ul>{r.ingredients.map((l, i) => <li key={i}>{l}</li>)}</ul>
                <h3>Pași</h3>
                <ol>{r.steps.map((l, i) => <li key={i}>{l}</li>)}</ol>
                <h3>Textură și formă de servire (orientativ)</h3>
                <p>{r.servingGuidance}</p>
                <h3>Riscuri identificate</h3>
                {r.safetyFlags.length ? (
                  <ul>{r.safetyFlags.map((f) => (
                    <li key={f.id}>{f.severity === "blocking" ? "BLOCANT: " : ""}{f.message}{f.source && <> — <a href={f.source} target="_blank" rel="noreferrer">sursă</a></>}</li>
                  ))}</ul>
                ) : <p>Niciun semnal al regulilor automate.</p>}
                {(r.corrections.length > 0 || r.allergenChanges.added.length > 0) && (
                  <>
                    <h3>Corecturi editoriale</h3>
                    <ul>
                      {r.corrections.map((c, i) => (
                        <li key={i}><del>{c.before}</del> → <ins>{c.after || "(eliminat)"}</ins> · {c.reason} — <a href={c.source} target="_blank" rel="noreferrer">sursă</a></li>
                      ))}
                      {r.allergenChanges.added.length > 0 && <li>Alergeni adăugați din ingrediente: {r.allergenChanges.added.join(", ")}</li>}
                    </ul>
                  </>
                )}
                <label className="v2-review-note-field">Observații (rămân pe acest dispozitiv; intră în export)
                  <textarea value={notes[r.id] ?? ""} maxLength={2000} onChange={(e) => saveNote(r.id, e.target.value)} />
                </label>
              </div>
            </details>
          </li>
        ))}
      </ol>
    </>
  );
}
