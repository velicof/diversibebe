// The V2 catalog as the app uses it. The recipes are computed at build time by catalog-build.ts
// (node scripts/generate-catalog.cjs): building them in the browser cost ~200 ms of main thread on a
// mid-range phone. Only the photo is resolved here, because it depends on the build's content mode.
import data from "./content/catalog.generated.json";
import { recipePhotos } from "./content/photos";
import type { CatalogData, Recipe } from "./catalog-shared";

export { contentMode, ingredients, parseDuration, storableId, type Recipe } from "./catalog-shared";

const generated = data as unknown as CatalogData;
// Photo candidates (approved: false) are visible only in local/preview builds and in the review console.
const showPhotoCandidates = process.env.NEXT_PUBLIC_V2_CONTENT_MODE === "preview";

export const catalog: Recipe[] = generated.recipes.map((recipe) => {
  const asset = recipePhotos[recipe.id];
  const photo = asset && (asset.approved || showPhotoCandidates) ? asset : undefined;
  return { ...recipe, photo, hasPhoto: Boolean(photo) || !recipe.image.endsWith("icon.svg") };
});
const legacyToV2 = Object.fromEntries(catalog.flatMap((r) => (r.legacyId ? [[r.legacyId, r.id]] : [])));

/** Families see only published recipes: editorial and safety checks passed. Not a medical approval. */
export const publishedCatalog = catalog.filter((r) => r.published);
/** Founder and specialist review: every recipe, whatever its status. */
export const reviewCatalog = catalog;
/** Kept for existing callers: the eligible list is the published catalog in every environment. */
export const previewCatalog = publishedCatalog;
export const activeCatalog = publishedCatalog;
export function findVisibleRecipe(id: string): Recipe | undefined {
  const v2 = legacyToV2[id] ?? id;
  return publishedCatalog.find((r) => r.id === v2);
}
export function findAnyRecipe(id: string): Recipe | undefined {
  const v2 = legacyToV2[id] ?? id;
  return catalog.find((r) => r.id === v2);
}

/** Library ingredient filter: the most frequent ingredients of the published catalog. */
export const ingredientFilters = generated.ingredientFilters;
/** Keys a stored shopping list may contain. */
export const shoppingKeys: ReadonlySet<string> = new Set(generated.shoppingKeys);
