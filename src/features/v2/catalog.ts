import { RECIPES, type RecipeCatalogItem } from "@/app/lib/recipesDatabase";
import { FOODS_DATABASE } from "@/app/lib/foodsDatabase";
import { inspectContent, normalize, type ClinicalReview } from "./review";

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
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return null;
  if (/ora|ore|hour/i.test(normalize(value)))
    return numbers[0] * 60 + (numbers[1] ?? 0);
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
    image: recipe.id === "piure-dovleac-linte-6" ? "/v2/food-soup.webp" : /terci.*ovaz/.test(normalize(recipe.name)) ? "/v2/food-oats.webp" : "/v2/icon.svg",
  };
});

// Small, explicitly unreviewed preview of the EXISTING catalog. No medical approval is inferred.
const previewIds = [
  "piure-dovlecel",
  "piure-morcov",
  "piure-cartof-dulce",
  "terci-ovaz-banana",
];
export const previewCatalog = [...catalog]
  .filter(
    (r) =>
      r.automaticReview.status === "no-automatic-issues" && r.minutes !== null,
  )
  .sort(
    (a, b) =>
      Number(previewIds.includes(b.id)) - Number(previewIds.includes(a.id)),
  )
  .slice(0, 48);
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
