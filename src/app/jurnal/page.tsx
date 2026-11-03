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
  type CustomRecipeIngredient,
  type FoodEntry,
  type TriedFoodsOptimisticDetail,
} from "../lib/store";
import type { FoodCatalogItem } from "../lib/store";
import type { RecipeCatalogItem } from "../lib/recipesDatabase";
import { searchByNameNormalized, searchFoods } from "@/lib/searchUtils";

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

type CustomRecipe = {
  id: string;
  name: string;
  ingredients: CustomRecipeIngredient[];
};

type Selection =
  | {
      kind: "food";
      food: FoodCatalogItem;
    }
  | {
      kind: "recipe";
      recipe: RecipeCatalogItem;
    }
  | {
      kind: "custom_recipe";
      recipe: CustomRecipe;
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

async function upsertTriedFoodForUser(
  userId: string,
  foodId: string,
  foodName: string
): Promise<TriedFoodsOptimisticDetail | null> {
  const nowIso = new Date().toISOString();
  const { data: existing } = await supabaseClient
    .from("tried_foods")
    .select("id, try_count, first_tried_at")
    .is("baby_id", null)
    .eq("user_id", userId)
    .eq("food_id", foodId)
    .order("first_tried_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const nextCount = Number(existing.try_count ?? 0) + 1;
    const { error: triedError } = await supabaseClient
      .from("tried_foods")
      .update({ try_count: nextCount })
      .eq("id", existing.id);
    if (triedError) {
      console.error("tried_foods error:", triedError);
      return null;
    }
    return {
      food_id: foodId,
      food_name: foodName,
      try_count: nextCount,
      first_tried_at: existing.first_tried_at ?? nowIso,
    };
  }

  const { error: triedError } = await supabaseClient.from("tried_foods").insert({
    user_id: userId,
    baby_id: null,
    food_id: foodId,
    food_name: foodName,
    first_tried_at: nowIso,
    try_count: 1,
  });
  if (triedError) {
    console.error("tried_foods error:", triedError);
    return null;
  }
  return {
    food_id: foodId,
    food_name: foodName,
    try_count: 1,
    first_tried_at: nowIso,
  };
}

async function insertAllergyForIngredient(
  userId: string,
  foodId: string,
  foodName: string,
  symptoms: string[]
): Promise<void> {
  const severity =
    symptoms.includes("Erupție") || symptoms.includes("Vărsături")
      ? "severa"
      : "usoara";
  const { error: allergyErr } = await supabaseClient.from("allergy_records").insert({
    user_id: userId,
    baby_id: null,
    food_id: foodId,
    food_name: foodName,
    severity,
    notes: symptoms.join(", "),
    recorded_at: new Date().toISOString(),
  });
  if (allergyErr) console.error("allergy_records insert error:", allergyErr);
}

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

  const [pickerTab, setPickerTab] = useState<"food" | "recipe" | "my_recipe">("food");
  const [search, setSearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
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
  const [customFoods, setCustomFoods] = useState<FoodCatalogItem[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFoodName, setCustomFoodName] = useState("");
  const [customFoodEmoji, setCustomFoodEmoji] = useState("🍽️");
  const [customRecipes, setCustomRecipes] = useState<CustomRecipe[]>([]);
  const [customRecipeName, setCustomRecipeName] = useState("");
  const [customRecipeIngredients, setCustomRecipeIngredients] = useState<
    CustomRecipeIngredient[]
  >([]);
  const [savingCustomRecipe, setSavingCustomRecipe] = useState(false);

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

  useEffect(() => {
    if (!userId) return;
    supabaseClient
      .from("custom_foods")
      .select("id, name, emoji")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setCustomFoods(
            data.map(
              (d) =>
                ({
                  id: d.id,
                  name: d.name,
                  emoji: d.emoji,
                }) as FoodCatalogItem
            )
          );
        }
      });

    supabaseClient
      .from("custom_recipes")
      .select("id, name, ingredients")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setCustomRecipes(
          data.map((row) => ({
            id: row.id,
            name: row.name,
            ingredients: Array.isArray(row.ingredients)
              ? (row.ingredients as CustomRecipeIngredient[])
              : [],
          }))
        );
      });
  }, [userId]);

  const allFoodsWithCustom = useMemo(
    () => [...foods, ...customFoods],
    [foods, customFoods]
  );

  const filteredFoods = useMemo(() => {
    const q = search.trim();
    if (!q) return allFoodsWithCustom.slice(0, 6);
    return searchFoods(allFoodsWithCustom, q).slice(0, 6);
  }, [allFoodsWithCustom, search]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim();
    if (!q) return recipes.slice(0, 6);
    return searchByNameNormalized(recipes, q).slice(0, 6);
  }, [recipes, search]);

  const filteredIngredientOptions = useMemo(() => {
    const q = ingredientSearch.trim();
    if (!q) return allFoodsWithCustom.slice(0, 6);
    return searchFoods(allFoodsWithCustom, q).slice(0, 6);
  }, [allFoodsWithCustom, ingredientSearch]);

  const filteredCustomRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customRecipes;
    return customRecipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [customRecipes, search]);

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
        : selection?.kind === "custom_recipe"
          ? selection.recipe.name
          : "";
  const displayEmoji =
    selection?.kind === "food"
      ? selection.food.emoji
      : selection?.kind === "recipe"
        ? selection.recipe.emoji
        : selection?.kind === "custom_recipe"
          ? "🍳"
          : "";
  const displaySubtitle =
    selection?.kind === "custom_recipe" && selection.recipe.ingredients.length > 0
      ? selection.recipe.ingredients.map((i) => i.name).join(", ")
      : null;

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
    const newFood: FoodCatalogItem = {
      id: customId,
      name: customFoodName.trim(),
      emoji: customFoodEmoji,
    } as FoodCatalogItem;
    setCustomFoods((prev) => [newFood, ...prev]);
    setSelection({ kind: "food", food: newFood });
    setShowCustomModal(false);
    setSearch("");
  };

  const addIngredientToRecipe = (food: FoodCatalogItem) => {
    setCustomRecipeIngredients((prev) => {
      if (prev.some((i) => i.id === food.id)) return prev;
      return [
        ...prev,
        { id: food.id, name: food.name, emoji: food.emoji || "🍽️" },
      ];
    });
    setIngredientSearch("");
  };

  const handleSaveCustomRecipe = async () => {
    if (!customRecipeName.trim() || customRecipeIngredients.length === 0 || !userId) {
      return;
    }
    setSavingCustomRecipe(true);
    try {
      const id = `custom_recipe_${Date.now()}`;
      const ingredients = customRecipeIngredients;
      const { error } = await supabaseClient.from("custom_recipes").insert({
        id,
        user_id: userId,
        name: customRecipeName.trim(),
        ingredients,
      });
      if (error) {
        alert("Eroare la salvare: " + error.message);
        return;
      }
      const recipe: CustomRecipe = {
        id,
        name: customRecipeName.trim(),
        ingredients,
      };
      setCustomRecipes((prev) => [recipe, ...prev]);
      setSelection({ kind: "custom_recipe", recipe });
      setCustomRecipeName("");
      setCustomRecipeIngredients([]);
      setIngredientSearch("");
    } finally {
      setSavingCustomRecipe(false);
    }
  };

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
        : selection.kind === "recipe"
          ? {
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
            }
          : {
              id: Date.now().toString(),
              type: "custom_recipe",
              foodId: selection.recipe.id,
              foodName: selection.recipe.name,
              emoji: "🍳",
              customRecipeId: selection.recipe.id,
              ingredients: selection.recipe.ingredients,
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
        custom_recipe_id:
          entry.type === "custom_recipe" ? entry.customRecipeId ?? entry.foodId : null,
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

    const hasAdverseSymptoms =
      entry.symptoms.length > 0 && !entry.symptoms.includes("Nicio reacție");

    if (entry.type === "custom_recipe" && entry.ingredients?.length) {
      for (const ingredient of entry.ingredients) {
        const detail = await upsertTriedFoodForUser(
          userId,
          ingredient.id,
          ingredient.name
        );
        if (detail && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent<TriedFoodsOptimisticDetail>(TRIED_FOODS_UPDATED_EVENT, {
              detail,
            })
          );
        }
        if (hasAdverseSymptoms) {
          await insertAllergyForIngredient(
            userId,
            ingredient.id,
            ingredient.name,
            entry.symptoms
          );
        }
      }
    } else if (hasAdverseSymptoms) {
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
      const detail = await upsertTriedFoodForUser(userId, entry.foodId, entry.foodName);
      if (detail && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<TriedFoodsOptimisticDetail>(TRIED_FOODS_UPDATED_EVENT, {
            detail,
          })
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
              className="flex gap-1 rounded-[20px] p-1"
              style={{ backgroundColor: "#EDE7F6" }}
            >
              <button
                type="button"
                onClick={() => {
                  setPickerTab("food");
                  setSearch("");
                }}
                className="flex-1 rounded-[20px] py-2 text-[11px] font-bold cursor-pointer"
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
                className="flex-1 rounded-[20px] py-2 text-[11px] font-bold cursor-pointer"
                style={{
                  backgroundColor: pickerTab === "recipe" ? "#D4849A" : "transparent",
                  color: pickerTab === "recipe" ? "#FFFFFF" : "#3D2C3E",
                }}
              >
                🍳 Rețetă
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerTab("my_recipe");
                  setSearch("");
                  setIngredientSearch("");
                }}
                className="flex-1 rounded-[20px] py-2 text-[11px] font-bold cursor-pointer"
                style={{
                  backgroundColor: pickerTab === "my_recipe" ? "#D4849A" : "transparent",
                  color: pickerTab === "my_recipe" ? "#FFFFFF" : "#3D2C3E",
                }}
              >
                ✏️ Rețeta mea
              </button>
            </div>

            {pickerTab === "my_recipe" ? (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#8B7A8E]">
                    Numele rețetei
                  </p>
                  <input
                    type="text"
                    value={customRecipeName}
                    onChange={(e) => setCustomRecipeName(e.target.value)}
                    placeholder='ex: Iaurt cu piersici'
                    className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
                    style={{ backgroundColor: "#F5F0F8", color: "#3D2C3E" }}
                  />
                </div>

                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#8B7A8E]">
                    Ingrediente
                  </p>
                  <input
                    type="search"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    placeholder="Caută aliment de adăugat..."
                    className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
                    style={{ backgroundColor: "#F5F0F8", color: "#3D2C3E" }}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {filteredIngredientOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addIngredientToRecipe(item)}
                        disabled={customRecipeIngredients.some((i) => i.id === item.id)}
                        className="rounded-full border border-[#EDE7F6] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#3D2C3E] cursor-pointer disabled:opacity-40"
                      >
                        <span className="mr-1">{item.emoji}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                {customRecipeIngredients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customRecipeIngredients.map((ing) => (
                      <span
                        key={ing.id}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                        style={{ background: "#FAEEDA", color: "#854F0B" }}
                      >
                        <span>{ing.emoji}</span>
                        {ing.name}
                        <button
                          type="button"
                          onClick={() =>
                            setCustomRecipeIngredients((prev) =>
                              prev.filter((i) => i.id !== ing.id)
                            )
                          }
                          className="ml-1 cursor-pointer border-0 bg-transparent text-[14px] leading-none"
                          style={{ color: "#854F0B" }}
                          aria-label={`Elimină ${ing.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-[#8B7A8E]">
                    Adaugă cel puțin un ingredient din catalog sau din alimentele tale.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleSaveCustomRecipe()}
                  disabled={
                    savingCustomRecipe ||
                    !customRecipeName.trim() ||
                    customRecipeIngredients.length === 0
                  }
                  className="w-full rounded-full py-3 text-[14px] font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#D4849A" }}
                >
                  {savingCustomRecipe ? "Se salvează..." : "Salvează rețeta"}
                </button>
              </div>
            ) : (
              <>
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

                {pickerTab === "recipe" && filteredCustomRecipes.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[12px] font-bold text-[#8B7A8E] uppercase tracking-wide">
                      Rețetele mele
                    </p>
                    <div className="flex flex-col gap-2">
                      {filteredCustomRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() =>
                            setSelection({ kind: "custom_recipe", recipe })
                          }
                          className="w-full rounded-[12px] border border-[#EDE7F6] bg-white px-3 py-2.5 text-left cursor-pointer"
                        >
                          <p className="text-[13px] font-bold text-[#3D2C3E]">
                            🍳 {recipe.name}
                          </p>
                          {recipe.ingredients.length > 0 ? (
                            <p className="mt-0.5 text-[11px] text-[#8B7A8E] truncate">
                              {recipe.ingredients
                                .map((i) => `${i.emoji} ${i.name}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pickerTab === "food" && search.trim().length > 1 && filteredFoods.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFoodName(search.trim());
                      setCustomFoodEmoji("🍽️");
                      setShowCustomModal(true);
                    }}
                    className="mt-3 w-full rounded-[14px] border-2 border-dashed border-[#D4849A] bg-white px-4 py-3 text-[13px] font-semibold text-[#D4849A] cursor-pointer text-left"
                  >
                    + Adaugă „{search.trim()}" ca aliment nou
                  </button>
                )}
              </>
            )}
          </section>
        ) : null}

        {selection ? (
          <section
            className="mt-5 flex items-center gap-3 rounded-[16px] px-4 py-3"
            style={{ backgroundColor: "#E8F8F5" }}
          >
            <span className="text-[40px] leading-none">{displayEmoji}</span>
            <div className="min-w-0">
              <p className="text-[18px] font-bold text-[#3D2C3E]">{displayTitle}</p>
              {displaySubtitle ? (
                <p className="mt-0.5 text-[12px] text-[#8B7A8E] truncate">{displaySubtitle}</p>
              ) : null}
              {selection.kind === "custom_recipe" ? (
                <p className="mt-0.5 text-[11px] font-semibold text-[#D4849A]">Rețeta mea</p>
              ) : null}
            </div>
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
              Salvează și selectează
            </button>
          </div>
        </div>
      )}

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
