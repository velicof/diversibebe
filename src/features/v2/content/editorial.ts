// Editorial decisions recorded from a SIGNED specialist review (docs/ai-ops/REVIEW-PACKAGE.md).
// Only a human pediatrician or registered dietitian can add an entry here; an AI evaluation never can
// (hasClinicalReview rejects AI reviewers). An entry is the ONLY way to reach specialist_approved.
import type { ClinicalReview, EditorialStatus } from "../review";

/** contentHash = recipeFingerprint(recipe) at review time; any later edit invalidates the review. */
export type EditorialRecord = { status: Extract<EditorialStatus, "specialist_approved" | "needs_specialist_review">; review: ClinicalReview; contentHash: string };

/** FNV-1a over everything a reviewer approves. Synchronous so it works identically in server and browser. */
export function recipeFingerprint(recipe: { age: string; ingredients: string[]; steps: string[]; storage: string; allergens: string[]; servings: number | string }) {
  const text = JSON.stringify([recipe.age, recipe.ingredients, recipe.steps, recipe.storage, recipe.allergens, String(recipe.servings)]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

export const editorialRegistry: Record<string, EditorialRecord> = {};
