"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import {
  addManualAllergy,
  getAllergies,
  getAllFoods,
  removeAllergy,
  type AllergyRecord,
} from "../lib/store";
import type { FoodCatalogItem } from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

const MANUAL_SYMPTOMS = [
  "Roșeață",
  "Erupție",
  "Vărsături",
  "Diaree",
  "Umflături",
];

function formatAllergyDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ro-RO");
}

function severityFromSymptoms(symptoms: string[]): AllergyRecord["severity"] {
  return symptoms.includes("Erupție") || symptoms.includes("Vărsături")
    ? "sever"
    : "usor";
}

export default function AlergiiPage() {
  const router = useRouter();
  const storeVersion = useStoreRefresh();
  const allergies = useMemo(() => getAllergies(), [storeVersion]);
  const foods = useMemo(() => getAllFoods(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<FoodCatalogItem | null>(null);
  const [symSel, setSymSel] = useState<string[]>([]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods.slice(0, 8);
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 12);
  }, [foods, search]);

  const openModal = () => {
    setModalOpen(true);
    setSearch("");
    setPicked(null);
    setSymSel([]);
  };

  const toggleSym = (s: string) => {
    setSymSel((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const saveManual = () => {
    if (!picked || symSel.length === 0) return;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    addManualAllergy({
      foodId: picked.id,
      foodName: picked.name,
      emoji: picked.emoji,
      symptoms: symSel,
      firstDate: `${y}-${m}-${d}`,
      severity: severityFromSymptoms(symSel),
    });
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        key={storeVersion}
        className="w-full max-w-[393px] px-6 pb-[128px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="cursor-pointer leading-none"
            style={{
              color: "#D4849A",
              fontSize: 20,
              padding: 8,
              background: "none",
              border: "none",
            }}
            aria-label="Înapoi"
          >
            ←
          </button>
          <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
            Jurnal alergii 🛡️
          </h1>
          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            Alergii detectate automat sau adăugate manual
          </p>
        </header>

        <button
          type="button"
          onClick={openModal}
          className="mt-5 w-full rounded-[16px] border-2 border-[#F4B4C4] bg-transparent py-3.5 text-[14px] font-semibold text-[#D4849A] cursor-pointer"
        >
          + Adaugă alergie manual
        </button>

        {allergies.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-[18px] font-bold text-[#3D2C3E]">
              ✅ Nu au fost detectate alergii
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[#8B7A8E]">
              Alergiile sunt detectate automat când jurnalizezi simptome.
            </p>
          </div>
        ) : (
          <section className="mt-6 flex flex-col gap-3">
            {allergies.map((a) => {
              const sev = a.severity === "sever";
              return (
                <div
                  key={a.foodId}
                  className="flex gap-3 rounded-[16px] border border-[#EDE7F6] bg-white p-4"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                >
                  <div className="text-[32px] leading-none">{a.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[15px] font-bold text-[#3D2C3E]">
                        {a.foodName}
                      </p>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: sev ? "#FFE5E5" : "#FFF3CD",
                          color: sev ? "#C0392B" : "#8A6A16",
                        }}
                      >
                        {sev ? "Sever" : "Ușor"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8B7A8E]">
                      Prima dată: {formatAllergyDate(a.firstDate)}
                    </p>
                    <p className="mt-2 text-[12px] text-[#3D2C3E]">
                      {a.symptoms.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 self-start text-[18px] cursor-pointer"
                    aria-label="Elimină"
                    onClick={() => removeAllergy(a.foodId)}
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 pb-8 pt-12"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-[393px] max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-white p-5"
            style={{ fontFamily: '"Nunito", sans-serif' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="allergy-modal-title"
          >
            <p
              id="allergy-modal-title"
              className="text-[16px] font-bold text-[#3D2C3E]"
            >
              Adaugă alergie manual
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută aliment..."
              className="mt-3 w-full rounded-[12px] px-3 py-2.5 text-[14px] outline-none"
              style={{ backgroundColor: "#F5F0F8" }}
            />
            <div className="mt-2 flex max-h-[140px] flex-col gap-1 overflow-y-auto">
              {filteredFoods.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPicked(f)}
                  className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-[13px] cursor-pointer"
                  style={{
                    backgroundColor: picked?.id === f.id ? "#E8F8F5" : "transparent",
                  }}
                >
                  <span>{f.emoji}</span>
                  <span className="font-semibold text-[#3D2C3E]">{f.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[13px] font-semibold text-[#3D2C3E]">
              Simptome
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MANUAL_SYMPTOMS.map((s) => {
                const on = symSel.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSym(s)}
                    className="rounded-full border px-3 py-1.5 text-[11px] font-semibold cursor-pointer"
                    style={{
                      borderColor: on ? "#E74C3C" : "#EDE7F6",
                      background: on ? "#FFE5E5" : "#F5F0F8",
                      color: on ? "#E74C3C" : "#8B7A8E",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full border border-[#EDE7F6] py-2.5 text-[14px] font-semibold text-[#8B7A8E] cursor-pointer"
                onClick={() => setModalOpen(false)}
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={!picked || symSel.length === 0}
                className={`flex-1 rounded-full py-2.5 text-[14px] font-bold text-white ${
                  picked && symSel.length > 0
                    ? "cursor-pointer bg-[#D4849A]"
                    : "cursor-not-allowed bg-[#D4849A] opacity-50"
                }`}
                onClick={saveManual}
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Navbar activeTab="alergii" />
    </div>
  );
}
