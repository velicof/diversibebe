// Allergies recorded for a child filter what DiversiBebe recommends and plans; they never switch the app off.
// A recipe is judged only on the ingredients written in it: "compatible" means none of the recorded allergens
// was found in those ingredients, not that the dish is free of allergens or cross-contamination.
// Nothing here changes a recipe or invents a substitution.
import { normalizeText, type Allergen } from "./content/safety";

export type AllergyRecord = {
  id: string;
  /** null: recorded for the whole account (V1 records every allergy this way). */
  babyId: string | null;
  foodId: string | null;
  foodName: string;
};
export type ResolvedAllergy = AllergyRecord & {
  label: string;
  /** EU allergen groups the recorded food belongs to, matched with all their derivatives. */
  categories: Allergen[];
  /** The food itself, as it may be written in an ingredient line. */
  pattern: RegExp | null;
  /** Generic ingredient lines that could hide this food without naming it. */
  hidden: RegExp | null;
  /** A food DiversiBebe knows; an unknown one leaves every recipe unverified. */
  known: boolean;
};
export type AllergyStatus = "compatible" | "contains" | "unverified";
export type AllergyAssessment = { status: AllergyStatus; contains: string[]; unverified: string[] };

// Ingredient lines that can contain the allergen without naming it (bread, biscuits, sauces…).
const HIDDEN: Partial<Record<Allergen, RegExp>> = {
  Lapte: /\bpaine\b|biscuit|ciocolat|margarin|croissant|aluat|pesmet|cereale|granola|musli|\bblat\b|clatite gata/,
  Ou: /\bpaste\b|taitei|spaghet|lasagn|\bpaine\b|biscuit|aluat|\bblat\b|pesmet|croissant|briose/,
  Gluten: /cereale|granola|musli|condimente/,
  "Fructe cu coajă": /ciocolat|biscuit|granola|musli|cereale|pesto|seminte|\bpaine\b|pralin/,
  Arahide: /ciocolat|biscuit|granola|musli|cereale|seminte|\bpaine\b|pralin/,
  Soia: /\bpaine\b|biscuit|ciocolat|\bsos\b|margarin|lecitin/,
  Susan: /\bpaine\b|biscuit|hummus|seminte|chifl/,
  Pește: /\bsos\b|bulion/,
  Crustacee: /\bsos\b|bulion/,
  Moluște: /\bsos\b|bulion/,
  Țelină: /\bsupa\b|ciorb|\bbors\b|bulion|zarzavat|condimente/,
  Muștar: /\bsos\b|maionez|dressing|condimente/,
  Sulfiți: /fructe uscate|stafid|caise uscate|prune uscate|otet/,
  Lupin: /\bfaina\b/,
};
// For fruit, vegetables and spices: lines that name a mix instead of the foods in it.
const GENERIC = /\bfructe\b|\blegume\b|condimente|\bmix\b|smoothie/;

