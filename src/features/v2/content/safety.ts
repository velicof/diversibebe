// Editorial safety checks for the existing recipe library. Deterministic rules backed by public
// guidance (sources below). They decide what is SHOWN and RECOMMENDED; they never grant clinical approval.
import type { RecipeCatalogItem } from "@/app/lib/recipesDatabase";

export const SOURCES = {
  nhsAvoid: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/",
  nhsAllergy: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/food-allergies-in-babies-and-young-children/",
  nhsDrinks: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/drinks-and-cups-for-babies-and-young-children/",
  nhsWhatToFeed: "https://www.nhs.uk/conditions/baby/weaning-and-feeding/what-to-feed-young-children/",
  cdcChoking: "https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/choking-hazards.html",
  aapJuice: "https://www.healthychildren.org/English/healthy-living/nutrition/Pages/Where-We-Stand-Fruit-Juice.aspx",
  euAllergens: "https://eur-lex.europa.eu/eli/reg/2011/1169/oj",
} as const;

export function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** The 14 allergens of Regulation (EU) 1169/2011, Annex II, in Romanian. Coconut is NOT one of them. */
export const EU_ALLERGENS = [
  "Gluten", "Crustacee", "Ou", "Pește", "Arahide", "Soia", "Lapte", "Fructe cu coajă",
  "Țelină", "Muștar", "Susan", "Sulfiți", "Lupin", "Moluște",
] as const;
export type Allergen = (typeof EU_ALLERGENS)[number];

const allergenRules: [Allergen, RegExp, RegExp?][] = [
  ["Gluten", /\bgrau\b|\bfaina\b|\bgris\b|\bpaine\b|\bpesmet|\bpaste\b|spaghet|fusilli|penne|\btaitei|macaroan|lasagn|\bcuscus|\bbulgur|\borz\b|\bsecara|\bspelta|\bovaz\b|tortilla|\blipie|biscuit|croissant|crutoane|\bchifl|\bblat\b|aluat/, /faina de (?:migdale|nuci|naut|orez|porumb|hrisca|quinoa|cocos|ovaz fara gluten)|fara gluten|(?:penne|paste|spaghete|fusilli|taitei)(?: din| de) (?:naut|linte|orez|mazare|fasole|quinoa|hrisca)(?![^;]*\b(?:sau|ori) (?:paste|penne) (?:obisnuite|de grau)\b)/],
  ["Crustacee", /crevet|\bcrab|homar|langust/],
  ["Ou", /\bou\b|\boua\b|\bouale\b|\boul\b|galbenus|albus|maionez(?!a vegana)(?! vegana)/],
  ["Pește", /\bpeste\b|\bpestele|somon|\bcod\b|pastrav|\bton\b|sardin|macrou|biban|salau|merluciu|hering|dorada|lup de mare|\bhamsi|file de peste/],
  ["Arahide", /arahid|alune de pamant/],
  ["Soia", /\bsoia\b|\btofu\b|edamame|\bmiso\b/],
  ["Fructe cu coajă", /\bnuci\b|\bnuca\b(?! de cocos)|\balun(?!e de pamant)|migdal|\bcaju|fistic|pecan|macadamia|faina de nuci/, /nuca de cocos(?!.*\bnuci\b)/],
  ["Țelină", /\btelin/],
  ["Muștar", /\bmustar/],
  ["Susan", /\bsusan|tahini/],
  ["Sulfiți", /sulfit|\bvin\b/],
  ["Lupin", /\blupin/],
  ["Moluște", /midii|calamar|scoic|caracati/],
];

const legacyAllergen: Record<string, Allergen | "Cocos"> = {
  "Lactoză": "Lapte", Lapte: "Lapte", Gluten: "Gluten", Ou: "Ou", "Pește": "Pește", Susan: "Susan",
  Arahide: "Arahide", Nuci: "Fructe cu coajă", "Nuci (migdale)": "Fructe cu coajă", "Nuci (pecan)": "Fructe cu coajă",
  Soia: "Soia", "Nucă de cocos": "Cocos",
};

// Milk is decided per line: plain milk, formula or any dairy product counts; breast milk, coconut or
// plant drinks alone do not, and "unt de arahide" is not butter.
const NOT_DAIRY_MILK = /\blapte (?:matern|de cocos|vegetal|de migdale|de ovaz|de soia|de orez)\b/g;
function containsMilk(text: string) {
  if (/iaurt|\bbranz|smantan|mascarpone|ricotta|parmezan|mozzarella|cascaval|kefir|telemea|frisca|\bghee\b|formul/.test(text)) return true;
  if (/\bunt\b(?! de (?:arahide|migdale|cocos|caju))/.test(text)) return true;
  // "lapte" left after removing breast milk / plant drinks is dairy milk ("lapte", "lapte de vacă").
  return /\blapte\b/.test(text.replace(NOT_DAIRY_MILK, ""));
}

