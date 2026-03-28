import { parseDate } from "./store";
import type { AgeBandId, RecipeCatalogItem } from "./recipesDatabase";

export const BABY_PORTIONS: Record<string, Record<string, number>> = {
  "6-8": { pranz: 60, "mic-dejun": 0, cina: 0, gustare: 35 },
  "7-8": { pranz: 90, "mic-dejun": 70, cina: 0, gustare: 35 },
  "8-10": { pranz: 145, "mic-dejun": 120, cina: 100, gustare: 45 },
  "10-12": { pranz: 165, "mic-dejun": 130, cina: 120, gustare: 55 },
};

export function ageMonthsToAgeBand(ageMonths: number): AgeBandId {
  if (ageMonths < 8) return "6-8";
  if (ageMonths < 10) return "8-10";
  return "10-12";
}

export function ageBandLabelRo(band: AgeBandId): string {
  const m: Record<AgeBandId, string> = {
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
function firstPositiveRecipeBandGrams(recipe: RecipeCatalogItem): number {
  const m = recipe.babyPortionGramsByAgeBand;
  if (!m) return 0;
  const order: AgeBandId[] = ["6-8", "8-10", "10-12"];
  for (const k of order) {
    const v = m[k];
    if (typeof v === "number" && v > 0) return v;
  }
  for (const v of Object.values(m)) {
    if (typeof v === "number" && v > 0) return v;
  }
  return 0;
}

function maxPositiveFromPortionTable(bandKey: string): number {
  const p = BABY_PORTIONS[bandKey];
  if (!p) return 0;
  let max = 0;
  for (const v of Object.values(p)) {
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

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
  ageMonths?: number
): number {
  const months = typeof ageMonths === "number" ? ageMonths : 8;
  const babyBand = ageMonthsToAgeBand(months);

  const exact = recipe.babyPortionGramsByAgeBand?.[babyBand];
  if (typeof exact === "number" && exact > 0) return exact;

  const bandFallback: AgeBandId[] =
    babyBand === "6-8"
      ? ["6-8", "8-10", "10-12"]
      : babyBand === "8-10"
        ? ["8-10", "6-8", "10-12"]
        : ["10-12", "8-10", "6-8"];
  for (const b of bandFallback) {
    const g = recipe.babyPortionGramsByAgeBand?.[b];
    if (typeof g === "number" && g > 0) return g;
  }

  const tableBand =
    months >= 10 ? "10-12" : months >= 8 ? "8-10" : months >= 7 ? "7-8" : "6-8";
  const portions = BABY_PORTIONS[tableBand];
  let grams = portions?.[recipe.mealType] ?? 0;
  if (grams <= 0 && portions) {
    grams = maxPositiveFromPortionTable(tableBand);
  }

  if (grams <= 0) {
    grams = firstPositiveRecipeBandGrams(recipe);
  }

  if (grams <= 0) {
    grams = 80;
  }

  return grams;
}

export function getApproxBabyServingsRatio(
  recipe: RecipeCatalogItem,
  ageMonths?: number
): number {
  const total = inferTotalYieldGrams(recipe);
  const portion = getBabyPortionGrams(recipe, ageMonths);
  if (portion <= 0) return 1;
  return total / portion;
}

/** Porții bebe rotunjite (număr întreg, minim 1). */
export function getApproxBabyServingsRounded(
  recipe: RecipeCatalogItem,
  ageMonths?: number
): number {
  const ratio = getApproxBabyServingsRatio(recipe, ageMonths);
  return Math.max(1, Math.round(ratio));
}

export function formatApproxBabyServingsRo(
  recipe: RecipeCatalogItem,
  ageMonths?: number
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
  ageMonths?: number
): string {
  const raw = getBabyPortionGrams(recipe, ageMonths);
  const grams = raw > 0 ? raw : 80;
  return `Porție ~${grams} g orientativ`;
}

export function formatRecipeCardHintRo(
  recipe: RecipeCatalogItem,
  ageMonths?: number
): string {
  const n = getApproxBabyServingsRounded(recipe, ageMonths);
  const grams = getBabyPortionGrams(recipe, ageMonths);
  return `~${grams} g orientativ · ~${n} porții`;
}
