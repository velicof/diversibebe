import { planKey, type AppState, type PlanEntry } from "../model";

type RecipeFacts = { id: string; published: boolean; minimumMonths: number };
export type GuestImport = {
  favorites: string[];
  plan: PlanEntry[];
  /** Ideas and planned meals left out because they do not suit the child of this account. */
  skipped: number;
  /** Days that already hold another meal in the account: the account keeps its own. */
  kept: number;
};

/**
 * What a visitor's choices on this device would add to an account. Additive: nothing already in the
 * account is replaced. Choices made as a visitor may be for another age, so an idea or a meal enters the
 * account only if it suits the stage of the account's child; the server does not know the age of a recipe.
 */
export function importableFromGuest(
  local: Pick<AppState, "favorites" | "plan">,
  account: Pick<AppState, "favorites" | "plan" | "stage">,
  requiresClinicalGuidance: boolean,
  recipes: RecipeFacts[],
  today: string,
  /** Recipes this child must not get automatically (recorded allergies, or doubt about them). */
  unsuitable: (recipeId: string) => boolean = () => false,
): GuestImport {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const suits = (recipe: RecipeFacts) =>
    !requiresClinicalGuidance && account.stage >= 6 && recipe.published && recipe.minimumMonths <= account.stage && !unsuitable(recipe.id);
  const favorites: string[] = [];
  let skipped = 0;
  for (const id of local.favorites) {
    const recipe = byId.get(id);
    if (!recipe || account.favorites.includes(id)) continue;
    if (suits(recipe)) favorites.push(id);
    else skipped++;
  }
  // A day and meal already planned in the account stays the account's; other meals of that day can be added.
  const taken = new Map(account.plan.map((p) => [planKey(p), p.recipeId]));
  const plan: GuestImport["plan"] = [];
  let kept = 0;
  for (const { slot, meal, recipeId } of local.plan) {
    if (slot < today) continue;
    const recipe = byId.get(recipeId);
    if (!recipe) continue;
    const key = planKey({ slot, meal });
    const existing = taken.get(key);
    if (existing !== undefined) {
      if (existing !== recipeId) kept++;
      continue;
    }
    if (!suits(recipe)) {
      skipped++;
      continue;
    }
    taken.set(key, recipeId);
    plan.push({ slot, meal, recipeId });
  }
  return { favorites, plan, skipped, kept };
}
