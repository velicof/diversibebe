"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { supabaseClient } from "@/lib/supabaseClient";
import BabyAvatar from "../components/BabyAvatar";
import {
  calculateBabyAge,
  getAllFoods,
  getFoodStatus,
  getFoodStatusMeta,
  getFoodsByAgeGroup,
  TRIED_FOODS_UPDATED_EVENT,
  type FoodCatalogItem,
  type FoodStatus,
  type TriedFoodsOptimisticDetail,
} from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";
import { searchFoods } from "@/lib/searchUtils";

type AgeTabId = "all" | "sub-6" | "6-7" | "7-8" | "8-10" | "10-12" | "12+";

type CategoryId =
  | "all"
  | "legume"
  | "fructe"
  | "proteine"
  | "cereale"
  | "grasimi"
  | "condimente"
  | "custom";

const AGE_TABS: Array<{ id: AgeTabId; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "sub-6", label: "sub 6 luni" },
  { id: "6-7", label: "6-7 luni" },
  { id: "7-8", label: "7-8 luni" },
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
  "sub-6",
  "6-7",
  "7-8",
  "8-10",
  "10-12",
  "12+",
]);

type TriedFoodRow = {
  food_id: string;
  food_name: string;
  try_count: number;
  first_tried_at: string;
};

