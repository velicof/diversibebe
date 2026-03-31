"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import BabyAvatar from "../components/BabyAvatar";
import {
  generateSmartWeekPlan,
  getRecipeTags,
} from "@/app/lib/nutrition";
import {
  ageBandLabelRo,
  ageMonthsToAgeBand,
  formatApproxBabyServingsRo,
  formatRecipePortionLineRo,
  inferTotalYieldGrams,
} from "@/app/lib/recipePortions";
import {
  RECIPES,
  type MealType,
  type RecipeCatalogItem,
} from "../lib/recipesDatabase";
import { calculateBabyAge } from "../lib/store";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { useStoreRefresh } from "../lib/useStoreRefresh";

const RO_MONTHS_LONG = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
] as const;

const DAY_NAMES = [
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
  "Duminică",
] as const;

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const PLAN_AGE_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6);

const MEAL_TIME_LABEL: Partial<Record<MealType, string>> = {
  "mic-dejun": "08:00",
  gustare: "10:30",
  pranz: "13:00",
  cina: "18:00",
};

const MEAL_CHIP_LABEL: Partial<Record<MealType, string>> = {
  "mic-dejun": "Mic dejun",
  gustare: "Gustare",
  pranz: "Prânz",
  cina: "Cină",
};

function recipeMinAgeTier(age: string): number {
  const s = age.trim();
  const plus = s.match(/^(\d+)\s*\+/);
  if (plus) return Number(plus[1]);
  const range = s.match(/^(\d+)\s*-\s*\d+/);
  if (range) return Number(range[1]);
  const any = s.match(/(\d+)/);
  return any ? Number(any[1]) : 99;
}

function isTooSolid(name: string, ageMonths: number): boolean {
  if (ageMonths >= 8) return false;
  const solidWords = [
    "chiftele",
    "chifteluț",
    "baghetele",
    "fingers",
    "biscuit",
    "toast",
    "pâine",
    "sandwich",
    "wrap",
    "salată",
  ];
  const n = name.toLowerCase();
  return solidWords.some((w) => n.includes(w));
}

function filterRecipesByBabyAge(
  recipes: RecipeCatalogItem[],
  ageMonths: number
): RecipeCatalogItem[] {
  const tier = (r: RecipeCatalogItem) => recipeMinAgeTier(r.age);
  let filtered: RecipeCatalogItem[];
  if (ageMonths < 6) {
    filtered = recipes.filter((r) => tier(r) === 4);
  } else if (ageMonths < 8) {
    filtered = recipes.filter((r) => {
      const t = tier(r);
      return t === 4 || t === 5 || t === 6;
    });
  } else if (ageMonths < 10) {
    filtered = recipes.filter((r) => {
      const t = tier(r);
      return t >= 4 && t <= 8;
    });
  } else if (ageMonths < 12) {
    filtered = recipes.filter((r) => tier(r) < 12);
  } else {
    filtered = recipes;
  }
  return filtered.filter((r) => !isTooSolid(r.name, ageMonths));
}

function getMonday(weekOffset: number): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const dow = base.getDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  base.setDate(base.getDate() + toMon + weekOffset * 7);
  return base;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const m1 = RO_MONTHS_LONG[monday.getMonth()];
  const m2 = RO_MONTHS_LONG[sunday.getMonth()];
  const y = sunday.getFullYear();
  if (monday.getMonth() === sunday.getMonth()) {
    return `${d1}–${d2} ${m1} ${y}`;
  }
  return `${d1} ${m1} – ${d2} ${m2} ${y}`;
}

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

function weekKeyFromMonday(monday: Date): number {
  return Math.floor(monday.getTime() / MS_DAY);
}