type Food = { categories?: Allergen[]; pattern?: RegExp };
// V1 food ids (src/app/lib/foodsDatabase.ts; tests/allergy.test.cjs keeps both lists in step).
const FOODS: Record<string, Food> = {
  ou: { categories: ["Ou"] }, "peste-alb": { categories: ["Pește"] }, somon: { categories: ["Pește"] },
  "branza-vaci": { categories: ["Lapte"] }, iaurt: { categories: ["Lapte"] }, tofu: { categories: ["Soia"] },
  ovaz: { categories: ["Gluten"] }, paste: { categories: ["Gluten"] }, paine: { categories: ["Gluten"] },
  "nuci-macinate": { categories: ["Fructe cu coajă"] }, "unt-migdale": { categories: ["Fructe cu coajă"] },
  "unt-arahide": { categories: ["Arahide"] },
  "seminte-macinate": { pattern: /seminte|\bsusan|tahini|\bchia\b|\bin macinat/ }, "unt-cocos": { pattern: /cocos/ },
  "dovleac-butternut": { pattern: /dovleac/ }, kale: { pattern: /\bkale\b/ }, spanac: { pattern: /spanac/ },
  conopida: { pattern: /conopid/ }, cartof: { pattern: /\bcartof(?:i|ul|ii)?\b(?! dulc)/ }, "cartof-dulce": { pattern: /cartof(?:i)? dulc/ },
  morcov: { pattern: /morcov/ }, mazare: { pattern: /mazare/ }, dovlecel: { pattern: /dovlece/ }, "ardei-gras": { pattern: /ardei/ },
  vinete: { pattern: /vinet/ }, castravete: { pattern: /castrave/ }, pastarnac: { pattern: /pastarnac/ }, sparanghel: { pattern: /sparanghel/ },
  broccoli: { pattern: /broc+oli/ }, rosii: { pattern: /\brosi(?:i|e)\b|\brosie\b|tomat|bulion/ }, "fasole-verde": { pattern: /fasole verde|pastai/ },
  usturoi: { pattern: /usturoi/ }, sfecla: { pattern: /sfecl/ }, porumb: { pattern: /porumb|malai|mamalig|polenta/ },
  ciuperci: { pattern: /ciuperc/ }, banana: { pattern: /banan/ }, ananas: { pattern: /ananas/ },
  mere: { pattern: /\bmar\b|\bmere\b|\bmarul\b|merele/ }, pere: { pattern: /\bpara\b|\bpere\b|parele/ }, curmale: { pattern: /curmal/ },
  capsuni: { pattern: /capsun/ }, zmeura: { pattern: /zmeur/ }, kiwi: { pattern: /kiwi/ }, afine: { pattern: /\bafin/ },
  grepfrut: { pattern: /grepfrut/ }, "pepene-verde": { pattern: /pepene/ }, mango: { pattern: /mango/ }, piersici: { pattern: /piersic/ },
  prune: { pattern: /\bprun/ }, portocale: { pattern: /portocal/ }, avocado: { pattern: /avocado/ }, struguri: { pattern: /strugur|stafid/ },
  dovleac: { pattern: /dovleac/ }, pui: { pattern: /\bpui\b|pulp/ }, curcan: { pattern: /curcan/ }, vita: { pattern: /\bvita\b|vitel/ },
  miel: { pattern: /\bmiel/ }, linte: { pattern: /linte/ }, naut: { pattern: /\bnaut|hummus/ }, quinoa: { pattern: /quinoa|mei peruan/ },
  orez: { pattern: /\borez/ }, "ulei-masline": { pattern: /masline/ }, busuioc: { pattern: /busuioc|pesto/ },
  scortisoara: { pattern: /scortisoar/ }, ghimbir: { pattern: /ghimbir/ }, turmeric: { pattern: /turmeric|curcum/ },
  chimion: { pattern: /chimion/ }, coriandru: { pattern: /coriandru/ }, nucsoara: { pattern: /nucsoar/ }, "boia-dulce": { pattern: /\bboia\b|paprika/ },
  vanilie: { pattern: /vanili/ }, cardamom: { pattern: /cardamom/ }, marar: { pattern: /marar/ },
};
export const KNOWN_ALLERGY_FOODS = Object.keys(FOODS);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Words that describe a food without naming it ("fistic verde"): matching them would flag unrelated recipes.
const DESCRIPTIVE = new Set(["verde", "verzi", "rosu", "rosie", "rosii", "alba", "albe", "negru", "neagra", "dulce", "dulci", "uscat", "uscate", "proaspat", "proaspete", "fiert", "fiarta", "macinat", "macinate", "pudra", "natural", "naturala", "copt", "coapta", "crud", "cruda", "bio"]);
/** A food typed by hand (V1 custom food): matched by its own words, and never assumed absent. */
function patternFromName(name: string): RegExp | null {
  const words = normalizeText(name).split(/[^a-z]+/).filter((w) => w.length >= 4 && !DESCRIPTIVE.has(w));
  return words.length ? new RegExp(words.map((w) => `\\b${escape(w.slice(0, Math.max(4, w.length - 2)))}`).join("|")) : null;
}

/** "Iaurt natural (lapte)": a recipe with butter is then understood to contain it. */
function withGroup(name: string, categories: Allergen[]) {
  const extra = categories.filter((c) => normalizeText(c) !== normalizeText(name));
  return extra.length ? `${name} (${extra.map((c) => c.toLowerCase()).join(", ")})` : name;
}
export function resolveAllergy(record: AllergyRecord): ResolvedAllergy {
  const food = record.foodId ? FOODS[record.foodId] : undefined;
  const categories = food?.categories ?? [];
  const hidden = categories.length
    ? new RegExp(categories.map((c) => HIDDEN[c]?.source).filter(Boolean).join("|") || "$^")
    : food
      ? GENERIC
      : null;
  return {
    ...record,
    label: withGroup(record.foodName || record.foodId || "aliment", categories),
    categories,
    pattern: food?.pattern ?? (food ? null : patternFromName(record.foodName)),
    hidden,
    known: Boolean(food),
  };
}

/** The allergies that protect this child: its own, and those recorded for the whole account. */
export function allergiesFor(records: AllergyRecord[], childId: string | null): ResolvedAllergy[] {
  return records.filter((r) => r.babyId === null || r.babyId === childId).map(resolveAllergy);
}

type RecipeFacts = { name: string; ingredients: string[]; allergens: readonly string[]; ingredientIds: string[] };
/** Cumulative: one allergen found makes the recipe "contains"; any doubt makes it "unverified". */
export function assessRecipe(recipe: RecipeFacts, allergies: ResolvedAllergy[]): AllergyAssessment {
  const result: AllergyAssessment = { status: "compatible", contains: [], unverified: [] };
  if (!allergies.length) return result;
  const text = normalizeText([recipe.name, ...recipe.ingredients].join("\n"));
  for (const a of allergies) {
    const found =
      a.categories.some((c) => recipe.allergens.includes(c)) ||
      Boolean(a.pattern?.test(text)) ||
      Boolean(a.foodId && recipe.ingredientIds.includes(a.foodId));
    if (found) result.contains.push(a.label);
    else if (!a.known || a.hidden?.test(text)) result.unverified.push(a.label);
  }
  result.status = result.contains.length ? "contains" : result.unverified.length ? "unverified" : "compatible";
  return result;
}

/** What the planner and the recommendations may propose on their own: nothing in doubt. */
export const recommendable = (recipe: RecipeFacts, allergies: ResolvedAllergy[]) =>
  assessRecipe(recipe, allergies).status === "compatible";

export const ALLERGY_NOTICE =
  "Recomandările sunt filtrate în funcție de alergiile înregistrate. Verifică întotdeauna ingredientele și etichetele. Pentru gestionarea alergiilor alimentare ale copilului, consultă pediatrul sau alergologul.";
