// Builds the V2 catalog from the V1 recipe database: corrections, EU allergens, safety rules, editorial
// status, season. Runs at build time (scripts/generate-catalog.cjs writes content/catalog.generated.json)
// and in tests; the browser only loads the generated result. tests/catalog-snapshot.test.cjs fails when
// the generated file is stale.
import { RECIPES, type RecipeCatalogItem } from "@/app/lib/recipesDatabase";
import { FOODS_DATABASE } from "@/app/lib/foodsDatabase";
import { hasClinicalReview, isPublishable, normalize, type ClinicalReview, type EditorialStatus } from "./review";
import { editorialRegistry, recipeFingerprint } from "./content/editorial";
import { corrections, idAliases, specialistQueue, type Correction } from "./content/corrections";
import { assessSafety, canonicalAllergens, servingGuidance, substitutions } from "./content/safety";
import { availability, detectProduce, seasonalScore } from "./season";
import { shoppingKeyUniverse } from "./planning";
import { ingredients, parseDuration, storableId, type CatalogData, type StoredRecipe } from "./catalog-shared";

const legacyToV2 = Object.fromEntries(Object.entries(idAliases).map(([v2, legacy]) => [legacy, v2]));
const STAGES = [6, 7, 8, 10, 12];

function applyCorrections(recipe: RecipeCatalogItem, id: string) {
  const applied: Correction[] = [];
  const edit = (field: "ingredients" | "steps") =>
    recipe[field].flatMap((line: string) => {
      const fix = corrections.find((x) => (x.recipeId === id || x.recipeId === recipe.id) && x.field === field && x.before === line);
      if (!fix) return [line];
      applied.push(fix);
      return fix.after ? [fix.after] : [];
    });
  const nameFix = corrections.find((x) => (x.recipeId === id || x.recipeId === recipe.id) && x.field === "name" && x.before === recipe.name);
  if (nameFix) applied.push(nameFix);
  return { name: nameFix ? nameFix.after : recipe.name, ingredients: edit("ingredients"), steps: edit("steps"), applied };
}

const imageFor = (recipe: RecipeCatalogItem) =>
  recipe.id === "piure-dovlecel" ? "/v2/generated-piure-dovlecel.webp" : recipe.id === "piure-morcov" ? "/v2/generated-piure-morcov-cartof.webp" : recipe.id === "piure-dovleac-linte-6" ? "/v2/food-soup.webp" : /terci.*ovaz/.test(normalize(recipe.name)) ? "/v2/food-oats.webp" : "/v2/icon.svg";

export function buildRecipes(): StoredRecipe[] {
  return RECIPES.map((source) => {
    const id = legacyToV2[source.id] ?? source.id;
    const fixed = applyCorrections(source, id);
    const allergenInfo = canonicalAllergens(source.allergens, fixed.ingredients);
    const corrected = { ...source, name: fixed.name, ingredients: fixed.ingredients, steps: fixed.steps, allergens: allergenInfo.allergens };
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
      seasonScores: Array.from({ length: 12 }, (_, i) => seasonalScore(fixed.ingredients, i + 1)),
      automaticReview: blocking
        ? { status: "safety-issue", reasons: safetyFlags.filter((f) => f.severity === "blocking").map((f) => f.message) }
        : editorialStatus === "needs_specialist_review"
          ? { status: "needs-review", reasons: [specialistNote ?? "Verificare de specialitate."] }
          : { status: "no-automatic-issues", reasons: [] },
      image: imageFor(source),
    };
  });
}

/** Library ingredient filter: the most frequent ingredients of the published catalog. */
function buildIngredientFilters(recipes: StoredRecipe[]) {
  const foodNames = new Map(FOODS_DATABASE.map((f) => [normalize(f.id), f.name]));
  return [...recipes.filter((r) => r.published).flatMap((r) => r.ingredientIds).reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<string, number>())]
    .filter(([id]) => foodNames.has(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 28)
    .map(([id]) => ({ id, name: foodNames.get(id)! }));
}

export function buildCatalogData(): CatalogData {
  const recipes = buildRecipes();
  // The universe reads only the ingredient lines.
  const shoppingKeys = [...shoppingKeyUniverse(recipes as Parameters<typeof shoppingKeyUniverse>[0])].sort();
  return { recipes, ingredientFilters: buildIngredientFilters(recipes), shoppingKeys };
}
