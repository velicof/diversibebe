"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatRecipeCardHintRo,
  readBabyAgeMonthsFromStorage,
} from "../lib/recipePortions";
import Navbar from "../components/Navbar";
import { getRecipes, parseDate, type MealType } from "../lib/store";
import {
  formatRecommendedFoodName,
  useRecommendedRecipes,
} from "../lib/useRecommendedRecipes";
import { useStoreRefresh } from "../lib/useStoreRefresh";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import BabyAvatar from "../components/BabyAvatar";

type AgeFilterId = "all" | "6" | "7" | "8" | "10" | "12";
type MealFilterId = "all" | MealType | "favorite";

const RECIPES = getRecipes();

function ageToMinMonths(age: string) {
  const match = age.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function extractMinAge(ageStr: string): number {
  const match = ageStr.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 99;
}

function normalizeForSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const MEAL_LABELS: Record<MealType, string> = {
  "mic-dejun": "Mic dejun",
  pranz: "Prânz",
  cina: "Cină",
  gustare: "Gustare",
};

const MEAL_FILTERS: Array<{ id: MealFilterId; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "favorite", label: "Favorite ❤️" },
  { id: "mic-dejun", label: "Mic dejun 🌅" },
  { id: "pranz", label: "Prânz 🍽️" },
  { id: "cina", label: "Cină 🌙" },
  { id: "gustare", label: "Gustare 🍎" },
];

const AGE_FILTERS: Array<{ id: AgeFilterId; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "6", label: "6+ luni" },
  { id: "7", label: "7+ luni" },
  { id: "8", label: "8+ luni" },
  { id: "10", label: "10+ luni" },
  { id: "12", label: "12+ luni" },
];

const pillActive = { background: "#D4849A", color: "#FFFFFF" };
const pillInactive = {
  background: "#FFFFFF",
  color: "#8B7A8E",
  border: "1px solid #EDE7F6",
};

