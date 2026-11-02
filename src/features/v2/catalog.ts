import { RECIPES, type RecipeCatalogItem } from "@/app/lib/recipesDatabase";
import { FOODS_DATABASE } from "@/app/lib/foodsDatabase";
import { inspectContent, normalize, type ClinicalReview } from "./review";
import { shortlistIds } from "./content/shortlist";

export type Recipe = RecipeCatalogItem & {
  minutes: number | null;
  minimumMonths: number;
  ingredientIds: string[];
  review: ClinicalReview;
  automaticReview: ReturnType<typeof inspectContent>;
  image: string;
};
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
export const catalog: Recipe[] = RECIPES.map((recipe) => {
  const raw = normalize(recipe.ingredients.join(" "));
  const detected = ingredients
    .filter((ingredient) => new RegExp(`\\b${ingredient.id}\\w*`).test(raw))
    .map((i) => i.id);
  return {
    ...recipe,
    minutes: parseDuration(recipe.time),
    minimumMonths: Number(recipe.age.match(/\d+/)?.[0] ?? 99),
    ingredientIds: [
      ...new Set([...recipe.relatedFoods.map(normalize), ...detected]),
    ],
    review: { status: "pending" },
    automaticReview: inspectContent(
      [recipe.age, ...recipe.ingredients, ...recipe.steps, recipe.storage].join(
        ". ",
      ),
    ),
    image: recipe.id === "piure-dovlecel" ? "/v2/generated-piure-dovlecel.webp" : recipe.id === "piure-morcov" ? "/v2/generated-piure-morcov-cartof.webp" : recipe.id === "piure-dovleac-linte-6" ? "/v2/food-soup.webp" : /terci.*ovaz/.test(normalize(recipe.name)) ? "/v2/food-oats.webp" : "/v2/icon.svg",
  };
});

// Small, explicitly unreviewed preview of the EXISTING catalog. No medical approval is inferred.
const previewIds = [
  "piure-dovlecel",
  "piure-morcov",
  "piure-cartof-dulce",
  "terci-ovaz-banana",
];
const firstPreview = [...catalog]
  .filter(
    (r) =>
      r.automaticReview.status === "no-automatic-issues" && r.minutes !== null,
  )
  .sort(
    (a, b) =>
      Number(previewIds.includes(b.id)) - Number(previewIds.includes(a.id)),
  )
  .slice(0, 48);
// The editorial shortlist (status review_required, still unreviewed) widens the demo so a
// 5-day plan is possible for every stage and meal type.
export const previewCatalog = [
  ...firstPreview,
  ...catalog.filter(
    (r) =>
      shortlistIds.has(r.id) &&
      !firstPreview.includes(r) &&
      r.automaticReview.status === "no-automatic-issues" &&
      r.minutes !== null,
  ),
];
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
