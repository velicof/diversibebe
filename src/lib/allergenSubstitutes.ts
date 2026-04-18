export type AllergenSubstituteBlock = {
  ingredient: string;
  substitutes: { name: string; ratio: string; note?: string }[];
};

export const ALLERGEN_SUBSTITUTES: Record<string, AllergenSubstituteBlock> = {
  ou: {
    ingredient: "Ou",
    substitutes: [
      {
        name: "In măcinat hidratat",
        ratio: "1 ou = 1 lingură in + 3 linguri apă (lasă 5 min)",
        note: "Ideal pentru prăjituri și brioșe",
      },
      {
        name: "Piure de banană",
        ratio: "1 ou = ½ banană pasată",
        note: "Adaugă gust dulce, bun în clătite",
      },
      {
        name: "Piure de mere",
        ratio: "1 ou = 3 linguri piure de mere",
        note: "Funcționează în muffins și pancakes",
      },
      {
        name: "Semințe de chia hidratate",
        ratio: "1 ou = 1 lingură chia + 3 linguri apă (lasă 10 min)",
      },
    ],
  },
  gluten: {
    ingredient: "Făină de grâu / Gluten",
    substitutes: [
      { name: "Făină de ovăz fără gluten", ratio: "1:1", note: "Cea mai apropiată ca textură" },
      { name: "Făină de orez", ratio: "1:1", note: "Ușor de digerat, neutră ca gust" },
      { name: "Făină de hrișcă", ratio: "1:1", note: "Fără gluten, bogată în nutrienți" },
      { name: "Făină de năut", ratio: "1:1", note: "Mai proteică, gust ușor diferit" },
    ],
  },
  lactoză: {
    ingredient: "Lapte / Lactate",
    substitutes: [
      { name: "Lapte de cocos", ratio: "1:1", note: "Cremozitate similară, gust ușor dulce" },
      { name: "Lapte de ovăz", ratio: "1:1", note: "Cel mai neutru ca gust" },
      { name: "Lapte de migdale neîndulcit", ratio: "1:1" },
      { name: "Lapte de orez", ratio: "1:1", note: "Foarte ușor de digerat" },
    ],
  },
  nuci: {
    ingredient: "Nuci / Migdale / Alune",
    substitutes: [
      {
        name: "Semințe de floarea-soarelui măcinate",
        ratio: "1:1",
        note: "Fără alergeni comuni",
      },
      { name: "Semințe de dovleac măcinate", ratio: "1:1", note: "Bogate în zinc și fier" },
      { name: "Semințe de cânepă", ratio: "1:1", note: "Bogate în Omega-3" },
    ],
  },
  arahide: {
    ingredient: "Arahide / Unt de arahide",
    substitutes: [
      {
        name: "Unt de semințe de floarea-soarelui",
        ratio: "1:1",
        note: "Cea mai bună alternativă ca textură",
      },
      { name: "Unt de cocos", ratio: "1:1", note: "Gust diferit, dar funcționează" },
      { name: "Unt de semințe de dovleac", ratio: "1:1" },
    ],
  },
  susan: {
    ingredient: "Susan / Tahini",
    substitutes: [
      { name: "Semințe de floarea-soarelui măcinate", ratio: "1:1" },
      {
        name: "Unt de semințe de floarea-soarelui",
        ratio: "1:1",
        note: "Pentru tahini în hummus sau sosuri",
      },
    ],
  },
  pește: {
    ingredient: "Pește",
    substitutes: [
      { name: "Pui tocat fin", ratio: "1:1", note: "Textură similară în piureuri și chifteluțe" },
      { name: "Tofu moale", ratio: "1:1", note: "Sursă bună de proteine, textură similară" },
      { name: "Linte roșie fiartă", ratio: "1:1", note: "Pentru piureuri și supe" },
    ],
  },
  soia: {
    ingredient: "Soia / Tofu",
    substitutes: [
      { name: "Linte roșie", ratio: "1:1", note: "Proteină vegetală alternativă" },
      { name: "Năut fiert și pasat", ratio: "1:1" },
      { name: "Fasole albă fiartă și pasată", ratio: "1:1", note: "Textură cremoasă similară" },
    ],
  },
  "nucă de cocos": {
    ingredient: "Nucă de cocos / Lapte de cocos",
    substitutes: [
      { name: "Lapte de ovăz", ratio: "1:1", note: "Pentru înlocuit laptele de cocos în rețete" },
      { name: "Lapte de migdale", ratio: "1:1" },
      {
        name: "Smântână de gătit (dacă tolerează lactoza)",
        ratio: "1:1",
        note: "Pentru cremozitate similară",
      },
    ],
  },
  crustacee: {
    ingredient: "Crustacee (creveți, raci)",
    substitutes: [
      { name: "Pui tocat fin", ratio: "1:1", note: "Proteină similară, sigură" },
      { name: "Pește alb (dacă nu e alergie și la pește)", ratio: "1:1" },
      { name: "Tofu ferm", ratio: "1:1", note: "Textură similară în mâncăruri gătite" },
    ],
  },
};

/** Potrivește eticheta din rețetă (ex. „Nuci (migdale)”) la un bloc de substituenți. */
export function lookupAllergenSubstitute(
  label: string
): AllergenSubstituteBlock | undefined {
  const t = label.toLowerCase().trim();
  if (Object.prototype.hasOwnProperty.call(ALLERGEN_SUBSTITUTES, t)) {
    return ALLERGEN_SUBSTITUTES[t];
  }
  const n = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (t.includes("coco") || n.includes("nuca de cocos")) {
    return ALLERGEN_SUBSTITUTES["nucă de cocos"];
  }
  if (
    t.includes("creveț") ||
    t.includes("crevet") ||
    t.includes("rac") ||
    t.includes("crustace")
  ) {
    return ALLERGEN_SUBSTITUTES.crustacee;
  }
  if (t.includes("pește") || n.includes("peste")) {
    return ALLERGEN_SUBSTITUTES.pește;
  }
  if (t.includes("soia") || t.includes("tofu")) {
    return ALLERGEN_SUBSTITUTES.soia;
  }
  if (n.includes("lactoz") || t.includes("lactoz")) {
    return ALLERGEN_SUBSTITUTES.lactoză;
  }
  if (t.includes("gluten")) return ALLERGEN_SUBSTITUTES.gluten;
  if (t.includes("arahid")) return ALLERGEN_SUBSTITUTES.arahide;
  if (t.includes("susan") || t.includes("tahini")) return ALLERGEN_SUBSTITUTES.susan;
  if (
    (t.includes("nuc") || t.includes("migdal") || t.includes("pecan") || t.includes("alun")) &&
    !t.includes("coco")
  ) {
    return ALLERGEN_SUBSTITUTES.nuci;
  }
  if (t === "ou") return ALLERGEN_SUBSTITUTES.ou;
  return undefined;
}