export default function RetetePage() {
  const storeVersion = useStoreRefresh();
  const [mealFilter, setMealFilter] = useState<MealFilterId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileAgeFilter, setProfileAgeFilter] = useState<AgeFilterId>("all");
  const [manualAgeFilter, setManualAgeFilter] = useState<AgeFilterId | null>(
    null
  );
  const [babyAgeMonths, setBabyAgeMonths] = useState<number | null>(null);
  const { userId } = useUser();
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<
    string[] | null
  >(null);
  const [babyAvatarUrl, setBabyAvatarUrl] = useState<string | null>(null);
  const ageFilter = manualAgeFilter ?? profileAgeFilter;
  const prevBirthKey = useRef<string | null>(null);
  const recommended = useRecommendedRecipes();

  // Restaurează filtrele din sessionStorage la mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("retete_filters");
      if (saved) {
        const { meal, age } = JSON.parse(saved);
        if (meal) setMealFilter(meal);
        if (age) setManualAgeFilter(age);
      }
    } catch {}
  }, []); // O singură dată la mount

  // Salvează filtrele în sessionStorage când se schimbă
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "retete_filters",
        JSON.stringify({ meal: mealFilter, age: manualAgeFilter })
      );
    } catch {}
  }, [mealFilter, manualAgeFilter]);

  /* eslint-disable react-hooks/set-state-in-effect -- mirror baby birthDate from localStorage into filter state */
  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("diversibebe_data") || "{}"
      ) as {
        appState?: { currentUser?: { baby?: { birthDate?: string } } };
        currentUser?: { baby?: { birthDate?: string } };
      };
      const birthDate =
        data.appState?.currentUser?.baby?.birthDate ??
        data.currentUser?.baby?.birthDate ??
        "";
      if (prevBirthKey.current !== birthDate) {
        prevBirthKey.current = birthDate;
        setManualAgeFilter(null);
      }
      const d = birthDate ? parseDate(birthDate) : null;
      const ageMonths =
        d && !Number.isNaN(d.getTime())
          ? Math.floor(
              (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            )
          : 0;
      let next: AgeFilterId = "12";
      if (ageMonths < 6) next = "6";
      else if (ageMonths < 7) next = "6";
      else if (ageMonths < 8) next = "7";
      else if (ageMonths < 10) next = "8";
      else if (ageMonths < 12) next = "10";
      else next = "12";
      setProfileAgeFilter(next);
    } catch {
      setProfileAgeFilter("all");
    }
  }, [storeVersion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    setBabyAgeMonths(readBabyAgeMonthsFromStorage());
  }, [storeVersion]);

  useEffect(() => {
    if (!userId) {
      setFavoriteRecipeIds([]);
      setBabyAvatarUrl(null);
      return;
    }
    const supabase = createClient();
    setFavoriteRecipeIds(null);
    supabase
      .from("favorite_recipes")
      .select("recipe_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        setFavoriteRecipeIds((data ?? []).map((d: any) => d.recipe_id));
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("babies")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setBabyAvatarUrl(data?.avatar_url ?? null));
  }, [userId]);

  useEffect(() => {
    if (!userId || mealFilter !== "favorite") return;
    const supabase = createClient();
    setFavoriteRecipeIds(null);
    supabase
      .from("favorite_recipes")
      .select("recipe_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        setFavoriteRecipeIds((data ?? []).map((d: any) => d.recipe_id));
      });
  }, [mealFilter, userId]);

  const searchTrim = searchQuery.trim();

  const visible = useMemo(() => {
    if (searchTrim) {
      const q = normalizeForSearch(searchTrim);
      return RECIPES.filter((r) => normalizeForSearch(r.name).includes(q));
    }
    let list = RECIPES;
    if (mealFilter !== "all") {
      if (mealFilter === "favorite") {
        const favSet = new Set(favoriteRecipeIds ?? []);
        list = favoriteRecipeIds
          ? list.filter((r) => favSet.has(r.id))
          : [];
      } else {
        list = list.filter((r) => r.mealType === mealFilter);
      }
    }
    if (ageFilter === "all") {
      // Sortează toate rețetele crescător după vârstă
      list = [...list].sort((a, b) => extractMinAge(a.age) - extractMinAge(b.age));
    } else {
      // Afișează EXACT rețetele pentru vârsta selectată
      const selectedMonths = Number(ageFilter);
      list = list.filter((r) => {
        const recipeAge = extractMinAge(r.age);
        return recipeAge === selectedMonths;
      });
    }
    return list;
  }, [searchTrim, mealFilter, ageFilter]);

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center transition-colors">
      <main
        className="w-full max-w-[393px] px-6 pb-[128px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
                Rețete 📖
              </h1>
              <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
                Rețete simple și sănătoase
              </p>
            </div>
            <Link href="/profil" className="shrink-0 cursor-pointer" aria-label="Profil">
              <BabyAvatar avatarUrl={babyAvatarUrl} size={40} />
            </Link>
          </div>
        </header>

        <div className="relative mt-5 w-full">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Caută o rețetă..."
            className="w-full h-[44px] rounded-[16px] border border-[#EDE7F6] bg-white pl-4 pr-11 text-[14px] text-[#3D2C3E] outline-none focus:border-[#D4849A] placeholder:text-[#B8A9BB]"
            autoComplete="off"
            aria-label="Caută o rețetă"
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MEAL_FILTERS.map((t) => {
              const isActive = t.id === mealFilter;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMealFilter(t.id)}
                  className="cursor-pointer whitespace-nowrap font-bold text-[14px] px-4 py-[8px] rounded-full transition-colors"
                  style={isActive ? pillActive : pillInactive}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {AGE_FILTERS.map((t) => {
              const isActive = t.id === ageFilter;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setManualAgeFilter(t.id)}
                  className="cursor-pointer whitespace-nowrap font-bold text-[14px] px-4 py-[8px] rounded-full transition-colors"
                  style={isActive ? pillActive : pillInactive}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {!searchTrim &&
        recommended.canShow &&
        (recommended.loading || recommended.items.length > 0) ? (
          <section className="mt-6" aria-label="Rețete recomandate">
            <h2 className="text-[17px] font-extrabold text-[#3D2C3E] mb-3">
              {recommended.babyName
                ? `Rețete pentru ${recommended.babyName}`
                : "Recomandate pentru tine"}
            </h2>
            {recommended.loading ? (
              <div className="flex flex-col gap-[10px]">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={`rec-skel-${idx}`}
                    className="rounded-[16px] p-[14px] bg-white border border-[#FDE8EE] animate-pulse"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-[52px] h-[52px] rounded-[16px] bg-[#F5F0F8]" />
                      <div className="min-w-0 flex-1">
                        <div className="h-4 w-44 rounded bg-[#F5F0F8]" />
                        <div className="mt-2 h-3 w-24 rounded bg-[#F5F0F8]" />
                        <div className="mt-3 h-3 w-full rounded bg-[#F5F0F8]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {recommended.items.map(({ recipe: r, newIngredient }) => (
                  <Link
                    key={`rec-${r.id}`}
                    href={`/retete/${r.id}`}
                    className="cursor-pointer"
                    aria-label={`Deschide rețeta ${r.name}`}
                  >
                    <div
                      className="relative bg-white rounded-[16px] p-[14px] border"
                      style={{ borderColor: "#FDE8EE" }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center flex-shrink-0 bg-[#E0F5F0]">
                          <span className="text-[28px] leading-none">{r.emoji}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold text-[#3D2C3E] truncate">
                            {r.name}
                          </div>
                          {newIngredient ? (
                            <span
                              className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(168, 220, 209, 0.2)",
                                color: "#0F6E56",
                              }}
                            >
                              ✨ Ingredient nou:{" "}
                              {formatRecommendedFoodName(newIngredient)}
                            </span>
                          ) : null}
                          <p className="mt-1 text-[11px] font-semibold text-[#D4849A]">
                            {MEAL_LABELS[r.mealType]}
                          </p>

                          <div className="mt-2 flex gap-3 flex-wrap">
                            <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                              ⏱ {r.time}
                            </span>
                            <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                              👶 {r.age}
                            </span>
                            <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                              📊 {r.difficulty}
                            </span>
                          </div>
                          {babyAgeMonths !== null ? (
                            <p className="mt-2 text-[11px] font-semibold text-[#0F6E56] leading-snug">
                              {formatRecipeCardHintRo(r, babyAgeMonths)
                                .split("·")[0]
                                .trim()}
                            </p>
                          ) : (
                            <p className="mt-2 text-[10px] text-[#B8A9BB] leading-snug">
                              Porție bebe: completează profilul pentru estimări
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {visible.length === 0 && searchTrim ? (
          <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
            Nicio rețetă găsită pentru „{searchTrim}”
          </p>
        ) : visible.length === 0 ? (
          mealFilter === "favorite" &&
          favoriteRecipeIds !== null &&
          favoriteRecipeIds.length === 0 ? (
            <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
              Nu ai rețete favorite încă. Apasă ❤️ pe o rețetă pentru a o
              salva.
            </p>
          ) : (
            <p className="mt-5 text-[14px] text-[#8B7A8E] text-center leading-relaxed px-2">
              Nicio rețetă pentru filtrele selectate. Încearcă alt tip de masă
              sau altă vârstă.
            </p>
          )
        ) : (
          <section className="mt-5 flex flex-col gap-[10px]">
            {visible.map((r) => (
              <Link
                key={r.id}
                href={`/retete/${r.id}`}
                className="cursor-pointer"
                aria-label={`Deschide rețeta ${r.name}`}
              >
                <div
                  className="relative bg-white rounded-[16px] p-[14px] border"
                  style={{ borderColor: "#FDE8EE" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center flex-shrink-0 bg-[#E0F5F0]"
                    >
                      <span className="text-[28px] leading-none">{r.emoji}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-[#3D2C3E] truncate">
                        {r.name}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-[#D4849A]">
                        {MEAL_LABELS[r.mealType]}
                      </p>

                      <div className="mt-2 flex gap-3 flex-wrap">
                        <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                          ⏱ {r.time}
                        </span>
                        <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                          👶 {r.age}
                        </span>
                        <span className="text-[11px] text-[#8B7A8E] whitespace-nowrap">
                          📊 {r.difficulty}
                        </span>
                      </div>
                      {babyAgeMonths !== null ? (
                        <p className="mt-2 text-[11px] font-semibold text-[#0F6E56] leading-snug">
                          {formatRecipeCardHintRo(r, babyAgeMonths)
                            .split("·")[0]
                            .trim()}
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] text-[#B8A9BB] leading-snug">
                          Porție bebe: completează profilul pentru estimări
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>

      <Navbar activeTab="retete" />
    </div>
  );
}
