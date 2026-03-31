"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/useUser";
import Navbar from "../components/Navbar";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  getAllFoods,
  getCurrentUser,
  getRecipeById,
  getRecipes,
  TRIED_FOODS_UPDATED_EVENT,
  type FoodEntry,
  type TriedFoodsOptimisticDetail,
} from "../lib/store";
import type { FoodCatalogItem } from "../lib/store";
import type { RecipeCatalogItem } from "../lib/recipesDatabase";

const SYMPTOM_OPTIONS = [
  "Roșeață",
  "Erupție",
  "Vărsături",
  "Diaree",
  "Umflături",
  "Nicio reacție",
];

const REACTION_OPTIONS: Array<{
  key: NonNullable<FoodEntry["reaction"]>;
  label: string;
  emoji: string;
}> = [
  { key: "loved", label: "A adorat", emoji: "😍" },
  { key: "ok", label: "Ok", emoji: "😊" },
  { key: "disliked", label: "Nu a plăcut", emoji: "😕" },
  { key: "refused", label: "A refuzat", emoji: "🙅" },
];

const MOOD_OPTIONS: Array<{
  key: NonNullable<FoodEntry["babyMood"]>;
  label: string;
  emoji: string;
}> = [
  { key: "normal", label: "Normal", emoji: "😊" },
  { key: "fericit", label: "Fericit", emoji: "😄" },
  { key: "obosit", label: "Obosit", emoji: "😴" },
  { key: "agitat", label: "Agitat", emoji: "😣" },
];

type Selection =
  | {
      kind: "food";
      food: FoodCatalogItem;
    }
  | {
      kind: "recipe";
      recipe: RecipeCatalogItem;
    };

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const mapReaction = (r: string | null): string | null => {
  if (!r) return null;
  const map: Record<string, string> = {
    loved: "pozitiv",
    ok: "neutru",
    disliked: "negativ",
    refused: "negativ",
  };
  return map[r] ?? r;
};

function JurnalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useUser();

  const paramFoodId = searchParams.get("foodId");
  const paramFoodName = searchParams.get("foodName");
  const paramEmoji = searchParams.get("emoji");

  const fromParams = useMemo(() => {
    if (!paramFoodId || !paramFoodName) return null;
    return {
      foodId: paramFoodId,
      foodName: decodeURIComponent(paramFoodName),
      emoji: paramEmoji ? decodeURIComponent(paramEmoji) : "🍽️",
    };
  }, [paramFoodId, paramFoodName, paramEmoji]);

  const [pickerTab, setPickerTab] = useState<"food" | "recipe">("food");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);

  const [dateStr, setDateStr] = useState(todayISO);
  const [timeStr, setTimeStr] = useState(nowTime);
  const [reaction, setReaction] = useState<FoodEntry["reaction"]>(null);
  const [quantityGrams, setQuantityGrams] = useState("");
  const [portion, setPortion] = useState<FoodEntry["portion"]>(null);
  const [babyMood, setBabyMood] = useState<FoodEntry["babyMood"]>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<null | "success" | "auth">(null);

  const babyName = getCurrentUser()?.baby.name?.trim() || "bebe";
  const foods = useMemo(() => getAllFoods(), []);
  const recipes = useMemo(() => getRecipes(), []);

  useEffect(() => {
    if (!fromParams) return;
    const catalog = foods.find((f) => f.id === fromParams.foodId);
    if (catalog) {
      setSelection({ kind: "food", food: catalog });
      return;
    }
    const rec = getRecipeById(fromParams.foodId);
    if (rec) {
      setSelection({
        kind: "recipe",
        recipe: rec,
      });
      return;
    }
    setSelection({
      kind: "food",
      food: {
        id: fromParams.foodId,
        name: fromParams.foodName,
        emoji: fromParams.emoji,
      } as FoodCatalogItem,
    });
  }, [fromParams, foods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods.slice(0, 6);
    return foods
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [foods, search]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes.slice(0, 6);
    return recipes
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [recipes, search]);

  const toggleSymptom = useCallback((value: string) => {
    setSymptoms((prev) => {
      if (value === "Nicio reacție") {
        return prev.includes(value) ? [] : [value];
      }
      const without = prev.filter((s) => s !== "Nicio reacție");
      if (without.includes(value)) return without.filter((s) => s !== value);
      return [...without, value];
    });
  }, []);

  const displayTitle =
    selection?.kind === "food"
      ? selection.food.name
      : selection?.kind === "recipe"
        ? selection.recipe.name
        : "";
  const displayEmoji =
    selection?.kind === "food"
      ? selection.food.emoji
      : selection?.kind === "recipe"
        ? selection.recipe.emoji
        : "";

  const handleSave = async () => {
    if (!selection || reaction === null) return;
    const entry: FoodEntry =
      selection.kind === "food"
        ? {
            id: Date.now().toString(),
            type: "food",
            foodId: selection.food.id,
            foodName: selection.food.name,
            emoji: selection.food.emoji,
            date: dateStr,
            time: timeStr,
            reaction,
            portion,
            symptoms,
            notes: notes.trim(),
            babyMood,
          }
        : {
            id: Date.now().toString(),
            type: "recipe",
            foodId: selection.recipe.id,
            foodName: selection.recipe.name,
            emoji: selection.recipe.emoji,
            recipeId: selection.recipe.id,
            recipeName: selection.recipe.name,
            date: dateStr,
            time: timeStr,
            reaction,
            portion,
            symptoms,
            notes: notes.trim(),
            babyMood,
          };
    if (!userId) {
      alert("Autentifică-te pentru a salva jurnalul");
      return;
    }

    const parts = dateStr.split("-").map(Number);
    const selectedDate =
      parts.length === 3 && parts.every((n) => !Number.isNaN(n))
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      alert("Nu poți jurnaliza mese în viitor!");
      return;
    }

    const loggedAt = (() => {
      try {
        const d = new Date(`${dateStr}T${timeStr}:00`);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {
        /* ignore */
      }
      return new Date().toISOString();
    })();

    const { error: journalError } = await supabaseClient
      .from("food_journal")
      .insert({
        user_id: userId,
        baby_id: null,
        food_id: entry.foodId,
        food_name: entry.foodName,
        meal_type: null,
        reaction: mapReaction(entry.reaction),
        notes: entry.notes || null,
        logged_at: loggedAt,
        symptoms: entry.symptoms || [],
        portion: entry.portion || null,
        baby_mood: entry.babyMood || null,
        quantity_grams: quantityGrams.trim()
          ? Number.parseInt(quantityGrams, 10)
          : null,
      });

    if (journalError) {
      console.error("food_journal insert error:", journalError);
      alert("Eroare la salvare: " + journalError.message);
      return;
    }

    if (
      entry.symptoms.length > 0 &&
      !entry.symptoms.includes("Nicio reacție")
    ) {
      const severity =
        entry.symptoms.includes("Erupție") || entry.symptoms.includes("Vărsături")
          ? "severa"
          : "usoara";
      const { error: allergyErr } = await supabaseClient
        .from("allergy_records")
        .insert({
          user_id: userId,
          baby_id: null,
          food_id: entry.foodId,
          food_name: entry.foodName,
          severity,
          notes: entry.symptoms.join(", "),
          recorded_at: new Date().toISOString(),
        });
      if (allergyErr) console.error("allergy_records insert error:", allergyErr);
    }

    if (entry.type === "food") {
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabaseClient
        .from("tried_foods")
        .select("id, try_count, first_tried_at")
        .eq("user_id", userId)
        .eq("food_id", entry.foodId)
        .maybeSingle();

      let detail: TriedFoodsOptimisticDetail | null = null;

      if (existing) {
        const nextCount = Number(existing.try_count ?? 0) + 1;
        const { error: triedError } = await supabaseClient
          .from("tried_foods")
          .update({ try_count: nextCount })
          .eq("id", existing.id);
        if (triedError) {
          console.error("tried_foods error:", triedError);
        } else {
          detail = {
            food_id: entry.foodId,
            food_name: entry.foodName,
            try_count: nextCount,
            first_tried_at: existing.first_tried_at ?? nowIso,
          };
        }
      } else {
        const { error: triedError } = await supabaseClient
          .from("tried_foods")
          .insert({
            user_id: userId,
            baby_id: null,
            food_id: entry.foodId,
            food_name: entry.foodName,
            first_tried_at: nowIso,
            try_count: 1,
          });
        if (triedError) {
          console.error("tried_foods error:", triedError);
        } else {
          detail = {
            food_id: entry.foodId,
            food_name: entry.foodName,
            try_count: 1,
            first_tried_at: nowIso,
          };
        }
      }

      if (detail && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<TriedFoodsOptimisticDetail>(
            TRIED_FOODS_UPDATED_EVENT,
            { detail }
          )
        );
      }
    }

    setToast("success");
    window.setTimeout(() => {
      router.back();
    }, 1500);
  };

  const showPicker = !fromParams;

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        className="w-full max-w-[393px] px-6 pb-[152px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="flex items-center gap-3 pt-6">
          <button
            type="button"
            className="cursor-pointer leading-none shrink-0"
            style={{
              color: "#D4849A",
              fontSize: 20,
              padding: 8,
              background: "none",
              border: "none",
            }}
            aria-label="Înapoi"
            onClick={() => router.back()}
          >
            ←
          </button>
          <h1 className="text-[20px] font-extrabold text-[#3D2C3E]">
            Jurnalizare masă 📝
          </h1>
        </header>

        {showPicker ? (
          <section className="mt-5">
            <div
              className="flex gap-2 rounded-[20px] p-1"
              style={{ backgroundColor: "#EDE7F6" }}
            >
              <button
                type="button"
                onClick={() => {
                  setPickerTab("food");
                  setSearch("");
                }}
                className="flex-1 rounded-[20px] py-2 text-[13px] font-bold cursor-pointer"
                style={{
                  backgroundColor: pickerTab === "food" ? "#D4849A" : "transparent",
                  color: pickerTab === "food" ? "#FFFFFF" : "#3D2C3E",
                }}
              >
                🥕 Aliment
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerTab("recipe");
                  setSearch("");
                }}
                className="flex-1 rounded-[20px] py-2 text-[13px] font-bold cursor-pointer"
                style={{
                  backgroundColor: pickerTab === "recipe" ? "#D4849A" : "transparent",
                  color: pickerTab === "recipe" ? "#FFFFFF" : "#3D2C3E",
                }}
              >
                🍳 Rețetă
              </button>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                pickerTab === "recipe" ? "Caută rețetă..." : "Caută aliment..."
              }
              className="mt-3 w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
              style={{ backgroundColor: "#F5F0F8", color: "#3D2C3E" }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(pickerTab === "food" ? filteredFoods : filteredRecipes).map(
                (item) => (
                  <button
                    key={pickerTab === "food" ? item.id : (item as RecipeCatalogItem).id}
                    type="button"
                    onClick={() =>
                      pickerTab === "food"
                        ? setSelection({ kind: "food", food: item as FoodCatalogItem })
                        : setSelection({
                            kind: "recipe",
                            recipe: item as RecipeCatalogItem,
                          })
                    }
                    className="rounded-full border border-[#EDE7F6] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#3D2C3E] cursor-pointer"
                  >
                    <span className="mr-1">
                      {pickerTab === "food"
                        ? (item as FoodCatalogItem).emoji
                        : (item as RecipeCatalogItem).emoji}
                    </span>
                    {pickerTab === "food"
                      ? (item as FoodCatalogItem).name
                      : (item as RecipeCatalogItem).name}
                  </button>
                )
              )}
            </div>
          </section>
        ) : null}

        {selection ? (
          <section
            className="mt-5 flex items-center gap-3 rounded-[16px] px-4 py-3"
            style={{ backgroundColor: "#E8F8F5" }}
          >
            <span className="text-[40px] leading-none">{displayEmoji}</span>
            <p className="text-[18px] font-bold text-[#3D2C3E]">{displayTitle}</p>
          </section>
        ) : null}

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-[12px] font-semibold text-[#8B7A8E]">Data</p>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-[12px] border border-[#EDE7F6] bg-white px-3 py-2.5 text-[14px]"
            />
          </div>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-[#8B7A8E]">Ora</p>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="w-full rounded-[12px] border border-[#EDE7F6] bg-white px-3 py-2.5 text-[14px]"
            />
          </div>
        </section>

        <section className="mt-6">
          <p className="text-[14px] font-semibold text-[#3D2C3E]">
            Cum a reacționat {babyName}?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {REACTION_OPTIONS.map((option) => {
              const active = reaction === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setReaction(option.key)}
                  className="rounded-[12px] border p-3 text-left cursor-pointer"
                  style={{
                    borderColor: active ? "#D4849A" : "#EDE7F6",
                    background: active ? "#FFF0F5" : "#FFFFFF",
                  }}
                >
                  <div className="text-[20px]">{option.emoji}</div>
                  <div className="mt-1 text-[13px] font-semibold text-[#3D2C3E]">
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="text-[14px] font-semibold text-[#3D2C3E]">
            Cantitate mâncată (g)
          </p>
          <input
            type="number"
            min={1}
            max={500}
            value={quantityGrams}
            onChange={(e) => setQuantityGrams(e.target.value)}
            placeholder="ex: 150"
            className="mt-2 w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
            style={{ backgroundColor: "#F5F0F8", color: "#3D2C3E" }}
          />
        </section>

        <section className="mt-6">
          <p className="text-[14px] font-semibold text-[#3D2C3E]">
            Cum era {babyName} după masă?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MOOD_OPTIONS.map((option) => {
              const active = babyMood === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setBabyMood(option.key)}
                  className="rounded-[12px] border p-3 text-center cursor-pointer"
                  style={{
                    borderColor: active ? "#D4849A" : "#EDE7F6",
                    background: active ? "#FFF0F5" : "#FFFFFF",
                  }}
                >
                  <div className="text-[20px]">{option.emoji}</div>
                  <div className="mt-1 text-[12px] font-semibold text-[#3D2C3E]">
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="text-[14px] font-semibold text-[#3D2C3E]">
            A apărut vreo reacție?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((symptom) => {
              const active = symptoms.includes(symptom);
              const isNone = symptom === "Nicio reacție";
              return (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => toggleSymptom(symptom)}
                  className="rounded-full px-4 py-2 text-[12px] font-semibold cursor-pointer border"
                  style={{
                    borderColor: active
                      ? isNone
                        ? "#A8DCD1"
                        : "#E74C3C"
                      : "#EDE7F6",
                    background: active
                      ? isNone
                        ? "#E8F8F5"
                        : "#FFE5E5"
                      : "#F5F0F8",
                    color: active ? (isNone ? "#0F6E56" : "#E74C3C") : "#8B7A8E",
                  }}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <p className="text-[14px] font-semibold text-[#3D2C3E]">Note (opțional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex: a mâncat bine, puțină roșeată după 1 oră..."
            className="mt-2 w-full resize-none rounded-[12px] p-3 text-[14px] text-[#3D2C3E] outline-none"
            style={{ backgroundColor: "#F5F0F8" }}
          />
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selection || reaction === null}
          className={`mt-6 flex h-12 w-full items-center justify-center rounded-full font-bold text-white ${
            selection && reaction !== null ? "cursor-pointer bg-[#D4849A]" : "cursor-not-allowed opacity-50 bg-[#D4849A]"
          }`}
        >
          💾 Salvează
        </button>
      </main>

      {toast ? (
        <div
          className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-[14px] px-5 py-3 text-[14px] font-bold text-[#3D2C3E] shadow-lg"
          style={{
            backgroundColor: toast === "auth" ? "#FDE8EE" : "#A8DCD1",
          }}
        >
          {toast === "auth" ? "Autentifică-te pentru a salva" : "✅ Jurnalizat cu succes!"}
        </div>
      ) : null}

      <Navbar activeTab="acasa" />
    </div>
  );
}

export default function JurnalPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen w-full items-center justify-center bg-[#FFF8F6]"
          style={{ fontFamily: '"Nunito", sans-serif' }}
        >
          <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
        </div>
      }
    >
      <JurnalInner />
    </Suspense>
  );
}
