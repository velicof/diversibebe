import { RECIPES, type RecipeCatalogItem } from "@/app/lib/recipesDatabase";
import { FOODS_DATABASE } from "@/app/lib/foodsDatabase";
import { hasClinicalReview, inspectContent, isPublishable, normalize, type ClinicalReview, type EditorialStatus } from "./review";
import { editorialRegistry, recipeFingerprint } from "./content/editorial";
import { recipePhotos, type RecipePhotoAsset } from "./content/photos";
import { corrections, idAliases, specialistQueue, type Correction } from "./content/corrections";
import { assessSafety, canonicalAllergens, servingGuidance, substitutions, type Allergen, type SafetyFlag } from "./content/safety";
import { availability, detectProduce } from "./season";

export type Recipe = Omit<RecipeCatalogItem, "allergens"> & {
  /** Present when the V1 id is not storable by V2 (V1 favorites keep working with it). */
  legacyId?: string;
  /** EU 14 allergens, from the declared list plus the ingredient lines. */
  allergens: Allergen[];
  otherSensitivities: string[];
  minutes: number | null;
  minimumMonths: number;
  ingredientIds: string[];
  review: ClinicalReview;
  editorialStatus: EditorialStatus;
  /** Shown and recommended to families. Never means "medically approved". */
  published: boolean;
  safetyFlags: SafetyFlag[];
  /** Corrections applied to this recipe, with reason and source. */
  corrections: Correction[];
  allergenChanges: { added: Allergen[]; renamed: string[] };
  specialistNote?: string;
  servingGuidance: string;
  substitutions: string[];
  /** Months (1-12) in which at least one produce ingredient is fresh and local in Romania. */
  seasonMonths: number[];
  automaticReview: ReturnType<typeof inspectContent>;
  image: string;
  hasPhoto: boolean;
  /** Approved recipe photo (docs/ai-ops/photos/manifest.json); takes precedence over `image`. */
  photo?: RecipePhotoAsset;
};
/** Quick-start ingredients (onboarding, pantry). The library filter uses `ingredientFilters`. */
export const ingredients = [
  { id: "dovlecel", name: "Dovlecel" },
  { id: "morcov", name: "Morcov" },
  { id: "cartof", name: "Cartof" },
  { id: "ovaz", name: "Ovăz" },
  { id: "banana", name: "Banană" },
  { id: "broccoli", name: "Broccoli" },
  { id: "orez", name: "Orez" },
  { id: "mar", name: "Măr" },
] as const;
export function parseDuration(value: string): number | null {
  const text = normalize(value).toLowerCase();
  // Advance preparation (overnight soaking) cannot satisfy a same-day time filter.
  if (/peste noapte|de cu seara/.test(text)) return null;
  const numbers = text.match(/\d+/g)?.map(Number) ?? [];
  // Hours may be written "1 oră", "1½ ore", "1h", "2h" or "1h 30min".
  const hours = text.match(/(\d+)?\s*(½)?\s*(?:h|ore|ora|hour)(?![a-z])/);
  if (hours && (hours[1] || hours[2])) {
    const total = Number(hours[1] ?? 0) + (hours[2] ? 0.5 : 0);
    const minutes = text.slice((hours.index ?? 0) + hours[0].length).match(/(\d+)\s*min/);
    return Math.round(total * 60) + (minutes ? Number(minutes[1]) : 0);
  }
  if (!numbers.length) return null;
  return Math.max(...numbers);
}

// Ids the V2 database accepts (v2_apply_action).
export const storableId = (id: string) => /^[a-z0-9-]{1,100}$/.test(id);
const legacyToV2 = Object.fromEntries(Object.entries(idAliases).map(([v2, legacy]) => [legacy, v2]));
const STAGES = [6, 7, 8, 10, 12];
// Photo candidates (approved: false) are visible only in local/preview builds and in the review console.
const showPhotoCandidates = process.env.NEXT_PUBLIC_V2_CONTENT_MODE === "preview";

function applyCorrections(recipe: RecipeCatalogItem, id: string) {
  const applied: Correction[] = [];
  const edit = (field: Correction["field"]) =>
    recipe[field].flatMap((line) => {
      const fix = corrections.find((x) => (x.recipeId === id || x.recipeId === recipe.id) && x.field === field && x.before === line);
      if (!fix) return [line];
      applied.push(fix);
      return fix.after ? [fix.after] : [];
    });
  return { ingredients: edit("ingredients"), steps: edit("steps"), applied };
}

const imageFor = (recipe: RecipeCatalogItem) =>
  recipe.id === "piure-dovlecel" ? "/v2/generated-piure-dovlecel.webp" : recipe.id === "piure-morcov" ? "/v2/generated-piure-morcov-cartof.webp" : recipe.id === "piure-dovleac-linte-6" ? "/v2/food-soup.webp" : /terci.*ovaz/.test(normalize(recipe.name)) ? "/v2/food-oats.webp" : "/v2/icon.svg";

