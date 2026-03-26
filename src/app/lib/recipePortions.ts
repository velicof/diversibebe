import { parseDate } from "./store";
import type { AgeBandId, RecipeCatalogItem } from "./recipesDatabase";

/** Porție fixă pentru bebeluș (g preparat) — simplu, fără formule pe vârstă. */
export const FIXED_BABY_PORTION_GRAMS = 38;

/** @deprecated Păstrat pentru compatibilitate tipuri; toate benzile folosesc aceeași porție. */
export const DEFAULT_BABY_PORTION_GRAMS: Record<AgeBandId, number> = {
  "4-6": FIXED_BABY_PORTION_GRAMS,
  "6-8": FIXED_BABY_PORTION_GRAMS,
  "8-10": FIXED_BABY_PORTION_GRAMS,
  "10-12": FIXED_BABY_PORTION_GRAMS,
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

/** Porție bebeluș fixă ~38 g (parametrul de vârstă e ignorat pentru afișare). */
export function getBabyPortionGrams(
  _recipe: RecipeCatalogItem,
  _ageMonths?: number
): number {
  return FIXED_BABY_PORTION_GRAMS;
}

/** Câte porții de ~38 g ies din preparatul total. */
export function getApproxBabyServingsRatio(recipe: RecipeCatalogItem): number {
  const total = inferTotalYieldGrams(recipe);
  const portion = FIXED_BABY_PORTION_GRAMS;
  if (portion <= 0) return 1;
  return total / portion;
}

/** Porții bebe rotunjite (număr întreg, minim 1). */
export function getApproxBabyServingsRounded(recipe: RecipeCatalogItem): number {
  const ratio = getApproxBabyServingsRatio(recipe);
  return Math.max(1, Math.round(ratio));
}

export function formatApproxBabyServingsRo(recipe: RecipeCatalogItem): string {
  const n = getApproxBabyServingsRounded(recipe);
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
  _recipe: RecipeCatalogItem,
  _ageMonths?: number
): string {
  return `Porție ~${FIXED_BABY_PORTION_GRAMS} g`;
}

export function formatRecipeCardHintRo(recipe: RecipeCatalogItem): string {
  const n = getApproxBabyServingsRounded(recipe);
  return `~${FIXED_BABY_PORTION_GRAMS} g · ~${n} porții`;
}
