import { normalize } from "./review";

/**
 * Orientative availability calendar for Romania (open-field / local storage).
 * Editorial data, not a safety rule: seasonality only re-orders recipes that are
 * already eligible and can never make an ineligible recipe appear.
 */
export type Availability = "local" | "depozit" | "tot-anul" | "import";
export type SeasonalProduce = {
  id: string;
  name: string;
  match: RegExp;
  local?: number[];
  depozit?: number[];
  /** Shelf-stable, frozen or animal products available all year. */
  allYear?: boolean;
};

const range = (from: number, to: number) => {
  const months: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    months.push(m);
    if (m === to) return months;
  }
};

export const availabilityLabels: Record<Availability, string> = {
  local: "Proaspăt local",
  depozit: "Din depozit",
  "tot-anul": "Disponibil tot anul",
  import: "Preponderent importat",
};

export const produce: SeasonalProduce[] = [
  { id: "dovlecel", name: "Dovlecel", match: /\bdovlec(?:el|ei|elul|eii)\b/, local: range(6, 9) },
  { id: "dovleac", name: "Dovleac", match: /\bdovle(?:ac|acul|ci)\b/, local: range(9, 11), depozit: range(12, 2) },
  { id: "morcov", name: "Morcov", match: /\bmorcov/, local: range(6, 10), depozit: range(11, 5) },
  { id: "cartof", name: "Cartof", match: /\bcartof(?![^\n]*dulc)/, local: range(6, 9), depozit: range(10, 5) },
  { id: "cartof-dulce", name: "Cartof dulce", match: /\bcartof\w* dulc/ },
  { id: "sfecla", name: "Sfeclă roșie", match: /\bsfecl/, local: range(7, 10), depozit: range(11, 3) },
  { id: "pastarnac", name: "Păstârnac", match: /\bpastarnac/, local: range(9, 11), depozit: range(12, 3) },
  { id: "telina", name: "Țelină", match: /\btelin/, local: range(8, 10), depozit: range(11, 3) },
  { id: "ceapa", name: "Ceapă", match: /\bceap/, allYear: true },
  { id: "broccoli", name: "Broccoli", match: /\bbroccoli/, local: range(6, 10) },
  { id: "conopida", name: "Conopidă", match: /\bconopid/, local: range(6, 10) },
  { id: "mazare", name: "Mazăre", match: /\bmazare/, local: range(5, 7), allYear: true },
  { id: "fasole-verde", name: "Fasole verde", match: /\bfasole verde/, local: range(6, 9) },
  { id: "spanac", name: "Spanac", match: /\bspanac/, local: [4, 5, 9, 10] },
  { id: "rosii", name: "Roșii", match: /\bros(?:ii|ie)\b/, local: range(7, 9) },
  { id: "ardei", name: "Ardei", match: /\bardei/, local: range(7, 10) },
  { id: "vinete", name: "Vinete", match: /\bvinet/, local: range(7, 9) },
  { id: "castravete", name: "Castravete", match: /\bcastrave/, local: range(6, 9) },
  { id: "varza", name: "Varză", match: /\bvarz/, local: range(7, 11), depozit: range(12, 3) },
  { id: "praz", name: "Praz", match: /\bpraz/, local: range(9, 12), depozit: range(1, 3) },
  { id: "mar", name: "Măr", match: /\bmar(?:ul|uri)?\b|\bmere\b/, local: range(8, 10), depozit: range(11, 6) },
  { id: "para", name: "Pară", match: /\bpar(?:a|ele)\b|\bpere\b/, local: range(8, 10), depozit: range(11, 2) },
  { id: "prune", name: "Prune", match: /\bprun/, local: range(7, 9) },
  { id: "caise", name: "Caise", match: /\bcais/, local: range(6, 7) },
  { id: "piersici", name: "Piersici", match: /\bpiersic/, local: range(7, 8) },
  { id: "cirese", name: "Cireșe", match: /\bcires/, local: range(5, 6) },
  { id: "capsuni", name: "Căpșuni", match: /\bcapsun/, local: range(5, 6) },
  { id: "zmeura", name: "Zmeură", match: /\bzmeur/, local: range(6, 8) },
  { id: "afine", name: "Afine", match: /\bafin/, local: range(7, 8) },
  { id: "pepene", name: "Pepene", match: /\bpepen/, local: range(7, 8) },
  { id: "gutui", name: "Gutui", match: /\bgutui/, local: range(9, 11) },
  { id: "banana", name: "Banană", match: /\banan/ },
  { id: "avocado", name: "Avocado", match: /\bavocado/ },
  { id: "mango", name: "Mango", match: /\bmango/ },
  { id: "kiwi", name: "Kiwi", match: /\bkiwi/ },
  { id: "portocala", name: "Portocală", match: /\bportocal/ },
  { id: "ovaz", name: "Ovăz", match: /\bovaz/, allYear: true },
  { id: "orez", name: "Orez", match: /\borez/, allYear: true },
  { id: "linte", name: "Linte", match: /\blinte/, allYear: true },
  { id: "naut", name: "Năut", match: /\bnaut/, allYear: true },
  { id: "mei", name: "Mei", match: /\bmei\b/, allYear: true },
  { id: "gris", name: "Griș", match: /\bgris\b/, allYear: true },
  { id: "paste", name: "Paste", match: /\bpaste\b/, allYear: true },
  { id: "ou", name: "Ou", match: /\bou(?:a|ale)?\b/, allYear: true },
  { id: "iaurt", name: "Iaurt", match: /\biaurt/, allYear: true },
  { id: "branza", name: "Brânză", match: /\bbranz/, allYear: true },
  { id: "pui", name: "Pui", match: /\bpui\b/, allYear: true },
  { id: "curcan", name: "Curcan", match: /\bcurcan/, allYear: true },
  { id: "vita", name: "Vită", match: /\bvit(?:a|ei)\b/, allYear: true },
  { id: "peste", name: "Pește", match: /\bpeste\b|\bsomon|\bcod\b|\bpastrav/, allYear: true },
];

export function availability(item: SeasonalProduce, month: number): Availability {
  if (item.local?.includes(month)) return "local";
  if (item.depozit?.includes(month)) return "depozit";
  if (item.allYear) return "tot-anul";
  return "import";
}

export function monthIn(timeZone = "Europe/Bucharest", now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone, month: "numeric" }).format(now));
}

/** Produce detected in recipe ingredient lines (normalized, diacritics-insensitive). */
export function detectProduce(lines: string[]): SeasonalProduce[] {
  const text = normalize(lines.join(" \n "));
  return produce.filter((p) => p.match.test(text));
}

const weights: Record<Availability, number> = { local: 1, depozit: 0.5, "tot-anul": 0, import: -0.5 };

/** Small tie-breaking score; callers must apply it after safety, stage, ingredients, time and preferences. */
export function seasonalScore(lines: string[], month: number) {
  return detectProduce(lines).reduce((sum, p) => sum + weights[availability(p, month)], 0);
}

export function seasonalHighlights(lines: string[], month: number) {
  return detectProduce(lines)
    .filter((p) => availability(p, month) === "local")
    .map((p) => p.name);
}

export function calendar() {
  return produce.map((p) => ({
    id: p.id,
    name: p.name,
    months: Array.from({ length: 12 }, (_, i) => availability(p, i + 1)),
  }));
}
