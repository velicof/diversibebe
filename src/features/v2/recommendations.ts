import { normalize } from "./review";
import type { Recipe } from "./catalog";
import { seasonalScore } from "./season";

export type Filters = {
  months: number;
  ingredientIds: string[];
  maxMinutes: number;
  query: string;
  meal: string;
  favoritesOnly: boolean;
  /** EU allergen names to leave out of the results. */
  excludedAllergens: string[];
  /** Only recipes with produce that is fresh and local this month. */
  inSeason: boolean;
};
export type RecommendationContext = {
  mode: "preview" | "live";
  favorites: string[];
  introduced: string[];
  used: string[];
  excludedIngredients: string[];
  requiresClinicalGuidance: boolean;
  /** Month 1-12 (Europe/Bucharest). When set, in-season produce breaks ties only. */
  month?: number;
};
export const initialFilters: Filters = {
  months: 8,
  ingredientIds: [],
  maxMinutes: 30,
  query: "",
  meal: "all",
  favoritesOnly: false,
  excludedAllergens: [],
  inSeason: false,
};
/** "Oricât" in the time filter: also includes recipes prepared ahead (overnight). */
export const ANY_DURATION = 999;
/** Eligibility runs before scoring and can never be relaxed by a preference. */
export function recommend(
  recipes: Recipe[],
  filters: Filters,
  context: RecommendationContext,
): Recipe[] {
  if (context.requiresClinicalGuidance) return [];
  const query = normalize(filters.query).trim();
  const eligible = recipes.filter((r) => {
    if (
      r.published === false ||
      r.automaticReview.status !== "no-automatic-issues" ||
      r.minimumMonths > filters.months ||
      (filters.maxMinutes !== ANY_DURATION && (r.minutes === null || r.minutes > filters.maxMinutes))
    )
      return false;
    if (filters.excludedAllergens.some((a) => r.allergens.includes(a as never))) return false;
    if (filters.inSeason && context.month && !r.seasonMonths.includes(context.month)) return false;
    if (context.excludedIngredients.some((id) => r.ingredientIds.includes(id)))
      return false;
    if (filters.favoritesOnly && !context.favorites.includes(r.id))
      return false;
    if (filters.meal !== "all" && r.mealType !== filters.meal) return false;
    if (
      query &&
      !normalize(r.name + " " + r.ingredients.join(" ")).includes(query)
    )
      return false;
    return (
      filters.ingredientIds.length === 0 ||
      filters.ingredientIds.some((id) => r.ingredientIds.includes(id))
    );
  });
  const score = (r: Recipe) =>
    r.ingredientIds.filter((id) => filters.ingredientIds.includes(id)).length *
      20 +
    r.ingredientIds.filter((id) => context.introduced.includes(id)).length * 2 +
    Number(context.favorites.includes(r.id)) * 4 +
    Number(context.used.includes(r.id)) * 3 +
    // Priority 6 of 7: capped so it never outweighs safety, stage, ingredients, time or preferences.
    (context.month
      ? Math.max(-1, Math.min(1.5, seasonalScore(r.ingredients, context.month)))
      : 0);
  const scores = new Map(eligible.map((r) => [r.id, score(r)]));
  return eligible.sort(
    (a, b) =>
      scores.get(b.id)! - scores.get(a.id)! ||
      (a.minutes ?? 0) - (b.minutes ?? 0) ||
      a.id.localeCompare(b.id),
  );
}
