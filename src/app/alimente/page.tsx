"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import { useUser } from "@/lib/useUser";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  getAllFoods,
  getFoodStatus,
  getFoodStatusMeta,
  getFoodsByAgeGroup,
  parseDate,
} from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

type AgeTabId = "all" | "6-8" | "8-10" | "10-12" | "12+";

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

type TriedFoodRow = {
  food_id: string;
  food_name: string;
  try_count: number;
  first_tried_at: string;
};

function AlimentePageInner() {
  const storeVersion = useStoreRefresh();
  const searchParams = useSearchParams();
  const { userId, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<AgeTabId>("6-8");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [triedFoods, setTriedFoods] = useState<TriedFoodRow[]>([]);
  const [triedLoading, setTriedLoading] = useState(false);
  const [triedAuthMissing, setTriedAuthMissing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const groupFromUrl = searchParams.get("group");
  const triedOnly = searchParams.get("filter") === "incercate";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (groupFromUrl && AGE_TAB_IDS.has(groupFromUrl)) {
      setActiveTab(groupFromUrl as AgeTabId);
    }
  }, [groupFromUrl]);

  useEffect(() => {
    if (groupFromUrl && AGE_TAB_IDS.has(groupFromUrl)) return;
    try {
      const data = JSON.parse(
        localStorage.getItem("diversibebe_data") || "{}"
      ) as {
        appState?: { currentUser?: { baby?: { birthDate?: string } } };
        currentUser?: { baby?: { birthDate?: string } };
      };
      const birthDate =
        data.appState?.currentUser?.baby?.birthDate ??
        data.currentUser?.baby?.birthDate;
      const d = birthDate ? parseDate(birthDate) : null;
      const ageMonths =
        d && !Number.isNaN(d.getTime())
          ? Math.floor(
              (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            )
          : 0;
      let tab: AgeTabId = "12+";
      if (ageMonths < 8) tab = "6-8";
      else if (ageMonths < 10) tab = "8-10";
      else if (ageMonths < 12) tab = "10-12";
      else tab = "12+";
      setActiveTab(tab);
    } catch {
      /* ignore */
    }
  }, [groupFromUrl, storeVersion]);

  useEffect(() => {
    if (!triedOnly) return;
    let active = true;
    if (authLoading) {
      setTriedLoading(true);
      setTriedAuthMissing(false);
      return;
    }

    void (async () => {
      if (!active) return;
      if (!userId) {
        setTriedAuthMissing(true);
        setTriedFoods([]);
        setTriedLoading(false);
        return;
      }

      setTriedAuthMissing(false);
      setTriedLoading(true);

      const { data, error } = await supabaseClient
        .from("tried_foods")
        .select("food_id, food_name, try_count, first_tried_at")
        .eq("user_id", userId)
        .order("first_tried_at", { ascending: false });

      if (!active) return;
      if (error || !data) {
        setTriedFoods([]);
      } else {
        setTriedFoods(data as TriedFoodRow[]);
      }
      setTriedLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [triedOnly, authLoading, userId]);

  const triedIdSet = useMemo(
    () => new Set(triedFoods.map((t) => t.food_id)),
    [triedFoods]
  );
  const triedByFoodId = useMemo(
    () => new Map(triedFoods.map((t) => [t.food_id, t])),
    [triedFoods]
  );

  const foodsInAgeGroup = useMemo(() => {
    if (triedOnly) return getAllFoods();
    if (activeTab === "all") return getAllFoods();
    if (activeTab === "12+") return getFoodsByAgeGroup("10-12");
    return getFoodsByAgeGroup(activeTab);
  }, [activeTab, triedOnly]);
  const foodsByCategory = useMemo(() => {
    if (triedOnly || activeCategory === "all") return foodsInAgeGroup;
    return foodsInAgeGroup.filter((f) => f.category === activeCategory);
  }, [activeCategory, foodsInAgeGroup, triedOnly]);

  const searchTrim = searchQuery.trim();
  const foods = useMemo(() => {
    let list: ReturnType<typeof getAllFoods>;
    if (!searchTrim) list = foodsByCategory;
    else {
      const q = normalizeForSearch(searchTrim);
      list = getAllFoods().filter((f) => normalizeForSearch(f.name).includes(q));
    }
    if (!triedOnly) return list;
    return list.filter((f) => triedIdSet.has(f.id));
  }, [foodsByCategory, searchTrim, triedOnly, triedIdSet, storeVersion]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main className="w-full max-w-[393px] px-6 pb-[128px]">
          <header className="pt-6">
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              {triedOnly ? "Alimente încercate 🥄" : "Calendarul alimentar 🥄"}
            </h1>
          </header>
          <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
            Se încarcă…
          </p>
        </main>
        <Navbar activeTab="alimente" />
      </div>
    );
  }

  if (triedOnly && triedLoading) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main className="w-full max-w-[393px] px-6 pb-[128px]">
          <header className="pt-6">
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              Alimente încercate 🥄
            </h1>
          </header>
          <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
            Se încarcă…
          </p>
        </main>
        <Navbar activeTab="alimente" />
      </div>
    );
  }

  if (triedOnly && triedAuthMissing) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main className="w-full max-w-[393px] px-6 pb-[128px]">
          <header className="pt-6">
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              Alimente încercate 🥄
            </h1>
            <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
              Doar alimentele deja încercate și jurnalizate pentru bebeluș
            </p>
          </header>
          <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
            Autentifică-te pentru a vedea alimentele încercate{" "}
            <Link href="/login" className="font-bold text-[#D4849A]">
              aici
            </Link>
          </p>
        </main>
        <Navbar activeTab="alimente" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center transition-colors">
      <main className="w-full max-w-[393px] px-6 pb-[128px]">
        <header className="pt-6">
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
          searchTrim || triedOnly ? (
            <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
              {searchTrim ? (
                <>Niciun aliment găsit pentru „{searchTrim}”</>
              ) : (
                <>
                  Niciun aliment încercat încă. Jurnalizează prima masă!
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
              const tried = triedByFoodId.get(food.id);
              const s = triedOnly
                ? {
                    border: "#EDE7F6",
                    statusColor: "#8B7A8E",
                    statusText: "",
                  }
                : getFoodStatusMeta(getFoodStatus(food.id).status);
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
                          {triedOnly && tried ? `Încercat de ${tried.try_count} ori` : s.statusText}
                        </div>
                        {triedOnly && tried ? (
                          <div
                            className="mt-0.5 text-[12px] font-normal"
                            style={{ color: "#B8A9BB" }}
                          >
                            {new Date(tried.first_tried_at).toLocaleDateString("ro-RO")}
                          </div>
                        ) : null}
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

