// Editorial observations on photo candidates (agent, 3 Nov. 2026). Recommendations only: the decision is the
// founder's, recorded through /v2/revizie/fotografii → `node scripts/photo-import.cjs decide <file>`.
export type PhotoNote = {
  recommendation: "approve" | "approve-with-note" | "regenerate";
  matches: string[];
  concerns: string[];
  /** Prompt adjustment if the image is regenerated (promptVersion + 1). */
  promptFix?: string;
};

export const photoNotes: Record<string, PhotoNote> = {
  "piure-broccoli-cartof-6": {
    recommendation: "approve",
    matches: [
      "Piure verde-pal, neted, fără bucăți: textura etapei 6 luni.",
      "Bol ceramic crem, linguriță de silicon, in și lemn, lumină din fereastră: identitatea cerută.",
      "Fără sare, text, persoane sau ingrediente în plus.",
    ],
    concerns: ["Borcanul ceramic din fundal este decor neutru; nu sugerează un produs."],
  },
  "iaurt-unt-migdale": {
    recommendation: "approve-with-note",
    matches: [
      "Unt de migdale fin, în fir, fără migdale întregi sau bucăți.",
      "Iaurt alb, scorțișoară, măr: doar ingredientele rețetei.",
      "Aceeași identitate: bol crem, linguriță de silicon, in, lemn.",
    ],
    concerns: [
      "Mărul pare ras grosier; rețeta (6+ luni) cere răzătoarea fină. Pentru un părinte, imaginea poate sugera fâșii mai mari decât e potrivit.",
    ],
    promptFix: "măr ras foarte fin, aproape piure, în cantitate mică",
  },
  "clatite-ovaz-mar-8": {
    recommendation: "regenerate",
    matches: [
      "Fâșii moi de mărimea unui deget: forma de servire pentru 8+ luni.",
      "Fără sirop, zahăr pudră sau fructe întregi.",
    ],
    concerns: [
      "Pe suprafață se văd fulgi de ovăz întregi; rețeta cere ovăz mixat fin (sau făină de ovăz), deci imaginea contrazice rețeta.",
      "Farfuria albastră se abate de la bolurile crem ale celorlalte două (coerența seriei).",
    ],
    promptFix: "clătite cu textură fină, uniformă, din ovăz măcinat fin (fără fulgi vizibili), pe o farfurie mică crem mată",
  },
};
