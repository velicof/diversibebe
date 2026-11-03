// Types and small helpers shared by the browser catalog (catalog.ts) and its build step (catalog-build.ts).
// Nothing here may import the recipe database or the safety rules: this module ships to every page.
import type { RecipeCatalogItem } from "@/app/lib/recipesDatabase";
import type { ClinicalReview, EditorialStatus, inspectContent } from "./review";
import type { RecipePhotoAsset } from "./content/photos";
import type { Correction } from "./content/corrections";
import type { Allergen, SafetyFlag } from "./content/safety";

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
/** A recipe as computed at build time: the photo depends on the build's content mode and is attached at runtime. */
export type StoredRecipe = Omit<Recipe, "photo" | "hasPhoto">;
export type CatalogData = { recipes: StoredRecipe[]; ingredientFilters: { id: string; name: string }[] };

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

// Same as review.normalize; repeated so this module stays free of the review rules.
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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

/** Copy only: "preview" labels local QA builds; content eligibility is identical. */
export const contentMode: "preview" | "live" =
  process.env.NEXT_PUBLIC_V2_CONTENT_MODE === "preview" ? "preview" : "live";