/** Allergens present in the ingredient list (EU 14). "fără X" does not count. */
export function detectAllergens(ingredients: string[]): Allergen[] {
  const found = new Set<Allergen>();
  for (const line of ingredients) {
    const full = normalizeText(line);
    const text = full.replace(/fara [a-z]+/g, "");
    if (containsMilk(text)) found.add("Lapte");
    for (const [name, include, exclude] of allergenRules) {
      if (include.test(text) && !(exclude && exclude.test(full))) found.add(name);
    }
  }
  return EU_ALLERGENS.filter((a) => found.has(a));
}

export function canonicalAllergens(declared: string[], ingredients: string[]) {
  const mapped = declared.map((a) => legacyAllergen[a] ?? a);
  const detected = detectAllergens(ingredients);
  const eu = EU_ALLERGENS.filter((a) => mapped.includes(a) || detected.includes(a));
  return {
    allergens: eu as Allergen[],
    /** Coconut: not an EU major allergen, kept as information for families who avoid it. */
    otherSensitivities: mapped.includes("Cocos") ? ["Cocos"] : [],
    added: detected.filter((a) => !mapped.includes(a)),
    renamed: declared.filter((a) => legacyAllergen[a] && legacyAllergen[a] !== a),
  };
}

export type SafetyFlag = {
  id: string;
  /** blocking: not shown to families, specialist queue. warning: shown with a serving note. */
  severity: "blocking" | "warning";
  message: string;
  source?: string;
};

const has = (text: string, re: RegExp) => re.test(text);
const notNegated = (text: string, word: string) => new RegExp(`\\b${word}`).test(text.replace(new RegExp(`fara (?:[a-z]+ )?${word}\\w*`, "g"), ""));