function AlimentePageInner() {
  const router = useRouter();
  const storeVersion = useStoreRefresh();
  const searchParams = useSearchParams();
  const { userId, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<AgeTabId>("6-7");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [triedFoods, setTriedFoods] = useState<TriedFoodRow[]>([]);
  const [triedLoading, setTriedLoading] = useState(false);
  const [triedAuthMissing, setTriedAuthMissing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [babyAvatarUrl, setBabyAvatarUrl] = useState<string | null>(null);
  const [supabaseBabyAge, setSupabaseBabyAge] = useState<number>(0);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodEmoji, setCustomFoodEmoji] = useState("🍽️");
  const [customFoods, setCustomFoods] = useState<Array<{ id: string; name: string; emoji: string }>>([]);

  const groupFromUrl = searchParams.get("group");
  const triedOnly = searchParams.get("filter") === "incercate";
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = userId ?? null;

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
    let tab: AgeTabId = "12+";
    if (supabaseBabyAge < 6) tab = "sub-6";
    else if (supabaseBabyAge < 7) tab = "6-7";
    else if (supabaseBabyAge < 8) tab = "7-8";
    else if (supabaseBabyAge < 10) tab = "8-10";
    else if (supabaseBabyAge < 12) tab = "10-12";
    else tab = "12+";
    setActiveTab(tab);
  }, [groupFromUrl, storeVersion, supabaseBabyAge]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("babies")
      .select("birthdate")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.birthdate) {
          const age = calculateBabyAge(data.birthdate);
          setSupabaseBabyAge(age.months);
        }
      });
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (authLoading) {
      if (triedOnly) {
        setTriedLoading(true);
        setTriedAuthMissing(false);
      }
      return;
    }

    void (async () => {
      if (!active) return;
      if (!userId) {
        if (triedOnly) {
          setTriedAuthMissing(true);
          setTriedFoods([]);
          setTriedLoading(false);
        } else {
          setTriedFoods([]);
        }
        return;
      }

      if (triedOnly) {
        setTriedAuthMissing(false);
        setTriedLoading(true);
      }

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
      if (triedOnly) setTriedLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [triedOnly, authLoading, userId]);

  useEffect(() => {
    if (!userId) {
      setBabyAvatarUrl(null);
      return;
    }
    supabaseClient
      .from("babies")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setBabyAvatarUrl(data?.avatar_url ?? null));
  }, [userId]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<TriedFoodsOptimisticDetail>;
      const d = e.detail;
      if (!d?.food_id) return;
      setTriedFoods((prev) => {
        const idx = prev.findIndex((t) => t.food_id === d.food_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx]!,
            food_name: d.food_name,
            try_count: d.try_count,
            first_tried_at: d.first_tried_at,
          };
          return next;
        }
        return [
          {
            food_id: d.food_id,
            food_name: d.food_name,
            try_count: d.try_count,
            first_tried_at: d.first_tried_at,
          },
          ...prev,
        ];
      });
      const uid = userIdRef.current;
      if (!uid) return;
      void supabaseClient
        .from("tried_foods")
        .select("food_id, food_name, try_count, first_tried_at")
        .eq("user_id", uid)
        .order("first_tried_at", { ascending: false })
        .then(({ data: refreshed }) => {
          if (refreshed) setTriedFoods(refreshed as TriedFoodRow[]);
        });
    };
    window.addEventListener(TRIED_FOODS_UPDATED_EVENT, handler);
    return () => window.removeEventListener(TRIED_FOODS_UPDATED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabaseClient
      .from("custom_foods")
      .select("id, name, emoji")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCustomFoods(data);
      });
  }, [userId]);

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
    // Alimente din grupa 6–8 (început diversificare ~6 luni), aliniat cu rețetele minAge ≤ 6
    if (activeTab === "sub-6") return [];
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
      const catalogResults = searchFoods(getAllFoods(), searchTrim);
      const customResults = customFoods.filter((cf) =>
        cf.name.toLowerCase().includes(searchTrim.toLowerCase())
      );
      list = [
        ...catalogResults,
        ...customResults.map((cf) => ({
          id: cf.id,
          name: cf.name,
          emoji: cf.emoji,
          category: "custom" as CategoryId,
          ageGroup: "6-7" as const,
          nutrients: [],
          preparation: "",
          allergenInfo: "",
          minAgeMonths: 6,
          relatedRecipes: [],
        })) as FoodCatalogItem[],
      ];
    }
    if (!triedOnly) return list;
    return list.filter((f) => triedIdSet.has(f.id));
  }, [foodsByCategory, searchTrim, triedOnly, triedIdSet, storeVersion, customFoods]);

  const handleSaveCustomFood = async () => {
    if (!customFoodName.trim() || !userId) return;
    const customId = `custom_${Date.now()}`;
    const { error } = await supabaseClient.from("custom_foods").insert({
      id: customId,
      user_id: userId,
      name: customFoodName.trim(),
      emoji: customFoodEmoji,
    });
    if (error) {
      alert("Eroare la salvare: " + error.message);
      return;
    }
    setCustomFoods((prev) => [
      { id: customId, name: customFoodName.trim(), emoji: customFoodEmoji },
      ...prev,
    ]);
    setShowCustomModal(false);
    router.push(
      `/jurnal?foodId=${encodeURIComponent(customId)}&foodName=${encodeURIComponent(customFoodName.trim())}&emoji=${encodeURIComponent(customFoodEmoji)}`
    );
  };

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
                {triedOnly ? "Alimente încercate 🥄" : "Calendarul alimentar 🥄"}
              </h1>
              <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
                {triedOnly
                  ? "Doar alimentele deja încercate și jurnalizate pentru bebeluș"
                  : "Alimente recomandate pe grupe de vârstă"}
              </p>
            </div>
            <Link href="/profil" className="shrink-0 cursor-pointer" aria-label="Profil">
              <BabyAvatar avatarUrl={babyAvatarUrl} size={40} />
            </Link>
          </div>
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
          activeTab === "sub-6" ? (
            <div
              style={{
                background: "#FDE8EE",
                borderRadius: 16,
                padding: 16,
                marginTop: 20,
                width: "100%",
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>
                👶
              </div>
              <h3 className="text-[16px] font-extrabold text-[#3D2C3E]">
                Alăptare exclusivă
              </h3>
              <p
                className="mt-2 text-[13px] font-normal text-[#3D2C3E]"
                style={{ lineHeight: 1.6 }}
              >
                Conform Organizației Mondiale a Sănătății (OMS), înainte de 6
                luni alimentația bebelușului trebuie să constea{" "}
                <strong>exclusiv din lapte matern sau formulă</strong>.
              </p>
              <p
                className="mt-2 text-[13px] font-normal text-[#3D2C3E]"
                style={{ lineHeight: 1.6 }}
              >
                Diversificarea se recomandă să înceapă la vârsta de 6 luni.
              </p>
            </div>
          ) : searchTrim || triedOnly ? (
            searchTrim ? (
              <div className="mt-4 flex flex-col items-center gap-3">
                <p className="text-[14px] text-[#8B7A8E] text-center">
                  Niciun aliment găsit pentru „{searchTrim}"
                </p>
                {userId && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFoodName(searchTrim);
                      setCustomFoodEmoji("🍽️");
                      setShowCustomModal(true);
                    }}
                    className="rounded-[14px] border-2 border-dashed border-[#D4849A] bg-white px-5 py-3 text-[13px] font-semibold text-[#D4849A] cursor-pointer"
                  >
                    + Adaugă „{searchTrim}" ca aliment nou
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
                Niciun aliment încercat încă. Jurnalizează prima masă!
              </p>
            )
          ) : null
        ) : (
          <div
            key={storeVersion}
            className="mt-5 grid grid-cols-2 gap-[10px]"
          >
            {foods.map((food) => {
              const tried = triedByFoodId.get(food.id);
              const local = getFoodStatus(food.id);
              const statusForCard: FoodStatus =
                triedIdSet.has(food.id) && local.status === "De încercat"
                  ? "Încercat"
                  : local.status;
              const s = triedOnly
                ? {
                    border: "#EDE7F6",
                    statusColor: "#8B7A8E",
                    statusText: "",
                  }
                : getFoodStatusMeta(statusForCard);
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

      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="w-full max-w-[393px] rounded-t-[24px] bg-[#FFF8F6] p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: '"Nunito", sans-serif' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-extrabold text-[#3D2C3E]">Aliment nou 🥄</h2>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-[#8B7A8E] text-[24px] leading-none cursor-pointer bg-transparent border-0"
              >
                ×
              </button>
            </div>
            <p className="text-[12px] text-[#8B7A8E] mb-2">Numele alimentului</p>
            <input
              type="text"
              value={customFoodName}
              onChange={(e) => setCustomFoodName(e.target.value)}
              placeholder="ex: Gulie, Păstârnac, Topinambur..."
              className="w-full rounded-[12px] px-4 py-3 text-[14px] text-[#3D2C3E] outline-none mb-4"
              style={{ backgroundColor: "#F5F0F8" }}
            />
            <p className="text-[12px] text-[#8B7A8E] mb-2">Alege un emoji</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {["🥦","🥕","🫑","🧅","🧄","🥔","🍠","🌽","🥒","🍅","🫛","🫒","🍋","🍊","🍎","🍇","🫐","🍓","🥑","🥚","🐟","🍗","🥩","🧀","🌾","🍽️"].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setCustomFoodEmoji(em)}
                  className="text-[22px] rounded-[8px] w-10 h-10 flex items-center justify-center cursor-pointer border"
                  style={{
                    borderColor: customFoodEmoji === em ? "#D4849A" : "transparent",
                    backgroundColor: customFoodEmoji === em ? "#FFF0F5" : "transparent",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!customFoodName.trim()}
              onClick={handleSaveCustomFood}
              className="w-full h-12 rounded-full font-bold text-[15px] cursor-pointer"
              style={{
                backgroundColor: customFoodName.trim() ? "#D4849A" : "#EDE7F6",
                color: customFoodName.trim() ? "white" : "#8B7A8E",
              }}
            >
              Salvează și jurnalizează
            </button>
          </div>
        </div>
      )}

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