export const catalog: Recipe[] = RECIPES.map((source) => {
  const id = legacyToV2[source.id] ?? source.id;
  const fixed = applyCorrections(source, id);
  const allergenInfo = canonicalAllergens(source.allergens, fixed.ingredients);
  const corrected = { ...source, ingredients: fixed.ingredients, steps: fixed.steps, allergens: allergenInfo.allergens };
  const minimumMonths = Number(source.age.match(/\d+/)?.[0] ?? 99);
  const safetyFlags = assessSafety(corrected, minimumMonths);
  const blocking = safetyFlags.filter((f) => f.severity === "blocking").length;
  // A specialist review only counts for the exact corrected content that was reviewed.
  const record = editorialRegistry[id];
  const reviewed = record && record.contentHash === recipeFingerprint(corrected) ? record : undefined;
  const review: ClinicalReview = reviewed?.review ?? { status: "pending" };
  const specialistNote = specialistQueue[id];
  const editorialStatus: EditorialStatus =
    reviewed?.status === "specialist_approved" && hasClinicalReview(review)
      ? "specialist_approved"
      : specialistNote || blocking || reviewed?.status === "needs_specialist_review"
        ? "needs_specialist_review"
        : fixed.applied.length || allergenInfo.added.length
          ? "editorially_corrected"
          : "imported";
  const raw = normalize(fixed.ingredients.join(" "));
  const detected = ingredients.filter((i) => new RegExp(`\\b${i.id}\\w*`).test(raw)).map((i) => i.id);
  const produce = detectProduce(fixed.ingredients);
  const asset = recipePhotos[id];
  const photo = asset && (asset.approved || showPhotoCandidates) ? asset : undefined;
  const image = imageFor(source);
  return {
    ...corrected,
    id,
    ...(id !== source.id ? { legacyId: source.id } : {}),
    otherSensitivities: allergenInfo.otherSensitivities,
    minutes: parseDuration(source.time),
    minimumMonths,
    ingredientIds: [...new Set([...source.relatedFoods.map(normalize), ...detected])],
    review,
    editorialStatus,
    published: isPublishable(editorialStatus, review, blocking) && storableId(id) && STAGES.includes(minimumMonths),
    safetyFlags,
    corrections: fixed.applied,
    allergenChanges: { added: allergenInfo.added, renamed: allergenInfo.renamed },
    ...(specialistNote ? { specialistNote } : {}),
    servingGuidance: servingGuidance(corrected, minimumMonths),
    substitutions: substitutions(allergenInfo.allergens),
    seasonMonths: Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => produce.some((p) => availability(p, m) === "local")),
    automaticReview: blocking
      ? { status: "safety-issue", reasons: safetyFlags.filter((f) => f.severity === "blocking").map((f) => f.message) }
      : editorialStatus === "needs_specialist_review"
        ? { status: "needs-review", reasons: [specialistNote ?? "Verificare de specialitate."] }
        : { status: "no-automatic-issues", reasons: [] },
    photo,
    image,
    hasPhoto: Boolean(photo) || !image.endsWith("icon.svg"),
  };
});

/** Families see only published recipes: editorial and safety checks passed. Not a medical approval. */
export const publishedCatalog = catalog.filter((r) => r.published);
/** Founder and specialist review: every recipe, whatever its status. */
export const reviewCatalog = catalog;
/** Kept for existing callers: the eligible list is the published catalog in every environment. */
export const previewCatalog = publishedCatalog;
export const activeCatalog = publishedCatalog;
/** Copy only: "preview" labels local QA builds; content eligibility is identical. */
export const contentMode: "preview" | "live" =
  process.env.NEXT_PUBLIC_V2_CONTENT_MODE === "preview" ? "preview" : "live";
export function findVisibleRecipe(id: string): Recipe | undefined {
  const v2 = legacyToV2[id] ?? id;
  return publishedCatalog.find((r) => r.id === v2);
}
export function findAnyRecipe(id: string): Recipe | undefined {
  const v2 = legacyToV2[id] ?? id;
  return catalog.find((r) => r.id === v2);
}

const foodNames = new Map(FOODS_DATABASE.map((f) => [normalize(f.id), f.name]));
/** Library ingredient filter: the most frequent ingredients of the published catalog. */
export const ingredientFilters = [...publishedCatalog.flatMap((r) => r.ingredientIds).reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>())]
  .filter(([id]) => foodNames.has(id))
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 28)
  .map(([id]) => ({ id, name: foodNames.get(id)! }));

export const contentInventory = {
  recipes: catalog.map((r) => ({
    id: r.id,
    name: r.name,
    ...r.automaticReview,
    clinicalReview: r.review.status,
  })),
  foods: FOODS_DATABASE.map((f) => ({
    id: f.id,
    name: f.name,
    ...inspectContent([f.preparation, f.allergenInfo, f.ageGroup].join(". ")),
    clinicalReview: "pending",
  })),
};