function weekNumberFromMonday(monday: Date): number {
  return Math.floor(monday.getTime() / MS_WEEK);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pickSeededIndex(seed: number, len: number): number {
  if (len <= 0) return 0;
  const s = Math.abs(seed);
  return s % len;
}

function overrideStorageKey(
  weekKey: number,
  dayIndex: number,
  mealIndex: number
): string {
  return `plan_overrides_${weekKey}_${dayIndex}_${mealIndex}`;
}

function readPlanOverride(
  weekKey: number,
  dayIndex: number,
  mealIndex: number
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(overrideStorageKey(weekKey, dayIndex, mealIndex));
  } catch {
    return null;
  }
}

function writePlanOverride(
  weekKey: number,
  dayIndex: number,
  mealIndex: number,
  recipeId: string
): void {
  try {
    localStorage.setItem(
      overrideStorageKey(weekKey, dayIndex, mealIndex),
      recipeId
    );
  } catch {
    /* ignore */
  }
}

function recipesForMealType(
  pool: RecipeCatalogItem[],
  mealType: MealType
): RecipeCatalogItem[] {
  return pool.filter((r) => r.mealType === mealType);
}

type PlannedMeal = {
  mealType: MealType;
  mealIndex: number;
  recipe: RecipeCatalogItem | null;
};

type SheetTarget = {
  weekKey: number;
  dayIndex: number;
  mealIndex: number;
  mealType: MealType;
  currentId: string | null;
};

function ageGroupFromMonths(ageMonths: number): string {
  if (ageMonths >= 12) return "12+";
  if (ageMonths >= 10) return "10+";
  if (ageMonths >= 8) return "8+";
  if (ageMonths >= 6) return "6+";
  return "4+";
}

