import type { AppState } from "../model";

type RecipeFacts = { id: string; published: boolean; minimumMonths: number };
export type GuestImport = {
  favorites: string[];
  plan: { slot: string; recipeId: string }[];
  /** Planned meals left out because they do not suit the child of this account. */
  skipped: number;
};

/**
 * What a visitor's choices on this device would add to an account. Additive: nothing already in the
 * account is replaced. A plan made as a visitor may be for another age, so a meal enters the account only
 * if it suits the stage of the account's child; the server does not know the age of a recipe.
 */
export function importableFromGuest(
  local: Pick<AppState, "favorites" | "plan">,
  account: Pick<AppState, "favorites" | "plan" | "stage">,
  requiresClinicalGuidance: boolean,
  recipes: RecipeFacts[],
  today: string,
): GuestImport {
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const favorites = local.favorites.filter((id) => byId.has(id) && !account.favorites.includes(id));
  const taken = new Set(account.plan.map((p) => p.slot));
  const plan: GuestImport["plan"] = [];
  let skipped = 0;
  for (const { slot, recipeId } of local.plan) {
    if (slot < today || taken.has(slot)) continue;
    const recipe = byId.get(recipeId);
    if (!recipe) continue;
    if (requiresClinicalGuidance || account.stage < 6 || !recipe.published || recipe.minimumMonths > account.stage) {
      skipped++;
      continue;
    }
    taken.add(slot);
    plan.push({ slot, recipeId });
  }
  return { favorites, plan, skipped };
}
