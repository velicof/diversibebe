export type RegisterFoodItem = {
  id: string;
  name: string;
  emoji: string;
  category: string;
};

export const FOODS_LIST: RegisterFoodItem[] = [
  // LEGUME
  { id: "morcov", name: "Morcov", emoji: "🥕", category: "Legume" },
  { id: "cartof-dulce", name: "Cartof dulce", emoji: "🍠", category: "Legume" },
  { id: "cartof", name: "Cartof", emoji: "🥔", category: "Legume" },
  { id: "dovlecel", name: "Dovlecel", emoji: "🥒", category: "Legume" },
  { id: "dovleac", name: "Dovleac", emoji: "🎃", category: "Legume" },
  { id: "broccoli", name: "Broccoli", emoji: "🥦", category: "Legume" },
  { id: "conopida", name: "Conopidă", emoji: "🥦", category: "Legume" },
  { id: "ardei-gras", name: "Ardei gras", emoji: "🫑", category: "Legume" },
  { id: "rosii", name: "Roșii", emoji: "🍅", category: "Legume" },
  { id: "spanac", name: "Spanac", emoji: "🌿", category: "Legume" },
  { id: "mazare", name: "Mazăre", emoji: "🫛", category: "Legume" },
  { id: "fasole-verde", name: "Fasole verde", emoji: "🫘", category: "Legume" },
  { id: "ceapa", name: "Ceapă", emoji: "🧅", category: "Legume" },
  { id: "usturoi", name: "Usturoi", emoji: "🧄", category: "Legume" },
  { id: "telina", name: "Țelină", emoji: "🌿", category: "Legume" },
  { id: "pastarnac", name: "Păstârnac", emoji: "🌿", category: "Legume" },
  { id: "sfecla", name: "Sfeclă roșie", emoji: "🫚", category: "Legume" },
  { id: "varza", name: "Varză", emoji: "🥬", category: "Legume" },
  { id: "vinete", name: "Vinete", emoji: "🍆", category: "Legume" },
  { id: "porumb", name: "Porumb", emoji: "🌽", category: "Legume" },

  // FRUCTE
  { id: "mere", name: "Mere", emoji: "🍎", category: "Fructe" },
  { id: "pere", name: "Pere", emoji: "🍐", category: "Fructe" },
  { id: "banana", name: "Banană", emoji: "🍌", category: "Fructe" },
  { id: "piersici", name: "Piersici", emoji: "🍑", category: "Fructe" },
  { id: "caise", name: "Caise", emoji: "🍑", category: "Fructe" },
  { id: "prune", name: "Prune", emoji: "🫐", category: "Fructe" },
  { id: "capsuni", name: "Căpșuni", emoji: "🍓", category: "Fructe" },
  { id: "afine", name: "Afine", emoji: "🫐", category: "Fructe" },
  { id: "zmeura", name: "Zmeură", emoji: "🍓", category: "Fructe" },
  { id: "mure", name: "Mure", emoji: "🫐", category: "Fructe" },
  { id: "mango", name: "Mango", emoji: "🥭", category: "Fructe" },
  { id: "avocado", name: "Avocado", emoji: "🥑", category: "Fructe" },
  { id: "kiwi", name: "Kiwi", emoji: "🥝", category: "Fructe" },
  { id: "pepene", name: "Pepene", emoji: "🍉", category: "Fructe" },
  { id: "portocale", name: "Portocale", emoji: "🍊", category: "Fructe" },
  { id: "lamaie", name: "Lămâie", emoji: "🍋", category: "Fructe" },
  { id: "struguri", name: "Struguri (tăiați)", emoji: "🍇", category: "Fructe" },
  { id: "papaya", name: "Papaya", emoji: "🍈", category: "Fructe" },

  // PROTEINE
  { id: "ou", name: "Ou", emoji: "🥚", category: "Proteine" },
  { id: "pui", name: "Pui", emoji: "🍗", category: "Proteine" },
  { id: "vita", name: "Vită", emoji: "🥩", category: "Proteine" },
  { id: "porc", name: "Porc", emoji: "🥩", category: "Proteine" },
  { id: "curcan", name: "Curcan", emoji: "🍗", category: "Proteine" },
  { id: "peste-alb", name: "Pește alb", emoji: "🐟", category: "Proteine" },
  { id: "somon", name: "Somon", emoji: "🐟", category: "Proteine" },
  { id: "ton", name: "Ton", emoji: "🐟", category: "Proteine" },
  { id: "ficat", name: "Ficat de pui", emoji: "🫀", category: "Proteine" },
  { id: "linte", name: "Linte", emoji: "🫘", category: "Proteine" },
  { id: "naut", name: "Năut", emoji: "🫘", category: "Proteine" },
  { id: "fasole", name: "Fasole", emoji: "🫘", category: "Proteine" },
  { id: "tofu", name: "Tofu", emoji: "🧊", category: "Proteine" },

  // LACTATE
  { id: "iaurt", name: "Iaurt", emoji: "🥛", category: "Lactate" },
  { id: "branza-vaci", name: "Brânză de vaci", emoji: "🧀", category: "Lactate" },
  { id: "ricotta", name: "Ricotta", emoji: "🧀", category: "Lactate" },
  { id: "lapte-vaca", name: "Lapte de vacă", emoji: "🥛", category: "Lactate" },
  { id: "unt", name: "Unt", emoji: "🧈", category: "Lactate" },

  // CEREALE
  { id: "orez", name: "Orez", emoji: "🍚", category: "Cereale" },
  { id: "ovaz", name: "Ovăz", emoji: "🌾", category: "Cereale" },
  { id: "gris", name: "Griș", emoji: "🌾", category: "Cereale" },
  { id: "paste", name: "Paste", emoji: "🍝", category: "Cereale" },
  { id: "paine", name: "Pâine", emoji: "🍞", category: "Cereale" },
  { id: "mei", name: "Mei", emoji: "🌾", category: "Cereale" },
  { id: "hrisca", name: "Hrișcă", emoji: "🌾", category: "Cereale" },
  { id: "quinoa", name: "Quinoa", emoji: "🌾", category: "Cereale" },

  // NUCI & SEMINȚE
  { id: "nuci-macinate", name: "Nuci măcinate", emoji: "🪨", category: "Nuci & Semințe" },
  { id: "migdale-macinate", name: "Migdale măcinate", emoji: "🪨", category: "Nuci & Semințe" },
  { id: "unt-arahide", name: "Unt de arahide", emoji: "🥜", category: "Nuci & Semințe" },
  { id: "seminte-chia", name: "Semințe de chia", emoji: "🌱", category: "Nuci & Semințe" },
  { id: "seminte-in", name: "Semințe de in", emoji: "🌱", category: "Nuci & Semințe" },
  { id: "seminte-dovleac", name: "Semințe de dovleac", emoji: "🌱", category: "Nuci & Semințe" },
  { id: "susan", name: "Susan / Tahini", emoji: "🌱", category: "Nuci & Semințe" },
];

/** Ordinea tab-urilor în UI (subset din categorii reale). */
export const REGISTER_FOOD_CATEGORY_ORDER: string[] = [
  "Legume",
  "Fructe",
  "Proteine",
  "Lactate",
  "Cereale",
  "Nuci & Semințe",
];
