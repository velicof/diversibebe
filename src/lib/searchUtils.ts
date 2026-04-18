/** Elimină diacritice și normalizează textul pentru căutare. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ăâ]/g, "a")
    .replace(/[îí]/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .trim();
}

/** Variante alternative pentru același aliment (cheie = `food.id`). */
export const FOOD_ALIASES: Record<string, string[]> = {
  mere: ["mar", "mere", "măr", "marul"],
  pere: ["para", "pere", "pară", "parul"],
  pastarnac: ["pastarnac", "păstârnac", "pastarnacul"],
  capsuni: ["capsuna", "căpșună", "capsuni", "fragute"],
  afine: ["afina", "afine"],
  dovleac: ["dovleac", "bostan"],
  "branza-vaci": ["branza", "brânză", "cas", "caș"],
  iaurt: ["iaurt", "jogurt"],
  naut: ["naut", "năut", "chickpeas"],
  hrisca: ["hrisca", "hrișcă"],
  quinoa: ["quinoa", "kinoa"],
  ceapa: ["ceapa", "ceapă"],
  telina: ["telina", "țelină", "celeriac"],
  sfecla: ["sfecla", "sfeclă", "sfecla rosie"],
  "fasole-verde": ["fasole verde", "fasole", "pastaie"],
};

export type FoodSearchable = { id: string; name: string };

/** Căutare alimente: diacritice, id, alias-uri. La query goală sau cu un singur caracter returnează lista nemodificată. */
export function searchFoods<T extends FoodSearchable>(foods: T[], query: string): T[] {
  const t = query.trim();
  if (!t || t.length < 2) return foods;

  const normalizedQuery = normalizeText(t);

  return foods.filter((food) => {
    if (normalizeText(food.name).includes(normalizedQuery)) return true;

    const aliases = FOOD_ALIASES[food.id] ?? [];
    if (aliases.some((alias) => normalizeText(alias).includes(normalizedQuery))) {
      return true;
    }

    if (normalizeText(food.id).includes(normalizedQuery)) return true;

    return false;
  });
}

/** Căutare generică după nume și id (rețete, etc.), fără alias-uri alimente. */
export function searchByNameNormalized<T extends FoodSearchable>(
  items: T[],
  query: string
): T[] {
  const t = query.trim();
  if (!t || t.length < 2) return items;

  const nq = normalizeText(t);
  return items.filter(
    (item) =>
      normalizeText(item.name).includes(nq) || normalizeText(item.id).includes(nq)
  );
}