/** Runs on the (corrected) recipe. Deterministic; explains every flag with a public source. */
export function assessSafety(recipe: RecipeCatalogItem, minimumMonths: number): SafetyFlag[] {
  const ing = normalizeText(recipe.ingredients.join("\n"));
  const all = normalizeText([recipe.name, ...recipe.ingredients, ...recipe.steps].join("\n"));
  const flags: SafetyFlag[] = [];
  const block = (id: string, message: string, source: string) => flags.push({ id, severity: "blocking", message, source });
  const warn = (id: string, message: string, source?: string) => flags.push({ id, severity: "warning", message, source });

  if (minimumMonths < 12 && notNegated(ing, "miere")) block("honey", "Miere sub 12 luni (risc de botulism infantil).", SOURCES.nhsAvoid);
  if (ing.split("\n").some((l) => /\bsare\b/.test(l) && !/fara sare/.test(l))) block("salt", "Sare adăugată.", SOURCES.nhsAvoid);
  if (ing.split("\n").some((l) => /\bzahar\b|\bsirop\b/.test(l) && !/fara zahar/.test(l))) block("sugar", "Zahăr sau sirop adăugat.", SOURCES.nhsAvoid);
  if (has(ing, /sos de soia|cub de supa|baza de supa|supa instant|\bvegeta\b|delikat/)) block("salty-condiment", "Condiment cu mult sodiu (sos de soia, cub/bază de supă).", SOURCES.nhsAvoid);
  if (has(ing, /\bsunca\b|bacon|\bcarnat|salam|parizer|crenvurst|afumat/)) block("processed-meat", "Mezeluri sau produse afumate (sare, nitriți).", SOURCES.nhsAvoid);
  if (has(all, /\bou crud|oua crude|nepasteurizat|lapte crud|maioneza de casa/)) block("raw", "Ingredient crud sau nepasteurizat.", SOURCES.nhsAvoid);
  if (has(ing, /lapte de orez|bautura de orez/)) block("rice-drink", "Băutură de orez (arsenic), nerecomandată sub 5 ani.", SOURCES.nhsAvoid);
  if (has(ing, /rechin|peste spada|pestele spada|marlin/)) block("mercury", "Pește cu mercur ridicat.", SOURCES.nhsAvoid);
  if (has(all, /popcorn|floricele de porumb|bomboan|marshmallow/)) block("choking-food", "Aliment cu risc mare de înec.", SOURCES.cdcChoking);
  // Whole nuts: only ground, butter, flour or a fully blended pesto are acceptable under 5 years.
  for (const line of ing.split("\n"))
    if (/\bnuci\b|\balun|migdal|\bcaju|fistic|pecan|arahid/.test(line) && !/macinat|\bunt de|faina de|pasta fina|pudra/.test(line))
      block("whole-nuts", "Nuci sau arahide în bucăți (risc de înec sub 5 ani).", SOURCES.nhsAvoid);
  for (const line of ing.split("\n"))
    if (/seminte de (?:floarea|dovleac)|seminte \(floarea/.test(line) && !/macinat/.test(line))
      block("whole-seeds", "Semințe întregi de floarea-soarelui sau dovleac (risc de înec).", SOURCES.cdcChoking);
  // Small round foods must be quartered, halved, mashed or cooked soft.
  const round = /\bstrugur|rosii cherry|\bcires|\bvisin|\bmaslin|\bafin/;
  const cut = /sferturi|jumatat|zdrob|pasat|pasea|tocat|mixea|blend/;
  const steps = recipe.steps.map(normalizeText);
  // Fruit folded into a dough or batter and baked bursts and softens.
  const bakedIn = steps.some((s) => /coace|copt/.test(s)) && steps.some((s) => /adauga fructele|in aluat|in compozitie/.test(s));
  for (const line of ing.split("\n"))
    if (round.test(line) && !/ulei/.test(line) && !cut.test(line) && !bakedIn && !cut.test(steps.filter((s) => round.test(s)).join(" ")))
      block("small-round", "Fructe/legume mici și rotunde servite întregi (struguri, roșii cherry, afine).", SOURCES.nhsAvoid);
  if (has(all, /\bochi(?:uri)?\b|ou moale|posat|galbenus moale|galbenus lichid/) && !has(all, /bine facut|galbenus(?:ul)? tare|fierte tari/))
    block("runny-egg", "Ou posibil negătit complet.", SOURCES.nhsAvoid);
  if (has(all, /crutoane/)) block("hard-croutons", "Crutoane tari (risc de înec).", SOURCES.cdcChoking);
  if (has(ing, /\bsuc(?:ul)? de (?:mere|portocal|struguri|fructe)\b/) && !has(all, /fierbe|gateste|sos/))
    block("juice", "Suc de fructe ca băutură.", SOURCES.aapJuice);

  // Warnings: shown to parents as serving guidance, never block publication.
  if (has(ing, /\bou\b|\boua\b|\bouale\b|galbenus/)) warn("egg-cooked", "Gătește oul complet, până când albușul și gălbenușul sunt ferme.", SOURCES.nhsAvoid);
  if (has(ing, /\bpeste\b|somon|\bcod\b|pastrav|sardin|macrou|biban|salau|merluciu|dorada|hering|\bton\b/)) warn("fish-bones", "Verifică atent peștele și îndepărtează toate oasele.", SOURCES.nhsWhatToFeed);
  if (minimumMonths < 12 && has(ing, /\blapte\b/) && !has(ing, /lapte (?:matern|de cocos)/)) warn("cow-milk-cooking", "Sub 12 luni, laptele de vacă se folosește doar la gătit, nu ca băutură.", SOURCES.nhsDrinks);
  if (has(ing, /arahid|unt de arahide|migdal|nuci|caju|pecan|susan|tahini/)) warn("allergen-intro", "Alergen major: oferă-l în formă fină, când copilul e sănătos, și urmărește reacțiile.", SOURCES.nhsAllergy);
  if (has(ing, /chia/) && !has(all, /lasa .*(?:minute|noapte)|peste noapte|hidrat|inmoaie/)) warn("chia-soak", "Semințele de chia se lasă să se hidrateze înainte de servire.");
  return flags;
}

/** Orientative texture and serving form by stage; a recipe-specific note takes precedence. */
export function servingGuidance(recipe: RecipeCatalogItem, minimumMonths: number): string {
  const note = recipe.textureNoteByAgeBand && Object.values(recipe.textureNoteByAgeBand).find(Boolean);
  if (note) return note;
  const blw = recipe.method === "blw";
  if (minimumMonths <= 7)
    return blw ? "Bucăți moi, cât un deget de adult, care se strivesc ușor între degete." : "Piure fin sau terci neted, fără bucăți.";
  if (minimumMonths <= 9)
    return blw ? "Bucăți moi tăiate cât degetul; tot ce e mic și rotund se zdrobește." : "Piure cu bucățele moi sau pasat grosier, ușor de mestecat cu gingiile.";
  if (minimumMonths <= 11) return "Bucăți mici și moi sau mâncare tocată; alimentele rotunde se taie în sferturi.";
  return "Bucăți mici din mâncarea familiei, fără sare adăugată; alimentele mici și rotunde se taie în sferturi.";
}

const substitutionByAllergen: Partial<Record<Allergen, string>> = {
  Lapte: "Fără lapte: laptele matern sau formula obișnuită a copilului; în caz de alergie, doar produsul recomandat de medic.",
  Ou: "Fără ou (în aluaturi): 1 lingură semințe de in măcinate + 3 linguri apă, lăsate 5 minute.",
  Gluten: "Fără gluten: paste, făină sau ovăz certificate fără gluten.",
  "Pește": "Fără pește: pui sau curcan, gătit complet și mărunțit.",
  Arahide: "Fără arahide: omite-le sau folosește semințe măcinate pe care copilul le tolerează deja.",
  "Fructe cu coajă": "Fără nuci: omite-le sau folosește semințe măcinate pe care copilul le tolerează deja.",
  Susan: "Fără susan: înlocuiește tahini cu ulei de măsline și omite semințele.",
  Soia: "Fără soia: înlocuiește tofu cu năut sau linte bine fierte.",
};
export function substitutions(allergens: Allergen[]): string[] {
  return allergens.map((a) => substitutionByAllergen[a]).filter((s): s is string => Boolean(s));
}