export default function PlanPage() {
  const router = useRouter();
  const { userId } = useUser();
  const storeVersion = useStoreRefresh();
  const [currentWeek, setCurrentWeek] = useState(0);
  const [mode, setMode] = useState<"normal" | "cu-fibre">("normal");
  const [weekSeedOffset, setWeekSeedOffset] = useState(0);
  const [supabaseBabyAge, setSupabaseBabyAge] = useState<number>(0);
  const [supabaseBabyName, setSupabaseBabyName] = useState<string>("");
  const [babyAgeLoaded, setBabyAgeLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [overrideTick, setOverrideTick] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [babyAvatarUrl, setBabyAvatarUrl] = useState<string | null>(null);
  const [selectedAgeMonths, setSelectedAgeMonths] = useState<number | null>(null);
  const [isRegeneratingPreview, setIsRegeneratingPreview] = useState(false);

  useEffect(() => {
    if (!userId) {
      setSupabaseBabyAge(0);
      setSupabaseBabyName("");
      setSelectedAgeMonths(0);
      setBabyAgeLoaded(true);
      setBabyAvatarUrl(null);
      setHydrated(true);
      return;
    }
    setBabyAgeLoaded(false);
    setHydrated(false);
    const supabase = createClient();
    void (async () => {
      try {
        const { data } = await supabase
          .from("babies")
          .select("birthdate, name, avatar_url")
          .eq("user_id", userId)
          .maybeSingle();
        setBabyAvatarUrl(data?.avatar_url ?? null);
        setSupabaseBabyName(data?.name || "");
        if (data?.birthdate) {
          const age = calculateBabyAge(data.birthdate);
          setSupabaseBabyAge(age.months);
          setSelectedAgeMonths(age.months);
          setBabyAgeLoaded(true);
        } else {
          setSupabaseBabyAge(0);
          setSelectedAgeMonths(0);
          setBabyAgeLoaded(true);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, [userId, storeVersion]);

  const ageMonths = supabaseBabyAge;
  const futureAgeMonths =
    supabaseBabyAge + (currentWeek > 0 ? Math.floor(currentWeek / 4) : 0);

  useEffect(() => {
    if (!babyAgeLoaded) return;
    setSelectedAgeMonths(futureAgeMonths);
  }, [futureAgeMonths, babyAgeLoaded]);

  const effectiveAgeMonths = selectedAgeMonths ?? futureAgeMonths;
  const isFutureWeekPreview = futureAgeMonths > supabaseBabyAge;
  const isReadOnlyPreview = effectiveAgeMonths !== ageMonths;

  useEffect(() => {
    if (!hydrated || selectedAgeMonths === null) return;
    setIsRegeneratingPreview(true);
    const timer = window.setTimeout(() => setIsRegeneratingPreview(false), 220);
    return () => window.clearTimeout(timer);
  }, [hydrated, selectedAgeMonths]);

  useEffect(() => {
    if (isReadOnlyPreview && sheet) {
      setSheet(null);
    }
  }, [isReadOnlyPreview, sheet]);

  const meals = useMemo(
    () =>
      (effectiveAgeMonths < 7
        ? ["pranz"]
        : effectiveAgeMonths === 7
          ? ["mic-dejun", "pranz"]
          : ["mic-dejun", "pranz", "cina"]) as MealType[],
    [effectiveAgeMonths]
  );

  const headerText = useMemo(
    () => meals.map((m) => m.toUpperCase()).join(" → "),
    [meals]
  );

  const ageFilteredRecipes = useMemo(
    () => filterRecipesByBabyAge(RECIPES, effectiveAgeMonths),
    [effectiveAgeMonths]
  );

  const monday = useMemo(() => getMonday(currentWeek), [currentWeek]);
  const weekKey = useMemo(() => weekKeyFromMonday(monday), [monday]);
  const weekNumber = useMemo(() => weekNumberFromMonday(monday), [monday]);
  const weekRangeLabel = useMemo(() => formatWeekRange(monday), [monday]);

  const smartRecipes = useMemo(
    () =>
      ageFilteredRecipes.map((r) => ({
        ...r,
        ageGroup: r.age.split(" ")[0],
      })),
    [ageFilteredRecipes]
  );

  const smartPlan = useMemo(
    () =>
      generateSmartWeekPlan(
        smartRecipes,
        ageGroupFromMonths(effectiveAgeMonths),
        meals,
        weekNumber + weekSeedOffset,
        mode
      ),
    [smartRecipes, effectiveAgeMonths, meals, weekNumber, weekSeedOffset, mode]
  );

  const weekPlan = useMemo(() => {
    const days: PlannedMeal[][] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = DAY_NAMES[dayIndex];
      const dayMeals: PlannedMeal[] = [];
      meals.forEach((mealType, mealIndex) => {
        const pool = recipesForMealType(ageFilteredRecipes, mealType);
        let recipe = (smartPlan[dayName]?.[mealType] ?? null) as RecipeCatalogItem | null;
        const overrideId = isReadOnlyPreview
          ? null
          : readPlanOverride(weekKey, dayIndex, mealIndex);
        if (overrideId && pool.length > 0) {
          const found = pool.find((r) => r.id === overrideId);
          if (found) recipe = found;
        }
        dayMeals.push({ mealType, mealIndex, recipe });
      });
      days.push(dayMeals);
    }
    return days;
  }, [smartPlan, meals, ageFilteredRecipes, weekKey, overrideTick, isReadOnlyPreview]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const openAlternatives = useCallback(
    (target: SheetTarget) => {
      const pool = recipesForMealType(ageFilteredRecipes, target.mealType);
      setSheet(target);
    },
    [ageFilteredRecipes]
  );

  const sheetAlternatives = useMemo(() => {
    if (!sheet) return [];
    const pool = recipesForMealType(ageFilteredRecipes, sheet.mealType);
    const others = pool.filter((r) => r.id !== sheet.currentId);
    const seed = sheet.weekKey * 13 + sheet.dayIndex * 5 + sheet.mealIndex;
    if (others.length <= 6) return others;
    const out: RecipeCatalogItem[] = [];
    const used = new Set<string>();
    let k = 0;
    while (out.length < 6 && k < others.length * 3) {
      const idx = pickSeededIndex(seed + k * 31, others.length);
      const r = others[idx]!;
      if (!used.has(r.id)) {
        used.add(r.id);
        out.push(r);
      }
      k++;
    }
    return out;
  }, [sheet, ageFilteredRecipes]);

  const selectAlternative = useCallback(
    (recipe: RecipeCatalogItem) => {
      if (!sheet || isReadOnlyPreview) return;
      writePlanOverride(
        sheet.weekKey,
        sheet.dayIndex,
        sheet.mealIndex,
        recipe.id
      );
      setSheet(null);
      setOverrideTick((t) => t + 1);
    },
    [sheet, isReadOnlyPreview]
  );

  if (!babyAgeLoaded) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#D4849A] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main
          className="w-full max-w-[393px] px-6 pb-[128px] pt-6"
          style={{ fontFamily: '"Nunito", sans-serif' }}
        >
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
          <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
        </main>
        <Navbar activeTab="plan" />
      </div>
    );
  }

  if (!supabaseBabyName && !supabaseBabyAge) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main
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
              Plan săptămânal 📅
            </h1>
          </header>
          <div className="mt-10 text-center">
            <p className="text-[15px] text-[#3D2C3E] leading-relaxed">
              Adaugă profilul bebelușului pentru a genera planul!
            </p>
            <Link
              href="/register/step2"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#D4849A] px-8 text-[15px] font-bold text-white"
            >
              Completează profilul
            </Link>
          </div>
        </main>
        <Navbar activeTab="plan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        key={storeVersion}
        className="w-full max-w-[393px] px-6 pb-[128px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <div className="flex items-start justify-between">
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
            <Link href="/profil" className="shrink-0 cursor-pointer" aria-label="Profil">
              <BabyAvatar avatarUrl={babyAvatarUrl} size={40} />
            </Link>
          </div>
          <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
            Plan săptămânal 📅
          </h1>
          <p className="mt-2 text-[13px] font-semibold leading-snug text-[#534AB7]">
            {effectiveAgeMonths} luni ·{" "}
            {ageBandLabelRo(ageMonthsToAgeBand(effectiveAgeMonths))} ·{" "}
            {meals.length}{" "}
            {meals.length === 1
              ? "masă planificată/zi"
              : "mese planificate/zi"}
          </p>
          <p className="mt-1 text-[12px] text-[#8B7A8E] leading-relaxed">
            {mode === "normal"
              ? "Plan echilibrat: mic dejun → gustare → prânz → cină (după vârstă)."
              : "Plan cu Fibre: mai multe fibre & rețete ușoare, adaptate vârstei."}
          </p>
          <div className="mt-3 flex justify-end">
            <label className="flex items-center gap-2 text-[13px] text-[#3D2C3E]">
              <span>Vârstă:</span>
              <select
                value={effectiveAgeMonths}
                onChange={(e) => setSelectedAgeMonths(Number(e.target.value))}
                className="rounded-[12px] border bg-white px-3 py-2 text-[13px] text-[#3D2C3E] outline-none"
                style={{
                  borderColor: "#EDE7F6",
                  fontFamily: '"Nunito", sans-serif',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#D4849A";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#EDE7F6";
                }}
              >
                {PLAN_AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age} luni{age === ageMonths ? " (vârsta ta)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {isReadOnlyPreview ? (
            <div
              className="mt-2 rounded-lg"
              style={{
                background: "#FFF3CD",
                color: "#8B6914",
                fontSize: 12,
                padding: "8px 12px",
              }}
            >
              Vizualizezi planul pentru {effectiveAgeMonths} luni · Planul tău activ
              {" "}este pentru {ageMonths} luni
            </div>
          ) : null}
          {isFutureWeekPreview ? (
            <div
              className="mt-2 rounded-lg"
              style={{
                background: "#FFF3CD",
                color: "#8B6914",
                fontSize: 12,
                padding: "8px 12px",
              }}
            >
              Plan previzualizare pentru {futureAgeMonths} luni
            </div>
          ) : null}
          {isRegeneratingPreview ? (
            <p className="mt-2 text-[12px] text-[#8B7A8E]">Se generează...</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Săptămâna anterioară"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EDE7F6] bg-white text-[#D4849A] cursor-pointer"
              onClick={() => setCurrentWeek((w) => w - 1)}
            >
              ←
            </button>
            <p className="flex-1 text-center text-[14px] text-[#8B7A8E]">
              {weekRangeLabel}
            </p>
            <button
              type="button"
              aria-label="Săptămâna următoare"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EDE7F6] bg-white text-[#D4849A] cursor-pointer"
              onClick={() => setCurrentWeek((w) => w + 1)}
            >
              →
            </button>
          </div>
          {currentWeek === 0 ? (
            <div className="mt-3 flex justify-center">
              <span
                className="rounded-[20px] px-3 py-1 text-[11px] font-bold"
                style={{ backgroundColor: "#E8F8F5", color: "#0F6E56" }}
              >
                Săptămâna curentă
              </span>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("normal")}
              disabled={isReadOnlyPreview}
              className="rounded-[20px] border px-4 py-1.5 text-[13px] font-semibold"
              style={{
                backgroundColor: mode === "normal" ? "#D4849A" : "#FFFFFF",
                color: mode === "normal" ? "#FFFFFF" : "#D4849A",
                borderColor: "#D4849A",
                opacity: isReadOnlyPreview ? 0.6 : 1,
              }}
            >
              📅 Plan Normal
            </button>
            <button
              type="button"
              onClick={() => setMode("cu-fibre")}
              disabled={isReadOnlyPreview}
              className="rounded-[20px] border px-4 py-1.5 text-[13px] font-semibold"
              style={{
                backgroundColor: mode === "cu-fibre" ? "#A8DCD1" : "#FFFFFF",
                color: "#0F6E56",
                borderColor: "#A8DCD1",
                opacity: isReadOnlyPreview ? 0.6 : 1,
              }}
            >
              🥦 Plan cu Fibre
            </button>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="rounded-[20px] bg-[#D4849A] px-3.5 py-1 text-[12px] text-white"
              disabled={isReadOnlyPreview}
              style={{ opacity: isReadOnlyPreview ? 0.6 : 1 }}
              onClick={() => setWeekSeedOffset((v) => v + 1)}
            >
              Regenerează 🔄
            </button>
          </div>
        </header>

        <section className="mt-5">
          {DAY_NAMES.map((dayName, dayIndex) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + dayIndex);
            const isToday = isSameDay(dayDate, todayStart);
            const dayMeals = weekPlan[dayIndex] ?? [];

            return (
              <div
                key={`${weekKey}-${dayIndex}`}
                className="mb-3 rounded-[16px] bg-white p-4"
                style={{
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: isToday ? "2px solid #A8DCD1" : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#3D2C3E]"
                    style={{
                      backgroundColor: isToday ? "#F4B4C4" : "#EDE7F6",
                    }}
                  >
                    {DAY_LETTERS[dayIndex]}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-bold text-[#3D2C3E]">
                      {dayName}
                    </p>
                    {isToday ? (
                      <span
                        className="rounded-[20px] px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: "#E8F8F5",
                          color: "#A8DCD1",
                          padding: "2px 8px",
                        }}
                      >
                        — AZI
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#B8A9BB]">
                  Pe feluri ({headerText})
                </p>
                <div className="mt-1">
                  {dayMeals.map((slot, rowIdx) => {
                    const isLast = rowIdx === dayMeals.length - 1;
                    const recipe = slot.recipe;
                    const recipeName = recipe?.name ?? "Nicio rețetă disponibilă";

                    return (
                      <div
                        key={`${slot.mealType}-${slot.mealIndex}`}
                        className={`py-2 ${isLast ? "" : "border-b border-[#F5F0F8]"}`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left"
                            onClick={() => {
                              if (recipe) {
                                router.push(`/retete/${recipe.id}`);
                              }
                            }}
                            disabled={!recipe}
                          >
                            <span className="w-12 shrink-0 text-[12px] text-[#B0A0B8]">
                              {MEAL_TIME_LABEL[slot.mealType] ?? ""}
                            </span>
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[20px] leading-none"
                              style={{ backgroundColor: "#FFF0F5" }}
                            >
                              {recipe?.emoji ?? "—"}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wide text-[#D4849A]"
                              >
                                {MEAL_CHIP_LABEL[slot.mealType] ?? slot.mealType}
                              </span>
                              <div className="flex min-w-0 flex-1 items-center">
                                <span
                                  className="min-w-0"
                                  title={recipeName}
                                  style={{
                                    whiteSpace: "normal",
                                    overflow: "visible",
                                    textOverflow: "unset",
                                    maxWidth: "200px",
                                    lineHeight: "1.3",
                                    fontSize: "13px",
                                    color: "#3D2C3E",
                                    fontWeight: 500,
                                  }}
                                >
                                  {recipeName}
                                </span>
                                {recipe
                                  ? (() => {
                                      const tags = getRecipeTags(recipe);
                                      return (
                                        <span
                                          style={{
                                            display: "flex",
                                            gap: 2,
                                            marginLeft: 4,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {tags.includes("low-budget") && (
                                            <span style={{ fontSize: 10 }}>💰</span>
                                          )}
                                          {tags.includes("cu-fibre") && (
                                            <span style={{ fontSize: 10 }}>🥦</span>
                                          )}
                                          {tags.includes("dulce") && (
                                            <span style={{ fontSize: 10 }}>🍬</span>
                                          )}
                                        </span>
                                      );
                                    })()
                                  : null}
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="shrink-0 cursor-pointer border-0 bg-transparent p-1 text-[14px] leading-none"
                            style={{
                              color: "#C4B5E0",
                              opacity: isReadOnlyPreview ? 0.6 : 1,
                            }}
                            aria-label="Alege altă rețetă"
                            disabled={isReadOnlyPreview}
                            onClick={(e) => {
                              if (isReadOnlyPreview) return;
                              e.stopPropagation();
                              openAlternatives({
                                weekKey,
                                dayIndex,
                                mealIndex: slot.mealIndex,
                                mealType: slot.mealType,
                                currentId: recipe?.id ?? null,
                              });
                            }}
                          >
                            ✏️
                          </button>
                        </div>
                        {recipe ? (
                          <p className="mt-1.5 pl-[84px] pr-2 text-[10px] leading-snug text-[#0F6E56]">
                            {formatRecipePortionLineRo(recipe, effectiveAgeMonths)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <p className="mt-4 text-center text-[12px] italic text-[#8B7A8E] leading-relaxed">
          Planul este generat automat pe baza vârstei bebelușului și a rețetelor
          disponibile.
        </p>
      </main>

      {sheet ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/25"
          role="presentation"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full max-w-[393px] rounded-t-[24px] bg-white p-5"
            style={{ fontFamily: '"Nunito", sans-serif' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="plan-sheet-title"
          >
            <p
              id="plan-sheet-title"
              className="text-[16px] font-bold text-[#3D2C3E]"
            >
              Alege altă rețetă
            </p>
            <ul className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
              {sheetAlternatives.length === 0 ? (
                <li className="text-[14px] text-[#8B7A8E]">
                  Nu există alte rețete pentru acest tip de masă.
                </li>
              ) : (
                sheetAlternatives.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-[#EDE7F6] px-3 py-3 text-left"
                      onClick={() => selectAlternative(r)}
                    >
                      <span className="text-[22px] leading-none">{r.emoji}</span>
                      <span className="text-[14px] font-medium text-[#3D2C3E]">
                        {r.name}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="mt-4 w-full cursor-pointer rounded-full border border-[#EDE7F6] py-2 text-[14px] font-semibold text-[#8B7A8E]"
              onClick={() => setSheet(null)}
            >
              Anulează
            </button>
          </div>
        </div>
      ) : null}

      <Navbar activeTab="plan" />
    </div>
  );
}
