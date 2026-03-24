import { parseDate } from "./store";
import type { AgeBandId, RecipeCatalogItem } from "./recipesDatabase";

/** Porții implicite (g preparat) când rețeta nu are `babyPortionGramsByAgeBand`. */
/** Porții mici, realiste pentru o porție de bebeluș (g preparat). */
export const DEFAULT_BABY_PORTION_GRAMS: Record<AgeBandId, number> = {
  "4-6": 38,
  "6-8": 60,
  "8-10": 85,
  "10-12": 110,
};

export function ageMonthsToAgeBand(ageMonths: number): AgeBandId {
  if (ageMonths < 6) return "4-6";
  if (ageMonths < 8) return "6-8";
  if (ageMonths < 10) return "8-10";
  return "10-12";
}

export function ageBandLabelRo(band: AgeBandId): string {
  const m: Record<AgeBandId, string> = {
    "4-6": "4–6 luni",
    "6-8": "6–8 luni",
    "8-10": "8–10 luni",
    "10-12": "10–12 luni",
  };
  return m[band];
}

/** Citește vârsta în luni din `diversibebe_data` (profil bebeluș). */
export function readBabyAgeMonthsFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("diversibebe_data");
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      appState?: { currentUser?: { baby?: { birthDate?: string } } };
      currentUser?: { baby?: { birthDate?: string } };
    };
    const birthDate =
      data.appState?.currentUser?.baby?.birthDate ??
      data.currentUser?.baby?.birthDate;
    if (!birthDate || typeof birthDate !== "string") return null;
    const d = parseDate(birthDate.trim());
    if (!d || Number.isNaN(d.getTime())) return null;
    const months = Math.floor(
      (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    return Math.max(0, months);
  } catch {
    return null;
  }
}

/**
 * Estimează greutatea totală a preparatului (g) dacă nu e setată explicit.
 */
export function inferTotalYieldGrams(recipe: RecipeCatalogItem): number {
  if (
    typeof recipe.totalYieldGrams === "number" &&
    recipe.totalYieldGrams > 0
  ) {
    return recipe.totalYieldGrams;
  }
  if (typeof recipe.servings === "number" && recipe.servings > 0) {
    return Math.round(recipe.servings * 95);
  }
  switch (recipe.mealType) {
    case "mic-dejun":
      return 200;
    case "gustare":
      return 160;
    case "pranz":
    case "cina":
    default:
      return 280;
  }
}

export function getBabyPortionGrams(
  recipe: RecipeCatalogItem,
  ageMonths: number
): number {
  const band = ageMonthsToAgeBand(ageMonths);
  const custom = recipe.babyPortionGramsByAgeBand?.[band];
  if (typeof custom === "number" && custom > 0) return custom;
  return DEFAULT_BABY_PORTION_GRAMS[band];
}

/**
 * Raport între cantitatea totală și porția pentru vârstă (~ câte porții bebe).
 */
export function getApproxBabyServingsRatio(
  recipe: RecipeCatalogItem,
  ageMonths: number
): number {
  const total = inferTotalYieldGrams(recipe);
  const portion = getBabyPortionGrams(recipe, ageMonths);
  if (portion <= 0) return 1;
  return total / portion;
}

/** Porții bebe rotunjite (număr întreg, minim 1). */
export function getApproxBabyServingsRounded(
  recipe: RecipeCatalogItem,
  ageMonths: number
): number {
  const ratio = getApproxBabyServingsRatio(recipe, ageMonths);
  return Math.max(1, Math.round(ratio));
}

export function formatApproxBabyServingsRo(
  recipe: RecipeCatalogItem,
  ageMonths: number
): string {
  const n = getApproxBabyServingsRounded(recipe, ageMonths);
  return `~${n} porții pentru bebe din această rețetă`;
}

export function nutritionAgeKeyFromMonths(ageMonths: number): string {
  if (ageMonths < 5) return "4+";
  if (ageMonths < 6) return "5+";
  if (ageMonths < 7) return "6+";
  if (ageMonths < 8) return "7+";
  if (ageMonths < 10) return "8+";
  if (ageMonths < 12) return "10+";
  return "12+";
}

export function formatRecipePortionLineRo(
  recipe: RecipeCatalogItem,
  ageMonths: number
): string {
  const g = getBabyPortionGrams(recipe, ageMonths);
  const band = ageMonthsToAgeBand(ageMonths);
  return `Porție ~${g} g (${ageBandLabelRo(band)})`;
}

export function formatRecipeCardHintRo(
  recipe: RecipeCatalogItem,
  ageMonths: number
): string {
  const g = getBabyPortionGrams(recipe, ageMonths);
  const n = getApproxBabyServingsRounded(recipe, ageMonths);
  return `~${g} g · ~${n} porții`;
}
