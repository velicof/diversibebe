"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { getRecipes } from "./store";
import type { RecipeCatalogItem } from "./recipesDatabase";
import { calendarMonthsFromBirthdateString } from "./recipePortions";
import { FOODS_DATABASE } from "./foodsDatabase";
import { useStoreRefresh } from "./useStoreRefresh";

/** Minim numeric din câmpul `age` al rețetei (ex. „8+ luni” → 8), aliniat cu pagina Rețete. */
function extractMinAge(ageStr: string): number {
  const match = ageStr.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 99;
}

/** Filtrare cumulativă după vârstă: rețeta e potrivită dacă pragul ei minim ≤ vârsta bebelușului în luni. */
function recipeEligibleForBabyAge(recipe: RecipeCatalogItem, babyAgeMonths: number): boolean {
  return extractMinAge(recipe.age) <= babyAgeMonths;
}

export function formatRecommendedFoodName(foodId: string): string {
  const f = FOODS_DATABASE.find((x) => x.id === foodId);
  return f?.name ?? foodId.replace(/-/g, " ");
}

function scoreRecipe(
  recipe: RecipeCatalogItem,
  triedFoodsSet: Set<string>
): { score: number; newIngredient: string | null } {
  const related = recipe.relatedFoods ?? [];
  if (related.length === 0) {
    return { score: 5, newIngredient: null };
  }
  const known = related.filter((f) => triedFoodsSet.has(f.toLowerCase()));
  const unknown = related.filter((f) => !triedFoodsSet.has(f.toLowerCase()));

  if (unknown.length === 1) return { score: 100, newIngredient: unknown[0] };
  if (unknown.length === 0 && known.length > 0) return { score: 60, newIngredient: null };
  if (unknown.length === 2) return { score: 30, newIngredient: null };
  return { score: Math.max(0, 10 - unknown.length * 3), newIngredient: null };
}

function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type RecommendedRecipeItem = {
  recipe: RecipeCatalogItem;
  score: number;
  newIngredient: string | null;
};

function orderRecommended(items: RecommendedRecipeItem[]): RecommendedRecipeItem[] {
  const b100 = shuffleArray(items.filter((x) => x.score === 100));
  const b60 = shuffleArray(items.filter((x) => x.score === 60));
  const bRest = items.filter((x) => x.score !== 100 && x.score !== 60);
  bRest.sort((a, b) => b.score - a.score);
  let i = 0;
  while (i < bRest.length) {
    const sc = bRest[i].score;
    let j = i + 1;
    while (j < bRest.length && bRest[j].score === sc) j++;
    const chunk = shuffleArray(bRest.slice(i, j));
    for (let k = 0; k < chunk.length; k++) bRest[i + k] = chunk[k];
    i = j;
  }
  return [...b100, ...b60, ...bRest];
}

export function useRecommendedRecipes(): {
  loading: boolean;
  canShow: boolean;
  babyName: string;
  items: RecommendedRecipeItem[];
} {
  const { userId } = useUser();
  const storeVersion = useStoreRefresh();
  const [loading, setLoading] = useState(false);
  const [canShow, setCanShow] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [items, setItems] = useState<RecommendedRecipeItem[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setCanShow(false);
      setBabyName("");
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const supabase = createClient();
      const { data: baby } = await supabase
        .from("babies")
        .select("id, name, birthdate")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (!baby?.id) {
        if (!cancelled) {
          setLoading(false);
          setCanShow(false);
          setBabyName("");
          setItems([]);
        }
        return;
      }

      const nameTrim = (baby.name ?? "").trim();
      if (!cancelled) setBabyName(nameTrim);

      const { data: triedRows, error: triedError } = await supabase
        .from("tried_foods")
        .select("food_name, food_id")
        .eq("baby_id", baby.id);

      if (cancelled) return;

      if (triedError || !triedRows || triedRows.length < 3) {
        if (!cancelled) {
          setLoading(false);
          setCanShow(false);
          setItems([]);
        }
        return;
      }

      if (!cancelled) setCanShow(true);

      const triedFoodsSet = new Set<string>();
      for (const row of triedRows) {
        if (row.food_name) {
          triedFoodsSet.add(String(row.food_name).toLowerCase().trim());
        }
        if (row.food_id) {
          triedFoodsSet.add(String(row.food_id).toLowerCase().trim());
        }
      }

      const ageMonths = baby.birthdate ? calendarMonthsFromBirthdateString(baby.birthdate) : 0;
      const allRecipes = getRecipes();
      const ageFiltered = allRecipes.filter((r) => recipeEligibleForBabyAge(r, ageMonths));

      const scored: RecommendedRecipeItem[] = ageFiltered.map((recipe) => {
        const { score, newIngredient } = scoreRecipe(recipe, triedFoodsSet);
        return { recipe, score, newIngredient };
      });

      const hasPositive = scored.some((s) => s.score > 0);
      let ordered: RecommendedRecipeItem[];
      if (!hasPositive) {
        ordered = shuffleArray(
          ageFiltered.map((recipe) => ({
            recipe,
            score: 0,
            newIngredient: null as string | null,
          }))
        );
      } else {
        ordered = orderRecommended(scored);
      }

      const top = ordered.slice(0, 10);

      if (cancelled) return;
      setItems(top);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, storeVersion]);

  return { loading, canShow, babyName, items };
}
