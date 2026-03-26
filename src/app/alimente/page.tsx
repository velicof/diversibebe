"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import {
  getAllFoods,
  getFoodStatus,
  getFoodStatusMeta,
  getFoodsByAgeGroup,
} from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";
import { getCurrentBaby, getCurrentUserId, listTriedFoods } from "../lib/supabaseData";

type AgeTabId = "all" | "4-6" | "6-8" | "8-10" | "10-12" | "12+";

type CategoryId =
  | "all"
  | "legume"
  | "fructe"
  | "proteine"
  | "cereale"
  | "grasimi"
  | "condimente";

const AGE_TABS: Array<{ id: AgeTabId; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "4-6", label: "4-6 luni" },
  { id: "6-8", label: "6-8 luni" },
  { id: "8-10", label: "8-10 luni" },
  { id: "10-12", label: "10-12 luni" },
  { id: "12+", label: "12+ luni" },
];

const CATEGORY_TABS: Array<{ id: CategoryId; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "legume", label: "Legume 🥬" },
  { id: "fructe", label: "Fructe 🍎" },
  { id: "proteine", label: "Proteine 🥩" },
  { id: "cereale", label: "Cereale 🌾" },
  { id: "grasimi", label: "Grăsimi 🫒" },
  { id: "condimente", label: "Condimente 🌿" },
];

const AGE_TAB_IDS = new Set<string>([
  "all",
  "4-6",
  "6-8",
  "8-10",
  "10-12",
  "12+",
]);

function normalizeForSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function AlimentePageInner() {
  const storeVersion = useStoreRefresh();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AgeTabId>("4-6");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [triedIds, setTriedIds] = useState<string[]>([]);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  const groupFromUrl = searchParams.get("group");
  const triedOnly = searchParams.get("filter") === "incercate";

  useEffect(() => {
    if (groupFromUrl && AGE_TAB_IDS.has(groupFromUrl)) {
      setActiveTab(groupFromUrl as AgeTabId);
    }
  }, [groupFromUrl]);

  useEffect(() => {
    if (groupFromUrl && AGE_TAB_IDS.has(groupFromUrl)) return;
    void (async () => {
      const baby = await getCurrentBaby();
      const d = baby?.birthdate ? new Date(baby.birthdate) : null;
      const ageMonths =
        d && !Number.isNaN(d.getTime())
          ? Math.floor(
              (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            )
          : 0;
      let tab: AgeTabId = "12+";
      if (ageMonths < 6) tab = "4-6";
      else if (ageMonths < 8) tab = "6-8";
      else if (ageMonths < 10) tab = "8-10";
      else if (ageMonths < 12) tab = "10-12";
      else tab = "12+";
      setActiveTab(tab);
    })();
  }, [groupFromUrl, storeVersion]);

  useEffect(() => {
    void (async () => {
      const uid = await getCurrentUserId();
      if (!uid) {
        setIsAuthed(false);
        setTriedIds([]);
        return;
      }
      setIsAuthed(true);
      const tried = await listTriedFoods();
      setTriedIds(tried.map((t) => t.food_id));
    })();
  }, [storeVersion]);

  const foodsInAgeGroup = useMemo(() => {
    if (activeTab === "all") return getAllFoods();
    if (activeTab === "12+") return getFoodsByAgeGroup("10-12");
    return getFoodsByAgeGroup(activeTab);
  }, [activeTab]);
  const foodsByCategory = useMemo(() => {
    if (activeCategory === "all") return foodsInAgeGroup;
    return foodsInAgeGroup.filter((f) => f.category === activeCategory);
  }, [activeCategory, foodsInAgeGroup]);

  const searchTrim = searchQuery.trim();
  const foods = useMemo(() => {
    let list: ReturnType<typeof getAllFoods>;
    if (!searchTrim) list = foodsByCategory;
    else {
      const q = normalizeForSearch(searchTrim);
      list = getAllFoods().filter((f) => normalizeForSearch(f.name).includes(q));
    }
    if (!triedOnly) return list;
    const ids = new Set(triedIds);
    return list.filter((f) => ids.has(f.id));
  }, [foodsByCategory, searchTrim, triedOnly, triedIds]);

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center transition-colors">
      <main className="w-full max-w-[393px] px-6 pb-[128px]">
        <header className="pt-6">
          {triedOnly ? (
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-[14px] font-bold text-[#D4849A]"
            >
              ← Înapoi
            </Link>
          ) : null}
          <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
            {triedOnly ? "Alimente încercate 🥄" : "Calendarul alimentar 🥄"}
          </h1>
          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            {triedOnly
              ? "Doar alimentele deja încercate și jurnalizate pentru bebeluș"
              : "Alimente recomandate pe grupe de vârstă"}
          </p>
          {triedOnly ? (
            <Link
              href="/alimente"
              className="mt-3 inline-block text-[13px] font-bold text-[#D4849A]"
            >
              ← Vezi tot calendarul alimentar
            </Link>
          ) : null}
        </header>

        <div className="relative mt-5 w-full">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Caută un aliment..."
            className="w-full h-[44px] rounded-[16px] border border-[#EDE7F6] bg-white pl-4 pr-11 text-[14px] text-[#3D2C3E] outline-none focus:border-[#D4849A] placeholder:text-[#B8A9BB]"
            style={{ fontFamily: '"Nunito", sans-serif' }}
            autoComplete="off"
            aria-label="Caută un aliment"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#8B7A8E] text-lg font-semibold leading-none cursor-pointer rounded-full hover:bg-[#FFF8F6]"
              aria-label="Șterge căutarea"
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <div className="flex gap-[8px] overflow-x-auto pb-1">
            {AGE_TABS.map((t) => {
              const isActive = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className="cursor-pointer whitespace-nowrap font-bold text-[14px] leading-none px-4 py-[8px] rounded-full transition-colors"
                  style={
                    isActive
                      ? { background: "#A8DCD1", color: "#FFFFFF" }
                      : {
                          background: "#FFFFFF",
                          color: "#8B7A8E",
                          border: "1px solid #EDE7F6",
                        }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex gap-[8px] overflow-x-auto pb-1">
            {CATEGORY_TABS.map((t) => {
              const isActive = t.id === activeCategory;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveCategory(t.id)}
                  className="cursor-pointer whitespace-nowrap font-bold text-[14px] leading-none px-4 py-[8px] rounded-full transition-colors"
                  style={
                    isActive
                      ? { background: "#A8DCD1", color: "#FFFFFF" }
                      : {
                          background: "#FFFFFF",
                          color: "#8B7A8E",
                          border: "1px solid #EDE7F6",
                        }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-[14px] font-semibold text-[#D4849A]">
          {foods.length} alimente
        </p>

        {foods.length === 0 ? (
          triedOnly && isAuthed === false ? (
            <div className="mt-6 text-center">
              <p className="text-[14px] text-[#8B7A8E]">
                Autentifică-te pentru a vedea alimentele încercate.
              </p>
              <Link
                href="/login"
                className="mt-3 inline-flex rounded-full bg-[#D4849A] px-5 py-2 text-[13px] font-bold text-white"
              >
                Conectează-te
              </Link>
            </div>
          ) : searchTrim || triedOnly ? (
            <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
              {searchTrim ? (
                <>Niciun aliment găsit pentru „{searchTrim}”</>
              ) : (
                <>
                  Niciun aliment încercat încă în această selecție. Explorează
                  calendarul sau schimbă filtrele.
                </>
              )}
            </p>
          ) : null
        ) : (
          <div
            key={storeVersion}
            className="mt-5 grid grid-cols-2 gap-[10px]"
          >
            {foods.map((food) => {
              const s = getFoodStatusMeta(getFoodStatus(food.id).status);
              return (
                <Link
                  key={food.id}
                  href={`/alimente/${food.id}`}
                  className="cursor-pointer"
                >
                  <div
                    className="bg-white rounded-[16px] p-[14px] border"
                    style={{
                      borderColor: s.border,
                      transition: "transform 150ms ease, box-shadow 150ms ease",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 flex items-center justify-center">
                        <span className="text-[32px] leading-none">
                          {food.emoji}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[14px] font-bold text-[#3D2C3E] truncate"
                          title={food.name}
                        >
                          {food.name}
                        </div>
                        <div
                          className="mt-1 text-[13px] font-normal"
                          style={{ color: s.statusColor }}
                        >
                          {s.statusText}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Navbar activeTab="alimente" />
    </div>
  );
}

export default function AlimentePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
          <main className="w-full max-w-[393px] px-6 pt-6 pb-[128px]">
            <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
          </main>
          <Navbar activeTab="alimente" />
        </div>
      }
    >
      <AlimentePageInner />
    </Suspense>
  );
}

