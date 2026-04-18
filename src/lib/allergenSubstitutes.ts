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
        note: "Adaugă gust dulce",
      },
      {
        name: "Piure de mere",
        ratio: "1 ou = 3 linguri piure de mere",
        note: "Funcționează în clătite și muffins",
      },
    ],
  },
  gluten: {
    ingredient: "Făină de grâu (gluten)",
    substitutes: [
      { name: "Făină de ovăz fără gluten", ratio: "1:1", note: "Cea mai apropiată ca textură" },
      { name: "Făină de orez", ratio: "1:1", note: "Ușor de digerat" },
      { name: "Făină de năut", ratio: "1:1", note: "Mai proteică" },
    ],
  },
  lactoză: {
    ingredient: "Lapte / Lactate",
    substitutes: [
      { name: "Lapte de cocos", ratio: "1:1", note: "Cremozitate similară" },
      { name: "Lapte de ovăz", ratio: "1:1" },
      { name: "Lapte de migdale neîndulcit", ratio: "1:1" },
    ],
  },
  nuci: {
    ingredient: "Nuci / Migdale",
    substitutes: [
      {
        name: "Semințe de floarea-soarelui măcinate",
        ratio: "1:1",
        note: "Fără alergeni comuni",
      },
      { name: "Semințe de dovleac măcinate", ratio: "1:1" },
    ],
  },
  arahide: {
    ingredient: "Unt de arahide",
    substitutes: [
      {
        name: "Unt de semințe de floarea-soarelui",
        ratio: "1:1",
        note: "Sigur pentru alergii la arahide",
      },
      { name: "Unt de cocos", ratio: "1:1" },
    ],
  },
  susan: {
    ingredient: "Susan / Tahini",
    substitutes: [{ name: "Semințe de floarea-soarelui măcinate", ratio: "1:1" }],
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
  if (n.includes("lactoz") || t.includes("lactoz")) {
    return ALLERGEN_SUBSTITUTES.lactoză;
  }
  if (t.includes("gluten")) return ALLERGEN_SUBSTITUTES.gluten;
  if (t.includes("arahid")) return ALLERGEN_SUBSTITUTES.arahide;
  if (t.includes("susan") || t.includes("tahini")) return ALLERGEN_SUBSTITUTES.susan;
  if (
    (t.includes("nuc") || t.includes("migdal") || t.includes("pecan")) &&
    !t.includes("coco")
  ) {
    return ALLERGEN_SUBSTITUTES.nuci;
  }
  return undefined;
}
