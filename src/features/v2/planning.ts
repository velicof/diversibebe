import type { Recipe } from "./catalog";
import type { PlanEntry } from "./model";
import { replacePlannedRecipe } from "@/app/lib/planSelection";
import { normalize } from "./review";
import { detectProduce, produce } from "./season";

export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function nextDays(now: Date) {
  const start = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("ro-RO", {
        weekday: "short",
        timeZone: "Europe/Bucharest",
      }).format(date),
      number: date.getUTCDate(),
    };
  });
}
export function weekRange(now: Date) {
  const start = new Date(`${dayKey(now)}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function nextAvailableSlot(plan: PlanEntry[], days: { key: string }[]) {
  return days.find((day) => !plan.some((p) => p.slot === day.key))?.key;
}
export function swapRecipe(
  eligible: Recipe[],
  plan: PlanEntry[],
  slot: string,
) {
  return replacePlannedRecipe(
    eligible,
    plan.find((p) => p.slot === slot)?.recipeId,
    plan.filter((p) => p.slot !== slot).map((p) => p.recipeId),
  );
}
/** De-duplicate exact ingredient lines only; never guess units or sum uncertain quantities. */
export function shoppingList(
  plan: PlanEntry[],
  recipes: Recipe[],
  pantry: string[],
) {
  const lines = new Map<
    string,
    { key: string; label: string; recipes: string[] }
  >();
  for (const slot of plan) {
    const recipe = recipes.find((r) => r.id === slot.recipeId);
    if (!recipe) continue;
    for (const label of recipe.ingredients) {
      if (
        pantry.some((id) => new RegExp(`\\b${id}\\w*`).test(normalize(label)))
      )
        continue;
      const key = normalize(label).trim();
      const row = lines.get(key) ?? { key, label, recipes: [] };
      row.recipes.push(recipe.name);
      lines.set(key, row);
    }
  }
  return [...lines.values()];
}

/* ---------- 5-day planner ---------- */

export type PlanOptions = {
  reuseIngredients: boolean;
  alternatives?: number;
  /** Days that already have an eligible meal keep it; it still counts for ingredient reuse. */
  kept?: Map<string, Recipe>;
};
export type ProposedDay = { slot: string; recipeId: string; alternatives: string[]; kept?: boolean };

/** Fresh produce shared between recipes; pantry staples do not count as reuse. */
export function coreProduce(recipe: Recipe) {
  return detectProduce(recipe.ingredients)
    .filter((p) => !p.allYear || p.id === "ou")
    .map((p) => p.id);
}

/**
 * Proposes one meal per day from recipes that are ALREADY eligible (safety, stage, time and
 * preferences are applied by `recommend` before this runs). Order of `eligible` is respected;
 * ingredient reuse only re-ranks within the top candidates and never repeats a recipe.
 */
export function proposePlan(
  eligible: Recipe[],
  slots: string[],
  options: PlanOptions,
): ProposedDay[] {
  const altCount = options.alternatives ?? 2;
  const chosen: Recipe[] = [];
  const counts = new Map<string, number>();
  const proposal: ProposedDay[] = [];
  for (const slot of slots) {
    const fixed = options.kept?.get(slot);
    if (fixed && !chosen.some((r) => r.id === fixed.id)) {
      chosen.push(fixed);
      for (const id of new Set(coreProduce(fixed))) counts.set(id, (counts.get(id) ?? 0) + 1);
      proposal.push({ slot, recipeId: fixed.id, alternatives: [], kept: true });
      continue;
    }
    const pool = eligible.filter((r) => !chosen.some((c) => c.id === r.id) && ![...(options.kept?.values() ?? [])].some((k) => k.id === r.id));
    if (!pool.length) break;
    const value = (r: Recipe, rank: number) => {
      let v = -rank * 0.25;
      if (options.reuseIngredients) {
        const shared = coreProduce(r).filter((id) => (counts.get(id) ?? 0) > 0 && (counts.get(id) ?? 0) < 3);
        v += Math.min(2, shared.length) * 1.5;
      }
      // Variety: avoid the same main produce three days in a row.
      const previous = chosen.slice(-2).map(coreProduce);
      if (previous.length === 2 && coreProduce(r).some((id) => previous.every((p) => p.includes(id)))) v -= 3;
      return v;
    };
    const ranked = pool
      .slice(0, 24)
      .map((r, i) => ({ r, v: value(r, i) }))
      .sort((a, b) => b.v - a.v || a.r.id.localeCompare(b.r.id));
    const pick = ranked[0].r;
    chosen.push(pick);
    for (const id of new Set(coreProduce(pick))) counts.set(id, (counts.get(id) ?? 0) + 1);
    proposal.push({ slot, recipeId: pick.id, alternatives: [] });
  }
  // Alternatives come from the remaining pool so a swap never duplicates another day.
  const used = new Set(proposal.map((d) => d.recipeId));
  for (const day of proposal) {
    day.alternatives = eligible.filter((r) => !used.has(r.id)).slice(0, altCount).map((r) => r.id);
    day.alternatives.forEach((id) => used.add(id));
  }
  return proposal;
}

/** Produce appearing in at least two planned recipes, for the "reuse" summary. */
export function reusedIngredients(recipes: Recipe[]) {
  const seen = new Map<string, number>();
  for (const r of recipes) for (const id of new Set(coreProduce(r))) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({ id, name: produce.find((p) => p.id === id)?.name ?? id, recipes: n }))
    .sort((a, b) => b.recipes - a.recipes || a.name.localeCompare(b.name));
}

/* ---------- Shopping list with safe quantity aggregation ---------- */

export type Amount = { value: number; unit: string };
export type ShoppingItem = {
  key: string;
  name: string;
  amounts: Amount[];
  notes: string[];
  recipes: string[];
};
const unitAliases: [RegExp, string, number][] = [
  [/^kg$/, "g", 1000], [/^(g|gr|grame?)$/, "g", 1],
  [/^l$/, "ml", 1000], [/^ml$/, "ml", 1],
  [/^lingurit(a|e|ă|ă)?$/, "linguriță", 1], [/^lingur(a|i|ă)$/, "lingură", 1],
  [/^(buc|bucat[ai]|bucati)$/, "buc", 1], [/^feli[ei]$/, "felie", 1], [/^can[aiă]$/, "cană", 1],
];
const quantityPattern =
  /^\s*(\d+\/\d+|\d+(?:[.,]\d+)?|½|¼|¾|⅛|⅓|⅔)\s*(?:(kg|g|gr|grame?|ml|l|lingurit[aeă]?|lingur[aiă]|buc(?:ata|ati|ăți|ată)?|feli[ei]|can[aiă])\b)?\.?\s*(?:de\s+)?(.*)$/;
const fractions: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅛": 0.125, "⅓": 0.33, "⅔": 0.67 };
const plurals: Record<string, string> = { "lingură": "linguri", "linguriță": "lingurițe", "cană": "căni", felie: "felii" };

/**
 * Parses only unambiguous leading quantities. Ranges ("1-2"), "după gust", missing numbers and
 * anything else stay as notes, so the list never invents a total.
 */
export function parseIngredient(line: string): { amount: Amount | null; name: string } {
  const full = normalize(line);
  const value = full.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (/^\s*\d+(?:[.,]\d+)?\s*[-–]\s*\d/.test(value) || /dupa gust|optional|putin[aă]?\b|\bvarf\b|la alegere/.test(full))
    return { amount: null, name: value };
  const match = value.match(quantityPattern);
  if (!match) return { amount: null, name: value };
  const [num, den] = match[1].split("/").map(Number);
  const raw = fractions[match[1]] ?? (den ? num / den : Number(match[1].replace(",", ".")));
  const unitText = match[2];
  let unit = "buc", factor = 1;
  if (unitText) {
    const alias = unitAliases.find(([re]) => re.test(unitText));
    if (!alias) return { amount: null, name: value };
    [, unit, factor] = alias;
  }
  const name = match[3].replace(/,.*$/, "").trim();
  if (!Number.isFinite(raw) || raw <= 0 || !name) return { amount: null, name: value };
  return { amount: { value: Math.round(raw * factor * 100) / 100, unit }, name };
}

function shoppingKeyFor(line: string, parsedName: string) {
  const fresh = detectProduce([line]).find((p) => !p.allYear || p.id === "ou");
  if (fresh) return { key: `p:${fresh.id}`, name: fresh.name };
  const name = parsedName
    .replace(/^[\d½¼¾⅛⅓⅔/.,\s–-]+/, "")
    .replace(/^(?:un |o )?(?:varf(?: de cutit)?|lingur\w*|cani?|cana|felii?|buc\w*)\b\s*(?:de\s+)?/, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Display keeps the original Romanian spelling; only the key is normalized.
  const display = line
    .replace(/\(.*?\)/g, " ")
    .replace(/^[\d½¼¾⅛⅓⅔/.,\s–-]+/, "")
    .replace(/^(?:un |o )?(?:vârf(?: de cuțit)?|varf|lingur\S*|căn[iă]|cană|felii|felie|buc\S*|kg|grame?|gr|g|ml|l)(?=\s|$)\s*(?:de\s+)?/i, "")
    .replace(/,.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const label = display && normalize(display).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() === name ? display : name;
  return { key: `n:${name}`, name: label.charAt(0).toUpperCase() + label.slice(1) };
}

const fractionGlyphs: [number, string][] = [[0.125, "⅛"], [0.13, "⅛"], [0.25, "¼"], [0.33, "⅓"], [0.5, "½"], [0.67, "⅔"], [0.75, "¾"]];
function formatNumber(value: number) {
  const whole = Math.floor(value);
  const rest = Math.round((value - whole) * 100) / 100;
  const glyph = fractionGlyphs.find(([v]) => Math.abs(v - rest) < 0.01)?.[1];
  if (rest === 0) return String(whole);
  if (glyph) return whole ? `${whole}${glyph}` : glyph;
  return String(value);
}

/** Pantry holds shopping keys ("p:morcov") and legacy ingredient ids ("morcov"). */
function inPantry(key: string, pantry: string[]) {
  return pantry.includes(key) || (key.startsWith("p:") && pantry.includes(key.slice(2)));
}

export function buildShoppingList(plan: PlanEntry[], recipes: Recipe[], pantry: string[]) {
  const items = new Map<string, ShoppingItem>();
  const atHome: ShoppingItem[] = [];
  for (const entry of plan) {
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) continue;
    for (const line of recipe.ingredients) {
      const parsed = parseIngredient(line);
      const { key, name } = shoppingKeyFor(line, parsed.name);
      if (key === "n:apa" || key.startsWith("n:apa ")) continue; // tap water is not shopping
      const item = items.get(key) ?? { key, name, amounts: [], notes: [], recipes: [] };
      if (parsed.amount) {
        const same = item.amounts.find((a) => a.unit === parsed.amount!.unit);
        if (same) same.value = Math.round((same.value + parsed.amount.value) * 100) / 100;
        else item.amounts.push({ ...parsed.amount });
      } else if (!item.notes.includes(line)) item.notes.push(line);
      if (!item.recipes.includes(recipe.name)) item.recipes.push(recipe.name);
      items.set(key, item);
    }
  }
  const toBuy: ShoppingItem[] = [];
  for (const item of items.values()) (inPantry(item.key, pantry) ? atHome : toBuy).push(item);
  const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name, "ro");
  return { toBuy: toBuy.sort(byName), atHome: atHome.sort(byName) };
}

export function formatAmounts(amounts: Amount[]) {
  return amounts
    .map((a) => (a.unit === "g" && a.value >= 1000 ? `${a.value / 1000} kg` : a.unit === "ml" && a.value >= 1000 ? `${a.value / 1000} l` : `${a.unit === "g" || a.unit === "ml" ? a.value : formatNumber(a.value)} ${a.value > 1 ? plurals[a.unit] ?? a.unit : a.unit}`))
    .join(" + ");
}

/** Every key the shopping list can produce, used to validate stored check marks. */
// The universe depends only on the (immutable) catalog array; both stores ask for it at startup.
const universeCache = new WeakMap<Recipe[], ReadonlySet<string>>();
export function shoppingKeyUniverse(recipes: Recipe[]): ReadonlySet<string> {
  const cached = universeCache.get(recipes);
  if (cached) return cached;
  const keys = new Set<string>();
  for (const r of recipes)
    for (const line of r.ingredients) {
      keys.add(normalize(line).trim()); // keys stored by the earlier exact-line list
      keys.add(shoppingKeyFor(line, parseIngredient(line).name).key);
    }
  universeCache.set(recipes, keys);
  return keys;
}
